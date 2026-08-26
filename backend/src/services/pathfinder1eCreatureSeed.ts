/**
 * Pathfinder 1e creature catalogue backed by Archives of Nethys, Paizo's
 * official PRD partner. The catalogue import is intentionally lightweight;
 * full stat blocks are fetched on demand when a creature is opened/placed.
 */

import { GameSystem, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { resolveAonSpellNames } from './pathfinder1eSpellService';

export const PF1E_SOURCE = 'aon-pf1e';
const AON_BASE_URL = 'https://www.aonprd.com';
const AON_INDEX_URL = `${AON_BASE_URL}/Monsters.aspx?Letter=All`;

interface AonMonsterIndexEntry {
  name: string;
  itemName: string;
  challengeRating: string;
  creatureType: string;
  environment: string;
}

const entityMap: Record<string, string> = {
  amp: '&', apos: "'", '#39': "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
  ndash: '–', mdash: '—', minus: '−', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodeHtml(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_match, entity: string) => {
    if (entityMap[entity]) return entityMap[entity];
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return _match;
  });
}

function text(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function numeric(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = parseInt(value.replace(/[+,]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function field(html: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<b>${escaped}<\\/b>\\s*([\\s\\S]*?)(?=<b>|<br\\s*\\/?>|<h3|$)`, 'i'));
  return match ? text(match[1]) : undefined;
}

function cleanStatValue(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/[;,]\s*$/, '').trim();
  return cleaned || undefined;
}

function section(html: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<h3[^>]*>${escaped}<\\/h3>([\\s\\S]*?)(?=<h3|$)`, 'i'))?.[1] ?? '';
}

export function parseAonMonsterIndex(html: string): AonMonsterIndexEntry[] {
  const entries: AonMonsterIndexEntry[] = [];
  const rowPattern = /<tr[^>]*>\s*<td>\s*<a[^>]+href="MonsterDisplay\.aspx\?ItemName=([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(html)) !== null) {
    entries.push({
      itemName: decodeHtml(match[1]).trim(),
      name: text(match[2]),
      challengeRating: text(match[3]),
      creatureType: text(match[4]),
      environment: text(match[5]),
    });
  }
  return entries;
}

function parseIdentity(value: string): { alignment?: string; size?: string; creatureType: string } {
  const sizes = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];
  const size = sizes.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'i').test(value));
  const beforeSize = size ? value.slice(0, value.search(new RegExp(`\\b${size}\\b`, 'i'))).trim() : '';
  const creatureType = size ? value.slice(value.search(new RegExp(`\\b${size}\\b`, 'i'))).trim() : value.trim();
  return { alignment: beforeSize || undefined, size, creatureType };
}

function parseNamedBonuses(value?: string): Record<string, number> | undefined {
  if (!value) return undefined;
  const result: Record<string, number> = {};
  for (const part of value.split(/[,;]/)) {
    const match = part.trim().match(/^(.+?)\s+([+−-]\d+)/);
    if (match) result[match[1].trim().toLowerCase()] = numeric(match[2]);
  }
  return Object.keys(result).length ? result : undefined;
}

function parseAbilities(value?: string) {
  const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  if (!value) return abilities;
  for (const key of Object.keys(abilities) as Array<keyof typeof abilities>) {
    const match = value.match(new RegExp(`\\b${key}\\s+(\\d+|—|-)`, 'i'));
    if (match) abilities[key] = numeric(match[1], 0);
  }
  return abilities;
}

function parseTraits(html: string): Array<{ name: string; description: string }> | undefined {
  const traits: Array<{ name: string; description: string }> = [];
  const pattern = /<b>([\s\S]*?)<\/b>\s*([\s\S]*?)(?=<b>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const name = text(match[1]);
    const description = text(match[2]);
    if (name && description) traits.push({ name, description });
  }
  return traits.length ? traits : undefined;
}

interface MonsterSpellcastingBlock {
  name: string;
  description: string;
  spells: Array<{ name: string; sourceUrl?: string }>;
}

function parseSpellcasting(html: string): MonsterSpellcastingBlock[] | undefined {
  const blocks: MonsterSpellcastingBlock[] = [];
  const pattern = /<b>([^<]*(?:Spell-Like Abilities|Spells Known|Spells Prepared)[^<]*)<\/b>([\s\S]*?)(?=<b>[^<]*(?:Spell-Like Abilities|Spells Known|Spells Prepared)[^<]*<\/b>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const spells = [...match[2].matchAll(/<i>([\s\S]*?)<\/i>/gi)]
      .map(spell => ({ name: text(spell[1]) }))
      .filter(spell => spell.name);
    blocks.push({ name: text(match[1]), description: text(match[2]), spells });
  }
  return blocks.length ? blocks : undefined;
}

export function parseAonMonsterPage(html: string, fallback: AonMonsterIndexEntry) {
  const contentMatch = html.match(/<span id="MainContent_DataListFeats_Label1_0">([\s\S]*?)<\/span>/i);
  if (!contentMatch) throw new Error(`Archives of Nethys did not return a monster page for ${fallback.itemName}`);
  const content = contentMatch[1];
  const title = text(content.match(/<h1[^>]*class="title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? fallback.name);
  const heading = text(content.match(/<h2[^>]*class="title"[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
  const challengeRating = heading.match(/\bCR\s+([^\s]+)/i)?.[1] ?? fallback.challengeRating;
  const identityRaw = content.match(/<b>XP<\/b>[\s\S]*?<br\s*\/?>\s*([\s\S]*?)<br\s*\/?>\s*<b>Init<\/b>/i)?.[1];
  const identity = parseIdentity(text(identityRaw ?? fallback.creatureType));
  const defense = section(content, 'Defense');
  const offense = section(content, 'Offense');
  const statistics = section(content, 'Statistics');
  const ecology = section(content, 'Ecology');
  const acText = field(defense, 'AC');
  const hpText = field(defense, 'hp');
  const savingThrows = ([
    ['fort', field(defense, 'Fort')],
    ['reflex', field(defense, 'Ref')],
    ['will', field(defense, 'Will')],
  ] as Array<[string, string | undefined]>).reduce<Record<string, number>>((result, [key, value]) => {
    if (value) result[key] = numeric(value);
    return result;
  }, {});
  const abilityLine = statistics.match(/<b>Str<\/b>([\s\S]*?)(?=<br\s*\/?>|<h3|$)/i);
  const melee = field(offense, 'Melee');
  const ranged = field(offense, 'Ranged');
  const specialAttacks = field(offense, 'Special Attacks');
  const actions = [
    melee && { name: 'Melee', description: melee },
    ranged && { name: 'Ranged', description: ranged },
    specialAttacks && { name: 'Special Attacks', description: specialAttacks },
  ].filter(Boolean) as Array<{ name: string; description: string }>;
  const source = field(content, 'Source');
  const sourceUrl = `${AON_BASE_URL}/MonsterDisplay.aspx?ItemName=${encodeURIComponent(fallback.itemName)}`;
  const spellcasting = parseSpellcasting(offense);

  const statBlock = {
    ac: numeric(acText),
    speed: field(offense, 'Speed') ?? '—',
    abilities: parseAbilities(abilityLine ? `Str ${text(abilityLine[1])}` : undefined),
    savingThrows: Object.keys(savingThrows).length ? savingThrows : undefined,
    skills: parseNamedBonuses(field(statistics, 'Skills')),
    senses: field(content, 'Senses'),
    languages: field(statistics, 'Languages'),
    challengeRating,
    xp: numeric(field(content, 'XP')),
    traits: parseTraits(section(content, 'Special Abilities')),
    actions: actions.length ? actions : undefined,
    spellcasting,
    creatureType: identity.creatureType || fallback.creatureType,
    alignment: identity.alignment,
    gameSystem: GameSystem.PATHFINDER_1E,
    hitPoints: numeric(hpText),
    defensiveAbilities: cleanStatValue(field(defense, 'Defensive Abilities')),
    damageReduction: cleanStatValue(field(defense, 'DR')),
    spellResistance: cleanStatValue(field(defense, 'SR')),
    damageImmunities: cleanStatValue(field(defense, 'Immune')),
    damageResistances: cleanStatValue(field(defense, 'Resist')),
    weaknesses: cleanStatValue(field(defense, 'Weaknesses')),
    sourceUrl,
    source,
    environment: field(ecology, 'Environment') ?? fallback.environment,
    feats: cleanStatValue(field(statistics, 'Feats')),
    _aonHydrated: true,
    _aonVersion: 3,
    _aonName: fallback.name,
    _aonItemName: fallback.itemName,
  };

  return {
    name: title,
    gameSystem: GameSystem.PATHFINDER_1E,
    source: PF1E_SOURCE,
    challengeRating,
    creatureType: identity.creatureType || fallback.creatureType,
    alignment: identity.alignment ?? null,
    statBlock: JSON.parse(JSON.stringify(statBlock)),
    size: tokenSize(identity.size),
  };
}

function tokenSize(size?: string): { width: number; height: number } {
  if (size === 'Large') return { width: 2, height: 2 };
  if (size === 'Huge') return { width: 3, height: 3 };
  if (size === 'Gargantuan') return { width: 4, height: 4 };
  if (size === 'Colossal') return { width: 6, height: 6 };
  return { width: 1, height: 1 };
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'CozyVTT/1.1 (self-hosted VTT; PF1e rules import)' },
  });
  if (!response.ok) throw new Error(`Archives of Nethys returned ${response.status} ${response.statusText}`);
  return response.text();
}

let monsterIndexPromise: Promise<AonMonsterIndexEntry[]> | undefined;

async function fetchMonsterIndex(): Promise<AonMonsterIndexEntry[]> {
  monsterIndexPromise ??= fetchHtml(AON_INDEX_URL).then((html) => {
    const entries = parseAonMonsterIndex(html);
    if (!entries.length) throw new Error('Archives of Nethys monster index could not be parsed');
    return entries;
  }).catch((error) => {
    monsterIndexPromise = undefined;
    throw error;
  });
  return monsterIndexPromise;
}

export async function seedPf1eCreatureIndex(prisma: PrismaClient) {
  const entries = await fetchMonsterIndex();

  const existing = await prisma.creatureTemplate.findMany({
    where: { source: PF1E_SOURCE, gameSystem: GameSystem.PATHFINDER_1E },
    select: { name: true },
  });
  const existingNames = new Set(existing.map(({ name }) => name));
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.name, entry])).values()];
  const pending = uniqueEntries.filter(({ name }) => !existingNames.has(name));

  const result = await prisma.creatureTemplate.createMany({
    data: pending.map((entry) => ({
      id: randomUUID(),
      name: entry.name,
      gameSystem: GameSystem.PATHFINDER_1E,
      source: PF1E_SOURCE,
      challengeRating: entry.challengeRating,
      creatureType: entry.creatureType,
      alignment: null,
      imageUrl: null,
      statBlock: {
        ac: 0,
        speed: 'Load the official stat block to view details',
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        challengeRating: entry.challengeRating,
        creatureType: entry.creatureType,
        gameSystem: GameSystem.PATHFINDER_1E,
        environment: entry.environment,
        sourceUrl: `${AON_BASE_URL}/MonsterDisplay.aspx?ItemName=${encodeURIComponent(entry.itemName)}`,
        _aonHydrated: false,
        _aonName: entry.name,
        _aonItemName: entry.itemName,
      },
      size: { width: 1, height: 1 },
      disposition: 'hostile',
      displayMode: 'pog',
      createdById: null,
      campaignId: null,
    })),
  });

  return { fetched: uniqueEntries.length, created: result.count, skipped: uniqueEntries.length - result.count, alreadyExisted: existing.length };
}

export async function hydratePf1eCreature(prisma: PrismaClient, creature: any) {
  const statBlock = creature.statBlock as Record<string, unknown>;
  if (creature.source !== PF1E_SOURCE) return creature;
  if (statBlock?._aonHydrated === true && Number(statBlock?._aonVersion) >= 3 && typeof statBlock?._aonItemName === 'string') return creature;

  // Older catalogue rows stored only the label shown in the index. That label
  // is not always the AoN query key (for example "Zombie, Human Zombie" links
  // to ItemName=Human Zombie), so recover the actual href before hydration.
  const indexedEntry = (await fetchMonsterIndex()).find((candidate) => candidate.name === creature.name);

  const entry: AonMonsterIndexEntry = {
    name: String(statBlock?._aonName ?? creature.name),
    itemName: indexedEntry?.itemName ?? String(statBlock?._aonItemName ?? statBlock?._aonName ?? creature.name),
    challengeRating: creature.challengeRating ?? '',
    creatureType: creature.creatureType ?? '',
    environment: String(statBlock?.environment ?? ''),
  };
  const parsed = parseAonMonsterPage(
    await fetchHtml(`${AON_BASE_URL}/MonsterDisplay.aspx?ItemName=${encodeURIComponent(entry.itemName)}`),
    entry,
  );
  const spellcasting = (parsed.statBlock as any).spellcasting as MonsterSpellcastingBlock[] | undefined;
  if (spellcasting?.length) {
    const references = await resolveAonSpellNames(spellcasting.flatMap(block => block.spells.map(spell => spell.name)));
    (parsed.statBlock as any).spellcasting = spellcasting.map(block => ({
      ...block,
      spells: block.spells.map(spell => ({
        ...spell,
        sourceUrl: references.get(spell.name.toLocaleLowerCase())?.sourceUrl,
      })),
    }));
  }

  return prisma.creatureTemplate.update({
    where: { id: creature.id },
    data: {
      name: parsed.name,
      challengeRating: parsed.challengeRating,
      creatureType: parsed.creatureType,
      alignment: parsed.alignment,
      statBlock: parsed.statBlock,
      size: parsed.size,
    },
  });
}

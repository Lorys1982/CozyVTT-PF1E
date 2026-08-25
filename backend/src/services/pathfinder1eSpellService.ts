const AON_BASE_URL = 'https://www.aonprd.com';
const AON_SPELL_INDEX_URL = `${AON_BASE_URL}/Spells.aspx?Class=All`;

export interface AonSpellSummary {
  name: string;
  itemName: string;
  summary: string;
  sourceUrl: string;
}

export interface AonSpellDetail extends AonSpellSummary {
  source?: string;
  school?: string;
  levels?: string;
  castingTime?: string;
  components?: string;
  range?: string;
  target?: string;
  area?: string;
  effect?: string;
  duration?: string;
  savingThrow?: string;
  spellResistance?: string;
  description?: string;
}

const entities: Record<string,string> = {
  amp: '&', apos: "'", '#39': "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
  ndash: '–', mdash: '—', minus: '−', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodeHtml(value:string):string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity:string) => {
    if (entities[entity]) return entities[entity];
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2),16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1),10));
    return match;
  });
}

function plainText(value:string):string {
  return decodeHtml(value.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' '))
    .replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
}

function field(html:string,label:string):string|undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const value = html.match(new RegExp(`<b>${escaped}<\\/b>\\s*([\\s\\S]*?)(?=<br\\s*\\/?>|<h3|<b>(?:Target|Area|Effect|Duration|Saving Throw|Spell Resistance)<\\/b>|$)`,'i'))?.[1];
  return value ? plainText(value).replace(/;\s*$/,'') : undefined;
}

async function fetchHtml(url:string):Promise<string> {
  const response = await fetch(url,{
    headers:{'User-Agent':'CozyVTT/1.1 (self-hosted VTT; PF1e rules lookup)','Accept':'text/html'},
    signal:AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Archives of Nethys returned ${response.status} ${response.statusText}`);
  return response.text();
}

export function parseAonSpellIndex(html:string):AonSpellSummary[] {
  const results = new Map<string,AonSpellSummary>();
  const pattern = /href="SpellDisplay\.aspx\?ItemName=([^"]+)"[^>]*>([\s\S]*?)<\/a><\/b>:\s*([\s\S]*?)<br\s*\/?>/gi;
  let match:RegExpExecArray|null;
  while ((match = pattern.exec(html)) !== null) {
    const itemName = decodeHtml(match[1]).trim();
    const name = plainText(match[2]).replace(/\s+(?:[FMRTY]\s*)+$/,'').trim();
    if (!name || results.has(itemName)) continue;
    results.set(itemName,{name,itemName,summary:plainText(match[3]),sourceUrl:`${AON_BASE_URL}/SpellDisplay.aspx?ItemName=${encodeURIComponent(itemName)}`});
  }
  return [...results.values()];
}

export function parseAonSpellPage(html:string,fallback:AonSpellSummary):AonSpellDetail {
  const content = [...html.matchAll(/<span id="MainContent_DataListTypes_LabelName_\d+">([\s\S]*?)<\/span>/gi)]
    .map(match => match[1])
    .find(value => /<h1[^>]*class="title"/i.test(value));
  if (!content) throw new Error(`Archives of Nethys did not return a spell page for ${fallback.itemName}`);
  const name = plainText(content.match(/<h1[^>]*class="title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? fallback.name);
  const schoolAndLevel = content.match(/<b>School<\/b>\s*([\s\S]*?)\s*;\s*<b>Level<\/b>\s*([\s\S]*?)(?=<h3|<br|$)/i);
  const description = content.match(/<h3[^>]*>Description<\/h3>([\s\S]*?)$/i)?.[1];
  return {
    ...fallback,
    name,
    source: field(content,'Source'),
    school: schoolAndLevel ? plainText(schoolAndLevel[1]).replace(/\[\s+/g,'[').replace(/\s+\]/g,']') : undefined,
    levels: schoolAndLevel ? plainText(schoolAndLevel[2]) : undefined,
    castingTime: field(content,'Casting Time'), components: field(content,'Components'),
    range: field(content,'Range'), target: field(content,'Target'), area: field(content,'Area'),
    effect: field(content,'Effect'), duration: field(content,'Duration'),
    savingThrow: field(content,'Saving Throw'), spellResistance: field(content,'Spell Resistance'),
    description: description ? plainText(description) : fallback.summary,
  };
}

let spellIndexPromise:Promise<AonSpellSummary[]>|undefined;
const spellDetailPromises=new Map<string,Promise<AonSpellDetail>>();

async function getSpellIndex():Promise<AonSpellSummary[]> {
  spellIndexPromise ??= fetchHtml(AON_SPELL_INDEX_URL).then(parseAonSpellIndex).then(spells => {
    if (!spells.length) throw new Error('Archives of Nethys spell index could not be parsed');
    return spells;
  }).catch(error => { spellIndexPromise = undefined; throw error; });
  return spellIndexPromise;
}

export async function searchAonSpells(query:string,limit=20):Promise<AonSpellSummary[]> {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  return (await getSpellIndex())
    .filter(spell => spell.name.toLocaleLowerCase().includes(needle))
    .sort((a,b) => Number(!a.name.toLocaleLowerCase().startsWith(needle)) - Number(!b.name.toLocaleLowerCase().startsWith(needle)) || a.name.localeCompare(b.name))
    .slice(0,Math.min(Math.max(limit,1),50));
}

export async function resolveAonSpellNames(names:string[]):Promise<Map<string,AonSpellSummary>> {
  const wanted = new Set(names.map(name => name.trim().toLocaleLowerCase()));
  const resolved = new Map<string,AonSpellSummary>();
  for (const spell of await getSpellIndex()) {
    const key = spell.name.toLocaleLowerCase();
    if (wanted.has(key)) resolved.set(key,spell);
  }
  return resolved;
}

export async function getAonSpell(itemName:string):Promise<AonSpellDetail> {
  const cleanName=itemName.trim();
  if(!cleanName||cleanName.length>200) throw new Error('Invalid Archives of Nethys spell name');
  const cached=spellDetailPromises.get(cleanName);
  if(cached)return cached;
  const pending=(async()=>{
    const summary = (await getSpellIndex()).find(spell => spell.itemName === cleanName) ?? {
      name:cleanName,itemName:cleanName,summary:'',sourceUrl:`${AON_BASE_URL}/SpellDisplay.aspx?ItemName=${encodeURIComponent(cleanName)}`,
    };
    return parseAonSpellPage(await fetchHtml(summary.sourceUrl),summary);
  })();
  spellDetailPromises.set(cleanName,pending);
  pending.catch(()=>spellDetailPromises.delete(cleanName));
  return pending;
}

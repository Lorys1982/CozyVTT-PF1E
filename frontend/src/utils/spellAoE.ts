export type SpellAoEShape = 'sphere' | 'cylinder' | 'cone' | 'line' | 'cube';

export interface SpellAoEConfig {
  shape: SpellAoEShape;
  /** Radius for circles/cylinders; length for cones/lines; side for cubes. */
  sizeFt: number;
  widthFt?: number;
}

export interface SpellGeometryText {
  area?: string;
  effect?: string;
  range?: string;
}

export interface SpellAoEParseOptions {
  level?: number;
  /** Ruleset-specific meanings for bare labels such as "close" or "long". */
  namedRanges?: Record<string, (level: number) => number>;
}

const DISTANCE = String.raw`(\d[\d,]*(?:\.\d+)?)\s*(?:-\s*)?(feet|foot|ft\.?|miles?|mi\.?)`;
const LEVEL = String.raw`(?:caster\s*)?(?:levels?|lvls?\.?)`;

function toFeet(value: string, unit: string): number {
  const amount = Number(value.replace(/,/g, ''));
  return /^(?:mi|mile)/i.test(unit) ? amount * 5280 : amount;
}

function capFrom(text: string): number | undefined {
  const match = text.match(new RegExp(String.raw`(?:maximum|max\.?|up to)\s+${DISTANCE}`, 'i'));
  return match ? toFeet(match[1], match[2]) : undefined;
}

/** Resolve fixed distances and base/increment/level formulas independent of any game system. */
export function distanceFromRulesText(
  text: string,
  { level, namedRanges }: SpellAoEParseOptions = {},
): number | undefined {
  const cleaned = text.replace(/[\u2010-\u2015]/g, '-').replace(/\bper\b/gi, '/');
  const additive = cleaned.match(new RegExp(
    String.raw`${DISTANCE}\s*\+\s*(\d[\d,]*(?:\.\d+)?)\s*(?:-\s*)?(feet|foot|ft\.?|miles?|mi\.?)?\s*\/\s*(\d+)?\s*${LEVEL}`,
    'i',
  ));
  if (additive && level !== undefined) {
    const base = toFeet(additive[1], additive[2]);
    const increment = toFeet(additive[3], additive[4] || additive[2]);
    const result = base + increment * Math.floor(level / Number(additive[5] || 1));
    const cap = capFrom(cleaned);
    return cap === undefined ? result : Math.min(result, cap);
  }

  const perLevel = cleaned.match(new RegExp(String.raw`${DISTANCE}\s*\/\s*(\d+)?\s*${LEVEL}`, 'i'));
  if (perLevel && level !== undefined) {
    const result = toFeet(perLevel[1], perLevel[2]) * Math.floor(level / Number(perLevel[3] || 1));
    const cap = capFrom(cleaned);
    return cap === undefined ? result : Math.min(result, cap);
  }

  if (level !== undefined) {
    const normalizedName = cleaned.trim().toLocaleLowerCase();
    const namedRange = namedRanges?.[normalizedName];
    if (namedRange) return namedRange(level);
  }

  const fixed = cleaned.match(new RegExp(DISTANCE, 'i'));
  return fixed ? toFeet(fixed[1], fixed[2]) : undefined;
}

function distanceBeside(
  text: string,
  word: string,
  options: SpellAoEParseOptions,
): number | undefined {
  const before = text.match(new RegExp(`${DISTANCE}[^,;()]{0,20}\\b${word}\\b`, 'i'))?.[0];
  const after = text.match(new RegExp(`\\b${word}\\b[^,;()]{0,20}${DISTANCE}`, 'i'))?.[0];
  return distanceFromRulesText(before ?? after ?? '', options);
}

/** Convert common rules-text geometry into the board's system-neutral template model. */
export function spellAoEFromRulesText(
  spell: SpellGeometryText,
  options: SpellAoEParseOptions = {},
): SpellAoEConfig | undefined {
  const effect = spell.effect?.trim();
  const geometricEffect = effect && /\b(?:radius|cone|line|cube|cylinder)\b/i.test(effect) ? effect : undefined;
  const area = spell.area?.trim() || geometricEffect;
  if (!area || /^(?:none|see text)$/i.test(area)) return undefined;

  const normalized = area.replace(/[\u2010-\u2015]/g, '-');
  const fallbackLength = () => distanceFromRulesText(normalized, options)
    ?? distanceFromRulesText(spell.range ?? '', options);

  if (/\bcylinder\b/i.test(normalized)) {
    const radius = distanceBeside(normalized, 'radius', options);
    if (radius && radius > 0) return { shape: 'cylinder', sizeFt: radius };
  }
  if (/\bcone(?:-shaped)?\b/i.test(normalized)) {
    const length = fallbackLength();
    if (length && length > 0) return { shape: 'cone', sizeFt: length };
  }
  if (/\bline(?:-shaped)?\b/i.test(normalized)) {
    const length = distanceBeside(normalized, 'long', options) ?? fallbackLength();
    const width = distanceBeside(normalized, 'wide', options) ?? 5;
    if (length && length > 0) return { shape: 'line', sizeFt: length, widthFt: width };
  }
  if (/\bcube\b/i.test(normalized)) {
    const side = distanceFromRulesText(normalized, options);
    if (side && side > 0) return { shape: 'cube', sizeFt: side };
  }
  if (/\bradius\b/i.test(normalized)) {
    const radius = distanceBeside(normalized, 'radius', options);
    if (radius && radius > 0) return { shape: 'sphere', sizeFt: radius };
  }
  return undefined;
}

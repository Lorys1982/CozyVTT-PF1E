import type { PF1eSpell } from '@/types/game-systems/pathfinder1e';

export type SpellAoEShape = 'sphere' | 'cylinder' | 'cone' | 'line' | 'cube';

export interface SpellAoEConfig {
  shape: SpellAoEShape;
  /** Radius for circles/cylinders; length for cones/lines; side for cubes. */
  sizeFt: number;
  widthFt?: number;
}

const DISTANCE = String.raw`(\d[\d,]*(?:\.\d+)?)\s*(?:-\s*)?(feet|foot|ft\.?|miles?|mi\.?)`;

function toFeet(value: string, unit: string): number {
  const amount = Number(value.replace(/,/g, ''));
  return /^(?:mi|mile)/i.test(unit) ? amount * 5280 : amount;
}

function capFrom(text: string): number | undefined {
  const match = text.match(new RegExp(String.raw`(?:maximum|max\.?|up to)\s+${DISTANCE}`, 'i'));
  return match ? toFeet(match[1], match[2]) : undefined;
}

/** Resolve both fixed distances and common PF1e per-level distance formulas. */
function distanceFrom(text: string, casterLevel?: number): number | undefined {
  const cleaned = text.replace(/[\u2010-\u2015]/g, '-');
  const formula = cleaned.match(new RegExp(
    String.raw`${DISTANCE}\s*(?:\+\s*${DISTANCE}\s*\/\s*(\d+)?\s*levels?|\/\s*(\d+)?\s*levels?)`,
    'i',
  ));
  if (formula && casterLevel !== undefined) {
    const base = toFeet(formula[1], formula[2]);
    let result: number;
    if (formula[3]) {
      const increment = toFeet(formula[3], formula[4]);
      result = base + increment * Math.floor(casterLevel / Number(formula[5] || 1));
    } else {
      result = base * Math.floor(casterLevel / Number(formula[6] || 1));
    }
    const cap = capFrom(cleaned);
    return cap === undefined ? result : Math.min(result, cap);
  }
  const fixed = cleaned.match(new RegExp(DISTANCE, 'i'));
  return fixed ? toFeet(fixed[1], fixed[2]) : undefined;
}

function distanceBeside(text: string, word: string, casterLevel?: number): number | undefined {
  const before = text.match(new RegExp(`${DISTANCE}[^,;()]{0,20}\\b${word}\\b`, 'i'))?.[0];
  const after = text.match(new RegExp(`\\b${word}\\b[^,;()]{0,20}${DISTANCE}`, 'i'))?.[0];
  return distanceFrom(before ?? after ?? '', casterLevel);
}

/**
 * Turn Archives of Nethys' prose Area field into the board's template model.
 * Returns undefined for targets, walls and other descriptions whose geometry
 * would be guesswork. Range is used only when an Area explicitly says cone or
 * line but omits its length (a common PF1e notation).
 */
export function spellAoEFromPf1e(
  spell: Pick<PF1eSpell, 'area' | 'effect' | 'range'>,
  casterLevel?: number,
): SpellAoEConfig | undefined {
  const effect = spell.effect?.trim();
  const geometricEffect = effect && /\b(?:radius|cone|line|cube|cylinder)\b/i.test(effect) ? effect : undefined;
  const area = spell.area?.trim() || geometricEffect;
  if (!area || /^(?:none|see text)$/i.test(area)) return undefined;

  const normalized = area.replace(/[\u2010-\u2015]/g, '-');
  const fallbackLength = () => distanceFrom(normalized, casterLevel)
    ?? distanceFrom(spell.range ?? '', casterLevel);

  if (/\bcylinder\b/i.test(normalized)) {
    const radius = distanceBeside(normalized, 'radius', casterLevel);
    if (radius && radius > 0) return { shape: 'cylinder', sizeFt: radius };
  }

  if (/\bcone(?:-shaped)?\b/i.test(normalized)) {
    const length = fallbackLength();
    if (length && length > 0) return { shape: 'cone', sizeFt: length };
  }

  if (/\bline(?:-shaped)?\b/i.test(normalized)) {
    const length = distanceBeside(normalized, 'long', casterLevel) ?? fallbackLength();
    const width = distanceBeside(normalized, 'wide', casterLevel) ?? 5;
    if (length && length > 0) return { shape: 'line', sizeFt: length, widthFt: width };
  }

  if (/\bcube\b/i.test(normalized)) {
    const side = distanceFrom(normalized, casterLevel);
    if (side && side > 0) return { shape: 'cube', sizeFt: side };
  }

  if (/\bradius\b/i.test(normalized)) {
    const radius = distanceBeside(normalized, 'radius', casterLevel);
    if (radius && radius > 0) return { shape: 'sphere', sizeFt: radius };
  }

  return undefined;
}

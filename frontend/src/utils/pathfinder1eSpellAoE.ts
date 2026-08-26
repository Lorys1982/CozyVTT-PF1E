import type { PF1eSpell } from '@/types/game-systems/pathfinder1e';
import {
  distanceFromRulesText,
  spellAoEFromRulesText,
  type SpellAoEConfig,
} from './spellAoE';

export type { SpellAoEConfig, SpellAoEShape } from './spellAoE';

const PF1E_NAMED_RANGES: Record<string, (level: number) => number> = {
  close: level => 25 + 5 * Math.floor(level / 2),
  short: level => 25 + 5 * Math.floor(level / 2),
  medium: level => 100 + 10 * level,
  long: level => 400 + 40 * level,
};

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
  return spellAoEFromRulesText(spell, { level: casterLevel, namedRanges: PF1E_NAMED_RANGES });
}

/** Calculate how far from the caster a PF1 spell can be placed. This is not its affected area. */
export function spellRangeFromPf1e(
  spell: Pick<PF1eSpell, 'range'>,
  casterLevel?: number,
): number | undefined {
  if (!spell.range) return undefined;
  return distanceFromRulesText(spell.range, { level: casterLevel, namedRanges: PF1E_NAMED_RANGES });
}

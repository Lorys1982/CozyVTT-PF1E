import { describe, expect, it } from 'vitest';
import { spellAoEFromPf1e, spellRangeFromPf1e } from './pathfinder1eSpellAoE';

describe('spellAoEFromPf1e', () => {
  it.each([
    ['20-ft.-radius spread', undefined, { shape: 'sphere', sizeFt: 20 }],
    ['30-foot cone-shaped burst', undefined, { shape: 'cone', sizeFt: 30 }],
    ['5-ft.-wide, 120-ft.-long line', undefined, { shape: 'line', sizeFt: 120, widthFt: 5 }],
    ['10-ft. cube', undefined, { shape: 'cube', sizeFt: 10 }],
    ['cylinder (20-ft. radius, 40 ft. high)', undefined, { shape: 'cylinder', sizeFt: 20 }],
  ])('parses %s', (area, range, expected) => {
    expect(spellAoEFromPf1e({ area, range })).toEqual(expected);
  });

  it('uses range for a cone whose Area omits the length', () => {
    expect(spellAoEFromPf1e({ area: 'cone-shaped burst', range: '15 ft.' }))
      .toEqual({ shape: 'cone', sizeFt: 15 });
  });

  it('uses a geometric Effect when the Area field is absent', () => {
    expect(spellAoEFromPf1e({ effect: 'cloud spreads in a 40-ft.-radius', range: 'medium' }))
      .toEqual({ shape: 'sphere', sizeFt: 40 });
  });

  it('evaluates common caster-level ranges and their cap', () => {
    expect(spellAoEFromPf1e({ area: 'line-shaped burst', range: '25 ft. + 5 ft./2 levels (maximum 60 ft.)' }, 10))
      .toEqual({ shape: 'line', sizeFt: 50, widthFt: 5 });
  });

  it.each([
    ['short (20ft + 5/2lvl)', 8, 40],
    ['close (25 ft. + 5 ft./2 lvls.)', 10, 50],
    ['medium (100 ft. + 10 ft. per level)', 7, 170],
  ])('accepts compact imported range %s', (range, casterLevel, sizeFt) => {
    expect(spellAoEFromPf1e({ area: 'cone-shaped burst', range }, casterLevel))
      .toEqual({ shape: 'cone', sizeFt });
  });

  it('resolves a named range when the imported formula is absent', () => {
    expect(spellAoEFromPf1e({ area: 'cone-shaped burst', range: 'close' }, 10))
      .toEqual({ shape: 'cone', sizeFt: 50 });
  });

  it('does not invent geometry for targeted or descriptive areas', () => {
    expect(spellAoEFromPf1e({ area: 'one creature/level' }, 10)).toBeUndefined();
    expect(spellAoEFromPf1e({ area: 'see text' }, 10)).toBeUndefined();
  });
});

describe('spellRangeFromPf1e', () => {
  it('calculates the Range field independently from Area', () => {
    expect(spellRangeFromPf1e({ range: 'short (20ft + 5/2lvl)' }, 8)).toBe(40);
  });

  it('does not treat touch or personal spells as ranged areas', () => {
    expect(spellRangeFromPf1e({ range: 'touch' }, 8)).toBeUndefined();
    expect(spellRangeFromPf1e({ range: 'personal' }, 8)).toBeUndefined();
  });
});

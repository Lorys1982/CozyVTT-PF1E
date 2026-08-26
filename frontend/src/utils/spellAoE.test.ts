import { describe, expect, it } from 'vitest';
import { distanceFromRulesText, spellAoEFromRulesText } from './spellAoE';

describe('generic spell AoE rules-text parser', () => {
  it('evaluates an explicit formula without knowing its game system', () => {
    expect(distanceFromRulesText('short (20ft + 5/2lvl)', { level: 8 })).toBe(40);
  });

  it('does not assign a system-specific meaning to a bare named range', () => {
    expect(distanceFromRulesText('close', { level: 10 })).toBeUndefined();
  });

  it('accepts named-range rules from a system adapter', () => {
    expect(distanceFromRulesText('near', {
      level: 6,
      namedRanges: { near: level => 10 + level * 5 },
    })).toBe(40);
  });

  it('builds geometry from system-neutral area, effect and range text', () => {
    expect(spellAoEFromRulesText({ area: 'cone-shaped burst', range: '30 feet' }))
      .toEqual({ shape: 'cone', sizeFt: 30 });
  });
});

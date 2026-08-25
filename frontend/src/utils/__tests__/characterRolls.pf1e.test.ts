import { describe, expect, it } from 'vitest';
import { getCharacterRolls, getInitiativeExpression } from '../characterRolls';

describe('Pathfinder 1e character rolls', () => {
  const data = {
    abilities: {
      str: { score: 16 },
      dex: { score: 14, tempScore: 18, checkMiscModifier: 1, checkTempModifier: 2 },
      con: { score: 12 },
      int: { score: 10 },
      wis: { score: 8 },
      cha: { score: 10 },
    },
    initiative: { miscModifier: 2, tempModifier: 3 },
    saves: {
      fort: { base: 2, magicModifier: 1 },
      reflex: { total: 7 },
      will: { base: 1 },
    },
    skills: [
      { name: 'Acrobatics', ability: 'dex', ranks: 2, classSkill: true, misc: 1, temp: 2 },
    ],
    melee: [
      { weapon: 'Longsword', attackBonus: '+6/+1', damage: '1d8+3' },
    ],
    ranged: [],
  };

  it('uses the temporary Dexterity score for initiative', () => {
    expect(getInitiativeExpression('PATHFINDER_1E', data)).toBe('1d20+9');
  });

  it('extracts abilities, computed and explicit saves, and computed skills', () => {
    const rolls = getCharacterRolls('PATHFINDER_1E', data);

    expect(rolls.abilities.find((roll) => roll.purpose === 'Dexterity Check')?.expression)
      .toBe('1d20+7');
    expect(rolls.savingThrows.find((roll) => roll.purpose === 'Fortitude Save')?.expression)
      .toBe('1d20+4');
    expect(rolls.savingThrows.find((roll) => roll.purpose === 'Reflex Save')?.expression)
      .toBe('1d20+7');
    expect(rolls.skills[0]?.expression).toBe('1d20+12');
  });

  it('uses the first iterative attack bonus and exposes valid damage dice', () => {
    const combat = getCharacterRolls('PATHFINDER_1E', data).combat;

    expect(combat.map((roll) => roll.expression)).toEqual(['1d20+6', '1d8+3']);
    expect(combat.every((roll) => !roll.supportsAdvantage)).toBe(true);
  });
});

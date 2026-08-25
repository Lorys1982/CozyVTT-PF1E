/** Pathfinder 1e character templates. */

import { GameSystem } from '@prisma/client';
import type { CharacterTemplate } from './dnd5e-templates';

export const pathfinder1eBlankTemplate: CharacterTemplate = {
  name: 'Blank Pathfinder 1e Character',
  description: 'A blank character sheet for Pathfinder 1st Edition',
  gameSystem: GameSystem.PATHFINDER_1E,
  data: {
    characterName: 'New Character',
    abilities: {
      str: { score: 10 },
      dex: { score: 10 },
      con: { score: 10 },
      int: { score: 10 },
      wis: { score: 10 },
      cha: { score: 10 },
    },
    melee: [],
    ranged: [],
    skills: [],
    feats: [],
    specialAbilities: [],
    traits: [],
    gear: [],
    spells: Array.from({ length: 10 }, () => ({ slotted: [] })),
    spellLikes: [],
  },
};

export function getPF1eTemplates(): CharacterTemplate[] {
  return [pathfinder1eBlankTemplate];
}

export function getPF1eTemplate(_templateName?: string): CharacterTemplate {
  return pathfinder1eBlankTemplate;
}

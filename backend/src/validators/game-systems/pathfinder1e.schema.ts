import { z } from 'zod';

const abilityKey = z.enum(['str','dex','con','int','wis','cha']);

const ability = z.object({
  score: z.number().int().optional(),
  tempScore: z.number().int().nullable().optional(),
  checkMiscModifier: z.number().int().optional(),
  checkTempModifier: z.number().int().optional(),
}).partial();

const save = z.object({
  total: z.number().int().optional(),
  base: z.number().int().optional(),
  magicModifier: z.number().int().optional(),
  miscModifier: z.number().int().optional(),
  tempModifier: z.number().int().optional(),
  overrideTotal: z.number().int().optional(),
  otherModifiers: z.string().optional(),
}).partial();

const skill = z.object({
  name: z.string().min(1),
  ability: abilityKey,
  trainedOnly: z.boolean().optional(),
  classSkill: z.boolean().optional(),
  total: z.number().int().optional(),
  ranks: z.number().int().min(0).optional(),
  racial: z.number().int().optional(),
  trait: z.number().int().optional(),
  misc: z.number().int().optional(),
  temp: z.number().int().optional(),
  overrideTotal: z.number().int().optional(),
});

const attack = z.object({
  weapon: z.string().min(1),
  baseDamage: z.string().optional(),
  attackAbility: abilityKey.optional(),
  damageAbility: z.union([abilityKey,z.literal('none')]).optional(),
  damageAbilityMultiplier: z.number().optional(),
  enhancementBonus: z.number().int().optional(),
  attackMiscModifier: z.number().int().optional(),
  attackTempModifier: z.number().int().optional(),
  damageMiscModifier: z.number().int().optional(),
  damageTempModifier: z.number().int().optional(),
  attackOverride: z.string().optional(),
  damageOverride: z.string().optional(),
  attackBonus: z.string().optional(),
  damage: z.string().optional(),
  damageType: z.string().optional(),
  additionalDamage: z.array(z.object({
    formula: z.string().min(1),
    type: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
  critical: z.string().optional(),
  type: z.string().optional(),
  range: z.string().optional(),
  notes: z.string().optional(),
  ammunition: z.string().optional(),
});

const feature = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  itemName: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  rulesSource: z.literal('Archives of Nethys').optional(),
  prerequisites: z.string().optional(),
  benefit: z.string().optional(),
  normal: z.string().optional(),
  special: z.string().optional(),
});

const acItem = z.object({
  name: z.string().min(1),
  bonus: z.number().int().optional(),
  type: z.string().optional(),
  armorCheckPenalty: z.number().int().optional(),
  spellFailure: z.number().int().optional(),
  maxDexBonus: z.number().int().optional(),
  equipped: z.boolean().optional(),
  weight: z.string().optional(),
  properties: z.string().optional(),
});

const gear = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  location: z.string().optional(),
  weight: z.string().optional(),
  notes: z.string().optional(),
});

const spell = z.object({
  name: z.string().min(1),
  itemName: z.string().optional(),
  school: z.string().optional(),
  level: z.string().optional(),
  source: z.string().optional(),
  rulesSource: z.enum(['Archives of Nethys','d20pfsrd']).optional(),
  castingTime: z.string().optional(),
  components: z.string().optional(),
  range: z.string().optional(),
  target: z.string().optional(),
  area: z.string().optional(),
  effect: z.string().optional(),
  duration: z.string().optional(),
  savingThrow: z.string().optional(),
  spellResistance: z.string().optional(),
  description: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  prepared: z.number().int().min(0).optional(),
  cast: z.number().int().min(0).optional(),
  atWill: z.boolean().optional(),
  notes: z.string().optional(),
});

const spellLevel = z.object({
  totalKnown: z.number().int().min(0).optional(),
  dc: z.number().int().optional(),
  dcOverride: z.number().int().optional(),
  totalPerDay: z.number().int().min(0).optional(),
  currentPerDay: z.number().int().min(0).optional(),
  bonusSpells: z.number().int().min(0).optional(),
  slotted: z.array(spell).optional(),
}).partial();

export const pathfinder1eCharacterDataSchema = z.object({
  characterName: z.string().min(1).max(100),
  themeColor: z.string().optional(),
  playerName: z.string().max(100).optional(),
  alignment: z.string().optional(),
  classAndLevel: z.string().optional(),
  deity: z.string().optional(),
  homeland: z.string().optional(),
  race: z.string().optional(),
  size: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  hair: z.string().optional(),
  eyes: z.string().optional(),

  abilities: z.object({
    str: ability, dex: ability, con: ability, int: ability, wis: ability, cha: ability,
  }).optional(),

  ac: z.object({
    total: z.number().int().optional(),
    armorBonus: z.number().int().optional(),
    shieldBonus: z.number().int().optional(),
    sizeModifier: z.number().int().optional(),
    naturalArmor: z.number().int().optional(),
    deflectionModifier: z.number().int().optional(),
    dodgeModifier: z.number().int().optional(),
    miscModifier: z.number().int().optional(),
    tempModifier: z.number().int().optional(),
    touchModifier: z.number().int().optional(),
    flatFootedModifier: z.number().int().optional(),
    overrideTotal: z.number().int().optional(),
    overrideTouch: z.number().int().optional(),
    overrideFlatFooted: z.number().int().optional(),
    touch: z.number().int().optional(),
    flatFooted: z.number().int().optional(),
    otherModifiers: z.string().optional(),
    items: z.array(acItem).optional(),
  }).optional(),

  hp: z.object({
    total: z.number().int().optional(),
    current: z.number().int().optional(),
    temporary: z.number().int().min(0).optional(),
    nonLethal: z.number().int().min(0).optional(),
    longRestRestore: z.number().int().min(0).optional(),
  }).optional(),

  damageReduction: z.string().optional(),
  spellResistance: z.string().optional(),
  saves: z.object({ fort: save.optional(), reflex: save.optional(), will: save.optional() }).optional(),
  resistances: z.string().optional(),
  immunities: z.string().optional(),
  cmd: z.object({
    total: z.number().int().optional(),
    sizeModifier: z.number().int().optional(),
    miscModifiers: z.string().optional(),
    tempModifiers: z.string().optional(),
    overrideTotal: z.number().int().optional(),
  }).optional(),

  initiative: z.object({ total: z.number().int().optional(), miscModifier: z.number().int().optional(), tempModifier: z.number().int().optional(), overrideTotal: z.number().int().optional() }).optional(),
  bab: z.number().int().optional(),
  babMiscModifier: z.number().int().optional(),
  conditionalOffenseModifiers: z.string().optional(),
  speed: z.object({
    base: z.string().optional(), withArmor: z.string().optional(), fly: z.string().optional(),
    swim: z.string().optional(), climb: z.string().optional(), burrow: z.string().optional(),
    tempModifiers: z.string().optional(),
  }).optional(),
  cmb: z.object({
    total: z.number().int().optional(),
    sizeModifier: z.number().int().optional(),
    miscModifiers: z.string().optional(),
    tempModifiers: z.string().optional(),
    overrideTotal: z.number().int().optional(),
  }).optional(),
  melee: z.array(attack).optional(),
  ranged: z.array(attack).optional(),

  skills: z.array(skill).optional(),
  skillConditionalModifiers: z.string().optional(),
  languages: z.string().optional(),
  xp: z.object({ total: z.number().int().min(0).optional(), toNextLevel: z.number().int().min(0).optional() }).optional(),

  feats: z.array(feature).optional(),
  specialAbilities: z.array(feature).optional(),
  traits: z.array(feature).optional(),

  money: z.object({
    pp: z.number().int().min(0).optional(), gp: z.number().int().min(0).optional(),
    sp: z.number().int().min(0).optional(), cp: z.number().int().min(0).optional(),
    gems: z.string().optional(), other: z.string().optional(),
  }).optional(),
  gear: z.array(gear).optional(),

  spells: z.array(spellLevel).max(10).optional(),
  spellLikes: z.array(spell).optional(),
  spellcastingAbility: abilityKey.optional(),
  spellcastingType: z.enum(['prepared','spontaneous']).optional(),
  casterLevel: z.number().int().min(0).optional(),
  spellDcMiscModifier: z.number().int().optional(),
  spellDcTempModifier: z.number().int().optional(),
  concentrationMiscModifier: z.number().int().optional(),
  concentrationTempModifier: z.number().int().optional(),
  concentrationOverride: z.number().int().optional(),
  concentrationTotal: z.number().int().optional(),
  spellDcConditionalModifiers: z.array(z.object({
    source: z.string().min(1),
    condition: z.string().min(1),
    dcModifier: z.number().int(),
    notes: z.string().optional(),
  })).optional(),
  spellsConditionalModifiers: z.string().optional(),
  spellsSpeciality: z.string().optional(),
  notes: z.string().max(50000).optional(),
});

export type PF1eCharacterData = z.infer<typeof pathfinder1eCharacterDataSchema>;

export type PF1eAbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface PF1eAbility {
  score?: number;
  tempScore?: number | null;
  checkMiscModifier?: number;
  checkTempModifier?: number;
}

export interface PF1eSave {
  total?: number;
  base?: number;
  magicModifier?: number;
  miscModifier?: number;
  tempModifier?: number;
  overrideTotal?: number;
  otherModifiers?: string;
}

export interface PF1eSkill {
  name: string;
  ability: PF1eAbilityKey;
  trainedOnly?: boolean;
  classSkill?: boolean;
  total?: number;
  ranks?: number;
  racial?: number;
  trait?: number;
  misc?: number;
  temp?: number;
  overrideTotal?: number;
}

export interface PF1eAttack {
  weapon: string;
  /** Base weapon dice (for example 1d8). When set, attack and damage are derived. */
  baseDamage?: string;
  attackAbility?: PF1eAbilityKey;
  damageAbility?: PF1eAbilityKey | 'none';
  damageAbilityMultiplier?: number;
  enhancementBonus?: number;
  attackMiscModifier?: number;
  attackTempModifier?: number;
  damageMiscModifier?: number;
  damageTempModifier?: number;
  attackOverride?: string;
  damageOverride?: string;
  attackBonus?: string;
  damage?: string;
  critical?: string;
  type?: string;
  range?: string;
  notes?: string;
  ammunition?: string;
}

export interface PF1eFeature {
  name: string;
  type?: string;
  description?: string;
}

export interface PF1eACItem {
  name: string;
  bonus?: number;
  type?: string;
  armorCheckPenalty?: number;
  spellFailure?: number;
  maxDexBonus?: number;
  equipped?: boolean;
  weight?: string;
  properties?: string;
}

export interface PF1eGearItem {
  name: string;
  type?: string;
  quantity?: number;
  location?: string;
  weight?: string;
  notes?: string;
}

export interface PF1eSpell {
  name: string;
  itemName?: string;
  school?: string;
  level?: string;
  source?: string;
  rulesSource?: 'Archives of Nethys' | 'd20pfsrd';
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
  sourceUrl?: string;
  prepared?: number;
  cast?: number;
  atWill?: boolean;
  notes?: string;
}

export interface PF1eSpellReference {
  name: string;
  itemName: string;
  summary: string;
  sourceUrl: string;
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

export interface PF1eSpellLevel {
  totalKnown?: number;
  dc?: number;
  dcOverride?: number;
  totalPerDay?: number;
  bonusSpells?: number;
  slotted?: PF1eSpell[];
}

export interface PF1eCharacterData {
  characterName: string;
  themeColor?: string;
  playerName?: string;
  alignment?: string;
  classAndLevel?: string;
  deity?: string;
  homeland?: string;
  race?: string;
  size?: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  hair?: string;
  eyes?: string;

  abilities?: Record<PF1eAbilityKey, PF1eAbility>;

  ac?: {
    total?: number;
    armorBonus?: number;
    shieldBonus?: number;
    sizeModifier?: number;
    naturalArmor?: number;
    deflectionModifier?: number;
    dodgeModifier?: number;
    miscModifier?: number;
    tempModifier?: number;
    touchModifier?: number;
    flatFootedModifier?: number;
    overrideTotal?: number;
    overrideTouch?: number;
    overrideFlatFooted?: number;
    touch?: number;
    flatFooted?: number;
    otherModifiers?: string;
    items?: PF1eACItem[];
  };

  hp?: { total?: number; current?: number; temporary?: number; nonLethal?: number };
  damageReduction?: string;
  spellResistance?: string;
  saves?: { fort?: PF1eSave; reflex?: PF1eSave; will?: PF1eSave };
  resistances?: string;
  immunities?: string;

  cmd?: { total?: number; sizeModifier?: number; miscModifiers?: string; tempModifiers?: string; overrideTotal?: number };

  initiative?: { total?: number; miscModifier?: number; tempModifier?: number; overrideTotal?: number };
  bab?: number;
  conditionalOffenseModifiers?: string;
  speed?: {
    base?: string;
    withArmor?: string;
    fly?: string;
    swim?: string;
    climb?: string;
    burrow?: string;
    tempModifiers?: string;
  };
  cmb?: { total?: number; sizeModifier?: number; miscModifiers?: string; tempModifiers?: string; overrideTotal?: number };

  melee?: PF1eAttack[];
  ranged?: PF1eAttack[];
  skills?: PF1eSkill[];
  skillConditionalModifiers?: string;
  languages?: string;
  xp?: { total?: number; toNextLevel?: number };

  feats?: PF1eFeature[];
  specialAbilities?: PF1eFeature[];
  traits?: PF1eFeature[];

  money?: { pp?: number; gp?: number; sp?: number; cp?: number; gems?: string; other?: string };
  gear?: PF1eGearItem[];

  spells?: PF1eSpellLevel[];
  spellLikes?: PF1eSpell[];
  spellcastingAbility?: PF1eAbilityKey;
  casterLevel?: number;
  spellDcMiscModifier?: number;
  spellDcTempModifier?: number;
  concentrationMiscModifier?: number;
  concentrationTempModifier?: number;
  concentrationOverride?: number;
  concentrationTotal?: number;
  spellsConditionalModifiers?: string;
  spellsSpeciality?: string;

  notes?: string;
}

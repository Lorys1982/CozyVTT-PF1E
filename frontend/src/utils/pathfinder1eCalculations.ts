import type { PF1eAbilityKey, PF1eAttack, PF1eCharacterData } from '../types/game-systems/pathfinder1e';

export const pf1eAbilityModifier = (score?: number | null): number =>
  typeof score === 'number' ? Math.floor((score - 10) / 2) : 0;

const numericModifier = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const matches = value.match(/[+-]?\d+/g);
  return matches?.reduce((total, part) => total + Number(part), 0) ?? 0;
};

const abilityModifier = (data: PF1eCharacterData, key: PF1eAbilityKey): number => {
  const ability = data.abilities?.[key];
  return pf1eAbilityModifier(ability?.tempScore ?? ability?.score);
};

export function pf1eAbilityCheckModifier(data:PF1eCharacterData,key:PF1eAbilityKey):number {
  const ability=data.abilities?.[key];
  return abilityModifier(data,key)+(ability?.checkMiscModifier??0)+(ability?.checkTempModifier??0);
}

const SIZE_MODIFIERS: Record<string,number> = {
  fine: 8, diminutive: 4, tiny: 2, small: 1, medium: 0,
  large: -1, huge: -2, gargantuan: -4, colossal: -8,
};

/** PF1 attack/AC size modifier. CMB and CMD use the inverse value. */
export function pf1eSizeModifier(size?: string): number {
  if (!size) return 0;
  return SIZE_MODIFIERS[size.trim().toLocaleLowerCase()] ?? 0;
}

/** Bonus spells per day granted by a casting ability modifier. */
export function pf1eBonusSpells(abilityModifierValue:number,spellLevel:number):number {
  if (spellLevel < 1 || spellLevel > 9 || abilityModifierValue < spellLevel) return 0;
  return Math.floor((abilityModifierValue - spellLevel) / 4) + 1;
}

const fmt = (value:number):string => value >= 0 ? `+${value}` : `${value}`;

function calculateAttack(data:PF1eCharacterData,attack:PF1eAttack,ranged:boolean):PF1eAttack {
  // Legacy attacks without baseDamage keep their manually entered roll strings.
  if (!attack.baseDamage) return attack;
  const attackAbility = attack.attackAbility ?? (ranged ? 'dex' : 'str');
  const damageAbility = attack.damageAbility ?? (ranged ? 'none' : 'str');
  const attackTotal = (data.bab ?? 0) + abilityModifier(data,attackAbility) +
    (data.ac?.sizeModifier ?? pf1eSizeModifier(data.size)) +
    (attack.enhancementBonus ?? 0) + (attack.attackMiscModifier ?? 0) +
    (attack.attackTempModifier ?? 0);
  const iterativeBonuses:number[] = [];
  for (let bonus=attackTotal,bab=data.bab ?? 0; bab > 0; bonus-=5,bab-=5) iterativeBonuses.push(bonus);
  if (!iterativeBonuses.length) iterativeBonuses.push(attackTotal);

  const abilityDamage = damageAbility === 'none' ? 0 : Math.floor(
    abilityModifier(data,damageAbility) * (attack.damageAbilityMultiplier ?? 1),
  );
  const damageBonus = abilityDamage + (attack.enhancementBonus ?? 0) +
    (attack.damageMiscModifier ?? 0) + (attack.damageTempModifier ?? 0);
  return {
    ...attack,
    attackBonus: attack.attackOverride?.trim() || iterativeBonuses.map(fmt).join('/'),
    damage: attack.damageOverride?.trim() || `${attack.baseDamage}${damageBonus === 0 ? '' : fmt(damageBonus)}`,
  };
}

const ARMOR_CHECK_SKILLS = new Set([
  'acrobatics', 'climb', 'escape artist', 'fly', 'ride', 'sleight of hand', 'stealth', 'swim',
]);

/** Recalculate every PF1 total that is determined by other sheet values. */
export function calculatePF1eDerived(input: PF1eCharacterData): PF1eCharacterData {
  const data = structuredClone(input);
  const dex = abilityModifier(data, 'dex');
  const str = abilityModifier(data, 'str');
  const bab = data.bab ?? 0;

  const armorItems = (data.ac?.items ?? []).filter(item => item.equipped !== false);
  const itemArmor = Math.max(0, ...armorItems.filter(item => /armor/i.test(item.type ?? '')).map(item => item.bonus ?? 0));
  const itemShield = Math.max(0, ...armorItems.filter(item => /shield/i.test(item.type ?? '')).map(item => item.bonus ?? 0));
  const armor = itemArmor || data.ac?.armorBonus || 0;
  const shield = itemShield || data.ac?.shieldBonus || 0;
  const size = data.ac?.sizeModifier ?? pf1eSizeModifier(data.size);
  const maxDex = Math.min(Infinity,...armorItems
    .map(item => item.maxDexBonus)
    .filter((value):value is number => typeof value === 'number'));
  const acDex = Math.min(dex,maxDex);
  const natural = data.ac?.naturalArmor ?? 0;
  const deflection = data.ac?.deflectionModifier ?? 0;
  const dodge = data.ac?.dodgeModifier ?? 0;
  const miscAc = data.ac?.miscModifier ?? 0;
  const tempAc = data.ac?.tempModifier ?? 0;
  const calculatedAc = 10 + armor + shield + acDex + size + natural + deflection + dodge + miscAc + tempAc;
  const calculatedTouch = 10 + acDex + size + deflection + dodge + miscAc + tempAc + (data.ac?.touchModifier ?? 0);
  const calculatedFlatFooted = 10 + armor + shield + Math.min(acDex, 0) + size + natural +
    deflection + miscAc + tempAc + (data.ac?.flatFootedModifier ?? 0);
  data.ac = {
    ...data.ac,
    total: data.ac?.overrideTotal ?? calculatedAc,
    touch: data.ac?.overrideTouch ?? calculatedTouch,
    flatFooted: data.ac?.overrideFlatFooted ?? calculatedFlatFooted,
  };

  const saveAbilities: Record<'fort'|'reflex'|'will', PF1eAbilityKey> = {
    fort: 'con', reflex: 'dex', will: 'wis',
  };
  data.saves = {...data.saves};
  for (const saveName of Object.keys(saveAbilities) as Array<keyof typeof saveAbilities>) {
    const save = data.saves?.[saveName] ?? {};
    data.saves[saveName] = {
      ...save,
      total: save.overrideTotal ?? ((save.base ?? 0) + abilityModifier(data, saveAbilities[saveName]) +
        (save.magicModifier ?? 0) + (save.miscModifier ?? 0) + (save.tempModifier ?? 0)),
    };
  }

  data.initiative = {
    ...data.initiative,
    total: data.initiative?.overrideTotal ?? dex + (data.initiative?.miscModifier ?? 0) +
      (data.initiative?.tempModifier ?? 0),
  };
  data.cmb = {
    ...data.cmb,
    total: data.cmb?.overrideTotal ?? (bab + str + (data.cmb?.sizeModifier ?? -size) +
      numericModifier(data.cmb?.miscModifiers) + numericModifier(data.cmb?.tempModifiers)),
  };
  data.cmd = {
    ...data.cmd,
    total: data.cmd?.overrideTotal ?? (10 + bab + str + dex + (data.cmd?.sizeModifier ?? -size) +
      numericModifier(data.cmd?.miscModifiers) + numericModifier(data.cmd?.tempModifiers)),
  };

  const armorCheckPenalty = armorItems.reduce((total,item) => {
    const penalty = item.armorCheckPenalty ?? 0;
    return total + (penalty > 0 ? -penalty : penalty);
  },0);
  data.skills = data.skills?.map(skill => {
    const classBonus = skill.classSkill && (skill.ranks ?? 0) > 0 ? 3 : 0;
    const penaltyMultiplier = skill.name.toLowerCase() === 'swim' ? 2 : 1;
    const armorPenalty = ARMOR_CHECK_SKILLS.has(skill.name.toLowerCase()) ? armorCheckPenalty * penaltyMultiplier : 0;
    return {
      ...skill,
      total: skill.overrideTotal ?? (abilityModifier(data, skill.ability) + (skill.ranks ?? 0) + classBonus +
        (skill.racial ?? 0) + (skill.trait ?? 0) + (skill.misc ?? 0) + (skill.temp ?? 0) + armorPenalty),
    };
  });

  data.melee = data.melee?.map(attack => calculateAttack(data,attack,false));
  data.ranged = data.ranged?.map(attack => calculateAttack(data,attack,true));

  if (data.concentrationOverride !== undefined) {
    data.concentrationTotal = data.concentrationOverride;
  }
  if (data.spellcastingAbility) {
    const castingModifier = abilityModifier(data, data.spellcastingAbility);
    const dcModifier = (data.spellDcMiscModifier ?? 0)+(data.spellDcTempModifier??0);
    data.concentrationTotal = data.concentrationOverride ?? ((data.casterLevel ?? 0) + castingModifier +
      (data.concentrationMiscModifier ?? 0)+(data.concentrationTempModifier??0));
    data.spells = Array.from({length: 10}, (_, level) => ({
      ...(data.spells?.[level] ?? {slotted: []}),
      dc: data.spells?.[level]?.dcOverride ?? 10 + level + castingModifier + dcModifier,
      bonusSpells: pf1eBonusSpells(castingModifier,level),
    }));
  }

  return data;
}

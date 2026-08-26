import type {
  PF1eAbilityKey,
  PF1eCharacterData,
  PF1eSkill,
} from '../../../types/game-systems/pathfinder1e';
import { calculatePF1eDerived } from '../../../utils/pathfinder1eCalculations';

export const PF1E_ABILITIES: Array<{ key:PF1eAbilityKey; label:string; short:string }> = [
  {key:'str',label:'Strength',short:'STR'},
  {key:'dex',label:'Dexterity',short:'DEX'},
  {key:'con',label:'Constitution',short:'CON'},
  {key:'int',label:'Intelligence',short:'INT'},
  {key:'wis',label:'Wisdom',short:'WIS'},
  {key:'cha',label:'Charisma',short:'CHA'},
];

const SKILLS: Array<[string,PF1eAbilityKey,boolean?]> = [
  ['Acrobatics','dex'],['Appraise','int'],['Bluff','cha'],['Climb','str'],['Craft','int'],
  ['Diplomacy','cha'],['Disable Device','dex',true],['Disguise','cha'],['Escape Artist','dex'],
  ['Fly','dex'],['Handle Animal','cha',true],['Heal','wis'],['Intimidate','cha'],
  ['Knowledge (Arcana)','int',true],['Knowledge (Dungeoneering)','int',true],
  ['Knowledge (Engineering)','int',true],['Knowledge (Geography)','int',true],
  ['Knowledge (History)','int',true],['Knowledge (Local)','int',true],
  ['Knowledge (Nature)','int',true],['Knowledge (Nobility)','int',true],
  ['Knowledge (Planes)','int',true],['Knowledge (Religion)','int',true],
  ['Linguistics','int',true],['Perception','wis'],['Perform','cha'],['Profession','wis',true],
  ['Ride','dex'],['Sense Motive','wis'],['Sleight of Hand','dex',true],
  ['Spellcraft','int',true],['Stealth','dex'],['Survival','wis'],['Swim','str'],
  ['Use Magic Device','cha',true],
];

export const PF1E_DEFAULT_SKILLS:PF1eSkill[] = SKILLS.map(([name,ability,trainedOnly]) => ({
  name,ability,trainedOnly:!!trainedOnly,
}));

/** Keep every standard row while applying saved/imported values and retaining specializations. */
export function mergePF1eSkills(skills:PF1eSkill[]|undefined):PF1eSkill[] {
  const imported=skills??[];
  const byName=new Map(imported.map(skill=>[skill.name.trim().toLocaleLowerCase(),skill]));
  const standardNames=new Set(PF1E_DEFAULT_SKILLS.map(skill=>skill.name.toLocaleLowerCase()));
  return [
    ...PF1E_DEFAULT_SKILLS.map(defaultSkill=>({
      ...defaultSkill,
      ...byName.get(defaultSkill.name.toLocaleLowerCase()),
    })),
    ...imported.filter(skill=>!standardNames.has(skill.name.trim().toLocaleLowerCase())),
  ];
}

export function createPF1eSheetData(input:Partial<PF1eCharacterData>,fallbackName:string):PF1eCharacterData {
  const abilities = Object.fromEntries(PF1E_ABILITIES.map(({key}) => [
    key,{
      ...input.abilities?.[key],
      score:input.abilities?.[key]?.score ?? 10,
      tempScore:input.abilities?.[key]?.tempScore ?? null,
    },
  ])) as PF1eCharacterData['abilities'];
  return calculatePF1eDerived({
    ...input,
    characterName: input.characterName || fallbackName || 'New Character',
    abilities,
    ac: {...input.ac,items:input.ac?.items ?? []},
    hp: {total:0,current:0,temporary:0,nonLethal:0,...input.hp},
    saves: {
      fort:{...input.saves?.fort},reflex:{...input.saves?.reflex},will:{...input.saves?.will},
    },
    melee: input.melee ?? [],
    ranged: input.ranged ?? [],
    skills: mergePF1eSkills(input.skills),
    feats: input.feats ?? [],
    specialAbilities: input.specialAbilities ?? [],
    traits: input.traits ?? [],
    money: {...input.money},
    gear: input.gear ?? [],
    spells: Array.from({length:10},(_,level) => ({
      ...(input.spells?.[level] ?? {}),slotted:input.spells?.[level]?.slotted ?? [],
    })),
    spellLikes: input.spellLikes ?? [],
  });
}

/** Remove unfinished add-row placeholders before backend validation. */
export function preparePF1eDataForSave(input:PF1eCharacterData):PF1eCharacterData {
  const data=structuredClone(input);
  const named=<T extends {name:string}>(items:T[]|undefined):T[] =>
    (items??[]).filter(item=>item.name.trim().length>0);
  data.ac={...data.ac,items:named(data.ac?.items)};
  data.melee=(data.melee??[]).filter(item=>item.weapon.trim().length>0).map(item=>({...item,additionalDamage:item.additionalDamage?.filter(part=>part.formula.trim().length>0)}));
  data.ranged=(data.ranged??[]).filter(item=>item.weapon.trim().length>0).map(item=>({...item,additionalDamage:item.additionalDamage?.filter(part=>part.formula.trim().length>0)}));
  data.feats=named(data.feats);
  data.specialAbilities=named(data.specialAbilities);
  data.traits=named(data.traits);
  data.gear=named(data.gear);
  data.spells=(data.spells??[]).slice(0,10).map(level=>({...level,slotted:named(level.slotted)}));
  data.spellLikes=named(data.spellLikes);
  data.spellDcConditionalModifiers=(data.spellDcConditionalModifiers??[])
    .filter(modifier=>modifier.source.trim().length>0&&modifier.condition.trim().length>0);
  return calculatePF1eDerived(data);
}

export const numberOrUndefined = (value:string):number|undefined =>
  value === '' ? undefined : Number(value);

export const signed = (value:number):string => value >= 0 ? `+${value}` : `${value}`;

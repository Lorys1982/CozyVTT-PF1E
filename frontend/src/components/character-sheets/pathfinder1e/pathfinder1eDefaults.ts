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

export function createPF1eSheetData(input:Partial<PF1eCharacterData>,fallbackName:string):PF1eCharacterData {
  const abilities = Object.fromEntries(PF1E_ABILITIES.map(({key}) => [
    key,{score:input.abilities?.[key]?.score ?? 10,tempScore:input.abilities?.[key]?.tempScore ?? null},
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
    skills: input.skills?.length ? input.skills : structuredClone(PF1E_DEFAULT_SKILLS),
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
  data.melee=(data.melee??[]).filter(item=>item.weapon.trim().length>0);
  data.ranged=(data.ranged??[]).filter(item=>item.weapon.trim().length>0);
  data.feats=named(data.feats);
  data.specialAbilities=named(data.specialAbilities);
  data.traits=named(data.traits);
  data.gear=named(data.gear);
  data.spells=(data.spells??[]).slice(0,10).map(level=>({...level,slotted:named(level.slotted)}));
  data.spellLikes=named(data.spellLikes);
  return calculatePF1eDerived(data);
}

export const numberOrUndefined = (value:string):number|undefined =>
  value === '' ? undefined : Number(value);

export const signed = (value:number):string => value >= 0 ? `+${value}` : `${value}`;

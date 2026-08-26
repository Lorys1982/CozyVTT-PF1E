import type {
  PF1eAbilityKey,
  PF1eCharacterData,
  PF1eFeature,
  PF1eSkill,
  PF1eSpell,
  PF1eSpellLevel,
} from '@/types/game-systems/pathfinder1e';
import { calculatePF1eDerived } from '@/utils/pathfinder1eCalculations';

type JsonObject = Record<string, unknown>;

const objectValue = (value:unknown):JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};

const stringValue = (value:unknown):string|undefined => {
  if(typeof value==='string')return value;
  if(typeof value==='number'&&Number.isFinite(value))return String(value);
  return undefined;
};

const numberValue = (value:unknown):number|undefined => {
  if(typeof value==='number'&&Number.isFinite(value))return Math.trunc(value);
  if(typeof value!=='string'||value.trim()==='')return undefined;
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.trunc(parsed):undefined;
};

const arrayValue = (value:unknown):unknown[] => {
  if(Array.isArray(value))return value;
  const record=objectValue(value);
  return Object.keys(record)
    .filter(key=>/^\d+$/.test(key))
    .sort((a,b)=>Number(a)-Number(b))
    .map(key=>record[key]);
};

const titleFromKey=(key:string):string=>key
  .replace(/([a-z])([A-Z])/g,'$1 $2')
  .replace(/\d+$/,'')
  .replace(/^./,letter=>letter.toUpperCase());

const SKILL_META:Record<string,[string,PF1eAbilityKey,boolean?]>= {
  acrobatics:['Acrobatics','dex'],appraise:['Appraise','int'],bluff:['Bluff','cha'],climb:['Climb','str'],
  craft:['Craft','int'],diplomacy:['Diplomacy','cha'],disableDevice:['Disable Device','dex',true],
  disguise:['Disguise','cha'],escapeArtist:['Escape Artist','dex'],fly:['Fly','dex'],
  handleAnimal:['Handle Animal','cha',true],heal:['Heal','wis'],intimidate:['Intimidate','cha'],
  knowledgeArcana:['Knowledge (Arcana)','int',true],knowledgeDungeoneering:['Knowledge (Dungeoneering)','int',true],
  knowledgeEngineering:['Knowledge (Engineering)','int',true],knowledgeGeography:['Knowledge (Geography)','int',true],
  knowledgeHistory:['Knowledge (History)','int',true],knowledgeLocal:['Knowledge (Local)','int',true],
  knowledgeNature:['Knowledge (Nature)','int',true],knowledgeNobility:['Knowledge (Nobility)','int',true],
  knowledgePlanes:['Knowledge (Planes)','int',true],knowledgeReligion:['Knowledge (Religion)','int',true],
  linguistics:['Linguistics','int',true],perception:['Perception','wis'],perform:['Perform','cha'],
  profession:['Profession','wis',true],ride:['Ride','dex'],senseMotive:['Sense Motive','wis'],
  sleightOfHand:['Sleight of Hand','dex',true],spellcraft:['Spellcraft','int',true],stealth:['Stealth','dex'],
  survival:['Survival','wis'],swim:['Swim','str'],useMagicDevice:['Use Magic Device','cha',true],
};

const numberedBase=(key:string)=>key.replace(/\d+$/,'');

function mapModifier(value:unknown) {
  const source=objectValue(value);
  return {
    base:numberValue(source.base),
    magicModifier:numberValue(source.magicModifier),
    miscModifier:numberValue(source.miscModifier),
    tempModifier:numberValue(source.tempModifier),
    otherModifiers:stringValue(source.otherModifiers),
  };
}

function mapManeuver(value:unknown) {
  const source=objectValue(value);
  return {
    sizeModifier:numberValue(source.sizeModifier),
    miscModifiers:stringValue(source.miscModifiers??source.miscModifier),
    tempModifiers:stringValue(source.tempModifiers??source.tempModifier),
  };
}

function mapSkills(value:unknown):{skills:PF1eSkill[];conditional?:string} {
  const source=objectValue(value);
  const skills:PF1eSkill[]=[];
  let conditional:string|undefined;
  for(const [key,raw] of Object.entries(source)){
    if(key==='conditionalModifiers'){
      conditional=stringValue(raw);
      continue;
    }
    const skill=objectValue(raw);
    if(!Object.keys(skill).length)continue;
    const meta=SKILL_META[numberedBase(key)]??[titleFromKey(key),'int' as PF1eAbilityKey];
    const specialization=stringValue(skill.name)?.trim();
    skills.push({
      name:specialization?`${meta[0]} (${specialization})`:meta[0],
      ability:meta[1],
      trainedOnly:!!meta[2],
      classSkill:skill.classSkill===true,
      ranks:numberValue(skill.ranks),racial:numberValue(skill.racial),trait:numberValue(skill.trait),
      misc:numberValue(skill.misc),temp:numberValue(skill.temp),
    });
  }
  const standard=Object.values(SKILL_META).map(([name,ability,trainedOnly])=>({name,ability,trainedOnly:!!trainedOnly}));
  const byName=new Map(skills.map(skill=>[skill.name.toLocaleLowerCase(),skill]));
  const standardNames=new Set(standard.map(skill=>skill.name.toLocaleLowerCase()));
  return {
    skills:[
      ...standard.map(skill=>({...skill,...byName.get(skill.name.toLocaleLowerCase())})),
      ...skills.filter(skill=>!standardNames.has(skill.name.toLocaleLowerCase())),
    ],
    conditional,
  };
}

function mapFeatures(value:unknown):PF1eFeature[] {
  return arrayValue(value).map(raw=>objectValue(raw)).map(feature=>({
    name:stringValue(feature.name)?.trim()??'',
    type:stringValue(feature.type),
    description:stringValue(feature.description??feature.notes),
  })).filter(feature=>feature.name.length>0);
}

function mapSpell(value:unknown,level?:number):PF1eSpell|null {
  const spell=objectValue(value);
  const name=stringValue(spell.name)?.trim();
  if(!name)return null;
  return {
    name,
    level:level===undefined?stringValue(spell.level):String(level),
    school:stringValue(spell.school),
    prepared:numberValue(spell.prepared),cast:numberValue(spell.cast),
    atWill:spell.atWill===true,
    notes:stringValue(spell.notes),
  };
}

/** Detect a raw export produced by charactersheet.co.uk (Mottokrosh Sheet). */
export function isCharacterSheetCoUkExport(value:unknown):value is JsonObject {
  const source=objectValue(value);
  return typeof source.name==='string' && !!source.abilities &&
    (!!source.ac||!!source.saves||!!source.skills||!!source.spells||!!source._id);
}

/** Convert the site's string-heavy PF1 JSON into CozyVTT's typed PF1 schema. */
export function convertCharacterSheetCoUkExport(value:JsonObject):{name:string;data:PF1eCharacterData} {
  const abilities=objectValue(value.abilities);
  const abilityData={} as NonNullable<PF1eCharacterData['abilities']>;
  const tempKeys:Record<PF1eAbilityKey,string>={str:'tempStr',dex:'tempDex',con:'tempCon',int:'tempInt',wis:'tempWis',cha:'tempCha'};
  (['str','dex','con','int','wis','cha'] as PF1eAbilityKey[]).forEach(key=>{
    abilityData[key]={score:numberValue(abilities[key]),tempScore:numberValue(abilities[tempKeys[key]])??null};
  });

  const ac=objectValue(value.ac);
  const hp=objectValue(value.hp);
  const saves=objectValue(value.saves);
  const initiative=objectValue(value.initiative);
  const speed=objectValue(value.speed);
  const money=objectValue(value.money);
  const xp=objectValue(value.xp);
  const skillResult=mapSkills(value.skills);

  const spells:PF1eSpellLevel[]=arrayValue(value.spells).slice(0,10).map((raw,level)=>{
    const spellLevel=objectValue(raw);
    return {
      totalKnown:numberValue(spellLevel.totalKnown),dc:numberValue(spellLevel.dc),
      totalPerDay:numberValue(spellLevel.totalPerDay),bonusSpells:numberValue(spellLevel.bonusSpells),
      slotted:arrayValue(spellLevel.slotted).map(item=>mapSpell(item,level)).filter((item):item is PF1eSpell=>item!==null),
    };
  });
  while(spells.length<10)spells.push({slotted:[]});

  const name=String(value.name).trim()||'Imported Pathfinder Character';
  const data:PF1eCharacterData={
    characterName:name,
    playerName:stringValue(objectValue(value.user).displayName),
    alignment:stringValue(value.alignment),classAndLevel:stringValue(value.level),deity:stringValue(value.deity),
    homeland:stringValue(value.homeland),race:stringValue(value.race),size:stringValue(value.size),
    gender:stringValue(value.gender),age:stringValue(value.age),height:stringValue(value.height),
    weight:stringValue(value.weight),hair:stringValue(value.hair),eyes:stringValue(value.eyes),
    abilities:abilityData,
    ac:{
      // CharacterSheet stores armor/shield as aggregate display values. CozyVTT derives
      // those bonuses from equipped AC items, so importing the aggregates would apply
      // armor before an item is equipped and could double-count it afterwards.
      sizeModifier:numberValue(ac.sizeModifier),
      naturalArmor:numberValue(ac.naturalArmor),deflectionModifier:numberValue(ac.deflectionModifier),
      miscModifier:numberValue(ac.miscModifier),otherModifiers:stringValue(ac.otherModifiers),
      items:arrayValue(ac.items).map(item=>objectValue(item)).map(item=>({
        name:stringValue(item.name)?.trim()??'',bonus:numberValue(item.bonus),type:stringValue(item.type),
        armorCheckPenalty:numberValue(item.armorCheckPenalty),spellFailure:numberValue(item.spellFailure),
        maxDexBonus:numberValue(item.maxDexBonus),equipped:item.equipped===true,weight:stringValue(item.weight),properties:stringValue(item.properties),
      })).filter(item=>item.name.length>0),
    },
    hp:{total:numberValue(hp.total),current:numberValue(hp.current??hp.wounds),temporary:numberValue(hp.temporary),nonLethal:numberValue(hp.nonLethal)},
    damageReduction:stringValue(value.damageReduction),spellResistance:stringValue(value.spellResistance),
    saves:{fort:mapModifier(saves.fort),reflex:mapModifier(saves.reflex),will:mapModifier(saves.will)},
    resistances:stringValue(value.resistances),immunities:stringValue(value.immunities),
    cmd:mapManeuver(value.cmd),cmb:mapManeuver(value.cmb),
    initiative:{
      miscModifier:numberValue(initiative.miscModifier),tempModifier:numberValue(initiative.tempModifier),
    },
    bab:numberValue(value.bab),babMiscModifier:numberValue(value.babMiscModifier),conditionalOffenseModifiers:stringValue(value.conditionalOffenseModifiers),
    speed:{base:stringValue(speed.base),withArmor:stringValue(speed.withArmor),fly:stringValue(speed.fly),swim:stringValue(speed.swim),climb:stringValue(speed.climb),burrow:stringValue(speed.burrow),tempModifiers:stringValue(speed.tempModifiers??speed.tempModifier)},
    melee:arrayValue(value.melee).map(item=>objectValue(item)).map(item=>({weapon:stringValue(item.weapon)?.trim()??'',attackBonus:stringValue(item.attackBonus),damage:stringValue(item.damage),critical:stringValue(item.critical),type:stringValue(item.type),range:stringValue(item.range),notes:stringValue(item.notes),ammunition:stringValue(item.ammunition)})).filter(item=>item.weapon.length>0),
    ranged:arrayValue(value.ranged).map(item=>objectValue(item)).map(item=>({weapon:stringValue(item.weapon)?.trim()??'',attackBonus:stringValue(item.attackBonus),damage:stringValue(item.damage),critical:stringValue(item.critical),type:stringValue(item.type),range:stringValue(item.range),notes:stringValue(item.notes),ammunition:stringValue(item.ammunition)})).filter(item=>item.weapon.length>0),
    skills:skillResult.skills,skillConditionalModifiers:skillResult.conditional,languages:stringValue(value.languages),
    xp:{total:numberValue(xp.total),toNextLevel:numberValue(xp.toNextLevel)},
    feats:mapFeatures(value.feats),specialAbilities:mapFeatures(value.specialAbilities),traits:mapFeatures(value.traits),
    money:{pp:numberValue(money.pp),gp:numberValue(money.gp),sp:numberValue(money.sp),cp:numberValue(money.cp),gems:stringValue(money.gems),other:stringValue(money.other)},
    gear:arrayValue(value.gear).map(item=>objectValue(item)).map(item=>({name:stringValue(item.name)?.trim()??'',type:stringValue(item.type),quantity:numberValue(item.quantity),location:stringValue(item.location),weight:stringValue(item.weight),notes:stringValue(item.notes)})).filter(item=>item.name.length>0),
    spells,
    spellLikes:arrayValue(value.spellLikes).map(item=>mapSpell(item)).filter((item):item is PF1eSpell=>item!==null),
    spellDcConditionalModifiers:arrayValue(value.spellDcConditionalModifiers).map(item=>objectValue(item)).map(item=>({
      source:stringValue(item.source)?.trim()??'',condition:stringValue(item.condition)?.trim()??'',
      dcModifier:numberValue(item.dcModifier)??0,notes:stringValue(item.notes),
    })).filter(item=>item.source.length>0&&item.condition.length>0),
    spellsConditionalModifiers:stringValue(value.spellsConditionalModifiers),spellsSpeciality:stringValue(value.spellsSpeciality),
    notes:stringValue(value.notes),
  };
  return {name,data:calculatePF1eDerived(data)};
}

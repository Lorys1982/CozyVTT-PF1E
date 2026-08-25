import { describe, expect, it } from 'vitest';
import { calculatePF1eDerived } from '../pathfinder1eCalculations';

describe('PF1e derived calculations', () => {
  it('calculates AC, saves, initiative, maneuvers, skills, and spell DCs', () => {
    const result = calculatePF1eDerived({
      characterName: 'Valeros',
      abilities: {
        str: {score: 16}, dex: {score: 14}, con: {score: 12},
        int: {score: 10}, wis: {score: 8}, cha: {score: 18},
      },
      bab: 5,
      ac: {armorBonus: 6, shieldBonus: 2, naturalArmor: 1, deflectionModifier: 1, sizeModifier: 0},
      saves: {fort: {base: 4, magicModifier: 1}, reflex: {base: 1}, will: {base: 1}},
      initiative: {miscModifier: 4},
      cmb: {sizeModifier: 0, miscModifiers: '+1'},
      cmd: {sizeModifier: 0, miscModifiers: '+2'},
      skills: [{name: 'Stealth', ability: 'dex', ranks: 2, classSkill: true, misc: 1}],
      spellcastingAbility: 'cha', casterLevel: 5, spellDcMiscModifier: 1,
      spells: Array.from({length: 10}, () => ({slotted: []})),
    });

    expect(result.ac).toMatchObject({total: 22, touch: 13, flatFooted: 20});
    expect(result.saves).toMatchObject({fort: {total: 6}, reflex: {total: 3}, will: {total: 0}});
    expect(result.initiative?.total).toBe(6);
    expect(result.cmb?.total).toBe(9);
    expect(result.cmd?.total).toBe(22);
    expect(result.skills?.[0].total).toBe(8);
    expect(result.spells?.[3].dc).toBe(18);
    expect(result.spells?.[1].bonusSpells).toBe(1);
    expect(result.spells?.[4].bonusSpells).toBe(1);
    expect(result.spells?.[5].bonusSpells).toBe(0);
    expect(result.concentrationTotal).toBe(9);
  });

  it('starts AC at 10 and keeps a negative Dexterity modifier when flat-footed', () => {
    const result = calculatePF1eDerived({
      characterName: 'Test',
      abilities: {
        str: {score: 10}, dex: {score: 8}, con: {score: 10},
        int: {score: 10}, wis: {score: 10}, cha: {score: 10},
      },
    });
    expect(result.ac).toMatchObject({total: 9, touch: 9, flatFooted: 9});
  });

  it('applies size, equipped armor limits, armor penalties, and calculated weapon rolls', () => {
    const result=calculatePF1eDerived({
      characterName:'Amiri',size:'Large',bab:11,
      abilities:{str:{score:20},dex:{score:18},con:{score:10},int:{score:10},wis:{score:10},cha:{score:10}},
      ac:{items:[
        {name:'Breastplate',type:'Armor',bonus:6,maxDexBonus:3,armorCheckPenalty:-4,equipped:true},
        {name:'Stored shield',type:'Shield',bonus:2,armorCheckPenalty:-2,equipped:false},
      ]},
      skills:[{name:'Swim',ability:'str',ranks:1,classSkill:true}],
      melee:[{weapon:'Greatsword',baseDamage:'2d6',attackAbility:'str',damageAbility:'str',damageAbilityMultiplier:1.5,enhancementBonus:1}],
    });

    expect(result.ac).toMatchObject({total:18,touch:12,flatFooted:15});
    expect(result.cmb?.total).toBe(17);
    expect(result.cmd?.total).toBe(31);
    expect(result.skills?.[0].total).toBe(1);
    expect(result.melee?.[0]).toMatchObject({attackBonus:'+16/+11/+6',damage:'2d6+8'});
  });

  it('keeps temporary, situational, and override modifiers independent from equipment and abilities', () => {
    const result = calculatePF1eDerived({
      characterName:'Flexible',bab:4,
      abilities:{str:{score:14,checkMiscModifier:1,checkTempModifier:2},dex:{score:12},con:{score:10},int:{score:10},wis:{score:10},cha:{score:16}},
      ac:{armorBonus:4,dodgeModifier:1,tempModifier:2,touchModifier:3,flatFootedModifier:-1},
      saves:{fort:{base:2,tempModifier:3},reflex:{base:1,overrideTotal:12},will:{base:1}},
      initiative:{miscModifier:1,tempModifier:2},
      cmb:{tempModifiers:'+2'},cmd:{tempModifiers:'+3'},
      skills:[{name:'Perception',ability:'wis',ranks:1,temp:4}],
      melee:[{weapon:'Sword',baseDamage:'1d8',attackTempModifier:2,damageTempModifier:3}],
      spellcastingAbility:'cha',casterLevel:4,concentrationTempModifier:2,spellDcTempModifier:1,
      spells:Array.from({length:10},(_,level)=>({slotted:[],...(level===2?{dcOverride:25}:{})})),
    });

    expect(result.ac).toMatchObject({total:18,touch:17,flatFooted:15});
    expect(result.saves?.fort?.total).toBe(5);
    expect(result.saves?.reflex?.total).toBe(12);
    expect(result.initiative?.total).toBe(4);
    expect(result.cmb?.total).toBe(8);
    expect(result.cmd?.total).toBe(20);
    expect(result.skills?.[0].total).toBe(5);
    expect(result.melee?.[0]).toMatchObject({attackBonus:'+8',damage:'1d8+5'});
    expect(result.concentrationTotal).toBe(9);
    expect(result.spells?.[1].dc).toBe(15);
    expect(result.spells?.[2].dc).toBe(25);
  });

  it('honors explicit overrides for calculated combat values', () => {
    const result=calculatePF1eDerived({
      characterName:'Overrides',
      abilities:{str:{score:10},dex:{score:10},con:{score:10},int:{score:10},wis:{score:10},cha:{score:10}},
      ac:{overrideTotal:30,overrideTouch:20,overrideFlatFooted:28},
      initiative:{overrideTotal:9},cmb:{overrideTotal:11},cmd:{overrideTotal:22},
      skills:[{name:'Use Magic Device',ability:'cha',overrideTotal:17}],
      melee:[{weapon:'Custom',baseDamage:'1d6',attackOverride:'+20/+15',damageOverride:'2d6+10'}],
      casterLevel:1,concentrationOverride:14,
    });
    expect(result.ac).toMatchObject({total:30,touch:20,flatFooted:28});
    expect(result.initiative?.total).toBe(9);
    expect(result.cmb?.total).toBe(11);
    expect(result.cmd?.total).toBe(22);
    expect(result.skills?.[0].total).toBe(17);
    expect(result.melee?.[0]).toMatchObject({attackBonus:'+20/+15',damage:'2d6+10'});
    expect(result.concentrationTotal).toBe(14);
  });
});

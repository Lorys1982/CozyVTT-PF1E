import { describe, expect, it } from 'vitest';
import { validateImportedCharacter } from '../character-export';

describe('CharacterSheet.co.uk Pathfinder import',()=>{
  it('detects and converts the native PF1 export shape',()=>{
    const result=validateImportedCharacter({
      _id:'external-id',
      name:'Merisiel',
      level:'Rogue 7',
      race:'Elf',
      abilities:{str:'10',dex:'20',tempDex:'22',con:'12',int:'14',wis:'10',cha:'8'},
      ac:{total:'24',touch:'17',flatFooted:'18',armorBonus:'6',items:[{name:'Leather armor',bonus:'2',type:'Armor'}]},
      hp:{total:'52',wounds:'41',nonLethal:'3'},
      saves:{fort:{total:'7',base:'5'},reflex:{total:'13',base:'8'},will:{total:'4',base:'2'}},
      skills:{acrobatics:{total:'15',ranks:'7',classSkill:true},craft1:{name:'Traps',total:'9',ranks:'4'}},
      feats:[{name:'Dodge',type:'Combat',notes:'Gain a dodge bonus.'}],
      specialAbilities:[{name:'Sneak Attack',notes:'+4d6 damage.'}],
      melee:[{weapon:'Rapier',attackBonus:'+12',damage:'1d6+2',critical:'18-20/x2'}],
      gear:[{name:'Rope',quantity:'2',weight:'10 lb.'}],
      spells:[{dc:'10',slotted:[]},{dc:'14',slotted:[{name:'Vanish',prepared:1,cast:0,notes:'Brief invisibility.'}]}],
    });

    expect(result.valid).toBe(true);
    expect(result.character?.gameSystem).toBe('PATHFINDER_1E');
    expect(result.character?.importSource).toBe('CharacterSheet.co.uk');
    expect(result.character?.data).toMatchObject({
      characterName:'Merisiel',classAndLevel:'Rogue 7',race:'Elf',
      abilities:{dex:{score:20,tempScore:22}},
      ac:{total:16,items:[{name:'Leather armor',bonus:2,equipped:false}]},
      hp:{total:52,current:41,nonLethal:3},
      saves:{reflex:{total:14,base:8}},
      feats:[{name:'Dodge',type:'Combat',description:'Gain a dodge bonus.'}],
      specialAbilities:[{name:'Sneak Attack',description:'+4d6 damage.'}],
      melee:[{weapon:'Rapier',attackBonus:'+12'}],
      gear:[{name:'Rope',quantity:2}],
    });
    expect(result.character?.data.skills).toEqual(expect.arrayContaining([
      expect.objectContaining({name:'Acrobatics',ability:'dex',ranks:7}),
      expect.objectContaining({name:'Appraise',ability:'int'}),
      expect.objectContaining({name:'Craft (Traps)',ability:'int',ranks:4}),
    ]));
    expect(result.character?.data.skills).toHaveLength(36);
    expect(result.character?.data.ac.overrideTotal).toBeUndefined();
    expect(result.character?.data.saves.reflex.overrideTotal).toBeUndefined();
    expect(result.character?.data.skills.find((skill:any)=>skill.name==='Acrobatics').overrideTotal).toBeUndefined();
    expect(result.character?.data.spells[1].dcOverride).toBeUndefined();
    expect(result.character?.data.spells[1].slotted[0]).toMatchObject({name:'Vanish',level:'1',prepared:1});
  });

  it('fills every standard skill when omitted fields are absent from the export',()=>{
    const result=validateImportedCharacter({_id:'sparse',name:'Sparse Hero',abilities:{str:'12'}});

    expect(result.valid).toBe(true);
    expect(result.character?.data.skills).toHaveLength(35);
    expect(result.character?.data.skills).toEqual(expect.arrayContaining([
      expect.objectContaining({name:'Acrobatics',ability:'dex'}),
      expect.objectContaining({name:'Use Magic Device',ability:'cha'}),
    ]));
    expect(result.character?.data.abilities.dex).toMatchObject({tempScore:null});
    expect(result.character?.data.spells).toHaveLength(10);
  });

  it('does not apply aggregate armor or shield bonuses before equipment is equipped',()=>{
    const result=validateImportedCharacter({
      _id:'unarmored-import',name:'Unarmored Import',
      abilities:{str:'10',dex:'10',con:'10',int:'10',wis:'10',cha:'10'},
      ac:{total:'18',armorBonus:'6',shieldBonus:'2'},
    });

    expect(result.valid).toBe(true);
    expect(result.character?.data.ac).toMatchObject({total:10,touch:10,flatFooted:10,items:[]});
    expect(result.character?.data.ac.armorBonus).toBeUndefined();
    expect(result.character?.data.ac.shieldBonus).toBeUndefined();
  });

  it('does not mistake arbitrary JSON for a CharacterSheet.co.uk export',()=>{
    expect(validateImportedCharacter({name:'Not enough',abilities:{str:'10'}})).toMatchObject({
      valid:false,error:'Missing cozyVttVersion field',
    });
  });
});

import { pathfinder1eCharacterDataSchema } from './pathfinder1e.schema';

describe('Pathfinder 1e character validation',()=>{
  it('accepts calculated attacks, equipped armor, and imported spell metadata',()=>{
    const result=pathfinder1eCharacterDataSchema.safeParse({
      characterName:'Ezren',
      abilities:{str:{score:10,checkTempModifier:2},dex:{score:14},con:{score:12},int:{score:18},wis:{score:10},cha:{score:8}},
      hp:{total:24,current:19,temporary:5,longRestRestore:8},
      ac:{tempModifier:2,overrideTouch:18,items:[{name:'Chain shirt',type:'Armor',bonus:4,maxDexBonus:4,armorCheckPenalty:-2,equipped:true}]},
      saves:{fort:{base:3,tempModifier:1},reflex:{overrideTotal:12}},
      initiative:{tempModifier:2},
      bab:5,babMiscModifier:1,
      skills:[{name:'Spellcraft',ability:'int',ranks:3,temp:2}],
      melee:[{weapon:'Quarterstaff',baseDamage:'1d6',damageType:'bludgeoning',additionalDamage:[{formula:'1d6',type:'acid'}],attackAbility:'str',damageAbility:'str',damageAbilityMultiplier:1,attackTempModifier:1}],
      concentrationTempModifier:2,
      spellcastingType:'prepared',
      spellDcConditionalModifiers:[
        {source:'Spell Focus',condition:'Evocation spells',dcModifier:1},
        {source:'Bloodline Arcana',condition:'Fire spells',dcModifier:1,notes:'Draconic bloodline'},
      ],
      spells:[{dcOverride:20,totalPerDay:3,currentPerDay:2,slotted:[{
        name:'Fireball',itemName:'Fireball',school:'evocation [fire]',level:'wizard 3',
        rulesSource:'Archives of Nethys',sourceUrl:'https://www.aonprd.com/SpellDisplay.aspx?ItemName=Fireball',
        castingTime:'1 standard action',range:'long',savingThrow:'Reflex half',description:'A fiery explosion.',
      }]}],
    });
    expect(result.success).toBe(true);
  });
});

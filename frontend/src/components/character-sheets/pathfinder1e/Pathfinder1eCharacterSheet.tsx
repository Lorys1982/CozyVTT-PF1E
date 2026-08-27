import { useCallback, useState } from 'react';
import {
  Backpack, BookOpen, ChevronDown, Heart, LayoutGrid, List, NotebookPen, Package, Save, Shield,
  Sparkles, Swords, Trash2, Upload, UserRound, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CharacterSheetProps } from '../types';
import type {
  PF1eACItem, PF1eAbilityKey, PF1eAttack, PF1eCharacterData, PF1eFeature,
  PF1eGearItem, PF1eSkill,
  PF1eSpell,
} from '../../../types/game-systems/pathfinder1e';
import { calculatePF1eDerived, pf1eAbilityCheckModifier, pf1eAbilityModifier, pf1eSizeModifier } from '../../../utils/pathfinder1eCalculations';
import PF1eSpellbook from './PF1eSpellbook';
import PF1eFeatList from './PF1eFeatList';
import Pathfinder1eCharacterView from './Pathfinder1eCharacterView';
import { createPF1eSheetData, numberOrUndefined, PF1E_ABILITIES, preparePF1eDataForSave, signed } from './pathfinder1eDefaults';
import { api } from '../../../services/api';
import { AssetType } from '../../../types';
import { useServerConfigQuery } from '@/hooks/queries';
import { formatUploadLimit, getUploadLimit } from '@/utils/uploadLimits';
import type { SpellAoEConfig } from '@/utils/pathfinder1eSpellAoE';

type TabId = 'overview'|'combat'|'skills'|'spells'|'inventory'|'features';

const TABS:Array<{id:TabId;label:string;icon:LucideIcon}> = [
  {id:'overview',label:'Overview',icon:UserRound},
  {id:'combat',label:'Combat',icon:Swords},
  {id:'skills',label:'Skills',icon:BookOpen},
  {id:'spells',label:'Spells',icon:Sparkles},
  {id:'inventory',label:'Inventory',icon:Backpack},
  {id:'features',label:'Features & Bio',icon:NotebookPen},
];

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-stone-800';

interface Pathfinder1eCharacterSheetProps extends CharacterSheetProps {
  onRoll?:(expression:string,purpose:string)=>void;
  onDataChange?:(data:PF1eCharacterData)=>void|Promise<void>;
  onPlaceAoE?:(config:SpellAoEConfig,spell:PF1eSpell)=>void;
}

interface InputProps {
  label:string;
  value:string|number|null|undefined;
  editable:boolean;
  type?:'text'|'number';
  min?:number;
  placeholder?:string;
  onChange:(value:string|number|undefined)=>void;
}

function SheetInput({label,value,editable,type='text',min,placeholder,onChange}:InputProps) {
  return (
    <label className="flex h-full min-w-0 flex-col text-xs font-semibold uppercase tracking-wide text-stone-500">
      <span className="flex min-h-8 items-end leading-tight">{label}</span>
      <input
        aria-label={label}
        disabled={!editable}
        type={type}
        min={min}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={event=>onChange(type==='number'?numberOrUndefined(event.target.value):event.target.value)}
        className={`${inputClass} mt-1 min-h-10 text-base font-medium normal-case tracking-normal`}
      />
    </label>
  );
}

function Panel({title,icon:Icon,children}:{title:string;icon?:LucideIcon;children:React.ReactNode}) {
  return (
    <section className="rounded-xl border-2 border-stone-200 bg-stone-50 p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-800">{Icon&&<Icon className="h-5 w-5 text-red-800" />}{title}</h3>
      {children}
    </section>
  );
}

function RollValue({label,value,onRoll}:{label:string;value:number;onRoll?:(expression:string,purpose:string)=>void}) {
  const content=<><span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span><span className="text-3xl font-black">{signed(value)}</span></>;
  return onRoll ? (
    <button type="button" onClick={()=>onRoll(`1d20${signed(value)}`,label)} className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-red-700 to-red-950 px-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg" title={`Roll ${label}`}>{content}</button>
  ) : <div className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-red-700 to-red-950 px-4 text-white shadow-md">{content}</div>;
}

function OverviewTab({data,editable,onSet,onRoll}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void;onRoll?:Pathfinder1eCharacterSheetProps['onRoll']}) {
  return <div className="space-y-6">
    <Panel title="Ability Scores" icon={Sparkles}>
      <p className="mb-4 rounded-lg bg-stone-100 px-3 py-2 text-xs leading-relaxed text-stone-600">
        <strong>Temp score</strong> replaces the normal score while a buff, penalty, or condition is active.
        <strong className="ml-1">Misc check</strong> and <strong>temp check</strong> are bonuses only to raw ability checks; they do not change attacks, saves, skills, or other derived values.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PF1E_ABILITIES.map(({key,label,short})=>{
          const ability=data.abilities?.[key];
          const modifier=pf1eAbilityModifier(ability?.tempScore??ability?.score);
          const checkModifier=pf1eAbilityCheckModifier(data,key);
          return <div key={key} className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{short}</div>
            <button type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${signed(checkModifier)}`,`${label} Check`)} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-950 bg-gradient-to-br from-red-700 to-red-950 text-2xl font-black text-white shadow-lg enabled:hover:from-red-600 enabled:hover:to-red-900" title={onRoll?`Roll ${label} check (${signed(checkModifier)})`:undefined}>{signed(modifier)}</button>
            <label className="mt-2 w-full text-center text-[10px] font-semibold uppercase text-stone-400">Score<input aria-label={`${label} score`} disabled={!editable} type="number" value={ability?.score??10} onChange={event=>onSet(`abilities.${key}.score`,numberOrUndefined(event.target.value))} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-center font-bold disabled:border-transparent disabled:bg-transparent" /></label>
            <label title="Replacement ability score while a temporary effect is active; leave blank to use the normal score." className="mt-2 w-full text-center text-[10px] font-semibold uppercase text-stone-400">Temp score<input aria-label={`${label} temporary score`} disabled={!editable} type="number" value={ability?.tempScore??''} onChange={event=>onSet(`abilities.${key}.tempScore`,numberOrUndefined(event.target.value)??null)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-center text-sm font-medium disabled:border-transparent disabled:bg-transparent" /></label>
            <div className="mt-2 grid w-full grid-cols-2 gap-2"><label title="Permanent or long-running bonus that applies only to this ability check." className="flex flex-col text-center text-[9px] font-semibold uppercase leading-tight text-stone-400"><span className="flex min-h-6 items-end justify-center">Misc check</span><input aria-label={`${label} check misc`} disabled={!editable} type="number" value={ability?.checkMiscModifier??''} onChange={event=>onSet(`abilities.${key}.checkMiscModifier`,numberOrUndefined(event.target.value))} className="mt-1 w-full rounded border border-stone-300 px-1 py-1 text-center text-xs disabled:border-transparent disabled:bg-transparent" /></label><label title="Short-lived situational bonus that applies only to this ability check." className="flex flex-col text-center text-[9px] font-semibold uppercase leading-tight text-stone-400"><span className="flex min-h-6 items-end justify-center">Temp check</span><input aria-label={`${label} check temporary`} disabled={!editable} type="number" value={ability?.checkTempModifier??''} onChange={event=>onSet(`abilities.${key}.checkTempModifier`,numberOrUndefined(event.target.value))} className="mt-1 w-full rounded border border-stone-300 px-1 py-1 text-center text-xs disabled:border-transparent disabled:bg-transparent" /></label></div>
            {(ability?.checkMiscModifier||ability?.checkTempModifier)&&<div className="mt-1 text-[10px] font-semibold text-red-800">Check {signed(checkModifier)}</div>}
          </div>;
        })}
      </div>
    </Panel>

    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Vitals" icon={Heart}>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-red-50 p-3 text-center"><div className="text-xs font-semibold uppercase text-red-700">HP</div><div className="text-3xl font-black text-red-900">{data.hp?.current??0}<span className="text-base text-red-700"> / {data.hp?.total??0}</span></div></div>
          <div className="rounded-xl bg-stone-100 p-3 text-center"><div className="text-xs font-semibold uppercase text-stone-500">AC</div><output title="Calculated automatically" className="block text-3xl font-black text-stone-800">{data.ac?.total??10}</output></div>
          <div className="rounded-xl bg-stone-100 p-3 text-center"><div className="text-xs font-semibold uppercase text-stone-500">Touch / Flat</div><div className="text-xl font-black text-stone-800">{data.ac?.touch??10} / {data.ac?.flatFooted??10}</div></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RollValue label="Initiative" value={data.initiative?.total??0} onRoll={onRoll}/>
          <RollValue label="Fortitude Save" value={data.saves?.fort?.total??0} onRoll={onRoll}/>
          <RollValue label="Reflex Save" value={data.saves?.reflex?.total??0} onRoll={onRoll}/>
          <RollValue label="Will Save" value={data.saves?.will?.total??0} onRoll={onRoll}/>
        </div>
      </Panel>
      <Panel title="Character Details" icon={UserRound}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SheetInput label="Player name" value={data.playerName} editable={editable} onChange={value=>onSet('playerName',value)} />
          <SheetInput label="Alignment" value={data.alignment} editable={editable} onChange={value=>onSet('alignment',value)} />
          <SheetInput label="Race" value={data.race} editable={editable} onChange={value=>onSet('race',value)} />
          <SheetInput label="Size" value={data.size} editable={editable} placeholder="Medium" onChange={value=>onSet('size',value)} />
          <SheetInput label="Deity" value={data.deity} editable={editable} onChange={value=>onSet('deity',value)} />
          <SheetInput label="Homeland" value={data.homeland} editable={editable} onChange={value=>onSet('homeland',value)} />
          <SheetInput label="Languages" value={data.languages} editable={editable} onChange={value=>onSet('languages',value)} />
          <SheetInput label="Experience" value={data.xp?.total} editable={editable} type="number" min={0} onChange={value=>onSet('xp.total',value)} />
        </div>
      </Panel>
    </div>
  </div>;
}

const saveAbility:Record<'fort'|'reflex'|'will',PF1eAbilityKey>={fort:'con',reflex:'dex',will:'wis'};

function ArmorList({data,editable,onSet}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void}) {
  const items=data.ac?.items??[];
  const update=(index:number,key:keyof PF1eACItem,value:unknown)=>onSet('ac.items',items.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  return <div className="space-y-3">
    {items.map((item,index)=><div key={index} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-8">
      <div className="lg:col-span-2"><SheetInput label="Armor / shield" value={item.name} editable={editable} onChange={value=>update(index,'name',value)} /></div>
      <SheetInput label="Type" value={item.type} editable={editable} placeholder="Armor or Shield" onChange={value=>update(index,'type',value)} />
      <SheetInput label="Bonus" value={item.bonus} editable={editable} type="number" onChange={value=>update(index,'bonus',value)} />
      <SheetInput label="Max DEX" value={item.maxDexBonus} editable={editable} type="number" onChange={value=>update(index,'maxDexBonus',value)} />
      <SheetInput label="Check penalty" value={item.armorCheckPenalty} editable={editable} type="number" onChange={value=>update(index,'armorCheckPenalty',value)} />
      <SheetInput label="Spell failure %" value={item.spellFailure} editable={editable} type="number" min={0} onChange={value=>update(index,'spellFailure',value)} />
      <div className="flex items-end gap-2 pb-2"><label className="flex flex-1 items-center gap-2 text-sm font-medium text-stone-600"><input disabled={!editable} type="checkbox" checked={item.equipped!==false} onChange={event=>update(index,'equipped',event.target.checked)} />Equipped</label>{editable&&<button type="button" aria-label={`Remove ${item.name||'armor'}`} onClick={()=>onSet('ac.items',items.filter((_,itemIndex)=>itemIndex!==index))} className="text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}</div>
    </div>)}
    {editable&&<button type="button" onClick={()=>onSet('ac.items',[{name:'',type:'Armor',equipped:true},...items])} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100">+ Armor or shield</button>}
  </div>;
}

function AttackList({title,items,ranged,editable,onSet,onRoll}:{title:string;items:PF1eAttack[];ranged:boolean;editable:boolean;onSet:(path:string,value:unknown)=>void;onRoll?:Pathfinder1eCharacterSheetProps['onRoll']}) {
  const path=ranged?'ranged':'melee';
  const update=(index:number,key:keyof PF1eAttack,value:unknown)=>onSet(path,items.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  return <Panel title={title}>
    <div className="space-y-3">
      {items.map((attack,index)=>{
        const calculated=!!attack.baseDamage;
        return <article key={index} className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><SheetInput label="Weapon" value={attack.weapon} editable={editable} onChange={value=>update(index,'weapon',value)} /></div>{editable&&<button type="button" aria-label={`Remove ${attack.weapon||'attack'}`} onClick={()=>onSet(path,items.filter((_,itemIndex)=>itemIndex!==index))} className="mt-6 rounded p-1 text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SheetInput label="Base damage" value={attack.baseDamage} editable={editable} placeholder="1d8 (enables calculation)" onChange={value=>update(index,'baseDamage',value)} />
            <label className="flex h-full flex-col text-xs font-semibold uppercase tracking-wide text-stone-500"><span className="flex min-h-8 items-end">Attack ability</span><select disabled={!editable} value={attack.attackAbility??(ranged?'dex':'str')} onChange={event=>update(index,'attackAbility',event.target.value)} className={`${inputClass} mt-1 min-h-10 text-base normal-case`} >{PF1E_ABILITIES.map(ability=><option key={ability.key} value={ability.key}>{ability.label}</option>)}</select></label>
            <label className="flex h-full flex-col text-xs font-semibold uppercase tracking-wide text-stone-500"><span className="flex min-h-8 items-end">Damage ability</span><select disabled={!editable} value={attack.damageAbility??(ranged?'none':'str')} onChange={event=>update(index,'damageAbility',event.target.value)} className={`${inputClass} mt-1 min-h-10 text-base normal-case`}><option value="none">None</option>{PF1E_ABILITIES.map(ability=><option key={ability.key} value={ability.key}>{ability.label}</option>)}</select></label>
            <SheetInput label="Ability multiplier" value={attack.damageAbilityMultiplier??1} editable={editable} type="number" onChange={value=>update(index,'damageAbilityMultiplier',value)} />
            <SheetInput label="Enhancement" value={attack.enhancementBonus} editable={editable} type="number" onChange={value=>update(index,'enhancementBonus',value)} />
            <SheetInput label="Attack misc" value={attack.attackMiscModifier} editable={editable} type="number" onChange={value=>update(index,'attackMiscModifier',value)} />
            <SheetInput label="Attack temporary" value={attack.attackTempModifier} editable={editable} type="number" onChange={value=>update(index,'attackTempModifier',value)} />
            <SheetInput label="Damage misc" value={attack.damageMiscModifier} editable={editable} type="number" onChange={value=>update(index,'damageMiscModifier',value)} />
            <SheetInput label="Damage temporary" value={attack.damageTempModifier} editable={editable} type="number" onChange={value=>update(index,'damageTempModifier',value)} />
            <SheetInput label="Attack override" value={attack.attackOverride} editable={editable} placeholder="Optional, e.g. +12/+7" onChange={value=>update(index,'attackOverride',value)} />
            <SheetInput label="Damage override" value={attack.damageOverride} editable={editable} placeholder="Optional, e.g. 2d6+9" onChange={value=>update(index,'damageOverride',value)} />
            <SheetInput label="Primary damage type" value={attack.damageType??attack.type} editable={editable} placeholder="Slashing" onChange={value=>update(index,'damageType',value)} />
            <SheetInput label={ranged?'Range':'Critical'} value={ranged?attack.range:attack.critical} editable={editable} onChange={value=>update(index,ranged?'range':'critical',value)} />
          </div>
          {!calculated&&editable&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><SheetInput label="Manual attack bonus" value={attack.attackBonus} editable onChange={value=>update(index,'attackBonus',value)} /><SheetInput label="Manual damage" value={attack.damage} editable onChange={value=>update(index,'damage',value)} /></div>}
          {editable&&<div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3"><div className="text-xs font-bold uppercase text-stone-500">Additional typed damage</div>{(attack.additionalDamage??[]).map((part,partIndex)=><div key={partIndex} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]"><input aria-label={`Additional damage ${partIndex+1} formula`} value={part.formula} onChange={event=>update(index,'additionalDamage',(attack.additionalDamage??[]).map((value,valueIndex)=>valueIndex===partIndex?{...value,formula:event.target.value}:value))} placeholder="1d6" className={inputClass}/><input aria-label={`Additional damage ${partIndex+1} type`} value={part.type??''} onChange={event=>update(index,'additionalDamage',(attack.additionalDamage??[]).map((value,valueIndex)=>valueIndex===partIndex?{...value,type:event.target.value}:value))} placeholder="Acid" className={inputClass}/><input aria-label={`Additional damage ${partIndex+1} notes`} value={part.notes??''} onChange={event=>update(index,'additionalDamage',(attack.additionalDamage??[]).map((value,valueIndex)=>valueIndex===partIndex?{...value,notes:event.target.value}:value))} placeholder="Conditional notes" className={inputClass}/><button type="button" aria-label={`Remove additional damage ${partIndex+1}`} onClick={()=>update(index,'additionalDamage',(attack.additionalDamage??[]).filter((_,valueIndex)=>valueIndex!==partIndex))} className="rounded p-2 text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4"/></button></div>)}<button type="button" onClick={()=>update(index,'additionalDamage',[{formula:'1d6',type:''},...(attack.additionalDamage??[])])} className="mt-2 rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700">+ Damage component</button></div>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="flex flex-wrap gap-2">{(attack.attackBonus?.match(/[+-]?\d+/g)??[]).map((bonus,attackIndex)=><button key={`${bonus}-${attackIndex}`} type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${Number(bonus)>=0?'+':''}${Number(bonus)}`,`${attack.weapon||title} Attack ${attackIndex+1}`)} className="min-w-20 rounded-lg bg-red-800 px-4 py-3 text-left text-white disabled:cursor-default"><span className="block text-xs uppercase text-red-200">Attack {attackIndex+1}</span><strong className="text-xl">{Number(bonus)>=0?'+':''}{Number(bonus)}</strong></button>)}</div><div className="flex flex-wrap gap-2">{attack.damage&&<button type="button" disabled={!onRoll} onClick={()=>onRoll?.(attack.damage!,`${attack.weapon||title} ${attack.damageType||'untyped'} Damage`)} className="rounded-lg bg-stone-800 px-4 py-3 text-left text-white disabled:cursor-default"><span className="block text-xs uppercase text-stone-300">{attack.damageType||'Untyped'} damage</span><strong className="text-xl">{attack.damage}</strong></button>}{(attack.additionalDamage??[]).filter(part=>part.formula.trim()).map((part,partIndex)=><button key={partIndex} type="button" disabled={!onRoll} onClick={()=>onRoll?.(part.formula,`${attack.weapon||title} ${part.type||'untyped'} Damage`)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-left text-stone-800"><span className="block text-xs uppercase text-stone-500">{part.type||'Untyped'}</span><strong>{part.formula}</strong></button>)}</div></div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Weapon notes<textarea aria-label={`${attack.weapon||'Weapon'} notes`} disabled={!editable} value={attack.notes??''} onChange={event=>update(index,'notes',event.target.value)} placeholder="Special properties, ammunition, effects, or reminders" className={`${inputClass} mt-1 min-h-20 resize-y normal-case`} /></label>
        </article>;
      })}
      {!items.length&&<div className="rounded-xl border-2 border-dashed border-stone-200 py-8 text-center text-sm text-stone-500">No {title.toLocaleLowerCase()} added.</div>}
      {editable&&<button type="button" onClick={()=>onSet(path,[{weapon:'',baseDamage:'1d8',attackAbility:ranged?'dex':'str',damageAbility:ranged?'none':'str',damageAbilityMultiplier:1},...items])} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900">+ {title}</button>}
    </div>
  </Panel>;
}

function CombatTab({data,editable,onSet,onRoll}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void;onRoll?:Pathfinder1eCharacterSheetProps['onRoll']}) {
  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Health & Armor Class" icon={Shield}>
        <div className="grid gap-3 sm:grid-cols-5"><SheetInput label="HP current" value={data.hp?.current} editable={editable} type="number" onChange={value=>onSet('hp.current',value)} /><SheetInput label="HP total" value={data.hp?.total} editable={editable} type="number" onChange={value=>onSet('hp.total',value)} /><SheetInput label="Long rest HP" value={data.hp?.longRestRestore} editable={editable} type="number" min={0} onChange={value=>onSet('hp.longRestRestore',value)} /><SheetInput label="Temporary HP" value={data.hp?.temporary} editable={editable} type="number" min={0} onChange={value=>onSet('hp.temporary',value)} /><SheetInput label="Nonlethal" value={data.hp?.nonLethal} editable={editable} type="number" min={0} onChange={value=>onSet('hp.nonLethal',value)} /></div>
        <div className="mt-4 grid grid-cols-3 gap-3">{[['AC',data.ac?.total],['Touch',data.ac?.touch],['Flat-footed',data.ac?.flatFooted]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-stone-800 p-3 text-center text-white"><div className="text-xs uppercase text-stone-300">{label}</div><div className="text-3xl font-black">{value??10}</div></div>)}</div>
        <div className="mt-4 max-w-xs"><SheetInput label="Size modifier (AC)" value={data.ac?.sizeModifier??pf1eSizeModifier(data.size)} editable={editable} type="number" placeholder="Automatic from size" onChange={value=>onSet('ac.sizeModifier',value)} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><SheetInput label="Natural armor" value={data.ac?.naturalArmor} editable={editable} type="number" onChange={value=>onSet('ac.naturalArmor',value)} /><SheetInput label="Deflection" value={data.ac?.deflectionModifier} editable={editable} type="number" onChange={value=>onSet('ac.deflectionModifier',value)} /><SheetInput label="Dodge" value={data.ac?.dodgeModifier} editable={editable} type="number" onChange={value=>onSet('ac.dodgeModifier',value)} /><SheetInput label="Misc AC" value={data.ac?.miscModifier} editable={editable} type="number" onChange={value=>onSet('ac.miscModifier',value)} /><SheetInput label="Temporary AC" value={data.ac?.tempModifier} editable={editable} type="number" onChange={value=>onSet('ac.tempModifier',value)} /><SheetInput label="Touch-only adjustment" value={data.ac?.touchModifier} editable={editable} type="number" onChange={value=>onSet('ac.touchModifier',value)} /><SheetInput label="Flat-footed adjustment" value={data.ac?.flatFootedModifier} editable={editable} type="number" onChange={value=>onSet('ac.flatFootedModifier',value)} /><SheetInput label="AC override" value={data.ac?.overrideTotal} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('ac.overrideTotal',value)} /><SheetInput label="Touch override" value={data.ac?.overrideTouch} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('ac.overrideTouch',value)} /><SheetInput label="Flat-footed override" value={data.ac?.overrideFlatFooted} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('ac.overrideFlatFooted',value)} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><SheetInput label="Damage reduction" value={data.damageReduction} editable={editable} placeholder="5/cold iron" onChange={value=>onSet('damageReduction',value)} /><SheetInput label="Spell resistance" value={data.spellResistance} editable={editable} onChange={value=>onSet('spellResistance',value)} /><SheetInput label="Resistances" value={data.resistances} editable={editable} onChange={value=>onSet('resistances',value)} /><SheetInput label="Immunities" value={data.immunities} editable={editable} onChange={value=>onSet('immunities',value)} /></div>
      </Panel>
      <Panel title="Combat Numbers" icon={Swords}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SheetInput label="Base attack bonus" value={data.bab} editable={editable} type="number" onChange={value=>onSet('bab',value)} /><SheetInput label="BAB misc modifier" value={data.babMiscModifier} editable={editable} type="number" onChange={value=>onSet('babMiscModifier',value)} /><SheetInput label="Initiative misc" value={data.initiative?.miscModifier} editable={editable} type="number" onChange={value=>onSet('initiative.miscModifier',value)} /><SheetInput label="Initiative temporary" value={data.initiative?.tempModifier} editable={editable} type="number" onChange={value=>onSet('initiative.tempModifier',value)} /><SheetInput label="Initiative override" value={data.initiative?.overrideTotal} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('initiative.overrideTotal',value)} /><SheetInput label="Base speed" value={data.speed?.base} editable={editable} placeholder="30 ft." onChange={value=>onSet('speed.base',value)} /><SheetInput label="Speed with armor" value={data.speed?.withArmor} editable={editable} placeholder="20 ft." onChange={value=>onSet('speed.withArmor',value)} /><SheetInput label="Fly speed" value={data.speed?.fly} editable={editable} placeholder="60 ft. (good)" onChange={value=>onSet('speed.fly',value)} /><SheetInput label="Swim speed" value={data.speed?.swim} editable={editable} onChange={value=>onSet('speed.swim',value)} /><SheetInput label="Climb speed" value={data.speed?.climb} editable={editable} onChange={value=>onSet('speed.climb',value)} /><SheetInput label="Burrow speed" value={data.speed?.burrow} editable={editable} onChange={value=>onSet('speed.burrow',value)} /><SheetInput label="Speed temporary / notes" value={data.speed?.tempModifiers} editable={editable} onChange={value=>onSet('speed.tempModifiers',value)} /></div>
        <div className="mt-4 grid grid-cols-3 gap-3"><RollValue label="Initiative" value={data.initiative?.total??0} onRoll={onRoll}/><RollValue label="CMB" value={data.cmb?.total??0} onRoll={onRoll}/><div className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-stone-800 text-white"><span className="text-xs uppercase text-stone-300">CMD</span><span className="text-3xl font-black">{data.cmd?.total??10}</span></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SheetInput label="CMB misc modifiers" value={data.cmb?.miscModifiers} editable={editable} onChange={value=>onSet('cmb.miscModifiers',value)} /><SheetInput label="CMB temporary" value={data.cmb?.tempModifiers} editable={editable} onChange={value=>onSet('cmb.tempModifiers',value)} /><SheetInput label="CMB override" value={data.cmb?.overrideTotal} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('cmb.overrideTotal',value)} /><SheetInput label="CMD misc modifiers" value={data.cmd?.miscModifiers} editable={editable} onChange={value=>onSet('cmd.miscModifiers',value)} /><SheetInput label="CMD temporary" value={data.cmd?.tempModifiers} editable={editable} onChange={value=>onSet('cmd.tempModifiers',value)} /><SheetInput label="CMD override" value={data.cmd?.overrideTotal} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet('cmd.overrideTotal',value)} /></div>
      </Panel>
    </div>
    <Panel title="Saving Throws" icon={Shield}>
      <div className="grid gap-3 lg:grid-cols-3">{(['fort','reflex','will'] as const).map(save=>{const row=data.saves?.[save];return <div key={save} className="rounded-xl border border-stone-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><strong className="capitalize text-stone-800">{save==='fort'?'Fortitude':save}</strong><button type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${signed(row?.total??0)}`,`${save} Save`)} className="rounded-lg bg-red-800 px-3 py-1 text-lg font-black text-white">{signed(row?.total??0)}</button></div><div className="grid grid-cols-2 gap-2"><SheetInput label="Base" value={row?.base} editable={editable} type="number" onChange={value=>onSet(`saves.${save}.base`,value)} /><SheetInput label={saveAbility[save].toUpperCase()} value={pf1eAbilityModifier(data.abilities?.[saveAbility[save]]?.tempScore??data.abilities?.[saveAbility[save]]?.score)} editable={false} type="number" onChange={()=>undefined} /><SheetInput label="Magic" value={row?.magicModifier} editable={editable} type="number" onChange={value=>onSet(`saves.${save}.magicModifier`,value)} /><SheetInput label="Misc" value={row?.miscModifier} editable={editable} type="number" onChange={value=>onSet(`saves.${save}.miscModifier`,value)} /><SheetInput label="Temporary" value={row?.tempModifier} editable={editable} type="number" onChange={value=>onSet(`saves.${save}.tempModifier`,value)} /><SheetInput label="Total override" value={row?.overrideTotal} editable={editable} type="number" placeholder="Automatic" onChange={value=>onSet(`saves.${save}.overrideTotal`,value)} /></div><div className="mt-2"><SheetInput label="Conditional modifiers" value={row?.otherModifiers} editable={editable} onChange={value=>onSet(`saves.${save}.otherModifiers`,value)} /></div></div>})}</div>
    </Panel>
    <Panel title="Armor & Shields" icon={Shield}><ArmorList data={data} editable={editable} onSet={onSet} /></Panel>
    <AttackList title="Melee Attacks" items={data.melee??[]} ranged={false} editable={editable} onSet={onSet} onRoll={onRoll}/>
    <AttackList title="Ranged Attacks" items={data.ranged??[]} ranged editable={editable} onSet={onSet} onRoll={onRoll}/>
  </div>;
}

function SkillsTab({data,editable,onSet,onRoll}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void;onRoll?:Pathfinder1eCharacterSheetProps['onRoll']}) {
  const skills=data.skills??[];
  const update=(index:number,key:keyof PF1eSkill,value:unknown)=>onSet('skills',skills.map((skill,skillIndex)=>skillIndex===index?{...skill,[key]:value}:skill));
  return <Panel title="Skills" icon={BookOpen}>
    <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead><tr className="border-b-2 border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500"><th className="p-2">CS</th><th className="p-2">Skill</th><th className="p-2 text-center">Total</th><th className="p-2">Ability</th><th className="p-2">Ranks</th><th className="p-2">Racial</th><th className="p-2">Trait</th><th className="p-2">Misc</th><th className="p-2">Temp</th><th className="p-2">Override</th></tr></thead><tbody>{skills.map((skill,index)=><tr key={`${skill.name}-${index}`} className="border-b border-stone-100 bg-white odd:bg-stone-50/70"><td className="p-2 text-center"><input disabled={!editable} type="checkbox" checked={!!skill.classSkill} onChange={event=>update(index,'classSkill',event.target.checked)} /></td><td className="p-2 font-medium text-stone-800">{skill.name}{skill.trainedOnly&&<span className="text-red-700"> *</span>}</td><td className="p-2 text-center"><button type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${signed(skill.total??0)}`,`${skill.name} Check`)} className="min-w-12 rounded-lg bg-red-800 px-2 py-1 font-black text-white">{signed(skill.total??0)}</button></td><td className="p-2 text-stone-600">{skill.ability.toUpperCase()} {signed(pf1eAbilityModifier(data.abilities?.[skill.ability]?.tempScore??data.abilities?.[skill.ability]?.score))}</td>{(['ranks','racial','trait','misc','temp','overrideTotal'] as const).map(key=><td key={key} className="p-1"><input aria-label={`${skill.name} ${key}`} disabled={!editable} type="number" min={key==='ranks'?0:undefined} value={skill[key]??''} placeholder={key==='overrideTotal'?'Auto':undefined} onChange={event=>update(index,key,numberOrUndefined(event.target.value))} className="w-16 rounded-md border border-stone-300 px-2 py-1 text-center disabled:border-transparent disabled:bg-transparent" /></td>)}</tr>)}</tbody></table></div>
    <div className="mt-2 text-xs text-stone-500">* Trained only. Armor check penalties are applied automatically to affected skills (double for Swim).</div>
    <div className="mt-4"><SheetInput label="Conditional skill modifiers" value={data.skillConditionalModifiers} editable={editable} onChange={value=>onSet('skillConditionalModifiers',value)} /></div>
  </Panel>;
}

function GearCard({item,index,editable,clustered,onUpdate,onRemove}:{item:PF1eGearItem;index:number;editable:boolean;clustered:boolean;onUpdate:(key:keyof PF1eGearItem,value:unknown)=>void;onRemove:()=>void}) {
  const [expanded,setExpanded]=useState(editable);
  const facts=[item.type,item.quantity!==undefined?`Qty ${item.quantity}`:undefined,item.location?`At ${item.location}`:undefined,item.weight?`${item.weight} each`:undefined].filter(Boolean);
  return <article className="rounded-xl border border-stone-200 bg-white p-3">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {editable?<input aria-label="Gear item" value={item.name} onChange={event=>onUpdate('name',event.target.value)} placeholder="Item" className={`${inputClass} font-semibold`} />:<div className="font-bold text-stone-900">{item.name}</div>}
        {!expanded&&<div className="mt-1 text-xs text-stone-500"><span>{facts.join(' · ')||'Qty 1'}</span>{item.notes&&<span className="mt-1 block line-clamp-2 text-stone-600">{item.notes}</span>}</div>}
      </div>
      {editable&&<button type="button" aria-label={`Remove ${item.name||'item'}`} onClick={onRemove} className="mt-2 text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label={`${expanded?'Collapse':'Expand'} ${item.name||`item ${index+1}`}`} className="mt-1 rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"><ChevronDown className={`h-4 w-4 transition-transform ${expanded?'rotate-180':''}`}/></button>
    </div>
    {expanded&&<div className={`mt-3 grid gap-3 ${clustered?'grid-cols-1 sm:grid-cols-2':'sm:grid-cols-2 lg:grid-cols-4'}`}><SheetInput label="Quantity" value={item.quantity} editable={editable} type="number" min={0} onChange={value=>onUpdate('quantity',value)} /><SheetInput label="Type" value={item.type} editable={editable} onChange={value=>onUpdate('type',value)} /><SheetInput label="Location" value={item.location} editable={editable} onChange={value=>onUpdate('location',value)} /><SheetInput label="Weight" value={item.weight} editable={editable} onChange={value=>onUpdate('weight',value)} /><label className={`text-xs font-semibold text-stone-600 ${clustered?'sm:col-span-2':'sm:col-span-2 lg:col-span-4'}`}>Notes<textarea aria-label={`${item.name||'Gear'} notes`} disabled={!editable} value={item.notes??''} onChange={event=>onUpdate('notes',event.target.value)} placeholder="Description, contents, effects, or other notes" className={`${inputClass} mt-1 min-h-24 resize-y`} /></label></div>}
  </article>;
}

export function GearList({data,editable,onSet}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void}) {
  const [layout,setLayout]=useState<'list'|'grid'>('list');
  const gear=data.gear??[];
  const update=(index:number,key:keyof PF1eGearItem,value:unknown)=>onSet('gear',gear.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  return <div className="space-y-3"><div className="flex justify-end"><div className="flex rounded-lg border border-stone-200 bg-white p-1"><button type="button" aria-label="List items" aria-pressed={layout==='list'} onClick={()=>setLayout('list')} className={`rounded p-1.5 ${layout==='list'?'bg-red-800 text-white':'text-stone-500 hover:bg-stone-100'}`}><List className="h-4 w-4"/></button><button type="button" aria-label="Cluster items" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')} className={`rounded p-1.5 ${layout==='grid'?'bg-red-800 text-white':'text-stone-500 hover:bg-stone-100'}`}><LayoutGrid className="h-4 w-4"/></button></div></div><div className={layout==='grid'?'grid gap-3 md:grid-cols-2':'space-y-3'}>{gear.map((item,index)=><GearCard key={index} item={item} index={index} editable={editable} clustered={layout==='grid'} onUpdate={(key,value)=>update(index,key,value)} onRemove={()=>onSet('gear',gear.filter((_,itemIndex)=>itemIndex!==index))}/>)}</div>{editable&&<button type="button" onClick={()=>onSet('gear',[{name:'',quantity:1},...gear])} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white">+ Item</button>}</div>;
}

function InventoryTab({data,editable,onSet}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void}) {
  return <div className="space-y-6"><Panel title="Currency" icon={Package}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{(['pp','gp','sp','cp'] as const).map(key=><SheetInput key={key} label={key.toUpperCase()} value={data.money?.[key]} editable={editable} type="number" min={0} onChange={value=>onSet(`money.${key}`,value)} />)}<SheetInput label="Gems & art" value={data.money?.gems} editable={editable} onChange={value=>onSet('money.gems',value)} /><SheetInput label="Other treasure" value={data.money?.other} editable={editable} onChange={value=>onSet('money.other',value)} /></div></Panel><Panel title="Equipment" icon={Backpack}><GearList data={data} editable={editable} onSet={onSet}/></Panel></div>;
}

function FeatureCard({title,feature,index,editable,onChange,onRemove}:{title:string;feature:PF1eFeature;index:number;editable:boolean;onChange:(key:keyof PF1eFeature,value:string)=>void;onRemove:()=>void}) {
  const [expanded,setExpanded]=useState(editable);
  return <article className="rounded-xl border border-stone-200 bg-white p-4">
    <div className="flex gap-2">
      {editable?<>
        <input aria-label={`${title} name`} value={feature.name} onChange={event=>onChange('name',event.target.value)} placeholder="Name" className={`${inputClass} font-semibold`} />
        <input aria-label={`${title} type`} value={feature.type??''} onChange={event=>onChange('type',event.target.value)} placeholder="Type" className={`${inputClass} max-w-32`} />
        <button type="button" aria-label={`Remove ${feature.name||title}`} onClick={onRemove} className="text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
      </>:<div className="min-w-0 flex-1 font-bold text-stone-900">{feature.name}{feature.type&&<span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">{feature.type}</span>}</div>}
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label={`${expanded?'Collapse':'Expand'} ${feature.name||`${title} ${index+1}`}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"><ChevronDown className={`h-4 w-4 transition-transform ${expanded?'rotate-180':''}`}/></button>
    </div>
    {!expanded&&<div className="mt-2 text-xs text-stone-500">{feature.type&&<span className="mr-2 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-800">{feature.type}</span>}<span className="line-clamp-2">{feature.description||'No description recorded.'}</span></div>}
    {expanded&&(editable?<textarea aria-label={`${title} description`} value={feature.description??''} onChange={event=>onChange('description',event.target.value)} placeholder="Rules text or notes" className={`${inputClass} mt-3 min-h-24 resize-y`} />:feature.description&&<div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{feature.description}</div>)}
  </article>;
}

function FeatureList({title,values,editable,onChange}:{title:string;values:PF1eFeature[];editable:boolean;onChange:(values:PF1eFeature[])=>void}) {
  const update=(index:number,key:keyof PF1eFeature,value:string)=>onChange(values.map((item,itemIndex)=>itemIndex===index?{...item,[key]:value}:item));
  return <Panel title={title}><div className="grid gap-3 md:grid-cols-2">{values.map((feature,index)=><FeatureCard key={index} title={title} feature={feature} index={index} editable={editable} onChange={(key,value)=>update(index,key,value)} onRemove={()=>onChange(values.filter((_,itemIndex)=>itemIndex!==index))}/>)}{!values.length&&<div className="col-span-full rounded-xl border-2 border-dashed border-stone-200 py-8 text-center text-sm text-stone-500">Nothing recorded yet.</div>}</div>{editable&&<button type="button" onClick={()=>onChange([{name:''},...values])} className="mt-3 rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white">+ {title}</button>}</Panel>;
}

function FeaturesTab({data,editable,onSet}:{data:PF1eCharacterData;editable:boolean;onSet:(path:string,value:unknown)=>void}) {
  return <div className="space-y-6"><Panel title="Feats"><PF1eFeatList values={data.feats??[]} editable={editable} onChange={values=>onSet('feats',values)} /></Panel><FeatureList title="Special Abilities" values={data.specialAbilities??[]} editable={editable} onChange={values=>onSet('specialAbilities',values)} /><FeatureList title="Traits" values={data.traits??[]} editable={editable} onChange={values=>onSet('traits',values)} /><Panel title="Biography & Notes" icon={NotebookPen}><textarea aria-label="Character notes" disabled={!editable} value={data.notes??''} onChange={event=>onSet('notes',event.target.value)} className={`${inputClass} min-h-56 resize-y whitespace-pre-wrap`} /></Panel></div>;
}

function Pathfinder1eCharacterEditor({character,mode,onSave,onCancel,onRoll}:Pathfinder1eCharacterSheetProps) {
  const [activeTab,setActiveTab]=useState<TabId>('overview');
  const [saving,setSaving]=useState(false);
  const [data,setData]=useState<PF1eCharacterData>(()=>createPF1eSheetData(character.data as Partial<PF1eCharacterData>,character.name));
  const [tokenImageFile,setTokenImageFile]=useState<File|null>(null);
  const [tokenImagePreview,setTokenImagePreview]=useState<string|null>(character.tokenImageUrl);
  const [tokenImageError,setTokenImageError]=useState('');
  const {data:serverConfig}=useServerConfigQuery();
  const editable=mode==='edit';

  const set=useCallback((path:string,value:unknown)=>{
    setData(previous=>{
      const next:any=structuredClone(previous);
      const parts=path.split('.');
      let current=next;
      for(const part of parts.slice(0,-1)) current=current[part]??={};
      current[parts[parts.length-1]]=value;
      return calculatePF1eDerived(next);
    });
  },[]);

  const handleTokenImageChange=(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    if(!file)return;
    if(!file.type.startsWith('image/')){setTokenImageError('Please select an image file.');return;}
    const limit=getUploadLimit(serverConfig,AssetType.TOKEN);
    if(file.size>limit){setTokenImageError(`Image must be smaller than ${formatUploadLimit(limit)}.`);return;}
    setTokenImageError('');
    setTokenImageFile(file);
    const reader=new FileReader();
    reader.onloadend=()=>setTokenImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save=async()=>{
    if(!onSave)return;
    setSaving(true);
    setTokenImageError('');
    try{
      let tokenImageUrl: string|undefined;
      if(tokenImageFile){
        const formData=new FormData();
        formData.append('type',AssetType.TOKEN);
        if(character.campaignId){
          formData.append('scope','CAMPAIGN');
          formData.append('campaignId',character.campaignId);
        }else{
          formData.append('scope','USER');
        }
        formData.append('name',`${data.characterName||character.name} Token`);
        formData.append('file',tokenImageFile);
        try{
          const {asset}=await api.uploadAsset(formData);
          tokenImageUrl=`/api/assets/tokens/${asset.id}`;
        }catch(error:any){
          setTokenImageError(error.response?.data?.message||'Failed to upload token image.');
          return;
        }
      }
      await onSave(preparePF1eDataForSave(data),true,tokenImageUrl);
      setTokenImageFile(null);
    }finally{setSaving(false);}
  };

  return <div className="mx-auto max-w-[1180px] overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-xl">
    <header className="relative bg-gradient-to-r from-red-700 via-red-800 to-red-950 p-6 text-white">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0">
            {editable?<>
              <input id={`pf1e-token-upload-${character.id}`} aria-label="Token image" type="file" accept="image/*" onChange={handleTokenImageChange} className="hidden" />
              <label htmlFor={`pf1e-token-upload-${character.id}`} className="group relative block cursor-pointer" title="Choose token image">
                {tokenImagePreview?<img src={tokenImagePreview} alt={`${data.characterName} token`} className="h-24 w-24 rounded-full border-4 border-white/20 object-cover" />:<div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-black/20"><Swords className="h-9 w-9 text-white/70" /></div>}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"><Upload className="h-7 w-7 text-white" /></span>
              </label>
              {tokenImageError&&<div role="alert" className="mt-1 max-w-40 text-xs text-red-100">{tokenImageError}</div>}
            </>:tokenImagePreview?<img src={tokenImagePreview} alt="" className="h-24 w-24 rounded-full border-4 border-white/20 object-cover" />:<div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-black/20"><Swords className="h-9 w-9 text-white/70" /></div>}
          </div>
          <div className="min-w-0">{editable?<input aria-label="Character name" value={data.characterName} onChange={event=>set('characterName',event.target.value)} className="w-full min-w-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-3xl font-black text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />:<h2 className="truncate text-3xl font-black">{data.characterName}</h2>}<div className="mt-2 flex flex-wrap gap-2">{editable?<><input aria-label="Class and level" value={data.classAndLevel??''} onChange={event=>set('classAndLevel',event.target.value)} placeholder="Class & level" className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white placeholder:text-white/60" /><input aria-label="Race summary" value={data.race??''} onChange={event=>set('race',event.target.value)} placeholder="Race" className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white placeholder:text-white/60" /></>:<><span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium">{data.classAndLevel||'Adventurer'}</span>{data.race&&<span className="rounded-full bg-white/10 px-3 py-1 text-sm">{data.race}</span>}{data.alignment&&<span className="rounded-full bg-white/10 px-3 py-1 text-sm">{data.alignment}</span>}</>}</div></div>
        </div>
        {editable&&<div className="flex shrink-0 gap-2"><button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-red-900 shadow hover:bg-red-50 disabled:opacity-60"><Save className="h-4 w-4" />{saving?'Saving…':'Save'}</button>{onCancel&&<button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"><X className="h-4 w-4" />Cancel</button>}</div>}
      </div>
    </header>
    <nav aria-label="Character sheet sections" className="flex overflow-x-auto border-b-2 border-stone-200 bg-stone-50 px-3">{TABS.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>setActiveTab(id)} className={`-mb-0.5 inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab===id?'border-red-800 bg-white text-red-900':'border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    <main className="p-4 sm:p-6">{activeTab==='overview'&&<OverviewTab data={data} editable={editable} onSet={set} onRoll={onRoll}/>} {activeTab==='combat'&&<CombatTab data={data} editable={editable} onSet={set} onRoll={onRoll}/>} {activeTab==='skills'&&<SkillsTab data={data} editable={editable} onSet={set} onRoll={onRoll}/>} {activeTab==='spells'&&<PF1eSpellbook data={data} editable={editable} onSet={set}/>} {activeTab==='inventory'&&<InventoryTab data={data} editable={editable} onSet={set}/>} {activeTab==='features'&&<FeaturesTab data={data} editable={editable} onSet={set}/>}</main>
  </div>;
}

export default function Pathfinder1eCharacterSheet(props:Pathfinder1eCharacterSheetProps) {
  if(props.mode==='view')return <Pathfinder1eCharacterView character={props.character} onRoll={props.onRoll} onDataChange={props.onDataChange} onPlaceAoE={props.onPlaceAoE}/>;
  return <Pathfinder1eCharacterEditor {...props}/>;
}

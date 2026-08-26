import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Backpack, BedDouble, BookOpen, Dices, Heart, LayoutGrid, List, Shield, Sparkles, Swords, UserRound } from 'lucide-react';
import type { Character } from '../../../types';
import type { PF1eAttack, PF1eCharacterData, PF1eFeature } from '../../../types/game-systems/pathfinder1e';
import { withAdvantage, withDisadvantage } from '../../../utils/characterRolls';
import { applyPF1eLongRest, pf1eAbilityCheckModifier, pf1eAbilityModifier } from '../../../utils/pathfinder1eCalculations';
import PF1eFeatList from './PF1eFeatList';
import PF1eRulesText from './PF1eRulesText';
import PF1eSpellbook from './PF1eSpellbook';
import { createPF1eSheetData, PF1E_ABILITIES, signed } from './pathfinder1eDefaults';
import type { SpellAoEConfig } from '../../../utils/pathfinder1eSpellAoE';
import type { PF1eSpell } from '../../../types/game-systems/pathfinder1e';

interface Props {
  character:Character;
  onRoll?:(expression:string,purpose:string)=>void;
  onDataChange?:(data:PF1eCharacterData)=>void|Promise<void>;
  onPlaceAoE?:(config:SpellAoEConfig,spell:PF1eSpell)=>void;
}

interface RollMenuState { x:number;y:number;expression:string;purpose:string }

function Section({title,icon:Icon,children}:{title:string;icon:typeof Shield;children:ReactNode}) {
  return <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 shadow-sm sm:p-5">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900"><Icon className="h-5 w-5 text-red-800"/>{title}</h3>
    {children}
  </section>;
}

function Info({label,value}:{label:string;value:ReactNode}) {
  return <div className="rounded-lg bg-white px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</div><div className="mt-0.5 font-semibold text-stone-800">{value||'—'}</div></div>;
}

function Rollable({expression,purpose,onRoll,onMenu,className,children,ariaLabel}:{expression:string;purpose:string;onRoll?:Props['onRoll'];onMenu:(event:ReactMouseEvent,expression:string,purpose:string)=>void;className:string;children:ReactNode;ariaLabel?:string}) {
  if(!onRoll)return <div className={className}>{children}</div>;
  return <button type="button" aria-label={ariaLabel} onClick={()=>onRoll(expression,purpose)} onContextMenu={event=>onMenu(event,expression,purpose)} title={`Click: normal roll · Right-click: advantage / disadvantage`} className={className}>{children}</button>;
}

function AttackCards({title,attacks,onRoll,onMenu}:{title:string;attacks:PF1eAttack[];onRoll?:Props['onRoll'];onMenu:(event:ReactMouseEvent,expression:string,purpose:string)=>void}) {
  if(!attacks.length)return null;
  return <Section title={title} icon={Swords}><div className="grid gap-3 md:grid-cols-2">{attacks.map((attack,index)=>{
    const bonuses=attack.attackBonus?.match(/[+-]?\d+/g)??['+0'];
    const purpose=`${attack.weapon||title} Attack`;
    return <article key={`${attack.weapon}-${index}`} className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-stone-900">{attack.weapon}</div><div className="text-xs text-stone-500">{[attack.type,attack.range,attack.critical].filter(Boolean).join(' · ')}</div></div>
        <div className="flex flex-wrap justify-end gap-1">{bonuses.map((bonus,attackIndex)=><Rollable key={`${bonus}-${attackIndex}`} expression={`1d20${Number(bonus)>=0?'+':''}${Number(bonus)}`} purpose={`${purpose} ${attackIndex+1}`} ariaLabel={`${purpose} ${attackIndex+1} ${Number(bonus)>=0?'+':''}${Number(bonus)}`} onRoll={onRoll} onMenu={onMenu} className="rounded-lg bg-red-800 px-3 py-2 text-lg font-black text-white hover:bg-red-900">{Number(bonus)>=0?'+':''}{Number(bonus)}</Rollable>)}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!onRoll||!attack.damage} onClick={()=>attack.damage&&onRoll?.(attack.damage,`${attack.weapon} ${attack.damageType||'untyped'} Damage`)} className="rounded-md bg-stone-800 px-3 py-2 text-left text-white disabled:opacity-60"><span className="block text-[10px] font-bold uppercase text-stone-300">{attack.damageType||'Untyped'} damage</span><strong>{attack.damage||'—'}</strong></button>{(attack.additionalDamage??[]).filter(part=>part.formula.trim()).map((part,partIndex)=><button key={partIndex} type="button" disabled={!onRoll} title={part.notes} onClick={()=>onRoll?.(part.formula,`${attack.weapon} ${part.type||'untyped'} Damage`)} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-left"><span className="block text-[10px] font-bold uppercase text-stone-500">{part.type||'Untyped'} damage</span><strong>{part.formula}</strong></button>)}</div>
      {attack.notes&&<div className="mt-2 text-sm text-stone-600">{attack.notes}</div>}
    </article>;
  })}</div></Section>;
}

function FeatureGroup({title,values}:{title:string;values:PF1eFeature[]}) {
  if(!values.length)return null;
  return <Section title={title} icon={BookOpen}><div className="grid gap-3 md:grid-cols-2">{values.map((feature,index)=><details key={`${feature.name}-${index}`} className="rounded-lg border border-stone-200 bg-white p-3"><summary className="cursor-pointer font-bold text-stone-900">{feature.name}{feature.type&&<span className="ml-2 text-xs font-semibold text-red-800">{feature.type}</span>}<span className="mt-1 block line-clamp-1 text-xs font-normal text-stone-500">{feature.description||'No description recorded.'}</span></summary>{feature.description&&<div className="mt-3 border-t border-stone-100 pt-3"><PF1eRulesText text={feature.description}/></div>}</details>)}</div></Section>;
}

function InventoryCards({data}:{data:PF1eCharacterData}) {
  const [layout,setLayout]=useState<'list'|'grid'>('list');
  const gear=data.gear??[];
  return <><div className="mb-3 flex justify-end"><div className="flex rounded-lg border border-stone-200 bg-white p-1"><button type="button" aria-label="List items" aria-pressed={layout==='list'} onClick={()=>setLayout('list')} className={`rounded p-1.5 ${layout==='list'?'bg-red-800 text-white':'text-stone-500'}`}><List className="h-4 w-4"/></button><button type="button" aria-label="Cluster items" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')} className={`rounded p-1.5 ${layout==='grid'?'bg-red-800 text-white':'text-stone-500'}`}><LayoutGrid className="h-4 w-4"/></button></div></div><div className={layout==='grid'?'grid gap-3 md:grid-cols-2':'space-y-2'}>{gear.map((item,index)=><details key={`${item.name}-${index}`} className="min-w-0 rounded-lg border border-stone-200 bg-white p-3"><summary className="cursor-pointer font-bold text-stone-900">{item.name}<span className="ml-2 text-xs font-normal text-stone-500">{[item.type,item.quantity!==undefined?`Qty ${item.quantity}`:undefined,item.location,item.weight?`${item.weight} each`:undefined].filter(Boolean).join(' · ')}</span>{item.notes&&<span className="mt-1 block line-clamp-1 text-xs font-normal text-stone-500">{item.notes}</span>}</summary><div className="mt-3 grid grid-cols-1 gap-2 border-t border-stone-100 pt-3 text-sm sm:grid-cols-2"><Info label="Quantity" value={item.quantity??1}/><Info label="Weight" value={item.weight}/><Info label="Location" value={item.location}/><Info label="Type" value={item.type}/>{item.notes&&<div className="sm:col-span-2 whitespace-pre-wrap text-stone-600">{item.notes}</div>}</div></details>)}</div></>;
}

export default function Pathfinder1eCharacterView({character,onRoll,onDataChange,onPlaceAoE}:Props) {
  const data=createPF1eSheetData(character.data as Partial<PF1eCharacterData>,character.name);
  const [rollMenu,setRollMenu]=useState<RollMenuState|null>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!rollMenu)return;
    const dismiss=(event:globalThis.MouseEvent)=>{if(!menuRef.current?.contains(event.target as Node))setRollMenu(null);};
    document.addEventListener('mousedown',dismiss);
    return()=>document.removeEventListener('mousedown',dismiss);
  },[rollMenu]);
  const showRollMenu=(event:ReactMouseEvent,expression:string,purpose:string)=>{event.preventDefault();setRollMenu({x:event.clientX,y:event.clientY,expression,purpose});};
  const chooseRoll=(expression:string,purpose:string)=>{onRoll?.(expression,purpose);setRollMenu(null);};
  const noop=()=>undefined;
  const updateData=(path:string,value:unknown)=>{
    if(!onDataChange)return;
    const next:any=structuredClone(data);
    const parts=path.split('.');
    let current=next;
    for(const part of parts.slice(0,-1))current=current[part]??={};
    current[parts[parts.length-1]]=value;
    void onDataChange(next);
  };
  const money=data.money??{};

  return <div className="mx-auto max-w-[1180px] overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-xl">
    <header className="bg-gradient-to-r from-red-700 via-red-800 to-red-950 p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4">{character.tokenImageUrl?<img src={character.tokenImageUrl} alt="" className="h-20 w-20 rounded-full border-4 border-white/20 object-cover"/>:<div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 bg-black/20"><Swords className="h-8 w-8"/></div>}<div><h2 className="text-3xl font-black">{data.characterName}</h2><div className="mt-2 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-white/15 px-3 py-1">{data.classAndLevel||'Adventurer'}</span>{data.race&&<span className="rounded-full bg-white/10 px-3 py-1">{data.race}</span>}{data.alignment&&<span className="rounded-full bg-white/10 px-3 py-1">{data.alignment}</span>}</div></div></div>{onDataChange&&<button type="button" onClick={()=>void onDataChange(applyPF1eLongRest(data))} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-bold text-red-900 shadow hover:bg-red-50"><BedDouble className="h-4 w-4"/>Long rest</button>}</div>
    </header>
    <main className="space-y-6 p-4 sm:p-6">
      <Section title="Abilities" icon={Sparkles}><div className="grid grid-cols-3 gap-3 lg:grid-cols-6">{PF1E_ABILITIES.map(({key,label,short})=>{const ability=data.abilities?.[key];const score=ability?.tempScore??ability?.score??10;const mod=pf1eAbilityModifier(score);const check=pf1eAbilityCheckModifier(data,key);return <Rollable key={key} expression={`1d20${signed(check)}`} purpose={`${label} Check`} onRoll={onRoll} onMenu={showRollMenu} className="rounded-xl border border-stone-200 bg-white p-3 text-center transition hover:border-red-300 hover:bg-red-50"><div className="text-xs font-bold uppercase text-stone-500">{short}</div><div className="text-2xl font-black text-stone-900">{score}</div><div className="text-lg font-bold text-red-800">{signed(mod)}</div></Rollable>;})}</div></Section>

      <div className="grid gap-6 lg:grid-cols-2"><Section title="Vitals" icon={Heart}><div className="grid grid-cols-3 gap-3"><Info label="HP" value={`${data.hp?.current??0} / ${data.hp?.total??0}`}/><Info label="AC" value={data.ac?.total??10}/><Info label="Touch / Flat" value={`${data.ac?.touch??10} / ${data.ac?.flatFooted??10}`}/></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Initiative',data.initiative?.total??0],['Fortitude',data.saves?.fort?.total??0],['Reflex',data.saves?.reflex?.total??0],['Will',data.saves?.will?.total??0]].map(([label,value])=><Rollable key={String(label)} expression={`1d20${signed(Number(value))}`} purpose={String(label)} onRoll={onRoll} onMenu={showRollMenu} className="rounded-lg bg-red-800 p-3 text-center text-white hover:bg-red-900"><div className="text-[10px] font-bold uppercase opacity-75">{label}</div><div className="text-2xl font-black">{signed(Number(value))}</div></Rollable>)}</div></Section>
        <Section title="Character" icon={UserRound}><div className="grid grid-cols-2 gap-3"><Info label="Player" value={data.playerName}/><Info label="Size" value={data.size}/><Info label="Deity" value={data.deity}/><Info label="Homeland" value={data.homeland}/><Info label="Languages" value={data.languages}/><Info label="Experience" value={data.xp?.total}/></div></Section></div>

      <Section title="Combat" icon={Shield}><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Info label="BAB" value={signed((data.bab??0)+(data.babMiscModifier??0))}/><Rollable expression={`1d20${signed(data.cmb?.total??0)}`} purpose="CMB" onRoll={onRoll} onMenu={showRollMenu} className="rounded-lg bg-white px-3 py-2 text-left hover:bg-red-50"><div className="text-[10px] font-bold uppercase text-stone-500">CMB</div><div className="font-black">{signed(data.cmb?.total??0)}</div></Rollable><Info label="CMD" value={data.cmd?.total??10}/><Info label="Speed" value={data.speed?.base}/><Info label="Damage reduction" value={data.damageReduction}/></div></Section>
      <AttackCards title="Melee attacks" attacks={data.melee??[]} onRoll={onRoll} onMenu={showRollMenu}/><AttackCards title="Ranged attacks" attacks={data.ranged??[]} onRoll={onRoll} onMenu={showRollMenu}/>

      <Section title="Skills" icon={BookOpen}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(data.skills??[]).map((skill,index)=><Rollable key={`${skill.name}-${index}`} expression={`1d20${signed(skill.total??0)}`} purpose={`${skill.name} Check`} onRoll={onRoll} onMenu={showRollMenu} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-left hover:border-red-300 hover:bg-red-50"><span><span className="font-semibold text-stone-800">{skill.name}</span><span className="ml-2 text-xs uppercase text-stone-400">{skill.ability}</span></span><strong className="text-red-800">{signed(skill.total??0)}</strong></Rollable>)}</div>{data.skillConditionalModifiers&&<div className="mt-3 text-sm text-stone-600"><strong>Conditional:</strong> {data.skillConditionalModifiers}</div>}</Section>

      <PF1eSpellbook data={data} editable={false} onSet={onDataChange?updateData:noop} canTrackUses={!!onDataChange} onRoll={onRoll} onRollContext={showRollMenu} onPlaceAoE={onPlaceAoE}/>
      <Section title="Inventory" icon={Backpack}><div className="mb-4 flex flex-wrap gap-2 text-sm">{(['pp','gp','sp','cp'] as const).map(key=><span key={key} className="rounded-full bg-white px-3 py-1 font-semibold uppercase text-stone-700">{key} {money[key]??0}</span>)}</div><InventoryCards data={data}/></Section>
      {!!data.feats?.length&&<Section title="Feats" icon={BookOpen}><PF1eFeatList values={data.feats} editable={false} onChange={noop}/></Section>}
      <FeatureGroup title="Special abilities" values={data.specialAbilities??[]}/><FeatureGroup title="Traits" values={data.traits??[]}/>
      {data.notes&&<Section title="Notes" icon={BookOpen}><div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{data.notes}</div></Section>}
    </main>
    {rollMenu&&<div ref={menuRef} className="fixed z-50 min-w-48 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl" style={{left:rollMenu.x,top:rollMenu.y}}><div className="truncate bg-red-800 px-3 py-2 text-xs font-semibold text-white">{rollMenu.purpose}</div>{[
      ['Normal',rollMenu.expression,''],['Advantage',withAdvantage(rollMenu.expression),' (Advantage)'],['Disadvantage',withDisadvantage(rollMenu.expression),' (Disadvantage)'],
    ].map(([label,expression,suffix])=><button key={label} type="button" onClick={()=>chooseRoll(expression,rollMenu.purpose+suffix)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-red-50"><Dices className="h-4 w-4 text-red-800"/>{label}</button>)}</div>}
  </div>;
}

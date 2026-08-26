import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { ChevronDown, Crosshair, ExternalLink, LayoutGrid, List, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../../../services/api';
import type {
  PF1eCharacterData,
  PF1eSpell,
  PF1eSpellReference,
} from '../../../types/game-systems/pathfinder1e';
import { pf1eCurrentSpellSlots, pf1eSpellSlotsMaximum } from '../../../utils/pathfinder1eCalculations';
import { spellAoEFromPf1e, spellRangeFromPf1e, type SpellAoEConfig } from '../../../utils/pathfinder1eSpellAoE';
import { PF1E_ABILITIES, numberOrUndefined, signed } from './pathfinder1eDefaults';
import PF1eRulesText from './PF1eRulesText';

interface Props {
  data:PF1eCharacterData;
  editable:boolean;
  onSet:(path:string,value:unknown)=>void;
  canTrackUses?:boolean;
  onRoll?:(expression:string,purpose:string)=>void;
  onRollContext?:(event:ReactMouseEvent,expression:string,purpose:string)=>void;
  onPlaceAoE?:(config:SpellAoEConfig,spell:PF1eSpell)=>void;
}

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0';

function SpellSearchInput({spell,editable,onChange}:{spell:PF1eSpell;editable:boolean;onChange:(spell:PF1eSpell)=>void}) {
  const containerRef=useRef<HTMLDivElement>(null);
  const [results,setResults] = useState<PF1eSpellReference[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [focused,setFocused]=useState(false);

  useEffect(()=>{
    const dismiss=(event:PointerEvent)=>{
      if(!containerRef.current?.contains(event.target as Node)){setFocused(false);setResults([]);}
    };
    document.addEventListener('pointerdown',dismiss);
    return()=>document.removeEventListener('pointerdown',dismiss);
  },[]);

  useEffect(() => {
    if (!focused || !editable || spell.name.trim().length < 2 || spell.itemName) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const matches = await api.searchPathfinder1eSpells(spell.name);
        if (active) setResults(matches);
      } catch {
        if (active) {
          setResults([]);
          setError('Archives of Nethys is unavailable. You can still enter the spell manually.');
        }
      } finally {
        if (active) setLoading(false);
      }
    },300);
    return () => { active=false; window.clearTimeout(timer); };
  },[editable,focused,spell.itemName,spell.name]);

  const choose = async (reference:PF1eSpellReference) => {
    setLoading(true);
    setFocused(false);
    setError('');
    setResults([]);
    try {
      const detail = await api.getPathfinder1eSpell(reference.itemName);
      onChange({
        ...spell,
        name:detail.name,
        itemName:detail.itemName,
        school:detail.school,
        level:detail.levels,
        source:detail.source,
        rulesSource:'Archives of Nethys',
        sourceUrl:detail.sourceUrl,
        castingTime:detail.castingTime,
        components:detail.components,
        range:detail.range,
        target:detail.target,
        area:detail.area,
        effect:detail.effect,
        duration:detail.duration,
        savingThrow:detail.savingThrow,
        spellResistance:detail.spellResistance,
        description:detail.description,
      });
    } catch {
      setError('The spell details could not be imported. Try again or enter them manually.');
    } finally {
      setLoading(false);
    }
  };

  if (!editable) return (
    <div>
      <div className="font-bold text-stone-900">{spell.name}</div>
      {spell.school && <div className="text-xs capitalize text-stone-500">{spell.school}</div>}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={event=>{if(!containerRef.current?.contains(event.relatedTarget as Node|null)){setFocused(false);setResults([]);}}}
      onKeyDown={event=>{if(event.key==='Escape'){setFocused(false);setResults([]);(event.currentTarget.querySelector('input') as HTMLInputElement|null)?.blur();}}}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <input
          aria-label="Spell name"
          onFocus={()=>setFocused(true)}
          value={spell.name}
          onChange={event => {
            const name=event.target.value;
            const exact=results.find(result=>result.name.toLocaleLowerCase()===name.toLocaleLowerCase());
            onChange({...spell,name,itemName:undefined,rulesSource:undefined,sourceUrl:undefined});
            if(exact) void choose(exact);
          }}
          placeholder="Search Archives of Nethys…"
          className={`${inputClass} pl-9 pr-9`}
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-red-700" />}
      </div>
      {results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full min-w-[20rem] overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl">
          {results.map(result => (
            <button
              key={result.itemName}
              type="button"
              onClick={() => void choose(result)}
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-red-50"
            >
              <span className="block font-semibold text-red-900">{result.name}</span>
              <span className="block line-clamp-2 text-xs text-stone-500">{result.summary}</span>
            </button>
          ))}
        </div>
      )}
      {error && <div role="alert" className="mt-1 text-xs text-red-700">{error}</div>}
    </div>
  );
}

const details:Array<[keyof PF1eSpell,string]> = [
  ['castingTime','Casting time'],['components','Components'],['range','Range'],
  ['target','Target'],['area','Area'],['effect','Effect'],['duration','Duration'],
  ['savingThrow','Saving throw'],['spellResistance','Spell resistance'],
];

function SpellCard({spell,aoeConfig,rangeFt,editable,canTrackUses,castingType,slotsRemaining,onChange,onRemove,onPrepare,onUnprepare,onCast,onRestore,onPlaceAoE}:{spell:PF1eSpell;aoeConfig?:SpellAoEConfig;rangeFt?:number;editable:boolean;canTrackUses:boolean;castingType:'prepared'|'spontaneous';slotsRemaining:number;onChange:(spell:PF1eSpell)=>void;onRemove:()=>void;onPrepare:()=>void;onUnprepare:()=>void;onCast:()=>void;onRestore:()=>void;onPlaceAoE?:(config:SpellAoEConfig,spell:PF1eSpell)=>void}) {
  const [expanded,setExpanded]=useState(false);
  const prepared=Math.max(0,spell.prepared??0);
  const cast=Math.max(0,spell.cast??0);
  const remaining=Math.max(0,prepared-cast);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};
    document.addEventListener('keydown',close);
    return()=>document.removeEventListener('keydown',close);
  },[expanded]);
  return (
    <article onClick={!editable&&!expanded?()=>setExpanded(true):undefined} className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${!editable?'cursor-pointer transition hover:border-purple-300 hover:shadow-md':''}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><SpellSearchInput spell={spell} editable={editable} onChange={onChange} /></div>
        {editable && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${spell.name || 'spell'}`} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={()=>setExpanded(true)} aria-haspopup="dialog" aria-expanded={expanded} aria-label={`Open ${spell.name||'spell'} details`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        {spell.atWill?<span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">Unlimited uses</span>:castingType==='prepared'?<span className={`rounded-full px-2.5 py-1 font-bold ${remaining>0?'bg-purple-100 text-purple-900':'bg-stone-200 text-stone-700'}`}><span className="text-sm">{remaining} / {prepared}</span> prepared remaining</span>:<span className="rounded-full bg-purple-100 px-2.5 py-1 font-bold text-purple-900">Uses level slots</span>}
        {(spell.range||spell.castingTime)&&<span>{[spell.castingTime,spell.range].filter(Boolean).join(' · ')}</span>}
        {spell.notes&&<span className="w-full line-clamp-2 text-stone-600">{spell.notes}</span>}
      </div>

      {onPlaceAoE&&(aoeConfig||rangeFt)&&<div className="mt-3 flex flex-wrap gap-2" onClick={event=>event.stopPropagation()}>
        {aoeConfig&&<button type="button" onClick={()=>onPlaceAoE(aoeConfig,spell)} className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-900 hover:bg-purple-100"><Crosshair className="h-4 w-4"/>Place area · {aoeConfig.shape==='sphere'?'circle':aoeConfig.shape} {aoeConfig.sizeFt} ft{aoeConfig.shape==='line'?` × ${aoeConfig.widthFt??5} ft`:''}</button>}
        {rangeFt&&<button type="button" onClick={()=>onPlaceAoE({shape:'sphere',sizeFt:rangeFt},spell)} className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900 hover:bg-blue-100"><Crosshair className="h-4 w-4"/>Show range · {rangeFt} ft</button>}
      </div>}

      {!editable&&canTrackUses&&!spell.atWill&&<div className="mt-3 flex flex-wrap gap-2" onClick={event=>event.stopPropagation()}>{castingType==='prepared'?<>
        <button type="button" disabled={slotsRemaining<=0} onClick={onPrepare} className="rounded-lg bg-purple-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Prepare</button>
        <button type="button" disabled={remaining<=0} onClick={onCast} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Cast prepared</button>
        <button type="button" disabled={remaining<=0} onClick={onUnprepare} className="rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-purple-900 disabled:opacity-40">Unprepare</button>
        <button type="button" disabled={cast<=0} onClick={onRestore} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 disabled:opacity-40">Restore cast</button>
      </>:<>
        <button type="button" disabled={slotsRemaining<=0} onClick={onCast} className="rounded-lg bg-purple-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Cast spell</button>
        <button type="button" onClick={onRestore} className="rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-purple-900">Restore slot</button>
      </>}</div>}

      {expanded&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onMouseDown={event=>{if(event.target===event.currentTarget)setExpanded(false)}}><div role="dialog" aria-modal="true" aria-label={`${spell.name||'Spell'} details`} className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4"><div><h3 className="text-xl font-black text-stone-900">{spell.name||'Spell details'}</h3>{spell.school&&<div className="text-sm capitalize text-stone-500">{spell.school}</div>}</div><button type="button" aria-label={`Close ${spell.name||'spell'} details`} onClick={()=>setExpanded(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"><X className="h-5 w-5"/></button></div><div className="p-5">
      {editable?<div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">School</span><input value={spell.school ?? ''} onChange={event=>onChange({...spell,school:event.target.value})} className={`${inputClass} mt-1 min-h-10`} /></label>
        <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">Prepared</span><input disabled={!editable} type="number" min="0" value={spell.prepared ?? ''} onChange={event=>onChange({...spell,prepared:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 min-h-10`} /></label>
        <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">Cast</span><input disabled={!editable} type="number" min="0" value={spell.cast ?? ''} onChange={event=>onChange({...spell,cast:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 min-h-10`} /></label>
        <label className="flex items-center gap-2 self-end rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700"><input disabled={!editable} type="checkbox" checked={!!spell.atWill} onChange={event=>onChange({...spell,atWill:event.target.checked})} />At will</label>
      </div>:spell.atWill?<div className="mt-3"><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800">Unlimited uses</span></div>:null}

      {!editable&&canTrackUses&&!spell.atWill&&castingType==='prepared'&&<section aria-label="Prepared spell uses" className="mt-4 rounded-xl border-2 border-purple-200 bg-purple-50 p-4"><div className="text-xs font-bold uppercase tracking-wide text-purple-700">Prepared copies</div><div className="mt-1 text-2xl font-black text-purple-950">{remaining} ready · {cast} cast</div></section>}

      {(spell.sourceUrl || spell.level || spell.source) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
          {spell.level && <span className="rounded-full bg-purple-100 px-2 py-1 font-semibold text-purple-800">{spell.level}</span>}
          {spell.source && <span>{spell.source}</span>}
          {spell.sourceUrl && <a href={spell.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline">{spell.rulesSource ?? 'Rules source'}<ExternalLink className="h-3 w-3" /></a>}
        </div>
      )}

      {details.some(([key]) => spell[key]) && (
        <dl className="mt-3 grid gap-x-5 gap-y-1 rounded-lg bg-stone-50 p-3 text-xs sm:grid-cols-2">
          {details.map(([key,label]) => spell[key] ? <div key={key} className="flex gap-2"><dt className="font-semibold text-stone-700">{label}:</dt><dd className="text-stone-600">{String(spell[key])}</dd></div> : null)}
        </dl>
      )}

      {editable ? (
        <label className="mt-3 block text-xs font-semibold text-stone-600">Notes<input value={spell.notes ?? ''} onChange={event=>onChange({...spell,notes:event.target.value})} className={`${inputClass} mt-1`} /></label>
      ) : spell.notes ? <div className="mt-3 text-sm italic text-stone-600">{spell.notes}</div> : null}
      {spell.description && <div className="mt-3 border-t border-stone-100 pt-3"><PF1eRulesText text={spell.description}/></div>}
      </div></div></div>}
    </article>
  );
}

export default function PF1eSpellbook({data,editable,onSet,canTrackUses=false,onRoll,onRollContext,onPlaceAoE}:Props) {
  const [level,setLevel] = useState(() => data.spells?.findIndex(entry => entry.slotted?.length) ?? 0);
  const [layout,setLayout]=useState<'list'|'grid'>('list');
  const activeLevel = level < 0 ? 0 : level;
  const isSpellLike=activeLevel===10;
  const spellLevel = data.spells?.[activeLevel] ?? {slotted:[]};
  const spells = isSpellLike ? data.spellLikes??[] : spellLevel.slotted ?? [];
  const castingMod = data.spellcastingAbility
    ? Math.floor((((data.abilities?.[data.spellcastingAbility]?.tempScore ?? data.abilities?.[data.spellcastingAbility]?.score) ?? 10)-10)/2)
    : 0;
  const castingType=data.spellcastingType??'prepared';
  const slotsMaximum=pf1eSpellSlotsMaximum(spellLevel);
  const slotsRemaining=pf1eCurrentSpellSlots(spellLevel);
  const conditionalDcModifiers=data.spellDcConditionalModifiers??[];
  const updateConditionalDcModifier=(index:number,patch:Partial<(typeof conditionalDcModifiers)[number]>)=>
    onSet('spellDcConditionalModifiers',conditionalDcModifiers.map((modifier,modifierIndex)=>modifierIndex===index?{...modifier,...patch}:modifier));

  const updateLevel=(patch:Partial<typeof spellLevel>)=>{
    const levels=[...(data.spells??[])];
    while(levels.length<10)levels.push({slotted:[]});
    levels[activeLevel]={...levels[activeLevel],...patch};
    onSet('spells',levels);
  };

  const updateSpells = (next:PF1eSpell[]) => {
    if(isSpellLike){onSet('spellLikes',next);return;}
    const levels = [...(data.spells ?? [])];
    while (levels.length < 10) levels.push({slotted:[]});
    levels[activeLevel] = {...levels[activeLevel],slotted:next};
    onSet('spells',levels);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border-2 border-stone-200 bg-stone-50 p-4">
        <h3 className="text-lg font-bold text-stone-800">Spellcasting</h3>
        {editable?<><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-stone-700">Casting ability
            <select disabled={!editable} value={data.spellcastingAbility ?? ''} onChange={event=>onSet('spellcastingAbility',event.target.value || undefined)} className={`${inputClass} mt-1`}>
              <option value="">None</option>{PF1E_ABILITIES.map(ability=><option key={ability.key} value={ability.key}>{ability.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-stone-700">Casting type<select value={castingType} onChange={event=>onSet('spellcastingType',event.target.value)} className={`${inputClass} mt-1`}><option value="prepared">Prepared (wizard/cleric)</option><option value="spontaneous">Spontaneous (sorcerer/bard)</option></select></label>
          <label className="text-sm font-semibold text-stone-700">Caster level<input disabled={!editable} type="number" min="0" value={data.casterLevel ?? ''} onChange={event=>onSet('casterLevel',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration misc<input disabled={!editable} type="number" value={data.concentrationMiscModifier ?? ''} onChange={event=>onSet('concentrationMiscModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration temporary<input disabled={!editable} type="number" value={data.concentrationTempModifier ?? ''} onChange={event=>onSet('concentrationTempModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration override<input disabled={!editable} type="number" placeholder="Automatic" value={data.concentrationOverride ?? ''} onChange={event=>onSet('concentrationOverride',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <div className="rounded-lg bg-purple-800 p-3 text-white"><div className="text-xs font-semibold uppercase tracking-wide text-purple-200">Concentration</div><div className="mt-1 text-3xl font-black">{signed(data.concentrationTotal ?? 0)}</div></div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-700">Spell DC modifier<input disabled={!editable} type="number" value={data.spellDcMiscModifier ?? ''} onChange={event=>onSet('spellDcMiscModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Spell DC temporary<input disabled={!editable} type="number" value={data.spellDcTempModifier ?? ''} onChange={event=>onSet('spellDcTempModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
        </div>
        <section className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3"><div className="flex items-center justify-between gap-3"><div><h4 className="font-bold text-purple-950">Conditional spell DC modifiers</h4><p className="text-xs text-purple-700">Each source keeps its own adjustment and triggering condition.</p></div><button type="button" onClick={()=>onSet('spellDcConditionalModifiers',[{source:'',condition:'',dcModifier:0},...conditionalDcModifiers])} className="shrink-0 rounded-lg bg-purple-800 px-3 py-2 text-sm font-bold text-white"><Plus className="mr-1 inline h-4 w-4"/>Add source</button></div><div className="mt-3 space-y-2">{conditionalDcModifiers.map((modifier,index)=><div key={index} className="grid gap-2 rounded-lg border border-purple-100 bg-white p-3 sm:grid-cols-[1fr_1.5fr_7rem_2fr_auto]"><label className="text-xs font-semibold text-stone-600">Source<input aria-label={`Conditional DC source ${index+1}`} value={modifier.source} onChange={event=>updateConditionalDcModifier(index,{source:event.target.value})} placeholder="Spell Focus" className={`${inputClass} mt-1`}/></label><label className="text-xs font-semibold text-stone-600">Condition<input aria-label={`Conditional DC condition ${index+1}`} value={modifier.condition} onChange={event=>updateConditionalDcModifier(index,{condition:event.target.value})} placeholder="Evocation spells" className={`${inputClass} mt-1`}/></label><label className="text-xs font-semibold text-stone-600">DC adjustment<input aria-label={`Conditional DC adjustment ${index+1}`} type="number" value={modifier.dcModifier} onChange={event=>updateConditionalDcModifier(index,{dcModifier:numberOrUndefined(event.target.value)??0})} className={`${inputClass} mt-1`}/></label><label className="text-xs font-semibold text-stone-600">Notes<input aria-label={`Conditional DC notes ${index+1}`} value={modifier.notes??''} onChange={event=>updateConditionalDcModifier(index,{notes:event.target.value})} placeholder="Optional details" className={`${inputClass} mt-1`}/></label><button type="button" aria-label={`Remove conditional DC source ${index+1}`} onClick={()=>onSet('spellDcConditionalModifiers',conditionalDcModifiers.filter((_,modifierIndex)=>modifierIndex!==index))} className="self-end rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4"/></button></div>)}{!conditionalDcModifiers.length&&<div className="rounded-lg border border-dashed border-purple-200 px-3 py-5 text-center text-sm text-purple-700">No conditional DC sources.</div>}</div>{data.spellsConditionalModifiers&&<div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-stone-600"><strong>Legacy conditional notes:</strong> {data.spellsConditionalModifiers}</div>}</section>
        </>:<><div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-3"><div className="text-xs uppercase text-stone-500">Casting ability</div><div className="mt-1 text-lg font-bold uppercase text-stone-800">{data.spellcastingAbility??'—'}</div></div>
          <div className="rounded-lg bg-white p-3"><div className="text-xs uppercase text-stone-500">Caster level</div><div className="mt-1 text-2xl font-black text-stone-800">{data.casterLevel??0}</div></div>
          <button type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${signed(data.concentrationTotal??0)}`,'Concentration Check')} onContextMenu={event=>{if(onRollContext){event.preventDefault();onRollContext(event,`1d20${signed(data.concentrationTotal??0)}`,'Concentration Check')}}} className="rounded-lg bg-purple-800 p-3 text-left text-white disabled:cursor-default"><div className="text-xs uppercase text-purple-200">Concentration</div><div className="mt-1 text-2xl font-black">{signed(data.concentrationTotal??0)}</div></button>
          <button type="button" disabled={!onRoll} onClick={()=>onRoll?.(`1d20${signed(data.casterLevel??0)}`,'Spell Resistance Penetration')} onContextMenu={event=>{if(onRollContext){event.preventDefault();onRollContext(event,`1d20${signed(data.casterLevel??0)}`,'Spell Resistance Penetration')}}} className="rounded-lg bg-white p-3 text-left disabled:cursor-default"><div className="text-xs uppercase text-stone-500">SR penetration</div><div className="mt-1 text-2xl font-black text-stone-800">{signed(data.casterLevel??0)}</div></button>
        </div>{(conditionalDcModifiers.length>0||data.spellsConditionalModifiers)&&<section className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-950"><h4 className="font-bold">Conditional spell DC</h4><div className="mt-2 space-y-2">{conditionalDcModifiers.map((modifier,index)=><div key={index} className="rounded-md bg-white px-3 py-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><strong>{modifier.source}</strong><span className="rounded-full bg-purple-800 px-2 py-0.5 font-black text-white">{signed(modifier.dcModifier)} DC</span></div><div className="mt-0.5 text-purple-900">When: {modifier.condition}</div>{modifier.notes&&<div className="mt-1 text-xs text-stone-600">{modifier.notes}</div>}</div>)}{data.spellsConditionalModifiers&&<div className="rounded-md bg-white px-3 py-2 text-stone-700"><strong>Legacy notes:</strong> {data.spellsConditionalModifiers}</div>}</div></section>}</>}
      </section>

      <section className="rounded-xl border-2 border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({length:10},(_,index) => {
            const count=data.spells?.[index]?.slotted?.length ?? 0;
            return <button key={index} type="button" onClick={()=>setLevel(index)} className={`min-w-16 rounded-lg border px-3 py-2 text-sm font-semibold ${activeLevel===index?'border-purple-800 bg-purple-800 text-white':'border-stone-200 bg-white text-stone-700 hover:border-purple-300'}`}>
              <span className="block">{index===0?'0 / Cantrip':`Level ${index}`}</span><span className="text-[10px] opacity-70">{count} spell{count===1?'':'s'}</span>
            </button>;
          })}
          <button type="button" onClick={()=>setLevel(10)} className={`min-w-16 rounded-lg border px-3 py-2 text-sm font-semibold ${isSpellLike?'border-purple-800 bg-purple-800 text-white':'border-stone-200 bg-white text-stone-700 hover:border-purple-300'}`}>
            <span className="block">Spell-like</span><span className="text-[10px] opacity-70">{data.spellLikes?.length??0} abilities</span>
          </button>
        </div>
        {!isSpellLike&&<div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-3"><div className="text-xs uppercase text-stone-500">Spell DC</div><div className="text-2xl font-black text-purple-800">{spellLevel.dc ?? 10+activeLevel+castingMod}</div></div>
          {editable&&<label className="rounded-lg bg-white p-3 text-xs font-semibold uppercase text-stone-500">DC override<input type="number" placeholder="Automatic" value={spellLevel.dcOverride ?? ''} onChange={event=>{const next=[...(data.spells??[])];next[activeLevel]={...spellLevel,dcOverride:numberOrUndefined(event.target.value)};onSet('spells',next)}} className={`${inputClass} mt-1 text-base normal-case`} /></label>}
          {editable?<label className="rounded-lg bg-white p-3 text-xs font-semibold uppercase text-stone-500">Base spells per day<input aria-label={`Level ${activeLevel} spells per day`} type="number" min="0" value={spellLevel.totalPerDay??''} onChange={event=>updateLevel({totalPerDay:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 text-base normal-case`} /></label>:<div className="rounded-lg bg-white p-3"><div className="text-xs font-semibold uppercase text-stone-500">Slots remaining</div><div className="text-2xl font-black text-purple-800">{slotsRemaining} / {slotsMaximum}</div></div>}
          <div className="rounded-lg bg-white p-3"><div className="text-xs uppercase text-stone-500">Bonus spells</div><div className="text-2xl font-black text-purple-800">{spellLevel.bonusSpells ?? 0}</div></div>
          {editable&&<label className="rounded-lg bg-white p-3 text-xs font-semibold uppercase text-stone-500">Current slots<input aria-label={`Level ${activeLevel} current spells per day`} type="number" min="0" max={slotsMaximum} value={spellLevel.currentPerDay??slotsMaximum} onChange={event=>updateLevel({currentPerDay:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 text-base normal-case`} /></label>}
        </div>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-stone-800">{isSpellLike?'Spell-like abilities':activeLevel===0?'Cantrips & orisons':`Level ${activeLevel} spells`}</h3>
          <div className="flex items-center gap-2"><div className="flex rounded-lg border border-stone-200 bg-white p-1"><button type="button" aria-label="List spells" aria-pressed={layout==='list'} onClick={()=>setLayout('list')} className={`rounded p-1.5 ${layout==='list'?'bg-purple-800 text-white':'text-stone-500 hover:bg-stone-100'}`}><List className="h-4 w-4"/></button><button type="button" aria-label="Cluster spells" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')} className={`rounded p-1.5 ${layout==='grid'?'bg-purple-800 text-white':'text-stone-500 hover:bg-stone-100'}`}><LayoutGrid className="h-4 w-4"/></button></div>{editable && <button type="button" onClick={()=>updateSpells([{name:''},...spells])} className="inline-flex items-center gap-2 rounded-lg bg-purple-800 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-900"><Plus className="h-4 w-4" />Add spell</button>}</div>
        </div>
        {spells.length ? <div className={layout==='grid'?'grid gap-3 md:grid-cols-2 xl:grid-cols-3':'space-y-3'}>{spells.map((spell,index)=>{const replace=(next:PF1eSpell)=>spells.map((item,itemIndex)=>itemIndex===index?next:item);return <SpellCard key={`${activeLevel}-${index}`} spell={spell} aoeConfig={spellAoEFromPf1e(spell,data.casterLevel)} rangeFt={spellRangeFromPf1e(spell,data.casterLevel)} editable={editable} canTrackUses={canTrackUses} castingType={castingType} slotsRemaining={slotsRemaining} onChange={next=>updateSpells(replace(next))} onRemove={()=>updateSpells(spells.filter((_,itemIndex)=>itemIndex!==index))} onPrepare={()=>{if(slotsRemaining<=0)return;updateLevel({currentPerDay:slotsRemaining-1,slotted:replace({...spell,prepared:(spell.prepared??0)+1})})}} onUnprepare={()=>{if((spell.prepared??0)-(spell.cast??0)<=0)return;updateLevel({currentPerDay:Math.min(slotsMaximum,slotsRemaining+1),slotted:replace({...spell,prepared:Math.max(0,(spell.prepared??0)-1)})})}} onCast={()=>{if(castingType==='spontaneous'){if(slotsRemaining<=0)return;updateLevel({currentPerDay:slotsRemaining-1});}else if((spell.prepared??0)>(spell.cast??0))updateSpells(replace({...spell,cast:(spell.cast??0)+1}));}} onRestore={()=>{if(castingType==='spontaneous')updateLevel({currentPerDay:Math.min(slotsMaximum,slotsRemaining+1)});else if((spell.cast??0)>0)updateSpells(replace({...spell,cast:(spell.cast??0)-1}));}} onPlaceAoE={onPlaceAoE} />})}</div> : <div className="rounded-xl border-2 border-dashed border-stone-200 py-10 text-center text-sm text-stone-500">No spells at this level.</div>}
      </section>
    </div>
  );
}

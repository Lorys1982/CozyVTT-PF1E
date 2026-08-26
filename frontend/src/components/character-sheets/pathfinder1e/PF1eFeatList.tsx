import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Loader2, Search, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { PF1eFeatReference, PF1eFeature } from '../../../types/game-systems/pathfinder1e';
import PF1eRulesText from './PF1eRulesText';

const inputClass='w-full min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0';

function FeatNameInput({feat,onChange}:{feat:PF1eFeature;onChange:(feat:PF1eFeature)=>void}) {
  const containerRef=useRef<HTMLDivElement>(null);
  const [results,setResults]=useState<PF1eFeatReference[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [focused,setFocused]=useState(false);

  useEffect(()=>{
    const dismiss=(event:PointerEvent)=>{
      if(!containerRef.current?.contains(event.target as Node)){setFocused(false);setResults([]);}
    };
    document.addEventListener('pointerdown',dismiss);
    return()=>document.removeEventListener('pointerdown',dismiss);
  },[]);

  useEffect(()=>{
    if(!focused||feat.name.trim().length<2||feat.itemName){setResults([]);return;}
    let active=true;
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError('');
      try { const matches=await api.searchPathfinder1eFeats(feat.name);if(active)setResults(matches); }
      catch { if(active){setResults([]);setError('Official search is unavailable. This can still be saved as a custom feat.');} }
      finally { if(active)setLoading(false); }
    },300);
    return()=>{active=false;window.clearTimeout(timer);};
  },[feat.itemName,feat.name,focused]);

  const choose=async(reference:PF1eFeatReference)=>{
    setLoading(true);setError('');setResults([]);
    setFocused(false);
    try {
      const detail=await api.getPathfinder1eFeat(reference.itemName);
      onChange({...feat,...detail,rulesSource:'Archives of Nethys'});
    } catch { setError('The official feat could not be imported. You can keep entering it manually.'); }
    finally { setLoading(false); }
  };

  return <div
    ref={containerRef}
    className="relative min-w-0 flex-1"
    onBlur={event=>{if(!containerRef.current?.contains(event.relatedTarget as Node|null)){setFocused(false);setResults([]);}}}
    onKeyDown={event=>{if(event.key==='Escape'){setFocused(false);setResults([]);(event.currentTarget.querySelector('input') as HTMLInputElement|null)?.blur();}}}
  >
    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
    <input aria-label="Feats name" value={feat.name} onFocus={()=>setFocused(true)} onChange={event=>onChange({...feat,name:event.target.value,itemName:undefined,sourceUrl:undefined,rulesSource:undefined})} placeholder="Search Archives of Nethys or enter a custom feat…" className={`${inputClass} pl-9 pr-9 font-semibold`} />
    {loading&&<Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-red-700" />}
    {results.length>0&&<div className="absolute z-30 mt-1 max-h-64 w-full min-w-[20rem] overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl">
      {results.map(result=><button key={result.itemName} type="button" onClick={()=>void choose(result)} className="block w-full rounded-md px-3 py-2 text-left font-semibold text-red-900 hover:bg-red-50">{result.name}</button>)}
    </div>}
    {error&&<div role="alert" className="mt-1 text-xs text-red-700">{error}</div>}
  </div>;
}

function FeatCard({feat,index,editable,onUpdate,onRemove}:{feat:PF1eFeature;index:number;editable:boolean;onUpdate:(feat:PF1eFeature)=>void;onRemove:()=>void}) {
  const [expanded,setExpanded]=useState(editable);
  return <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
    <div className="flex items-start gap-2">
      {editable?<FeatNameInput feat={feat} onChange={onUpdate}/>:<div className="min-w-0 flex-1 text-base font-bold text-stone-900">{feat.name}</div>}
      {editable&&<input aria-label="Feats type" value={feat.type??''} onChange={event=>onUpdate({...feat,type:event.target.value})} placeholder="Type" className={`${inputClass} max-w-28`} />}
      {editable&&<button type="button" aria-label={`Remove ${feat.name||'feat'}`} onClick={onRemove} className="mt-2 text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label={`${expanded?'Collapse':'Expand'} ${feat.name||`feat ${index+1}`}`} className="mt-1 rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"><ChevronDown className={`h-4 w-4 transition-transform ${expanded?'rotate-180':''}`}/></button>
    </div>
    {!expanded&&<div className="mt-2 text-xs text-stone-500">
      <div className="flex flex-wrap gap-2">{feat.type&&<span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-800">{feat.type}</span>}{feat.prerequisites&&<span><strong>Prerequisites:</strong> {feat.prerequisites}</span>}</div>
      <div className="mt-1 line-clamp-2 text-stone-600">{feat.benefit||feat.description||feat.special||'No rules summary recorded.'}</div>
    </div>}
    {expanded&&<>
      {(feat.sourceUrl||feat.source||feat.type)&&<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        {feat.type&&<span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-800">{feat.type}</span>}
        {feat.source&&<span>{feat.source}</span>}
        {feat.sourceUrl&&<a href={feat.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline">Archives of Nethys<ExternalLink className="h-3 w-3" /></a>}
      </div>}
      <div className="mt-3 space-y-2">
        <RuleField label="Description" value={feat.description} editable={editable} onChange={value=>onUpdate({...feat,description:value})}/>
        <RuleField label="Prerequisites" value={feat.prerequisites} editable={editable} onChange={value=>onUpdate({...feat,prerequisites:value})}/>
        <RuleField label="Benefit" value={feat.benefit} editable={editable} onChange={value=>onUpdate({...feat,benefit:value})}/>
        <RuleField label="Normal" value={feat.normal} editable={editable} onChange={value=>onUpdate({...feat,normal:value})}/>
        <RuleField label="Special" value={feat.special} editable={editable} onChange={value=>onUpdate({...feat,special:value})}/>
      </div>
    </>}
  </article>;
}

function RuleField({label,value,editable,onChange}:{label:string;value?:string;editable:boolean;onChange:(value:string)=>void}) {
  if(!editable&&!value)return null;
  return <div className="rounded-lg bg-stone-50 p-3">
    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500">{label}</div>
    {editable?<textarea aria-label={`Feat ${label}`} value={value??''} onChange={event=>onChange(event.target.value)} className={`${inputClass} min-h-20 resize-y`} />:<PF1eRulesText text={value!}/>} 
  </div>;
}

export default function PF1eFeatList({values,editable,onChange}:{values:PF1eFeature[];editable:boolean;onChange:(values:PF1eFeature[])=>void}) {
  const update=(index:number,next:PF1eFeature)=>onChange(values.map((feat,featIndex)=>featIndex===index?next:feat));
  return <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-2">
      {values.map((feat,index)=><FeatCard key={index} feat={feat} index={index} editable={editable} onUpdate={next=>update(index,next)} onRemove={()=>onChange(values.filter((_,featIndex)=>featIndex!==index))}/>)}
      {!values.length&&<div className="col-span-full rounded-xl border-2 border-dashed border-stone-200 py-8 text-center text-sm text-stone-500">No feats recorded yet.</div>}
    </div>
    {editable&&<button type="button" onClick={()=>onChange([...values,{name:''}])} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900">+ Feat</button>}
  </div>;
}

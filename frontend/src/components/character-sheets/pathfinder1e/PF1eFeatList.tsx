import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Search, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { PF1eFeatReference, PF1eFeature } from '../../../types/game-systems/pathfinder1e';
import PF1eRulesText from './PF1eRulesText';

const inputClass='w-full min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0';

function FeatNameInput({feat,onChange}:{feat:PF1eFeature;onChange:(feat:PF1eFeature)=>void}) {
  const [results,setResults]=useState<PF1eFeatReference[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(feat.name.trim().length<2||feat.itemName){setResults([]);return;}
    let active=true;
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError('');
      try { const matches=await api.searchPathfinder1eFeats(feat.name);if(active)setResults(matches); }
      catch { if(active){setResults([]);setError('Official search is unavailable. This can still be saved as a custom feat.');} }
      finally { if(active)setLoading(false); }
    },300);
    return()=>{active=false;window.clearTimeout(timer);};
  },[feat.itemName,feat.name]);

  const choose=async(reference:PF1eFeatReference)=>{
    setLoading(true);setError('');setResults([]);
    try {
      const detail=await api.getPathfinder1eFeat(reference.itemName);
      onChange({...feat,...detail,rulesSource:'Archives of Nethys'});
    } catch { setError('The official feat could not be imported. You can keep entering it manually.'); }
    finally { setLoading(false); }
  };

  return <div className="relative min-w-0 flex-1">
    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
    <input aria-label="Feats name" value={feat.name} onChange={event=>onChange({...feat,name:event.target.value,itemName:undefined,sourceUrl:undefined,rulesSource:undefined})} placeholder="Search Archives of Nethys or enter a custom feat…" className={`${inputClass} pl-9 pr-9 font-semibold`} />
    {loading&&<Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-red-700" />}
    {results.length>0&&<div className="absolute z-30 mt-1 max-h-64 w-full min-w-[20rem] overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl">
      {results.map(result=><button key={result.itemName} type="button" onClick={()=>void choose(result)} className="block w-full rounded-md px-3 py-2 text-left font-semibold text-red-900 hover:bg-red-50">{result.name}</button>)}
    </div>}
    {error&&<div role="alert" className="mt-1 text-xs text-red-700">{error}</div>}
  </div>;
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
      {values.map((feat,index)=><article key={index} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-2">
          {editable?<FeatNameInput feat={feat} onChange={next=>update(index,next)}/>:<div className="min-w-0 flex-1 text-base font-bold text-stone-900">{feat.name}</div>}
          {editable&&<input aria-label="Feats type" value={feat.type??''} onChange={event=>update(index,{...feat,type:event.target.value})} placeholder="Type" className={`${inputClass} max-w-28`} />}
          {editable&&<button type="button" aria-label={`Remove ${feat.name||'feat'}`} onClick={()=>onChange(values.filter((_,featIndex)=>featIndex!==index))} className="mt-2 text-stone-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
        </div>
        {(feat.sourceUrl||feat.source||feat.type)&&<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          {feat.type&&<span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-800">{feat.type}</span>}
          {feat.source&&<span>{feat.source}</span>}
          {feat.sourceUrl&&<a href={feat.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline">Archives of Nethys<ExternalLink className="h-3 w-3" /></a>}
        </div>}
        <div className="mt-3 space-y-2">
          <RuleField label="Description" value={feat.description} editable={editable} onChange={value=>update(index,{...feat,description:value})}/>
          <RuleField label="Prerequisites" value={feat.prerequisites} editable={editable} onChange={value=>update(index,{...feat,prerequisites:value})}/>
          <RuleField label="Benefit" value={feat.benefit} editable={editable} onChange={value=>update(index,{...feat,benefit:value})}/>
          <RuleField label="Normal" value={feat.normal} editable={editable} onChange={value=>update(index,{...feat,normal:value})}/>
          <RuleField label="Special" value={feat.special} editable={editable} onChange={value=>update(index,{...feat,special:value})}/>
        </div>
      </article>)}
      {!values.length&&<div className="col-span-full rounded-xl border-2 border-dashed border-stone-200 py-8 text-center text-sm text-stone-500">No feats recorded yet.</div>}
    </div>
    {editable&&<button type="button" onClick={()=>onChange([...values,{name:''}])} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900">+ Feat</button>}
  </div>;
}

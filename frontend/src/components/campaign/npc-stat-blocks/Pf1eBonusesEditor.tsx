import { Plus, Trash2 } from 'lucide-react';
import type { NpcStatBlock } from '@/types';

interface Props {
  statBlock:NpcStatBlock;
  onChange:(updated:NpcStatBlock)=>void;
}

const numberValue=(value:string):number=>Number.isFinite(Number(value))?Number(value):0;

/** PF1 monsters print final save and skill bonuses; they do not use 5e proficiency. */
export default function Pf1eBonusesEditor({statBlock,onChange}:Props) {
  const saves=statBlock.savingThrows??{};
  const skills=statBlock.skills??{};
  const updateSaves=(next:Record<string,number>)=>onChange({...statBlock,savingThrows:next,proficiencies:undefined});
  const updateSkills=(next:Record<string,number>)=>onChange({...statBlock,skills:next,proficiencies:undefined});
  const skillEntries=Object.entries(skills);

  return <div className="space-y-3 pl-1">
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase text-brand-ink">Saving throws</div>
      <div className="grid grid-cols-3 gap-2">{(['fort','reflex','will'] as const).map(save=><label key={save} className="text-[10px] capitalize text-ink-muted">{save}<input aria-label={`${save} save bonus`} type="number" value={saves[save]??0} onChange={event=>updateSaves({...saves,[save]:numberValue(event.target.value)})} className="input-cozy input-cozy-number mt-0.5 w-full text-center text-xs"/></label>)}</div>
    </div>
    <div>
      <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase text-brand-ink">Skills</span><button type="button" onClick={()=>{let name='new skill';let suffix=2;while(Object.hasOwn(skills,name))name=`new skill ${suffix++}`;updateSkills({...skills,[name]:0});}} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-brand-ink hover:bg-moss-green/10"><Plus className="h-3 w-3"/>Skill</button></div>
      <div className="space-y-1.5">{skillEntries.map(([name,bonus],index)=><div key={`${name}-${index}`} className="grid grid-cols-[1fr_5rem_auto] gap-2"><input aria-label={`Skill ${index+1} name`} value={name} onChange={event=>{const next={...skills};delete next[name];if(event.target.value.trim())next[event.target.value]=bonus;updateSkills(next);}} className="input-cozy text-xs"/><input aria-label={`${name} skill bonus`} type="number" value={bonus} onChange={event=>updateSkills({...skills,[name]:numberValue(event.target.value)})} className="input-cozy input-cozy-number text-center text-xs"/><button type="button" aria-label={`Remove ${name}`} onClick={()=>{const next={...skills};delete next[name];updateSkills(next);}} className="rounded p-1 text-ink-muted hover:bg-danger/10 hover:text-danger-ink"><Trash2 className="h-3.5 w-3.5"/></button></div>)}{!skillEntries.length&&<div className="rounded border border-dashed border-moss-green/20 py-2 text-center text-[10px] text-ink-muted">No listed skills.</div>}</div>
    </div>
  </div>;
}

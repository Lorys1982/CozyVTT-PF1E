import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import type {
  PF1eCharacterData,
  PF1eSpell,
  PF1eSpellReference,
} from '../../../types/game-systems/pathfinder1e';
import { PF1E_ABILITIES, numberOrUndefined, signed } from './pathfinder1eDefaults';
import PF1eRulesText from './PF1eRulesText';

interface Props {
  data:PF1eCharacterData;
  editable:boolean;
  onSet:(path:string,value:unknown)=>void;
}

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0';

function SpellSearchInput({spell,editable,onChange}:{spell:PF1eSpell;editable:boolean;onChange:(spell:PF1eSpell)=>void}) {
  const [results,setResults] = useState<PF1eSpellReference[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  useEffect(() => {
    if (!editable || spell.name.trim().length < 2 || spell.itemName) {
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
  },[editable,spell.itemName,spell.name]);

  const choose = async (reference:PF1eSpellReference) => {
    setLoading(true);
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
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        <input
          aria-label="Spell name"
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

function SpellCard({spell,editable,onChange,onRemove}:{spell:PF1eSpell;editable:boolean;onChange:(spell:PF1eSpell)=>void;onRemove:()=>void}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><SpellSearchInput spell={spell} editable={editable} onChange={onChange} /></div>
        {editable && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${spell.name || 'spell'}`} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {editable && <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">School</span><input value={spell.school ?? ''} onChange={event=>onChange({...spell,school:event.target.value})} className={`${inputClass} mt-1 min-h-10`} /></label>}
        <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">Prepared</span><input disabled={!editable} type="number" min="0" value={spell.prepared ?? ''} onChange={event=>onChange({...spell,prepared:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 min-h-10`} /></label>
        <label className="flex h-full flex-col text-xs font-semibold text-stone-600"><span className="flex min-h-5 items-end">Cast</span><input disabled={!editable} type="number" min="0" value={spell.cast ?? ''} onChange={event=>onChange({...spell,cast:numberOrUndefined(event.target.value)})} className={`${inputClass} mt-1 min-h-10`} /></label>
        <label className="flex items-center gap-2 self-end rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700"><input disabled={!editable} type="checkbox" checked={!!spell.atWill} onChange={event=>onChange({...spell,atWill:event.target.checked})} />At will</label>
      </div>

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
    </article>
  );
}

export default function PF1eSpellbook({data,editable,onSet}:Props) {
  const [level,setLevel] = useState(() => data.spells?.findIndex(entry => entry.slotted?.length) ?? 0);
  const activeLevel = level < 0 ? 0 : level;
  const isSpellLike=activeLevel===10;
  const spellLevel = data.spells?.[activeLevel] ?? {slotted:[]};
  const spells = isSpellLike ? data.spellLikes??[] : spellLevel.slotted ?? [];
  const castingMod = data.spellcastingAbility
    ? Math.floor((((data.abilities?.[data.spellcastingAbility]?.tempScore ?? data.abilities?.[data.spellcastingAbility]?.score) ?? 10)-10)/2)
    : 0;

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
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-stone-700">Casting ability
            <select disabled={!editable} value={data.spellcastingAbility ?? ''} onChange={event=>onSet('spellcastingAbility',event.target.value || undefined)} className={`${inputClass} mt-1`}>
              <option value="">None</option>{PF1E_ABILITIES.map(ability=><option key={ability.key} value={ability.key}>{ability.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-stone-700">Caster level<input disabled={!editable} type="number" min="0" value={data.casterLevel ?? ''} onChange={event=>onSet('casterLevel',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration misc<input disabled={!editable} type="number" value={data.concentrationMiscModifier ?? ''} onChange={event=>onSet('concentrationMiscModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration temporary<input disabled={!editable} type="number" value={data.concentrationTempModifier ?? ''} onChange={event=>onSet('concentrationTempModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Concentration override<input disabled={!editable} type="number" placeholder="Automatic" value={data.concentrationOverride ?? ''} onChange={event=>onSet('concentrationOverride',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <div className="rounded-lg bg-purple-800 p-3 text-white"><div className="text-xs font-semibold uppercase tracking-wide text-purple-200">Concentration</div><div className="mt-1 text-3xl font-black">{signed(data.concentrationTotal ?? 0)}</div></div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-stone-700">Spell DC modifier<input disabled={!editable} type="number" value={data.spellDcMiscModifier ?? ''} onChange={event=>onSet('spellDcMiscModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Spell DC temporary<input disabled={!editable} type="number" value={data.spellDcTempModifier ?? ''} onChange={event=>onSet('spellDcTempModifier',numberOrUndefined(event.target.value))} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-stone-700">Conditional modifiers<input disabled={!editable} value={data.spellsConditionalModifiers ?? ''} onChange={event=>onSet('spellsConditionalModifiers',event.target.value)} className={`${inputClass} mt-1`} /></label>
        </div>
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
          <label className="rounded-lg bg-white p-3 text-xs font-semibold uppercase text-stone-500">DC override<input disabled={!editable} type="number" placeholder="Automatic" value={spellLevel.dcOverride ?? ''} onChange={event=>{const next=[...(data.spells??[])];next[activeLevel]={...spellLevel,dcOverride:numberOrUndefined(event.target.value)};onSet('spells',next)}} className={`${inputClass} mt-1 text-base normal-case`} /></label>
          <label className="rounded-lg bg-white p-3 text-xs font-semibold uppercase text-stone-500">Spells per day<input disabled={!editable} type="number" min="0" value={spellLevel.totalPerDay ?? ''} onChange={event=>{const next=[...(data.spells??[])];next[activeLevel]={...spellLevel,totalPerDay:numberOrUndefined(event.target.value)};onSet('spells',next)}} className={`${inputClass} mt-1 text-base normal-case`} /></label>
          <div className="rounded-lg bg-white p-3"><div className="text-xs uppercase text-stone-500">Bonus spells</div><div className="text-2xl font-black text-purple-800">{spellLevel.bonusSpells ?? 0}</div></div>
        </div>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800">{isSpellLike?'Spell-like abilities':activeLevel===0?'Cantrips & orisons':`Level ${activeLevel} spells`}</h3>
          {editable && <button type="button" onClick={()=>updateSpells([...spells,{name:''}])} className="inline-flex items-center gap-2 rounded-lg bg-purple-800 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-900"><Plus className="h-4 w-4" />Add spell</button>}
        </div>
        {spells.length ? spells.map((spell,index)=><SpellCard key={`${activeLevel}-${index}`} spell={spell} editable={editable} onChange={next=>updateSpells(spells.map((item,itemIndex)=>itemIndex===index?next:item))} onRemove={()=>updateSpells(spells.filter((_,itemIndex)=>itemIndex!==index))} />) : <div className="rounded-xl border-2 border-dashed border-stone-200 py-10 text-center text-sm text-stone-500">No spells at this level.</div>}
      </section>
    </div>
  );
}

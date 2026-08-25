import type { ReactNode } from 'react';

function inlineEmphasis(text:string):ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part,index)=>
    part.startsWith('**')&&part.endsWith('**')
      ? <strong key={index} className="font-semibold text-stone-800">{part.slice(2,-2)}</strong>
      : part,
  );
}

/** Render the small, inert text format produced by the AoN backend parser. */
export default function PF1eRulesText({text}:{text:string}) {
  const lines=text.split('\n');
  return <div className="space-y-2 text-sm leading-relaxed text-stone-700">
    {lines.map((line,index)=>{
      const clean=line.trim();
      if(!clean) return <div key={index} className="h-1" aria-hidden="true" />;
      if(clean.startsWith('## ')) return <h4 key={index} className="pt-1 font-serif text-base font-bold text-red-950">{clean.slice(3)}</h4>;
      if(clean.startsWith('- ')) return <div key={index} className="flex gap-2 pl-2"><span aria-hidden="true" className="text-red-800">•</span><span>{inlineEmphasis(clean.slice(2))}</span></div>;
      return <p key={index}>{inlineEmphasis(clean)}</p>;
    })}
  </div>;
}

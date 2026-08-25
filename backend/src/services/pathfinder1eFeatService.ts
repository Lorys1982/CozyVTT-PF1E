const AON_BASE_URL = 'https://www.aonprd.com';

export interface AonFeatSummary {
  name: string;
  itemName: string;
  sourceUrl: string;
}

export interface AonFeatDetail extends AonFeatSummary {
  type?: string;
  source?: string;
  description?: string;
  prerequisites?: string;
  benefit?: string;
  normal?: string;
  special?: string;
}

const entities: Record<string,string> = {
  amp: '&', apos: "'", '#39': "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
  ndash: '–', mdash: '—', minus: '−', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodeHtml(value:string):string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(match,entity:string) => {
    if (entities[entity]) return entities[entity];
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2),16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1),10));
    return match;
  });
}

function decodeItemName(value:string):string {
  const decoded=decodeHtml(value).replace(/\+/g,' ');
  try { return decodeURIComponent(decoded); } catch { return decoded; }
}

function plainText(value:string):string {
  return decodeHtml(value.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' '))
    .replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
}

function field(html:string,label:string):string|undefined {
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(label==='Source'){
    const source=html.match(new RegExp(`<b>${escaped}:?<\\/b>\\s*([\\s\\S]*?)(?=<br\\s*\\/?>|$)`,'i'))?.[1];
    return source?plainText(source).replace(/^:\s*/,''):undefined;
  }
  const next='Prerequisites?|Benefit|Normal|Special';
  const value=html.match(new RegExp(`<b>${escaped}:?<\\/b>\\s*([\\s\\S]*?)(?=<br\\s*\\/?>\\s*<b>(?:${next}):?<\\/b>|<h[1-6]|$)`,'i'))?.[1];
  return value ? plainText(value).replace(/^:\s*/,'').replace(/;\s*$/,'') : undefined;
}

async function fetchHtml(url:string):Promise<string> {
  const response=await fetch(url,{
    headers:{'User-Agent':'CozyVTT/1.2 (self-hosted VTT; PF1e rules lookup)','Accept':'text/html'},
    signal:AbortSignal.timeout(15_000),
  });
  if(!response.ok) throw new Error(`Archives of Nethys returned ${response.status} ${response.statusText}`);
  return response.text();
}

export function parseAonFeatSearch(html:string):AonFeatSummary[] {
  const results=new Map<string,AonFeatSummary>();
  const pattern=/href="(?:\/)?FeatDisplay\.aspx\?ItemName=([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match:RegExpExecArray|null;
  while((match=pattern.exec(html))!==null){
    const itemName=decodeItemName(match[1]).trim();
    const name=plainText(match[2]).replace(/\s*\*+$/,'').replace(/\s+\(Feats\)$/i,'').trim();
    if(!name||results.has(itemName)) continue;
    results.set(itemName,{name,itemName,sourceUrl:`${AON_BASE_URL}/FeatDisplay.aspx?ItemName=${encodeURIComponent(itemName)}`});
  }
  return [...results.values()];
}

export function parseAonFeatPage(html:string,fallback:AonFeatSummary):AonFeatDetail {
  const content=[...html.matchAll(/<span id="MainContent_DataListTypes_LabelName_\d+">([\s\S]*?)<\/span>/gi)]
    .map(match=>match[1]).find(value => /<h1[^>]*class="title"/i.test(value));
  if(!content) throw new Error(`Archives of Nethys did not return a feat page for ${fallback.itemName}`);
  const title=plainText(content.match(/<h1[^>]*class="title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??fallback.name);
  const titleParts=title.match(/^(.*?)\s+\(([^)]+)\)$/);
  const name=titleParts?.[1]??title;
  const firstRulesField=content.search(/<b>(?:Prerequisites?|Benefit|Normal|Special):?<\/b>/i);
  const beforeRules=firstRulesField>=0?content.slice(0,firstRulesField):content;
  const afterSource=beforeRules.replace(/[\s\S]*?<b>Source<\/b>[\s\S]*?<br\s*\/?>/i,'');
  const description=plainText(afterSource);
  return {
    ...fallback,
    name,
    type:titleParts?.[2],
    source:field(content,'Source'),
    description:description||undefined,
    prerequisites:field(content,'Prerequisites')??field(content,'Prerequisite'),
    benefit:field(content,'Benefit'),
    normal:field(content,'Normal'),
    special:field(content,'Special'),
  };
}

const searchPromises=new Map<string,Promise<AonFeatSummary[]>>();
const detailPromises=new Map<string,Promise<AonFeatDetail>>();

export async function searchAonFeats(query:string,limit=20):Promise<AonFeatSummary[]> {
  const clean=query.trim();
  if(clean.length<2) return [];
  const key=clean.toLocaleLowerCase();
  let pending=searchPromises.get(key);
  if(!pending){
    const url=`${AON_BASE_URL}/Search.aspx?Query=${encodeURIComponent(clean)}`;
    pending=fetchHtml(url).then(parseAonFeatSearch).then(results=>results
      .sort((a,b)=>Number(!a.name.toLocaleLowerCase().startsWith(key))-Number(!b.name.toLocaleLowerCase().startsWith(key))||a.name.localeCompare(b.name))
      .slice(0,Math.min(Math.max(limit,1),50)));
    searchPromises.set(key,pending);
    pending.catch(()=>searchPromises.delete(key));
  }
  return pending;
}

export async function getAonFeat(itemName:string):Promise<AonFeatDetail> {
  const clean=itemName.trim();
  if(!clean||clean.length>200) throw new Error('Invalid Archives of Nethys feat name');
  const cached=detailPromises.get(clean);
  if(cached) return cached;
  const fallback={name:clean,itemName:clean,sourceUrl:`${AON_BASE_URL}/FeatDisplay.aspx?ItemName=${encodeURIComponent(clean)}`};
  const pending=fetchHtml(fallback.sourceUrl).then(html=>parseAonFeatPage(html,fallback));
  detailPromises.set(clean,pending);
  pending.catch(()=>detailPromises.delete(clean));
  return pending;
}

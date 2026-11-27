// One-off probe: what does each resort's snow report page expose to a plain fetch?
import fs from 'node:fs';
const URLS={
 snowbasin:['https://www.snowbasin.com/the-mountain/mountain-report/'],
 snowbird:['https://www.snowbird.com/the-mountain/mountain-report/current-conditions-weather/'],
 alta:['https://www.alta.com/weather'],
 brighton:['https://www.brightonresort.com/conditions'],
 solitude:['https://www.solitudemountain.com/mountain-and-village/conditions-and-maps'],
 deervalley:['https://www.deervalley.com/explore-the-mountain/mountain-report'],
 jackson:['https://www.jacksonhole.com/snow-report','https://www.jacksonhole.com/mountain-report']};
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; hourly; github.com/danroach02/Snow-Desk)';
const out={};
for(const [id,urls] of Object.entries(URLS)){out[id]=[];
 for(const url of urls){const o={url};
  try{const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(20000)});
   o.status=r.status;o.final=r.url;const t=await r.text();o.len=t.length;
   o.endpoints=[...new Set((t.match(/https?:\/\/[^"'\s<>\\]*(?:mtnpowder|api|feed|json|conditions|snow)[^"'\s<>\\]*/gi)||[]))].slice(0,40);
   const text=t.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
   o.snips=[];for(const m of text.matchAll(/(24[ -]?h(?:ou)?rs?|overnight|48[ -]?h|base depth|season total|settled base|storm total)/gi)){o.snips.push(text.slice(Math.max(0,m.index-90),m.index+110));if(o.snips.length>=8)break}
   o.json=[];for(const m of t.matchAll(/(?:"|\b)(?:snow24|last24|twentyFour|newSnow|overnight|snowfall|baseDepth|base_depth|snowDepth|SnowReport|snowReport)[A-Za-z_]*"?\s*[:=]/g)){o.json.push(t.slice(Math.max(0,m.index-120),m.index+260).replace(/\s+/g,' '));if(o.json.length>=6)break}
  }catch(e){o.error=String(e)}
  out[id].push(o)}}
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));console.log('probed');

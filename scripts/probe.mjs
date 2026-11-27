import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; github.com/danroach02/Snow-Desk)';
const get=async(u,a='text/html')=>fetch(u,{headers:{'User-Agent':UA,'Accept':a},signal:AbortSignal.timeout(20000),redirect:'follow'});
const out={urls:{}};
for(const u of ['https://cottonwoodcanyons.udot.utah.gov','https://www.brightonresort.com/mountain-cams-weather','https://www.brightonresort.com/web-cams','https://www.brightonresort.com/cams','https://www.brightonresort.com/conditions#webcams','https://api.snowbird.com/api/v1/dor/agent-friendly/lifts','https://api.snowbird.com/api/v1/dor/agent-friendly/lift-status','https://api.snowbird.com/api/v1/dor/agent-friendly','https://api.snowbird.com/api/v1/dor/agent-friendly/lifts-and-trails']){try{const r=await get(u,'*/*');const t=await r.text();out.urls[u]=[r.status,t.slice(0,500).replace(/\s+/g,' ')]}catch(e){out.urls[u]=String(e)}}
try{const t=await (await get('https://www.brightonresort.com/conditions')).text();out.brightonCams=[...new Set([...t.matchAll(/"(\/[a-z0-9\-\/]*(?:cam)[a-z0-9\-\/]*)"/gi)].map(m=>m[1]))].slice(0,15)}catch(e){}
try{const t=await (await get('https://www.alta.com/weather')).text();out.alta=[...t.matchAll(/"lifts":|"open_lifts"|lifts_open|"lift_status"|"status":"(?:open|closed)/gi)].slice(0,6).map(m=>t.slice(Math.max(0,m.index-200),m.index+400).replace(/\s+/g,' '))}catch(e){out.alta=String(e)}
try{const t=await (await get('https://www.alta.com/lift-terrain-status')).text();out.alta2=[t.length,...[...t.matchAll(/"lifts":\[/g)].slice(0,2).map(m=>t.slice(m.index,m.index+700))]}catch(e){out.alta2=String(e)}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));

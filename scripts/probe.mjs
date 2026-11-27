import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; github.com/danroach02/Snow-Desk)';
const get=async u=>{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept':'application/json,text/html'},signal:AbortSignal.timeout(20000)});return {s:r.status,t:await r.text()}};
const out={};
for(const u of ['https://www.brightonresort.com/api/reportpal?resortName=brighton&useReportPal=true','https://www.brightonresort.com/api/reportpal?resortName=Brighton&useReportPal=true','https://www.brightonresort.com/api/reportpal?resortName=brighton&useReportPal=false']){
 try{const r=await get(u);out[u]={s:r.s,len:r.t.length,head:r.t.slice(0,1500),snow:[...r.t.matchAll(/snow|base/gi)].slice(0,6).map(m=>r.t.slice(Math.max(0,m.index-150),m.index+450))}}catch(e){out[u]=String(e)}}
try{const page='https://www.jacksonhole.com/mountain-report',html=(await get(page)).t,o=out.jackson={ctx:[]};
 const srcs=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>new URL(m[1],page).href).filter(u=>u.includes('jacksonhole.com'));
 for(const s of [page,...srcs]){const t=s===page?html:(await get(s)).t;
  for(const m of t.matchAll(/zaneray|snow-report|snowReport|snow_report|mountain-report\/|\/api\/as\/v1\//g)){if(o.ctx.length<24)o.ctx.push(t.slice(Math.max(0,m.index-220),m.index+320).replace(/\s+/g,' '))}}
}catch(e){out.jackson=String(e)}
for(const u of ['https://jacksonhole-prod.zaneray.com/api','https://jacksonhole-prod.zaneray.com/api/snow-report','https://jacksonhole-prod.zaneray.com/api/all.json','https://jacksonhole-prod.zaneray.com/api/snowreport']){try{const r=await get(u);out[u]={s:r.s,head:r.t.slice(0,700)}}catch(e){out[u]=String(e)}}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));

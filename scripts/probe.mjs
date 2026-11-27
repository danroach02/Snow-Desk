import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; github.com/danroach02/Snow-Desk)';
const get=async u=>{const r=await fetch(u,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(20000)});return r.text()};
const out={};
for(const [id,page] of [['brighton','https://www.brightonresort.com/conditions'],['jackson','https://www.jacksonhole.com/mountain-report']]){
 const o=out[id]={urls:new Set(),hits:[]};
 try{const html=await get(page),base=new URL(page);
  const srcs=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>new URL(m[1],base).href).filter(u=>u.includes(base.hostname)||u.includes('_next')||u.includes('_nuxt')).slice(0,60);
  o.nsrc=srcs.length;const bodies=[html];
  for(const s of srcs){try{bodies.push(await get(s))}catch(e){}}
  for(const t of bodies){
   for(const m of t.matchAll(/https?:\/\/[A-Za-z0-9.\-]+\/[^"'`\s<>\\)]{0,120}/g)){const u=m[0];if(/snow|report|condition|weather|feed|api|lift|mtn|mountain|graphql|json/i.test(u)&&!/\.(png|jpg|jpeg|webp|svg|css|woff2?)(\?|$)/i.test(u)&&!/datocms-assets|sanity\.io\/images|facebook|twitter|instagram|youtube|soundcloud|schema\.org|w3\.org|google/i.test(u))o.urls.add(u.slice(0,200))}
   for(const m of t.matchAll(/["'`](\/api\/[^"'`\s]{2,100})["'`]/g))o.urls.add('REL '+m[1]);
   for(const m of t.matchAll(/snowOverNight|snow24Hours|sinceSixAm|overnightSnow|snowDepth/g)){if(o.hits.length<10)o.hits.push(t.slice(Math.max(0,m.index-260),m.index+300).replace(/\s+/g,' '))}
  }}catch(e){o.error=String(e)}
 o.urls=[...o.urls].slice(0,120)}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));

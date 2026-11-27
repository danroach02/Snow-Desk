import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; hourly; github.com/danroach02/Snow-Desk)';
const get=async(url,accept='text/html')=>{const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':accept},signal:AbortSignal.timeout(20000)});return {status:r.status,text:await r.text()}};
const ctx=(t,re,n=6,b=200,a=500)=>{const o=[];for(const m of t.matchAll(re)){o.push(t.slice(Math.max(0,m.index-b),m.index+a).replace(/\s+/g,' '));if(o.length>=n)break}return o};
const out={};
try{const r=await get('https://api.snowbird.com/api/v1/dor/agent-friendly/snow-reports','application/json');out.snowbirdApi={status:r.status,body:r.text.slice(0,3000)}}catch(e){out.snowbirdApi=String(e)}
for(const [id,url] of [['solitude','https://www.solitudemountain.com/mountain-and-village/conditions-and-maps'],['deervalley','https://www.deervalley.com/explore-the-mountain/mountain-report']]){
 try{const r=await get(url);out[id]={mtn:ctx(r.text,/mtnfeed|mtnpowder|resortId|data-resort/gi,6,300,500)}}catch(e){out[id]=String(e)}}
try{const r=await get('https://www.brightonresort.com/conditions');const t=r.text;
 out.brighton={scripts:[...t.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).slice(0,40),snow:ctx(t,/snowfall|new snow|base depth|24 ?hr|"snow/gi,8,150,350),iframes:[...t.matchAll(/<iframe[^>]*src="([^"]+)"/g)].map(m=>m[1])}}catch(e){out.brighton=String(e)}
try{const r=await get('https://www.jacksonhole.com/mountain-report');const t=r.text;
 out.jackson={raw:ctx(t,/OVERNIGHT|overnight|sinceSix|since6|snowDepth|fortyEight/g,6,300,700),next:t.includes('__NEXT_DATA__'),nuxt:t.includes('__NUXT__'),apis:[...new Set(t.match(/https?:\/\/[^"'\s<>\\]*(?:api|graphql|feed)[^"'\s<>\\]*/gi)||[])].slice(0,20)}}catch(e){out.jackson=String(e)}
for(const u of ['https://mtnpowder.com/feed?resortId=65','https://mtnpowder.com/feed?resortId=13','https://www.mtnpowder.com/feed/v3.json?resortId[]=65']){try{const r=await get(u,'application/json');out[u]={status:r.status,body:r.text.slice(0,600)}}catch(e){out[u]=String(e)}}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));console.log('probed');

import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; github.com/danroach02/Snow-Desk)';
const j=async u=>(await fetch(u,{headers:{'User-Agent':UA,'Accept':'application/json'},signal:AbortSignal.timeout(20000)})).json();
const out={};
try{const a=await j('https://jacksonhole-prod.zaneray.com/api/all.json');const s={...a.snow};delete s.detail;out.jackson={keys:Object.keys(a),snow:JSON.stringify(s).slice(0,5000)}}catch(e){out.jackson=String(e)}
try{const b=await j('https://www.brightonresort.com/api/reportpal?resortName=brighton&useReportPal=true');out.brighton={updated:b.updated,loc:JSON.stringify(b.currentConditions.resortLocations.location[0]).slice(0,2500)}}catch(e){out.brighton=String(e)}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));

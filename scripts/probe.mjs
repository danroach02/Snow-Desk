import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; github.com/danroach02/Snow-Desk)';
const out={names:{}};
for(let id=1;id<=100;id++){try{const r=await fetch('https://mtnpowder.com/feed?resortId='+id,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(15000)});if(r.status===200){const j=await r.json();out.names[id]=j.Name;if(id===65)out.solitude=j.SnowReport}}catch(e){}await new Promise(r=>setTimeout(r,150))}
fs.writeFileSync('data/probe.json',JSON.stringify(out,null,1));

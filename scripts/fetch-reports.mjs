// Hourly job: read each resort's published snow report, save data/reports.json,
// and keep a forecast-vs-actual log in data/accuracy.json. Personal use; one request per resort per hour.
import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; hourly; github.com/danroach02/Snow-Desk)';
const TZ='America/Denver';
// feed = id in the mountain-report feed these resorts publish through (the one behind their own report pages)
export const RESORTS=[
 {id:'snowbasin',lat:41.1957,lon:-111.8701,elev:8297,page:'https://www.snowbasin.com/the-mountain/mountain-report/'},
 {id:'snowbird',lat:40.5810,lon:-111.6570,elev:9200,feed:64},
 {id:'alta',lat:40.57607,lon:-111.63889,elev:9662,feed:63},
 {id:'brighton',lat:40.5980,lon:-111.5832,elev:9500,feed:66},
 {id:'solitude',lat:40.6199,lon:-111.5919,elev:9200,feed:65},
 {id:'deervalley',lat:40.611,lon:-111.4999,elev:8888,feed:49},
 {id:'jackson',lat:43.5915,lon:-110.8745,elev:9634,feed:67}];
const num=v=>{const n=parseFloat(String(v??'').replace(/[^\d.\-]/g,''));return Number.isFinite(n)?n:null};
const mtDate=(d=new Date())=>d.toLocaleDateString('en-CA',{timeZone:TZ});
const mtHour=(d=new Date())=>+d.toLocaleString('en-US',{hour:'numeric',hour12:false,timeZone:TZ})%24;
const get=async(url,accept)=>{const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':accept},signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('HTTP '+r.status);return r};

export function parseFeed(j){
 const s=j.SnowReport||{},areas=[s.MidMountainArea,s.SummitArea,s.BaseArea].filter(a=>a&&num(a.Last24HoursIn)!=null),a=areas[0]||{};
 return {overnight:num(a.SinceLiftsClosedIn),h24:num(a.Last24HoursIn),h48:num(a.Last48HoursIn),h72:num(a.Last72HoursIn),d7:num(a.Last7DaysIn),
  base:num(a.BaseIn)??num(s.SnowBaseRangeIn),season:num(s.SeasonTotalIn),where:a.Name&&a.Name!=='--'?a.Name:null,
  lifts:s.TotalOpenLifts!=null?`${s.TotalOpenLifts}/${s.TotalLifts}`:null,trails:s.TotalOpenTrails!=null?`${s.TotalOpenTrails}/${s.TotalTrails}`:null,
  status:j.OperatingStatus||null,updated:s.LastUpdate||j.LastUpdate||null};
}
export function parseSnowbasin(html){
 const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&#8221;|&rdquo;|”/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const i=t.indexOf('Snow Report Since 5am'),seg=i>=0?t.slice(Math.max(0,i-80),i+260):t;
 const f=re=>{const m=seg.match(re);return m?num(m[1]):null};
 const up=seg.match(/Last Updated:\s*([A-Za-z]{3} \d{1,2}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);let updated=null;
 if(up){const y=new Date().getFullYear(),d=new Date(`${up[1]} ${y} ${up[2]}:${up[3]} ${up[4]} GMT-0700`);if(!isNaN(d))updated=d.toISOString()}
 return {overnight:f(/Overnight\s*([\d.]+)"/i),h24:f(/24 hours\s*([\d.]+)"/i),since5:f(/Since 5am\s*([\d.]+)"/i),d7:f(/7 days\s*([\d.]+)"/i),base:f(/Base\s*([\d.]+)"/i),season:f(/Season\s*([\d.]+)"/i),updated};
}
// same temperature table the app uses for snow-to-liquid ratio
const slr=t=>t>34?0:t>32.5?7:t>29?10:t>25?12.5:t>18?15:t>8?17:15;
async function forecastOvernight(r,date){ // snow from 4 pm the day before to 9 am on `date`
 const u=`https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&elevation=${Math.round(r.elev*0.3048)}&hourly=precipitation,temperature_2m&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(TZ)}&forecast_days=3`;
 const j=await (await get(u,'application/json')).json(),H=j.hourly,prev=mtDate(new Date(new Date(date+'T12:00:00Z').getTime()-864e5));let s=0;
 H.time.forEach((t,i)=>{if(t>=prev+'T16:00'&&t<date+'T09:00')s+=(H.precipitation[i]||0)*slr(H.temperature_2m[i])});return Math.round(s*10)/10;
}
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};

async function main(){
 fs.mkdirSync('data',{recursive:true});
 const old=read('data/reports.json',{resorts:{}}),resorts={};
 for(const r of RESORTS){
  try{const rep=r.feed?parseFeed(await (await get('https://mtnpowder.com/feed?resortId='+r.feed,'application/json')).json()):parseSnowbasin(await (await get(r.page,'text/html')).text());
   if(rep.h24==null&&rep.overnight==null&&rep.base==null)throw new Error('no snow numbers found in the report');
   resorts[r.id]={...rep,ok:true}}
  catch(e){const prev={...(old.resorts[r.id]||{})};delete prev.error;resorts[r.id]={...prev,ok:false,error:String(e.message||e)};console.log(r.id,'failed:',e.message)}
 }
 if(JSON.stringify(resorts)!==JSON.stringify(old.resorts))fs.writeFileSync('data/reports.json',JSON.stringify({at:new Date().toISOString(),resorts},null,1));

 // forecast-vs-actual log: forecast saved mid-afternoon for the next morning, report read the next morning
 const acc=read('data/accuracy.json',{pending:{},rows:[]}),h=mtHour(),today=mtDate(),tomorrow=mtDate(new Date(Date.now()+864e5));let changed=!fs.existsSync('data/accuracy.json');
 if(h>=14&&!acc.pending[tomorrow]){const p={};for(const r of RESORTS){try{p[r.id]=await forecastOvernight(r,tomorrow)}catch(e){}}if(Object.keys(p).length){acc.pending[tomorrow]=p;changed=true}}
 if(h>=8&&h<=11&&acc.pending[today]){
  for(const r of RESORTS){const rep=resorts[r.id],fc=acc.pending[today][r.id];if(fc==null||!rep||!rep.ok||rep.overnight==null||!rep.updated)continue;
   if(mtDate(new Date(rep.updated))!==today)continue; // only count a report written this morning
   const row={date:today,id:r.id,forecast:fc,reported:rep.overnight},i=acc.rows.findIndex(x=>x.date===today&&x.id===r.id);
   if(i<0){acc.rows.push(row);changed=true}else if(acc.rows[i].reported!==row.reported){acc.rows[i]=row;changed=true}}
 }
 for(const d of Object.keys(acc.pending))if(d<today){delete acc.pending[d];changed=true}
 if(acc.rows.length>1500){acc.rows=acc.rows.slice(-1500);changed=true}
 if(changed)fs.writeFileSync('data/accuracy.json',JSON.stringify(acc));
 console.log(JSON.stringify(resorts,null,1));
}
if(process.argv[1]&&process.argv[1].endsWith('fetch-reports.mjs'))main();

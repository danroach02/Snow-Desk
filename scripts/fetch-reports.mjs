// Hourly job: read each resort's published snow report, save data/reports.json,
// and keep a forecast-vs-actual log in data/accuracy.json. Personal use; one request per resort per hour.
import fs from 'node:fs';
const UA='Mozilla/5.0 (compatible; SnowDesk personal dashboard; hourly; github.com/danroach02/Snow-Desk)';
const TZ='America/Denver';
// feed = id in the mountain-report feed these resorts publish through (the one behind their own report pages)
export const RESORTS=[
 {id:'snowbasin',lat:41.1957,lon:-111.8701,elev:8297,page:'https://www.snowbasin.com/the-mountain/mountain-report/'},
 {id:'snowbird',lat:40.5810,lon:-111.6570,elev:9200,page:'https://api.snowbird.com/api/v1/dor/agent-friendly/snow-reports',accept:'text/plain'},
 {id:'alta',lat:40.57607,lon:-111.63889,elev:9662,page:'https://www.alta.com/weather'},
 {id:'brighton',lat:40.5980,lon:-111.5832,elev:9500,page:'https://www.brightonresort.com/api/reportpal?resortName=brighton&useReportPal=true',accept:'application/json',feed:66},
 {id:'solitude',lat:40.6199,lon:-111.5919,elev:9200,feed:65},
 {id:'deervalley',lat:40.611,lon:-111.4999,elev:8888,feed:49},
 {id:'jackson',lat:43.5915,lon:-110.8745,elev:9634,page:'https://jacksonhole-prod.zaneray.com/api/all.json',accept:'application/json',feed:67}];
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
const text=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&#8221;|&rdquo;|”/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
// Mountain-time "YYYY-MM-DD HH:MM[:SS]" -> ISO (standard time in winter)
const mtIso=s=>{const m=String(s||'').match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);if(!m)return null;const d=new Date(`${m[1]}T${m[2]}:00-07:00`);return isNaN(d)?null:d.toISOString()};
export function parseSnowbird(t){ // Snowbird's plain-text report for automated readers
 const f=re=>{const m=t.match(re);return m?num(m[1]):null};
 return {overnight:f(/Overnight snow amount:\s*([\d.]+)/i),h24:f(/24 Hour Total:\s*([\d.]+)/i),h48:f(/48 Hour Total:\s*([\d.]+)/i),h72:f(/72 Hour Total:\s*([\d.]+)/i),d7:f(/7 Day Total:\s*([\d.]+)/i),
  base:f(/Base Depth:\s*([\d.]+)/i),season:f(/Season Total:\s*([\d.]+)/i),updated:mtIso((t.match(/Published Date:\s*([\d\- :]+)/i)||[])[1])};
}
export function parseAlta(html){ // conditions object embedded in alta.com/weather
 const i=html.indexOf('"conditions":{'),seg=i>=0?html.slice(i,i+900):'',f=k=>{const m=seg.match(new RegExp('"'+k+'":"?([\\d.]+)'));return m?num(m[1]):null};
 return {overnight:f('last12'),h24:f('last24'),base:f('base_depth'),storm:f('storm_total'),season:f('year_to_date'),where:'12-hour total at the study plot',updated:mtIso((seg.match(/"dated_at":"([^"]+)"/)||[])[1])};
}
export function parseJackson(html){ // summit and mid-mountain columns; mid-mountain used
 const t=text(html),two=l=>{const m=t.match(new RegExp(l+'\\s*([\\d.]+)"\\s*([\\d.]+)"','i'));return m?[num(m[1]),num(m[2])]:[null,null]};
 const on=two('OVERNIGHT'),h48=two('48 HOURS'),dp=two('SNOW DEPTH'),s6=(t.match(/SINCE 6AM\s*([\d.]+)"/i)||[])[1];
 const up=t.match(/Updated\s*:?\s*([A-Za-z]{3,9}\.? \d{1,2},? ?\d{0,4},?\s*(?:at\s*)?\d{1,2}:\d{2}\s*[AP]M)/i);let updated=null;
 if(up){const d=new Date(up[1].replace(/\bat\b/i,'').replace(/(\d{1,2}:\d{2})\s*([AP]M)/i,' $1 $2')+(/\d{4}/.test(up[1])?'':' '+new Date().getFullYear())+' GMT-0700');if(!isNaN(d))updated=d.toISOString()}
 if(!dp[1]&&!dp[0]&&!updated)return {}; // all zeros with no depth and no timestamp = the page's empty placeholders, not a report
 return {overnight:on[1],summitOvernight:on[0],since6:num(s6),h48:h48[1],base:dp[1],where:'Mid mountain',updated};
}
export function parseBrighton(body){ // JSON behind brightonresort.com/conditions
 const j=JSON.parse(body),l=(((j.currentConditions||{}).resortLocations||{}).location||[])[0]||{},w=(j.currentConditions||{}).resortwide||{},v=k=>l[k]?num(l[k].inches):null;
 return {overnight:v('snowOverNight'),h24:v('snow24Hours'),h48:v('snow48Hours'),h72:v('snow72Hours'),d7:v('snow7Days'),base:v('base'),season:v('snowSeasonTotal'),
  lifts:w.numLiftsTotal!=null?`${w.numLiftsOpen}/${w.numLiftsTotal}`:null,trails:w.numTrailsTotal!=null?`${w.numTrailsOpen}/${w.numTrailsTotal}`:null,updated:j.commentsUpdated||j.updated||null};
}
export function parseJacksonJson(body){ // JSON behind jacksonhole.com/mountain-report; upper mountain (tram summit) used, mid-mountain kept
 const j=JSON.parse(body),sn=j.snow||{},a=sn.tramSummit||{},m=sn.midMountain||{},v=(o,k)=>o[k]&&o[k].value!=null?num(o[k].value):null;
 const d=new Date(j.lastModified);
 return {overnight:v(a,'newSnowSinceLiftsClosed'),h24:v(a,'newSnowLast24H'),h48:v(a,'newSnowLast48H'),d7:v(a,'newSnowLast7D'),base:v(a,'totalSnowDepth'),season:v(a,'seasonTotalSnow'),
  midOvernight:v(m,'newSnowSinceLiftsClosed'),midBase:v(m,'totalSnowDepth'),where:'Upper mountain',updated:isNaN(d)?null:d.toISOString()};
}
// same temperature table the app uses for snow-to-liquid ratio
const slr=t=>t>34?0:t>32.5?7:t>29?10:t>25?12.5:t>18?15:t>8?17:15;
async function forecastOvernight(r,date){ // snow from 4 pm the day before to 9 am on `date`
 const u=`https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&elevation=${Math.round(r.elev*0.3048)}&hourly=precipitation,temperature_2m&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(TZ)}&forecast_days=3`;
 const j=await (await get(u,'application/json')).json(),H=j.hourly,prev=mtDate(new Date(new Date(date+'T12:00:00Z').getTime()-864e5));let s=0;
 H.time.forEach((t,i)=>{if(t>=prev+'T16:00'&&t<date+'T09:00')s+=(H.precipitation[i]||0)*slr(H.temperature_2m[i])});return Math.round(s*10)/10;
}
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};

const PARSERS={snowbasin:parseSnowbasin,snowbird:parseSnowbird,alta:parseAlta,brighton:parseBrighton,jackson:parseJacksonJson};
async function main(){
 fs.mkdirSync('data',{recursive:true});
 const old=read('data/reports.json',{resorts:{}}),resorts={};
 for(const r of RESORTS){
  try{let rep={};if(r.page){const body=await (await get(r.page,r.accept||'text/html')).text();rep=PARSERS[r.id](body)}
   // fall back to the shared feed when the resort's own page has no readable numbers
   if(r.feed&&rep.h24==null&&rep.overnight==null&&rep.base==null)rep=parseFeed(await (await get('https://mtnpowder.com/feed?resortId='+r.feed,'application/json')).json());
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

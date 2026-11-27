// Smoke test: loads index.html in jsdom with mocked data feeds and checks the core numbers.
// Run: npm install && npm test
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const TZ='America/Denver',ld=d=>d.toLocaleDateString('en-CA',{timeZone:TZ});
const D=Array.from({length:9},(_,i)=>ld(new Date(Date.now()+(i-2)*864e5)));   // D[2] = today, storm falls overnight into D[3]
function om(url){
 if(url.includes('models=')){const daily={time:D};for(const m of ['gfs_seamless','ecmwf_ifs025','icon_seamless','gem_seamless'])daily['precipitation_sum_'+m]=D.map((_,i)=>i===3?0.9:0);return {daily}}
 const time=[],pr=[],fl=[],t=[],g=[],cc=[];
 for(const d of D)for(let h=0;h<24;h++){time.push(`${d}T${String(h).padStart(2,'0')}:00`);const storm=(d===D[3]&&h<9)||(d===D[2]&&h>=16);pr.push(storm?0.06:0);fl.push(storm?6500:9500);t.push(storm?20:30);g.push(25);cc.push(20)}
 return {hourly_units:{freezing_level_height:'ft'},daily:{time:D,precipitation_sum:D.map((_,i)=>i===3?1:0),wind_gusts_10m_max:D.map(()=>30),temperature_2m_max:D.map(()=>28),temperature_2m_min:D.map(()=>12)},
  hourly:{time,precipitation:pr,freezing_level_height:fl,temperature_2m:t,wind_gusts_10m:g,cloud_cover:cc}}}
const pst=ms=>new Date(ms-8*36e5).toISOString().slice(0,16).replace('T',' ');
function resp(url){
 if(url.includes('/v1/forecast'))return om(url);
 if(url.includes('/points/'))return {properties:{cwa:'SLC',forecastGridData:'https://api.weather.gov/grid',forecast:'https://api.weather.gov/fc'}};
 if(url.endsWith('/grid'))return {properties:{elevation:{value:2500},snowfallAmount:{values:[]}}};
 if(url.endsWith('/fc'))return {properties:{periods:[{name:'Tonight',shortForecast:'Snow',temperature:18}]}};
 if(url.includes('/types/AFD/'))return {'@graph':[{id:'abc'}]};
 if(url.includes('/products/abc'))return {productText:'.KEY MESSAGES...\n- Storm tonight.\n&&\n',issuanceTime:new Date().toISOString()};
 if(url.includes('duration=HOURLY')){const now=Date.now();return url.match(/stationTriplets=([^&]+)/)[1].split(',').map(s=>({stationTriplet:s,data:[{stationElement:{elementCode:'SNWD'},values:Array.from({length:30},(_,i)=>({date:pst(now-(29-i)*36e5),value:40+(i%2)+(i>22?(i-22):0)}))}]}))}
 if(url.includes('awdbRestApi'))return url.match(/stationTriplets=([^&]+)/)[1].split(',').map(s=>({stationTriplet:s,data:[{stationElement:{elementCode:'WTEQ'},values:[{date:'a',value:4,median:4},{date:'b',value:5,median:4}]}]}));
 throw new Error('unexpected '+url)}
const dom=new JSDOM(html,{url:'https://example.org/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
 w.ResizeObserver=class{observe(){}};w.matchMedia=q=>({matches:/reduce/.test(q)});w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 w.fetch=async u=>{try{return {ok:true,status:200,json:async()=>resp(u)}}catch(e){return {ok:false,status:500,statusText:e.message}}};
 w.addEventListener('error',e=>{console.error('PAGE ERROR',e.message);process.exitCode=1})}});
setTimeout(()=>{const d=dom.window.document,txt=s=>d.querySelector(s).textContent.replace(/\s+/g,' ').trim();
 assert.strictEqual(d.querySelectorAll('#rank details.row').length,7,'seven resorts ranked');
 // 17 storm hours x 0.06" at 20F (15:1) = 15.3" overnight
 d.querySelector('[data-day="'+D[3]+'"]').click();
 setTimeout(()=>{
  assert.match(txt('#rank details.row .c-ov'),/^15"forecast/,'overnight number: '+txt('#rank details.row .c-ov'));
  assert.match(txt('#rank details.row .c-storm'),/^1[3-6]"/,'storm column: '+txt('#rank details.row .c-storm'));
  assert.match(txt('#headline'),/15" forecast overnight/,'the answer names the overnight forecast: '+txt('#headline'));
  d.querySelector('[data-sort="drive"]').click();assert.strictEqual(d.querySelector('#rank details.row').id,'row-snowbasin','sorting by drive puts the closest first');
  d.querySelector('[data-sort="rec"]').click();
  assert.match(txt('#storm'),/Snowbasin1[3-6]"/,'headline uses consensus: '+txt('#storm'));
  d.querySelector('#row-snowbird').open=true;d.querySelector('#row-snowbird').dispatchEvent(new dom.window.Event('toggle'));
  assert.match(txt('#row-snowbird .detail'),/Snow line ~5,500 ft/,'snow line in feet, not double converted');
  assert.match(txt('#row-snowbird .detail'),/[78]\.0" in 12h/,'sensor estimate ignores 1-inch noise: '+txt('#row-snowbird .obs'));
  assert.match(txt('#row-snowbird .detail'),/125%/,'snowpack percent');
  console.log('smoke test passed');process.exit(process.exitCode||0)},400)},2500);

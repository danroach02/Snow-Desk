import assert from 'node:assert';import {parseFeed,parseSnowbasin,parseSnowbird,parseAlta,parseJackson,parseBrighton,parseJacksonJson} from '../scripts/fetch-reports.mjs';
const f=parseFeed({OperatingStatus:'Open',SnowReport:{LastUpdate:'2026-11-26T08:07:54-0700',SnowBaseRangeIn:'26',SeasonTotalIn:'60',TotalOpenLifts:3,TotalLifts:9,TotalOpenTrails:8,TotalTrails:82,
 BaseArea:{Name:'--',Last24HoursIn:'--'},MidMountainArea:{Name:'Mid-Mountain',SinceLiftsClosedIn:'4',BaseIn:'26',Last24HoursIn:'6',Last48HoursIn:'9',Last72HoursIn:'9',Last7DaysIn:'17'},SummitArea:{Name:'--',Last24HoursIn:'--'}}});
assert.deepStrictEqual([f.overnight,f.h24,f.h48,f.d7,f.base,f.season,f.lifts],[4,6,9,17,26,60,'3/9']);
const s=parseSnowbasin('<div>Trails Open 40 / 115 Lifts Open 5 / 13 Last Updated: Nov 26, 7:33 AM MT Snow Report Since 5am 0&#8221; Overnight 3&#8221; Base 21&#8221; 24 hours 5&#8221; Season 33&#8221; 7 days 16&#8221; Conditions Base 28</div>');
assert.deepStrictEqual([s.overnight,s.h24,s.base,s.season,s.d7,s.lifts,s.trails],[3,5,21,33,16,'5/13','40/115']);assert.ok(s.updated.startsWith('2026-11-26T14:33')||s.updated.includes('T14:33'));
const b=parseSnowbird('Published Date: 2026-11-26 05:42:00\nReported snow amount: 0\nOvernight snow amount: 4\nBase Depth: 38\n24 Hour Total: 6 inches\n48 Hour Total: 7 inches\n72 Hour Total: 7 inches\n7 Day Total: 17 inches\nSeason Total: 80 inches');
assert.deepStrictEqual([b.overnight,b.h24,b.h48,b.d7,b.base,b.season,b.updated],[4,6,7,17,38,80,'2026-11-26T12:42:00.000Z']);
const a=parseAlta('x"conditions":{"id":8216,"dated_at":"2026-11-26 20:00:00","last12":"3.0","last24":"5.5","base_depth":"36.0","storm_total":"5.5","year_to_date":"71.0"}');
assert.deepStrictEqual([a.overnight,a.h24,a.base,a.season],[3,5.5,36,71]);
const j=parseJackson('<div>SINCE 6AM</div><div> 1" </div><div> </div><div>OVERNIGHT</div><div> 7" </div><div> 5" </div><div>48 HOURS</div><div> 12" </div><div> 9" </div><div>SNOW DEPTH</div><div> 40" </div><div> 31" </div>');
assert.deepStrictEqual([j.overnight,j.summitOvernight,j.h48,j.base],[5,7,9,31]);
const br=parseBrighton(JSON.stringify({updated:'2026-11-26T23:00:04Z',commentsUpdated:'2026-11-26T16:00:28Z',currentConditions:{resortwide:{numLiftsTotal:8,numLiftsOpen:5,numTrailsTotal:76,numTrailsOpen:19},resortLocations:{location:[{snowOverNight:{inches:'3'},snow24Hours:{inches:'5'},snow48Hours:{inches:'6'},snow72Hours:{inches:'6'},snow7Days:{inches:'40'},snowSeasonTotal:{inches:'77'},base:{inches:'30'}}]}}}));
assert.deepStrictEqual([br.overnight,br.h24,br.d7,br.base,br.season,br.lifts,br.updated],[3,5,40,30,77,'5/8','2026-11-26T16:00:28Z']);
const q=x=>({value:String(x)}),jj=parseJacksonJson(JSON.stringify({lastModified:'2026-11-26T07:03:00.000-07:00',liftStatus:{totalLifts:13,openLifts:4},snow:{midMountain:{newSnowSinceLiftsClosed:q(2),totalSnowDepth:q(9)},tramSummit:{newSnowSinceLiftsClosed:q(4),newSnowLast24H:q(6),newSnowLast48H:q(8),newSnowLast7D:q(24),totalSnowDepth:q(21),seasonTotalSnow:q(49),newSnowLast72H:{}}}}));
assert.strictEqual(jj.lifts,'4/13');assert.deepStrictEqual([jj.overnight,jj.h24,jj.h48,jj.d7,jj.base,jj.season,jj.midOvernight,jj.updated],[4,6,8,24,21,49,2,'2026-11-26T14:03:00.000Z']);
console.log('report parsers passed');

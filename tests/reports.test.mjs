import assert from 'node:assert';import {parseFeed,parseSnowbasin} from '../scripts/fetch-reports.mjs';
const f=parseFeed({OperatingStatus:'Open',SnowReport:{LastUpdate:'2026-11-26T08:07:54-0700',SnowBaseRangeIn:'26',SeasonTotalIn:'60',TotalOpenLifts:3,TotalLifts:9,TotalOpenTrails:8,TotalTrails:82,
 BaseArea:{Name:'--',Last24HoursIn:'--'},MidMountainArea:{Name:'Mid-Mountain',SinceLiftsClosedIn:'4',BaseIn:'26',Last24HoursIn:'6',Last48HoursIn:'9',Last72HoursIn:'9',Last7DaysIn:'17'},SummitArea:{Name:'--',Last24HoursIn:'--'}}});
assert.deepStrictEqual([f.overnight,f.h24,f.h48,f.d7,f.base,f.season,f.lifts],[4,6,9,17,26,60,'3/9']);
const s=parseSnowbasin('<div>Last Updated: Nov 26, 7:33 AM MT Snow Report Since 5am 0&#8221; Overnight 3&#8221; Base 21&#8221; 24 hours 5&#8221; Season 33&#8221; 7 days 16&#8221; Conditions Base 28</div>');
assert.deepStrictEqual([s.overnight,s.h24,s.base,s.season,s.d7],[3,5,21,33,16]);assert.ok(s.updated.startsWith('2026-11-26T14:33')||s.updated.includes('T14:33'));
console.log('report parsers passed');

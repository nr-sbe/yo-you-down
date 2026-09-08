import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSlots,slotInstant,paintRectangle} from '../domain.js';
test('viewing zones changes labels but keeps saved slot identities, including date rollover',()=>{
 const p={timezone:'America/New_York',slots:['2026-09-09T18:00','2026-09-09T19:00']};
 const la=projectSlots(p,'America/Los_Angeles');
 assert.deepEqual(la.slots.map(s=>[s.index,s.day,s.clock]),[[0,'2026-09-09','15:00'],[1,'2026-09-09','16:00']]);
 const tokyo=projectSlots(p,'Asia/Tokyo');
 assert.equal(tokyo.slots[0].day,'2026-09-10');assert.equal(tokyo.slots[0].clock,'07:00');
 assert.equal(projectSlots(p,'Asia/Kolkata').slots[0].clock,'03:30');
 assert.equal(projectSlots(p,'Asia/Kathmandu').slots[0].clock,'03:45');
 assert.deepEqual(p.slots,['2026-09-09T18:00','2026-09-09T19:00']);
});
test('source daylight-saving gaps and repeats are rejected instead of guessed',()=>{
 assert.throws(()=>slotInstant('2026-03-08T02:00','America/New_York'),/clock change/);
 assert.throws(()=>slotInstant('2026-11-01T01:00','America/New_York'),/clock change/);
 assert.equal(new Date(slotInstant('2026-01-09T18:00','America/New_York')).toISOString(),'2026-01-09T23:00:00.000Z');
 assert.equal(new Date(slotInstant('2026-07-09T18:00','America/New_York')).toISOString(),'2026-07-09T22:00:00.000Z');
});
test('receiver repeated hours get distinct offset rows and retain both original indexes',()=>{
 const view=projectSlots({timezone:'UTC',slots:['2026-11-01T05:00','2026-11-01T06:00']},'America/New_York');
 assert.equal(view.rows.length,2);assert.notEqual(view.slots[0].row,view.slots[1].row);
 assert.deepEqual(view.slots.map(s=>s.index),[0,1]);
});
test('rectangle adds or clears in either direction without toggling repeated cells or outside choices',()=>{
 const cells=Array.from({length:9},(_,i)=>({index:i,row:Math.floor(i/3),col:i%3}));
 const initial=new Set([8]);
 const painted=paintRectangle(initial,cells,{row:0,col:0},{row:1,col:1},true);
 assert.deepEqual([...painted].sort(),[0,1,3,4,8]);
 assert.deepEqual([...paintRectangle(initial,cells,{row:1,col:1},{row:0,col:0},true)].sort(),[0,1,3,4,8]);
 assert.deepEqual([...paintRectangle(painted,cells,{row:0,col:0},{row:1,col:1},false)],[8]);
 assert.deepEqual([...paintRectangle(initial,cells,{row:0,col:0},{row:0,col:0},true)].sort(),[0,8]);
 assert.deepEqual([...initial],[8]);
});

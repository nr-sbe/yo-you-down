// Test the real PostgreSQL functions locally, without provisioning a cloud account.
// npm install --no-save --ignore-scripts @electric-sql/pglite@0.5.8
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const sql=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');
try {
  await db.exec('create role anon; create role authenticated;');
  await db.exec(sql);
  await db.exec('set role anon;');
  const query=async(sql,params=[]) => (await db.query(sql,params)).rows[0];
  assert.deepEqual((await query('select public.yyd_health() as health')).health,{status:'ready',version:1});
  const make=()=>query('select public.yyd_create_plan($1,$2,$3,$4) as plan',['Shared movie night','Bring snacks','America/New_York',['2026-09-10T18:00','2026-09-10T19:00']]);
  const {plan}=await make();
  assert.equal(plan.people.length,0);
  const alice={id:randomUUID(),token:randomUUID()};
  const bob={id:randomUUID(),token:randomUUID()};
  const save=async(who,name,slots)=> (await query('select public.yyd_save_response($1,$2,$3,$4,$5) as plan',[plan.id,who.id,who.token,name,slots])).plan;
  await save(alice,'Alex',[0,1]);
  let updated=await save(bob,'Sam',[1]);
  assert.equal(updated.people.length,2);
  assert.equal(updated.people.filter(p=>p.slots.includes(1)).length,2);
  updated=await save(alice,'Alex',[]);
  assert.equal(updated.people.length,2);
  assert.deepEqual(updated.people.find(p=>p.id===alice.id).slots,[]);
  await assert.rejects(save({...alice,token:randomUUID()},'Imposter',[0]),/cannot edit/);
  await assert.rejects(save(alice,'Alex',[-1]),/Invalid time/);
  await assert.rejects(save(alice,'Alex',[2]),/Invalid time/);
  await assert.rejects(save(alice,'Alex',[0,0]),/Duplicate/);
  await assert.rejects(query('select * from yyd_private.plans'),/permission denied/);
  await assert.rejects(query('select * from yyd_private.responses'),/permission denied/);
  await assert.rejects(query('select public.yyd_get_plan($1)',[randomUUID()]),/does not exist/);
  await assert.rejects(query('select public.yyd_create_plan($1,$2,$3,$4)',['Invalid','','Not/A_Zone',['2026-09-10T18:00']]),/valid time zone/);
  await assert.rejects(query('select public.yyd_create_plan($1,$2,$3,$4)',['Invalid','','UTC',['2026-02-30T18:00']]),/date|range/i);
  for(let i=2;i<50;i++)await save({id:randomUUID(),token:randomUUID()},`Friend ${i}`,[0]);
  await assert.rejects(save({id:randomUUID(),token:randomUUID()},'Over capacity',[0]),/50 people/);
  const shared=(await query('select public.yyd_get_plan($1) as plan',[plan.id])).plan;
  assert.equal(shared.people.length,50);
  assert.ok(!JSON.stringify(shared).includes(alice.token));
  assert.ok(!JSON.stringify(shared).includes('token_hash'));
  console.log('PASS: real PostgreSQL schema, independent responses, reads, edits, rejected impersonation, invalid input, private-table access, and 50-person cap.');
} finally {await db.close();}

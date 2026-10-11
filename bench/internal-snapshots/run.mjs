// Whole-call final-state comparison. Frozen inputs are shared by all candidates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
const root=new URL('../../',import.meta.url),file=p=>new URL(p,root);
const baseline=await import(file('build/internal-delta-sharing/baseline.mjs'));
const current=await import(file('build/internal-delta-sharing/current.mjs'));
const snapshots=await import(file('build/internal-delta-sharing/snapshots.mjs'));
const compact=await import(file('build/internal-delta-sharing/fields.mjs'));
const frontier=await import(file('build/frontier-diff/frontier/package/dist/index.js'));
const fixtures=JSON.parse(fs.readFileSync(file('build/frontier-diff/fixtures.json'))).filter(f=>f.kind.startsWith('rows'));
const digest=rows=>{let h=2166136261;for(const r of rows){h=Math.imul(h^r.id,16777619)>>>0;h=Math.imul(h^r.x,16777619)>>>0;h=Math.imul(h^r.y,16777619)>>>0;h=Math.imul(h^r.score,16777619)>>>0;h=Math.imul(h^r.flags,16777619)>>>0;}return h;};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const report={schema:1,host:process.version,scope:'same-length five-u32 rows; whole call plus complete final-state digest',rounds:7,target_ms:15,max_iterations:1024,validation:[],samples:[],sink:0,hashes:{}};
for(const path of ['bench/internal-snapshots/run.mjs','build/internal-delta-sharing/baseline.mjs','build/internal-delta-sharing/current.mjs','build/internal-delta-sharing/snapshots.mjs','build/internal-delta-sharing/fields.mjs','build/frontier-diff/frontier/package/dist/index.js','build/frontier-diff/fixtures.json'])report.hashes[path]=crypto.createHash('sha256').update(fs.readFileSync(file(path))).digest('hex');
let seed=71431;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=random()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
for(const fixture of fixtures){
 const changed=new Set(fixture.edits.map(e=>e.index));
 if(fixture.kind==='rows-shared')fixture.after=fixture.after.map((r,i)=>changed.has(i)?r:fixture.before[i]);
 const {before,after,edits}=fixture;freeze(before);freeze(after);freeze(edits);
 const variants={
  'apply-old':()=>baseline.functions.rows_apply(before,edits),
  'apply-shared':()=>current.functions.rows_apply(before,edits),
  'old-source-old-lowering':()=>baseline.functions.rows_apply(before,baseline.functions.rows_diff(before,after)),
  'old-source-new-lowering':()=>current.functions.rows_apply(before,current.functions.rows_diff(before,after)),
  'final-state':()=>snapshots.functions.reconcile(before,after),
  'internal-fields':()=>compact.functions.reconcile_fields(before,after),
  'frontier-roundtrip':()=>frontier.applyPatchImmutable(before,frontier.diff(before,after)),
 };
 const expected=digest(after);const iterations={};
 for(const [name,run] of Object.entries(variants)){
  assert.deepEqual(run(),after,fixture.id+' '+name);for(let i=0;i<3;i++)report.sink^=digest(run());
  const start=performance.now();let count=0;do{report.sink^=digest(run());count++;}while(count<report.max_iterations&&performance.now()-start<report.target_ms);
  iterations[name]=count;report.validation.push({case:fixture.id,variant:name,digest:expected,iterations:count});
 }
 for(let round=0;round<report.rounds;round++)for(const name of shuffle(Object.keys(variants))){
  const run=variants[name],n=iterations[name];assert.deepEqual(run(),after);
  const start=performance.now();for(let i=0;i<n;i++)report.sink^=digest(run());const elapsed=performance.now()-start;
  assert.deepEqual(run(),after);assert.equal(digest(run()),expected);
  report.samples.push({case:fixture.id,rows:fixture.rows,mode:fixture.mode,kind:fixture.kind,variant:name,round,iterations:n,total_ms:elapsed,us:elapsed*1000/n});
 }
 console.error('validated '+fixture.id);
}
report.status='passed';const destination=process.argv[2];assert(destination,'pass a new report path');
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});

// Longer warmed JS control, isolated from Wasm allocation and GPU execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
const root=new URL('../../build/frontier-recheck/',import.meta.url);
const latest=await import(new URL('ink/program.mjs',root));
const previous=await import(new URL('previous.mjs',root));
const main=await import(new URL('published-main.mjs',root));
const fields=await import(new URL('fields.mjs',root));
const frontier=await import(new URL('frontier/package/dist/index.js',root));
const digest=rows=>{let h=2166136261;for(const r of rows){h=Math.imul(h^r.id,16777619)>>>0;h=Math.imul(h^r.x,16777619)>>>0;h=Math.imul(h^r.y,16777619)>>>0;h=Math.imul(h^r.score,16777619)>>>0;h=Math.imul(h^r.flags,16777619)>>>0;}return h;};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}};
let seed=71431;const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=rng()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const result={schema:1,status:'running',host:process.version,protocol:{rounds:11,target_ms:20,max_iterations:6144,warmups:{64:256,1024:96,16384:24},scope:'direct pure JS calls plus every field of every final row; no Wasm/GPU process in this run'},validation:[],samples:[],hashes:{},sink:0};
for(const file of ['ink/program.mjs','previous.mjs','published-main.mjs','fields.mjs','fixtures.json','frontier/package/dist/index.js'])result.hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex');
const fixtures=JSON.parse(fs.readFileSync(new URL('fixtures.json',root))).filter(f=>f.kind!=='scalar');
for(const f of fixtures){
  if(f.kind==='rows-shared'){const changed=new Set(f.edits.map(e=>e.index));f.after=f.after.map((r,i)=>changed.has(i)?r:f.before[i]);}
  freeze(f.before);freeze(f.after);
  const {before,after}=f;
  const variants={
    frontier:()=>frontier.applyPatchImmutable(before,frontier.diff(before,after)),
    'latest-final':()=>latest.functions.rows_final(before,after),
    'previous-final':()=>previous.functions.rows_final(before,after),
    'main-final':()=>main.functions.rows_final(before,after),
    'latest-roundtrip':()=>latest.functions.rows_apply(before,latest.functions.rows_diff(before,after)),
    'main-roundtrip':()=>main.functions.rows_apply(before,main.functions.rows_diff(before,after)),
    fields:()=>fields.functions.reconcile_fields(before,after),
  };
  const expected=digest(after),iterations={};
  const batch=(run,n)=>{let sum=0,last;const start=performance.now();for(let i=0;i<n;i++){last=run();sum=(sum+digest(last))>>>0;}const ms=performance.now()-start;assert.equal(sum,Math.imul(expected,n)>>>0);assert.deepEqual(last,after);result.sink^=sum;return {iterations:n,total_ms:ms,us:ms*1000/n};};
  for(const name of shuffle(Object.keys(variants))){
    const run=variants[name];assert.deepEqual(run(),after);
    for(let i=0;i<result.protocol.warmups[f.rows];i++)result.sink^=digest(run());
    let n=1;for(;;){const sample=batch(run,n);if(sample.total_ms>=20||n===6144)break;n=Math.min(n*2,6144);}
    iterations[name]=n;result.validation.push({case:f.id,variant:name,digest:expected});
  }
  for(let round=0;round<11;round++)for(const name of shuffle(Object.keys(variants))){
    assert.deepEqual(variants[name](),after);const measured=batch(variants[name],iterations[name]);assert.deepEqual(variants[name](),after);
    result.samples.push({case:f.id,rows:f.rows,kind:f.kind,mode:f.mode,variant:name,round,...measured});
  }
  console.error('validated '+f.id);
}
result.status='passed';assert(process.argv[2]);fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});

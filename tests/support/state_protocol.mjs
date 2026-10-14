import assert from 'node:assert/strict';
import fs from 'node:fs';
const history=JSON.parse(fs.readFileSync(new URL('./history.json',import.meta.url)));
const normal=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='bigint'||typeof v==='number'?String(v):v));
for(const name of ['baseline','map','event_columns','compact','compact_events','inline_compact','word','inline_word','number','guarded','dense','zero','zero_dense','predicate','predicate_inline','event_runs','predicate_runs']){
 const {createState}=await import(new URL(`./${name}.mjs`,import.meta.url));const state=createState();
 const bound=Object.fromEntries(['put','erase','total_query','count_query'].map(n=>[n,state.bind(n)]));
 for(let i=0;i<history.length;i++){
  const h=history[i];const args=h.args.map((v,i)=>typeof v==='string'?BigInt(v):v);
  const result=i%3===0?state.invoke(h.name,h.args):i%3===1?bound[h.name](...args):state.invokePrepared(state.prepare(h.name,h.args));
  assert.deepEqual(normal(result),h.result,name+' result');
  assert.deepEqual(normal(bound.total_query()),h.total,name+' total');
  assert.deepEqual(normal(bound.count_query()),h.count,name+' count');
  assert.deepEqual([...await state.checkpoint()],h.snapshot,name+' snapshot');
 }
 const before=await state.checkpoint(),total=state.bind('total_query',{resultOnly:true}),count=state.bind('count_query',{resultOnly:true}),put=state.bind('put',{resultOnly:true});
 const publications=[];const close=state.subscribeGroup(['total_query','count_query'],v=>publications.push(v));
 const positions=[];const closePositions=state.subscribeValues(['total_query','count_query'],(a,b)=>positions.push([a,b]));
 const old=publications.at(-1);state.batch(()=>{put(40n,11n,true,false);put(41n,17n,true,false);});
 assert.equal(publications.length,2,name+' grouped batch');assert.deepEqual(publications.at(-1),[total(),count()]);
 const hostBefore=await state.checkpoint();state.beginTransaction();put(40n,91n,true,false);await state.checkpoint();state.rollbackTransaction();assert.equal(publications.length,2);assert.deepEqual(await state.checkpoint(),hostBefore,'snapshot cache rollback');
 await assert.rejects(state.checkpoint({values:0}),/snapshot/);await assert.rejects(state.checkpoint({depth:0}),/snapshot/);
 state.beginTransaction();put(40n,31n,true,false);state.commitTransaction();assert.equal(publications.length,3);
 const token=state.changeToken();put(50n,7n,true,false);put(50n,9n,true,false);put(51n,19n,true,true);
 const delta=state.changesSince(token);assert.equal(delta.changes.length,1);assert.deepEqual(delta.changes[0],{table:'Rows',key:50n,before:{None:null},after:{Some:{value:9n,active:true}}});
 delta.changes[0].after.Some.value=999n;assert.equal(state.changesSince(token).changes[0].after.Some.value,9n,'owned delta');
 state.bind('erase',{resultOnly:true})(50n,false);assert.equal(state.changesSince(token).changes.length,0,'net no-op');
 state.beginTransaction();put(60n,61n,true,false);state.rollbackTransaction();assert.throws(()=>state.changesSince(token),/lineage/);state.releaseChangeToken(token);
 const snapshot=await state.checkpoint();state.beginTransaction();assert.deepEqual(put(90n,77n,true,true),{Err:'Error.Failed'});state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),snapshot);
 assert.deepEqual(positions,publications,'positional and tuple publication traces');closePositions();close();await state.restore(before);assert.deepEqual(await state.checkpoint(),before);
 let reentered=false;const stop=state.subscribeGroup(['total_query','count_query'],()=>{if(!reentered){reentered=true;put(81n,83n,true,false);}},{immediate:false});
 put(80n,79n,true,false);assert.equal(reentered,true);stop();
 const directEvents=[];let directReentered=false;
 const directStop=state.subscribeValues(['total_query','count_query'],(a,b)=>{directEvents.push([a,b]);if(!directReentered){directReentered=true;put(501n,17n,true,false);}},{immediate:false});
 const directTotal=total(),directCount=count();put(500n,13n,true,false);
 assert.deepEqual(directEvents,[[BigInt.asUintN(64,directTotal+13n),directCount+1n],[BigInt.asUintN(64,directTotal+30n),directCount+2n]],name+' single consumer snapshot/reentry');
 await state.restore(before);assert.deepEqual(directEvents.at(-1),[total(),count()],name+' direct slots follow restored keeps');directStop();
 const wide=state.changeToken();put(0n,9007199254740991n,true,false);put(1n,9007199254740992n,true,false);put(2n,18446744073709551615n,true,false);put(1n,1n,true,false);put(99999n,18446744073709551615n,true,false);
 assert.equal(state.changesSince(wide).changes.find(c=>c.key===2n).after.Some.value,18446744073709551615n);state.releaseChangeToken(wide);
 const saved=await state.checkpoint();const restored=createState();await restored.restore(saved);assert.equal(restored.bind('total_query',{resultOnly:true})(),total());assert.deepEqual(await restored.checkpoint(),saved);
 await state.restore(new Uint8Array(fs.readFileSync(new URL('./exhausted.bin',import.meta.url))));
 const exhausted=await state.checkpoint(),unchanged=total();assert.throws(()=>put(91n,97n,true,false),/commit sequence exhausted/);assert.equal(total(),unchanged);assert.deepEqual(await state.checkpoint(),exhausted);
 assert.deepEqual(put(91n,97n,true,true),{Err:'Error.Failed'});assert.deepEqual(await state.checkpoint(),exhausted);
 for(const h of JSON.parse(fs.readFileSync(new URL('./commit_boundaries.json',import.meta.url)))){
  await state.restore(new Uint8Array(h.seed));const seed=await state.checkpoint();
  assert.deepEqual(normal(state.bind('put')(0n,97n,true,true)),h.failed);assert.deepEqual(await state.checkpoint(),seed);
  const token=state.changeToken(),from=state.version;
  if(h.result===null)assert.throws(()=>state.bind('put')(0n,97n,true,false),/commit sequence exhausted/);
  else assert.deepEqual(normal(state.bind('put')(0n,97n,true,false)),h.result);
  assert.deepEqual([...await state.checkpoint()],h.snapshot);assert.equal(typeof state.version,'bigint');assert.equal(state.changesSince(token).from,from);assert.equal(state.changesSince(token).to,state.version);state.releaseChangeToken(token);
  const restored=await state.checkpoint();state.beginTransaction();state.acknowledgeThrough(18446744073709551615n,18446744073709551615n);state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),restored);
  const last=state.outbox.at(-1);if(last){state.acknowledgeThrough(last.commit,last.position);assert.deepEqual(state.outbox,[]);}
 }
 assert.deepEqual(state.takeSubscriptionErrors(),[]);console.log(name+' source histories, snapshots, grouped publication, rollback, deltas and integer guards passed');
}

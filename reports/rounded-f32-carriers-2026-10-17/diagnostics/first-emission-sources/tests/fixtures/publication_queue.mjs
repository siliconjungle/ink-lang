import assert from 'node:assert/strict';
const values=[0n,0n,0n],reads=[0,0,0],trace=[];
const observers=__createObservers(name=>{
 const i=Number(name);return {scalar:true,roots:i===2?[1]:[0],outputs:[i],read(){reads[i]++;return values[i];},capture:v=>v,output:v=>v,equal:(a,b)=>a===b};
});
// Installation order, rather than changed-output order, determines delivery.
let recurse=true,stopLater;
const stopFirst=observers.subscribe('1',[],v=>{
 trace.push(['first',v]);if(recurse){recurse=false;values[0]=2n;values[1]=2n;observers.commitRoot(0,[2,2,1],2);stopLater();}
},{immediate:false});
const stopSecond=observers.subscribeValues(['0','1'],(a,b)=>trace.push(['pair',a,b]),{immediate:false});
stopLater=observers.subscribe('0',[],v=>trace.push(['disposed',v]),{immediate:false});
values[0]=1n;values[1]=1n;observers.commitRoot(0,[1,1,0],1);
assert.deepEqual(trace,[['first',1n],['pair',1n,1n],['first',2n],['pair',2n,2n]]);
// Reused flags from another root/epoch must not make a subscription eligible.
const stopOther=observers.subscribeValues(['0','2'],(a,b)=>trace.push(['cross',a,b]),{immediate:false});
const before=[...reads];observers.commitRoot(1,[2,2,0],3);assert.deepEqual(reads,before);
const marker=observers.hold();values[0]=3n;observers.commitRoot(0,[4,0,0],4);
const nested=observers.hold();values[0]=4n;values[2]=4n;observers.commitRoot(1,[4,0,5],5);
values[2]=0n;observers.rollback(nested);assert.equal(trace.at(-1)[0],'pair');
observers.release();assert.deepEqual(trace.slice(-2),[['pair',4n,2n],['cross',4n,0n]]);
const discarded=observers.hold();values[0]=9n;observers.commitRoot(0,[6,0,0],6);values[0]=4n;observers.rollback(discarded);
assert.equal(trace.at(-1)[1],4n);
// Listener exceptions do not prevent other consumers or corrupt queue reuse.
const stopBad=observers.subscribe('0',[],()=>{throw Error('listener');},{immediate:false});
for(let epoch=7;epoch<507;epoch++){
 values[0]=BigInt(epoch);observers.commitRoot(0,[epoch,0,0],epoch);
}
const errors=observers.takeErrors();assert.equal(errors.length,500);assert(errors.every(e=>e.phase==='listener'));
stopBad();stopOther();stopFirst();stopSecond();assert.equal(observers.active,false);
assert.deepEqual(observers.takeErrors(),[]);
// The one-consumer direct lane preserves deferred reentry, batching and restore.
const rt={keeps:[0n,0n]},events=[];
const direct=__createObservers(name=>{const k=Number(name);return {scalar:true,committed:{state:rt,keep:k},roots:[0],outputs:[k],read:()=>rt.keeps[k],capture:v=>v,output:v=>v,equal:(a,b)=>a===b};});
const dispose=direct.subscribeValues(['0','1'],(a,b)=>{events.push([a,b]);if(a===1n){rt.keeps=[2n,3n];direct.commitRoot(0,[2,2],2);}},{immediate:false});
rt.keeps[0]=1n;direct.commitRoot(0,[1,0],1);assert.deepEqual(events,[[1n,0n],[2n,3n]]);
direct.batch(()=>{rt.keeps=[4n,5n];direct.commitRoot(0,[3,3],3);rt.keeps=[6n,7n];direct.commitRoot(0,[4,4],4);});assert.deepEqual(events.at(-1),[6n,7n]);
dispose();assert.deepEqual(direct.takeErrors(),[]);
const stopThrow=direct.subscribeValues(['0','1'],()=>{throw Error('direct listener');},{immediate:false});rt.keeps=[8n,9n];direct.commitRoot(0,[5,5],5);assert.equal(direct.takeErrors()[0].phase,'listener');stopThrow();
let delivered=0;const stopLoop=direct.subscribeValues(['0','1'],()=>{delivered++;rt.keeps=[rt.keeps[0]+1n,0n];direct.commitRoot(0,null);},{immediate:false});
rt.keeps=[10n,0n];direct.commitRoot(0,null);assert.equal(delivered,1024);assert.equal(direct.takeErrors()[0].phase,'publication');stopLoop();direct.flush();

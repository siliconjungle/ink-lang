// Pair fresh VMs in alternating order; each worker checks the same complete history.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [baseline,selected,order='baseline,selected',scale='10']=process.argv.slice(2);
if(!baseline||!selected||!['baseline,selected','selected,baseline'].includes(order))
 throw Error('Usage: isolated-sample.mjs BASELINE_ARTIFACT SELECTED_ARTIFACT [ORDER] [SCALE]');
const worker=new URL('./isolated-worker.mjs',import.meta.url),paths={baseline,selected},results={},workers={baseline:{},selected:{}};
for(const phase of ['serve','serve-retune-16','loss','loss-retarget-64']){
 for(const name of order.split(',')){
  const child=spawnSync(process.execPath,[fileURLToPath(worker),paths[name],phase,scale],{encoding:'utf8',timeout:120000,maxBuffer:1000000});
  if(child.error)throw child.error;if(child.status!==0)throw Error(child.stderr||child.stdout||'worker failed');
  const row=JSON.parse(child.stdout);workers[name][phase]=row;
  if(!results[name]){const {result,images,phase:unused,...rest}=row;results[name]={...rest,phases:{}};}
  results[name].phases[phase]=row.result;
 }
 const a=workers.baseline[phase],b=workers.selected[phase];
 assert.deepEqual(a.result.checksums,b.result.checksums,phase+': complete checksums');
 assert.equal(a.result.checkpoint,b.result.checkpoint,phase+': complete checkpoint');
 for(const key of ['sourceCore','compiledCore','deployment'])assert.equal(a.images[key],b.images[key],key);
}
const first=workers.baseline.serve;
console.log(JSON.stringify({schema:1,node:first.node,platform:first.platform,arch:first.arch,cpu:first.cpu,
 order:order.split(','),samples:first.samples,scale:first.scale,phases:Object.values(workers.baseline).map(x=>x.phase),
 typedBoundCalls:true,resultOnly:true,eventAcknowledgementIncluded:true,completeChecksumsAndCheckpointsAgree:true,
 images:{baseline:workers.baseline.serve.images,selected:workers.selected.serve.images},results,workers,
 workerSourceSha256:createHash('sha256').update(readFileSync(worker)).digest('hex'),
 scope:'Paired processes, one artifact and one workload per fresh VM. One full warmup block precedes five measured blocks. No cross-artifact or cross-query VM feedback. Finite learned-program measurements; no automatic profitability or upstream parity claim.'}));

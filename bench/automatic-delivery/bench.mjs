import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'reports/automatic-delivery-2026-10-13');
const mode=process.argv[2]??'time',program=process.argv[3],memoryLane=process.argv[4];
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protocol=read(path.join(out,'protocol.json'));
assert.equal(sha(path.join(out,'fixtures.json')),protocol.fixtures_sha256);
assert.equal(sha(path.join(out,'corpus.json')),protocol.corpus_sha256);
const corpus=read(path.join(out,'corpus.json')).find(r=>r.name===program);
assert(corpus);assert.equal(sha(path.join(root,corpus.source)),corpus.sha256);
const fixtures=read(path.join(out,'fixtures.json')).filter(r=>r.program===program);
let sink=0,seed=0x41592;
const bytes=new DataView(new ArrayBuffer(8));
function consume(v){
 if(typeof v==='number'){bytes.setFloat64(0,v,true);sink=Math.imul(sink,31)^bytes.getUint32(0,true)^bytes.getUint32(4,true);}
 else if(typeof v==='boolean')sink=Math.imul(sink,31)^+v;
 else if(typeof v==='string')for(let i=0;i<v.length;i++)sink=Math.imul(sink,31)^v.charCodeAt(i);
 else if(v!==null)for(const x of Object.values(v))consume(x);
}
function shuffle(xs){for(let i=xs.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;}
function oracle([xs,q]){
 switch(program){
 case'telemetry-total':return xs.filter(x=>x.valid).reduce((a,x)=>(a+x.value)>>>0,0);
 case'ordered-mask':return xs.filter(x=>x>=q).map(x=>(Math.imul(x,13)+7)>>>0).reduce((a,x)=>(x-a)>>>0,19);
 case'alert-query':return xs.filter(x=>x.valid).some(x=>x.value>q);
 case'visible-count':return xs.filter(x=>x.visible&&x.opacity>=q).length>>>0;
 case'unicode-query':return xs.includes(q);
 case'ordered-energy':return xs.map(x=>Math.fround(x*x)).reduce((a,x)=>Math.fround(a+x),Math.fround(0));
 case'row-update':return xs.map(x=>({...x,opacity:x.visible?(x.opacity+q)>>>0:x.opacity}));
 case'plain-projection':return xs.map(x=>x.channel);
 default:throw Error(program);
 }
}
const lanes=[];
for(const [lane,checkpoint]of [['before','complete'],['after','base'],['after','absorption'],['after','complete']]){
 if(mode==='validate-before'&&lane!=='before')continue;
 if(mode==='validate-base'&&(lane!=='after'||checkpoint!=='base'))continue;
 const name=lane+'/'+checkpoint;if(mode==='memory'&&name!==memoryLane)continue;
 const dir=path.join(out,'compiled',lane,checkpoint,program),file=path.join(dir,'output.mjs');
 assert(fs.existsSync(file),'Missing planned artifact: '+file);
 const processResult=read(path.join(dir,'process.json'));assert.equal(sha(file),processResult.artifact_sha256);
 const begin=performance.now(),module=await import(pathToFileURL(file));
 lanes.push({name,sha256:sha(file),module_load_ms:performance.now()-begin,call:args=>module.call('run',args)});
}
const results=[];
for(const fixture of fixtures){
 const file=path.join(root,fixture.path);assert.equal(sha(file),fixture.sha256);
 const args=read(file),before=structuredClone(args),expected=oracle(args);
 assert.deepStrictEqual(expected,read(path.join(out,'reference',program,`${fixture.size}-${fixture.distribution}.json`)),'independent reference');
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected,lane.name+' '+fixture.path);
 const row={fixture:fixture.path,size:fixture.size,distribution:fixture.distribution,input_sha256:fixture.sha256};
 if(mode.startsWith('validate')){row.status='equal to reference and independent oracle';}
 else if(mode==='memory'){
  assert.equal(lanes.length,1);assert.equal(typeof global.gc,'function');global.gc();
  row.before=process.memoryUsage();row.observed=[];
  for(let i=0;i<8;i++){consume(lanes[0].call(args));row.observed.push(process.memoryUsage());}
  global.gc();row.retained=process.memoryUsage();
 }else{
  assert.equal(mode,'time');const counts={};row.samples_ns=Object.fromEntries(lanes.map(l=>[l.name,[]]));row.orders=[];
  for(const lane of shuffle([...lanes])){
   for(let i=0;i<12;i++)consume(lane.call(args));let count=1;
   while(true){const begin=performance.now();for(let i=0;i<count;i++)consume(lane.call(args));if(performance.now()-begin>=5||count>=1024)break;count*=2;}
   counts[lane.name]=count;
  }
  for(let round=0;round<11;round++){
   const order=shuffle([...lanes]);row.orders.push(order.map(l=>l.name));
   for(const lane of order){const begin=performance.now(),n=counts[lane.name];for(let i=0;i<n;i++)consume(lane.call(args));row.samples_ns[lane.name].push((performance.now()-begin)*1e6/n);}
  }
  row.calls_per_sample=counts;
 }
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected);
 assert.deepStrictEqual(args,before,'input immutability');results.push(row);
}
console.log(JSON.stringify({schema:1,mode,program,node:process.version,platform:process.platform,arch:process.arch,
 lanes:lanes.map(({name,sha256,module_load_ms})=>({name,sha256,module_load_ms})),rounds:11,results,sink,
 process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,
 scope:'Complete trusted JavaScript calls and every output field consumed. Input creation and module setup outside runtime timing. Memory is separate per-artifact process high-water and diagnostic GC observations, not allocation counts or exact call peak.'}));

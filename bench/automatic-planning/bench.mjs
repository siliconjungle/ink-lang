import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {oracle} from './oracle.mjs';

const root=path.resolve(new URL('../..',import.meta.url).pathname);
const out=path.resolve(process.env.INK_AUTO_REPORT || path.join(root,'reports/automatic-planning-2026-10-13'));
const [mode,name,one]=process.argv.slice(2);
const read=p=>JSON.parse(fs.readFileSync(p));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fixtures=read(path.join(out,'fixtures.json')).filter(f=>f.program===name);
let seed=0x143ab91,sink=0;
function shuffle(xs){for(let i=xs.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;}
const bits=new DataView(new ArrayBuffer(8));
function consume(v){
 if(typeof v==='number'){bits.setFloat64(0,v,true);sink=Math.imul(sink,31)^bits.getUint32(0,true)^bits.getUint32(4,true);}
 else if(typeof v==='boolean')sink=Math.imul(sink,31)^Number(v);
 else if(typeof v==='string')for(let i=0;i<v.length;i++)sink=Math.imul(sink,31)^v.charCodeAt(i);
 else if(v!==null&&v!==undefined)for(const x of Object.values(v))consume(x);
}
const lanes=[];
for(const lane of ['before','after']){
 const file=path.join(out,'compiled',lane,'javascript',name,'output.mjs');
 const start=performance.now(),mod=await import(pathToFileURL(file));
 lanes.push({name:lane,artifact_sha256:digest(file),setup_ms:performance.now()-start,call:args=>mod.call('run',args)});
}
const selected=mode==='memory'?lanes.filter(l=>l.name===one):lanes;
assert(selected.length);
const results=[];
for(const fixture of fixtures){
 const file=path.join(root,fixture.path);assert.equal(digest(file),fixture.sha256);
 const start=performance.now(),args=read(file),original=structuredClone(args),expected=oracle(name,args);
 const reference=path.join(out,'reference',name,path.basename(file,'.json'),'stdout.txt');
 if(fs.existsSync(reference)){
  const status=read(path.join(path.dirname(reference),'process.json'));
  if(status.status===0)assert.deepStrictEqual(read(reference),expected,'independent core reference '+fixture.path);
 }
 const setup_ms=performance.now()-start;
 for(const lane of selected){assert.deepStrictEqual(lane.call(args),expected);assert.deepStrictEqual(args,original);}
 if(mode==='validate')results.push({fixture:fixture.path,status:'complete outputs equal and inputs immutable'});
 else if(mode==='memory'){
  global.gc();const before=process.memoryUsage(),samples=[];
  for(let i=0;i<8;i++){consume(selected[0].call(args));samples.push(process.memoryUsage());}
  global.gc();results.push({fixture:fixture.path,size:fixture.size,distribution:fixture.distribution,before,samples,retained:process.memoryUsage(),logical_output_json_bytes:Buffer.byteLength(JSON.stringify(expected))});
 }else{
  const counts={},samples_ns=Object.fromEntries(selected.map(l=>[l.name,[]])),order=[];
  for(const lane of shuffle([...selected])){
   for(let i=0;i<8;i++)consume(lane.call(args));
   let n=1;while(true){const start=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));if(performance.now()-start>=5||n>=1024)break;n*=2;}counts[lane.name]=n;
  }
  for(let round=0;round<11;round++){
   const current=shuffle([...selected]);order.push(current.map(l=>l.name));
   for(const lane of current){const n=counts[lane.name],start=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));samples_ns[lane.name].push((performance.now()-start)*1e6/n);}
  }
  results.push({fixture:fixture.path,size:fixture.size,distribution:fixture.distribution,input_identity:fixture.input_identity,setup_ms,samples_ns,calls_per_sample:counts,interleaved_order:order});
 }
 for(const lane of selected){assert.deepStrictEqual(lane.call(args),expected);assert.deepStrictEqual(args,original);}
}
console.log(JSON.stringify({schema:1,program:name,mode,lanes:selected.map(({call,...rest})=>rest),results,sink,process_high_water_rss_kib:process.resourceUsage().maxRSS,
 scope:'Complete trusted calls and bit-aware full-output consumption; captured inputs immutable. Separate memory processes include harness, inputs and oracle; sampled heap and process high-water are not exact peak-live heap or allocation totals.'}));

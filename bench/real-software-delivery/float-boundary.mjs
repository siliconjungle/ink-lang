// Separate diagnostic boundary, never used for selection or headline comparisons.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';
import * as publicModule from '../../reports/real-software-delivery-2026-10-13/compiled/literal/gl-matrix-dot/output.mjs';
const out='reports/real-software-delivery-2026-10-13',file=out+'/compiled/literal/gl-matrix-dot/output.mjs',text=fs.readFileSync(file,'utf8');
const prefix=text.slice(0,text.indexOf('function __into0'));
// Execute the exact original emitted body/support bytes with an inspection tap.
// This is a diagnostic harness, not a modified emitted implementation.
const tap=new Function(prefix+'\nconst __namedTypes='+JSON.stringify(publicModule.metadata.named_types)+';return {body:__fn0,input:__representation('+JSON.stringify(publicModule.metadata.functions[0].params[0].type)+',false),output:__representation('+JSON.stringify(publicModule.metadata.functions[0].result)+',true)};')();
const rows=[];let sink=0;
const consume=v=>{if(typeof v==='number')sink=(sink+v)|0;else if(v)for(const x of Object.values(v))consume(x);};
for(const label of ['original','stress']){
 const [xs]=JSON.parse(fs.readFileSync(out+'/inputs/gl-matrix-dot/'+label+'.json'));
 const prepared=tap.input(xs,new WeakMap()),raw=tap.body(prepared),expected=publicModule.call('run',[xs]);assert.deepStrictEqual(tap.output(raw),expected);
 const lanes={complete:()=>publicModule.call('run',[xs]),input_conversion:()=>tap.input(xs,new WeakMap()),prepared_kernel:()=>tap.body(prepared),output_conversion:()=>tap.output(raw)};const samples={};
 for(const [name,call]of Object.entries(lanes)){
  for(let i=0;i<20;i++)consume(call());let n=1;while(n<4096){let t=performance.now();for(let i=0;i<n;i++)consume(call());if(performance.now()-t>=5)break;n*=2;}
  samples[name]=[];for(let r=0;r<11;r++){const t=performance.now();for(let i=0;i<n;i++)consume(call());samples[name].push((performance.now()-t)*1e6/n);}
 }
 rows.push({label,size:xs.length,samples_ns:samples});
}
console.log(JSON.stringify({schema:1,artifact_sha256:crypto.createHash('sha256').update(text).digest('hex'),exact_original_prefix_sha256:crypto.createHash('sha256').update(prefix).digest('hex'),rows,sink,scope:'Separate diagnostic: public complete call versus original emitted body with prepared internal f32-bit representation and isolated conversions. Preparation excluded only from the prepared-kernel lane; not a faster public API, selection input, or additive cost decomposition. Separate JIT entry points and sequential sampling limit attribution.'}));

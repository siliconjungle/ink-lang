// Controlled mechanism benchmark: previous dispatcher vs compiled traversal.
// Both paths validate and copy every input, then consume the complete result.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const [output,run='0']=process.argv.slice(2);
const helper=fs.readFileSync(new URL('../lowerings/js/src/values.mjs',import.meta.url),'utf8').split('// @helper __u64')[0];
const {old,capture}=Function(helper+'\nreturn {old:__stateInput,capture:__stateCapture};')();
let sink=0;const rows=[],scalar={kind:'u32'},list=element=>({kind:'list',element});
const record=(...fields)=>({kind:'record',fields:fields.map(([name,type])=>({name,type}))});
const consume=value=>{if(typeof value==='number')return value|0;let s=0;for(const item of Object.values(value))s=(s+consume(item))|0;return s;};
for(const n of [256,4096,16384])for(const shape of ['words','records','nested']){
 const type=list(shape==='words'?scalar:shape==='records'?record(['key',scalar],['x',scalar],['y',scalar]):record(['key',scalar],['values',list(scalar)]));
 const value=Array.from({length:n},(_,i)=>shape==='words'?i:shape==='records'?{key:i,x:i*3,y:i*7}:{key:i,values:[i,i*3,i*7]});
 const compiled=capture(type),lanes={dispatcher:v=>old(v,type),compiled};
 const expected=structuredClone(value);
 for(const fn of Object.values(lanes)){
  const result=fn(value);assert.deepStrictEqual(result,expected);assert.notStrictEqual(result,value);
  if(shape!=='words')assert.notStrictEqual(result[0],value[0]);
 }
 const counts={};for(const [name,fn]of Object.entries(lanes)){
  for(let i=0;i<16;i++)sink^=consume(fn(value));
  let count=1;
  for(;;){const start=performance.now();for(let i=0;i<count;i++)sink^=consume(fn(value));if(performance.now()-start>=5||count>=32768)break;count*=2;}
  counts[name]=count;
 }
 const samples={dispatcher:[],compiled:[]};
 for(let round=0;round<9;round++)for(const name of ((Number(run)+round)%2?['compiled','dispatcher']:['dispatcher','compiled'])){
  const start=performance.now();for(let i=0;i<counts[name];i++)sink^=consume(lanes[name](value));
  samples[name].push((performance.now()-start)*1e6/counts[name]);
 }
 assert.deepStrictEqual(value,expected);rows.push({n,shape,samples_ns:samples});
}
fs.writeFileSync(output,JSON.stringify({schema:1,run:Number(run),node:process.version,architecture:process.arch,rows,sink,scope:'Capture mechanism with full output consumption; same unchanged scalar validation, limits and owned values; not an application or framework benchmark'},null,2)+'\n');

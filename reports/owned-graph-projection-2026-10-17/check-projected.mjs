import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const canonical=value=>{if(typeof value==='bigint'){const n=Number(value);if(!Number.isSafeInteger(n))throw Error('comparison requires exact integer');return n;}if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,canonical(v)]));return value;};
const folder=new URL('./',import.meta.url);const steps=JSON.parse(readFileSync(new URL('histories.json',folder)));const expected=JSON.parse(readFileSync(new URL('reference-baseline.json',folder)));
const summary=[];
for(const name of ['projected']){
 const module=await import(new URL(name+'.mjs',folder));const state=module.createState();
 const hex=async()=>Buffer.from(await state.checkpoint()).toString('hex');
 assert.equal(await hex(),expected.initial,name+' initial checkpoint');
 const records=[];
 for(let i=0;i<steps.length;i++){
  const step=steps[i];const before=await hex();const outcome=canonical(state.invoke(step.call,step.args));const snapshot=await hex();const record={id:step.id,before,outcome,snapshot};
  const {logical,...expectedRecord}=expected.records[i];try{assert.deepEqual(record,expectedRecord);}catch(error){writeFileSync(new URL('failed-javascript-record.json',folder),JSON.stringify({variant:name,step,record,expected:expectedRecord}));throw Error(name+' '+step.id+' '+step.call+' mismatch; see failed-javascript-record.json');}records.push(record);
  if(step.call==='frame'&&step.args[1])assert.equal(before,snapshot,'rollback');
 }
 writeFileSync(new URL('javascript-'+name+'.json',folder),JSON.stringify({initial:expected.initial,records},(key,value)=>typeof value==='number'&&Object.is(value,-0)?{F32Bits:2147483648}:value));summary.push({variant:name,cases:records.length,status:'passed'});
}
console.log(JSON.stringify({comparisons:steps.length,variants:summary}));

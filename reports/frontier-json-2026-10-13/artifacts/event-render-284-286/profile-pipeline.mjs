import assert from 'node:assert/strict';import * as ink from './flat-combined.mjs';
const document={...Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i])),unknown:{nested:['雪',true,null,3],enabled:false}},text=JSON.stringify(document),json=new ink.JsonCodec(ink.valueCodecs.identity.result),entry=ink.compiledValues.set_document;
const key=entry.params[1].capture('k00000'),value=entry.params[2].capture(json.parse('777'));
const lane=process.argv[2];let run;
if(lane==='input')run=()=>json.parseCompiled(entry.params[0],text);
else if(lane==='output'){const h=ink.callCompiled('set_document',[json.parseCompiled(entry.params[0],text),key,value]);run=()=>json.stringify(entry.result.materialize(h).Ok);}
else throw Error('profile input or output');
if(lane==='input')assert.deepEqual(entry.params[0].materialize(run()),json.parse(text));else assert.deepEqual(JSON.parse(run()),{...document,k00000:777});
let sink=0;for(let i=0;i<10000;i++){const value=run();sink+=lane==='input'?Object.isFrozen(value)?1:0:value.length;}console.log(lane,sink);

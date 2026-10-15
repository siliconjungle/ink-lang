import * as m from '../../reports/prepared-loops-2026-10-16/text-current.mjs';
const n=512,none={None:null},widths=Array.from({length:n},(_,i)=>i%3===1?1.25:2.5),flags=widths.map((_,i)=>i%3===1?1:0);
const d={widths,flags,advances:flags.map(k=>k===0?{Some:[1.125,1.375]}:none),startExtras:none,graphemeStartExtras:none,endTrims:none,overflowTrims:none,insideExtras:none,fillExtras:none};
const p=m.functions.prepare(d,.005,1000000).Ok,e=m.compiledValues.count_prepared,fixed=e.params[0].capture(p),token=m.prepareCompiled('count_prepared',[[0,fixed]]);
const varying=[0,3,5,10,16,21,32,47,64,80,100,120,150,200,250,1000].map(w=>e.params[1].capture(w));let total=0;
for(let i=0;i<200000;i++)total+=e.result.materialize(m.callPreparedCompiled(token,[varying[i%16]])).Ok;
console.log(total);

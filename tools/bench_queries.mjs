// Complete trusted-value calls, output consumption and unchanged-input checks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const started=performance.now();
const mod=await import(pathToFileURL(request.module));
const setup_ns=(performance.now()-started)*1e6;
let sink=0,seed=request.seed;
const hand={
 hand_filter(xs,threshold,offset){const out=[];for(const x of xs)if(x>=threshold)out.push((Math.imul(x,3)+offset)>>>0);return out;},
 hand_join(xs,ys){const out=[];for(const x of xs)for(const y of ys)if(x===y)out.push({left:x,right:y});return out;},
 hand_contains(xs,target){for(const x of xs)if(x===target)return true;return false;}
};
function consume(x){if(Array.isArray(x)){let h=0;for(const v of x)h=Math.imul(h,31)^consume(v);return h;}
 if(x&&typeof x==='object')return (Math.imul(x.left,31)^x.right)|0;return Number(x)|0;}
function shuffle(xs){for(let i=xs.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;}
const rows=[];
for(const c of request.cases){
 const original=structuredClone(c.args),lanes=c.functions.map(name=>({name,invoke:()=> (hand[name]??mod.functions[name])(...c.args),samples:[]}));
 for(const l of lanes){assert.deepStrictEqual(l.invoke(),c.expected);for(let i=0;i<32;i++)sink^=consume(l.invoke());
  let n=1;while(n<16384){const t=performance.now();for(let i=0;i<n;i++)sink^=consume(l.invoke());if(performance.now()-t>=5)break;n*=2;}l.calls=n;}
 for(let round=0;round<11;round++)for(const l of shuffle([...lanes])){const t=performance.now();for(let i=0;i<l.calls;i++)sink^=consume(l.invoke());l.samples.push((performance.now()-t)*1e6/l.calls);}
 for(const l of lanes){assert.deepStrictEqual(l.invoke(),c.expected);rows.push({case:c.name,function:l.name,calls_per_sample:l.calls,samples_ns:l.samples});}
 assert.deepStrictEqual(c.args,original,'input mutation');
}
process.stdout.write(JSON.stringify({target:'javascript',setup_ns,sink,rows}));

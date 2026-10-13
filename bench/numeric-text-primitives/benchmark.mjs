import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {pathToFileURL,fileURLToPath} from 'node:url';import {performance} from 'node:perf_hooks';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'reports/numeric-text-primitives-2026-10-13');
const mod=await import(pathToFileURL(path.join(out,'software.mjs'))),p=await import(pathToFileURL(path.join(out,'primitives.mjs')));
const before=await import(pathToFileURL(path.join(out,'software-before-normalisation.mjs')));
const read=path=>fs.readFileSync(path,'utf8'),sha=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
function extract(file,name,args){const text=read(file),start=text.indexOf('{',text.indexOf('export function '+name+'('));assert(start>=0);let depth=1,end=start+1;while(depth){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++;}return new Function(...args,text.slice(start+1,end-1));}
const vec2=path.join(root,'bench/native-f32-epoch/upstream/gl-matrix/src/vec2.js'),vec3=path.join(root,'bench/real-software-delivery/upstream/gl-matrix/src/vec3.js');
const length=extract(vec2,'length',['a']),normalise=extract(vec3,'normalize',['out','a']);
const lines=read(path.join(root,'bench/real-software-delivery/upstream/earcut/src/earcut.js')).split('\n');
const vectors=[...read(path.join(root,'bench/real-software-delivery/upstream/three/test/unit/src/math/Box3.tests.js')).matchAll(/new Vector3\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)].map(m=>({x:+m[1],y:+m[2]}));
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const none={None:null},some=x=>({Some:x}),boundary=(b,i)=>i<=b.length&&(i===b.length||(b[i]&192)!==128);
const pop=x=>{x>>>=0;x-=x>>>1&0x55555555;x=(x&0x33333333)+(x>>>2&0x33333333);return Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24;};
const cases=[];
for(const size of [16,512,4096]){
 const points=Array.from({length:size},(_,i)=>vectors[i%vectors.length]),xyz=Array.from({length:size},(_,i)=>i%3===0?[0,0,0]:i%2?[3,4,0]:[-6,0,8]);
 const nums=Array.from({length:size},(_,i)=>Math.fround((i%101-50)/16)),texts=Array.from({length:size},(_,i)=>lines[i%lines.length]+(i%3===0?'é😀':'')),words=Array.from({length:size},(_,i)=>(i*1664525+1013904223)>>>0);
 cases.push({name:'gl_length',size,args:[points],baseline:([xs])=>xs.map(v=>Math.fround(length([v.x,v.y]))),kind:'same output on bounded upstream-derived fixtures'},
 {name:'normalise',size,args:[xyz],baseline:([xs])=>xs.map(v=>v.every(x=>x===0)?none:some(normalise([0,0,0],v).map(Math.fround))),kind:'same output on bounded dyadic Pythagorean vectors'},
 {name:'rounding',size,args:[nums],baseline:([xs])=>xs.map(x=>{let a=Math.abs(x),i=Math.floor(a),r=a-i;const y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;}),kind:'host arithmetic control'},
 {name:'sine',size,args:[nums],baseline:([xs])=>xs.map(x=>some(Math.fround(Math.sin(x)))),kind:'different numerical contract: compare cost only'},
 {name:'exponential',size,args:[nums],baseline:([xs])=>xs.map(x=>some(Math.fround(Math.exp(x)))),kind:'different numerical contract: compare cost only'},
 {name:'logarithm',size,args:[nums.map(x=>Math.abs(x)+0.03125)],baseline:([xs])=>xs.map(x=>some(Math.fround(Math.log(x)))),kind:'different numerical contract: compare cost only'},
 {name:'text_search',size,args:[texts,'return'],baseline:([xs,n])=>xs.map(s=>{const i=s.indexOf(n);return i<0?none:some(encoder.encode(s.slice(0,i)).length);}),kind:'native String search with UTF-8 output adapter'},
 {name:'text_slices',size,args:[texts,0,3],baseline:([xs,a,z])=>xs.map(s=>{const b=encoder.encode(s);return a<=z&&boundary(b,a)&&boundary(b,z)?some(decoder.decode(b.subarray(a,z))):none;}),kind:'native UTF-8 host operations'},
 {name:'popcounts',size,args:[words],baseline:([xs])=>xs.map(pop),kind:'SWAR host control'});
}
if(process.argv.includes('--fixtures')){fs.mkdirSync(path.join(out,'inputs'),{recursive:true});for(const c of cases)fs.writeFileSync(path.join(out,'inputs',c.name+'-'+c.size+'.json'),JSON.stringify(c.args));process.exit(0);}
let sink=0,seed=87312;const view=new DataView(new ArrayBuffer(8));
function consume(v){if(typeof v==='number'){view.setFloat64(0,v,true);sink=(Math.imul(sink,31)^view.getUint32(0,true)^view.getUint32(4,true))|0;}else if(typeof v==='bigint'){sink^=Number(v&0xffffffffn);}else if(typeof v==='string'){for(let i=0;i<v.length;i++)sink=Math.imul(sink,31)^v.charCodeAt(i);}else if(v&&typeof v==='object'){for(const x of Object.values(v))consume(x);}else sink=Math.imul(sink,31)^Number(v);}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const rows=[];
for(const c of cases){const expected=JSON.parse(read(path.join(out,'reference',c.name+'-'+c.size+'.json'))),input=structuredClone(c.args);const lanes=[{name:'ink-js-before',call:a=>before.functions[c.name](...a)},{name:'ink-js',call:a=>mod.functions[c.name](...a)},{name:'host',call:c.baseline}];assert.deepStrictEqual(lanes[0].call(c.args),expected);assert.deepStrictEqual(lanes[1].call(c.args),expected);if(!c.kind.startsWith('different'))assert.deepStrictEqual(lanes[2].call(c.args),expected,c.name);const counts={},samples={};
 for(const l of lanes){for(let i=0;i<8;i++)consume(l.call(c.args));let n=1;while(n<8192){let t=performance.now();for(let j=0;j<n;j++)consume(l.call(c.args));if(performance.now()-t>=5)break;n*=2;}counts[l.name]=n;samples[l.name]=[];}
 for(let round=0;round<11;round++)for(const l of shuffle([...lanes])){const n=counts[l.name],t=performance.now();for(let j=0;j<n;j++)consume(l.call(c.args));samples[l.name].push((performance.now()-t)*1e6/n);}
 assert.deepStrictEqual(lanes[0].call(c.args),expected);assert.deepStrictEqual(c.args,input);rows.push({name:c.name,size:c.size,contract:c.kind,counts,samples_ns:samples});
}
fs.writeFileSync(path.join(out,'javascript.json'),JSON.stringify({scope:'Complete trusted public JavaScript calls with every output consumed; setup outside timing; upstream batching/shape/output quantisation inside host timing; approximations are cost controls with different semantics',rounds:11,node:process.version,source_hash:sha(path.join(root,'bench/numeric-text-primitives/software.ink')),artifact_hash:sha(path.join(out,'software.mjs')),upstreams:{vec2:sha(vec2),vec3:sha(vec3)},rows,sink},null,2)+'\n');
// Fixtures are saved first by --fixtures so the independent evaluator supplies expectations.

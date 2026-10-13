import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'reports/native-f32-epoch-2026-10-13'),name=process.argv[2],fresh=process.argv[3]==='fresh';
const read=p=>JSON.parse(fs.readFileSync(p)),text=p=>fs.readFileSync(path.join(root,p),'utf8');
function body(source,pattern){const m=pattern.exec(source);assert(m);const start=source.indexOf('{',m.index);let n=1,end=start+1;while(n){if(source[end]==='{')n++;if(source[end]==='}')n--;end++;}return source.slice(start+1,end-1);}
let upstream;
if(fresh){
 if(name==='d3-extent'){const original=new Function('values',text('bench/native-f32-epoch/upstream/d3-array/src/extent.js').replace('export default function extent','return function extent'))();upstream=([xs])=>{const [lo,hi]=original(xs);return{valid:lo!==undefined,lo:lo??0,hi:hi??0};};}
 if(name==='gl-vec2-distance'){const original=new Function('a','b',body(text('bench/native-f32-epoch/upstream/gl-matrix/src/vec2.js'),/export function squaredDistance\(/));upstream=([xs])=>xs.map(p=>original([p.a.x,p.a.y],[p.b.x,p.b.y]));}
 if(name==='gl-vec3-lerp'){const original=new Function('out','a','b','t',body(text('bench/real-software-delivery/upstream/gl-matrix/src/vec3.js'),/export function lerp\(/));upstream=([xs,t])=>xs.map(p=>{const a=original([], [p.a.x,p.a.y,p.a.z],[p.b.x,p.b.y,p.b.z],t);return{x:a[0],y:a[1],z:a[2]};});}
 if(name==='earcut-equals'){const original=new Function('p1','p2',body(text('bench/real-software-delivery/upstream/earcut/src/earcut.js'),/function equals\(/));upstream=([xs])=>xs.map(p=>original(p.a,p.b));}
}
const before=(await import(pathToFileURL(path.join(out,fresh?'fresh/before':'baseline',name+'.mjs')))).call;
const after=(await import(pathToFileURL(path.join(out,fresh?'fresh/after':'after',name+'.mjs')))).call;
const lanes=[{name:'before',call:a=>before('run',a)},{name:'after',call:a=>after('run',a)}];
if(fresh){for(const checkpoint of ['base','grown']){const mod=await import(pathToFileURL(path.join(out,'automatic',checkpoint,name,'output.mjs')));lanes.push({name:checkpoint,call:a=>mod.call('run',a)});}lanes.push({name:'upstream',call:upstream});}
const fixtures=fresh?read(path.join(out,'fresh-fixtures.json')).filter(f=>f.program===name):read(path.join(root,'reports/real-software-delivery-2026-10-13/fixtures.json')).filter(f=>f.program===name);
let sink=0,seed=5231947;const view=new DataView(new ArrayBuffer(8));
function consume(v){if(typeof v==='number'){view.setFloat64(0,v,true);sink=Math.imul(sink,31)^view.getUint32(0,true)^view.getUint32(4,true);}else if(typeof v==='boolean')sink=Math.imul(sink,31)^+v;else for(const x of Object.values(v))consume(x);}
function shuffled(a){for(let i=a.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const rows=[];for(const f of fixtures){const args=read(path.join(root,f.path)),input=structuredClone(args),expected=read(path.join(root,fresh?f.reference:`reports/real-software-delivery-2026-10-13/reference/${name}/${f.label}.json`));
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected,lane.name+' '+f.label);
 const row={label:f.label,size:f.size,samples_ns:Object.fromEntries(lanes.map(l=>[l.name,[]])),calls_per_sample:{},orders:[]};
 for(const lane of shuffled([...lanes])){for(let i=0;i<16;i++)consume(lane.call(args));let n=1;for(;;){const t=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));if(performance.now()-t>=8||n>=16384)break;n*=2;}row.calls_per_sample[lane.name]=n;}
 for(let round=0;round<15;round++){const order=shuffled([...lanes]);row.orders.push(order.map(l=>l.name));for(const lane of order){const n=row.calls_per_sample[lane.name],t=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));row.samples_ns[lane.name].push((performance.now()-t)*1e6/n);}}
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected);assert.deepStrictEqual(args,input);rows.push(row);
}
console.log(JSON.stringify({program:name,fresh,rows,sink,node:process.version,scope:'Complete calls; all output values consumed, immutable inputs; original upstream function bodies with timed batching/shape adapters. Module/input setup excluded. Binary32 and Number coincide only on the bounded fixtures.'}));

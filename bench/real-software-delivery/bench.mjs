import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {pathToFileURL,fileURLToPath} from 'node:url';import {performance} from 'node:perf_hooks';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'reports/real-software-delivery-2026-10-13');
const mode=process.argv[2]??'time',name=process.argv[3],only=process.argv[4];
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protocol=read(path.join(out,'protocol.json'));for(const n of ['corpus','fixtures','upstreams'])assert.equal(sha(path.join(out,n+'.json')),protocol[n+'_sha256']);
const program=read(path.join(out,'corpus.json')).find(r=>r.name===name);assert(program?.supported);assert.equal(sha(path.join(root,program.source)),program.sha256);
for(const r of read(path.join(out,'upstreams.json')))assert.equal(sha(path.join(root,r.path)),r.sha256);
const source=p=>fs.readFileSync(path.join(root,'bench/real-software-delivery/upstream',p),'utf8');
// Extract original upstream bodies, never a replacement handwritten algorithm.
function body(text,pattern){const m=pattern.exec(text);assert(m);const start=text.indexOf('{',m.index);let n=1,end=start+1;while(n&&end<text.length){if(text[end]==='{')n++;if(text[end]==='}')n--;end++;}assert.equal(n,0);return text.slice(start+1,end-1);}
const originals={};
function fn(text,pattern,args){const b=body(text,pattern);const f=new Function(...args,b);f.original_sha256=crypto.createHash('sha256').update(b).digest('hex');return f;}
for(const op of ['min','max','cumsum'])originals[op]=new Function('values',source(`d3-array/src/${op}.js`).replace(/export default function \w+/,`return function ${op}`))();
originals.area=fn(source('earcut/src/earcut.js'),/function signedArea\(/,['data','start','end','dim']);
for(const op of ['dot','squaredLength'])originals[op]=fn(source('gl-matrix/src/vec3.js'),new RegExp('export function '+op+'\\('),op==='dot'?['a','b']:['a']);
const box=source('three/src/math/Box3.js'),vector=source('three/src/math/Vector3.js');
for(const op of ['setFromPoints','makeEmpty','expandByPoint'])originals[op]=fn(box,new RegExp('\\n\\s*'+op+'\\('),op==='setFromPoints'?['points']:op==='expandByPoint'?['point']:[]);
for(const op of ['min','max','set'])originals['vector_'+op]=fn(vector,new RegExp('\\n\\s*'+op+'\\('),op==='set'?['x','y','z']:['v']);
const zero=()=>({x:0,y:0,z:0});
function upstream([xs]){
 if(name==='d3-min'||name==='d3-max'){const v=originals[name.slice(3)](xs);return {valid:v!==undefined,value:v??0};}
 if(name==='d3-cumsum')return Array.from(originals.cumsum(xs));
 if(name==='earcut-area'){const points=xs.flatMap(p=>[p.x,p.y]);return originals.area(points,0,points.length,2);}
 if(name==='gl-matrix-length')return xs.map(p=>originals.squaredLength([p.x,p.y,p.z]));
 if(name==='gl-matrix-dot')return xs.map(p=>originals.dot([p.a.x,p.a.y,p.a.z],[p.b.x,p.b.y,p.b.z]));
 const v=()=>({...zero(),set:originals.vector_set,min:originals.vector_min,max:originals.vector_max});
 const b={min:v(),max:v(),makeEmpty:originals.makeEmpty,expandByPoint:originals.expandByPoint};originals.setFromPoints.call(b,xs);
 return {valid:xs.length>0,min:xs.length?{x:b.min.x,y:b.min.y,z:b.min.z}:zero(),max:xs.length?{x:b.max.x,y:b.max.y,z:b.max.z}:zero()};
}
const lanes=[];
for(const label of (program.split==='development'?['literal','packed-base/quick','packed-grown/quick']:['literal','packed-base/quick','packed-base/balanced','packed-grown/quick','packed-grown/balanced'])){
 if(mode==='memory'&&label!==only)continue;
 const dir=path.join(out,'compiled',label,name),p=path.join(dir,'output.mjs');assert.equal(sha(p),read(path.join(dir,'process.json')).artifact_sha256);const t=performance.now(),mod=await import(pathToFileURL(p));
 lanes.push({name:label,sha256:sha(p),module_load_ms:performance.now()-t,call:a=>mod.call('run',a)});
}
if(mode!=='memory'||only==='upstream')lanes.push({name:'upstream',call:upstream});
let sink=0,seed=0x428367;const bits=new DataView(new ArrayBuffer(8));
function consume(v){if(typeof v==='number'){bits.setFloat64(0,v,true);sink=Math.imul(sink,31)^bits.getUint32(0,true)^bits.getUint32(4,true);}else if(typeof v==='boolean')sink=Math.imul(sink,31)^+v;else for(const x of Object.values(v))consume(x);}
function shuffle(a){for(let i=a.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const rows=[];
for(const f of read(path.join(out,'fixtures.json')).filter(r=>r.program===name)){
 const p=path.join(root,f.path);assert.equal(sha(p),f.sha256);const args=read(p),before=structuredClone(args),expected=read(path.join(out,'reference',name,f.label+'.json'));const row={label:f.label,size:f.size,seed_rows:f.seed_rows,stress_repetition:f.stress_repetition};
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected,lane.name+' '+f.label);
 if(mode==='time'){
  row.samples_ns=Object.fromEntries(lanes.map(l=>[l.name,[]]));row.calls_per_sample={};row.orders=[];
  for(const lane of shuffle([...lanes])){for(let i=0;i<12;i++)consume(lane.call(args));let n=1;while(true){let t=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));if(performance.now()-t>=5||n>=16384)break;n*=2;}row.calls_per_sample[lane.name]=n;}
  for(let round=0;round<11;round++){let order=shuffle([...lanes]);row.orders.push(order.map(l=>l.name));for(const lane of order){const n=row.calls_per_sample[lane.name],t=performance.now();for(let i=0;i<n;i++)consume(lane.call(args));row.samples_ns[lane.name].push((performance.now()-t)*1e6/n);}}
 }else if(mode==='memory'){
  assert.equal(lanes.length,1);assert.equal(typeof global.gc,'function');global.gc();row.before=process.memoryUsage();row.observed=[];for(let i=0;i<8;i++){consume(lanes[0].call(args));row.observed.push(process.memoryUsage());}global.gc();row.retained=process.memoryUsage();
 }else assert.equal(mode,'validate');
 for(const lane of lanes)assert.deepStrictEqual(lane.call(args),expected);assert.deepStrictEqual(args,before);rows.push(row);
}
console.log(JSON.stringify({schema:1,mode,program:name,node:process.version,platform:process.platform,arch:process.arch,rounds:11,lanes:lanes.map(({name,sha256,module_load_ms})=>({name,sha256,module_load_ms})),rows,sink,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,scope:'Complete trusted calls, every output consumed; input/module setup outside execution time. Upstream batching/shape adapters are inside each upstream call. RSS/GC are diagnostic host costs, not exact call allocation or memory peaks.'}));

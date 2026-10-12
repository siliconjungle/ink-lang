import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';import {createRequire} from 'node:module';import crypto from 'node:crypto';
const require=createRequire(import.meta.url),root=path.resolve(new URL('../..',import.meta.url).pathname),out=path.join(root,'reports/knowledge-growth-2026-10-13');
const mode=process.argv[2],program=process.argv[3],one=process.argv[4];
const read=p=>JSON.parse(fs.readFileSync(p)),digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fixtures=read(path.join(out,'fixtures.json')).filter(x=>x.program===program&&x.split==='evaluation'),points=read(path.join(out,'checkpoints.json'));
let sink=0,seed=0x138aae;function shuffle(xs){for(let i=xs.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;}
const words=new DataView(new ArrayBuffer(8));function consume(v){if(typeof v==='number'){words.setFloat64(0,v,true);sink=Math.imul(sink,31)^words.getUint32(0,true)^words.getUint32(4,true);}else if(typeof v==='boolean')sink=Math.imul(sink,31)^+v;else if(typeof v==='string'){for(let i=0;i<v.length;i++)sink=Math.imul(sink,31)^v.charCodeAt(i);}else if(v!=null){for(const x of Object.values(v))consume(x);}}
function oracle(name,args){const [xs,q]=args;const hit=x=>x.minX<=q.maxX&&x.minY<=q.maxY&&x.maxX>=q.minX&&x.maxY>=q.minY;
 switch(name){case'sequence-every':return xs.every(x=>x<q);case'ast-ancestor':return xs.find(x=>x.key===q)?.label??'missing';case'text-lines':return xs.reduce((a,x)=>({count:(a.count+ +(x===13||x===10&&a.previous!==13))>>>0,previous:x}),{count:0,previous:0});case'drawing-hit':return xs.filter(x=>x.minX>=16).some(hit);case'spatial-collision':return xs.some(hit);case'particle-step':return xs.map(p=>({...p,x:Math.fround(p.x+Math.fround(p.vx*q)),y:Math.fround(p.y+Math.fround(p.vy*q))}));case'index-membership':return xs.includes(q);case'incremental-distinct':return xs.filter((x,i)=>i===0||x!==xs[i-1]);case'bulk-update':return xs.map(x=>({...x,value:x.active?(x.value+q)>>>0:x.value}));case'compact-set':return [...new Set(xs)];default:throw Error(name);}}
const lanes=[];
for(const lane of ['forced','automatic','automatic-default'])for(const point of points){
 const dir=path.join(out,'compiled',lane,point.label,program),file=path.join(dir,'output.mjs');if(!fs.existsSync(file))continue;
 const result=read(path.join(dir,'result.json'));assert.equal(digest(file),result.artifact_sha256);
 const t=performance.now(),m=await import(pathToFileURL(file));lanes.push({name:`${lane}/${point.label}`,sha256:digest(file),setup_ms:performance.now()-t,run:args=>m.call('run',args)});
}
const literalFile=path.join(out,'baseline',program,'literal.mjs'),t=performance.now(),literal=await import(pathToFileURL(literalFile));lanes.push({name:'literal',sha256:digest(literalFile),setup_ms:performance.now()-t,run:args=>literal.call('run',args)});
// Actual upstream functions run unchanged. Adapters supply their restricted
// typed inputs and complete observations; different stateful boundaries stay labelled.
const up=path.join(out,'upstream'),_=require(path.join(up,'lodash/package/lodash.js')),ts=require(path.join(up,'typescript/package/lib/typescript.js'));
if(program==='sequence-every')lanes.push({name:'upstream/lodash.every',run:([xs,q])=>_.every(xs,x=>x<q)});
if(program==='index-membership')lanes.push({name:'upstream/lodash.includes',run:([xs,q])=>_.includes(xs,q)});
if(program==='compact-set')lanes.push({name:'upstream/lodash.uniq',run:([xs])=>_.uniq(xs)});
if(program==='ast-ancestor')lanes.push({name:'upstream/typescript.findAncestor',prepare:args=>{let node;for(let i=args[0].length-1;i>=0;i--)node={...args[0][i],parent:node};return[node,args[1]];},run:([node,q])=>ts.findAncestor(node,x=>x.key===q)?.label??'missing'});
if(program==='spatial-collision'){const {default:RBush}=await import(pathToFileURL(path.join(up,'rbush/package/index.js')));lanes.push({name:'upstream/rbush.build+collides',run:([xs,q])=>new RBush().load(xs).collides(q)});}
if(program==='particle-step'){const {vec2}=require(path.join(up,'gl-matrix/package/cjs/index.js'));lanes.push({name:'upstream/gl-matrix.scaleAndAdd',prepare:([xs,dt])=>[xs.map(p=>({...p,position:new Float32Array([p.x,p.y]),velocity:new Float32Array([p.vx,p.vy])})),dt],run:([xs,dt])=>xs.map(p=>{const v=vec2.scaleAndAdd(new Float32Array(2),p.position,p.velocity,dt);return{x:v[0],y:v[1],vx:p.vx,vy:p.vy,active:p.active};})});}
if(program==='incremental-distinct'){const {from,distinctUntilChanged,toArray}=require(path.join(up,'rxjs/package/dist/cjs/index.js'));lanes.push({name:'upstream/rxjs.subscribe+distinct+toArray',run:([xs])=>{let result;from(xs).pipe(distinctUntilChanged(),toArray()).subscribe(x=>result=x);return result;}});}
const selected=mode==='memory'?lanes.filter(x=>x.name===one):lanes;
assert(selected.length>0);const results=[];
for(const f of fixtures){const fixtureStarted=performance.now();const file=path.join(root,f.path);assert.equal(digest(file),f.sha256);const args=read(file),original=structuredClone(args),expected=oracle(program,args);const ref=path.join(out,'reference',program,`${f.size}-${f.distribution}`,'stdout.txt');if(fs.existsSync(ref)&&fs.readFileSync(ref,'utf8').trim()!==''){const pr=read(path.join(path.dirname(ref),'process.json'));if(pr.status===0)assert.deepStrictEqual(JSON.parse(fs.readFileSync(ref,'utf8')),expected,'independent reference '+f.path);}function snapshot(l,a){if(l.name==='upstream/typescript.findAncestor'){const rows=[];for(let n=a[0];n;n=n.parent)rows.push({key:n.key,label:n.label,active:n.active});return[rows,a[1]];}return structuredClone(a);}
 const calls=selected.map(l=>{const laneStarted=performance.now();const a=l.prepare?l.prepare(args):args;return{...l,args:a,before:snapshot(l,a),setup_ms:performance.now()-laneStarted,invoke:()=>l.run(a)};});
 const fixtureSetupMs=performance.now()-fixtureStarted;
 for(const l of calls)assert.deepStrictEqual(l.invoke(),expected,`${program} ${f.size} ${f.distribution} ${l.name}`);
 if(mode==='validate'){for(const l of calls)assert.deepStrictEqual(snapshot(l,l.args),l.before);results.push({fixture:f.path,lanes:calls.map(x=>x.name),status:'equal and immutable'});continue;}
 if(mode==='memory'){const l=calls[0];global.gc();const before=process.memoryUsage();const sampled=[];for(let i=0;i<8;i++){consume(l.invoke());sampled.push(process.memoryUsage());}global.gc();const retained=process.memoryUsage();results.push({fixture:f.path,name:l.name,before,observed:sampled,retained,logical_output_json_bytes:Buffer.byteLength(JSON.stringify(expected))});}
 else{const counts={},samples=Object.fromEntries(calls.map(l=>[l.name,[]])),orders=[];
  for(const l of shuffle([...calls])){let n=1;for(let i=0;i<8;i++)consume(l.invoke());while(true){const t=performance.now();for(let i=0;i<n;i++)consume(l.invoke());if(performance.now()-t>=5||n>=1024)break;n*=2;}counts[l.name]=n;}
  for(let round=0;round<11;round++){const order=shuffle([...calls]);orders.push(order.map(l=>l.name));for(const l of order){const n=counts[l.name],t=performance.now();for(let i=0;i<n;i++)consume(l.invoke());samples[l.name].push((performance.now()-t)*1e6/n);}}
  results.push({fixture:f.path,size:f.size,distribution:f.distribution,input_identity:f.input_identity,fixture_setup_ms:fixtureSetupMs,per_lane_setup_ms:Object.fromEntries(calls.map(l=>[l.name,l.setup_ms])),samples_ns:samples,calls_per_sample:counts,interleaved_order:orders});
 }
 for(const l of calls){assert.deepStrictEqual(l.invoke(),expected);assert.deepStrictEqual(snapshot(l,l.args),l.before);}assert.deepStrictEqual(args,original);
}
console.log(JSON.stringify({schema:1,mode,program,node:process.version,platform:process.platform,arch:process.arch,rounds:11,lanes:selected.map(({name,sha256,setup_ms})=>({name,sha256,setup_ms})),results,sink,os_peak_rss_kib:process.resourceUsage().maxRSS,scope:'Complete function calls and bit-aware full output consumption; immutable captured inputs; partial kernels labelled in corpus.json; memory acquired in separate per-variant process. Actual upstream controls may have separately labelled API/setup boundaries.'}));

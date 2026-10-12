import fs from 'node:fs';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';import{createRequire}from'node:module';import{performance}from'node:perf_hooks';import crypto from'node:crypto';
const root=process.argv[2],lodashFile=process.argv[3],beforeRoot=process.argv[4],_=createRequire(import.meta.url)(lodashFile);
assert.equal(_.VERSION,'4.17.21');
const baseline=await import(pathToFileURL(root+'/baseline.mjs')),selected=await import(pathToFileURL(root+'/selected.mjs'));
const beforeBaseline=beforeRoot?await import(pathToFileURL(beforeRoot+'/baseline.mjs')):null,beforeSelected=beforeRoot?await import(pathToFileURL(beforeRoot+'/selected.mjs')):null;
const bits=x=>{const a=new Float32Array([x]);return new Uint32Array(a.buffer)[0]};
let seed=0x7391abf1,sink=0;function shuffle(a){for(let i=a.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function consume(v){if(v===null)return 0;if(typeof v==='number')return v|0;if(typeof v==='bigint')return Number(v&0xffffffffn);if(typeof v==='boolean')return +v;if(typeof v==='string'){let h=0;for(let i=0;i<v.length;i++)h=Math.imul(h,31)^v.charCodeAt(i);return h;}let h=0;for(const x of Object.values(v))h=Math.imul(h,31)^consume(x);return h;}
const results=[];
for(const size of [128,4096,65536])for(const regime of ['sparse','half','dense']){
 const xs=Array.from({length:size},(_,i)=>({score:(Math.imul(i+971,1664525)+1013904223)>>>23,visible:i%7!==0,name:i%5?'other':'snow',value:(i%127-63)/8}));
 const cut=regime==='sparse'?496:regime==='half'?256:16;
 const cases=[['filtered_right',[xs,cut,19]],['filtered_left',[xs,cut,19]],['summary',[xs,cut,0]],['label',[xs,'snow']],['filtered_mapped',[xs,cut,19]],['mapped_filtered',[xs,cut,0]],['composed_map',[xs,'snow']],['composed_filter',[xs,cut]],['concatenated_right',[xs,xs.slice(0,size>>>1),19]],['concatenated_left',[xs,xs.slice(0,size>>>1),19]],['mapped_count',[xs]],['mapped_length',[xs]],['identity_rows',[xs]]];
 for(const[name,args]of cases){
  const original=structuredClone(args),expected=baseline.call(name,args);assert.deepStrictEqual(selected.call(name,args),expected);assert.deepStrictEqual(args,original);
  const lanes=[{name:'baseline',run:()=>baseline.call(name,args)},{name:'selected',run:()=>selected.call(name,args)}];
  if(beforeRoot)lanes.push({name:'before-baseline',run:()=>beforeBaseline.call(name,args)},{name:'before-selected',run:()=>beforeSelected.call(name,args)});
  // This is the actual published Lodash filter/map/reduceRight chain. The
  // restricted positive-word domain keeps its Number sum exactly equal to Ink.
  if(name==='filtered_mapped')lanes.push({name:'lodash-4.17.21',run:()=>_(args[0]).filter(x=>x.score>=args[1]).map(x=>x.score).reduceRight((acc,x)=>acc+x,args[2])});
  for(const l of lanes)assert.deepStrictEqual(l.run(),expected);
  const counts=new Map(),samples=new Map();
  for(const l of shuffle([...lanes])){for(let i=0;i<16;i++)sink^=consume(l.run());let n=1,elapsed;do{const start=performance.now();for(let i=0;i<n;i++)sink^=consume(l.run());elapsed=performance.now()-start;if(elapsed>=8||n>=65536)break;n*=2;}while(true);counts.set(l.name,n);samples.set(l.name,[]);}
  for(let round=0;round<11;round++)for(const l of shuffle([...lanes])){const n=counts.get(l.name),start=performance.now();for(let i=0;i<n;i++)sink^=consume(l.run());samples.get(l.name).push((performance.now()-start)*1e6/n);}
  const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
  const observations={};for(const l of lanes){global.gc();const before=process.memoryUsage();for(let i=0;i<32;i++)sink^=consume(l.run());const after=process.memoryUsage();observations[l.name]={before,after};assert.deepStrictEqual(l.run(),expected);}
  assert.deepStrictEqual(args,original);results.push({name,size,regime,median_ns:Object.fromEntries(lanes.map(l=>[l.name,med(samples.get(l.name))])),samples_ns:Object.fromEntries(samples),sampled_memory:observations,selected_speedup:med(samples.get('baseline'))/med(samples.get('selected'))});
 }
}
console.log(JSON.stringify({schema:1,scope:'Designed pipeline-family ablation, not a fresh generalisation estimate. Whole trusted calls including generated conversions and full result consumption. Real pinned Lodash chain restricted to exact positive-word sums; other cases are general kernels, not full application ports. Post-batch memory samples are not allocation counts or exact peaks.',node:process.version,platform:process.platform,arch:process.arch,lodash:{version:_.VERSION,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(lodashFile)).digest('hex'),npm_integrity:'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg=='},rounds:11,seed:0x7391abf1,results,sink}));

// Read-only archived-source diagnosis. Timed/profile modes require an explicit gate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const B=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const P=path.join(B,'reports/web-stack-proofs-38-2026-10-11/targets');
const argv=Object.fromEntries(process.argv.slice(2).map(x=>{const p=x.replace(/^--/,'').split('=');return[p[0],p.slice(1).join('=')||true]}));
const mode=argv.mode||'validate',out=argv.output?path.resolve(argv.output):null;
if(!['validate','profile','reproduce'].includes(mode))throw Error('unknown mode');
if(mode!=='validate'&&!argv['timing-authorized'])throw Error('profiling/timing window must be explicitly authorized');
if(out&&!out.startsWith(path.join(B,'reports/web-stack-engine-39-2026-10-11/regressions')+path.sep))throw Error('output must be in diagnosis evidence lane');
const digest=b=>createHash('sha256').update(b).digest('hex');
const bytes=async p=>readFile(p),json=async p=>JSON.parse(await readFile(p,'utf8'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async value=>{const u=new URL(value);if(u.protocol!=='file:')return originalFetch(value);const b=await readFile(u);return{ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
const meta=await json(path.join(P,'metadata.json')),fixtures=(await json(path.join(P,'fixtures.json'))).frames;
const {expert}=await import(pathToFileURL(path.join(P,'expert.mjs')));
const controlSources={};
const bindings={metadata:digest(await bytes(path.join(P,'metadata.json'))),fixtures:digest(await bytes(path.join(P,'fixtures.json'))),script:digest(await bytes(fileURLToPath(import.meta.url)))};
for(const[p,h]of Object.entries(meta.bindings)){if(digest(await bytes(path.join(P,p)))!==h)throw Error('archived target drift: '+p)}
const equal=(a,b)=>a.length===b.length&&b.every((x,i)=>a[i]===x);
const code=a=>{let c=a.length>>>0;for(let i=0;i<a.length;i++)c=(c+Math.imul((i+1)>>>0,a[i]))>>>0;return c};
function cloneControl(source,control){
 const body=source.split('function __fn1',1)[0];let changed=body;
 if(control==='no-padding'){
  // Exact generated concat shape: bind its result to the original mapped prefix.
  const re=/const (v\d+)=new Array\((v\d+)\+(v\d+)\);\nfor\(let (v\d+)=0;\4<\2;\4\+\+\)\{\1\[\4\]=(v\d+)\[\4\];\}\nfor\(let (v\d+)=0;\6<\3;\6\+\+\)\{\1\[\2\+\6\]=(v\d+)\[\6\];\}/;
  let matches=0;changed=body.replace(re,(_,result,n,m,i,prefix,j,suffix)=>{matches++;return`const ${result}=${prefix}; // diagnostic: appended suffix is not materialized`});
  if(matches!==1)throw Error('concat transformation did not match exactly once');
 }else if(control==='no-pluszero'){
  const matches=body.match(/\+0/g)||[];if(matches.length!==4)throw Error('expected four word division/remainder neutral additions');changed=body.replace(/\+0/g,'');
 }else throw Error('unknown control');
 if(changed===body)throw Error('unchanged control');
 const named=changed.replace('function __fn0(',`function diagnose_${control.replaceAll('-','_')}(`);
 return{fn:Function(named+`\nreturn diagnose_${control.replaceAll('-','_')};`)(),source:named,scope:control==='no-padding'?'Exact prior source with only concat allocation/copies removed; staged mapper/pair loops retained.':'Exact checked source with only four +0 operations following total U32 division/remainder removed.'};
}
async function variantsFor(f,names){
 const args=[Uint32Array.from(f.xs),Uint32Array.from(f.ys),f.seed,f.k],capture=()=>args.map(a=>ArrayBuffer.isView(a)?a.slice():a),variants={},closers=[];
 for(const name of names){
  const version=name.startsWith('control_no_padding')?'prior':name.startsWith('control_')?'checked':name.split('_')[0];
  if(name==='expert_js_owned'){variants[name]={async:false,boundary:'captured-js-owned',run:()=>expert[f.task](...capture()),runWith:a=>expert[f.task](...a.map(x=>ArrayBuffer.isView(x)?x.slice():x))};continue}
  const root=path.join(P,'targets',f.task,version),url=pathToFileURL(root+'/');
  if(name.endsWith('_js_owned')){
   const source=await readFile(path.join(root,'program.mjs'),'utf8');bindings[path.relative(B,path.join(root,'program.mjs'))]=digest(source);
   let fn;if(name.startsWith('control_')){const control=name.includes('no_padding')?'no-padding':'no-pluszero',clone=cloneControl(source,control);fn=clone.fn;bindings[name+'/'+f.task]=digest(clone.source);controlSources[name+'/'+f.task]={source:clone.source,sha256:digest(clone.source),scope:clone.scope}}else fn=(await import(new URL('program.mjs',url))).functions[f.task];
   variants[name]={async:false,boundary:'captured-js-owned',run:()=>fn(...capture()),runWith:a=>fn(...a.map(x=>ArrayBuffer.isView(x)?x.slice():x))};
  }else if(name.endsWith('_wasm_prepared')){
   const wasmPath=name.includes('_novec_')?path.join(B,'reports/web-stack-engine-39-2026-10-11/regressions/static',f.task,version+'.no-vectorize.wasm'):path.join(root,'cpu.wasm');bindings[path.relative(B,wasmPath)]=digest(await bytes(wasmPath));
   const{instance:{exports:cpu}}=await WebAssembly.instantiate(await bytes(name.includes('_novec_')?path.join(B,'reports/web-stack-engine-39-2026-10-11/regressions/static',f.task,version+'.no-vectorize.wasm'):path.join(root,'cpu.wasm')),{}),mf=await json(path.join(root,'manifest.json')),fn=mf.functions.find(x=>x.name===f.task),{createPackedCall}=await import(new URL('prepared-wasm.mjs',url));
   const p=createPackedCall(cpu,fn.index,args.map(a=>ArrayBuffer.isView(a)?{words:a,count:a.length}:{words:Uint32Array.of(a),count:1}),Math.max(1,args[0].length+args[1].length));
   closers.push(()=>p.close());variants[name]={async:false,boundary:'resident-wasm-destination',run:()=>p.run()};
  }else if(name.endsWith('_wasm_full')){
   const{loadInk}=await import(new URL('ink-gpu.mjs',url)),e=await loadInk(url,{gpu:false});closers.push(()=>e.close());variants[name]={async:true,boundary:'captured-wasm-owned',run:async()=>(await e.call(f.task,args,{backend:'cpu'})).value};
  }else throw Error('unsupported variant '+name);
 }
 return{args,variants,close:async()=>{for(const c of closers)await c()}};
}
const defaultNames=['prior_js_owned','checked_js_owned','expert_js_owned','control_no_padding_js_owned','control_no_pluszero_js_owned','prior_wasm_prepared','checked_wasm_prepared','prior_wasm_full','checked_wasm_full'];
const names=(argv.variant||defaultNames.join(',')).split(','),wantedFrames=argv.frame==='regressions'?new Set((await json(path.join(B,'reports/web-stack-proofs-38-2026-10-11/regressions.json'))).rows.map(c=>c.frame)):new Set(String(argv.frame||'').split(',')),frames=argv.frame?fixtures.filter(f=>wantedFrames.has(f.id)):mode==='validate'?fixtures.filter(f=>f.task.includes('heldout')):[];
if(!frames.length)throw Error('select an exact archived --frame for profile/reproduce');
const result={status:'running',mode,host:process.version,execArgv:process.execArgv,argv,profiling_overhead_included:mode==='profile',control_sources:controlSources,causal_scope:'no-padding isolates removed concat allocation/copy, with staged loops retained; no-pluszero isolates four scalar neutral additions. Expert changes several source features and is not a single-factor cause.',boundaries:'Captured JS copies both inputs and returns fresh owned outputs. Prepared Wasm excludes setup and borrows destination; full Wasm uses unchanged runtime capture/packing/owned unpack. Node results do not reproduce browser engine/environment.',bindings,validation:[],calibration:[],samples:[],profile_calls:[],observable:0};
let rngState=Number(argv.seed||2026113901)>>>0;
const random=()=>{rngState^=rngState<<13;rngState^=rngState>>>17;rngState^=rngState<<5;return rngState>>>0};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=random()%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
for(const f of frames){
 const{args,variants,close}=await variantsFor(f,names);try{
  for(const[name,v]of Object.entries(variants)){const a=await v.run(),saved=Array.from(a),b=await v.run();if(v.runWith){const alt=args.map(x=>ArrayBuffer.isView(x)?(x.length?Uint32Array.from(x,x=>(x^0xa5a5a5a5)>>>0):Uint32Array.of(1)):x);alt[2]=(f.seed^0x40000000)>>>0;const changed=v.runWith(alt);if(!equal(changed,expert[f.task](...alt))||!equal(a,saved))throw Error('changed-input owned lifetime failure')}if(!equal(a,f.expected)||!equal(b,f.expected)||!equal(a,saved)||!equal(args[0],f.xs)||!equal(args[1],f.ys)||code(a)!==f.web_consumption_code)throw Error('full-output/lifetime/nonmutation failure '+f.id+'/'+name);result.validation.push({frame:f.id,variant:name,passed:true,full_output:true,nonmutation:true,lifetime:'prepared buffers borrowed until next run; owned outputs checked across same-input repeated call'});}
  if(mode==='validate')continue;
  for(const v of Object.values(variants))for(let i=0;i<Number(argv.warmups||256);i++)result.observable=(result.observable+code(await v.run()))>>>0;
  if(mode==='profile'){for(const[name,v]of Object.entries(variants)){const n=Number(argv.calls||256);for(let i=0;i<n;i++)result.observable=(result.observable+code(await v.run()))>>>0;result.profile_calls.push({frame:f.id,variant:name,calls:n,boundary:v.boundary,full_word_consumption:true})}continue}
  async function batch(name,n){const v=variants[name],before=result.observable;let a;const start=performance.now();if(v.async){for(let i=0;i<n;i++){a=await v.run();result.observable=(result.observable+code(a))>>>0}}else{for(let i=0;i<n;i++){a=v.run();result.observable=(result.observable+code(a))>>>0}}const elapsed=performance.now()-start;if(!equal(a,f.expected))throw Error('batch output');return{frame:f.id,variant:name,boundary:v.boundary,iterations:n,elapsed_ms:elapsed,ns_per_call:elapsed*1e6/n,checksum:String((result.observable-before)>>>0),consumed_elements:n*f.expected.length};}
  const iterations={};for(const name of names){let n=1;for(;;){const r=await batch(name,n);result.calibration.push(r);if(r.elapsed_ms>=8||n>=65536){iterations[name]=n;break}n*=2}}
  for(let round=0;round<Number(argv.rounds||9);round++)for(const name of shuffle(names))result.samples.push({round,...await batch(name,iterations[name])});
 }finally{await close()}
}
result.status='passed';result.script_sha256=digest(await bytes(fileURLToPath(import.meta.url)));
if(out){await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'})}
console.log(JSON.stringify({status:result.status,mode,validation:result.validation.length,samples:result.samples.length,profile_calls:result.profile_calls,output:out,bindings_count:Object.keys(bindings).length}));

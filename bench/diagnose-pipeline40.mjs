// Exact strict ESM fusion controls. Validation is untimed; timing/profile needs a bound serial gate.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const B=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const R=path.join(B,'reports/web-stack-engine-40-2026-10-11/fusion');
const argsCLI=Object.fromEntries(process.argv.slice(2).map(x=>{const p=x.replace(/^--/,'').split('=');return[p[0],p.slice(1).join('=')||true]}));
const mode=argsCLI.mode||'validate';
if(!['validate','reproduce','profile'].includes(mode))throw Error('unknown mode');
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const manifestPath=path.join(R,argsCLI.manifest||'manifest.json');
if(path.dirname(manifestPath)!==R)throw Error('manifest outside evidence lane');
const manifestBytes=await readFile(manifestPath),manifest=JSON.parse(manifestBytes);
const harnessSHA=sha(await readFile(fileURLToPath(import.meta.url)));
if(manifest.bindings.javascript_runner!==harnessSHA)throw Error('harness drift');
const bindings={manifest:sha(manifestBytes),harness:harnessSHA};
if(mode!=='validate'){
 const gate=await json(path.join(R,'serial-gate.json'));
 if(gate.authorized!==true||gate.manifest_sha256!==bindings.manifest||gate.harness_sha256!==harnessSHA)throw Error('explicit bound exclusive gate required');
 bindings.serial_gate=sha(await readFile(path.join(R,'serial-gate.json')));
}
for(const [key,p,h]of [['fixtures',manifest.fixture_path,manifest.fixtures_sha256],['metadata',manifest.metadata_path,manifest.metadata_sha256],['expert',manifest.expert_path,manifest.expert_sha256]]){
 if(sha(await readFile(path.join(B,p)))!==h)throw Error(key+' drift');bindings[key]=h;
}
const meta=await json(path.join(B,manifest.metadata_path));
for(const[p,h]of Object.entries(meta.bindings))if(sha(await readFile(path.join(path.dirname(path.join(B,manifest.metadata_path)),p)))!==h)throw Error('archive drift '+p);
for(const row of manifest.rows)if(sha(await readFile(path.join(B,row.path)))!==row.sha256)throw Error('module drift '+row.path);
let staticEvidence=null;
try{staticEvidence=await json(path.join(R,'compiler-evidence.json'));bindings.compiler_evidence=sha(await readFile(path.join(R,'compiler-evidence.json')))}catch(e){if(e.code!=='ENOENT')throw e}
if(staticEvidence)for(const r of staticEvidence.records){
 for(const[p,h]of [[r.ir_path,r.ir_sha256],[r.remarks_path,r.remarks_sha256],...(r.wasm_path?[[r.wasm_path,r.wasm_sha256]]:[])])if(sha(await readFile(path.join(B,p)))!==h)throw Error('compiler evidence drift');
}
const {expert}=await import(pathToFileURL(path.join(B,manifest.expert_path)));
const allFrames=(await json(path.join(B,manifest.fixture_path))).frames;
const frameIDs=argsCLI.frame?String(argsCLI.frame).split(','):mode==='validate'?allFrames.map(f=>f.id):manifest.timed_frames;
const frames=allFrames.filter(f=>frameIDs.includes(f.id));if(frames.length!==frameIDs.length)throw Error('unknown/duplicate frames');
const jsNames=[...new Set(manifest.rows.map(r=>r.variant))];
const wasmNames=staticEvidence?['prior_wasm_ordinary','prior_wasm_no_vectorizers','checked_wasm_ordinary','checked_wasm_no_vectorizers']:[];
const names=argsCLI.variant?String(argsCLI.variant).split(','):[...jsNames,...wasmNames];
if(mode==='profile'&&(frames.length!==1||names.length!==1))throw Error('profile selects exact one fixture/variant');
const eq=(a,b)=>a.length===b.length&&b.every((x,i)=>a[i]===x);
const consume=a=>{let c=a.length>>>0;for(let i=0;i<a.length;i++)c=(c+Math.imul(i+1,a[i]))>>>0;return c};
const capture=a=>a.map(x=>ArrayBuffer.isView(x)?x.slice():x);
const result={status:'running',mode,node:process.version,v8:process.versions.v8,execArgv:process.execArgv,argsCLI,bindings,
 validation:[],warmups:[],calibration:[],samples:[],profile_calls:[],observable:0,
 scope:'Exact strict ESM originals/clones preserve public names and module tail. JS captures both inputs and owns full outputs; resident Wasm owns captured inputs but borrows destination. All words consumed. Profile results never serve as ordinary speed ratios.',
 causal_limits:manifest.limits};
let state=Number(argsCLI.seed||manifest.protocol.seed)>>>0;
const rng=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=rng()%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
for(const f of frames){
 const args=[Uint32Array.from(f.xs),Uint32Array.from(f.ys),f.seed,f.k],variants={},close=[];
 try{
  for(const name of names){
   if(name.includes('_wasm_')){
    const version=name.split('_wasm_')[0],compileMode=name.split('_wasm_')[1];
    const row=staticEvidence?.records.find(r=>r.task===f.task&&r.version===version&&r.target==='wasm'&&r.mode===compileMode);if(!row)throw Error('unknown wasm control '+name);
    const wasm=await WebAssembly.instantiate(await readFile(path.join(B,row.wasm_path)),{}),cpu=wasm.instance.exports;
    const originalRoot=path.join(B,'reports/web-stack-proofs-38-2026-10-11/targets/targets',f.task,version);
    const mf=await json(path.join(originalRoot,'manifest.json')),fn=mf.functions.find(r=>r.name===f.task),{createPackedCall}=await import(pathToFileURL(path.join(originalRoot,'prepared-wasm.mjs')));
    const packed=a=>a.map(x=>ArrayBuffer.isView(x)?{words:x,count:x.length}:{words:Uint32Array.of(x),count:1});
    // Observe setup allocations only, to check actual resident argument words after calls.
    const allocations=[],setupCPU={...cpu,ink_alloc:(n,align)=>{const pointer=cpu.ink_alloc(n,align);allocations.push({pointer,n});return pointer}};
    const p=createPackedCall(setupCPU,fn.index,packed(args),Math.max(1,args[0].length));close.push(()=>p.close());
    if(allocations.length!==7)throw Error('packed adapter allocation shape');
    const unmutated=a=>packed(a).every((x,i)=>eq(new Uint32Array(cpu.memory.buffer,allocations[i+2].pointer,x.words.length),x.words));
    const replace=a=>packed(a).forEach((x,i)=>p.writeArgument(i,x.words,x.count));
    const a=p.run();if(!eq(a,f.expected)||!unmutated(args))throw Error('Wasm original output/nonmutation');
    const alt=args.map(x=>ArrayBuffer.isView(x)?Uint32Array.from(x,x=>(x^0xa5a5a5a5)>>>0):x);alt[2]=(f.seed^0x40000000)>>>0;alt[3]=0;
    replace(alt);if(!eq(p.run(),expert[f.task](...alt))||!unmutated(alt))throw Error('Wasm changed output/nonmutation');
    replace(args);if(!eq(p.run(),f.expected)||!eq(p.run(),f.expected)||!unmutated(args))throw Error('Wasm restored output/nonmutation');
    variants[name]={run:()=>p.run(),boundary:'resident-wasm-destination'};
    result.validation.push({frame:f.id,variant:name,full_output:true,changed_input:true,zero_divisor:true,nonmutation:true,result_lifetime:'borrowed until next run/writeArgument/close'});
   }else{
    const row=manifest.rows.find(r=>r.task===f.task&&r.variant===name);if(!row)throw Error('unknown JS variant '+name);
    const module=await import(pathToFileURL(path.join(B,row.path))),fn=module.functions[f.task],run=a=>fn(...capture(a));
    const a=run(args),saved=Array.from(a),b=run(args),alt=args.map(x=>ArrayBuffer.isView(x)?Uint32Array.from(x,x=>(x^0xa5a5a5a5)>>>0):x);alt[2]=(f.seed^0x40000000)>>>0;alt[3]=0;
    if(!eq(a,f.expected)||!eq(b,f.expected)||!eq(run(alt),expert[f.task](...alt))||!eq(a,saved)||!eq(args[0],f.xs)||!eq(args[1],f.ys)||consume(a)!==f.web_consumption_code)throw Error('output/lifetime/nonmutation');
    if((a instanceof Uint32Array)!==(row.output_kind==='uint32array'))throw Error('result representation');
    variants[name]={run:()=>run(args),boundary:'captured-js-owned'};
    result.validation.push({frame:f.id,variant:name,full_output:true,changed_input:true,zero_divisor:true,nonmutation:true,owned_changed_input_lifetime:true,output_kind:row.output_kind});
   }
  }
  if(mode==='validate')continue;
  for(const name of names)for(let i=0;i<Number(argsCLI.warmups||manifest.protocol.warmups);i++){
   const a=variants[name].run();if(!eq(a,f.expected))throw Error('warmup');result.observable=(result.observable+consume(a))>>>0;result.warmups.push({frame:f.id,variant:name,iteration:i,passed:true});
  }
  if(mode==='profile'){
   const n=Number(argsCLI.calls||256),name=names[0];for(let i=0;i<n;i++)result.observable=(result.observable+consume(variants[name].run()))>>>0;
   result.profile_calls.push({frame:f.id,variant:name,calls:n,profiling_overhead_included:true});continue;
  }
  const batch=(name,n)=>{const before=result.observable;let a;const start=performance.now();for(let i=0;i<n;i++){a=variants[name].run();result.observable=(result.observable+consume(a))>>>0}const elapsed_ms=performance.now()-start;
   if(!eq(a,f.expected)||((result.observable-before)>>>0)!==(Math.imul(f.web_consumption_code,n)>>>0))throw Error('batch full-output/checksum');
   return{frame:f.id,variant:name,boundary:variants[name].boundary,iterations:n,elapsed_ms,ns_per_call:elapsed_ms*1e6/n,checksum:String((result.observable-before)>>>0),consumed_elements:n*f.expected.length};};
  const counts={};for(const name of names){let n=1;for(;;){const r=batch(name,n);result.calibration.push(r);if(r.elapsed_ms>=manifest.protocol.calibration_ms||n>=manifest.protocol.maximum_iterations){counts[name]=n;break}n*=2}}
  for(let round=0;round<Number(argsCLI.rounds||manifest.protocol.rounds);round++)for(const name of shuffle(names))result.samples.push({round,...batch(name,counts[name])});
 }finally{for(const c of close)c()}
}
result.status='passed';if(argsCLI.output){const out=path.resolve(argsCLI.output);if(!out.startsWith(R+path.sep))throw Error('outside evidence lane');await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'})}
console.log(JSON.stringify({status:result.status,mode,validation:result.validation.length,samples:result.samples.length,output:argsCLI.output}));

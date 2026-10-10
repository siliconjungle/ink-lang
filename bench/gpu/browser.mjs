// Real browser WebGPU validation. Install npm dependencies in bench/gpu first.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
const [base,fixturePath,output,browserPath]=process.argv.slice(2);
if(!base||!fixturePath||!output||!browserPath)throw Error('usage: node bench/gpu/browser.mjs BUNDLE_URL FIXTURES.json OUTPUT.json CHROME_PATH');
const fixtures=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--enable-unsafe-webgpu']});
try{
  const page=await browser.newPage();await page.goto(base);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const result=await page.evaluate(async({base,fixtures})=>{
    const {loadInk}=await import(new URL('ink-gpu.mjs',base));
    const cpu=await loadInk(base,{backend:'cpu'}),gpu=await loadInk(base,{backend:'gpu'}),js=await loadInk(base,{backend:'javascript'});
    let comparisons=0,gpuCalls=0;
    for(const fixture of fixtures){
      const args=fixture.call==='wide'?[fixture.args[0].map(x=>String(x))]:fixture.args;
      // Wide cases are supplied as decimal strings by the Node driver.
      for(const runtime of [cpu,js,gpu]){
        const result=await runtime.run(fixture.call,args);
        if(String(result.value)!==String(fixture.expected))throw Error(`${fixture.call}: ${String(result.value)} != ${fixture.expected}`);
        if(runtime===gpu&&fixture.gpu_eligible&&result.backend!=='gpu')throw Error(`${fixture.call} GPU fallback: ${result.reason}`);
        if(result.backend==='gpu')gpuCalls++;comparisons++;
      }
    }
    let rejected=0;
    for(const args of [[[4294967296],1],[[-1],1],[[1],-1],[[1],true]]){try{await gpu.run('total',args);}catch{rejected++;}}
    if(rejected!==4)throw Error('invalid u32 arguments accepted');
    const limit=await gpu.run('filtered',[new Uint32Array(1048577),0]);
    if(limit.backend!=='cpu'||limit.value!==0||!limit.reason.includes('budget'))throw Error('GPU limit fallback failed');
    const retry=await gpu.run('filtered',[[1,2,3],4]);
    if(retry.backend!=='gpu'||retry.value!==14)throw Error('size rejection disabled a valid later call');
    const auto=await loadInk(base,{expectedCalls:32});
    const small=await auto.run('total',[[1,2,3,4],3]);
    if(small.value!==30)throw Error('small adaptive result mismatch');
    const values=new Uint32Array(1048576);for(let i=0;i<values.length;i++)values[i]=(Math.imul(i,1664525)+1013904223)>>>0;
    const reference=await cpu.run('heavy',[values]);const large=await auto.run('heavy',[values]);
    if(large.value!==reference.value)throw Error('large adaptive result mismatch');
    const before=values[100];await gpu.run('heavy',[values]);if(values[100]!==before)throw Error('borrowed input changed');
    // Serialization prevents overlapping calls from racing on Wasm memory.
    const concurrent=await Promise.all(Array.from({length:8},(_,i)=>cpu.run('total',[[i,4294967295],3])));
    for(let i=0;i<8;i++)if(concurrent[i].value!==((Math.imul(i,3)-3)>>>0))throw Error('concurrent CPU call mismatch');
    await cpu.close();await js.close();await gpu.close();await auto.close();
    return {status:'passed',browser_comparisons:comparisons,gpu_calls:gpuCalls,invalid_arguments_rejected:rejected,limit_fallback_and_retry:[limit,retry],small_selection:small,large_selection:large};
  },{base,fixtures:fixtures.map(f=>f.call==='wide'?{...f,args:[f.args[0].map(String)],expected:String(f.expected)}:f)});
  if(errors.length)throw Error(errors.join('\n'));
  // Explicitly test the browser path when WebGPU is not exposed.
  const unavailable=await browser.newPage();await unavailable.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));await unavailable.goto(base);
  const fallback=await unavailable.evaluate(async(base)=>{const {loadInk}=await import(new URL('ink-gpu.mjs',base));const rt=await loadInk(base);const result=await rt.run('total',[[0,4294967295,2],3]);await rt.close();return result;},base);
  if(!['cpu','javascript'].includes(fallback.backend)||fallback.value!==3)throw Error('no-WebGPU fallback failed');
  const broken=await browser.newPage();await broken.route('**/function_*_stage_*.wgsl',route=>route.fulfill({status:200,body:'this is deliberately invalid WGSL'}));await broken.goto(base);
  const shaderFailure=await broken.evaluate(async(base)=>{const {loadInk}=await import(new URL('ink-gpu.mjs',base));const rt=await loadInk(base,{backend:'gpu'});const result=await rt.run('total',[[1,2,3],4]);await rt.close();return result;},base);
  if(shaderFailure.backend!=='cpu'||shaderFailure.value!==24||!shaderFailure.reason.includes('GPU fallback'))throw Error('shader failure fallback failed');
  const receipt={shader_failure_fallback:shaderFailure,...result,browser:browser.version(),unavailable_gpu_fallback:fallback};
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v,2));console.log(JSON.stringify(receipt,(_,v)=>typeof v==='bigint'?v.toString():v));
}finally{await browser.close();}

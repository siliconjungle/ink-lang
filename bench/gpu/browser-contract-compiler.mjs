// Exercise the browser package's public Compiler API with external state proofs.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const [chrome,environment,output='build/browser-contract-compiler.json']=process.argv.slice(2);
const root=path.resolve(environment),source=await fs.readFile('examples/state-contracts.ink','utf8');
const evidence=await fs.readFile('build/state-contract-proofs/evidence.json','utf8');
const steps=JSON.parse(await fs.readFile('build/state-contracts-parity/script.json','utf8'));
const forged=steps.find(s=>s.reject_restore).reject_restore;
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Contract compiler test</title>');return;}
 try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside fixture');
 const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'text/html');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({executablePath:chrome,headless:true});const page=await browser.newPage();await page.goto(base+'/');
 const result=await page.evaluate(async({base,source,evidence,forged})=>{
  const {Compiler}=await import(base+'/dist/package/index.js');const compiler=new Compiler(base+'/public/ink-compiler.wasm');
  try{const artifact=await compiler.compile(source,evidence);const module=await import('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(artifact.javascript))));const state=module.createState();
   if(state.invoke('length_ready',[]).result.Int!=='0')throw Error('initial state');
   state.invoke('replace_all',[[{id:1,value:7},{id:2,value:9}]]);
   if(state.invoke('add_bag',[[{id:2,value:9}],{id:1,value:7}]).result!==true)throw Error('state multiset');
   let rejected=false;try{state.invoke('replace_all',[[{id:1,value:7},{id:1,value:9}]]);}catch(e){rejected=/precondition/.test(e.message);}if(!rejected)throw Error('duplicate IDs accepted');
   const before=Array.from(await state.checkpoint());rejected=false;try{await state.restore(forged);}catch(e){rejected=/invariant/.test(e.message);}if(!rejected||JSON.stringify(before)!==JSON.stringify(Array.from(await state.checkpoint())))throw Error('restore was not atomic');
   state.invoke('clear',[]);if(state.invoke('length_ready',[]).result.Int!=='0')throw Error('clear');
   return {status:'passed',external_state_proofs:Object.keys(JSON.parse(evidence).state_proofs).length,compile_ms:artifact.compileMs,compiler_load_ms:artifact.compilerLoadMs,core_sha256:artifact.manifest.core_sha256};
  }finally{compiler.stop();}
 },{base,source,evidence,forged});
 await fs.writeFile(output,JSON.stringify({...result,browser:browser.version()},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep,dirname,basename} from 'node:path';
const directory=resolve(process.argv[2]??'');
const manifest=JSON.parse(await readFile(resolve(directory,'artifact.json'),'utf8'));
if(manifest.target!=='webgpu')throw Error('Expected a trained webgpu artifact directory');
const root=dirname(directory),folder=encodeURIComponent(basename(directory));
const port=Number(process.argv[3]??4327);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
const html=`<!doctype html><meta charset="utf-8"><title>Ink trained artifact test</title><pre id="result">Running compiled startup checks…</pre><script type="module">
import {loadInk} from './${folder}/program/ink-gpu.mjs';
const out=document.querySelector('#result');
const equal=(a,b)=>{if(a.length!==b.length||a.some((v,i)=>v!==b[i]))throw Error('Checkpoint bytes differ');};
try {
 const host=await loadInk(new URL('./${folder}/program/',location.href),{gpu:true});
 const seed=new Uint8Array(await(await fetch('./${folder}/model.snapshot')).arrayBuffer());
 const cpu=host.createState(),js=await host.createJavaScriptState();
 equal(cpu.snapshot(),seed);equal(await js.checkpoint(),seed);
 const x={width:0.5,length:0.5};const a=cpu.invoke('suggest',[x]),b=js.invoke('suggest',[x]);
 if(a.result!==b.result)throw Error('Prediction differs');
 let gpu='unavailable';
 if(navigator.gpu&&await navigator.gpu.requestAdapter()) {
  const reply=await host.call('batch',[[0,0.5,1,-1],0.25],{backend:'gpu-required'});
  if(reply.backend!=='gpu'||JSON.stringify(reply.value)!=='[0,0.0625,0.25,0.25]')throw Error('GPU result differs');gpu='passed';
 }
 cpu.dispose();await host.dispose();out.textContent=JSON.stringify({status:'passed',cpu:'exact seeded checkpoint',javascript:'exact seeded checkpoint',prediction:a.result,gpu},null,2);
} catch(error){out.textContent='FAILED: '+error.stack;}
</script>`;
createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw Error('path');
 const bytes=await readFile(path);res.setHeader('Content-Type',({'.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'})[extname(path)]??'application/octet-stream');res.end(bytes);
}catch(e){res.statusCode=404;res.end(String(e));}}).listen(port,'127.0.0.1',()=>console.log('Trained browser fixture ready at http://127.0.0.1:'+port+'/ '+folder));

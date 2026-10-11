import {StatefulModule} from './state-wasm.mjs';
// Complete source module. State execution is never benchmarked speculatively.
export async function loadInk(base,{gpu=true,backend='auto',...options}={}){
 const root=new URL(base,globalThis.location?.href??'http://localhost/');if(!root.pathname.endsWith('/'))root.pathname+='/';
 const manifest=await(await fetch(new URL('manifest.json',root))).json();
 const js=await import(new URL('program.mjs',root));
 const cpu=await StatefulModule.instantiate(new Uint8Array(await(await fetch(new URL(manifest.cpu,root))).arrayBuffer()));
 const pure=cpu.create(),parts=new Map();
 async function part(f){if(!parts.has(f.name))parts.set(f.name,(async()=>{const url=new URL(f.bundle,root);const adapter=await import(new URL('ink-gpu.mjs',url));return adapter.loadInk(url,{gpu,backend,...options});})());return parts.get(f.name);}
 return {manifest,createState:()=>cpu.create(),createJavaScriptState:()=>{if(!js.createState)throw Error('no state declarations');return js.createState();},restoreState:bytes=>cpu.restore(bytes),
  async call(name,args,{backend:chosen=backend,...callOptions}={}){
   if(!['auto','gpu','cpu','javascript'].includes(chosen))throw Error('invalid backend');
   const f=manifest.functions.find(f=>f.name===name);if(!f)throw Error(`unknown Ink function ${name}`);
   if(chosen==='javascript')return {value:js.call(name,args),backend:'javascript',reason:'explicit backend selection'};
   if(f.gpu&&chosen!=='cpu'){try{const host=await part(f);return await(host.call?host.call(name,args,{backend:chosen,...callOptions}):host.run(name,args,chosen));}catch(e){return {value:pure.pure(name,args),backend:'cpu',reason:`GPU fallback: ${e.message}`};}}
   return {value:pure.pure(name,args),backend:'cpu',reason:f.fallback_reason??'explicit backend selection'};
  },dispose(){pure.dispose();for(const pending of parts.values())pending.then(p=>p.dispose?.()).catch(()=>{});parts.clear();}
 };
}

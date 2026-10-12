// Run browser bundles under Node with Dawn's WebGPU (npm package `webgpu`).
// INK_NODE_WEBGPU names the package entry when it is not resolvable from here.
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
export async function installWebGpu() {
  const spec=process.env.INK_NODE_WEBGPU??'webgpu';
  const {create,globals}=await import(spec.startsWith('/')?pathToFileURL(spec).href:spec);
  Object.assign(globalThis,globals);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:create([])}});
  const original=globalThis.fetch;
  // Bundles fetch their manifest, shaders and Wasm relative to their URL.
  globalThis.fetch=async(url,...rest)=>{
    const u=new URL(String(url));
    return u.protocol==='file:'?new Response(await readFile(fileURLToPath(u))):original(url,...rest);
  };
}
export async function loadBundle(dir, options={}) {
  const base=pathToFileURL(dir.endsWith('/')?dir:dir+'/');
  const {loadInk}=await import(new URL('ink-gpu.mjs',base).href);
  return loadInk(base.href,options);
}
// Small deterministic generator shared by the checks.
export function random(seed) {
  let s=BigInt(seed)||1n;
  const next=()=>{s^=s<<13n;s&=0xffffffffffffffffn;s^=s>>7n;s^=s<<17n;s&=0xffffffffffffffffn;return s;};
  return {
    u32:()=>Number(next()&0xffffffffn),
    below:n=>Number(next()%BigInt(n)),
    range:(lo,hi)=>lo+Number(next()%BigInt(hi-lo)),
    u64:()=>next(),
    chance:p=>Number(next()&0xffffn)/65536<p,
  };
}

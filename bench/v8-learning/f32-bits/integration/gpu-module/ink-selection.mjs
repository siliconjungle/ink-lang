// The native Rust decision implementation runs unchanged through Wasm.
let instance;
async function engine(){
 if(!instance)instance=(async()=>{const url=new URL('./ink-selection.wasm',import.meta.url);const bytes=url.protocol==='file:'?await(await import('node:fs/promises')).readFile(url):await(await fetch(url)).arrayBuffer();return(await WebAssembly.instantiate(bytes,{})).instance.exports})();
 return instance;
}
export async function selectionRequest(request){
 const e=await engine(), bytes=new TextEncoder().encode(JSON.stringify(request));
 if(bytes.length>4000000)throw Error('selection request byte budget');
 const ptr=e.ink_selection_alloc(bytes.length);if(!ptr)throw Error('selection allocation failed');let result;
 try{new Uint8Array(e.memory.buffer,ptr,bytes.length).set(bytes);result=e.ink_selection(ptr,bytes.length);}finally{e.ink_selection_free(ptr,bytes.length);}
 const out=Number(result&4294967295n),len=Number(result>>32n);let value;
 try{value=JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer,out,len)));}finally{e.ink_selection_free(out,len);}
 if(value.error)throw Error(value.error);return value;
}

// Complete-call attribution on an instrumented report-only host. A parent
// serial gate is required; no timers run during preparation or validation.
export async function attributeCalls(base,requests,{gate,consume,runtimeOptions={}}={}) {
 if(!gate?.authorized || !gate.instrumented_attribution)throw Error('exclusive instrumented attribution gate required');
 const receipt=await(await fetch(new URL('attribution-preparation.json',base))).json();
 const digest=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
 for(const[path,hash]of Object.entries(receipt.bindings)){const bytes=await(await fetch(new URL(path,base))).arrayBuffer();if(await digest(bytes)!==hash)throw Error('instrumented bundle drift '+path)}
 if(gate.original_host_sha256!==receipt.original_host_sha256)throw Error('parent gate host mismatch');
 const stack=[],spans=[];globalThis.__INK_TRANSPORT_ATTRIBUTION__={span(name,fn){const parent=stack.at(-1)??null,id=spans.length,span={id,parent,name,start:performance.now()};spans.push(span);stack.push(id);try{return fn()}finally{span.end=performance.now();span.elapsed_ms=span.end-span.start;stack.pop()}}};
 const {loadInk}=await import(new URL('ink-compute.mjs',base));const runtime=await loadInk(base,{gpu:true,policy:'static',staticBackend:'cpu',...runtimeOptions}),calls=[];
 try {for(const request of requests){spans.length=0;const start=performance.now(),pending=runtime.call(request.name,request.args,{backend:request.backend}),submitted=performance.now();const result=await pending,returned=performance.now(),checksum=consume(result.value),end=performance.now();calls.push({name:request.name,backend:request.backend,submission_ms:submitted-start,return_ms:returned-start,consumer_ms:end-returned,total_ms:end-start,checksum,spans:spans.map(x=>({...x})),actual_backend:result.backend,counters:result.counters})}}
 finally{await runtime.close();delete globalThis.__INK_TRANSPORT_ATTRIBUTION__}
 return {status:'passed',instrumented:true,excluded_from_performance_comparisons:true,receipt,calls};
}

const ROUTE={"schema":1,"semantics":"ink-literal-source-routing-v1","input_core_sha256":"e1202e78516ae2d9673021d209b868ae2d4f909a6df65189fc6b566c53fbe602","entry":"entry","stages":[{"id":"s0","function":"bulk","backend":"gpu","domain":"gpu","arguments":[{"Input":0},{"Input":1}]},{"id":"s1","function":"finish","backend":"c","domain":"cpu","arguments":[{"Stage":"s0"},{"Input":2}]}],"output":{"Stage":"s1"}};
// ROUTE is compiler-emitted from an immutable checked witness, not a runtime
// optimisation proposal. Loading code/assets faithfully remains host trust.
import {loadInk} from './ink-gpu.mjs';
export async function loadRoute(base,options={}){
  const engine=await loadInk(base,{...options,backend:'cpu'});
  try{
    const manifest=engine.manifest,functions=new Map(manifest.functions.map(f=>[f.name,f]));
    const route=ROUTE,entry=functions.get(route.entry),types=new Map();
    if(route.schema!==1||route.semantics!=='ink-literal-source-routing-v1'||route.input_core_sha256!==manifest.core_sha256||!entry||route.stages.length>32)throw Error('incompatible compiled source route');
    function refType(r){
      if(Object.hasOwn(r,'Input'))return entry.params[r.Input]?.type;
      if(Object.hasOwn(r,'Stage'))return types.get(r.Stage);
      if(r.Literal){const keys=Object.keys(r.Literal);if(keys.length===1)return {U32:'u32',U64:'u64',Bool:'bool'}[keys[0]];}
      throw Error('invalid compiled route reference');
    }
    for(const s of route.stages){
      const f=functions.get(s.function);
      if(types.has(s.id)||!f||!((s.backend==='c'&&s.domain==='cpu')||(s.backend==='gpu'&&s.domain==='gpu'))||s.arguments.length!==f.params.length||s.arguments.some((r,i)=>refType(r)!==f.params[i].type))throw Error('invalid compiled stage or typed edge');
      types.set(s.id,f.result);
    }
    if(refType(route.output)!==entry.result)throw Error('invalid compiled route result');
    let serial=Promise.resolve(),closed=false;
    function literal(r){if(Object.hasOwn(r,'U64'))return BigInt(r.U64);if(Object.hasOwn(r,'U32'))return r.U32;if(Object.hasOwn(r,'Bool'))return r.Bool;throw Error('invalid literal');}
    return {
      entry:route.entry,
      run(args){
        // Capture and validate the original signature synchronously, before any
        // asynchronous queue/device work; caller mutations cannot affect inputs.
        let owned,start=performance.now();try{if(closed)throw Error('Ink route runtime is closed');owned=engine.capture(route.entry,args);}catch(e){return Promise.reject(e);}
        const captureMs=performance.now()-start,submitted=performance.now();
        const pending=serial.then(async()=>{
          const start=performance.now(),values=new Map(),stages=[];
          const resolve=r=>Object.hasOwn(r,'Input')?owned[r.Input]:Object.hasOwn(r,'Stage')?values.get(r.Stage):literal(r.Literal);
          for(const s of route.stages){
            const bridgeStart=performance.now(),arguments_=s.arguments.map(resolve),bridgeMs=performance.now()-bridgeStart;
            const runStart=performance.now(),result=await engine.run(s.function,arguments_,s.domain==='cpu'?'cpu':'gpu');
            values.set(s.id,result.value);stages.push({id:s.id,function:s.function,requested:s.domain,backend:result.backend,reason:result.reason,bridge_ms:bridgeMs,execution_ms:performance.now()-runStart});
          }
          return {value:resolve(route.output),stages,capture_ms:captureMs,queue_ms:start-submitted,execution_ms:performance.now()-start,total_ms:performance.now()-submitted+captureMs,scope:'pure values; scalar stage results materialise on host; physical ABI and backends trusted'};
        });
        serial=pending.catch(()=>{});return pending;
      },
      async close(){closed=true;await serial;await engine.close();},
    };
  }catch(e){await engine.close();throw e;}
}

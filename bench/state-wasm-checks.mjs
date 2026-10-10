// Shared by Node and an actual browser. No Node APIs or numeric JSON rounding.
import {AbiError, StatefulModule, parseExactJSON, stringifyExactJSON} from '../lowerings/wasm/runtime/state-wasm.mjs';
const MAX=0xffffffffffffffffn;
const text=new TextDecoder('utf-8',{fatal:true});
const encoder=new TextEncoder();
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export function checker() {
  let checks=0;
  return {
    get checks(){return checks;},
    assert(ok,label){checks++;if(!ok)throw new Error(label);},
    equal(a,b,label){this.assert(stringifyExactJSON(canonical(a))===stringifyExactJSON(canonical(b)),label);},
    bytes(a,b,label){this.assert(a.length===b.length && a.every((v,i)=>v===b[i]),label);},
    throws(fn,label,pattern){let error;try{fn();}catch(e){error=e;}this.assert(!!error && (!pattern||pattern.test(error.message)),label+(error?' ('+error.message+')':': no error')); return error;}
  };
}
export function checkCodec() {
  const c=checker();
  for(const input of [null,true,false,'🌱 世界 \"\\\n\t\u0000',[0n,-1n,MAX,1n<<128n],{x:MAX,y:[false,null,'escaped']}]) {
    c.equal(parseExactJSON(stringifyExactJSON(input)),input,'exact JSON roundtrip');
  }
  for(const input of ['', '01','-01','[1,]','{"x":1,}','1 2','true!','"unterminated','"\n"','1e999','[', 'NaN', 'undefined'])c.throws(()=>parseExactJSON(input),'reject malformed JSON');
  for(const input of [Number.MAX_SAFE_INTEGER+1,1.5,NaN,Infinity,undefined,()=>{},new Date(),Array(2)])c.throws(()=>stringifyExactJSON(input),'reject invalid request value');
  const cycle={};cycle.self=cycle;c.throws(()=>stringifyExactJSON(cycle),'reject cycle');
  c.equal(parseExactJSON('1.25e2'),125,'fractional tokens parsed for validation by callee');
  c.assert(Object.getPrototypeOf(parseExactJSON('{"__proto__":{"polluted":true}}'))===Object.prototype,'prototype unchanged');
  c.assert(!({}).polluted,'no prototype pollution');
  c.equal(parseExactJSON('{"__proto__":7}')['__proto__'],7n,'prototype key preserved');
  let deep=0n;for(let i=0;i<130;i++)deep=[deep];
  c.throws(()=>stringifyExactJSON(deep),'encoder depth limit');
  c.throws(()=>parseExactJSON('['.repeat(130)+'0'+']'.repeat(130)),'decoder depth limit');
  return {checks:c.checks,status:'passed'};
}
async function reseal(bytes) {
  bytes.set(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice(0,-32))),bytes.length-32);
  return bytes;
}
function trapFixture() {
  const section=(tag,body)=>[tag,body.length,...body];
  const exportEntry=(name,kind,index)=>[name.length,...encoder.encode(name),kind,index];
  return new Uint8Array([0,97,115,109,1,0,0,0,
    ...section(1,[1,96,0,1,127]),...section(3,[2,0,0]),...section(5,[1,0,1]),
    ...section(7,[3,...exportEntry('lang_abi_version',0,0),...exportEntry('lang_init',0,1),...exportEntry('memory',2,0)]),
    ...section(10,[2,4,0,65,1,11,3,0,0,11])]);
}
export async function verifyMode({name,wasm,fixture,nativeMiddle,wrongSnapshot}) {
  const c=checker();let calls=0;
  const module=await StatefulModule.instantiate(wasm);
  const json=file=>parseExactJSON(text.decode(fixture[file]));
  const run=(state,label)=>{
    const script=json(label+'-script.json'),expected=json(label+'-expected.json');
    c.assert(script.length===expected.length,label+' fixture length');
    for(let i=0;i<script.length;i++) {
      const {call,args}=script[i];
      c.equal(state.invoke(call,args),expected[i],`${name}: ${label} call ${i} (${call})`);calls++;
    }
  };
  let state=module.restore(fixture['before.bin']);
  c.bytes(state.snapshot(),fixture['before.bin'],'reference -> Wasm snapshot');
  run(state,'middle');
  c.bytes(state.snapshot(),fixture['middle.bin'],'Wasm middle == reference');
  c.bytes(state.snapshot(),nativeMiddle,'Wasm middle == native');
  state.dispose();c.throws(()=>state.version(),'disposed state rejected');
  state=module.restore(nativeMiddle);
  run(state,'tail');
  c.bytes(state.snapshot(),fixture['tail.bin'],'native -> Wasm tail == reference');
  c.equal(state.events(),json('outbox-expected.json'),'complete ordered pending outbox');
  c.equal(state.events(),json('outbox-expected.json'),'reading outbox is non-destructive');
  const version=state.version();
  c.equal(version,json('metadata.json').version_before_acknowledgement,'exact version');
  state.acknowledge(version-1n,MAX);
  const returnSnapshot=state.snapshot();
  c.bytes(returnSnapshot,fixture['acknowledged.bin'],'acknowledgement snapshot == reference');
  run(state,'future');
  c.bytes(state.snapshot(),fixture['future.bin'],'future observations after acknowledgement');
  state.dispose();

  // Keep an existing state's complete snapshot constant across host/ABI failures.
  const live=module.restore(fixture['tail.bin']);
  const unchanged=()=>c.bytes(live.snapshot(),fixture['tail.bin'],'failure leaves existing state unchanged');
  const corrupt=fixture['tail.bin'].slice();corrupt[corrupt.length-1]^=1;
  c.throws(()=>module.restore(corrupt),'checksum rejected',/integrity|checksum/);unchanged();
  c.throws(()=>module.restore(wrongSnapshot),'wrong program rejected',/program|schema/);unchanged();
  for(const [call,args] of [['missing',[]],['restock',[]],['restock',[false,1n]],['restock',[0n,1.5]],['restock',[0n,Number.MAX_SAFE_INTEGER+1]]]) {
    c.throws(()=>live.invoke(call,args),'invalid invocation rejected');unchanged();
  }
  c.throws(()=>live.acknowledge(-1n,0n),'negative acknowledgement rejected');unchanged();
  for(const raw of ['{', '{}','{"call":"restock"}','{"call":"restock","args":[0,1.5]}']) {
    const buffer=module.input(encoder.encode(raw));
    try {const error=c.throws(()=>module.response(module.call('lang_invoke',live.handle,buffer)>>>0),'raw invalid request rejected');c.assert(error instanceof AbiError && error.committed===false,'error reports no commit');}
    finally {module.release(buffer);}
    unchanged();
  }
  const oversized=module.input(new Uint8Array(4*1024*1024+1));
  try {c.throws(()=>module.response(module.call('lang_invoke',live.handle,oversized)>>>0),'oversized request rejected',/4 MiB/);}finally{module.release(oversized);}
  unchanged();
  const initialMemory=module.exports.memory.buffer.byteLength;
  const grown=module.input(new Uint8Array(initialMemory+65536));
  c.assert(module.exports.memory.buffer.byteLength>initialMemory,'allocation grows memory');
  module.release(grown);unchanged();
  const handle=module.input(new Uint8Array([1,2,3]));module.release(handle);
  c.assert(module.call('lang_buffer_free',handle)===0,'double free rejected');
  c.assert(module.call('lang_buffer_ptr',handle)===0,'stale pointer rejected');
  c.assert(module.call('lang_state_drop',handle)===0,'buffer handle cannot drop state');
  c.assert(module.call('lang_buffer_free',live.handle)===0,'state handle cannot free buffer');
  c.assert(module.call('lang_buffer_alloc',64*1024*1024+1)===0,'oversized allocation rejected');
  unchanged();

  const handles=[];
  for(let i=0;i<256;i++){const h=module.call('lang_buffer_alloc',0)>>>0;c.assert(h!==0,'buffer slot allocation');handles.push(h);}
  c.assert(module.call('lang_buffer_alloc',0)===0,'buffer count limit enforced');
  // Call preflight must fail before executing a mutating operation when no output slot exists.
  c.assert(module.call('lang_invoke',live.handle,handles[0])===0,'output slot preflight');
  for(const h of handles)module.release(h);unchanged();
  const states=[];for(let i=0;i<127;i++)states.push(module.create());
  c.throws(()=>module.create(),'state count limit enforced',/state handle limit/);
  for(const s of states)s.dispose();unchanged();

  const last=json('tail-script.json');
  const create=last.findLast(step=>step.call==='create');
  const key=create.args[0];
  const request=module.input(encoder.encode(stringifyExactJSON({call:'restock',args:[key,0n]})));
  const blocked=module.call('lang_buffer_alloc',64*1024*1024)>>>0;
  c.assert(blocked!==0,'large retained buffer allocated');
  c.assert(module.call('lang_invoke',live.handle,request)===0,'byte capacity preflight prevents change');
  module.release(blocked);module.release(request);unchanged();
  live.dispose();

  // Version and event counters cross both the JS Number and Wasm signed-i64 boundaries.
  for(const high of [1n<<53n,1n<<63n,MAX]) {
    const bytes=fixture['tail.bin'].slice();new DataView(bytes.buffer).setBigUint64(84,high,true);await reseal(bytes);
    const highState=module.restore(bytes);c.equal(highState.version(),high,'restore exact high version');
    if(high===MAX) {
      const error=c.throws(()=>highState.invoke('restock',[key,0n]),'commit sequence exhaustion',/commit sequence/);
      c.assert(error.committed===false,'exhaustion not committed');
      c.bytes(highState.snapshot(),bytes,'exhaustion rolls back write and staged event');
    } else {
      const result=highState.invoke('restock',[key,0n]);
      c.assert(result.committed,'high-version successful change');
      c.equal(result.version,high+1n,'exact returned commit number');
      c.equal(result.events[0].commit,high+1n,'exact event commit number');
      c.equal(highState.version(),high+1n,'unsigned i64 version result');
      highState.acknowledge(high+1n,MAX);c.equal(highState.events(),[],'unsigned i64 acknowledgement');
    }
    highState.dispose();
  }
  const trap=await StatefulModule.instantiate(trapFixture());
  c.throws(()=>trap.create(),'actual Wasm unreachable traps');
  c.assert(trap.trapped,'trapped instance poisoned');
  c.throws(()=>trap.call('lang_abi_version'),'poisoned instance refuses reuse',/fresh instance/);
  const fresh=await StatefulModule.instantiate(wasm),recovered=fresh.restore(returnSnapshot);
  c.bytes(recovered.snapshot(),returnSnapshot,'fresh instance restores saved checkpoint');recovered.dispose();
  return {name,status:'passed',checks:c.checks,calls,returnSnapshot,finalSnapshot:fixture['future.bin']};
}

// Browser/Node host adapter. No Node-specific imports; integers stay exact.
export function stringifyExactJSON(value) {
  const seen=new Set();
  function encode(value,depth) {
    if(depth>128) throw new RangeError('JSON nesting limit');
    if(value===null) return 'null';
    if(typeof value==='bigint') return value.toString();
    if(typeof value==='number') {
      if(!Number.isSafeInteger(value)) throw new RangeError('Use BigInt for integers outside the safe Number range');
      return String(value);
    }
    if(typeof value==='string'||typeof value==='boolean') return JSON.stringify(value);
    if(typeof value!=='object') throw new TypeError('Unsupported JSON value');
    if(seen.has(value)) throw new TypeError('Cyclic JSON value');
    seen.add(value);
    try {
      if(Array.isArray(value)) {
        for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw new TypeError('Sparse JSON array');
        return '['+value.map(v=>encode(v,depth+1)).join(',')+']';
      }
      if(Object.getPrototypeOf(value)!==Object.prototype && Object.getPrototypeOf(value)!==null) throw new TypeError('Expected a plain JSON object');
      return '{'+Object.entries(value).map(([key,v])=>JSON.stringify(key)+':'+encode(v,depth+1)).join(',')+'}';
    } finally {seen.delete(value);}
  }
  return encode(value,0);
}
export function parseExactJSON(text) {
  let position=0;
  const fail=()=>{throw new SyntaxError('Invalid JSON at '+position);};
  const space=()=>{while(' \n\r\t'.includes(text[position]) && position<text.length)position++;};
  function string() {
    const start=position++;
    while(position<text.length) {
      const c=text[position++];
      if(c==='"') return JSON.parse(text.slice(start,position));
      if(c==='\\')position++;
    }
    fail();
  }
  function value(depth) {
    if(depth>128)throw new RangeError('JSON nesting limit');
    space();const c=text[position];
    if(c==='"')return string();
    if(c==='[') {
      position++;const result=[];space();
      if(text[position]===']'){position++;return result;}
      while(true){result.push(value(depth+1));space();const next=text[position++];if(next===']')return result;if(next!==',')fail();}
    }
    if(c==='{') {
      position++;const result={};space();
      if(text[position]==='}'){position++;return result;}
      while(true) {
        space();if(text[position]!=='"')fail();const key=string();space();if(text[position++]!==':')fail();
        Object.defineProperty(result,key,{value:value(depth+1),enumerable:true,writable:true,configurable:true});
        space();const next=text[position++];if(next==='}')return result;if(next!==',')fail();
      }
    }
    for(const [token,result] of [['true',true],['false',false],['null',null]]) {
      if(text.startsWith(token,position)){position+=token.length;return result;}
    }
    const match=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(position));
    if(!match)fail();position+=match[0].length;
    if(/^-?[0-9]+$/.test(match[0]))return BigInt(match[0]);
    const number=Number(match[0]);if(!Number.isFinite(number))fail();return number;
  }
  const result=value(0);space();if(position!==text.length)fail();return result;
}
export class AbiError extends Error {
  constructor(message,committed=false){super(message);this.name='AbiError';this.committed=committed;}
}
export class StatefulModule {
  constructor(instance) {
    this.instance=instance;this.exports=instance.exports;this.trapped=false;
    if(this.exports.lang_abi_version?.()!==1)throw new AbiError('Unsupported stateful Wasm ABI');
    if(!(this.exports.memory instanceof WebAssembly.Memory))throw new AbiError('Missing Wasm memory');
    this.encoder=new TextEncoder();this.decoder=new TextDecoder('utf-8',{fatal:true});
  }
  static async instantiate(source) {
    const module=source instanceof WebAssembly.Module?source:await WebAssembly.compile(source);
    if(WebAssembly.Module.imports(module).length)throw new AbiError('This ABI expects a module without host imports');
    return new StatefulModule(await WebAssembly.instantiate(module,{}));
  }
  call(name,...args) {
    if(this.trapped)throw new AbiError('Wasm instance trapped; restore a checkpoint in a fresh instance');
    try{return this.exports[name](...args);}catch(error){if(error instanceof WebAssembly.RuntimeError)this.trapped=true;throw error;}
  }
  release(handle) {if(!this.trapped && this.call('lang_buffer_free',handle)!==1)throw this.error();}
  error() {
    const handle=this.call('lang_error')>>>0;
    if(!handle)return new AbiError('Wasm ABI resource limit');
    return new AbiError(this.decoder.decode(this.take(handle)));
  }
  take(handle) {
    if(!handle)throw this.error();
    try {
      const ptr=this.call('lang_buffer_ptr',handle)>>>0;
      const len=this.call('lang_buffer_len',handle)>>>0;
      // Every export may grow memory. Always create a new view and copy before free.
      return new Uint8Array(this.exports.memory.buffer,ptr,len).slice();
    } finally {this.release(handle);}
  }
  input(bytes) {
    if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw new RangeError('Expected at most 64 MiB of bytes');
    const handle=this.call('lang_buffer_alloc',bytes.length)>>>0;
    if(!handle)throw this.error();
    const ptr=this.call('lang_buffer_ptr',handle)>>>0;
    new Uint8Array(this.exports.memory.buffer,ptr,bytes.length).set(bytes);
    return handle;
  }
  response(handle) {
    const message=parseExactJSON(this.decoder.decode(this.take(handle)));
    if(message.error)throw new AbiError(message.error.message,message.error.committed);
    if(!Object.hasOwn(message,'ok'))throw new AbiError('Malformed Wasm response');
    return message.ok;
  }
  create() {const handle=this.call('lang_init')>>>0;if(!handle)throw this.error();return new StateInstance(this,handle);}
  restore(bytes) {
    const buffer=this.input(bytes);
    try {const handle=this.call('lang_restore',buffer)>>>0;if(!handle)throw this.error();return new StateInstance(this,handle);}
    finally {this.release(buffer);}
  }
}
export class StateInstance {
  constructor(module,handle){this.module=module;this.handle=handle;this.disposed=false;}
  live(){if(this.disposed)throw new AbiError('State handle was disposed');}
  invoke(call,args) {
    this.live();const m=this.module;
    const bytes=m.encoder.encode(stringifyExactJSON({call,args}));
    if(bytes.length>4*1024*1024)throw new RangeError('Request exceeds 4 MiB');
    const input=m.input(bytes);
    try{return m.response(m.call('lang_invoke',this.handle,input)>>>0);}
    finally{m.release(input);}
  }
  snapshot(){this.live();return this.module.take(this.module.call('lang_checkpoint',this.handle)>>>0);}
  events(){this.live();return this.module.response(this.module.call('lang_events',this.handle)>>>0);}
  version(){this.live();return BigInt.asUintN(64,this.module.call('lang_version',this.handle));}
  acknowledge(commit,position) {
    this.live();for(const n of [commit,position])if(typeof n!=='bigint'||n<0n||n>0xffffffffffffffffn)throw new RangeError('Acknowledgement requires unsigned 64-bit BigInt values');
    if(this.module.call('lang_acknowledge',this.handle,commit,position)!==1)throw this.module.error();
  }
  dispose(){this.live();if(this.module.call('lang_state_drop',this.handle)!==1)throw this.module.error();this.disposed=true;}
}

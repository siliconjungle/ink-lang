// Shared packed value transport. Executed by every browser host.
const MAX_BYTES=256*1024*1024;
const fail=s=>{throw Error(s)};
export function width(t,depth=0) {
  if(depth>32||!t||typeof t!=='object')fail('invalid packed type');
  if(t.kind==='list') {if(depth!==0)fail('nested packed list');return width(t.element,depth+1);}
  if(t.kind==='vector') {if(!Number.isSafeInteger(t.size)||t.size<1)fail('invalid vector size');const n=t.size*width(t.element,depth+1);if(!Number.isSafeInteger(n))fail('packed width overflow');return n;}
  if(t.kind==='record') {if(!Array.isArray(t.fields)||!t.fields.length||new Set(t.fields.map(f=>f.name)).size!==t.fields.length||t.fields.some(f=>typeof f.name!=='string'))fail('invalid packed record');const n=t.fields.reduce((n,f)=>n+width(f.type,depth+1),0);if(!Number.isSafeInteger(n))fail('packed width overflow');return n;}
  if(t.kind==='u64'||t.kind==='f64')return 2;
  if(['u32','i32','f32','bool'].includes(t.kind))return 1;
  fail('unsupported packed type');
}

export function pack(v, t) {
  const stride=width(t);
  if(t.kind==='list'&&(!Array.isArray(v)&&!ArrayBuffer.isView(v)&&!(v instanceof Uint32Array)))fail('expected list');
  if((t.kind==='list'?v.length:1)*stride*4>MAX_BYTES)fail('input exceeds 256 MiB budget');
  if(t.kind === 'list' && t.element.kind === 'u32') {
    if(v.length * 4 > MAX_BYTES) fail('input exceeds 256 MiB budget');
    if(!(v instanceof Uint32Array)&&v.some(x=>!Number.isInteger(x)||x<0||x>4294967295))fail('u32 outside range');
    return {words:v instanceof Uint32Array ? v.slice() : Uint32Array.from(v),type:t,count:v.length,finite:true};
  }
  const words = [],
    view = new DataView(new ArrayBuffer(8));
  let finite = true;
  function go(v, t) {
    switch (t.kind) {
      case "list":
        for (const x of v) go(x, t.element);
        break;
      case "vector":
        if((!Array.isArray(v)&&!ArrayBuffer.isView(v))||v.length!==t.size)fail("vector dimension mismatch");
        for (const x of v) go(x, t.element);
        break;
      case "record":
        if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).length!==t.fields.length||t.fields.some(f=>!Object.hasOwn(v,f.name)))fail("record fields mismatch");
        for (const f of t.fields) {
          go(v[f.name], f.type);
        }
        break;
      case "bool":
        if(typeof v!=="boolean")fail("expected Bool");
        words.push(+v);
        break;
      case "u32":
      case "i32":
        if(!Number.isInteger(v)||v<(t.kind==="u32"?0:-2147483648)||v>(t.kind==="u32"?4294967295:2147483647))fail("integer outside range");
        words.push(v >>> 0);
        break;
      case "u64": {
        if(typeof v==="number"&&!Number.isSafeInteger(v))fail("u64 needs an exact integer or decimal string");
        if(!["number","string","bigint"].includes(typeof v))fail("expected u64");
        const n = BigInt(v);if(n<0n||n>18446744073709551615n)fail("u64 outside range");
        words.push(Number(n & 4294967295n), Number(n >> 32n));
        break;
      }
      case "f64": {
        let bits;
        if(typeof v==='number'&&Number.isFinite(v)){view.setFloat64(0,v,true);bits=view.getBigUint64(0,true);}
        else{
          if(!v||typeof v!=='object'||Object.keys(v).length!==1||!Object.hasOwn(v,'F64Bits'))fail('invalid F64Bits');const text=v.F64Bits;
          if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))fail('invalid F64Bits');
          bits=BigInt(text);if(bits>18446744073709551615n)fail('invalid F64Bits');
          view.setBigUint64(0,bits,true);finite &&= Number.isFinite(view.getFloat64(0,true));
        }
        words.push(Number(bits&4294967295n),Number(bits>>32n));break;
      }
      case "f32":
        if (typeof v === "number") {
          view.setFloat32(0, v, true);
          if(!Number.isFinite(view.getFloat32(0,true)))fail("f32 input overflow");
          words.push(view.getUint32(0, true));
        } else {
          if(!v||typeof v!=="object"||Object.keys(v).length!==1||!Number.isInteger(v.F32Bits)||v.F32Bits<0||v.F32Bits>4294967295)fail("invalid F32Bits");
          view.setUint32(0, v.F32Bits, true);
          finite &&= Number.isFinite(view.getFloat32(0, true));
          words.push(v.F32Bits);
        }
        break;
      default:
        fail("unsupported packed type");
    }
  }
  go(v, t);
  if (words.length * 4 > MAX_BYTES) fail("input exceeds 256 MiB budget");
  return {
    words: Uint32Array.from(words),
    type: t,
    count: t.kind === "list" ? v.length : 1,
    finite,
  };
}
export function unpack(words, t, native = false, destination = null) {
  const stride=width(t);if(words.length%stride||t.kind!=="list"&&words.length!==stride)fail("invalid result layout");
  let i = 0;
  const view = new DataView(new ArrayBuffer(8));
  function go(t) {
    switch (t.kind) {
      case "list": {
        const n = words.length / width(t.element);
        if (!Number.isInteger(n)) fail("invalid result layout");
        if(destination){if(destination.length<n)fail("destination capacity");for(let j=0;j<n;j++)destination[j]=go(t.element);return destination;}
        return Array.from({ length: n }, () => go(t.element));
      }
      case "vector":
        return Array.from({ length: t.size }, () => go(t.element));
      case "record":
        return Object.fromEntries(t.fields.map((f) => [f.name, go(f.type)]));
      case "bool":
        return words[i++] !== 0;
      case "u32":
        return words[i++];
      case "i32":
        return words[i++] | 0;
      case "u64": {
        const n = BigInt(words[i++]) + (BigInt(words[i++]) << 32n);
        return native ? n : n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n.toString();
      }
      case "f64": {
        const bits=BigInt(words[i++])|(BigInt(words[i++])<<32n);
        view.setBigUint64(0,bits,true);const value=view.getFloat64(0,true);
        return Number.isFinite(value)?value:{F64Bits:bits.toString()};
      }
      case "f32":
        view.setUint32(0, words[i++], true);
        return Number.isFinite(view.getFloat32(0, true))
          ? view.getFloat32(0, true)
          : { F32Bits: view.getUint32(0, true) };
      default:
        fail("invalid result type");
    }
  }
  return go(t);
}

const __nativeF32=true;
// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
// Native binary32 lane for pure modules. Explicit NaN payloads remain tagged;
// arithmetic canonicalizes NaNs just as __bits does in the exact-bit lane.
const __nfValue = value => typeof value === 'number' ? Math.fround(value) : value;
const __nfNumber = value => typeof value === 'number' ? Math.fround(value) : __float(value.F32Bits);
const __nfBits = value => typeof value === 'number' ? __bits(value) : value.F32Bits;
const __nfFromBits = bits => (bits & 0x7fffffff)>0x7f800000 ? {F32Bits:bits} : __float(bits);
const __nfNeg = value => typeof value === 'number' && !Number.isNaN(value) ? -value : {F32Bits:(__nfBits(value) ^ 0x80000000) >>> 0};
const __nfOutput = value => {const n=typeof value==='number'?Math.fround(value):__float(value.F32Bits);return Number.isFinite(n)?n:{F32Bits:__nfBits(value)};};
const __identity = value => value;
// Intern declared conversion schemas once. An invocation owns one WeakMap per
// schema instead of allocating a Map for every converted record/list node.
const __conversionKeys = new Map();
function __representation(type, output, capture=false) {
  const convert=__representationRaw(type,output,capture);
  if(convert===__identity)return convert;
  // Conversion identity is invocation-local: callers may reuse a mutable host
  // object in a later call. Distinct declared schemas have distinct memo keys.
  const schema=(output?'out:':capture?'capture:':'in:')+JSON.stringify(type);
  let key=__conversionKeys.get(schema);
  if(!key){key={};__conversionKeys.set(schema,key);}
  return (value,context)=>{
    if(!context||!value||typeof value!=='object')return convert(value,context);
    let entries=context.get(key);
    if(!entries){entries=new WeakMap();context.set(key,entries);}
    if(entries.has(value))return entries.get(value);
    const result=convert(value,context);
    entries.set(value,result);return result;
  };
}
function __representationRaw(type, output, capture) {
  switch (type.kind) {
    case 'ref': {
      let resolved;
      return (value,context)=>(resolved??=__representation(__namedTypes[type.name],output,capture))(value,context);
    }
    case 'id': return value=>value.toLowerCase();
    case 'int': return output ? value=>({Int:value.toString()}) : value=>BigInt(value && typeof value==='object' ? value.Int : value);
    case 'option': {
      const item=__representation(type.element,output,capture);
      return item===__identity?__identity:(value,context)=>Object.hasOwn(value,'Some')?{Some:item(value.Some,context)}:{None:null};
    }
    case 'result': {
      const ok=__representation(type.ok,output,capture),err=__representation(type.error,output,capture);
      return ok===__identity&&err===__identity?__identity:(value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)};
    }
    case 'f32': if(typeof __nativeF32!=='undefined'&&__nativeF32)return output?__nfOutput:capture?__nfValue:__identity;
      return output ? value => {
      const number = __float(value);
      return Number.isFinite(number) ? number : {F32Bits:value};
    } : value => typeof value === 'number' ? __bits(value) : value.F32Bits;
    case 'list': case 'vector': {
      const element = __representation(type.element, output,capture);
      return element === __identity ? __identity : (value,context) => Array.from(value, item=>element(item,context));
    }
    case 'record': {
      const fields = type.fields.map(field => [field.name, __representation(field.type, output,capture)]);
      return fields.every(([,convert]) => convert === __identity) ? __identity :
        (value,context) => {
          const result={};
          for(const [name,convert] of fields){
            const field=convert(value[name],context);
            // Assignment treats __proto__ specially; records require an own
            // ordinary writable data property, as Object.fromEntries supplied.
            if(name==='__proto__')Object.defineProperty(result,name,{value:field,writable:true,enumerable:true,configurable:true});
            else result[name]=field;
          }
          return result;
        };
    }
    default: return __identity;
  }
}
// Fixed primitives; no cross-invocation host caches.
function __ink_round_even(x){if(!Number.isFinite(x)||Math.abs(x)>=8388608)return x;const a=Math.abs(x),i=Math.floor(a),r=a-i;const y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;}
// Direct BigInt -> binary32 avoids double rounding through binary64.
function __ink_big_float(x){if(x===0n)return 0;const neg=x<0n;if(neg)x=-x;let e=x.toString(2).length-1;if(e<=23)return Number(neg?-x:x);const shift=BigInt(e-23),mask=(1n<<shift)-1n;let q=x>>shift;const rem=x&mask,half=1n<<(shift-1n);if(rem>half||(rem===half&&(q&1n)!==0n))q++;if(q===16777216n){q>>=1n;e++;}if(e>127)return neg?-Infinity:Infinity;return (neg?-1:1)*Number(q)*2**(e-23);}
function __ink_from_float(x,t){x=Math.trunc(x);if(!Number.isFinite(x))return {None:null};const valid=t==='i32'?x>=-2147483648&&x<2147483648:x>=0&&x<(t==='u32'?4294967296:18446744073709551616);return valid?{Some:t==='u64'?BigInt(x):x===0?0:x}:{None:null};}
function __ink_count(x,n,width){if(width===64){x=BigInt.asUintN(64,x);if(n==='popcount'){let count=0;while(x){x&=x-1n;count++;}return count;}if(x===0n)return 64;if(n==='leading_zeros')return 64-x.toString(2).length;let count=0;while((x&1n)===0n){x>>=1n;count++;}return count;}x>>>=0;if(n==='leading_zeros')return Math.clz32(x);if(n==='trailing_zeros')return x===0?32:31-Math.clz32((x&-x)>>>0);x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24;}
const __ink_encoder=new TextEncoder(),__ink_decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const __ink_bytes=s=>__ink_encoder.encode(s);
const __ink_boundary=(b,i)=>i<=b.length&&(i===b.length||(b[i]&0xc0)!==0x80);
function __ink_byte_at(s,i){const b=__ink_bytes(s);return i<b.length?{Some:b[i]}:{None:null};}
function __ink_slice(s,a,z){const b=__ink_bytes(s);return a<=z&&__ink_boundary(b,a)&&__ink_boundary(b,z)?{Some:__ink_decoder.decode(b.subarray(a,z))}:{None:null};}
function __ink_concat(a,b){const s=a+b;if(__ink_bytes(s).length>4294967295)throw Error('String exceeds U32 byte length');return s;}
function __ink_find(s,needle,from){const b=__ink_bytes(s);if(!__ink_boundary(b,from))return {None:null};const tail=__ink_decoder.decode(b.subarray(from)),i=tail.indexOf(needle);return i<0?{None:null}:{Some:from+__ink_bytes(tail.slice(0,i)).length};}

function __ink_int_from_float(x){return Number.isFinite(x)?{Some:BigInt(Math.trunc(x))}:{None:null};}
function __fn0(v0){
const v1=v0;
const v2=v1.length;
const v3=new Array(v2);
for(let v4=0;v4<v2;v4++){
const v5=v1[v4];
const v6=v5;
const v7=__nfBits(__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(v6[0]))))));
const v8=v5;
const v9=v5;
const v10=__nfBits(__nfValue(Math.fround((__nfNumber(__nfValue(v8[0])))/(__nfNumber(__nfValue(v9[1]))))));
const v11=v5;
const v12=__nfBits(__nfValue(Math.fround(Math.floor(__nfNumber(__nfValue(v11[0]))))));
const v13=v5;
const v14=__nfBits(__nfValue(Math.fround(Math.ceil(__nfNumber(__nfValue(v13[0]))))));
const v15=v5;
const v16=__nfBits(__nfValue(Math.fround(Math.trunc(__nfNumber(__nfValue(v15[0]))))));
const v17=v5;
const v18=__nfBits(__nfValue(Math.fround(__ink_round_even(__nfNumber(__nfValue(v17[0]))))));
const v19=v5;
const v20=Number.isNaN(__nfNumber(__nfValue(v19[0])));
const v21=v5;
const v22=Number.isFinite(__nfNumber(__nfValue(v21[0])));
v3[v4]=({["root"]:v7,["quotient"]:v10,["floored"]:v12,["ceiled"]:v14,["truncated"]:v16,["rounded"]:v18,["nan"]:v20,["finite"]:v22});
}
return v3;}
function __fn1(v23){
const v24=__ink_from_float(__nfNumber(__nfValue(v23)), "u32");
const v25=__ink_from_float(__nfNumber(__nfValue(v23)), "u64");
const v26=__ink_from_float(__nfNumber(__nfValue(v23)), "i32");
const v27=__ink_int_from_float(__nfNumber(__nfValue(v23)));
return ({["unsigned"]:v24,["wide"]:v25,["signed"]:v26,["exact"]:v27});}
function __fn2(v28){
const v29=v28;
const v30=v29.length;
const v31=new Array(v30);
for(let v32=0;v32<v30;v32++){
const v33=v29[v32];
v31[v32]=__nfBits(__nfValue(Math.fround(__ink_big_float(v33))));
}
return v31;}
function __fn3(v34){
return __nfBits(__nfValue(Math.fround(v34)));}
function __fn4(v35){
return __nfBits(__nfValue(Math.fround(v35)));}
function __fn5(v36){
return __nfBits(__nfValue(Math.fround(__ink_big_float(v36))));}
function __fn6(v37){
const v38=v37;
const v39=v38.length;
const v40=new Array(v39);
for(let v41=0;v41<v39;v41++){
const v42=v38[v41];
const v43=__ink_count(v42,"popcount",64);
const v44=__ink_count(v42,"leading_zeros",64);
const v45=__ink_count(v42,"trailing_zeros",64);
v40[v41]=[v43,v44,v45];
}
return v40;}
function __fn7(v46){
const v47=__ink_count(v46,"popcount",32);
const v48=__ink_count(v46,"leading_zeros",32);
const v49=__ink_count(v46,"trailing_zeros",32);
return [v47,v48,v49];}
function __fn8(v50){
const v51=__ink_count(v50,"popcount",32);
const v52=__ink_count(v50,"leading_zeros",32);
const v53=__ink_count(v50,"trailing_zeros",32);
return [v51,v52,v53];}
function __fn9(v54){
return __ink_bytes(v54).length;}
function __fn10(v55,v56){
return __ink_byte_at(v55,v56);}
function __fn11(v57,v58,v59){
return __ink_slice(v57,v58,v59);}
function __fn12(v60,v61){
return __ink_concat(v60,v61);}
function __fn13(v62,v63,v64){
return __ink_find(v62,v63,v64);}
function __into0(v65,v66){
const v67=v65;
const v68=v67.length;
for(let v70=0;v70<v68;v70++){
const v71=v67[v70];
const v72=v71;
const v73=__nfBits(__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(v72[0]))))));
const v74=v71;
const v75=v71;
const v76=__nfBits(__nfValue(Math.fround((__nfNumber(__nfValue(v74[0])))/(__nfNumber(__nfValue(v75[1]))))));
const v77=v71;
const v78=__nfBits(__nfValue(Math.fround(Math.floor(__nfNumber(__nfValue(v77[0]))))));
const v79=v71;
const v80=__nfBits(__nfValue(Math.fround(Math.ceil(__nfNumber(__nfValue(v79[0]))))));
const v81=v71;
const v82=__nfBits(__nfValue(Math.fround(Math.trunc(__nfNumber(__nfValue(v81[0]))))));
const v83=v71;
const v84=__nfBits(__nfValue(Math.fround(__ink_round_even(__nfNumber(__nfValue(v83[0]))))));
const v85=v71;
const v86=Number.isNaN(__nfNumber(__nfValue(v85[0])));
const v87=v71;
const v88=Number.isFinite(__nfNumber(__nfValue(v87[0])));
v66[v70]=({["root"]:v73,["quotient"]:v76,["floored"]:v78,["ceiled"]:v80,["truncated"]:v82,["rounded"]:v84,["nan"]:v86,["finite"]:v88});
}
return v68;}
function __into2(v89,v90){
const v91=v89;
const v92=v91.length;
for(let v94=0;v94<v92;v94++){
const v95=v91[v94];
v90[v94]=__nfBits(__nfValue(Math.fround(__ink_big_float(v95))));
}
return v92;}
function __into6(v96,v97){
const v98=v96;
const v99=v98.length;
for(let v101=0;v101<v99;v101++){
const v102=v98[v101];
const v103=__ink_count(v102,"popcount",64);
const v104=__ink_count(v102,"leading_zeros",64);
const v105=__ink_count(v102,"trailing_zeros",64);
v97[v101]=[v103,v104,v105];
}
return v99;}
const __namedTypes={"Casts":{"fields":[{"name":"unsigned","type":{"element":{"kind":"u32"},"kind":"option"}},{"name":"wide","type":{"element":{"kind":"u64"},"kind":"option"}},{"name":"signed","type":{"element":{"kind":"i32"},"kind":"option"}},{"name":"exact","type":{"element":{"kind":"int"},"kind":"option"}}],"kind":"record","name":"Casts"},"Ops":{"fields":[{"name":"root","type":{"kind":"u32"}},{"name":"quotient","type":{"kind":"u32"}},{"name":"floored","type":{"kind":"u32"}},{"name":"ceiled","type":{"kind":"u32"}},{"name":"truncated","type":{"kind":"u32"}},{"name":"rounded","type":{"kind":"u32"}},{"name":"nan","type":{"kind":"bool"}},{"name":"finite","type":{"kind":"bool"}}],"kind":"record","name":"Ops"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"d2f5dfc60ccdee12b06eb954b25759c5dcb3948cd2cc3f1163bfc63b0e5504b0","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"float_ops","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f32"},"kind":"vector","size":2},"kind":"list"}}],"precondition":null,"result":{"element":{"fields":[{"name":"root","type":{"kind":"u32"}},{"name":"quotient","type":{"kind":"u32"}},{"name":"floored","type":{"kind":"u32"}},{"name":"ceiled","type":{"kind":"u32"}},{"name":"truncated","type":{"kind":"u32"}},{"name":"rounded","type":{"kind":"u32"}},{"name":"nan","type":{"kind":"bool"}},{"name":"finite","type":{"kind":"bool"}}],"kind":"record","name":"Ops"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"casts","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"unsigned","type":{"element":{"kind":"u32"},"kind":"option"}},{"name":"wide","type":{"element":{"kind":"u64"},"kind":"option"}},{"name":"signed","type":{"element":{"kind":"i32"},"kind":"option"}},{"name":"exact","type":{"element":{"kind":"int"},"kind":"option"}}],"kind":"record","name":"Casts"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":2,"internal":false,"name":"from_wide","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":3,"internal":false,"name":"from_unsigned","parallel":false,"params":[{"name":"x","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"from_signed","parallel":false,"params":[{"name":"x","type":{"kind":"i32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"from_exact","parallel":false,"params":[{"name":"x","type":{"kind":"int"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":6,"internal":false,"name":"word_stats","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}}],"precondition":null,"result":{"element":{"element":{"kind":"u32"},"kind":"vector","size":3},"kind":"list"}},{"destination":null,"index":7,"internal":false,"name":"signed_stats","parallel":false,"params":[{"name":"x","type":{"kind":"i32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"vector","size":3}},{"destination":null,"index":8,"internal":false,"name":"word32_stats","parallel":false,"params":[{"name":"x","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"vector","size":3}},{"destination":null,"index":9,"internal":false,"name":"byte_len","parallel":false,"params":[{"name":"s","type":{"kind":"string"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":10,"internal":false,"name":"byte","parallel":false,"params":[{"name":"s","type":{"kind":"string"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":11,"internal":false,"name":"substring","parallel":false,"params":[{"name":"s","type":{"kind":"string"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"string"},"kind":"option"}},{"destination":null,"index":12,"internal":false,"name":"joined","parallel":false,"params":[{"name":"a","type":{"kind":"string"}},{"name":"b","type":{"kind":"string"}}],"precondition":null,"result":{"kind":"string"}},{"destination":null,"index":13,"internal":false,"name":"locate","parallel":false,"params":[{"name":"s","type":{"kind":"string"}},{"name":"n","type":{"kind":"string"}},{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}}],"named_types":{"Casts":{"fields":[{"name":"unsigned","type":{"element":{"kind":"u32"},"kind":"option"}},{"name":"wide","type":{"element":{"kind":"u64"},"kind":"option"}},{"name":"signed","type":{"element":{"kind":"i32"},"kind":"option"}},{"name":"exact","type":{"element":{"kind":"int"},"kind":"option"}}],"kind":"record","name":"Casts"},"Ops":{"fields":[{"name":"root","type":{"kind":"u32"}},{"name":"quotient","type":{"kind":"u32"}},{"name":"floored","type":{"kind":"u32"}},{"name":"ceiled","type":{"kind":"u32"}},{"name":"truncated","type":{"kind":"u32"}},{"name":"rounded","type":{"kind":"u32"}},{"name":"nan","type":{"kind":"bool"}},{"name":"finite","type":{"kind":"bool"}}],"kind":"record","name":"Ops"}},"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"byte":{"arguments":{"format":"ink-value-wire-v1","identity":"9f88eab8cb92b4c6625d2aba465f2a535f09faa9c5f3b243e1eca8827269bd2c","named":{},"root":{"fields":[{"name":"s","type":{"kind":"string"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"byte_len":{"arguments":{"format":"ink-value-wire-v1","identity":"43c7d39d28f9f34c6101b156917972ccb2af4901881013363490ab274999eb7f","named":{},"root":{"fields":[{"name":"s","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"casts":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"a82d809950cb50557ddbc9cc07c04bd415f0e2237dcb8993db9c4825d91afaad","named":{},"root":{"fields":[{"name":"unsigned","type":{"element":{"kind":"u32"},"kind":"option"}},{"name":"wide","type":{"element":{"kind":"u64"},"kind":"option"}},{"name":"signed","type":{"element":{"kind":"i32"},"kind":"option"}},{"name":"exact","type":{"element":{"kind":"int"},"kind":"option"}}],"kind":"record","name":"Casts"}}},"float_ops":{"arguments":{"format":"ink-value-wire-v1","identity":"044eb6bef426f7d4e2ba68c21f64fbf8108afda58458798a8016a17c3bb159a8","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f32"},"kind":"vector","size":2},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"bf97609e14f451589af32cf3bc8de8dbb52d4d69f17c37f38b4140a4cfaa8b36","named":{},"root":{"element":{"fields":[{"name":"root","type":{"kind":"u32"}},{"name":"quotient","type":{"kind":"u32"}},{"name":"floored","type":{"kind":"u32"}},{"name":"ceiled","type":{"kind":"u32"}},{"name":"truncated","type":{"kind":"u32"}},{"name":"rounded","type":{"kind":"u32"}},{"name":"nan","type":{"kind":"bool"}},{"name":"finite","type":{"kind":"bool"}}],"kind":"record","name":"Ops"},"kind":"list"}}},"from_exact":{"arguments":{"format":"ink-value-wire-v1","identity":"e8ac5f1e85714acd583fd30786ec1ef0e4acca92acd0aa56ce80316fa8261a7c","named":{},"root":{"fields":[{"name":"x","type":{"kind":"int"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"from_signed":{"arguments":{"format":"ink-value-wire-v1","identity":"575da0cb6689c7cb6931ef06a75bffb230e67c4c3b1d7361d242374d916e64f9","named":{},"root":{"fields":[{"name":"x","type":{"kind":"i32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"from_unsigned":{"arguments":{"format":"ink-value-wire-v1","identity":"cc08f1332c0bbd676577f3e81f06e85cc8ef81a32bcbe10b3177d811cc8e0ae2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"from_wide":{"arguments":{"format":"ink-value-wire-v1","identity":"59dc6cc158c2bf630b377f03884dad9e50e345b1aade1d5353f4f11a86fa8329","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"joined":{"arguments":{"format":"ink-value-wire-v1","identity":"03ec2f7a84c110dff99c20c977b55460b280cb94c51ef691e9e4c48434a7deec","named":{},"root":{"fields":[{"name":"a","type":{"kind":"string"}},{"name":"b","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"1cdb97f14e69255770652db593f88ce0009f937c28d02381f37b2c643dc1470e","named":{},"root":{"kind":"string"}}},"locate":{"arguments":{"format":"ink-value-wire-v1","identity":"27a83d5eac62d49b6fa68267746cccddd9f472b8d027d52810b4711d5b281a7c","named":{},"root":{"fields":[{"name":"s","type":{"kind":"string"}},{"name":"n","type":{"kind":"string"}},{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"signed_stats":{"arguments":{"format":"ink-value-wire-v1","identity":"575da0cb6689c7cb6931ef06a75bffb230e67c4c3b1d7361d242374d916e64f9","named":{},"root":{"fields":[{"name":"x","type":{"kind":"i32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"df8e250e1434681a397612867c7855bc54caa00233261128d39cf197f2222bb3","named":{},"root":{"element":{"kind":"u32"},"kind":"vector","size":3}}},"substring":{"arguments":{"format":"ink-value-wire-v1","identity":"5a932ed07c15af2d52129159a7ce1fc290e59662a25f88fdb413fc15f1d29a54","named":{},"root":{"fields":[{"name":"s","type":{"kind":"string"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e6ec2005c4843453596f9f4142340982753d0b37b69b33e8d21e40b51b08bc43","named":{},"root":{"element":{"kind":"string"},"kind":"option"}}},"word32_stats":{"arguments":{"format":"ink-value-wire-v1","identity":"cc08f1332c0bbd676577f3e81f06e85cc8ef81a32bcbe10b3177d811cc8e0ae2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"df8e250e1434681a397612867c7855bc54caa00233261128d39cf197f2222bb3","named":{},"root":{"element":{"kind":"u32"},"kind":"vector","size":3}}},"word_stats":{"arguments":{"format":"ink-value-wire-v1","identity":"59dc6cc158c2bf630b377f03884dad9e50e345b1aade1d5353f4f11a86fa8329","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"95af277d359544f5c37bf8e1a89436e47cbe9ded09212399e0dbcad98b8aa67b","named":{},"root":{"element":{"element":{"kind":"u32"},"kind":"vector","size":3},"kind":"list"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[true],"types":[{"element":{"element":{"kind":"f32"},"kind":"vector","size":2},"kind":"list"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"element":{"kind":"u64"},"kind":"list"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"i32"}]},{"capture":[true],"types":[{"kind":"int"}]},{"capture":[true],"types":[{"element":{"kind":"u64"},"kind":"list"}]},{"capture":[true],"types":[{"kind":"i32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"string"}]},{"capture":[true,true],"types":[{"kind":"string"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"kind":"string"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"string"},{"kind":"string"}]},{"capture":[true,true,true],"types":[{"kind":"string"},{"kind":"string"},{"kind":"u32"}]}];

// Descriptor work occurs once at module initialisation, never per word-list call.
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const output=__representation(f.result,true);
  const body=__implementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>{const context=new WeakMap();return output(implementation(...(needsInput ? args.map((v,i)=>input[i](v,context)) : args)),context);};
  return [f.name,entry];
})));
export function call(name,args) { return functions[name](...args); }
// Shared bounded binary codec; generated code supplies exact descriptors.
export const valueWireFormat='ink-value-wire-v1';
const wireMagic=Uint8Array.of(73,78,75,86,65,76,0,1);
const wireEncoder=new TextEncoder(),wireDecoder=new TextDecoder('utf-8',{fatal:true});
const wireDefaults={bytes:16777216,nodes:1000000,depth:128};
const wireDecimal=s=>typeof s==='string'&&/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(s);
function wireLimits(options){const l={...wireDefaults,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>wireDefaults[k])throw Error('wire hard resource limit');return l;}
const wireOwn=(v,k)=>v!==null&&typeof v==='object'&&Object.hasOwn(v,k);
const wireTagged=(v,k)=>wireOwn(v,k)&&Object.keys(v).length===1;
const wireCanonical=v=>Array.isArray(v)?'['+v.map(wireCanonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort((a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}).map(k=>JSON.stringify(k)+':'+wireCanonical(v[k])).join(',')+'}':JSON.stringify(v);
export async function createValueCodec(root,named={}){
 const used=new Set(),budget={nodes:100000};
 function check(t,d=0){
  if(d>64||--budget.nodes<0)throw Error('wire descriptor limit');
  const keys={u32:['kind'],u64:['kind'],i32:['kind'],f32:['kind'],bool:['kind'],unit:['kind'],string:['kind'],int:['kind'],id:['kind','name'],ref:['kind','name'],enum:['kind','name','variants'],record:['kind','name','fields'],list:['kind','element'],option:['kind','element'],vector:['kind','element','size'],result:['kind','ok','error']}[t?.kind];
  if(!keys||Object.keys(t).length!==keys.length||keys.some(k=>!Object.hasOwn(t,k)))throw Error('invalid wire descriptor');
  if(keys.includes('name')&&(typeof t.name!=='string'||!t.name.isWellFormed()))throw Error('invalid descriptor name');
  if(t.kind==='ref'){if(!used.has(t.name)){used.add(t.name);if(named[t.name]?.kind!=='record'||named[t.name].name!==t.name)throw Error('unresolved wire reference');check(named[t.name],d+1);}}
  if(t.kind==='record'){if(!Array.isArray(t.fields))throw Error('wire fields');const names=new Set();for(const f of t.fields){if(Object.keys(f).length!==2||typeof f.name!=='string'||!f.name.isWellFormed()||names.has(f.name))throw Error('duplicate wire field');names.add(f.name);check(f.type,d+1);}}
  if(t.kind==='enum'&&(!Array.isArray(t.variants)||!t.variants.length||t.variants.length>64||t.variants.some(v=>typeof v!=='string'||!v.isWellFormed())||new Set(t.variants).size!==t.variants.length))throw Error('wire enum');
  if(['list','vector','option'].includes(t.kind)){if(t.kind==='vector'&&(!Number.isInteger(t.size)||t.size<1||t.size>64))throw Error('wire vector');check(t.element,d+1);}
  if(t.kind==='result'){check(t.ok,d+1);check(t.error,d+1);}
 }
 check(root);const names=Object.fromEntries([...used].sort().map(k=>[k,named[k]]));
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',wireEncoder.encode(wireCanonical({format:valueWireFormat,root,named:names}))));
 return new ValueCodec({format:valueWireFormat,root,named:names,identity:Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('')});
}
export class ValueCodec{
 #hash;
 #descriptor;
 get descriptor(){return this.#descriptor;}
 constructor(descriptor){
  // This synchronous path is for compiler-generated immutable metadata. For
  // untrusted descriptors use createValueCodec and compare the computed identity.
  if(descriptor?.format!==valueWireFormat||!/^[0-9a-f]{64}$/.test(descriptor.identity))throw Error('invalid wire schema');
  this.#descriptor=structuredClone(descriptor);this.#hash=Uint8Array.from(descriptor.identity.match(/../g),s=>parseInt(s,16));
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}};freeze(this.descriptor);
 }
 resolve(t){for(let i=0;i<64;i++){if(t.kind!=='ref')return t;t=this.descriptor.named[t.name];if(!t)throw Error('wire reference');}throw Error('wire reference cycle');}
 encode(value,options={}){
  const l=wireLimits(options);let remaining=l.nodes,total=40;
  const node=(t,v,d)=>{
   if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');t=this.resolve(t);let body;
   const bad=()=>{throw Error('invalid value for wire schema');};
   const integer=(min,max)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)bad();};
   const words=(size,write)=>{const b=new Uint8Array(size);write(new DataView(b.buffer));return b;};
   switch(t.kind){
    case 'unit':if(v!==null)bad();body=new Uint8Array();break;
    case 'bool':if(typeof v!=='boolean')bad();body=Uint8Array.of(+v);break;
    case 'u32':integer(0,4294967295);body=words(4,b=>b.setUint32(0,v,true));break;
    case 'i32':integer(-2147483648,2147483647);body=words(4,b=>b.setInt32(0,v,true));break;
    case 'u64':{if(typeof v==='number'&&!Number.isSafeInteger(v)||!['bigint','number','string'].includes(typeof v)||typeof v==='string'&&(!wireDecimal(v)||v.startsWith('-')))bad();const n=BigInt(v);if(n<0n||n>18446744073709551615n)bad();body=words(8,b=>b.setBigUint64(0,n,true));break;}
    case 'f32':{let bits;if(typeof v==='number'&&Number.isFinite(v)){const b=words(4,b=>b.setFloat32(0,v,true));if(!Number.isFinite(new DataView(b.buffer).getFloat32(0,true)))bad();body=b;break;}if(!wireTagged(v,'F32Bits'))bad();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)bad();body=words(4,b=>b.setUint32(0,bits,true));break;}
    case 'string':case 'int':case 'id':case 'enum':{const text=t.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes)bad();if(t.kind==='int'&&!wireDecimal(text)||t.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||t.kind==='enum'&&!t.variants.includes(text))bad();body=wireEncoder.encode(text);break;}
    case 'list':case 'vector':{if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))bad();if(v.length>remaining||t.kind==='vector'&&v.length!==t.size)bad();const children=Array.from(v,x=>node(t.element,x,d+1));body=join([words(4,b=>b.setUint32(0,v.length,true)),...children]);break;}
    case 'record':{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==t.fields.length||t.fields.some(f=>!Object.hasOwn(v,f.name)))bad();body=join(t.fields.map(f=>node(f.type,v[f.name],d+1)));break;}
    case 'option':if(wireTagged(v,'Some'))body=join([Uint8Array.of(1),node(t.element,v.Some,d+1)]);else{if(!wireTagged(v,'None')||v.None!==null)bad();body=Uint8Array.of(0);}break;
    case 'result':if(wireTagged(v,'Ok'))body=join([Uint8Array.of(0),node(t.ok,v.Ok,d+1)]);else{if(!wireTagged(v,'Err'))bad();body=join([Uint8Array.of(1),node(t.error,v.Err,d+1)]);}break;
    default:bad();
   }
   // Children have already been counted; only local frame/scalar bytes are new.
   const container=['list','vector','record','option','result'].includes(t.kind);
   total+=4+(container?(t.kind==='record'?0:['list','vector'].includes(t.kind)?4:1):body.length);
   if(total>l.bytes)throw Error('wire byte limit');return join([words(4,b=>b.setUint32(0,body.length,true)),body]);
  };
  const payload=node(this.descriptor.root,value,0);const bytes=join([wireMagic,this.#hash,payload]);if(bytes.length>l.bytes)throw Error('wire byte limit');return bytes;
 }
 encodeWith(emit,options={}){
  const w=new WireEncoder(options);w.bytes(wireMagic);w.bytes(this.#hash);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 scan(bytes,options={},materialize=false,visitor=null){
  const l=wireLimits(options);if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<44||bytes.length>l.bytes)throw Error('wire byte limit or header');
  if(wireMagic.some((b,i)=>bytes[i]!==b)||this.#hash.some((b,i)=>bytes[i+8]!==b))throw Error('wire format or schema mismatch');
  let remaining=l.nodes;const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const node=(t,at,parentEnd,d)=>{
   if(d>l.depth||--remaining<0||at+4>parentEnd)throw Error('wire node, depth or length limit');t=this.resolve(t);const start=at+4,end=start+view.getUint32(at,true);if(end>parentEnd)throw Error('truncated wire frame');let p=start,value;
   const size=n=>{if(end-start!==n)throw Error('malformed wire scalar');};
   const child=type=>{const r=node(type,p,end,d+1);p=r.end;return r.value;};
   switch(t.kind){
    case 'unit':size(0);value=null;break;
    case 'bool':size(1);if(bytes[start]>1)throw Error('invalid wire Bool');value=!!bytes[start];break;
    case 'u32':size(4);value=view.getUint32(start,true);break;
    case 'i32':size(4);value=view.getInt32(start,true);break;
    case 'f32':size(4);if(materialize)value={F32Bits:view.getUint32(start,true)};break;
    case 'u64':size(8);if(materialize)value=view.getBigUint64(start,true);break;
    case 'string':case 'int':case 'id':case 'enum':{const text=wireDecoder.decode(bytes.subarray(start,end));if(t.kind==='int'&&!wireDecimal(text)||t.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||t.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=t.kind==='int'?{Int:text}:text;break;}
    case 'list':case 'vector':{if(start+4>end)throw Error('wire list count');const n=view.getUint32(start,true);p+=4;if(n>remaining||n>Math.floor((end-p)/4)||t.kind==='vector'&&n!==t.size)throw Error('wire sequence size');if(materialize)value=[];for(let i=0;i<n;i++){const v=child(t.element);if(materialize)value.push(v);}if(p!==end)throw Error('trailing sequence bytes');break;}
    case 'record':{if(materialize)value={};for(const f of t.fields){const v=child(f.type);if(materialize)Object.defineProperty(value,f.name,{value:v,enumerable:true,writable:true,configurable:true});}if(p!==end)throw Error('trailing record bytes');break;}
    case 'option':case 'result':{if(start===end||bytes[p]>1)throw Error('wire sum tag');const b=bytes[p++];if(t.kind==='option'&&b===0){if(p!==end)throw Error('wire None bytes');if(materialize)value={None:null};}else{const tag=t.kind==='option'?'Some':b===0?'Ok':'Err';const v=child(t.kind==='option'?t.element:b===0?t.ok:t.error);if(p!==end)throw Error('trailing sum bytes');if(materialize)value={[tag]:v};}break;}
    default:throw Error('unsupported wire kind');
   }if(visitor)visitor(t,bytes.subarray(start,end),d);return {end,value};
  };
  const r=node(this.descriptor.root,40,bytes.length,0);if(r.end!==bytes.length)throw Error('trailing wire bytes');return r.value;
 }
 visit(bytes,visitor,options={}){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor);}
 validate(bytes,options={}){this.scan(bytes,options,false);return true;}
 decode(bytes,options={}){return this.scan(bytes,options,true);}
}
function join(parts){const size=parts.reduce((n,p)=>n+p.length,0);if(size>16777216)throw Error('wire allocation limit');const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}

// Bounded forward emission avoids building and repeatedly joining child buffers.
class WireEncoder{
 #data=new Uint8Array(256);#at=0;#remaining;#depth=0;#limits;
 constructor(options){this.#limits=wireLimits(options);this.#remaining=this.#limits.nodes;}
 get position(){return this.#at;}
 bytes(bytes){
  const end=this.#at+bytes.length;if(end>this.#limits.bytes)throw Error('wire byte limit');
  if(end>this.#data.length){const next=new Uint8Array(Math.min(this.#limits.bytes,Math.max(end,this.#data.length*2)));next.set(this.#data.subarray(0,this.#at));this.#data=next;}
  this.#data.set(bytes,this.#at);this.#at=end;
 }
 word(n){if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire word range');const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);this.bytes(b);}
 patchWord(at,n){if(!Number.isInteger(at)||at<0||at+4>this.#at||!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire patch offset');new DataView(this.#data.buffer).setUint32(at,n,true);}
 frame(emit){if(this.#depth>this.#limits.depth||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.position;this.word(0);this.#depth++;try{emit(this);}finally{this.#depth--;}this.patchWord(at,this.position-at-4);}
 reorder(start,spans){
  const sorted=spans.slice().sort((a,b)=>a[0]-b[0]);let at=start;
  for(const [a,b] of sorted){if(!Number.isInteger(a)||!Number.isInteger(b)||a!==at||b<a)throw Error('wire span permutation');at=b;}
  if(start<0||start>this.#at||at!==this.#at)throw Error('wire span permutation');
  if(spans.every((s,i)=>s===sorted[i]))return;
  const copy=this.#data.slice(start,this.#at);at=start;for(const [a,b] of spans){this.#data.set(copy.subarray(a-start,b-start),at);at+=b-a;}
 }
 finish(){return this.#data.slice(0,this.#at);}
}
// JSON text is a boundary adapter to an ordinary recursive Ink datatype.
// No JavaScript Number conversion occurs for JSON numeric tokens.
export function jsonNumberToken(s){return typeof s==='string'&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(s);}
const jsonWireEncoder=new TextEncoder();
const jsonLimits={bytes:16777216,nodes:1000000,depth:128};
function checkedJsonLimits(options){const l={...jsonLimits,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>jsonLimits[k])throw Error('JSON hard resource limit');return l;}
function jsonVariant(index,item){let payload=index===0?{}:{item0:item};if(index<5)payload={Ok:payload};for(let i=0;i<index;i++)payload={Err:payload};return {payload};}
export function parseJson(text,options={}){
 const l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes||new TextEncoder().encode(text).length>l.bytes)throw Error('JSON byte or Unicode limit');let at=0,remaining=l.nodes;
 const ws=()=>{while(at<text.length&&' \t\r\n'.includes(text[at]))at++;};
 const eat=c=>{ws();if(text[at]===c){at++;return true;}return false;};
 const string=()=>{ws();const start=at;if(!eat('"'))throw Error('expected JSON string');while(at<text.length){if(text[at]==='"'){at++;const v=JSON.parse(text.slice(start,at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(text[at]==='\\')at+=2;else at++;}throw Error('unterminated JSON string');};
 const value=d=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');ws();const c=text[at];
  for(const [word,index,item] of [['null',0,null],['true',1,true],['false',1,false]])if(text.startsWith(word,at)){at+=word.length;return jsonVariant(index,item);}
  if(c==='"')return jsonVariant(3,string());
  if(c==='['){at++;const xs=[];if(!eat(']'))while(true){xs.push(value(d+1));if(eat(']'))break;if(!eat(','))throw Error('JSON array separator');}return jsonVariant(4,xs);}
  if(c==='{'){at++;const xs=[],seen=new Set();if(!eat('}'))while(true){const key=string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!eat(':'))throw Error('JSON object colon');xs.push({key,value:value(d+1)});if(eat('}'))break;if(!eat(','))throw Error('JSON object separator');}return jsonVariant(5,xs);}
  if(c==='-'||c>='0'&&c<='9'){const start=at;while(at<text.length&&'-+0123456789.eE'.includes(text[at]))at++;const token=text.slice(start,at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return jsonVariant(2,token);}
  throw Error('invalid JSON value');
 };
 const out=value(0);ws();if(at!==text.length)throw Error('trailing JSON text');return out;
}
export function stringifyJson(value,options={}){
 const l=checkedJsonLimits(options);let remaining=l.nodes,bytes=0;const parts=[];const encoder=new TextEncoder();
 const emit=s=>{bytes+=encoder.encode(s).length;if(bytes>l.bytes)throw Error('JSON byte limit');parts.push(s);};
 const write=(v,d)=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');if(!v||Object.keys(v).length!==1||!Object.hasOwn(v,'payload'))throw Error('invalid JSON record');let p=v.payload,index=0;
  while(index<5&&p&&Object.hasOwn(p,'Err')){if(Object.keys(p).length!==1)throw Error('invalid JSON sum');p=p.Err;index++;}
  if(index<5){if(!p||Object.keys(p).length!==1||!Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Ok;}
  if(!p||Object.keys(p).length!==(index===0?0:1)||index>0&&!Object.hasOwn(p,'item0'))throw Error('invalid JSON payload');const item=p.item0;
  switch(index){
   case 0:emit('null');break;
   case 1:if(typeof item!=='boolean')throw Error('invalid JSON Boolean');emit(item?'true':'false');break;
   case 2:if(!jsonNumberToken(item))throw Error('invalid JSON number');emit(item);break;
   case 3:if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');emit(JSON.stringify(item));break;
   case 4:if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Array');emit('[');item.forEach((x,i)=>{if(i)emit(',');write(x,d+1);});emit(']');break;
   case 5:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Object');const seen=new Set();emit('{');item.forEach((m,i)=>{if(!m||Object.keys(m).length!==2||typeof m.key!=='string'||!m.key.isWellFormed()||!Object.hasOwn(m,'value'))throw Error('invalid JSON member');if(seen.has(m.key))throw Error('duplicate JSON object key');seen.add(m.key);if(i)emit(',');emit(JSON.stringify(m.key));emit(':');write(m.value,d+1);});emit('}');break;}
  }
 };write(value,0);return parts.join('');
}
export class JsonCodec{
 constructor(valueCodec){
  const root=valueCodec.descriptor.root,fields=root.fields;if(root.kind!=='record'||!Array.isArray(fields)||fields.length!==1||fields[0].name!=='payload')throw Error('JSON schema payload');let sum=fields[0].type;
  for(let i=0;i<6;i++){
   if(i<5&&sum.kind!=='result')throw Error('JSON schema sum');const branch=i<5?sum.ok:sum,fs=branch.fields;
   if(branch.kind!=='record'||!Array.isArray(fs)||fs.length!==(i?1:0)||i&&fs[0].name!=='item0')throw Error('JSON schema branch');
   if(i){const t=fs[0].type;if(i===1&&t.kind!=='bool'||(i===2||i===3)&&t.kind!=='string'||i===4&&(t.kind!=='list'||t.element.kind!=='ref'||t.element.name!==root.name))throw Error('JSON schema variant');if(i===5){const mf=t.element?.fields;if(t.kind!=='list'||t.element?.kind!=='record'||!Array.isArray(mf)||mf.length!==2||mf[0].name!=='key'||mf[0].type.kind!=='string'||mf[1].name!=='value'||mf[1].type.kind!=='ref'||mf[1].type.name!==root.name)throw Error('JSON schema member');}}
   if(i===2)this.numberBranch=branch.name;if(i===5)this.objectBranch=branch.name;
   if(i<5)sum=sum.error;
  }this.values=valueCodec;
 }
 parse(text,options={}){const v=parseJson(text,options);this.values.encode(v,options);return v;}
 stringify(value,options={}){this.values.encode(value,options);return stringifyJson(value,options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,false);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,true);}
 validateBinary(bytes,options={}){
  const decoder=new TextDecoder('utf-8',{fatal:true});
  this.values.visit(bytes,(type,body)=>{
   if(type.kind!=='record')return;
   const view=new DataView(body.buffer,body.byteOffset,body.byteLength);
   if(type.name===this.numberBranch){const length=view.getUint32(0,true);if(!jsonNumberToken(decoder.decode(body.subarray(4,4+length))))throw Error('invalid JSON number token');}
   if(type.name===this.objectBranch){const listEnd=4+view.getUint32(0,true),count=view.getUint32(4,true),seen=new Set();let at=8;for(let i=0;i<count;i++){const memberEnd=at+4+view.getUint32(at,true),keyStart=at+8,keyEnd=keyStart+view.getUint32(at+4,true),key=decoder.decode(body.subarray(keyStart,keyEnd));if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);at=memberEnd;}if(at!==listEnd)throw Error('invalid JSON object frame');}
  },options);return true;
 }
}
function jsonUnpack(value){let p=value.payload,i=0;while(i<5&&Object.hasOwn(p,'Err')){p=p.Err;i++;}return [i,(i<5?p.Ok:p).item0];}
function jsonInteger(token,limit){
 if(!jsonNumberToken(token))throw Error('invalid JSON number');const negative=token[0]==='-',raw=negative?token.slice(1):token,[mantissa,exp='0']=raw.split(/[eE]/);let digits=mantissa.replace('.','');if(/^0+$/.test(digits))return '0';const exponent=Number(exp),fraction=mantissa.includes('.')?mantissa.length-mantissa.indexOf('.')-1:0,shift=exponent-fraction;
 if(!Number.isSafeInteger(exponent)||!Number.isSafeInteger(shift))throw Error('JSON integer exponent limit');
 if(shift<0){const cut=-shift;if(cut>=digits.length||!/^[0]+$/.test(digits.slice(-cut)))throw Error('JSON number is not an integer');digits=digits.slice(0,-cut);}else{if(digits.length+shift>limit)throw Error('JSON integer magnitude limit');digits+='0'.repeat(shift);}
 digits=digits.replace(/^0+/,'');if(digits.length>limit)throw Error('JSON integer magnitude limit');return (negative?'-':'')+digits;
}
export class TypedJsonCodec{
 constructor(valueCodec){this.values=valueCodec;}
 decode(document,options={}){
  // Validate JSON-specific invariants before interpreting any tagged/record
  // shape, including duplicated names and malformed numeric tokens.
  stringifyJson(document,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
  const read=(type,value,d)=>{
   if(d>l.depth||--remaining<0)throw Error('typed JSON resource limit');const t=this.values.resolve(type),[kind,item]=jsonUnpack(value);const fail=()=>{throw Error('JSON does not match '+t.kind);};
   switch(t.kind){
    case 'unit':if(kind!==0)fail();return null;
    case 'bool':if(kind!==1)fail();return item;
    case 'u32':case 'u64':case 'i32':case 'int':{if(kind!==2)fail();const text=jsonInteger(item,t.kind==='int'?4096:t.kind==='u64'?20:10);return t.kind==='int'?{Int:text}:t.kind==='u64'?BigInt(text):Number(text);}
    case 'f32':{if(kind!==2)fail();const n=Number(item),b=new DataView(new ArrayBuffer(4));b.setFloat32(0,n,true);if(!Number.isFinite(b.getFloat32(0,true)))throw Error('JSON f32 overflow');return {F32Bits:b.getUint32(0,true)};}
    case 'string':case 'enum':case 'id':if(kind!==3)fail();return item;
    case 'list':case 'vector':if(kind!==4)fail();return item.map(x=>read(t.element,x,d+1));
    case 'record':{if(kind!==5||item.length!==t.fields.length)throw Error('unknown or missing JSON record field');const fields=new Map(item.map(m=>[m.key,m.value])),out={};for(const f of t.fields){if(!fields.has(f.name))throw Error('missing JSON record field');Object.defineProperty(out,f.name,{value:read(f.type,fields.get(f.name),d+1),writable:true,enumerable:true,configurable:true});}return out;}
    case 'option':case 'result':{if(kind!==5||item.length!==1)fail();const m=item[0];if(t.kind==='option'&&m.key==='None'&&jsonUnpack(m.value)[0]===0)return {None:null};const child=t.kind==='option'&&m.key==='Some'?t.element:t.kind==='result'&&m.key==='Ok'?t.ok:t.kind==='result'&&m.key==='Err'?t.error:null;if(!child)fail();return {[m.key]:read(child,m.value,d+1)};}
    default:fail();
   }
  };
  const out=read(this.values.descriptor.root,document,0);this.values.encode(out,options);return out;
 }
 encode(value,options={}){
  this.values.encode(value,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
  const write=(type,v,d)=>{
   if(d>l.depth||--remaining<0)throw Error('typed JSON resource limit');const t=this.values.resolve(type);
   switch(t.kind){
    case 'unit':return jsonVariant(0);
    case 'bool':return jsonVariant(1,v);
    case 'u32':case 'u64':case 'i32':return jsonVariant(2,String(v));
    case 'int':return jsonVariant(2,typeof v==='bigint'?String(v):v.Int);
    case 'f32':{let n;if(typeof v==='number')n=Math.fround(v);else{const b=new DataView(new ArrayBuffer(4));b.setUint32(0,v.F32Bits,true);n=b.getFloat32(0,true);}if(!Number.isFinite(n))throw Error('non-finite f32 cannot encode as JSON');return jsonVariant(2,Object.is(n,-0)?'-0':String(n));}
    case 'string':case 'id':case 'enum':return jsonVariant(3,v);
    case 'list':case 'vector':return jsonVariant(4,Array.from(v,x=>write(t.element,x,d+1)));
    case 'record':return jsonVariant(5,t.fields.map(f=>({key:f.name,value:write(f.type,v[f.name],d+1)})));
    case 'option':return jsonVariant(5,[Object.hasOwn(v,'Some')?{key:'Some',value:write(t.element,v.Some,d+1)}:{key:'None',value:jsonVariant(0)}]);
    case 'result':return jsonVariant(5,[Object.hasOwn(v,'Ok')?{key:'Ok',value:write(t.ok,v.Ok,d+1)}:{key:'Err',value:write(t.error,v.Err,d+1)}]);
    default:throw Error('unsupported typed JSON descriptor');
   }
  };return write(this.values.descriptor.root,value,0);
 }
 parse(text,options={}){return this.decode(parseJson(text,options),options);}
 stringify(value,options={}){return stringifyJson(this.encode(value,options),options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,true);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,false);}
}

// Token reader shared by schema-directed and arbitrary-JSON wire emission.
class JsonWireReader{
 constructor(text,options){this.l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>this.l.bytes||jsonWireEncoder.encode(text).length>this.l.bytes)throw Error('JSON byte or Unicode limit');this.text=text;this.at=0;this.remaining=this.l.nodes;}
 ws(){while(this.at<this.text.length&&' \t\r\n'.includes(this.text[this.at]))this.at++;}
 peek(){this.ws();return this.text[this.at];}
 eat(c){this.ws();if(this.text[this.at]===c){this.at++;return true;}return false;}
 node(d){if(d>this.l.depth||--this.remaining<0)throw Error('JSON node or depth limit');}
 string(){this.ws();const start=this.at;if(!this.eat('"'))throw Error('expected JSON string');while(this.at<this.text.length){if(this.text[this.at]==='"'){this.at++;const v=JSON.parse(this.text.slice(start,this.at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(this.text[this.at]==='\\')this.at+=2;else this.at++;}throw Error('unterminated JSON string');}
 leaf(d){this.node(d);const c=this.peek();for(const [word,v] of [['null',null],['true',true],['false',false]])if(this.text.startsWith(word,this.at)){this.at+=word.length;return v;}if(c==='"')return this.string();if(c==='-'||c>='0'&&c<='9'){const start=this.at;while(this.at<this.text.length&&'-+0123456789.eE'.includes(this.text[this.at]))this.at++;const token=this.text.slice(start,this.at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return token;}throw Error('invalid JSON scalar');}
 finish(){this.ws();if(this.at!==this.text.length)throw Error('trailing JSON text');}
}
function streamJsonBinary(values,text,options,typed){
 const p=new JsonWireReader(text,options),utf8=jsonWireEncoder;
 const list=(w,open,close,item)=>{if(!p.eat(open))throw Error('JSON container shape');const at=w.position;w.word(0);let count=0;if(!p.eat(close))while(true){item(w);count++;if(p.eat(close))break;if(!p.eat(','))throw Error('JSON container separator');}w.patchWord(at,count);};
 const variant=(w,index,level,emit)=>{if(level<index)w.frame(w=>{w.bytes(Uint8Array.of(1));variant(w,index,level+1,emit);});else if(index<5)w.frame(w=>{w.bytes(Uint8Array.of(0));w.frame(emit);});else w.frame(emit);};
 const json=(w,d)=>{
  const ch=p.peek(),index=ch==='n'?0:ch==='t'||ch==='f'?1:ch==='-'||ch>='0'&&ch<='9'?2:ch==='"'?3:ch==='['?4:ch==='{'?5:-1;if(index<0)throw Error('invalid JSON value');
  const leaf=index<4?p.leaf(d):null;if(index>=4)p.node(d);
  w.frame(w=>variant(w,index,0,w=>{
   if(index===0)return;if(index===1){w.frame(w=>w.bytes(Uint8Array.of(+leaf)));return;}
   if(index===2||index===3){w.frame(w=>w.bytes(utf8.encode(leaf)));return;}
   w.frame(w=>{if(index===4)list(w,'[',']',w=>json(w,d+1));else{const seen=new Set();list(w,'{','}',w=>{const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');w.frame(w=>{w.frame(w=>w.bytes(utf8.encode(key)));json(w,d+1);});});}});
  }));
 };
 const read=(type,w,d)=>{
  const t=values.resolve(type);w.frame(w=>{
   if(t.kind==='list'||t.kind==='vector'){p.node(d);list(w,'[',']',w=>read(t.element,w,d+1));return;}
   if(t.kind==='record'){
    p.node(d);if(!p.eat('{'))throw Error('expected JSON record');const start=w.position,spans=new Array(t.fields.length).fill(null);
    if(!p.eat('}'))while(true){const key=p.string(),i=t.fields.findIndex(f=>f.name===key);if(i<0)throw Error('unknown JSON record field');if(spans[i])throw Error('duplicate JSON record field');if(!p.eat(':'))throw Error('JSON record colon');const at=w.position;read(t.fields[i].type,w,d+1);spans[i]=[at,w.position];if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON record separator');}
    if(spans.some(s=>s===null))throw Error('missing JSON record field');w.reorder(start,spans);return;
   }
   if(t.kind==='option'||t.kind==='result'){
    p.node(d);if(!p.eat('{'))throw Error('expected JSON tagged value');const key=p.string();if(!p.eat(':'))throw Error('JSON tag colon');
    if(t.kind==='option'&&key==='None'){if(p.leaf(d+1)!==null)throw Error('JSON None payload');w.bytes(Uint8Array.of(0));}
    else{const child=t.kind==='option'&&key==='Some'?t.element:t.kind==='result'&&key==='Ok'?t.ok:t.kind==='result'&&key==='Err'?t.error:null;if(!child)throw Error('invalid JSON tag');w.bytes(Uint8Array.of(key==='Ok'?0:1));read(child,w,d+1);}
    if(!p.eat('}'))throw Error('expected exactly one JSON tag');return;
   }
   const ch=p.peek(),v=p.leaf(d),bad=()=>{throw Error('JSON does not match '+t.kind);};
   if(t.kind==='unit'){if(v!==null)bad();return;}
   if(t.kind==='bool'){if(typeof v!=='boolean')bad();w.bytes(Uint8Array.of(+v));return;}
   if(['string','id','enum'].includes(t.kind)){if(ch!=='"')bad();w.bytes(utf8.encode(v));return;}
   if(ch!=='-'&&!(ch>='0'&&ch<='9'))bad();
   if(t.kind==='int'){w.bytes(utf8.encode(jsonInteger(v,4096)));return;}
   const size=t.kind==='u64'?8:4,b=new Uint8Array(size),dv=new DataView(b.buffer);
   if(t.kind==='f32'){dv.setFloat32(0,Number(v),true);if(!Number.isFinite(dv.getFloat32(0,true)))throw Error('JSON f32 overflow');}
   else{const n=BigInt(jsonInteger(v,t.kind==='u64'?20:10));if(t.kind==='u64'){if(n<0n||n>18446744073709551615n)bad();dv.setBigUint64(0,n,true);}else if(t.kind==='u32'){if(n<0n||n>4294967295n)bad();dv.setUint32(0,Number(n),true);}else if(t.kind==='i32'){if(n< -2147483648n||n>2147483647n)bad();dv.setInt32(0,Number(n),true);}else bad();}
   w.bytes(b);
  });
 };
 return values.encodeWith(w=>{if(typed)read(values.descriptor.root,w,0);else json(w,0);p.finish();},options);
}

// Render validated bytes in a single traversal; only the final text is owned.
function streamWireJsonText(values,bytes,options,library){
 values.validate(bytes,options);const l=checkedJsonLimits(options),parts=[];let size=0,remaining=l.nodes;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
 const emit=s=>{size+=jsonWireEncoder.encode(s).length;if(size>l.bytes)throw Error('JSON byte limit');parts.push(s);};
 const string=s=>emit(JSON.stringify(s));const node=d=>{if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');};
 const frame=(type,at)=>{const t=values.resolve(type),start=at+4,end=start+dv.getUint32(at,true);return{t,start,end};};
 const json=(type,at,d)=>{
  node(d);let root=frame(type,at),sum=frame(root.t.fields[0].type,root.start),index=0;
  while(index<5){const err=bytes[sum.start];sum=frame(err?sum.t.error:sum.t.ok,sum.start+1);if(!err)break;index++;}
  if(index===0){emit('null');return root.end;}
  const item=frame(sum.t.fields[0].type,sum.start);
  if(index===1)emit(bytes[item.start]?'true':'false');
  else if(index===2){const token=decoder.decode(bytes.subarray(item.start,item.end));if(!jsonNumberToken(token))throw Error('invalid JSON number token');emit(token);}
  else if(index===3)string(decoder.decode(bytes.subarray(item.start,item.end)));
  else{const count=dv.getUint32(item.start,true);let p=item.start+4;emit(index===4?'[':'{');const seen=new Set();for(let i=0;i<count;i++){if(i)emit(',');if(index===4)p=json(item.t.element,p,d+1);else{const member=frame(item.t.element,p),key=frame(member.t.fields[0].type,member.start),name=decoder.decode(bytes.subarray(key.start,key.end));if(seen.has(name))throw Error('duplicate JSON object key');seen.add(name);string(name);emit(':');json(member.t.fields[1].type,key.end,d+1);p=member.end;}}emit(index===4?']':'}');}
  return root.end;
 };
 const typed=(type,at,d)=>{
  node(d);const f=frame(type,at),t=f.t;let p=f.start;
  switch(t.kind){
   case 'unit':emit('null');break;
   case 'bool':emit(bytes[p]?'true':'false');break;
   case 'u32':emit(String(dv.getUint32(p,true)));break;
   case 'u64':emit(String(dv.getBigUint64(p,true)));break;
   case 'i32':emit(String(dv.getInt32(p,true)));break;
   case 'f32':{const n=dv.getFloat32(p,true);if(!Number.isFinite(n))throw Error('non-finite f32 cannot encode as JSON');emit(Object.is(n,-0)?'-0':String(n));break;}
   case 'int':emit(decoder.decode(bytes.subarray(p,f.end)));break;
   case 'string':case 'id':case 'enum':string(decoder.decode(bytes.subarray(p,f.end)));break;
   case 'list':case 'vector':{const n=dv.getUint32(p,true);p+=4;emit('[');for(let i=0;i<n;i++){if(i)emit(',');p=typed(t.element,p,d+1);}emit(']');break;}
   case 'record':emit('{');for(let i=0;i<t.fields.length;i++){if(i)emit(',');const field=t.fields[i];string(field.name);emit(':');p=typed(field.type,p,d+1);}emit('}');break;
   case 'option':case 'result':{const tag=bytes[p++],key=t.kind==='option'?(tag?'Some':'None'):tag?'Err':'Ok';emit('{');string(key);emit(':');if(t.kind==='option'&&!tag){node(d+1);emit('null');}else typed(t.kind==='option'?t.element:tag?t.error:t.ok,p,d+1);emit('}');break;}
   default:throw Error('unsupported typed JSON descriptor');
  }return f.end;
 };
 if(library)json(values.descriptor.root,40,0);else typed(values.descriptor.root,40,0);return parts.join('');
}

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze({arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
export function callBinary(name,bytes,limits={}){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const values=codecs.arguments.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return codecs.result.encode(result,limits);
}
const __intoImplementations=[__into0,null,__into2,null,null,null,__into6,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

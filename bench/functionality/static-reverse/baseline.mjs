const __recordElisions=new Set([]);
const __nativeF32=true;
// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
// Binary64 uses native Numbers for finite arithmetic and immutable private
// tags only where a NaN's exact payload must survive non-arithmetic operations.
const __doubleView=new DataView(new ArrayBuffer(8));
const __double=bits=>{__doubleView.setBigUint64(0,bits,true);return __doubleView.getFloat64(0,true);};
const __doubleBits=number=>{if(Number.isNaN(number))return 0x7ff8000000000000n;__doubleView.setFloat64(0,number,true);return __doubleView.getBigUint64(0,true);};
const __dfNumber=value=>typeof value==='number'?value:__double(BigInt(value.F64Bits));
const __dfBits=value=>typeof value==='number'?__doubleBits(value):BigInt(value.F64Bits);
const __dfFromBits=bits=>(bits&0x7fffffffffffffffn)>0x7ff0000000000000n?Object.freeze({F64Bits:bits.toString()}):__double(bits);
const __dfInput=value=>typeof value==='number'?value:__dfFromBits(BigInt(value.F64Bits));
const __dfNeg=value=>typeof value==='number'&&!Number.isNaN(value)?-value:__dfFromBits(__dfBits(value)^0x8000000000000000n);
const __dfOutput=value=>{const n=__dfNumber(value);return Number.isFinite(n)?n:{F64Bits:__dfBits(value).toString()};};
const __dfCapture=value=>{
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(!value||typeof value!=='object'||Object.keys(value).length!==1||!Object.hasOwn(value,'F64Bits'))throw Error('invalid f64');const text=value.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))throw Error('invalid f64');
 const bits=BigInt(text);if(bits>18446744073709551615n)throw Error('invalid F64Bits');return __dfFromBits(bits);
};
// Native binary32 lane for pure modules. Explicit NaN payloads remain tagged;
// arithmetic canonicalizes NaNs just as __bits does in the exact-bit lane.
// Host tags are captured once at a typed read. Only private immutable tags
// may pass through normalization without consulting a host property again.
const __nfTagged = new WeakSet();
const __nfValue = value => typeof value === 'number' ? Math.fround(value) : __nfTagged.has(value) ? value : __nfFromBits(value.F32Bits);
// Number operands have already been normalised at their typed read or producer.
const __nfNumber = value => typeof value === 'number' ? value : __float(value.F32Bits);
const __nfBits = value => typeof value === 'number' ? __bits(value) : value.F32Bits;
const __nfFromBits = bits => {
  if((bits & 0x7fffffff)<=0x7f800000)return __float(bits);
  const value=Object.freeze({F32Bits:bits});__nfTagged.add(value);return value;
};
const __nfNeg = value => typeof value === 'number' && !Number.isNaN(value) ? -value : __nfFromBits((__nfBits(value) ^ 0x80000000) >>> 0);
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
      const key=typeof __sumSpecs==='undefined'?null:__sumKey(type),flat=key!==null&&__sumSpecs.has(key);
      if(flat)return output?(value,context)=>{const v=__sumView(key,value);return Object.hasOwn(v,'Ok')?{Ok:ok(v.Ok,context)}:{Err:err(v.Err,context)};}:(v,context)=>Object.hasOwn(v,'Ok')?__sumMake(key,true,ok(v.Ok,context)):__sumMake(key,false,err(v.Err,context));
      return ok===__identity&&err===__identity?__identity:(value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)};
    }
    case 'f64':return output?__dfOutput:__dfInput;
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
      if((typeof __recordElisions!=='undefined'&&__recordElisions.has(type.name))){
        if(!type.fields.length)return ()=>undefined; // lexically unconsumed projected input
        const field=type.fields[0],child=__representation(field.type,output,capture);
        return output?(value,context)=>({[field.name]:child(value,context)}):(value,context)=>child(value[field.name],context);
      }
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
function __ink_round_even_f64(x){if(!Number.isFinite(x)||Math.abs(x)>=4503599627370496)return x;const a=Math.abs(x),i=Math.floor(a),r=a-i;const y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;}
// Direct BigInt -> binary32 avoids double rounding through binary64.
function __ink_big_float(x){if(x===0n)return 0;const neg=x<0n;if(neg)x=-x;let e=x.toString(2).length-1;if(e<=23)return Number(neg?-x:x);const shift=BigInt(e-23),mask=(1n<<shift)-1n;let q=x>>shift;const rem=x&mask,half=1n<<(shift-1n);if(rem>half||(rem===half&&(q&1n)!==0n))q++;if(q===16777216n){q>>=1n;e++;}if(e>127)return neg?-Infinity:Infinity;return (neg?-1:1)*Number(q)*2**(e-23);}
function __ink_from_float(x,t){x=Math.trunc(x);if(!Number.isFinite(x))return {None:null};const valid=t==='i32'?x>=-2147483648&&x<2147483648:x>=0&&x<(t==='u32'?4294967296:18446744073709551616);return valid?{Some:t==='u64'?BigInt(x):x===0?0:x}:{None:null};}
function __ink_count(x,n,width){if(width===64){x=BigInt.asUintN(64,x);if(n==='popcount'){let count=0;while(x){x&=x-1n;count++;}return count;}if(x===0n)return 64;if(n==='leading_zeros')return 64-x.toString(2).length;let count=0;while((x&1n)===0n){x>>=1n;count++;}return count;}x>>>=0;if(n==='leading_zeros')return Math.clz32(x);if(n==='trailing_zeros')return x===0?32:31-Math.clz32((x&-x)>>>0);x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24;}
const __ink_encoder=new TextEncoder(),__ink_decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const __ink_bytes=s=>__ink_encoder.encode(s);
// Count UTF-8 bytes directly; valid Ink strings contain Unicode scalar values.
// Preserve TextEncoder's replacement width for a lone surrogate at trusted hosts.
function __ink_byte_len(s,start=0,end=s.length){let n=0;for(let i=start;i<end;i++){const c=s.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<end&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){n+=4;i++;}else n+=3;}return n;}
const __ink_boundary=(b,i)=>i<=b.length&&(i===b.length||(b[i]&0xc0)!==0x80);
function __ink_byte_at(s,i){const b=__ink_bytes(s);return i<b.length?{Some:b[i]}:{None:null};}
function __ink_slice(s,a,z){const b=__ink_bytes(s);return a<=z&&__ink_boundary(b,a)&&__ink_boundary(b,z)?{Some:__ink_decoder.decode(b.subarray(a,z))}:{None:null};}
function __ink_concat(a,b){const s=a+b;if(__ink_byte_len(s)>4294967295)throw Error('String exceeds U32 byte length');return s;}
function __ink_find(s,needle,from){let unit=0,bytes=0;while(bytes<from&&unit<s.length){const c=s.charCodeAt(unit++);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff&&unit<s.length&&s.charCodeAt(unit)>=0xdc00&&s.charCodeAt(unit)<=0xdfff){bytes+=4;unit++;}else bytes+=3;}if(bytes!==from)return {None:null};const at=s.indexOf(needle,unit);return at<0?{None:null}:{Some:bytes+__ink_byte_len(s,unit,at)};}

function __ink_int_from_float(x){return Number.isFinite(x)?{Some:BigInt(Math.trunc(x))}:{None:null};}
// Affine buffers expose bounded disjoint ranges over one allocation. Source
// ownership prevents retaining a parent; growth detaches shared ranges.
// Elements cannot own temporary storage: they are immutable logical values.
// Copy the slot array when acquiring ownership, never the reachable records.
class __InkBuffer {
 constructor(data,start=0,end=data.length,shared=false){this.data=data;this.start=start;this.end=end;this.shared=shared;}
 get length(){return this.end-this.start;}
 set length(n){this.end=this.start+Math.min(this.length,n);if(!this.shared&&this.start===0)this.data.length=this.end;}
 item(i){return this.data[this.start+i];}
 range(start,count){const begin=this.start+Math.min(start,this.length);return new __InkBuffer(this.data,begin,begin+Math.min(count,this.end-begin),true);}
 set(i,v){if(i<this.length)this.data[this.start+i]=v;return this;}
 swap(a,b){if(a<this.length&&b<this.length){const x=this.item(a);this.set(a,this.item(b));this.set(b,x);}return this;}
 fill_range(start,count,value){start=Math.min(start,this.length);count=Math.min(count,this.length-start);this.data.fill(value,this.start+start,this.start+start+count);return this;}
 copy_within(source,destination,count){source=Math.min(source,this.length);destination=Math.min(destination,this.length);count=Math.min(count,this.length-source,this.length-destination);this.data.copyWithin(this.start+destination,this.start+source,this.start+source+count);return this;}
 detach(){if(this.shared||this.start!==0||this.end!==this.data.length){this.data=this.data.slice(this.start,this.end);this.start=0;this.end=this.data.length;this.shared=false;}}
 push(v){if(this.length>=4294967295)throw Error('buffer length exhausted');this.detach();this.data.push(v);this.end++;return this;}
 pop(){this.length=Math.max(0,this.length-1);return this;}
 truncate(n){this.length=Math.min(this.length,n);return this;}
 slice(start=0,end=this.length){return this.data.slice(this.start+start,this.start+Math.min(end,this.length));}
 freeze(){return this.start===0&&this.end===this.data.length?this.data:this.data.slice(this.start,this.end);}
 *[Symbol.iterator](){for(let i=this.start;i<this.end;i++)yield this.data[i];}
}
function __bufferSplit(x,at){const cut=x.start+Math.min(at,x.length);x.shared=true;return [new __InkBuffer(x.data,x.start,cut,true),new __InkBuffer(x.data,cut,x.end,true)];}
function __bufferAppend(a,b){
 if(a.length+b.length>4294967295)throw Error('buffer length exhausted');
 if(a.data===b.data&&a.end===b.start)return new __InkBuffer(a.data,a.start,b.end,a.start!==0||b.end!==a.data.length);
 a.detach();for(const item of b)a.push(item);return a;
}

function __repeat_until(limit,acc,stop,step){for(let i=0;i<limit;i++){if(stop(acc))break;acc=step(i,acc);}return acc;}
function __bufferFill(n,v){return new __InkBuffer(new Array(n).fill(v));}
function __mapGet(m,k,f){return m.has(k)?m.get(k):f();}
function __mapEntries(m,keys){return [...m.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>keys?k:v);}
function __tempSet(x,k,v,map){x.set(k,v);return x;}
function __bufferSwap(x,a,b){return x.swap(a,b);}
function __tempEdit(x,op,...args){if(op==='push'){x.push(args[0]);}else if(op==='pop')x.pop();else if(op==='truncate')x.truncate(args[0]);else if(op==='remove')x.delete(args[0]);return x;}
function __fn0(v0){
const v1=__nfValue(v0["w0"]);
const v2=__nfValue(v0["w0"]);
const v3=Math.fround(__nfNumber(v1) * __nfNumber(v2));
const v4=__nfValue(v0["w1"]);
const v5=__nfValue(v0["w1"]);
const v6=Math.fround(__nfNumber(v4) * __nfNumber(v5));
const v7=Math.fround(v3 + v6);
const v8=__nfValue(v0["w2"]);
const v9=__nfValue(v0["w2"]);
const v10=Math.fround(__nfNumber(v8) * __nfNumber(v9));
const v11=Math.fround(v7 + v10);
const v12=__nfValue(v0["w3"]);
const v13=__nfValue(v0["w3"]);
const v14=Math.fround(__nfNumber(v12) * __nfNumber(v13));
const v15=Math.fround(v11 + v14);
const v16=__nfValue(v0["w4"]);
const v17=__nfValue(v0["w4"]);
const v18=Math.fround(__nfNumber(v16) * __nfNumber(v17));
const v19=Math.fround(v15 + v18);
const v20=__nfValue(v0["w5"]);
const v21=__nfValue(v0["w5"]);
const v22=Math.fround(__nfNumber(v20) * __nfNumber(v21));
const v23=Math.fround(v19 + v22);
const v24=__nfValue(v0["w6"]);
const v25=__nfValue(v0["w6"]);
const v26=Math.fround(__nfNumber(v24) * __nfNumber(v25));
const v27=Math.fround(v23 + v26);
const v28=__nfValue(v0["w7"]);
const v29=__nfValue(v0["w7"]);
const v30=Math.fround(__nfNumber(v28) * __nfNumber(v29));
return Math.fround(v27 + v30);}
function __fn1(v31,v32){
v32=__nfValue(v32);
const v33=v31["b0"];
const v34=__fn0(v33);
const v35=v31["b1"];
const v36=__fn0(v35);
const v37=Math.fround(__nfNumber(v34) + __nfNumber(v36));
const v38=v31["b2"];
const v39=__fn0(v38);
const v40=Math.fround(v37 + __nfNumber(v39));
const v41=v31["b3"];
const v42=__fn0(v41);
const v43=Math.fround(v40 + __nfNumber(v42));
const v44=v31["b4"];
const v45=__fn0(v44);
const v46=Math.fround(v43 + __nfNumber(v45));
const v47=v31["b5"];
const v48=__fn0(v47);
const v49=Math.fround(v46 + __nfNumber(v48));
const v50=v31["b6"];
const v51=__fn0(v50);
const v52=Math.fround(v49 + __nfNumber(v51));
const v53=v31["b7"];
const v54=__fn0(v53);
const v55=Math.fround(v52 + __nfNumber(v54));
const v56=Math.fround(v55 - __nfNumber(v32));
return Math.fround(v56 * v56);}
function __fn2(v57,v58,v59,v60){
v58=__nfValue(v58);
return __fn17(v57,v59,v60,v58);}
function __fn3(v61,v62,v63,v64){
v62=__nfValue(v62);
const v65=__fn18(v61,v63,v64,v62);
let v66;if(Object.hasOwn(v65,"Ok")){
const v67=v65["Ok"];
v66=({Ok:__nfValue(v67["value"])});}else{v66=({Err:v65.Err});}
return v66;}
function __fn4(v68,v69,v70){
v70=__nfValue(v70);
const v71=v68["b0"];
const v72=__nfValue(v71["w0"]);
const v73=v69["b0"];
const v74=__nfValue(v73["w0"]);
const v75=Math.fround(__nfNumber(v70) * __nfNumber(v74));
const v76=Math.fround(__nfNumber(v72) - v75);
const v77=v68["b0"];
const v78=__nfValue(v77["w1"]);
const v79=v69["b0"];
const v80=__nfValue(v79["w1"]);
const v81=Math.fround(__nfNumber(v70) * __nfNumber(v80));
const v82=Math.fround(__nfNumber(v78) - v81);
const v83=v68["b0"];
const v84=__nfValue(v83["w2"]);
const v85=v69["b0"];
const v86=__nfValue(v85["w2"]);
const v87=Math.fround(__nfNumber(v70) * __nfNumber(v86));
const v88=Math.fround(__nfNumber(v84) - v87);
const v89=v68["b0"];
const v90=__nfValue(v89["w3"]);
const v91=v69["b0"];
const v92=__nfValue(v91["w3"]);
const v93=Math.fround(__nfNumber(v70) * __nfNumber(v92));
const v94=Math.fround(__nfNumber(v90) - v93);
const v95=v68["b0"];
const v96=__nfValue(v95["w4"]);
const v97=v69["b0"];
const v98=__nfValue(v97["w4"]);
const v99=Math.fround(__nfNumber(v70) * __nfNumber(v98));
const v100=Math.fround(__nfNumber(v96) - v99);
const v101=v68["b0"];
const v102=__nfValue(v101["w5"]);
const v103=v69["b0"];
const v104=__nfValue(v103["w5"]);
const v105=Math.fround(__nfNumber(v70) * __nfNumber(v104));
const v106=Math.fround(__nfNumber(v102) - v105);
const v107=v68["b0"];
const v108=__nfValue(v107["w6"]);
const v109=v69["b0"];
const v110=__nfValue(v109["w6"]);
const v111=Math.fround(__nfNumber(v70) * __nfNumber(v110));
const v112=Math.fround(__nfNumber(v108) - v111);
const v113=v68["b0"];
const v114=__nfValue(v113["w7"]);
const v115=v69["b0"];
const v116=__nfValue(v115["w7"]);
const v117=Math.fround(__nfNumber(v70) * __nfNumber(v116));
const v118=Math.fround(__nfNumber(v114) - v117);
const v120=v68["b1"];
const v121=__nfValue(v120["w0"]);
const v122=v69["b1"];
const v123=__nfValue(v122["w0"]);
const v124=Math.fround(__nfNumber(v70) * __nfNumber(v123));
const v125=Math.fround(__nfNumber(v121) - v124);
const v126=v68["b1"];
const v127=__nfValue(v126["w1"]);
const v128=v69["b1"];
const v129=__nfValue(v128["w1"]);
const v130=Math.fround(__nfNumber(v70) * __nfNumber(v129));
const v131=Math.fround(__nfNumber(v127) - v130);
const v132=v68["b1"];
const v133=__nfValue(v132["w2"]);
const v134=v69["b1"];
const v135=__nfValue(v134["w2"]);
const v136=Math.fround(__nfNumber(v70) * __nfNumber(v135));
const v137=Math.fround(__nfNumber(v133) - v136);
const v138=v68["b1"];
const v139=__nfValue(v138["w3"]);
const v140=v69["b1"];
const v141=__nfValue(v140["w3"]);
const v142=Math.fround(__nfNumber(v70) * __nfNumber(v141));
const v143=Math.fround(__nfNumber(v139) - v142);
const v144=v68["b1"];
const v145=__nfValue(v144["w4"]);
const v146=v69["b1"];
const v147=__nfValue(v146["w4"]);
const v148=Math.fround(__nfNumber(v70) * __nfNumber(v147));
const v149=Math.fround(__nfNumber(v145) - v148);
const v150=v68["b1"];
const v151=__nfValue(v150["w5"]);
const v152=v69["b1"];
const v153=__nfValue(v152["w5"]);
const v154=Math.fround(__nfNumber(v70) * __nfNumber(v153));
const v155=Math.fround(__nfNumber(v151) - v154);
const v156=v68["b1"];
const v157=__nfValue(v156["w6"]);
const v158=v69["b1"];
const v159=__nfValue(v158["w6"]);
const v160=Math.fround(__nfNumber(v70) * __nfNumber(v159));
const v161=Math.fround(__nfNumber(v157) - v160);
const v162=v68["b1"];
const v163=__nfValue(v162["w7"]);
const v164=v69["b1"];
const v165=__nfValue(v164["w7"]);
const v166=Math.fround(__nfNumber(v70) * __nfNumber(v165));
const v167=Math.fround(__nfNumber(v163) - v166);
const v169=v68["b2"];
const v170=__nfValue(v169["w0"]);
const v171=v69["b2"];
const v172=__nfValue(v171["w0"]);
const v173=Math.fround(__nfNumber(v70) * __nfNumber(v172));
const v174=Math.fround(__nfNumber(v170) - v173);
const v175=v68["b2"];
const v176=__nfValue(v175["w1"]);
const v177=v69["b2"];
const v178=__nfValue(v177["w1"]);
const v179=Math.fround(__nfNumber(v70) * __nfNumber(v178));
const v180=Math.fround(__nfNumber(v176) - v179);
const v181=v68["b2"];
const v182=__nfValue(v181["w2"]);
const v183=v69["b2"];
const v184=__nfValue(v183["w2"]);
const v185=Math.fround(__nfNumber(v70) * __nfNumber(v184));
const v186=Math.fround(__nfNumber(v182) - v185);
const v187=v68["b2"];
const v188=__nfValue(v187["w3"]);
const v189=v69["b2"];
const v190=__nfValue(v189["w3"]);
const v191=Math.fround(__nfNumber(v70) * __nfNumber(v190));
const v192=Math.fround(__nfNumber(v188) - v191);
const v193=v68["b2"];
const v194=__nfValue(v193["w4"]);
const v195=v69["b2"];
const v196=__nfValue(v195["w4"]);
const v197=Math.fround(__nfNumber(v70) * __nfNumber(v196));
const v198=Math.fround(__nfNumber(v194) - v197);
const v199=v68["b2"];
const v200=__nfValue(v199["w5"]);
const v201=v69["b2"];
const v202=__nfValue(v201["w5"]);
const v203=Math.fround(__nfNumber(v70) * __nfNumber(v202));
const v204=Math.fround(__nfNumber(v200) - v203);
const v205=v68["b2"];
const v206=__nfValue(v205["w6"]);
const v207=v69["b2"];
const v208=__nfValue(v207["w6"]);
const v209=Math.fround(__nfNumber(v70) * __nfNumber(v208));
const v210=Math.fround(__nfNumber(v206) - v209);
const v211=v68["b2"];
const v212=__nfValue(v211["w7"]);
const v213=v69["b2"];
const v214=__nfValue(v213["w7"]);
const v215=Math.fround(__nfNumber(v70) * __nfNumber(v214));
const v216=Math.fround(__nfNumber(v212) - v215);
const v218=v68["b3"];
const v219=__nfValue(v218["w0"]);
const v220=v69["b3"];
const v221=__nfValue(v220["w0"]);
const v222=Math.fround(__nfNumber(v70) * __nfNumber(v221));
const v223=Math.fround(__nfNumber(v219) - v222);
const v224=v68["b3"];
const v225=__nfValue(v224["w1"]);
const v226=v69["b3"];
const v227=__nfValue(v226["w1"]);
const v228=Math.fround(__nfNumber(v70) * __nfNumber(v227));
const v229=Math.fround(__nfNumber(v225) - v228);
const v230=v68["b3"];
const v231=__nfValue(v230["w2"]);
const v232=v69["b3"];
const v233=__nfValue(v232["w2"]);
const v234=Math.fround(__nfNumber(v70) * __nfNumber(v233));
const v235=Math.fround(__nfNumber(v231) - v234);
const v236=v68["b3"];
const v237=__nfValue(v236["w3"]);
const v238=v69["b3"];
const v239=__nfValue(v238["w3"]);
const v240=Math.fround(__nfNumber(v70) * __nfNumber(v239));
const v241=Math.fround(__nfNumber(v237) - v240);
const v242=v68["b3"];
const v243=__nfValue(v242["w4"]);
const v244=v69["b3"];
const v245=__nfValue(v244["w4"]);
const v246=Math.fround(__nfNumber(v70) * __nfNumber(v245));
const v247=Math.fround(__nfNumber(v243) - v246);
const v248=v68["b3"];
const v249=__nfValue(v248["w5"]);
const v250=v69["b3"];
const v251=__nfValue(v250["w5"]);
const v252=Math.fround(__nfNumber(v70) * __nfNumber(v251));
const v253=Math.fround(__nfNumber(v249) - v252);
const v254=v68["b3"];
const v255=__nfValue(v254["w6"]);
const v256=v69["b3"];
const v257=__nfValue(v256["w6"]);
const v258=Math.fround(__nfNumber(v70) * __nfNumber(v257));
const v259=Math.fround(__nfNumber(v255) - v258);
const v260=v68["b3"];
const v261=__nfValue(v260["w7"]);
const v262=v69["b3"];
const v263=__nfValue(v262["w7"]);
const v264=Math.fround(__nfNumber(v70) * __nfNumber(v263));
const v265=Math.fround(__nfNumber(v261) - v264);
const v267=v68["b4"];
const v268=__nfValue(v267["w0"]);
const v269=v69["b4"];
const v270=__nfValue(v269["w0"]);
const v271=Math.fround(__nfNumber(v70) * __nfNumber(v270));
const v272=Math.fround(__nfNumber(v268) - v271);
const v273=v68["b4"];
const v274=__nfValue(v273["w1"]);
const v275=v69["b4"];
const v276=__nfValue(v275["w1"]);
const v277=Math.fround(__nfNumber(v70) * __nfNumber(v276));
const v278=Math.fround(__nfNumber(v274) - v277);
const v279=v68["b4"];
const v280=__nfValue(v279["w2"]);
const v281=v69["b4"];
const v282=__nfValue(v281["w2"]);
const v283=Math.fround(__nfNumber(v70) * __nfNumber(v282));
const v284=Math.fround(__nfNumber(v280) - v283);
const v285=v68["b4"];
const v286=__nfValue(v285["w3"]);
const v287=v69["b4"];
const v288=__nfValue(v287["w3"]);
const v289=Math.fround(__nfNumber(v70) * __nfNumber(v288));
const v290=Math.fround(__nfNumber(v286) - v289);
const v291=v68["b4"];
const v292=__nfValue(v291["w4"]);
const v293=v69["b4"];
const v294=__nfValue(v293["w4"]);
const v295=Math.fround(__nfNumber(v70) * __nfNumber(v294));
const v296=Math.fround(__nfNumber(v292) - v295);
const v297=v68["b4"];
const v298=__nfValue(v297["w5"]);
const v299=v69["b4"];
const v300=__nfValue(v299["w5"]);
const v301=Math.fround(__nfNumber(v70) * __nfNumber(v300));
const v302=Math.fround(__nfNumber(v298) - v301);
const v303=v68["b4"];
const v304=__nfValue(v303["w6"]);
const v305=v69["b4"];
const v306=__nfValue(v305["w6"]);
const v307=Math.fround(__nfNumber(v70) * __nfNumber(v306));
const v308=Math.fround(__nfNumber(v304) - v307);
const v309=v68["b4"];
const v310=__nfValue(v309["w7"]);
const v311=v69["b4"];
const v312=__nfValue(v311["w7"]);
const v313=Math.fround(__nfNumber(v70) * __nfNumber(v312));
const v314=Math.fround(__nfNumber(v310) - v313);
const v316=v68["b5"];
const v317=__nfValue(v316["w0"]);
const v318=v69["b5"];
const v319=__nfValue(v318["w0"]);
const v320=Math.fround(__nfNumber(v70) * __nfNumber(v319));
const v321=Math.fround(__nfNumber(v317) - v320);
const v322=v68["b5"];
const v323=__nfValue(v322["w1"]);
const v324=v69["b5"];
const v325=__nfValue(v324["w1"]);
const v326=Math.fround(__nfNumber(v70) * __nfNumber(v325));
const v327=Math.fround(__nfNumber(v323) - v326);
const v328=v68["b5"];
const v329=__nfValue(v328["w2"]);
const v330=v69["b5"];
const v331=__nfValue(v330["w2"]);
const v332=Math.fround(__nfNumber(v70) * __nfNumber(v331));
const v333=Math.fround(__nfNumber(v329) - v332);
const v334=v68["b5"];
const v335=__nfValue(v334["w3"]);
const v336=v69["b5"];
const v337=__nfValue(v336["w3"]);
const v338=Math.fround(__nfNumber(v70) * __nfNumber(v337));
const v339=Math.fround(__nfNumber(v335) - v338);
const v340=v68["b5"];
const v341=__nfValue(v340["w4"]);
const v342=v69["b5"];
const v343=__nfValue(v342["w4"]);
const v344=Math.fround(__nfNumber(v70) * __nfNumber(v343));
const v345=Math.fround(__nfNumber(v341) - v344);
const v346=v68["b5"];
const v347=__nfValue(v346["w5"]);
const v348=v69["b5"];
const v349=__nfValue(v348["w5"]);
const v350=Math.fround(__nfNumber(v70) * __nfNumber(v349));
const v351=Math.fround(__nfNumber(v347) - v350);
const v352=v68["b5"];
const v353=__nfValue(v352["w6"]);
const v354=v69["b5"];
const v355=__nfValue(v354["w6"]);
const v356=Math.fround(__nfNumber(v70) * __nfNumber(v355));
const v357=Math.fround(__nfNumber(v353) - v356);
const v358=v68["b5"];
const v359=__nfValue(v358["w7"]);
const v360=v69["b5"];
const v361=__nfValue(v360["w7"]);
const v362=Math.fround(__nfNumber(v70) * __nfNumber(v361));
const v363=Math.fround(__nfNumber(v359) - v362);
const v365=v68["b6"];
const v366=__nfValue(v365["w0"]);
const v367=v69["b6"];
const v368=__nfValue(v367["w0"]);
const v369=Math.fround(__nfNumber(v70) * __nfNumber(v368));
const v370=Math.fround(__nfNumber(v366) - v369);
const v371=v68["b6"];
const v372=__nfValue(v371["w1"]);
const v373=v69["b6"];
const v374=__nfValue(v373["w1"]);
const v375=Math.fround(__nfNumber(v70) * __nfNumber(v374));
const v376=Math.fround(__nfNumber(v372) - v375);
const v377=v68["b6"];
const v378=__nfValue(v377["w2"]);
const v379=v69["b6"];
const v380=__nfValue(v379["w2"]);
const v381=Math.fround(__nfNumber(v70) * __nfNumber(v380));
const v382=Math.fround(__nfNumber(v378) - v381);
const v383=v68["b6"];
const v384=__nfValue(v383["w3"]);
const v385=v69["b6"];
const v386=__nfValue(v385["w3"]);
const v387=Math.fround(__nfNumber(v70) * __nfNumber(v386));
const v388=Math.fround(__nfNumber(v384) - v387);
const v389=v68["b6"];
const v390=__nfValue(v389["w4"]);
const v391=v69["b6"];
const v392=__nfValue(v391["w4"]);
const v393=Math.fround(__nfNumber(v70) * __nfNumber(v392));
const v394=Math.fround(__nfNumber(v390) - v393);
const v395=v68["b6"];
const v396=__nfValue(v395["w5"]);
const v397=v69["b6"];
const v398=__nfValue(v397["w5"]);
const v399=Math.fround(__nfNumber(v70) * __nfNumber(v398));
const v400=Math.fround(__nfNumber(v396) - v399);
const v401=v68["b6"];
const v402=__nfValue(v401["w6"]);
const v403=v69["b6"];
const v404=__nfValue(v403["w6"]);
const v405=Math.fround(__nfNumber(v70) * __nfNumber(v404));
const v406=Math.fround(__nfNumber(v402) - v405);
const v407=v68["b6"];
const v408=__nfValue(v407["w7"]);
const v409=v69["b6"];
const v410=__nfValue(v409["w7"]);
const v411=Math.fround(__nfNumber(v70) * __nfNumber(v410));
const v412=Math.fround(__nfNumber(v408) - v411);
const v414=v68["b7"];
const v415=__nfValue(v414["w0"]);
const v416=v69["b7"];
const v417=__nfValue(v416["w0"]);
const v418=Math.fround(__nfNumber(v70) * __nfNumber(v417));
const v419=Math.fround(__nfNumber(v415) - v418);
const v420=v68["b7"];
const v421=__nfValue(v420["w1"]);
const v422=v69["b7"];
const v423=__nfValue(v422["w1"]);
const v424=Math.fround(__nfNumber(v70) * __nfNumber(v423));
const v425=Math.fround(__nfNumber(v421) - v424);
const v426=v68["b7"];
const v427=__nfValue(v426["w2"]);
const v428=v69["b7"];
const v429=__nfValue(v428["w2"]);
const v430=Math.fround(__nfNumber(v70) * __nfNumber(v429));
const v431=Math.fround(__nfNumber(v427) - v430);
const v432=v68["b7"];
const v433=__nfValue(v432["w3"]);
const v434=v69["b7"];
const v435=__nfValue(v434["w3"]);
const v436=Math.fround(__nfNumber(v70) * __nfNumber(v435));
const v437=Math.fround(__nfNumber(v433) - v436);
const v438=v68["b7"];
const v439=__nfValue(v438["w4"]);
const v440=v69["b7"];
const v441=__nfValue(v440["w4"]);
const v442=Math.fround(__nfNumber(v70) * __nfNumber(v441));
const v443=Math.fround(__nfNumber(v439) - v442);
const v444=v68["b7"];
const v445=__nfValue(v444["w5"]);
const v446=v69["b7"];
const v447=__nfValue(v446["w5"]);
const v448=Math.fround(__nfNumber(v70) * __nfNumber(v447));
const v449=Math.fround(__nfNumber(v445) - v448);
const v450=v68["b7"];
const v451=__nfValue(v450["w6"]);
const v452=v69["b7"];
const v453=__nfValue(v452["w6"]);
const v454=Math.fround(__nfNumber(v70) * __nfNumber(v453));
const v455=Math.fround(__nfNumber(v451) - v454);
const v456=v68["b7"];
const v457=__nfValue(v456["w7"]);
const v458=v69["b7"];
const v459=__nfValue(v458["w7"]);
const v460=Math.fround(__nfNumber(v70) * __nfNumber(v459));
const v461=Math.fround(__nfNumber(v457) - v460);
return ({["b0"]:({["w0"]:v76,["w1"]:v82,["w2"]:v88,["w3"]:v94,["w4"]:v100,["w5"]:v106,["w6"]:v112,["w7"]:v118}),["b1"]:({["w0"]:v125,["w1"]:v131,["w2"]:v137,["w3"]:v143,["w4"]:v149,["w5"]:v155,["w6"]:v161,["w7"]:v167}),["b2"]:({["w0"]:v174,["w1"]:v180,["w2"]:v186,["w3"]:v192,["w4"]:v198,["w5"]:v204,["w6"]:v210,["w7"]:v216}),["b3"]:({["w0"]:v223,["w1"]:v229,["w2"]:v235,["w3"]:v241,["w4"]:v247,["w5"]:v253,["w6"]:v259,["w7"]:v265}),["b4"]:({["w0"]:v272,["w1"]:v278,["w2"]:v284,["w3"]:v290,["w4"]:v296,["w5"]:v302,["w6"]:v308,["w7"]:v314}),["b5"]:({["w0"]:v321,["w1"]:v327,["w2"]:v333,["w3"]:v339,["w4"]:v345,["w5"]:v351,["w6"]:v357,["w7"]:v363}),["b6"]:({["w0"]:v370,["w1"]:v376,["w2"]:v382,["w3"]:v388,["w4"]:v394,["w5"]:v400,["w6"]:v406,["w7"]:v412}),["b7"]:({["w0"]:v419,["w1"]:v425,["w2"]:v431,["w3"]:v437,["w4"]:v443,["w5"]:v449,["w6"]:v455,["w7"]:v461})});}
function __fn5(v463,v464,v465){
v464=__nfValue(v464);
v465=__nfValue(v465);
const v466=4096;
const v467=true;
const v468=__fn2(v463,v464,v466,v467);
let v469;if(Object.hasOwn(v468,"Ok")){
const v470=v468["Ok"];
v469=__fn4(v463,v470,v465);}else{
const v471=v468["Err"];
v469=v463;}
return v469;}
function __fn6(v472){
v472=__nfValue(v472);
const v473=4294967295;
return ({["value"]:v472,["id"]:v473});}
function __fn7(v474,v475,v476){
const v477=false;
const v478=(v476===v477);
let v479=v478;if(!v479){
v479=v474["failed"];}
let v480;if(v479){
const v481=__nfValue(v475["value"]);
const v482=__fn6(v481);
v480=({["value"]:v482,["tape"]:v474});}else{
const v483=v474["nodes"];
const v484=(v483).length;
const v485=v474["maximum"];
let v486;if(((v484) >= (v485))){
const v487=__nfValue(v475["value"]);
const v488=__fn6(v487);
const v489=true;
const v490=v474["nodes"];
const v491=v474["maximum"];
v486=({["value"]:v488,["tape"]:({["nodes"]:v490,["maximum"]:v491,["failed"]:v489})});}else{
const v493=__nfValue(v475["value"]);
const v495=v474["nodes"];
const v496=__tempEdit(v495,"push",v475);
const v497=v474["maximum"];
const v498=v474["failed"];
v486=({["value"]:({["value"]:v493,["id"]:v484}),["tape"]:({["nodes"]:v496,["maximum"]:v497,["failed"]:v498})});}
v480=v486;}
return v480;}
function __fn8(v500,v501){
v500=__nfValue(v500);
const v502=0;
const v503=4294967295;
const v504=4294967295;
const v505=0.0;
const v507=true;
const v508=false;
const v509=(v507===v508);
let v510=v509;if(!v510){
v510=v501["failed"];}
let v511;
let v512;
if(v510){
const v513=__fn6(v500);
v511=v513;
v512=v501;
}else{
const v514=v501["nodes"];
const v515=(v514).length;
const v516=v501["maximum"];
let v517;
let v518;
if(((v515) >= (v516))){
const v519=__fn6(v500);
const v520=true;
const v521=v501["nodes"];
const v522=v501["maximum"];
const v524=({["value"]:v519,["tape"]:({["nodes"]:v521,["maximum"]:v522,["failed"]:v520})});
v517=v524["value"];
v518=v524["tape"];
}else{
const v526=v501["nodes"];
const v527=({["op"]:v502,["a"]:v503,["b"]:v504,["av"]:v505,["bv"]:v505,["value"]:v500});
const v528=__tempEdit(v526,"push",v527);
const v529=v501["maximum"];
const v530=v501["failed"];
const v532=({["value"]:({["value"]:v500,["id"]:v515}),["tape"]:({["nodes"]:v528,["maximum"]:v529,["failed"]:v530})});
v517=v532["value"];
v518=v532["tape"];
}
v511=v517;
v512=v518;
}
return ({["value"]:v511,["tape"]:v512});}
function __fn9(v533,v534,v535,v536){
const v537=1;
let v538;if((v533===v537)){
const v539=__nfValue(v535["value"]);
const v540=__nfValue(v536["value"]);
v538=Math.fround(__nfNumber(v539) + __nfNumber(v540));}else{
const v541=2;
let v542;if((v533===v541)){
const v543=__nfValue(v535["value"]);
const v544=__nfValue(v536["value"]);
v542=Math.fround(__nfNumber(v543) - __nfNumber(v544));}else{
const v545=3;
let v546;if((v533===v545)){
const v547=__nfValue(v535["value"]);
const v548=__nfValue(v536["value"]);
v546=Math.fround(__nfNumber(v547) * __nfNumber(v548));}else{
v546=Math.fround((__nfNumber(__nfValue(v535["value"])))/(__nfNumber(__nfValue(v536["value"]))));}
v542=v546;}
v538=v542;}
const v549=v538;
const v550=v535["id"];
const v551=v536["id"];
const v552=__nfValue(v535["value"]);
const v553=__nfValue(v536["value"]);
const v555=v535["id"];
const v556=4294967295;
const v557=!(v555===v556);
let v558=v557;if(!v558){
const v559=v536["id"];
const v560=4294967295;
v558=!(v559===v560);}
const v561=v558;
const v562=false;
const v563=(v561===v562);
let v564=v563;if(!v564){
v564=v534["failed"];}
let v565;
let v566;
if(v564){
const v567=__fn6(v549);
v565=v567;
v566=v534;
}else{
const v568=v534["nodes"];
const v569=(v568).length;
const v570=v534["maximum"];
let v571;
let v572;
if(((v569) >= (v570))){
const v573=__fn6(v549);
const v574=true;
const v575=v534["nodes"];
const v576=v534["maximum"];
const v578=({["value"]:v573,["tape"]:({["nodes"]:v575,["maximum"]:v576,["failed"]:v574})});
v571=v578["value"];
v572=v578["tape"];
}else{
const v580=v534["nodes"];
const v581=({["op"]:v533,["a"]:v550,["b"]:v551,["av"]:v552,["bv"]:v553,["value"]:v549});
const v582=__tempEdit(v580,"push",v581);
const v583=v534["maximum"];
const v584=v534["failed"];
const v586=({["value"]:({["value"]:v549,["id"]:v569}),["tape"]:({["nodes"]:v582,["maximum"]:v583,["failed"]:v584})});
v571=v586["value"];
v572=v586["tape"];
}
v565=v571;
v566=v572;
}
return ({["value"]:v565,["tape"]:v566});}
function __fn10(v587,v588,v589){
const v590=5;
let v591;if((v587===v590)){
const v592=__nfValue(v589["value"]);
v591=__nfNeg(v592);}else{
v591=Math.fround(Math.sqrt(__nfNumber(__nfValue(v589["value"]))));}
const v593=v591;
const v594=v589["id"];
const v595=4294967295;
const v596=__nfValue(v589["value"]);
const v597=0.0;
const v599=v589["id"];
const v600=4294967295;
const v601=!(v599===v600);
const v602=false;
const v603=(v601===v602);
let v604=v603;if(!v604){
v604=v588["failed"];}
let v605;
let v606;
if(v604){
const v607=__fn6(v593);
v605=v607;
v606=v588;
}else{
const v608=v588["nodes"];
const v609=(v608).length;
const v610=v588["maximum"];
let v611;
let v612;
if(((v609) >= (v610))){
const v613=__fn6(v593);
const v614=true;
const v615=v588["nodes"];
const v616=v588["maximum"];
const v618=({["value"]:v613,["tape"]:({["nodes"]:v615,["maximum"]:v616,["failed"]:v614})});
v611=v618["value"];
v612=v618["tape"];
}else{
const v620=v588["nodes"];
const v621=({["op"]:v587,["a"]:v594,["b"]:v595,["av"]:v596,["bv"]:v597,["value"]:v593});
const v622=__tempEdit(v620,"push",v621);
const v623=v588["maximum"];
const v624=v588["failed"];
const v626=({["value"]:({["value"]:v593,["id"]:v609}),["tape"]:({["nodes"]:v622,["maximum"]:v623,["failed"]:v624})});
v611=v626["value"];
v612=v626["tape"];
}
v605=v611;
v606=v612;
}
return ({["value"]:v605,["tape"]:v606});}
function __fn11(v627,v628,v629){
v629=__nfValue(v629);
const v630=4294967295;
let v631;if((v628===v630)){
v631=v627;}else{
let v632;if(v628<v627.length){v632=v627.item(v628);}else{
v632=0.0;}
const v633=__nfValue(v632);
v631=__tempSet(v627,v628,Math.fround(__nfNumber(v633) + __nfNumber(v629)),false);}
return v631;}
function __fn12(v634,v635,v636){
v635=__nfValue(v635);
const v637=v634["op"];
const v638=1;
let v639;if((v637===v638)){
const v640=v634["a"];
const v641=4294967295;
let v642;if((v640===v641)){
v642=v636;}else{
let v643;if(v640<v636.length){v643=v636.item(v640);}else{
v643=0.0;}
const v644=__nfValue(v643);
v642=__tempSet(v636,v640,Math.fround(__nfNumber(v644) + __nfNumber(v635)),false);}
const v645=v642;
const v646=v634["b"];
const v647=4294967295;
let v648;if((v646===v647)){
v648=v645;}else{
let v649;if(v646<v645.length){v649=v645.item(v646);}else{
v649=0.0;}
const v650=__nfValue(v649);
v648=__tempSet(v645,v646,Math.fround(__nfNumber(v650) + __nfNumber(v635)),false);}
v639=v648;}else{
const v651=v634["op"];
const v652=2;
let v653;if((v651===v652)){
const v654=v634["a"];
const v655=4294967295;
let v656;if((v654===v655)){
v656=v636;}else{
let v657;if(v654<v636.length){v657=v636.item(v654);}else{
v657=0.0;}
const v658=__nfValue(v657);
v656=__tempSet(v636,v654,Math.fround(__nfNumber(v658) + __nfNumber(v635)),false);}
const v659=v656;
const v660=v634["b"];
const v661=__nfNeg(v635);
const v662=4294967295;
let v663;if((v660===v662)){
v663=v659;}else{
let v664;if(v660<v659.length){v664=v659.item(v660);}else{
v664=0.0;}
const v665=__nfValue(v664);
v663=__tempSet(v659,v660,Math.fround(__nfNumber(v665) + __nfNumber(v661)),false);}
v653=v663;}else{
const v666=v634["op"];
const v667=3;
let v668;if((v666===v667)){
const v669=v634["a"];
const v670=__nfValue(v634["bv"]);
const v671=Math.fround(__nfNumber(v635) * __nfNumber(v670));
const v672=4294967295;
let v673;if((v669===v672)){
v673=v636;}else{
let v674;if(v669<v636.length){v674=v636.item(v669);}else{
v674=0.0;}
const v675=__nfValue(v674);
v673=__tempSet(v636,v669,Math.fround(__nfNumber(v675) + v671),false);}
const v676=v673;
const v677=v634["b"];
const v678=__nfValue(v634["av"]);
const v679=Math.fround(__nfNumber(v635) * __nfNumber(v678));
const v680=4294967295;
let v681;if((v677===v680)){
v681=v676;}else{
let v682;if(v677<v676.length){v682=v676.item(v677);}else{
v682=0.0;}
const v683=__nfValue(v682);
v681=__tempSet(v676,v677,Math.fround(__nfNumber(v683) + v679),false);}
v668=v681;}else{
const v684=v634["op"];
const v685=4;
let v686;if((v684===v685)){
const v687=v634["a"];
const v688=Math.fround((__nfNumber(v635))/(__nfNumber(__nfValue(v634["bv"]))));
const v689=4294967295;
let v690;if((v687===v689)){
v690=v636;}else{
let v691;if(v687<v636.length){v691=v636.item(v687);}else{
v691=0.0;}
const v692=__nfValue(v691);
v690=__tempSet(v636,v687,Math.fround(__nfNumber(v692) + v688),false);}
const v693=v690;
const v694=v634["b"];
const v695=__nfValue(v634["av"]);
const v696=__nfValue(v634["bv"]);
const v697=__nfValue(v634["bv"]);
const v698=Math.fround((__nfNumber(Math.fround(__nfNumber(v635) * __nfNumber(v695))))/(__nfNumber(Math.fround(__nfNumber(v696) * __nfNumber(v697)))));
const v699=__nfNeg(v698);
const v700=4294967295;
let v701;if((v694===v700)){
v701=v693;}else{
let v702;if(v694<v693.length){v702=v693.item(v694);}else{
v702=0.0;}
const v703=__nfValue(v702);
v701=__tempSet(v693,v694,Math.fround(__nfNumber(v703) + __nfNumber(v699)),false);}
v686=v701;}else{
const v704=v634["op"];
const v705=5;
let v706;if((v704===v705)){
const v707=v634["a"];
const v708=__nfNeg(v635);
const v709=4294967295;
let v710;if((v707===v709)){
v710=v636;}else{
let v711;if(v707<v636.length){v711=v636.item(v707);}else{
v711=0.0;}
const v712=__nfValue(v711);
v710=__tempSet(v636,v707,Math.fround(__nfNumber(v712) + __nfNumber(v708)),false);}
v706=v710;}else{
const v713=v634["op"];
const v714=6;
let v715;if((v713===v714)){
const v716=v634["a"];
const v717=2.0;
const v718=__nfValue(v634["value"]);
const v719=Math.fround((__nfNumber(v635))/(__nfNumber(Math.fround(v717 * __nfNumber(v718)))));
const v720=4294967295;
let v721;if((v716===v720)){
v721=v636;}else{
let v722;if(v716<v636.length){v722=v636.item(v716);}else{
v722=0.0;}
const v723=__nfValue(v722);
v721=__tempSet(v636,v716,Math.fround(__nfNumber(v723) + v719),false);}
v715=v721;}else{
v715=v636;}
v706=v715;}
v686=v706;}
v668=v686;}
v653=v668;}
v639=v653;}
return v639;}
function __fn13(v724,v725,v726){
const v727=v725["index"];
const v728=1;
const v729=(((v727) - (v728)) >>> 0);
const v730=v725["gradient"];
let v731;if(v729<v730.length){v731=v730.item(v729);}else{
v731=0.0;}
const v732=__nfValue(v731);
let v733=v726;if(v733){
const v734=0.0;
v733=((__nfNumber(v732)) === (__nfNumber(v734)));}
let v735;if(v733){
v735=v725["gradient"];}else{
const v736=v725["gradient"];
const v737=v724["op"];
const v738=1;
let v739;if((v737===v738)){
const v740=v724["a"];
const v741=4294967295;
let v742;if((v740===v741)){
v742=v736;}else{
let v743;if(v740<v736.length){v743=v736.item(v740);}else{
v743=0.0;}
const v744=__nfValue(v743);
v742=__tempSet(v736,v740,Math.fround(__nfNumber(v744) + __nfNumber(v732)),false);}
const v745=v742;
const v746=v724["b"];
const v747=4294967295;
let v748;if((v746===v747)){
v748=v745;}else{
let v749;if(v746<v745.length){v749=v745.item(v746);}else{
v749=0.0;}
const v750=__nfValue(v749);
v748=__tempSet(v745,v746,Math.fround(__nfNumber(v750) + __nfNumber(v732)),false);}
v739=v748;}else{
const v751=v724["op"];
const v752=2;
let v753;if((v751===v752)){
const v754=v724["a"];
const v755=4294967295;
let v756;if((v754===v755)){
v756=v736;}else{
let v757;if(v754<v736.length){v757=v736.item(v754);}else{
v757=0.0;}
const v758=__nfValue(v757);
v756=__tempSet(v736,v754,Math.fround(__nfNumber(v758) + __nfNumber(v732)),false);}
const v759=v756;
const v760=v724["b"];
const v761=__nfNeg(v732);
const v762=4294967295;
let v763;if((v760===v762)){
v763=v759;}else{
let v764;if(v760<v759.length){v764=v759.item(v760);}else{
v764=0.0;}
const v765=__nfValue(v764);
v763=__tempSet(v759,v760,Math.fround(__nfNumber(v765) + __nfNumber(v761)),false);}
v753=v763;}else{
const v766=v724["op"];
const v767=3;
let v768;if((v766===v767)){
const v769=v724["a"];
const v770=__nfValue(v724["bv"]);
const v771=Math.fround(__nfNumber(v732) * __nfNumber(v770));
const v772=4294967295;
let v773;if((v769===v772)){
v773=v736;}else{
let v774;if(v769<v736.length){v774=v736.item(v769);}else{
v774=0.0;}
const v775=__nfValue(v774);
v773=__tempSet(v736,v769,Math.fround(__nfNumber(v775) + v771),false);}
const v776=v773;
const v777=v724["b"];
const v778=__nfValue(v724["av"]);
const v779=Math.fround(__nfNumber(v732) * __nfNumber(v778));
const v780=4294967295;
let v781;if((v777===v780)){
v781=v776;}else{
let v782;if(v777<v776.length){v782=v776.item(v777);}else{
v782=0.0;}
const v783=__nfValue(v782);
v781=__tempSet(v776,v777,Math.fround(__nfNumber(v783) + v779),false);}
v768=v781;}else{
const v784=v724["op"];
const v785=4;
let v786;if((v784===v785)){
const v787=v724["a"];
const v788=Math.fround((__nfNumber(v732))/(__nfNumber(__nfValue(v724["bv"]))));
const v789=4294967295;
let v790;if((v787===v789)){
v790=v736;}else{
let v791;if(v787<v736.length){v791=v736.item(v787);}else{
v791=0.0;}
const v792=__nfValue(v791);
v790=__tempSet(v736,v787,Math.fround(__nfNumber(v792) + v788),false);}
const v793=v790;
const v794=v724["b"];
const v795=__nfValue(v724["av"]);
const v796=__nfValue(v724["bv"]);
const v797=__nfValue(v724["bv"]);
const v798=Math.fround((__nfNumber(Math.fround(__nfNumber(v732) * __nfNumber(v795))))/(__nfNumber(Math.fround(__nfNumber(v796) * __nfNumber(v797)))));
const v799=__nfNeg(v798);
const v800=4294967295;
let v801;if((v794===v800)){
v801=v793;}else{
let v802;if(v794<v793.length){v802=v793.item(v794);}else{
v802=0.0;}
const v803=__nfValue(v802);
v801=__tempSet(v793,v794,Math.fround(__nfNumber(v803) + __nfNumber(v799)),false);}
v786=v801;}else{
const v804=v724["op"];
const v805=5;
let v806;if((v804===v805)){
const v807=v724["a"];
const v808=__nfNeg(v732);
const v809=4294967295;
let v810;if((v807===v809)){
v810=v736;}else{
let v811;if(v807<v736.length){v811=v736.item(v807);}else{
v811=0.0;}
const v812=__nfValue(v811);
v810=__tempSet(v736,v807,Math.fround(__nfNumber(v812) + __nfNumber(v808)),false);}
v806=v810;}else{
const v813=v724["op"];
const v814=6;
let v815;if((v813===v814)){
const v816=v724["a"];
const v817=2.0;
const v818=__nfValue(v724["value"]);
const v819=Math.fround((__nfNumber(v732))/(__nfNumber(Math.fround(v817 * __nfNumber(v818)))));
const v820=4294967295;
let v821;if((v816===v820)){
v821=v736;}else{
let v822;if(v816<v736.length){v822=v736.item(v816);}else{
v822=0.0;}
const v823=__nfValue(v822);
v821=__tempSet(v736,v816,Math.fround(__nfNumber(v823) + v819),false);}
v815=v821;}else{
v815=v736;}
v806=v815;}
v786=v806;}
v768=v786;}
v753=v768;}
v739=v753;}
v735=v739;}
const v824=v735;
return ({["index"]:v729,["gradient"]:v824});}
function __fn14(v825,v826,v827){
let v828=new __InkBuffer([]);
for(let v829=0;v829<v825.length;v829++){
const v830=v825[v829];
const v831=v828;
const v832=0.0;
v828=__tempEdit(v831,"push",v832);
}
const v833=v828;
const v834=v826["id"];
const v835=1.0;
const v836=4294967295;
let v837;if((v834===v836)){
v837=v833;}else{
let v838;if(v834<v833.length){v838=v833.item(v834);}else{
v838=0.0;}
const v839=__nfValue(v838);
v837=__tempSet(v833,v834,Math.fround(__nfNumber(v839) + v835),false);}
const v840=v837;
const v841=(v825).length;
let v842=v840;
let v843=v841;
for(let v845=v825.length-1;v845>=0;v845--){
const v846=v825[v845];
const v847=v842;
const v848=v843;
const v851=1;
const v852=(((v848) - (v851)) >>> 0);
let v853;if(v852<v847.length){v853=v847.item(v852);}else{
v853=0.0;}
const v854=__nfValue(v853);
let v855=v827;if(v855){
const v856=0.0;
v855=((__nfNumber(v854)) === (__nfNumber(v856)));}
let v857;if(v855){
v857=v847;}else{
const v858=v846["op"];
const v859=1;
let v860;if((v858===v859)){
const v861=v846["a"];
const v862=4294967295;
let v863;if((v861===v862)){
v863=v847;}else{
let v864;if(v861<v847.length){v864=v847.item(v861);}else{
v864=0.0;}
const v865=__nfValue(v864);
v863=__tempSet(v847,v861,Math.fround(__nfNumber(v865) + __nfNumber(v854)),false);}
const v866=v863;
const v867=v846["b"];
const v868=4294967295;
let v869;if((v867===v868)){
v869=v866;}else{
let v870;if(v867<v866.length){v870=v866.item(v867);}else{
v870=0.0;}
const v871=__nfValue(v870);
v869=__tempSet(v866,v867,Math.fround(__nfNumber(v871) + __nfNumber(v854)),false);}
v860=v869;}else{
const v872=v846["op"];
const v873=2;
let v874;if((v872===v873)){
const v875=v846["a"];
const v876=4294967295;
let v877;if((v875===v876)){
v877=v847;}else{
let v878;if(v875<v847.length){v878=v847.item(v875);}else{
v878=0.0;}
const v879=__nfValue(v878);
v877=__tempSet(v847,v875,Math.fround(__nfNumber(v879) + __nfNumber(v854)),false);}
const v880=v877;
const v881=v846["b"];
const v882=__nfNeg(v854);
const v883=4294967295;
let v884;if((v881===v883)){
v884=v880;}else{
let v885;if(v881<v880.length){v885=v880.item(v881);}else{
v885=0.0;}
const v886=__nfValue(v885);
v884=__tempSet(v880,v881,Math.fround(__nfNumber(v886) + __nfNumber(v882)),false);}
v874=v884;}else{
const v887=v846["op"];
const v888=3;
let v889;if((v887===v888)){
const v890=v846["a"];
const v891=__nfValue(v846["bv"]);
const v892=Math.fround(__nfNumber(v854) * __nfNumber(v891));
const v893=4294967295;
let v894;if((v890===v893)){
v894=v847;}else{
let v895;if(v890<v847.length){v895=v847.item(v890);}else{
v895=0.0;}
const v896=__nfValue(v895);
v894=__tempSet(v847,v890,Math.fround(__nfNumber(v896) + v892),false);}
const v897=v894;
const v898=v846["b"];
const v899=__nfValue(v846["av"]);
const v900=Math.fround(__nfNumber(v854) * __nfNumber(v899));
const v901=4294967295;
let v902;if((v898===v901)){
v902=v897;}else{
let v903;if(v898<v897.length){v903=v897.item(v898);}else{
v903=0.0;}
const v904=__nfValue(v903);
v902=__tempSet(v897,v898,Math.fround(__nfNumber(v904) + v900),false);}
v889=v902;}else{
const v905=v846["op"];
const v906=4;
let v907;if((v905===v906)){
const v908=v846["a"];
const v909=Math.fround((__nfNumber(v854))/(__nfNumber(__nfValue(v846["bv"]))));
const v910=4294967295;
let v911;if((v908===v910)){
v911=v847;}else{
let v912;if(v908<v847.length){v912=v847.item(v908);}else{
v912=0.0;}
const v913=__nfValue(v912);
v911=__tempSet(v847,v908,Math.fround(__nfNumber(v913) + v909),false);}
const v914=v911;
const v915=v846["b"];
const v916=__nfValue(v846["av"]);
const v917=__nfValue(v846["bv"]);
const v918=__nfValue(v846["bv"]);
const v919=Math.fround((__nfNumber(Math.fround(__nfNumber(v854) * __nfNumber(v916))))/(__nfNumber(Math.fround(__nfNumber(v917) * __nfNumber(v918)))));
const v920=__nfNeg(v919);
const v921=4294967295;
let v922;if((v915===v921)){
v922=v914;}else{
let v923;if(v915<v914.length){v923=v914.item(v915);}else{
v923=0.0;}
const v924=__nfValue(v923);
v922=__tempSet(v914,v915,Math.fround(__nfNumber(v924) + __nfNumber(v920)),false);}
v907=v922;}else{
const v925=v846["op"];
const v926=5;
let v927;if((v925===v926)){
const v928=v846["a"];
const v929=__nfNeg(v854);
const v930=4294967295;
let v931;if((v928===v930)){
v931=v847;}else{
let v932;if(v928<v847.length){v932=v847.item(v928);}else{
v932=0.0;}
const v933=__nfValue(v932);
v931=__tempSet(v847,v928,Math.fround(__nfNumber(v933) + __nfNumber(v929)),false);}
v927=v931;}else{
const v934=v846["op"];
const v935=6;
let v936;if((v934===v935)){
const v937=v846["a"];
const v938=2.0;
const v939=__nfValue(v846["value"]);
const v940=Math.fround((__nfNumber(v854))/(__nfNumber(Math.fround(v938 * __nfNumber(v939)))));
const v941=4294967295;
let v942;if((v937===v941)){
v942=v847;}else{
let v943;if(v937<v847.length){v943=v847.item(v937);}else{
v943=0.0;}
const v944=__nfValue(v943);
v942=__tempSet(v847,v937,Math.fround(__nfNumber(v944) + v940),false);}
v936=v942;}else{
v936=v847;}
v927=v936;}
v907=v927;}
v889=v907;}
v874=v889;}
v860=v874;}
v857=v860;}
const v945=v857;
const v946=({["index"]:v852,["gradient"]:v945});
v842=v946["gradient"];
v843=v946["index"];
}
const v948=v842;
return v948.freeze();}
function __fn15(v949,v950){
const v952=v949["w0"];
const v955=v949["w0"];
const v957=3;
const v958=1;
let v959;if((v957===v958)){
const v960=__nfValue(v952["value"]);
const v961=__nfValue(v955["value"]);
v959=Math.fround(__nfNumber(v960) + __nfNumber(v961));}else{
const v962=2;
let v963;if((v957===v962)){
const v964=__nfValue(v952["value"]);
const v965=__nfValue(v955["value"]);
v963=Math.fround(__nfNumber(v964) - __nfNumber(v965));}else{
const v966=3;
let v967;if((v957===v966)){
const v968=__nfValue(v952["value"]);
const v969=__nfValue(v955["value"]);
v967=Math.fround(__nfNumber(v968) * __nfNumber(v969));}else{
v967=Math.fround((__nfNumber(__nfValue(v952["value"])))/(__nfNumber(__nfValue(v955["value"]))));}
v963=v967;}
v959=v963;}
const v970=v959;
const v971=v952["id"];
const v972=v955["id"];
const v973=__nfValue(v952["value"]);
const v974=__nfValue(v955["value"]);
const v976=v952["id"];
const v977=4294967295;
const v978=!(v976===v977);
let v979=v978;if(!v979){
const v980=v955["id"];
const v981=4294967295;
v979=!(v980===v981);}
const v982=v979;
const v983=false;
const v984=(v982===v983);
let v985=v984;if(!v985){
v985=v950["failed"];}
let v986;
let v987;
if(v985){
const v988=__fn6(v970);
v986=v988;
v987=v950;
}else{
const v989=v950["nodes"];
const v990=(v989).length;
const v991=v950["maximum"];
let v992;
let v993;
if(((v990) >= (v991))){
const v994=__fn6(v970);
const v995=true;
const v996=v950["nodes"];
const v997=v950["maximum"];
const v999=({["value"]:v994,["tape"]:({["nodes"]:v996,["maximum"]:v997,["failed"]:v995})});
v992=v999["value"];
v993=v999["tape"];
}else{
const v1001=v950["nodes"];
const v1002=({["op"]:v957,["a"]:v971,["b"]:v972,["av"]:v973,["bv"]:v974,["value"]:v970});
const v1003=__tempEdit(v1001,"push",v1002);
const v1004=v950["maximum"];
const v1005=v950["failed"];
const v1007=({["value"]:({["value"]:v970,["id"]:v990}),["tape"]:({["nodes"]:v1003,["maximum"]:v1004,["failed"]:v1005})});
v992=v1007["value"];
v993=v1007["tape"];
}
v986=v992;
v987=v993;
}
const v1009=v987;
const v1011=v949["w1"];
const v1014=v949["w1"];
const v1016=3;
const v1017=1;
let v1018;if((v1016===v1017)){
const v1019=__nfValue(v1011["value"]);
const v1020=__nfValue(v1014["value"]);
v1018=Math.fround(__nfNumber(v1019) + __nfNumber(v1020));}else{
const v1021=2;
let v1022;if((v1016===v1021)){
const v1023=__nfValue(v1011["value"]);
const v1024=__nfValue(v1014["value"]);
v1022=Math.fround(__nfNumber(v1023) - __nfNumber(v1024));}else{
const v1025=3;
let v1026;if((v1016===v1025)){
const v1027=__nfValue(v1011["value"]);
const v1028=__nfValue(v1014["value"]);
v1026=Math.fround(__nfNumber(v1027) * __nfNumber(v1028));}else{
v1026=Math.fround((__nfNumber(__nfValue(v1011["value"])))/(__nfNumber(__nfValue(v1014["value"]))));}
v1022=v1026;}
v1018=v1022;}
const v1029=v1018;
const v1030=v1011["id"];
const v1031=v1014["id"];
const v1032=__nfValue(v1011["value"]);
const v1033=__nfValue(v1014["value"]);
const v1035=v1011["id"];
const v1036=4294967295;
const v1037=!(v1035===v1036);
let v1038=v1037;if(!v1038){
const v1039=v1014["id"];
const v1040=4294967295;
v1038=!(v1039===v1040);}
const v1041=v1038;
const v1042=false;
const v1043=(v1041===v1042);
let v1044=v1043;if(!v1044){
v1044=v1009["failed"];}
let v1045;
let v1046;
if(v1044){
const v1047=__fn6(v1029);
v1045=v1047;
v1046=v1009;
}else{
const v1048=v1009["nodes"];
const v1049=(v1048).length;
const v1050=v1009["maximum"];
let v1051;
let v1052;
if(((v1049) >= (v1050))){
const v1053=__fn6(v1029);
const v1054=true;
const v1055=v1009["nodes"];
const v1056=v1009["maximum"];
const v1058=({["value"]:v1053,["tape"]:({["nodes"]:v1055,["maximum"]:v1056,["failed"]:v1054})});
v1051=v1058["value"];
v1052=v1058["tape"];
}else{
const v1060=v1009["nodes"];
const v1061=({["op"]:v1016,["a"]:v1030,["b"]:v1031,["av"]:v1032,["bv"]:v1033,["value"]:v1029});
const v1062=__tempEdit(v1060,"push",v1061);
const v1063=v1009["maximum"];
const v1064=v1009["failed"];
const v1066=({["value"]:({["value"]:v1029,["id"]:v1049}),["tape"]:({["nodes"]:v1062,["maximum"]:v1063,["failed"]:v1064})});
v1051=v1066["value"];
v1052=v1066["tape"];
}
v1045=v1051;
v1046=v1052;
}
const v1068=1;
const v1069=v1046;
const v1070=v986;
const v1071=v1045;
const v1072=1;
let v1073;if((v1068===v1072)){
const v1074=__nfValue(v1070["value"]);
const v1075=__nfValue(v1071["value"]);
v1073=Math.fround(__nfNumber(v1074) + __nfNumber(v1075));}else{
const v1076=2;
let v1077;if((v1068===v1076)){
const v1078=__nfValue(v1070["value"]);
const v1079=__nfValue(v1071["value"]);
v1077=Math.fround(__nfNumber(v1078) - __nfNumber(v1079));}else{
const v1080=3;
let v1081;if((v1068===v1080)){
const v1082=__nfValue(v1070["value"]);
const v1083=__nfValue(v1071["value"]);
v1081=Math.fround(__nfNumber(v1082) * __nfNumber(v1083));}else{
v1081=Math.fround((__nfNumber(__nfValue(v1070["value"])))/(__nfNumber(__nfValue(v1071["value"]))));}
v1077=v1081;}
v1073=v1077;}
const v1084=v1073;
const v1085=v1070["id"];
const v1086=v1071["id"];
const v1087=__nfValue(v1070["value"]);
const v1088=__nfValue(v1071["value"]);
const v1090=v1070["id"];
const v1091=4294967295;
const v1092=!(v1090===v1091);
let v1093=v1092;if(!v1093){
const v1094=v1071["id"];
const v1095=4294967295;
v1093=!(v1094===v1095);}
const v1096=v1093;
const v1097=false;
const v1098=(v1096===v1097);
let v1099=v1098;if(!v1099){
v1099=v1069["failed"];}
let v1100;
let v1101;
if(v1099){
const v1102=__fn6(v1084);
v1100=v1102;
v1101=v1069;
}else{
const v1103=v1069["nodes"];
const v1104=(v1103).length;
const v1105=v1069["maximum"];
let v1106;
let v1107;
if(((v1104) >= (v1105))){
const v1108=__fn6(v1084);
const v1109=true;
const v1110=v1069["nodes"];
const v1111=v1069["maximum"];
const v1113=({["value"]:v1108,["tape"]:({["nodes"]:v1110,["maximum"]:v1111,["failed"]:v1109})});
v1106=v1113["value"];
v1107=v1113["tape"];
}else{
const v1115=v1069["nodes"];
const v1116=({["op"]:v1068,["a"]:v1085,["b"]:v1086,["av"]:v1087,["bv"]:v1088,["value"]:v1084});
const v1117=__tempEdit(v1115,"push",v1116);
const v1118=v1069["maximum"];
const v1119=v1069["failed"];
const v1121=({["value"]:({["value"]:v1084,["id"]:v1104}),["tape"]:({["nodes"]:v1117,["maximum"]:v1118,["failed"]:v1119})});
v1106=v1121["value"];
v1107=v1121["tape"];
}
v1100=v1106;
v1101=v1107;
}
const v1123=v1101;
const v1125=v949["w2"];
const v1128=v949["w2"];
const v1130=3;
const v1131=1;
let v1132;if((v1130===v1131)){
const v1133=__nfValue(v1125["value"]);
const v1134=__nfValue(v1128["value"]);
v1132=Math.fround(__nfNumber(v1133) + __nfNumber(v1134));}else{
const v1135=2;
let v1136;if((v1130===v1135)){
const v1137=__nfValue(v1125["value"]);
const v1138=__nfValue(v1128["value"]);
v1136=Math.fround(__nfNumber(v1137) - __nfNumber(v1138));}else{
const v1139=3;
let v1140;if((v1130===v1139)){
const v1141=__nfValue(v1125["value"]);
const v1142=__nfValue(v1128["value"]);
v1140=Math.fround(__nfNumber(v1141) * __nfNumber(v1142));}else{
v1140=Math.fround((__nfNumber(__nfValue(v1125["value"])))/(__nfNumber(__nfValue(v1128["value"]))));}
v1136=v1140;}
v1132=v1136;}
const v1143=v1132;
const v1144=v1125["id"];
const v1145=v1128["id"];
const v1146=__nfValue(v1125["value"]);
const v1147=__nfValue(v1128["value"]);
const v1149=v1125["id"];
const v1150=4294967295;
const v1151=!(v1149===v1150);
let v1152=v1151;if(!v1152){
const v1153=v1128["id"];
const v1154=4294967295;
v1152=!(v1153===v1154);}
const v1155=v1152;
const v1156=false;
const v1157=(v1155===v1156);
let v1158=v1157;if(!v1158){
v1158=v1123["failed"];}
let v1159;
let v1160;
if(v1158){
const v1161=__fn6(v1143);
v1159=v1161;
v1160=v1123;
}else{
const v1162=v1123["nodes"];
const v1163=(v1162).length;
const v1164=v1123["maximum"];
let v1165;
let v1166;
if(((v1163) >= (v1164))){
const v1167=__fn6(v1143);
const v1168=true;
const v1169=v1123["nodes"];
const v1170=v1123["maximum"];
const v1172=({["value"]:v1167,["tape"]:({["nodes"]:v1169,["maximum"]:v1170,["failed"]:v1168})});
v1165=v1172["value"];
v1166=v1172["tape"];
}else{
const v1174=v1123["nodes"];
const v1175=({["op"]:v1130,["a"]:v1144,["b"]:v1145,["av"]:v1146,["bv"]:v1147,["value"]:v1143});
const v1176=__tempEdit(v1174,"push",v1175);
const v1177=v1123["maximum"];
const v1178=v1123["failed"];
const v1180=({["value"]:({["value"]:v1143,["id"]:v1163}),["tape"]:({["nodes"]:v1176,["maximum"]:v1177,["failed"]:v1178})});
v1165=v1180["value"];
v1166=v1180["tape"];
}
v1159=v1165;
v1160=v1166;
}
const v1182=1;
const v1183=v1160;
const v1184=v1100;
const v1185=v1159;
const v1186=1;
let v1187;if((v1182===v1186)){
const v1188=__nfValue(v1184["value"]);
const v1189=__nfValue(v1185["value"]);
v1187=Math.fround(__nfNumber(v1188) + __nfNumber(v1189));}else{
const v1190=2;
let v1191;if((v1182===v1190)){
const v1192=__nfValue(v1184["value"]);
const v1193=__nfValue(v1185["value"]);
v1191=Math.fround(__nfNumber(v1192) - __nfNumber(v1193));}else{
const v1194=3;
let v1195;if((v1182===v1194)){
const v1196=__nfValue(v1184["value"]);
const v1197=__nfValue(v1185["value"]);
v1195=Math.fround(__nfNumber(v1196) * __nfNumber(v1197));}else{
v1195=Math.fround((__nfNumber(__nfValue(v1184["value"])))/(__nfNumber(__nfValue(v1185["value"]))));}
v1191=v1195;}
v1187=v1191;}
const v1198=v1187;
const v1199=v1184["id"];
const v1200=v1185["id"];
const v1201=__nfValue(v1184["value"]);
const v1202=__nfValue(v1185["value"]);
const v1204=v1184["id"];
const v1205=4294967295;
const v1206=!(v1204===v1205);
let v1207=v1206;if(!v1207){
const v1208=v1185["id"];
const v1209=4294967295;
v1207=!(v1208===v1209);}
const v1210=v1207;
const v1211=false;
const v1212=(v1210===v1211);
let v1213=v1212;if(!v1213){
v1213=v1183["failed"];}
let v1214;
let v1215;
if(v1213){
const v1216=__fn6(v1198);
v1214=v1216;
v1215=v1183;
}else{
const v1217=v1183["nodes"];
const v1218=(v1217).length;
const v1219=v1183["maximum"];
let v1220;
let v1221;
if(((v1218) >= (v1219))){
const v1222=__fn6(v1198);
const v1223=true;
const v1224=v1183["nodes"];
const v1225=v1183["maximum"];
const v1227=({["value"]:v1222,["tape"]:({["nodes"]:v1224,["maximum"]:v1225,["failed"]:v1223})});
v1220=v1227["value"];
v1221=v1227["tape"];
}else{
const v1229=v1183["nodes"];
const v1230=({["op"]:v1182,["a"]:v1199,["b"]:v1200,["av"]:v1201,["bv"]:v1202,["value"]:v1198});
const v1231=__tempEdit(v1229,"push",v1230);
const v1232=v1183["maximum"];
const v1233=v1183["failed"];
const v1235=({["value"]:({["value"]:v1198,["id"]:v1218}),["tape"]:({["nodes"]:v1231,["maximum"]:v1232,["failed"]:v1233})});
v1220=v1235["value"];
v1221=v1235["tape"];
}
v1214=v1220;
v1215=v1221;
}
const v1237=v1215;
const v1239=v949["w3"];
const v1242=v949["w3"];
const v1244=3;
const v1245=1;
let v1246;if((v1244===v1245)){
const v1247=__nfValue(v1239["value"]);
const v1248=__nfValue(v1242["value"]);
v1246=Math.fround(__nfNumber(v1247) + __nfNumber(v1248));}else{
const v1249=2;
let v1250;if((v1244===v1249)){
const v1251=__nfValue(v1239["value"]);
const v1252=__nfValue(v1242["value"]);
v1250=Math.fround(__nfNumber(v1251) - __nfNumber(v1252));}else{
const v1253=3;
let v1254;if((v1244===v1253)){
const v1255=__nfValue(v1239["value"]);
const v1256=__nfValue(v1242["value"]);
v1254=Math.fround(__nfNumber(v1255) * __nfNumber(v1256));}else{
v1254=Math.fround((__nfNumber(__nfValue(v1239["value"])))/(__nfNumber(__nfValue(v1242["value"]))));}
v1250=v1254;}
v1246=v1250;}
const v1257=v1246;
const v1258=v1239["id"];
const v1259=v1242["id"];
const v1260=__nfValue(v1239["value"]);
const v1261=__nfValue(v1242["value"]);
const v1263=v1239["id"];
const v1264=4294967295;
const v1265=!(v1263===v1264);
let v1266=v1265;if(!v1266){
const v1267=v1242["id"];
const v1268=4294967295;
v1266=!(v1267===v1268);}
const v1269=v1266;
const v1270=false;
const v1271=(v1269===v1270);
let v1272=v1271;if(!v1272){
v1272=v1237["failed"];}
let v1273;
let v1274;
if(v1272){
const v1275=__fn6(v1257);
v1273=v1275;
v1274=v1237;
}else{
const v1276=v1237["nodes"];
const v1277=(v1276).length;
const v1278=v1237["maximum"];
let v1279;
let v1280;
if(((v1277) >= (v1278))){
const v1281=__fn6(v1257);
const v1282=true;
const v1283=v1237["nodes"];
const v1284=v1237["maximum"];
const v1286=({["value"]:v1281,["tape"]:({["nodes"]:v1283,["maximum"]:v1284,["failed"]:v1282})});
v1279=v1286["value"];
v1280=v1286["tape"];
}else{
const v1288=v1237["nodes"];
const v1289=({["op"]:v1244,["a"]:v1258,["b"]:v1259,["av"]:v1260,["bv"]:v1261,["value"]:v1257});
const v1290=__tempEdit(v1288,"push",v1289);
const v1291=v1237["maximum"];
const v1292=v1237["failed"];
const v1294=({["value"]:({["value"]:v1257,["id"]:v1277}),["tape"]:({["nodes"]:v1290,["maximum"]:v1291,["failed"]:v1292})});
v1279=v1294["value"];
v1280=v1294["tape"];
}
v1273=v1279;
v1274=v1280;
}
const v1296=1;
const v1297=v1274;
const v1298=v1214;
const v1299=v1273;
const v1300=1;
let v1301;if((v1296===v1300)){
const v1302=__nfValue(v1298["value"]);
const v1303=__nfValue(v1299["value"]);
v1301=Math.fround(__nfNumber(v1302) + __nfNumber(v1303));}else{
const v1304=2;
let v1305;if((v1296===v1304)){
const v1306=__nfValue(v1298["value"]);
const v1307=__nfValue(v1299["value"]);
v1305=Math.fround(__nfNumber(v1306) - __nfNumber(v1307));}else{
const v1308=3;
let v1309;if((v1296===v1308)){
const v1310=__nfValue(v1298["value"]);
const v1311=__nfValue(v1299["value"]);
v1309=Math.fround(__nfNumber(v1310) * __nfNumber(v1311));}else{
v1309=Math.fround((__nfNumber(__nfValue(v1298["value"])))/(__nfNumber(__nfValue(v1299["value"]))));}
v1305=v1309;}
v1301=v1305;}
const v1312=v1301;
const v1313=v1298["id"];
const v1314=v1299["id"];
const v1315=__nfValue(v1298["value"]);
const v1316=__nfValue(v1299["value"]);
const v1318=v1298["id"];
const v1319=4294967295;
const v1320=!(v1318===v1319);
let v1321=v1320;if(!v1321){
const v1322=v1299["id"];
const v1323=4294967295;
v1321=!(v1322===v1323);}
const v1324=v1321;
const v1325=false;
const v1326=(v1324===v1325);
let v1327=v1326;if(!v1327){
v1327=v1297["failed"];}
let v1328;
let v1329;
if(v1327){
const v1330=__fn6(v1312);
v1328=v1330;
v1329=v1297;
}else{
const v1331=v1297["nodes"];
const v1332=(v1331).length;
const v1333=v1297["maximum"];
let v1334;
let v1335;
if(((v1332) >= (v1333))){
const v1336=__fn6(v1312);
const v1337=true;
const v1338=v1297["nodes"];
const v1339=v1297["maximum"];
const v1341=({["value"]:v1336,["tape"]:({["nodes"]:v1338,["maximum"]:v1339,["failed"]:v1337})});
v1334=v1341["value"];
v1335=v1341["tape"];
}else{
const v1343=v1297["nodes"];
const v1344=({["op"]:v1296,["a"]:v1313,["b"]:v1314,["av"]:v1315,["bv"]:v1316,["value"]:v1312});
const v1345=__tempEdit(v1343,"push",v1344);
const v1346=v1297["maximum"];
const v1347=v1297["failed"];
const v1349=({["value"]:({["value"]:v1312,["id"]:v1332}),["tape"]:({["nodes"]:v1345,["maximum"]:v1346,["failed"]:v1347})});
v1334=v1349["value"];
v1335=v1349["tape"];
}
v1328=v1334;
v1329=v1335;
}
const v1351=v1329;
const v1353=v949["w4"];
const v1356=v949["w4"];
const v1358=3;
const v1359=1;
let v1360;if((v1358===v1359)){
const v1361=__nfValue(v1353["value"]);
const v1362=__nfValue(v1356["value"]);
v1360=Math.fround(__nfNumber(v1361) + __nfNumber(v1362));}else{
const v1363=2;
let v1364;if((v1358===v1363)){
const v1365=__nfValue(v1353["value"]);
const v1366=__nfValue(v1356["value"]);
v1364=Math.fround(__nfNumber(v1365) - __nfNumber(v1366));}else{
const v1367=3;
let v1368;if((v1358===v1367)){
const v1369=__nfValue(v1353["value"]);
const v1370=__nfValue(v1356["value"]);
v1368=Math.fround(__nfNumber(v1369) * __nfNumber(v1370));}else{
v1368=Math.fround((__nfNumber(__nfValue(v1353["value"])))/(__nfNumber(__nfValue(v1356["value"]))));}
v1364=v1368;}
v1360=v1364;}
const v1371=v1360;
const v1372=v1353["id"];
const v1373=v1356["id"];
const v1374=__nfValue(v1353["value"]);
const v1375=__nfValue(v1356["value"]);
const v1377=v1353["id"];
const v1378=4294967295;
const v1379=!(v1377===v1378);
let v1380=v1379;if(!v1380){
const v1381=v1356["id"];
const v1382=4294967295;
v1380=!(v1381===v1382);}
const v1383=v1380;
const v1384=false;
const v1385=(v1383===v1384);
let v1386=v1385;if(!v1386){
v1386=v1351["failed"];}
let v1387;
let v1388;
if(v1386){
const v1389=__fn6(v1371);
v1387=v1389;
v1388=v1351;
}else{
const v1390=v1351["nodes"];
const v1391=(v1390).length;
const v1392=v1351["maximum"];
let v1393;
let v1394;
if(((v1391) >= (v1392))){
const v1395=__fn6(v1371);
const v1396=true;
const v1397=v1351["nodes"];
const v1398=v1351["maximum"];
const v1400=({["value"]:v1395,["tape"]:({["nodes"]:v1397,["maximum"]:v1398,["failed"]:v1396})});
v1393=v1400["value"];
v1394=v1400["tape"];
}else{
const v1402=v1351["nodes"];
const v1403=({["op"]:v1358,["a"]:v1372,["b"]:v1373,["av"]:v1374,["bv"]:v1375,["value"]:v1371});
const v1404=__tempEdit(v1402,"push",v1403);
const v1405=v1351["maximum"];
const v1406=v1351["failed"];
const v1408=({["value"]:({["value"]:v1371,["id"]:v1391}),["tape"]:({["nodes"]:v1404,["maximum"]:v1405,["failed"]:v1406})});
v1393=v1408["value"];
v1394=v1408["tape"];
}
v1387=v1393;
v1388=v1394;
}
const v1410=1;
const v1411=v1388;
const v1412=v1328;
const v1413=v1387;
const v1414=1;
let v1415;if((v1410===v1414)){
const v1416=__nfValue(v1412["value"]);
const v1417=__nfValue(v1413["value"]);
v1415=Math.fround(__nfNumber(v1416) + __nfNumber(v1417));}else{
const v1418=2;
let v1419;if((v1410===v1418)){
const v1420=__nfValue(v1412["value"]);
const v1421=__nfValue(v1413["value"]);
v1419=Math.fround(__nfNumber(v1420) - __nfNumber(v1421));}else{
const v1422=3;
let v1423;if((v1410===v1422)){
const v1424=__nfValue(v1412["value"]);
const v1425=__nfValue(v1413["value"]);
v1423=Math.fround(__nfNumber(v1424) * __nfNumber(v1425));}else{
v1423=Math.fround((__nfNumber(__nfValue(v1412["value"])))/(__nfNumber(__nfValue(v1413["value"]))));}
v1419=v1423;}
v1415=v1419;}
const v1426=v1415;
const v1427=v1412["id"];
const v1428=v1413["id"];
const v1429=__nfValue(v1412["value"]);
const v1430=__nfValue(v1413["value"]);
const v1432=v1412["id"];
const v1433=4294967295;
const v1434=!(v1432===v1433);
let v1435=v1434;if(!v1435){
const v1436=v1413["id"];
const v1437=4294967295;
v1435=!(v1436===v1437);}
const v1438=v1435;
const v1439=false;
const v1440=(v1438===v1439);
let v1441=v1440;if(!v1441){
v1441=v1411["failed"];}
let v1442;
let v1443;
if(v1441){
const v1444=__fn6(v1426);
v1442=v1444;
v1443=v1411;
}else{
const v1445=v1411["nodes"];
const v1446=(v1445).length;
const v1447=v1411["maximum"];
let v1448;
let v1449;
if(((v1446) >= (v1447))){
const v1450=__fn6(v1426);
const v1451=true;
const v1452=v1411["nodes"];
const v1453=v1411["maximum"];
const v1455=({["value"]:v1450,["tape"]:({["nodes"]:v1452,["maximum"]:v1453,["failed"]:v1451})});
v1448=v1455["value"];
v1449=v1455["tape"];
}else{
const v1457=v1411["nodes"];
const v1458=({["op"]:v1410,["a"]:v1427,["b"]:v1428,["av"]:v1429,["bv"]:v1430,["value"]:v1426});
const v1459=__tempEdit(v1457,"push",v1458);
const v1460=v1411["maximum"];
const v1461=v1411["failed"];
const v1463=({["value"]:({["value"]:v1426,["id"]:v1446}),["tape"]:({["nodes"]:v1459,["maximum"]:v1460,["failed"]:v1461})});
v1448=v1463["value"];
v1449=v1463["tape"];
}
v1442=v1448;
v1443=v1449;
}
const v1465=v1443;
const v1467=v949["w5"];
const v1470=v949["w5"];
const v1472=3;
const v1473=1;
let v1474;if((v1472===v1473)){
const v1475=__nfValue(v1467["value"]);
const v1476=__nfValue(v1470["value"]);
v1474=Math.fround(__nfNumber(v1475) + __nfNumber(v1476));}else{
const v1477=2;
let v1478;if((v1472===v1477)){
const v1479=__nfValue(v1467["value"]);
const v1480=__nfValue(v1470["value"]);
v1478=Math.fround(__nfNumber(v1479) - __nfNumber(v1480));}else{
const v1481=3;
let v1482;if((v1472===v1481)){
const v1483=__nfValue(v1467["value"]);
const v1484=__nfValue(v1470["value"]);
v1482=Math.fround(__nfNumber(v1483) * __nfNumber(v1484));}else{
v1482=Math.fround((__nfNumber(__nfValue(v1467["value"])))/(__nfNumber(__nfValue(v1470["value"]))));}
v1478=v1482;}
v1474=v1478;}
const v1485=v1474;
const v1486=v1467["id"];
const v1487=v1470["id"];
const v1488=__nfValue(v1467["value"]);
const v1489=__nfValue(v1470["value"]);
const v1491=v1467["id"];
const v1492=4294967295;
const v1493=!(v1491===v1492);
let v1494=v1493;if(!v1494){
const v1495=v1470["id"];
const v1496=4294967295;
v1494=!(v1495===v1496);}
const v1497=v1494;
const v1498=false;
const v1499=(v1497===v1498);
let v1500=v1499;if(!v1500){
v1500=v1465["failed"];}
let v1501;
let v1502;
if(v1500){
const v1503=__fn6(v1485);
v1501=v1503;
v1502=v1465;
}else{
const v1504=v1465["nodes"];
const v1505=(v1504).length;
const v1506=v1465["maximum"];
let v1507;
let v1508;
if(((v1505) >= (v1506))){
const v1509=__fn6(v1485);
const v1510=true;
const v1511=v1465["nodes"];
const v1512=v1465["maximum"];
const v1514=({["value"]:v1509,["tape"]:({["nodes"]:v1511,["maximum"]:v1512,["failed"]:v1510})});
v1507=v1514["value"];
v1508=v1514["tape"];
}else{
const v1516=v1465["nodes"];
const v1517=({["op"]:v1472,["a"]:v1486,["b"]:v1487,["av"]:v1488,["bv"]:v1489,["value"]:v1485});
const v1518=__tempEdit(v1516,"push",v1517);
const v1519=v1465["maximum"];
const v1520=v1465["failed"];
const v1522=({["value"]:({["value"]:v1485,["id"]:v1505}),["tape"]:({["nodes"]:v1518,["maximum"]:v1519,["failed"]:v1520})});
v1507=v1522["value"];
v1508=v1522["tape"];
}
v1501=v1507;
v1502=v1508;
}
const v1524=1;
const v1525=v1502;
const v1526=v1442;
const v1527=v1501;
const v1528=1;
let v1529;if((v1524===v1528)){
const v1530=__nfValue(v1526["value"]);
const v1531=__nfValue(v1527["value"]);
v1529=Math.fround(__nfNumber(v1530) + __nfNumber(v1531));}else{
const v1532=2;
let v1533;if((v1524===v1532)){
const v1534=__nfValue(v1526["value"]);
const v1535=__nfValue(v1527["value"]);
v1533=Math.fround(__nfNumber(v1534) - __nfNumber(v1535));}else{
const v1536=3;
let v1537;if((v1524===v1536)){
const v1538=__nfValue(v1526["value"]);
const v1539=__nfValue(v1527["value"]);
v1537=Math.fround(__nfNumber(v1538) * __nfNumber(v1539));}else{
v1537=Math.fround((__nfNumber(__nfValue(v1526["value"])))/(__nfNumber(__nfValue(v1527["value"]))));}
v1533=v1537;}
v1529=v1533;}
const v1540=v1529;
const v1541=v1526["id"];
const v1542=v1527["id"];
const v1543=__nfValue(v1526["value"]);
const v1544=__nfValue(v1527["value"]);
const v1546=v1526["id"];
const v1547=4294967295;
const v1548=!(v1546===v1547);
let v1549=v1548;if(!v1549){
const v1550=v1527["id"];
const v1551=4294967295;
v1549=!(v1550===v1551);}
const v1552=v1549;
const v1553=false;
const v1554=(v1552===v1553);
let v1555=v1554;if(!v1555){
v1555=v1525["failed"];}
let v1556;
let v1557;
if(v1555){
const v1558=__fn6(v1540);
v1556=v1558;
v1557=v1525;
}else{
const v1559=v1525["nodes"];
const v1560=(v1559).length;
const v1561=v1525["maximum"];
let v1562;
let v1563;
if(((v1560) >= (v1561))){
const v1564=__fn6(v1540);
const v1565=true;
const v1566=v1525["nodes"];
const v1567=v1525["maximum"];
const v1569=({["value"]:v1564,["tape"]:({["nodes"]:v1566,["maximum"]:v1567,["failed"]:v1565})});
v1562=v1569["value"];
v1563=v1569["tape"];
}else{
const v1571=v1525["nodes"];
const v1572=({["op"]:v1524,["a"]:v1541,["b"]:v1542,["av"]:v1543,["bv"]:v1544,["value"]:v1540});
const v1573=__tempEdit(v1571,"push",v1572);
const v1574=v1525["maximum"];
const v1575=v1525["failed"];
const v1577=({["value"]:({["value"]:v1540,["id"]:v1560}),["tape"]:({["nodes"]:v1573,["maximum"]:v1574,["failed"]:v1575})});
v1562=v1577["value"];
v1563=v1577["tape"];
}
v1556=v1562;
v1557=v1563;
}
const v1579=v1557;
const v1581=v949["w6"];
const v1584=v949["w6"];
const v1586=3;
const v1587=1;
let v1588;if((v1586===v1587)){
const v1589=__nfValue(v1581["value"]);
const v1590=__nfValue(v1584["value"]);
v1588=Math.fround(__nfNumber(v1589) + __nfNumber(v1590));}else{
const v1591=2;
let v1592;if((v1586===v1591)){
const v1593=__nfValue(v1581["value"]);
const v1594=__nfValue(v1584["value"]);
v1592=Math.fround(__nfNumber(v1593) - __nfNumber(v1594));}else{
const v1595=3;
let v1596;if((v1586===v1595)){
const v1597=__nfValue(v1581["value"]);
const v1598=__nfValue(v1584["value"]);
v1596=Math.fround(__nfNumber(v1597) * __nfNumber(v1598));}else{
v1596=Math.fround((__nfNumber(__nfValue(v1581["value"])))/(__nfNumber(__nfValue(v1584["value"]))));}
v1592=v1596;}
v1588=v1592;}
const v1599=v1588;
const v1600=v1581["id"];
const v1601=v1584["id"];
const v1602=__nfValue(v1581["value"]);
const v1603=__nfValue(v1584["value"]);
const v1605=v1581["id"];
const v1606=4294967295;
const v1607=!(v1605===v1606);
let v1608=v1607;if(!v1608){
const v1609=v1584["id"];
const v1610=4294967295;
v1608=!(v1609===v1610);}
const v1611=v1608;
const v1612=false;
const v1613=(v1611===v1612);
let v1614=v1613;if(!v1614){
v1614=v1579["failed"];}
let v1615;
let v1616;
if(v1614){
const v1617=__fn6(v1599);
v1615=v1617;
v1616=v1579;
}else{
const v1618=v1579["nodes"];
const v1619=(v1618).length;
const v1620=v1579["maximum"];
let v1621;
let v1622;
if(((v1619) >= (v1620))){
const v1623=__fn6(v1599);
const v1624=true;
const v1625=v1579["nodes"];
const v1626=v1579["maximum"];
const v1628=({["value"]:v1623,["tape"]:({["nodes"]:v1625,["maximum"]:v1626,["failed"]:v1624})});
v1621=v1628["value"];
v1622=v1628["tape"];
}else{
const v1630=v1579["nodes"];
const v1631=({["op"]:v1586,["a"]:v1600,["b"]:v1601,["av"]:v1602,["bv"]:v1603,["value"]:v1599});
const v1632=__tempEdit(v1630,"push",v1631);
const v1633=v1579["maximum"];
const v1634=v1579["failed"];
const v1636=({["value"]:({["value"]:v1599,["id"]:v1619}),["tape"]:({["nodes"]:v1632,["maximum"]:v1633,["failed"]:v1634})});
v1621=v1636["value"];
v1622=v1636["tape"];
}
v1615=v1621;
v1616=v1622;
}
const v1638=1;
const v1639=v1616;
const v1640=v1556;
const v1641=v1615;
const v1642=1;
let v1643;if((v1638===v1642)){
const v1644=__nfValue(v1640["value"]);
const v1645=__nfValue(v1641["value"]);
v1643=Math.fround(__nfNumber(v1644) + __nfNumber(v1645));}else{
const v1646=2;
let v1647;if((v1638===v1646)){
const v1648=__nfValue(v1640["value"]);
const v1649=__nfValue(v1641["value"]);
v1647=Math.fround(__nfNumber(v1648) - __nfNumber(v1649));}else{
const v1650=3;
let v1651;if((v1638===v1650)){
const v1652=__nfValue(v1640["value"]);
const v1653=__nfValue(v1641["value"]);
v1651=Math.fround(__nfNumber(v1652) * __nfNumber(v1653));}else{
v1651=Math.fround((__nfNumber(__nfValue(v1640["value"])))/(__nfNumber(__nfValue(v1641["value"]))));}
v1647=v1651;}
v1643=v1647;}
const v1654=v1643;
const v1655=v1640["id"];
const v1656=v1641["id"];
const v1657=__nfValue(v1640["value"]);
const v1658=__nfValue(v1641["value"]);
const v1660=v1640["id"];
const v1661=4294967295;
const v1662=!(v1660===v1661);
let v1663=v1662;if(!v1663){
const v1664=v1641["id"];
const v1665=4294967295;
v1663=!(v1664===v1665);}
const v1666=v1663;
const v1667=false;
const v1668=(v1666===v1667);
let v1669=v1668;if(!v1669){
v1669=v1639["failed"];}
let v1670;
let v1671;
if(v1669){
const v1672=__fn6(v1654);
v1670=v1672;
v1671=v1639;
}else{
const v1673=v1639["nodes"];
const v1674=(v1673).length;
const v1675=v1639["maximum"];
let v1676;
let v1677;
if(((v1674) >= (v1675))){
const v1678=__fn6(v1654);
const v1679=true;
const v1680=v1639["nodes"];
const v1681=v1639["maximum"];
const v1683=({["value"]:v1678,["tape"]:({["nodes"]:v1680,["maximum"]:v1681,["failed"]:v1679})});
v1676=v1683["value"];
v1677=v1683["tape"];
}else{
const v1685=v1639["nodes"];
const v1686=({["op"]:v1638,["a"]:v1655,["b"]:v1656,["av"]:v1657,["bv"]:v1658,["value"]:v1654});
const v1687=__tempEdit(v1685,"push",v1686);
const v1688=v1639["maximum"];
const v1689=v1639["failed"];
const v1691=({["value"]:({["value"]:v1654,["id"]:v1674}),["tape"]:({["nodes"]:v1687,["maximum"]:v1688,["failed"]:v1689})});
v1676=v1691["value"];
v1677=v1691["tape"];
}
v1670=v1676;
v1671=v1677;
}
const v1693=v1671;
const v1695=v949["w7"];
const v1698=v949["w7"];
const v1700=3;
const v1701=1;
let v1702;if((v1700===v1701)){
const v1703=__nfValue(v1695["value"]);
const v1704=__nfValue(v1698["value"]);
v1702=Math.fround(__nfNumber(v1703) + __nfNumber(v1704));}else{
const v1705=2;
let v1706;if((v1700===v1705)){
const v1707=__nfValue(v1695["value"]);
const v1708=__nfValue(v1698["value"]);
v1706=Math.fround(__nfNumber(v1707) - __nfNumber(v1708));}else{
const v1709=3;
let v1710;if((v1700===v1709)){
const v1711=__nfValue(v1695["value"]);
const v1712=__nfValue(v1698["value"]);
v1710=Math.fround(__nfNumber(v1711) * __nfNumber(v1712));}else{
v1710=Math.fround((__nfNumber(__nfValue(v1695["value"])))/(__nfNumber(__nfValue(v1698["value"]))));}
v1706=v1710;}
v1702=v1706;}
const v1713=v1702;
const v1714=v1695["id"];
const v1715=v1698["id"];
const v1716=__nfValue(v1695["value"]);
const v1717=__nfValue(v1698["value"]);
const v1719=v1695["id"];
const v1720=4294967295;
const v1721=!(v1719===v1720);
let v1722=v1721;if(!v1722){
const v1723=v1698["id"];
const v1724=4294967295;
v1722=!(v1723===v1724);}
const v1725=v1722;
const v1726=false;
const v1727=(v1725===v1726);
let v1728=v1727;if(!v1728){
v1728=v1693["failed"];}
let v1729;
let v1730;
if(v1728){
const v1731=__fn6(v1713);
v1729=v1731;
v1730=v1693;
}else{
const v1732=v1693["nodes"];
const v1733=(v1732).length;
const v1734=v1693["maximum"];
let v1735;
let v1736;
if(((v1733) >= (v1734))){
const v1737=__fn6(v1713);
const v1738=true;
const v1739=v1693["nodes"];
const v1740=v1693["maximum"];
const v1742=({["value"]:v1737,["tape"]:({["nodes"]:v1739,["maximum"]:v1740,["failed"]:v1738})});
v1735=v1742["value"];
v1736=v1742["tape"];
}else{
const v1744=v1693["nodes"];
const v1745=({["op"]:v1700,["a"]:v1714,["b"]:v1715,["av"]:v1716,["bv"]:v1717,["value"]:v1713});
const v1746=__tempEdit(v1744,"push",v1745);
const v1747=v1693["maximum"];
const v1748=v1693["failed"];
const v1750=({["value"]:({["value"]:v1713,["id"]:v1733}),["tape"]:({["nodes"]:v1746,["maximum"]:v1747,["failed"]:v1748})});
v1735=v1750["value"];
v1736=v1750["tape"];
}
v1729=v1735;
v1730=v1736;
}
const v1752=1;
const v1753=v1730;
const v1754=v1670;
const v1755=v1729;
const v1756=1;
let v1757;if((v1752===v1756)){
const v1758=__nfValue(v1754["value"]);
const v1759=__nfValue(v1755["value"]);
v1757=Math.fround(__nfNumber(v1758) + __nfNumber(v1759));}else{
const v1760=2;
let v1761;if((v1752===v1760)){
const v1762=__nfValue(v1754["value"]);
const v1763=__nfValue(v1755["value"]);
v1761=Math.fround(__nfNumber(v1762) - __nfNumber(v1763));}else{
const v1764=3;
let v1765;if((v1752===v1764)){
const v1766=__nfValue(v1754["value"]);
const v1767=__nfValue(v1755["value"]);
v1765=Math.fround(__nfNumber(v1766) * __nfNumber(v1767));}else{
v1765=Math.fround((__nfNumber(__nfValue(v1754["value"])))/(__nfNumber(__nfValue(v1755["value"]))));}
v1761=v1765;}
v1757=v1761;}
const v1768=v1757;
const v1769=v1754["id"];
const v1770=v1755["id"];
const v1771=__nfValue(v1754["value"]);
const v1772=__nfValue(v1755["value"]);
const v1774=v1754["id"];
const v1775=4294967295;
const v1776=!(v1774===v1775);
let v1777=v1776;if(!v1777){
const v1778=v1755["id"];
const v1779=4294967295;
v1777=!(v1778===v1779);}
const v1780=v1777;
const v1781=false;
const v1782=(v1780===v1781);
let v1783=v1782;if(!v1783){
v1783=v1753["failed"];}
let v1784;
let v1785;
if(v1783){
const v1786=__fn6(v1768);
v1784=v1786;
v1785=v1753;
}else{
const v1787=v1753["nodes"];
const v1788=(v1787).length;
const v1789=v1753["maximum"];
let v1790;
let v1791;
if(((v1788) >= (v1789))){
const v1792=__fn6(v1768);
const v1793=true;
const v1794=v1753["nodes"];
const v1795=v1753["maximum"];
const v1797=({["value"]:v1792,["tape"]:({["nodes"]:v1794,["maximum"]:v1795,["failed"]:v1793})});
v1790=v1797["value"];
v1791=v1797["tape"];
}else{
const v1799=v1753["nodes"];
const v1800=({["op"]:v1752,["a"]:v1769,["b"]:v1770,["av"]:v1771,["bv"]:v1772,["value"]:v1768});
const v1801=__tempEdit(v1799,"push",v1800);
const v1802=v1753["maximum"];
const v1803=v1753["failed"];
const v1805=({["value"]:({["value"]:v1768,["id"]:v1788}),["tape"]:({["nodes"]:v1801,["maximum"]:v1802,["failed"]:v1803})});
v1790=v1805["value"];
v1791=v1805["tape"];
}
v1784=v1790;
v1785=v1791;
}
return ({["value"]:v1784,["tape"]:v1785});}
function __fn16(v1806,v1807,v1808){
const v1810=v1806["b0"];
const v1813=v1810["w0"];
const v1816=v1810["w0"];
const v1818=3;
const v1819=1;
let v1820;if((v1818===v1819)){
const v1821=__nfValue(v1813["value"]);
const v1822=__nfValue(v1816["value"]);
v1820=Math.fround(__nfNumber(v1821) + __nfNumber(v1822));}else{
const v1823=2;
let v1824;if((v1818===v1823)){
const v1825=__nfValue(v1813["value"]);
const v1826=__nfValue(v1816["value"]);
v1824=Math.fround(__nfNumber(v1825) - __nfNumber(v1826));}else{
const v1827=3;
let v1828;if((v1818===v1827)){
const v1829=__nfValue(v1813["value"]);
const v1830=__nfValue(v1816["value"]);
v1828=Math.fround(__nfNumber(v1829) * __nfNumber(v1830));}else{
v1828=Math.fround((__nfNumber(__nfValue(v1813["value"])))/(__nfNumber(__nfValue(v1816["value"]))));}
v1824=v1828;}
v1820=v1824;}
const v1831=v1820;
const v1832=v1813["id"];
const v1833=v1816["id"];
const v1834=__nfValue(v1813["value"]);
const v1835=__nfValue(v1816["value"]);
const v1837=v1813["id"];
const v1838=4294967295;
const v1839=!(v1837===v1838);
let v1840=v1839;if(!v1840){
const v1841=v1816["id"];
const v1842=4294967295;
v1840=!(v1841===v1842);}
const v1843=v1840;
const v1844=__fn7(v1808,({["op"]:v1818,["a"]:v1832,["b"]:v1833,["av"]:v1834,["bv"]:v1835,["value"]:v1831}),v1843);
const v1845=v1844["tape"];
const v1847=v1810["w1"];
const v1850=v1810["w1"];
const v1852=3;
const v1853=__fn9(v1852,v1845,v1847,v1850);
const v1854=1;
const v1855=v1853["tape"];
const v1856=v1844["value"];
const v1857=v1853["value"];
const v1858=1;
let v1859;if((v1854===v1858)){
const v1860=__nfValue(v1856["value"]);
const v1861=__nfValue(v1857["value"]);
v1859=Math.fround(__nfNumber(v1860) + __nfNumber(v1861));}else{
const v1862=2;
let v1863;if((v1854===v1862)){
const v1864=__nfValue(v1856["value"]);
const v1865=__nfValue(v1857["value"]);
v1863=Math.fround(__nfNumber(v1864) - __nfNumber(v1865));}else{
const v1866=3;
let v1867;if((v1854===v1866)){
const v1868=__nfValue(v1856["value"]);
const v1869=__nfValue(v1857["value"]);
v1867=Math.fround(__nfNumber(v1868) * __nfNumber(v1869));}else{
v1867=Math.fround((__nfNumber(__nfValue(v1856["value"])))/(__nfNumber(__nfValue(v1857["value"]))));}
v1863=v1867;}
v1859=v1863;}
const v1870=v1859;
const v1871=v1856["id"];
const v1872=v1857["id"];
const v1873=__nfValue(v1856["value"]);
const v1874=__nfValue(v1857["value"]);
const v1876=v1856["id"];
const v1877=4294967295;
const v1878=!(v1876===v1877);
let v1879=v1878;if(!v1879){
const v1880=v1857["id"];
const v1881=4294967295;
v1879=!(v1880===v1881);}
const v1882=v1879;
const v1883=__fn7(v1855,({["op"]:v1854,["a"]:v1871,["b"]:v1872,["av"]:v1873,["bv"]:v1874,["value"]:v1870}),v1882);
const v1884=v1883["tape"];
const v1886=v1810["w2"];
const v1889=v1810["w2"];
const v1891=3;
const v1892=1;
let v1893;if((v1891===v1892)){
const v1894=__nfValue(v1886["value"]);
const v1895=__nfValue(v1889["value"]);
v1893=Math.fround(__nfNumber(v1894) + __nfNumber(v1895));}else{
const v1896=2;
let v1897;if((v1891===v1896)){
const v1898=__nfValue(v1886["value"]);
const v1899=__nfValue(v1889["value"]);
v1897=Math.fround(__nfNumber(v1898) - __nfNumber(v1899));}else{
const v1900=3;
let v1901;if((v1891===v1900)){
const v1902=__nfValue(v1886["value"]);
const v1903=__nfValue(v1889["value"]);
v1901=Math.fround(__nfNumber(v1902) * __nfNumber(v1903));}else{
v1901=Math.fround((__nfNumber(__nfValue(v1886["value"])))/(__nfNumber(__nfValue(v1889["value"]))));}
v1897=v1901;}
v1893=v1897;}
const v1904=v1893;
const v1905=v1886["id"];
const v1906=v1889["id"];
const v1907=__nfValue(v1886["value"]);
const v1908=__nfValue(v1889["value"]);
const v1910=v1886["id"];
const v1911=4294967295;
const v1912=!(v1910===v1911);
let v1913=v1912;if(!v1913){
const v1914=v1889["id"];
const v1915=4294967295;
v1913=!(v1914===v1915);}
const v1916=v1913;
const v1917=__fn7(v1884,({["op"]:v1891,["a"]:v1905,["b"]:v1906,["av"]:v1907,["bv"]:v1908,["value"]:v1904}),v1916);
const v1918=1;
const v1919=v1917["tape"];
const v1920=v1883["value"];
const v1921=v1917["value"];
const v1922=1;
let v1923;if((v1918===v1922)){
const v1924=__nfValue(v1920["value"]);
const v1925=__nfValue(v1921["value"]);
v1923=Math.fround(__nfNumber(v1924) + __nfNumber(v1925));}else{
const v1926=2;
let v1927;if((v1918===v1926)){
const v1928=__nfValue(v1920["value"]);
const v1929=__nfValue(v1921["value"]);
v1927=Math.fround(__nfNumber(v1928) - __nfNumber(v1929));}else{
const v1930=3;
let v1931;if((v1918===v1930)){
const v1932=__nfValue(v1920["value"]);
const v1933=__nfValue(v1921["value"]);
v1931=Math.fround(__nfNumber(v1932) * __nfNumber(v1933));}else{
v1931=Math.fround((__nfNumber(__nfValue(v1920["value"])))/(__nfNumber(__nfValue(v1921["value"]))));}
v1927=v1931;}
v1923=v1927;}
const v1934=v1923;
const v1935=v1920["id"];
const v1936=v1921["id"];
const v1937=__nfValue(v1920["value"]);
const v1938=__nfValue(v1921["value"]);
const v1940=v1920["id"];
const v1941=4294967295;
const v1942=!(v1940===v1941);
let v1943=v1942;if(!v1943){
const v1944=v1921["id"];
const v1945=4294967295;
v1943=!(v1944===v1945);}
const v1946=v1943;
const v1947=__fn7(v1919,({["op"]:v1918,["a"]:v1935,["b"]:v1936,["av"]:v1937,["bv"]:v1938,["value"]:v1934}),v1946);
const v1948=v1947["tape"];
const v1950=v1810["w3"];
const v1953=v1810["w3"];
const v1955=3;
const v1956=1;
let v1957;if((v1955===v1956)){
const v1958=__nfValue(v1950["value"]);
const v1959=__nfValue(v1953["value"]);
v1957=Math.fround(__nfNumber(v1958) + __nfNumber(v1959));}else{
const v1960=2;
let v1961;if((v1955===v1960)){
const v1962=__nfValue(v1950["value"]);
const v1963=__nfValue(v1953["value"]);
v1961=Math.fround(__nfNumber(v1962) - __nfNumber(v1963));}else{
const v1964=3;
let v1965;if((v1955===v1964)){
const v1966=__nfValue(v1950["value"]);
const v1967=__nfValue(v1953["value"]);
v1965=Math.fround(__nfNumber(v1966) * __nfNumber(v1967));}else{
v1965=Math.fround((__nfNumber(__nfValue(v1950["value"])))/(__nfNumber(__nfValue(v1953["value"]))));}
v1961=v1965;}
v1957=v1961;}
const v1968=v1957;
const v1969=v1950["id"];
const v1970=v1953["id"];
const v1971=__nfValue(v1950["value"]);
const v1972=__nfValue(v1953["value"]);
const v1974=v1950["id"];
const v1975=4294967295;
const v1976=!(v1974===v1975);
let v1977=v1976;if(!v1977){
const v1978=v1953["id"];
const v1979=4294967295;
v1977=!(v1978===v1979);}
const v1980=v1977;
const v1981=__fn7(v1948,({["op"]:v1955,["a"]:v1969,["b"]:v1970,["av"]:v1971,["bv"]:v1972,["value"]:v1968}),v1980);
const v1982=1;
const v1983=v1981["tape"];
const v1984=v1947["value"];
const v1985=v1981["value"];
const v1986=1;
let v1987;if((v1982===v1986)){
const v1988=__nfValue(v1984["value"]);
const v1989=__nfValue(v1985["value"]);
v1987=Math.fround(__nfNumber(v1988) + __nfNumber(v1989));}else{
const v1990=2;
let v1991;if((v1982===v1990)){
const v1992=__nfValue(v1984["value"]);
const v1993=__nfValue(v1985["value"]);
v1991=Math.fround(__nfNumber(v1992) - __nfNumber(v1993));}else{
const v1994=3;
let v1995;if((v1982===v1994)){
const v1996=__nfValue(v1984["value"]);
const v1997=__nfValue(v1985["value"]);
v1995=Math.fround(__nfNumber(v1996) * __nfNumber(v1997));}else{
v1995=Math.fround((__nfNumber(__nfValue(v1984["value"])))/(__nfNumber(__nfValue(v1985["value"]))));}
v1991=v1995;}
v1987=v1991;}
const v1998=v1987;
const v1999=v1984["id"];
const v2000=v1985["id"];
const v2001=__nfValue(v1984["value"]);
const v2002=__nfValue(v1985["value"]);
const v2004=v1984["id"];
const v2005=4294967295;
const v2006=!(v2004===v2005);
let v2007=v2006;if(!v2007){
const v2008=v1985["id"];
const v2009=4294967295;
v2007=!(v2008===v2009);}
const v2010=v2007;
const v2011=false;
const v2012=(v2010===v2011);
let v2013=v2012;if(!v2013){
v2013=v1983["failed"];}
let v2014;
let v2015;
if(v2013){
const v2016=__fn6(v1998);
v2014=v2016;
v2015=v1983;
}else{
const v2017=v1983["nodes"];
const v2018=(v2017).length;
const v2019=v1983["maximum"];
let v2020;
let v2021;
if(((v2018) >= (v2019))){
const v2022=__fn6(v1998);
const v2023=true;
const v2024=v1983["nodes"];
const v2025=v1983["maximum"];
const v2027=({["value"]:v2022,["tape"]:({["nodes"]:v2024,["maximum"]:v2025,["failed"]:v2023})});
v2020=v2027["value"];
v2021=v2027["tape"];
}else{
const v2029=v1983["nodes"];
const v2030=({["op"]:v1982,["a"]:v1999,["b"]:v2000,["av"]:v2001,["bv"]:v2002,["value"]:v1998});
const v2031=__tempEdit(v2029,"push",v2030);
const v2032=v1983["maximum"];
const v2033=v1983["failed"];
const v2035=({["value"]:({["value"]:v1998,["id"]:v2018}),["tape"]:({["nodes"]:v2031,["maximum"]:v2032,["failed"]:v2033})});
v2020=v2035["value"];
v2021=v2035["tape"];
}
v2014=v2020;
v2015=v2021;
}
const v2037=v2015;
const v2039=v1810["w4"];
const v2042=v1810["w4"];
const v2044=3;
const v2045=1;
let v2046;if((v2044===v2045)){
const v2047=__nfValue(v2039["value"]);
const v2048=__nfValue(v2042["value"]);
v2046=Math.fround(__nfNumber(v2047) + __nfNumber(v2048));}else{
const v2049=2;
let v2050;if((v2044===v2049)){
const v2051=__nfValue(v2039["value"]);
const v2052=__nfValue(v2042["value"]);
v2050=Math.fround(__nfNumber(v2051) - __nfNumber(v2052));}else{
const v2053=3;
let v2054;if((v2044===v2053)){
const v2055=__nfValue(v2039["value"]);
const v2056=__nfValue(v2042["value"]);
v2054=Math.fround(__nfNumber(v2055) * __nfNumber(v2056));}else{
v2054=Math.fround((__nfNumber(__nfValue(v2039["value"])))/(__nfNumber(__nfValue(v2042["value"]))));}
v2050=v2054;}
v2046=v2050;}
const v2057=v2046;
const v2058=v2039["id"];
const v2059=v2042["id"];
const v2060=__nfValue(v2039["value"]);
const v2061=__nfValue(v2042["value"]);
const v2063=v2039["id"];
const v2064=4294967295;
const v2065=!(v2063===v2064);
let v2066=v2065;if(!v2066){
const v2067=v2042["id"];
const v2068=4294967295;
v2066=!(v2067===v2068);}
const v2069=v2066;
const v2070=__fn7(v2037,({["op"]:v2044,["a"]:v2058,["b"]:v2059,["av"]:v2060,["bv"]:v2061,["value"]:v2057}),v2069);
const v2071=1;
const v2072=v2070["tape"];
const v2073=v2014;
const v2074=v2070["value"];
const v2075=1;
let v2076;if((v2071===v2075)){
const v2077=__nfValue(v2073["value"]);
const v2078=__nfValue(v2074["value"]);
v2076=Math.fround(__nfNumber(v2077) + __nfNumber(v2078));}else{
const v2079=2;
let v2080;if((v2071===v2079)){
const v2081=__nfValue(v2073["value"]);
const v2082=__nfValue(v2074["value"]);
v2080=Math.fround(__nfNumber(v2081) - __nfNumber(v2082));}else{
const v2083=3;
let v2084;if((v2071===v2083)){
const v2085=__nfValue(v2073["value"]);
const v2086=__nfValue(v2074["value"]);
v2084=Math.fround(__nfNumber(v2085) * __nfNumber(v2086));}else{
v2084=Math.fround((__nfNumber(__nfValue(v2073["value"])))/(__nfNumber(__nfValue(v2074["value"]))));}
v2080=v2084;}
v2076=v2080;}
const v2087=v2076;
const v2088=v2073["id"];
const v2089=v2074["id"];
const v2090=__nfValue(v2073["value"]);
const v2091=__nfValue(v2074["value"]);
const v2093=v2073["id"];
const v2094=4294967295;
const v2095=!(v2093===v2094);
let v2096=v2095;if(!v2096){
const v2097=v2074["id"];
const v2098=4294967295;
v2096=!(v2097===v2098);}
const v2099=v2096;
const v2100=false;
const v2101=(v2099===v2100);
let v2102=v2101;if(!v2102){
v2102=v2072["failed"];}
let v2103;
let v2104;
if(v2102){
const v2105=__fn6(v2087);
v2103=v2105;
v2104=v2072;
}else{
const v2106=v2072["nodes"];
const v2107=(v2106).length;
const v2108=v2072["maximum"];
let v2109;
let v2110;
if(((v2107) >= (v2108))){
const v2111=__fn6(v2087);
const v2112=true;
const v2113=v2072["nodes"];
const v2114=v2072["maximum"];
const v2116=({["value"]:v2111,["tape"]:({["nodes"]:v2113,["maximum"]:v2114,["failed"]:v2112})});
v2109=v2116["value"];
v2110=v2116["tape"];
}else{
const v2118=v2072["nodes"];
const v2119=({["op"]:v2071,["a"]:v2088,["b"]:v2089,["av"]:v2090,["bv"]:v2091,["value"]:v2087});
const v2120=__tempEdit(v2118,"push",v2119);
const v2121=v2072["maximum"];
const v2122=v2072["failed"];
const v2124=({["value"]:({["value"]:v2087,["id"]:v2107}),["tape"]:({["nodes"]:v2120,["maximum"]:v2121,["failed"]:v2122})});
v2109=v2124["value"];
v2110=v2124["tape"];
}
v2103=v2109;
v2104=v2110;
}
const v2126=v2104;
const v2128=v1810["w5"];
const v2131=v1810["w5"];
const v2133=3;
const v2134=1;
let v2135;if((v2133===v2134)){
const v2136=__nfValue(v2128["value"]);
const v2137=__nfValue(v2131["value"]);
v2135=Math.fround(__nfNumber(v2136) + __nfNumber(v2137));}else{
const v2138=2;
let v2139;if((v2133===v2138)){
const v2140=__nfValue(v2128["value"]);
const v2141=__nfValue(v2131["value"]);
v2139=Math.fround(__nfNumber(v2140) - __nfNumber(v2141));}else{
const v2142=3;
let v2143;if((v2133===v2142)){
const v2144=__nfValue(v2128["value"]);
const v2145=__nfValue(v2131["value"]);
v2143=Math.fround(__nfNumber(v2144) * __nfNumber(v2145));}else{
v2143=Math.fround((__nfNumber(__nfValue(v2128["value"])))/(__nfNumber(__nfValue(v2131["value"]))));}
v2139=v2143;}
v2135=v2139;}
const v2146=v2135;
const v2147=v2128["id"];
const v2148=v2131["id"];
const v2149=__nfValue(v2128["value"]);
const v2150=__nfValue(v2131["value"]);
const v2152=v2128["id"];
const v2153=4294967295;
const v2154=!(v2152===v2153);
let v2155=v2154;if(!v2155){
const v2156=v2131["id"];
const v2157=4294967295;
v2155=!(v2156===v2157);}
const v2158=v2155;
const v2159=false;
const v2160=(v2158===v2159);
let v2161=v2160;if(!v2161){
v2161=v2126["failed"];}
let v2162;
let v2163;
if(v2161){
const v2164=__fn6(v2146);
v2162=v2164;
v2163=v2126;
}else{
const v2165=v2126["nodes"];
const v2166=(v2165).length;
const v2167=v2126["maximum"];
let v2168;
let v2169;
if(((v2166) >= (v2167))){
const v2170=__fn6(v2146);
const v2171=true;
const v2172=v2126["nodes"];
const v2173=v2126["maximum"];
const v2175=({["value"]:v2170,["tape"]:({["nodes"]:v2172,["maximum"]:v2173,["failed"]:v2171})});
v2168=v2175["value"];
v2169=v2175["tape"];
}else{
const v2177=v2126["nodes"];
const v2178=({["op"]:v2133,["a"]:v2147,["b"]:v2148,["av"]:v2149,["bv"]:v2150,["value"]:v2146});
const v2179=__tempEdit(v2177,"push",v2178);
const v2180=v2126["maximum"];
const v2181=v2126["failed"];
const v2183=({["value"]:({["value"]:v2146,["id"]:v2166}),["tape"]:({["nodes"]:v2179,["maximum"]:v2180,["failed"]:v2181})});
v2168=v2183["value"];
v2169=v2183["tape"];
}
v2162=v2168;
v2163=v2169;
}
const v2185=1;
const v2186=v2163;
const v2187=v2103;
const v2188=v2162;
const v2189=1;
let v2190;if((v2185===v2189)){
const v2191=__nfValue(v2187["value"]);
const v2192=__nfValue(v2188["value"]);
v2190=Math.fround(__nfNumber(v2191) + __nfNumber(v2192));}else{
const v2193=2;
let v2194;if((v2185===v2193)){
const v2195=__nfValue(v2187["value"]);
const v2196=__nfValue(v2188["value"]);
v2194=Math.fround(__nfNumber(v2195) - __nfNumber(v2196));}else{
const v2197=3;
let v2198;if((v2185===v2197)){
const v2199=__nfValue(v2187["value"]);
const v2200=__nfValue(v2188["value"]);
v2198=Math.fround(__nfNumber(v2199) * __nfNumber(v2200));}else{
v2198=Math.fround((__nfNumber(__nfValue(v2187["value"])))/(__nfNumber(__nfValue(v2188["value"]))));}
v2194=v2198;}
v2190=v2194;}
const v2201=v2190;
const v2202=v2187["id"];
const v2203=v2188["id"];
const v2204=__nfValue(v2187["value"]);
const v2205=__nfValue(v2188["value"]);
const v2207=v2187["id"];
const v2208=4294967295;
const v2209=!(v2207===v2208);
let v2210=v2209;if(!v2210){
const v2211=v2188["id"];
const v2212=4294967295;
v2210=!(v2211===v2212);}
const v2213=v2210;
const v2214=false;
const v2215=(v2213===v2214);
let v2216=v2215;if(!v2216){
v2216=v2186["failed"];}
let v2217;
let v2218;
if(v2216){
const v2219=__fn6(v2201);
v2217=v2219;
v2218=v2186;
}else{
const v2220=v2186["nodes"];
const v2221=(v2220).length;
const v2222=v2186["maximum"];
let v2223;
let v2224;
if(((v2221) >= (v2222))){
const v2225=__fn6(v2201);
const v2226=true;
const v2227=v2186["nodes"];
const v2228=v2186["maximum"];
const v2230=({["value"]:v2225,["tape"]:({["nodes"]:v2227,["maximum"]:v2228,["failed"]:v2226})});
v2223=v2230["value"];
v2224=v2230["tape"];
}else{
const v2232=v2186["nodes"];
const v2233=({["op"]:v2185,["a"]:v2202,["b"]:v2203,["av"]:v2204,["bv"]:v2205,["value"]:v2201});
const v2234=__tempEdit(v2232,"push",v2233);
const v2235=v2186["maximum"];
const v2236=v2186["failed"];
const v2238=({["value"]:({["value"]:v2201,["id"]:v2221}),["tape"]:({["nodes"]:v2234,["maximum"]:v2235,["failed"]:v2236})});
v2223=v2238["value"];
v2224=v2238["tape"];
}
v2217=v2223;
v2218=v2224;
}
const v2240=v2218;
const v2242=v1810["w6"];
const v2245=v1810["w6"];
const v2247=3;
const v2248=1;
let v2249;if((v2247===v2248)){
const v2250=__nfValue(v2242["value"]);
const v2251=__nfValue(v2245["value"]);
v2249=Math.fround(__nfNumber(v2250) + __nfNumber(v2251));}else{
const v2252=2;
let v2253;if((v2247===v2252)){
const v2254=__nfValue(v2242["value"]);
const v2255=__nfValue(v2245["value"]);
v2253=Math.fround(__nfNumber(v2254) - __nfNumber(v2255));}else{
const v2256=3;
let v2257;if((v2247===v2256)){
const v2258=__nfValue(v2242["value"]);
const v2259=__nfValue(v2245["value"]);
v2257=Math.fround(__nfNumber(v2258) * __nfNumber(v2259));}else{
v2257=Math.fround((__nfNumber(__nfValue(v2242["value"])))/(__nfNumber(__nfValue(v2245["value"]))));}
v2253=v2257;}
v2249=v2253;}
const v2260=v2249;
const v2261=v2242["id"];
const v2262=v2245["id"];
const v2263=__nfValue(v2242["value"]);
const v2264=__nfValue(v2245["value"]);
const v2266=v2242["id"];
const v2267=4294967295;
const v2268=!(v2266===v2267);
let v2269=v2268;if(!v2269){
const v2270=v2245["id"];
const v2271=4294967295;
v2269=!(v2270===v2271);}
const v2272=v2269;
const v2273=false;
const v2274=(v2272===v2273);
let v2275=v2274;if(!v2275){
v2275=v2240["failed"];}
let v2276;
let v2277;
if(v2275){
const v2278=__fn6(v2260);
v2276=v2278;
v2277=v2240;
}else{
const v2279=v2240["nodes"];
const v2280=(v2279).length;
const v2281=v2240["maximum"];
let v2282;
let v2283;
if(((v2280) >= (v2281))){
const v2284=__fn6(v2260);
const v2285=true;
const v2286=v2240["nodes"];
const v2287=v2240["maximum"];
const v2289=({["value"]:v2284,["tape"]:({["nodes"]:v2286,["maximum"]:v2287,["failed"]:v2285})});
v2282=v2289["value"];
v2283=v2289["tape"];
}else{
const v2291=v2240["nodes"];
const v2292=({["op"]:v2247,["a"]:v2261,["b"]:v2262,["av"]:v2263,["bv"]:v2264,["value"]:v2260});
const v2293=__tempEdit(v2291,"push",v2292);
const v2294=v2240["maximum"];
const v2295=v2240["failed"];
const v2297=({["value"]:({["value"]:v2260,["id"]:v2280}),["tape"]:({["nodes"]:v2293,["maximum"]:v2294,["failed"]:v2295})});
v2282=v2297["value"];
v2283=v2297["tape"];
}
v2276=v2282;
v2277=v2283;
}
const v2299=1;
const v2300=v2277;
const v2301=v2217;
const v2302=v2276;
const v2303=1;
let v2304;if((v2299===v2303)){
const v2305=__nfValue(v2301["value"]);
const v2306=__nfValue(v2302["value"]);
v2304=Math.fround(__nfNumber(v2305) + __nfNumber(v2306));}else{
const v2307=2;
let v2308;if((v2299===v2307)){
const v2309=__nfValue(v2301["value"]);
const v2310=__nfValue(v2302["value"]);
v2308=Math.fround(__nfNumber(v2309) - __nfNumber(v2310));}else{
const v2311=3;
let v2312;if((v2299===v2311)){
const v2313=__nfValue(v2301["value"]);
const v2314=__nfValue(v2302["value"]);
v2312=Math.fround(__nfNumber(v2313) * __nfNumber(v2314));}else{
v2312=Math.fround((__nfNumber(__nfValue(v2301["value"])))/(__nfNumber(__nfValue(v2302["value"]))));}
v2308=v2312;}
v2304=v2308;}
const v2315=v2304;
const v2316=v2301["id"];
const v2317=v2302["id"];
const v2318=__nfValue(v2301["value"]);
const v2319=__nfValue(v2302["value"]);
const v2321=v2301["id"];
const v2322=4294967295;
const v2323=!(v2321===v2322);
let v2324=v2323;if(!v2324){
const v2325=v2302["id"];
const v2326=4294967295;
v2324=!(v2325===v2326);}
const v2327=v2324;
const v2328=false;
const v2329=(v2327===v2328);
let v2330=v2329;if(!v2330){
v2330=v2300["failed"];}
let v2331;
let v2332;
if(v2330){
const v2333=__fn6(v2315);
v2331=v2333;
v2332=v2300;
}else{
const v2334=v2300["nodes"];
const v2335=(v2334).length;
const v2336=v2300["maximum"];
let v2337;
let v2338;
if(((v2335) >= (v2336))){
const v2339=__fn6(v2315);
const v2340=true;
const v2341=v2300["nodes"];
const v2342=v2300["maximum"];
const v2344=({["value"]:v2339,["tape"]:({["nodes"]:v2341,["maximum"]:v2342,["failed"]:v2340})});
v2337=v2344["value"];
v2338=v2344["tape"];
}else{
const v2346=v2300["nodes"];
const v2347=({["op"]:v2299,["a"]:v2316,["b"]:v2317,["av"]:v2318,["bv"]:v2319,["value"]:v2315});
const v2348=__tempEdit(v2346,"push",v2347);
const v2349=v2300["maximum"];
const v2350=v2300["failed"];
const v2352=({["value"]:({["value"]:v2315,["id"]:v2335}),["tape"]:({["nodes"]:v2348,["maximum"]:v2349,["failed"]:v2350})});
v2337=v2352["value"];
v2338=v2352["tape"];
}
v2331=v2337;
v2332=v2338;
}
const v2354=v2332;
const v2356=v1810["w7"];
const v2359=v1810["w7"];
const v2361=3;
const v2362=1;
let v2363;if((v2361===v2362)){
const v2364=__nfValue(v2356["value"]);
const v2365=__nfValue(v2359["value"]);
v2363=Math.fround(__nfNumber(v2364) + __nfNumber(v2365));}else{
const v2366=2;
let v2367;if((v2361===v2366)){
const v2368=__nfValue(v2356["value"]);
const v2369=__nfValue(v2359["value"]);
v2367=Math.fround(__nfNumber(v2368) - __nfNumber(v2369));}else{
const v2370=3;
let v2371;if((v2361===v2370)){
const v2372=__nfValue(v2356["value"]);
const v2373=__nfValue(v2359["value"]);
v2371=Math.fround(__nfNumber(v2372) * __nfNumber(v2373));}else{
v2371=Math.fround((__nfNumber(__nfValue(v2356["value"])))/(__nfNumber(__nfValue(v2359["value"]))));}
v2367=v2371;}
v2363=v2367;}
const v2374=v2363;
const v2375=v2356["id"];
const v2376=v2359["id"];
const v2377=__nfValue(v2356["value"]);
const v2378=__nfValue(v2359["value"]);
const v2380=v2356["id"];
const v2381=4294967295;
const v2382=!(v2380===v2381);
let v2383=v2382;if(!v2383){
const v2384=v2359["id"];
const v2385=4294967295;
v2383=!(v2384===v2385);}
const v2386=v2383;
const v2387=false;
const v2388=(v2386===v2387);
let v2389=v2388;if(!v2389){
v2389=v2354["failed"];}
let v2390;
let v2391;
if(v2389){
const v2392=__fn6(v2374);
v2390=v2392;
v2391=v2354;
}else{
const v2393=v2354["nodes"];
const v2394=(v2393).length;
const v2395=v2354["maximum"];
let v2396;
let v2397;
if(((v2394) >= (v2395))){
const v2398=__fn6(v2374);
const v2399=true;
const v2400=v2354["nodes"];
const v2401=v2354["maximum"];
const v2403=({["value"]:v2398,["tape"]:({["nodes"]:v2400,["maximum"]:v2401,["failed"]:v2399})});
v2396=v2403["value"];
v2397=v2403["tape"];
}else{
const v2405=v2354["nodes"];
const v2406=({["op"]:v2361,["a"]:v2375,["b"]:v2376,["av"]:v2377,["bv"]:v2378,["value"]:v2374});
const v2407=__tempEdit(v2405,"push",v2406);
const v2408=v2354["maximum"];
const v2409=v2354["failed"];
const v2411=({["value"]:({["value"]:v2374,["id"]:v2394}),["tape"]:({["nodes"]:v2407,["maximum"]:v2408,["failed"]:v2409})});
v2396=v2411["value"];
v2397=v2411["tape"];
}
v2390=v2396;
v2391=v2397;
}
const v2413=1;
const v2414=v2391;
const v2415=v2331;
const v2416=v2390;
const v2417=1;
let v2418;if((v2413===v2417)){
const v2419=__nfValue(v2415["value"]);
const v2420=__nfValue(v2416["value"]);
v2418=Math.fround(__nfNumber(v2419) + __nfNumber(v2420));}else{
const v2421=2;
let v2422;if((v2413===v2421)){
const v2423=__nfValue(v2415["value"]);
const v2424=__nfValue(v2416["value"]);
v2422=Math.fround(__nfNumber(v2423) - __nfNumber(v2424));}else{
const v2425=3;
let v2426;if((v2413===v2425)){
const v2427=__nfValue(v2415["value"]);
const v2428=__nfValue(v2416["value"]);
v2426=Math.fround(__nfNumber(v2427) * __nfNumber(v2428));}else{
v2426=Math.fround((__nfNumber(__nfValue(v2415["value"])))/(__nfNumber(__nfValue(v2416["value"]))));}
v2422=v2426;}
v2418=v2422;}
const v2429=v2418;
const v2430=v2415["id"];
const v2431=v2416["id"];
const v2432=__nfValue(v2415["value"]);
const v2433=__nfValue(v2416["value"]);
const v2435=v2415["id"];
const v2436=4294967295;
const v2437=!(v2435===v2436);
let v2438=v2437;if(!v2438){
const v2439=v2416["id"];
const v2440=4294967295;
v2438=!(v2439===v2440);}
const v2441=v2438;
const v2442=false;
const v2443=(v2441===v2442);
let v2444=v2443;if(!v2444){
v2444=v2414["failed"];}
let v2445;
let v2446;
if(v2444){
const v2447=__fn6(v2429);
v2445=v2447;
v2446=v2414;
}else{
const v2448=v2414["nodes"];
const v2449=(v2448).length;
const v2450=v2414["maximum"];
let v2451;
let v2452;
if(((v2449) >= (v2450))){
const v2453=__fn6(v2429);
const v2454=true;
const v2455=v2414["nodes"];
const v2456=v2414["maximum"];
const v2458=({["value"]:v2453,["tape"]:({["nodes"]:v2455,["maximum"]:v2456,["failed"]:v2454})});
v2451=v2458["value"];
v2452=v2458["tape"];
}else{
const v2460=v2414["nodes"];
const v2461=({["op"]:v2413,["a"]:v2430,["b"]:v2431,["av"]:v2432,["bv"]:v2433,["value"]:v2429});
const v2462=__tempEdit(v2460,"push",v2461);
const v2463=v2414["maximum"];
const v2464=v2414["failed"];
const v2466=({["value"]:({["value"]:v2429,["id"]:v2449}),["tape"]:({["nodes"]:v2462,["maximum"]:v2463,["failed"]:v2464})});
v2451=v2466["value"];
v2452=v2466["tape"];
}
v2445=v2451;
v2446=v2452;
}
const v2468=v2446;
const v2470=v1806["b1"];
const v2473=v2470["w0"];
const v2476=v2470["w0"];
const v2478=3;
const v2479=__fn9(v2478,v2468,v2473,v2476);
const v2480=v2479["tape"];
const v2482=v2470["w1"];
const v2485=v2470["w1"];
const v2487=3;
const v2488=__fn9(v2487,v2480,v2482,v2485);
const v2489=1;
const v2490=v2488["tape"];
const v2491=v2479["value"];
const v2492=v2488["value"];
const v2493=1;
let v2494;if((v2489===v2493)){
const v2495=__nfValue(v2491["value"]);
const v2496=__nfValue(v2492["value"]);
v2494=Math.fround(__nfNumber(v2495) + __nfNumber(v2496));}else{
const v2497=2;
let v2498;if((v2489===v2497)){
const v2499=__nfValue(v2491["value"]);
const v2500=__nfValue(v2492["value"]);
v2498=Math.fround(__nfNumber(v2499) - __nfNumber(v2500));}else{
const v2501=3;
let v2502;if((v2489===v2501)){
const v2503=__nfValue(v2491["value"]);
const v2504=__nfValue(v2492["value"]);
v2502=Math.fround(__nfNumber(v2503) * __nfNumber(v2504));}else{
v2502=Math.fround((__nfNumber(__nfValue(v2491["value"])))/(__nfNumber(__nfValue(v2492["value"]))));}
v2498=v2502;}
v2494=v2498;}
const v2505=v2494;
const v2506=v2491["id"];
const v2507=v2492["id"];
const v2508=__nfValue(v2491["value"]);
const v2509=__nfValue(v2492["value"]);
const v2511=v2491["id"];
const v2512=4294967295;
const v2513=!(v2511===v2512);
let v2514=v2513;if(!v2514){
const v2515=v2492["id"];
const v2516=4294967295;
v2514=!(v2515===v2516);}
const v2517=v2514;
const v2518=__fn7(v2490,({["op"]:v2489,["a"]:v2506,["b"]:v2507,["av"]:v2508,["bv"]:v2509,["value"]:v2505}),v2517);
const v2519=v2518["tape"];
const v2521=v2470["w2"];
const v2524=v2470["w2"];
const v2526=3;
const v2527=__fn9(v2526,v2519,v2521,v2524);
const v2528=1;
const v2529=v2527["tape"];
const v2530=v2518["value"];
const v2531=v2527["value"];
const v2532=1;
let v2533;if((v2528===v2532)){
const v2534=__nfValue(v2530["value"]);
const v2535=__nfValue(v2531["value"]);
v2533=Math.fround(__nfNumber(v2534) + __nfNumber(v2535));}else{
const v2536=2;
let v2537;if((v2528===v2536)){
const v2538=__nfValue(v2530["value"]);
const v2539=__nfValue(v2531["value"]);
v2537=Math.fround(__nfNumber(v2538) - __nfNumber(v2539));}else{
const v2540=3;
let v2541;if((v2528===v2540)){
const v2542=__nfValue(v2530["value"]);
const v2543=__nfValue(v2531["value"]);
v2541=Math.fround(__nfNumber(v2542) * __nfNumber(v2543));}else{
v2541=Math.fround((__nfNumber(__nfValue(v2530["value"])))/(__nfNumber(__nfValue(v2531["value"]))));}
v2537=v2541;}
v2533=v2537;}
const v2544=v2533;
const v2545=v2530["id"];
const v2546=v2531["id"];
const v2547=__nfValue(v2530["value"]);
const v2548=__nfValue(v2531["value"]);
const v2550=v2530["id"];
const v2551=4294967295;
const v2552=!(v2550===v2551);
let v2553=v2552;if(!v2553){
const v2554=v2531["id"];
const v2555=4294967295;
v2553=!(v2554===v2555);}
const v2556=v2553;
const v2557=__fn7(v2529,({["op"]:v2528,["a"]:v2545,["b"]:v2546,["av"]:v2547,["bv"]:v2548,["value"]:v2544}),v2556);
const v2558=v2557["tape"];
const v2560=v2470["w3"];
const v2563=v2470["w3"];
const v2565=3;
const v2566=1;
let v2567;if((v2565===v2566)){
const v2568=__nfValue(v2560["value"]);
const v2569=__nfValue(v2563["value"]);
v2567=Math.fround(__nfNumber(v2568) + __nfNumber(v2569));}else{
const v2570=2;
let v2571;if((v2565===v2570)){
const v2572=__nfValue(v2560["value"]);
const v2573=__nfValue(v2563["value"]);
v2571=Math.fround(__nfNumber(v2572) - __nfNumber(v2573));}else{
const v2574=3;
let v2575;if((v2565===v2574)){
const v2576=__nfValue(v2560["value"]);
const v2577=__nfValue(v2563["value"]);
v2575=Math.fround(__nfNumber(v2576) * __nfNumber(v2577));}else{
v2575=Math.fround((__nfNumber(__nfValue(v2560["value"])))/(__nfNumber(__nfValue(v2563["value"]))));}
v2571=v2575;}
v2567=v2571;}
const v2578=v2567;
const v2579=v2560["id"];
const v2580=v2563["id"];
const v2581=__nfValue(v2560["value"]);
const v2582=__nfValue(v2563["value"]);
const v2584=v2560["id"];
const v2585=4294967295;
const v2586=!(v2584===v2585);
let v2587=v2586;if(!v2587){
const v2588=v2563["id"];
const v2589=4294967295;
v2587=!(v2588===v2589);}
const v2590=v2587;
const v2591=__fn7(v2558,({["op"]:v2565,["a"]:v2579,["b"]:v2580,["av"]:v2581,["bv"]:v2582,["value"]:v2578}),v2590);
const v2592=1;
const v2593=v2591["tape"];
const v2594=v2557["value"];
const v2595=v2591["value"];
const v2596=1;
let v2597;if((v2592===v2596)){
const v2598=__nfValue(v2594["value"]);
const v2599=__nfValue(v2595["value"]);
v2597=Math.fround(__nfNumber(v2598) + __nfNumber(v2599));}else{
const v2600=2;
let v2601;if((v2592===v2600)){
const v2602=__nfValue(v2594["value"]);
const v2603=__nfValue(v2595["value"]);
v2601=Math.fround(__nfNumber(v2602) - __nfNumber(v2603));}else{
const v2604=3;
let v2605;if((v2592===v2604)){
const v2606=__nfValue(v2594["value"]);
const v2607=__nfValue(v2595["value"]);
v2605=Math.fround(__nfNumber(v2606) * __nfNumber(v2607));}else{
v2605=Math.fround((__nfNumber(__nfValue(v2594["value"])))/(__nfNumber(__nfValue(v2595["value"]))));}
v2601=v2605;}
v2597=v2601;}
const v2608=v2597;
const v2609=v2594["id"];
const v2610=v2595["id"];
const v2611=__nfValue(v2594["value"]);
const v2612=__nfValue(v2595["value"]);
const v2614=v2594["id"];
const v2615=4294967295;
const v2616=!(v2614===v2615);
let v2617=v2616;if(!v2617){
const v2618=v2595["id"];
const v2619=4294967295;
v2617=!(v2618===v2619);}
const v2620=v2617;
const v2621=__fn7(v2593,({["op"]:v2592,["a"]:v2609,["b"]:v2610,["av"]:v2611,["bv"]:v2612,["value"]:v2608}),v2620);
const v2622=v2621["tape"];
const v2624=v2470["w4"];
const v2627=v2470["w4"];
const v2629=3;
const v2630=1;
let v2631;if((v2629===v2630)){
const v2632=__nfValue(v2624["value"]);
const v2633=__nfValue(v2627["value"]);
v2631=Math.fround(__nfNumber(v2632) + __nfNumber(v2633));}else{
const v2634=2;
let v2635;if((v2629===v2634)){
const v2636=__nfValue(v2624["value"]);
const v2637=__nfValue(v2627["value"]);
v2635=Math.fround(__nfNumber(v2636) - __nfNumber(v2637));}else{
const v2638=3;
let v2639;if((v2629===v2638)){
const v2640=__nfValue(v2624["value"]);
const v2641=__nfValue(v2627["value"]);
v2639=Math.fround(__nfNumber(v2640) * __nfNumber(v2641));}else{
v2639=Math.fround((__nfNumber(__nfValue(v2624["value"])))/(__nfNumber(__nfValue(v2627["value"]))));}
v2635=v2639;}
v2631=v2635;}
const v2642=v2631;
const v2643=v2624["id"];
const v2644=v2627["id"];
const v2645=__nfValue(v2624["value"]);
const v2646=__nfValue(v2627["value"]);
const v2648=v2624["id"];
const v2649=4294967295;
const v2650=!(v2648===v2649);
let v2651=v2650;if(!v2651){
const v2652=v2627["id"];
const v2653=4294967295;
v2651=!(v2652===v2653);}
const v2654=v2651;
const v2655=__fn7(v2622,({["op"]:v2629,["a"]:v2643,["b"]:v2644,["av"]:v2645,["bv"]:v2646,["value"]:v2642}),v2654);
const v2656=1;
const v2657=v2655["tape"];
const v2658=v2621["value"];
const v2659=v2655["value"];
const v2660=1;
let v2661;if((v2656===v2660)){
const v2662=__nfValue(v2658["value"]);
const v2663=__nfValue(v2659["value"]);
v2661=Math.fround(__nfNumber(v2662) + __nfNumber(v2663));}else{
const v2664=2;
let v2665;if((v2656===v2664)){
const v2666=__nfValue(v2658["value"]);
const v2667=__nfValue(v2659["value"]);
v2665=Math.fround(__nfNumber(v2666) - __nfNumber(v2667));}else{
const v2668=3;
let v2669;if((v2656===v2668)){
const v2670=__nfValue(v2658["value"]);
const v2671=__nfValue(v2659["value"]);
v2669=Math.fround(__nfNumber(v2670) * __nfNumber(v2671));}else{
v2669=Math.fround((__nfNumber(__nfValue(v2658["value"])))/(__nfNumber(__nfValue(v2659["value"]))));}
v2665=v2669;}
v2661=v2665;}
const v2672=v2661;
const v2673=v2658["id"];
const v2674=v2659["id"];
const v2675=__nfValue(v2658["value"]);
const v2676=__nfValue(v2659["value"]);
const v2678=v2658["id"];
const v2679=4294967295;
const v2680=!(v2678===v2679);
let v2681=v2680;if(!v2681){
const v2682=v2659["id"];
const v2683=4294967295;
v2681=!(v2682===v2683);}
const v2684=v2681;
const v2685=false;
const v2686=(v2684===v2685);
let v2687=v2686;if(!v2687){
v2687=v2657["failed"];}
let v2688;
let v2689;
if(v2687){
const v2690=__fn6(v2672);
v2688=v2690;
v2689=v2657;
}else{
const v2691=v2657["nodes"];
const v2692=(v2691).length;
const v2693=v2657["maximum"];
let v2694;
let v2695;
if(((v2692) >= (v2693))){
const v2696=__fn6(v2672);
const v2697=true;
const v2698=v2657["nodes"];
const v2699=v2657["maximum"];
const v2701=({["value"]:v2696,["tape"]:({["nodes"]:v2698,["maximum"]:v2699,["failed"]:v2697})});
v2694=v2701["value"];
v2695=v2701["tape"];
}else{
const v2703=v2657["nodes"];
const v2704=({["op"]:v2656,["a"]:v2673,["b"]:v2674,["av"]:v2675,["bv"]:v2676,["value"]:v2672});
const v2705=__tempEdit(v2703,"push",v2704);
const v2706=v2657["maximum"];
const v2707=v2657["failed"];
const v2709=({["value"]:({["value"]:v2672,["id"]:v2692}),["tape"]:({["nodes"]:v2705,["maximum"]:v2706,["failed"]:v2707})});
v2694=v2709["value"];
v2695=v2709["tape"];
}
v2688=v2694;
v2689=v2695;
}
const v2711=v2689;
const v2713=v2470["w5"];
const v2716=v2470["w5"];
const v2718=3;
const v2719=1;
let v2720;if((v2718===v2719)){
const v2721=__nfValue(v2713["value"]);
const v2722=__nfValue(v2716["value"]);
v2720=Math.fround(__nfNumber(v2721) + __nfNumber(v2722));}else{
const v2723=2;
let v2724;if((v2718===v2723)){
const v2725=__nfValue(v2713["value"]);
const v2726=__nfValue(v2716["value"]);
v2724=Math.fround(__nfNumber(v2725) - __nfNumber(v2726));}else{
const v2727=3;
let v2728;if((v2718===v2727)){
const v2729=__nfValue(v2713["value"]);
const v2730=__nfValue(v2716["value"]);
v2728=Math.fround(__nfNumber(v2729) * __nfNumber(v2730));}else{
v2728=Math.fround((__nfNumber(__nfValue(v2713["value"])))/(__nfNumber(__nfValue(v2716["value"]))));}
v2724=v2728;}
v2720=v2724;}
const v2731=v2720;
const v2732=v2713["id"];
const v2733=v2716["id"];
const v2734=__nfValue(v2713["value"]);
const v2735=__nfValue(v2716["value"]);
const v2737=v2713["id"];
const v2738=4294967295;
const v2739=!(v2737===v2738);
let v2740=v2739;if(!v2740){
const v2741=v2716["id"];
const v2742=4294967295;
v2740=!(v2741===v2742);}
const v2743=v2740;
const v2744=__fn7(v2711,({["op"]:v2718,["a"]:v2732,["b"]:v2733,["av"]:v2734,["bv"]:v2735,["value"]:v2731}),v2743);
const v2745=1;
const v2746=v2744["tape"];
const v2747=v2688;
const v2748=v2744["value"];
const v2749=1;
let v2750;if((v2745===v2749)){
const v2751=__nfValue(v2747["value"]);
const v2752=__nfValue(v2748["value"]);
v2750=Math.fround(__nfNumber(v2751) + __nfNumber(v2752));}else{
const v2753=2;
let v2754;if((v2745===v2753)){
const v2755=__nfValue(v2747["value"]);
const v2756=__nfValue(v2748["value"]);
v2754=Math.fround(__nfNumber(v2755) - __nfNumber(v2756));}else{
const v2757=3;
let v2758;if((v2745===v2757)){
const v2759=__nfValue(v2747["value"]);
const v2760=__nfValue(v2748["value"]);
v2758=Math.fround(__nfNumber(v2759) * __nfNumber(v2760));}else{
v2758=Math.fround((__nfNumber(__nfValue(v2747["value"])))/(__nfNumber(__nfValue(v2748["value"]))));}
v2754=v2758;}
v2750=v2754;}
const v2761=v2750;
const v2762=v2747["id"];
const v2763=v2748["id"];
const v2764=__nfValue(v2747["value"]);
const v2765=__nfValue(v2748["value"]);
const v2767=v2747["id"];
const v2768=4294967295;
const v2769=!(v2767===v2768);
let v2770=v2769;if(!v2770){
const v2771=v2748["id"];
const v2772=4294967295;
v2770=!(v2771===v2772);}
const v2773=v2770;
const v2774=false;
const v2775=(v2773===v2774);
let v2776=v2775;if(!v2776){
v2776=v2746["failed"];}
let v2777;
let v2778;
if(v2776){
const v2779=__fn6(v2761);
v2777=v2779;
v2778=v2746;
}else{
const v2780=v2746["nodes"];
const v2781=(v2780).length;
const v2782=v2746["maximum"];
let v2783;
let v2784;
if(((v2781) >= (v2782))){
const v2785=__fn6(v2761);
const v2786=true;
const v2787=v2746["nodes"];
const v2788=v2746["maximum"];
const v2790=({["value"]:v2785,["tape"]:({["nodes"]:v2787,["maximum"]:v2788,["failed"]:v2786})});
v2783=v2790["value"];
v2784=v2790["tape"];
}else{
const v2792=v2746["nodes"];
const v2793=({["op"]:v2745,["a"]:v2762,["b"]:v2763,["av"]:v2764,["bv"]:v2765,["value"]:v2761});
const v2794=__tempEdit(v2792,"push",v2793);
const v2795=v2746["maximum"];
const v2796=v2746["failed"];
const v2798=({["value"]:({["value"]:v2761,["id"]:v2781}),["tape"]:({["nodes"]:v2794,["maximum"]:v2795,["failed"]:v2796})});
v2783=v2798["value"];
v2784=v2798["tape"];
}
v2777=v2783;
v2778=v2784;
}
const v2800=v2778;
const v2802=v2470["w6"];
const v2805=v2470["w6"];
const v2807=3;
const v2808=1;
let v2809;if((v2807===v2808)){
const v2810=__nfValue(v2802["value"]);
const v2811=__nfValue(v2805["value"]);
v2809=Math.fround(__nfNumber(v2810) + __nfNumber(v2811));}else{
const v2812=2;
let v2813;if((v2807===v2812)){
const v2814=__nfValue(v2802["value"]);
const v2815=__nfValue(v2805["value"]);
v2813=Math.fround(__nfNumber(v2814) - __nfNumber(v2815));}else{
const v2816=3;
let v2817;if((v2807===v2816)){
const v2818=__nfValue(v2802["value"]);
const v2819=__nfValue(v2805["value"]);
v2817=Math.fround(__nfNumber(v2818) * __nfNumber(v2819));}else{
v2817=Math.fround((__nfNumber(__nfValue(v2802["value"])))/(__nfNumber(__nfValue(v2805["value"]))));}
v2813=v2817;}
v2809=v2813;}
const v2820=v2809;
const v2821=v2802["id"];
const v2822=v2805["id"];
const v2823=__nfValue(v2802["value"]);
const v2824=__nfValue(v2805["value"]);
const v2826=v2802["id"];
const v2827=4294967295;
const v2828=!(v2826===v2827);
let v2829=v2828;if(!v2829){
const v2830=v2805["id"];
const v2831=4294967295;
v2829=!(v2830===v2831);}
const v2832=v2829;
const v2833=false;
const v2834=(v2832===v2833);
let v2835=v2834;if(!v2835){
v2835=v2800["failed"];}
let v2836;
let v2837;
if(v2835){
const v2838=__fn6(v2820);
v2836=v2838;
v2837=v2800;
}else{
const v2839=v2800["nodes"];
const v2840=(v2839).length;
const v2841=v2800["maximum"];
let v2842;
let v2843;
if(((v2840) >= (v2841))){
const v2844=__fn6(v2820);
const v2845=true;
const v2846=v2800["nodes"];
const v2847=v2800["maximum"];
const v2849=({["value"]:v2844,["tape"]:({["nodes"]:v2846,["maximum"]:v2847,["failed"]:v2845})});
v2842=v2849["value"];
v2843=v2849["tape"];
}else{
const v2851=v2800["nodes"];
const v2852=({["op"]:v2807,["a"]:v2821,["b"]:v2822,["av"]:v2823,["bv"]:v2824,["value"]:v2820});
const v2853=__tempEdit(v2851,"push",v2852);
const v2854=v2800["maximum"];
const v2855=v2800["failed"];
const v2857=({["value"]:({["value"]:v2820,["id"]:v2840}),["tape"]:({["nodes"]:v2853,["maximum"]:v2854,["failed"]:v2855})});
v2842=v2857["value"];
v2843=v2857["tape"];
}
v2836=v2842;
v2837=v2843;
}
const v2859=1;
const v2860=v2837;
const v2861=v2777;
const v2862=v2836;
const v2863=1;
let v2864;if((v2859===v2863)){
const v2865=__nfValue(v2861["value"]);
const v2866=__nfValue(v2862["value"]);
v2864=Math.fround(__nfNumber(v2865) + __nfNumber(v2866));}else{
const v2867=2;
let v2868;if((v2859===v2867)){
const v2869=__nfValue(v2861["value"]);
const v2870=__nfValue(v2862["value"]);
v2868=Math.fround(__nfNumber(v2869) - __nfNumber(v2870));}else{
const v2871=3;
let v2872;if((v2859===v2871)){
const v2873=__nfValue(v2861["value"]);
const v2874=__nfValue(v2862["value"]);
v2872=Math.fround(__nfNumber(v2873) * __nfNumber(v2874));}else{
v2872=Math.fround((__nfNumber(__nfValue(v2861["value"])))/(__nfNumber(__nfValue(v2862["value"]))));}
v2868=v2872;}
v2864=v2868;}
const v2875=v2864;
const v2876=v2861["id"];
const v2877=v2862["id"];
const v2878=__nfValue(v2861["value"]);
const v2879=__nfValue(v2862["value"]);
const v2881=v2861["id"];
const v2882=4294967295;
const v2883=!(v2881===v2882);
let v2884=v2883;if(!v2884){
const v2885=v2862["id"];
const v2886=4294967295;
v2884=!(v2885===v2886);}
const v2887=v2884;
const v2888=false;
const v2889=(v2887===v2888);
let v2890=v2889;if(!v2890){
v2890=v2860["failed"];}
let v2891;
let v2892;
if(v2890){
const v2893=__fn6(v2875);
v2891=v2893;
v2892=v2860;
}else{
const v2894=v2860["nodes"];
const v2895=(v2894).length;
const v2896=v2860["maximum"];
let v2897;
let v2898;
if(((v2895) >= (v2896))){
const v2899=__fn6(v2875);
const v2900=true;
const v2901=v2860["nodes"];
const v2902=v2860["maximum"];
const v2904=({["value"]:v2899,["tape"]:({["nodes"]:v2901,["maximum"]:v2902,["failed"]:v2900})});
v2897=v2904["value"];
v2898=v2904["tape"];
}else{
const v2906=v2860["nodes"];
const v2907=({["op"]:v2859,["a"]:v2876,["b"]:v2877,["av"]:v2878,["bv"]:v2879,["value"]:v2875});
const v2908=__tempEdit(v2906,"push",v2907);
const v2909=v2860["maximum"];
const v2910=v2860["failed"];
const v2912=({["value"]:({["value"]:v2875,["id"]:v2895}),["tape"]:({["nodes"]:v2908,["maximum"]:v2909,["failed"]:v2910})});
v2897=v2912["value"];
v2898=v2912["tape"];
}
v2891=v2897;
v2892=v2898;
}
const v2914=v2892;
const v2916=v2470["w7"];
const v2919=v2470["w7"];
const v2921=3;
const v2922=1;
let v2923;if((v2921===v2922)){
const v2924=__nfValue(v2916["value"]);
const v2925=__nfValue(v2919["value"]);
v2923=Math.fround(__nfNumber(v2924) + __nfNumber(v2925));}else{
const v2926=2;
let v2927;if((v2921===v2926)){
const v2928=__nfValue(v2916["value"]);
const v2929=__nfValue(v2919["value"]);
v2927=Math.fround(__nfNumber(v2928) - __nfNumber(v2929));}else{
const v2930=3;
let v2931;if((v2921===v2930)){
const v2932=__nfValue(v2916["value"]);
const v2933=__nfValue(v2919["value"]);
v2931=Math.fround(__nfNumber(v2932) * __nfNumber(v2933));}else{
v2931=Math.fround((__nfNumber(__nfValue(v2916["value"])))/(__nfNumber(__nfValue(v2919["value"]))));}
v2927=v2931;}
v2923=v2927;}
const v2934=v2923;
const v2935=v2916["id"];
const v2936=v2919["id"];
const v2937=__nfValue(v2916["value"]);
const v2938=__nfValue(v2919["value"]);
const v2940=v2916["id"];
const v2941=4294967295;
const v2942=!(v2940===v2941);
let v2943=v2942;if(!v2943){
const v2944=v2919["id"];
const v2945=4294967295;
v2943=!(v2944===v2945);}
const v2946=v2943;
const v2947=false;
const v2948=(v2946===v2947);
let v2949=v2948;if(!v2949){
v2949=v2914["failed"];}
let v2950;
let v2951;
if(v2949){
const v2952=__fn6(v2934);
v2950=v2952;
v2951=v2914;
}else{
const v2953=v2914["nodes"];
const v2954=(v2953).length;
const v2955=v2914["maximum"];
let v2956;
let v2957;
if(((v2954) >= (v2955))){
const v2958=__fn6(v2934);
const v2959=true;
const v2960=v2914["nodes"];
const v2961=v2914["maximum"];
const v2963=({["value"]:v2958,["tape"]:({["nodes"]:v2960,["maximum"]:v2961,["failed"]:v2959})});
v2956=v2963["value"];
v2957=v2963["tape"];
}else{
const v2965=v2914["nodes"];
const v2966=({["op"]:v2921,["a"]:v2935,["b"]:v2936,["av"]:v2937,["bv"]:v2938,["value"]:v2934});
const v2967=__tempEdit(v2965,"push",v2966);
const v2968=v2914["maximum"];
const v2969=v2914["failed"];
const v2971=({["value"]:({["value"]:v2934,["id"]:v2954}),["tape"]:({["nodes"]:v2967,["maximum"]:v2968,["failed"]:v2969})});
v2956=v2971["value"];
v2957=v2971["tape"];
}
v2950=v2956;
v2951=v2957;
}
const v2973=1;
const v2974=v2951;
const v2975=v2891;
const v2976=v2950;
const v2977=1;
let v2978;if((v2973===v2977)){
const v2979=__nfValue(v2975["value"]);
const v2980=__nfValue(v2976["value"]);
v2978=Math.fround(__nfNumber(v2979) + __nfNumber(v2980));}else{
const v2981=2;
let v2982;if((v2973===v2981)){
const v2983=__nfValue(v2975["value"]);
const v2984=__nfValue(v2976["value"]);
v2982=Math.fround(__nfNumber(v2983) - __nfNumber(v2984));}else{
const v2985=3;
let v2986;if((v2973===v2985)){
const v2987=__nfValue(v2975["value"]);
const v2988=__nfValue(v2976["value"]);
v2986=Math.fround(__nfNumber(v2987) * __nfNumber(v2988));}else{
v2986=Math.fround((__nfNumber(__nfValue(v2975["value"])))/(__nfNumber(__nfValue(v2976["value"]))));}
v2982=v2986;}
v2978=v2982;}
const v2989=v2978;
const v2990=v2975["id"];
const v2991=v2976["id"];
const v2992=__nfValue(v2975["value"]);
const v2993=__nfValue(v2976["value"]);
const v2995=v2975["id"];
const v2996=4294967295;
const v2997=!(v2995===v2996);
let v2998=v2997;if(!v2998){
const v2999=v2976["id"];
const v3000=4294967295;
v2998=!(v2999===v3000);}
const v3001=v2998;
const v3002=false;
const v3003=(v3001===v3002);
let v3004=v3003;if(!v3004){
v3004=v2974["failed"];}
let v3005;
let v3006;
if(v3004){
const v3007=__fn6(v2989);
v3005=v3007;
v3006=v2974;
}else{
const v3008=v2974["nodes"];
const v3009=(v3008).length;
const v3010=v2974["maximum"];
let v3011;
let v3012;
if(((v3009) >= (v3010))){
const v3013=__fn6(v2989);
const v3014=true;
const v3015=v2974["nodes"];
const v3016=v2974["maximum"];
const v3018=({["value"]:v3013,["tape"]:({["nodes"]:v3015,["maximum"]:v3016,["failed"]:v3014})});
v3011=v3018["value"];
v3012=v3018["tape"];
}else{
const v3020=v2974["nodes"];
const v3021=({["op"]:v2973,["a"]:v2990,["b"]:v2991,["av"]:v2992,["bv"]:v2993,["value"]:v2989});
const v3022=__tempEdit(v3020,"push",v3021);
const v3023=v2974["maximum"];
const v3024=v2974["failed"];
const v3026=({["value"]:({["value"]:v2989,["id"]:v3009}),["tape"]:({["nodes"]:v3022,["maximum"]:v3023,["failed"]:v3024})});
v3011=v3026["value"];
v3012=v3026["tape"];
}
v3005=v3011;
v3006=v3012;
}
const v3028=1;
const v3029=v3006;
const v3030=v2445;
const v3031=v3005;
const v3032=1;
let v3033;if((v3028===v3032)){
const v3034=__nfValue(v3030["value"]);
const v3035=__nfValue(v3031["value"]);
v3033=Math.fround(__nfNumber(v3034) + __nfNumber(v3035));}else{
const v3036=2;
let v3037;if((v3028===v3036)){
const v3038=__nfValue(v3030["value"]);
const v3039=__nfValue(v3031["value"]);
v3037=Math.fround(__nfNumber(v3038) - __nfNumber(v3039));}else{
const v3040=3;
let v3041;if((v3028===v3040)){
const v3042=__nfValue(v3030["value"]);
const v3043=__nfValue(v3031["value"]);
v3041=Math.fround(__nfNumber(v3042) * __nfNumber(v3043));}else{
v3041=Math.fround((__nfNumber(__nfValue(v3030["value"])))/(__nfNumber(__nfValue(v3031["value"]))));}
v3037=v3041;}
v3033=v3037;}
const v3044=v3033;
const v3045=v3030["id"];
const v3046=v3031["id"];
const v3047=__nfValue(v3030["value"]);
const v3048=__nfValue(v3031["value"]);
const v3050=v3030["id"];
const v3051=4294967295;
const v3052=!(v3050===v3051);
let v3053=v3052;if(!v3053){
const v3054=v3031["id"];
const v3055=4294967295;
v3053=!(v3054===v3055);}
const v3056=v3053;
const v3057=false;
const v3058=(v3056===v3057);
let v3059=v3058;if(!v3059){
v3059=v3029["failed"];}
let v3060;
let v3061;
if(v3059){
const v3062=__fn6(v3044);
v3060=v3062;
v3061=v3029;
}else{
const v3063=v3029["nodes"];
const v3064=(v3063).length;
const v3065=v3029["maximum"];
let v3066;
let v3067;
if(((v3064) >= (v3065))){
const v3068=__fn6(v3044);
const v3069=true;
const v3070=v3029["nodes"];
const v3071=v3029["maximum"];
const v3073=({["value"]:v3068,["tape"]:({["nodes"]:v3070,["maximum"]:v3071,["failed"]:v3069})});
v3066=v3073["value"];
v3067=v3073["tape"];
}else{
const v3075=v3029["nodes"];
const v3076=({["op"]:v3028,["a"]:v3045,["b"]:v3046,["av"]:v3047,["bv"]:v3048,["value"]:v3044});
const v3077=__tempEdit(v3075,"push",v3076);
const v3078=v3029["maximum"];
const v3079=v3029["failed"];
const v3081=({["value"]:({["value"]:v3044,["id"]:v3064}),["tape"]:({["nodes"]:v3077,["maximum"]:v3078,["failed"]:v3079})});
v3066=v3081["value"];
v3067=v3081["tape"];
}
v3060=v3066;
v3061=v3067;
}
const v3083=v3061;
const v3085=v1806["b2"];
const v3088=v3085["w0"];
const v3091=v3085["w0"];
const v3093=3;
const v3094=1;
let v3095;if((v3093===v3094)){
const v3096=__nfValue(v3088["value"]);
const v3097=__nfValue(v3091["value"]);
v3095=Math.fround(__nfNumber(v3096) + __nfNumber(v3097));}else{
const v3098=2;
let v3099;if((v3093===v3098)){
const v3100=__nfValue(v3088["value"]);
const v3101=__nfValue(v3091["value"]);
v3099=Math.fround(__nfNumber(v3100) - __nfNumber(v3101));}else{
const v3102=3;
let v3103;if((v3093===v3102)){
const v3104=__nfValue(v3088["value"]);
const v3105=__nfValue(v3091["value"]);
v3103=Math.fround(__nfNumber(v3104) * __nfNumber(v3105));}else{
v3103=Math.fround((__nfNumber(__nfValue(v3088["value"])))/(__nfNumber(__nfValue(v3091["value"]))));}
v3099=v3103;}
v3095=v3099;}
const v3106=v3095;
const v3107=v3088["id"];
const v3108=v3091["id"];
const v3109=__nfValue(v3088["value"]);
const v3110=__nfValue(v3091["value"]);
const v3112=v3088["id"];
const v3113=4294967295;
const v3114=!(v3112===v3113);
let v3115=v3114;if(!v3115){
const v3116=v3091["id"];
const v3117=4294967295;
v3115=!(v3116===v3117);}
const v3118=v3115;
const v3119=__fn7(v3083,({["op"]:v3093,["a"]:v3107,["b"]:v3108,["av"]:v3109,["bv"]:v3110,["value"]:v3106}),v3118);
const v3120=v3119["tape"];
const v3122=v3085["w1"];
const v3125=v3085["w1"];
const v3127=3;
const v3128=__fn9(v3127,v3120,v3122,v3125);
const v3129=1;
const v3130=v3128["tape"];
const v3131=v3119["value"];
const v3132=v3128["value"];
const v3133=1;
let v3134;if((v3129===v3133)){
const v3135=__nfValue(v3131["value"]);
const v3136=__nfValue(v3132["value"]);
v3134=Math.fround(__nfNumber(v3135) + __nfNumber(v3136));}else{
const v3137=2;
let v3138;if((v3129===v3137)){
const v3139=__nfValue(v3131["value"]);
const v3140=__nfValue(v3132["value"]);
v3138=Math.fround(__nfNumber(v3139) - __nfNumber(v3140));}else{
const v3141=3;
let v3142;if((v3129===v3141)){
const v3143=__nfValue(v3131["value"]);
const v3144=__nfValue(v3132["value"]);
v3142=Math.fround(__nfNumber(v3143) * __nfNumber(v3144));}else{
v3142=Math.fround((__nfNumber(__nfValue(v3131["value"])))/(__nfNumber(__nfValue(v3132["value"]))));}
v3138=v3142;}
v3134=v3138;}
const v3145=v3134;
const v3146=v3131["id"];
const v3147=v3132["id"];
const v3148=__nfValue(v3131["value"]);
const v3149=__nfValue(v3132["value"]);
const v3151=v3131["id"];
const v3152=4294967295;
const v3153=!(v3151===v3152);
let v3154=v3153;if(!v3154){
const v3155=v3132["id"];
const v3156=4294967295;
v3154=!(v3155===v3156);}
const v3157=v3154;
const v3158=__fn7(v3130,({["op"]:v3129,["a"]:v3146,["b"]:v3147,["av"]:v3148,["bv"]:v3149,["value"]:v3145}),v3157);
const v3159=v3158["tape"];
const v3161=v3085["w2"];
const v3164=v3085["w2"];
const v3166=3;
const v3167=1;
let v3168;if((v3166===v3167)){
const v3169=__nfValue(v3161["value"]);
const v3170=__nfValue(v3164["value"]);
v3168=Math.fround(__nfNumber(v3169) + __nfNumber(v3170));}else{
const v3171=2;
let v3172;if((v3166===v3171)){
const v3173=__nfValue(v3161["value"]);
const v3174=__nfValue(v3164["value"]);
v3172=Math.fround(__nfNumber(v3173) - __nfNumber(v3174));}else{
const v3175=3;
let v3176;if((v3166===v3175)){
const v3177=__nfValue(v3161["value"]);
const v3178=__nfValue(v3164["value"]);
v3176=Math.fround(__nfNumber(v3177) * __nfNumber(v3178));}else{
v3176=Math.fround((__nfNumber(__nfValue(v3161["value"])))/(__nfNumber(__nfValue(v3164["value"]))));}
v3172=v3176;}
v3168=v3172;}
const v3179=v3168;
const v3180=v3161["id"];
const v3181=v3164["id"];
const v3182=__nfValue(v3161["value"]);
const v3183=__nfValue(v3164["value"]);
const v3185=v3161["id"];
const v3186=4294967295;
const v3187=!(v3185===v3186);
let v3188=v3187;if(!v3188){
const v3189=v3164["id"];
const v3190=4294967295;
v3188=!(v3189===v3190);}
const v3191=v3188;
const v3192=__fn7(v3159,({["op"]:v3166,["a"]:v3180,["b"]:v3181,["av"]:v3182,["bv"]:v3183,["value"]:v3179}),v3191);
const v3193=1;
const v3194=v3192["tape"];
const v3195=v3158["value"];
const v3196=v3192["value"];
const v3197=1;
let v3198;if((v3193===v3197)){
const v3199=__nfValue(v3195["value"]);
const v3200=__nfValue(v3196["value"]);
v3198=Math.fround(__nfNumber(v3199) + __nfNumber(v3200));}else{
const v3201=2;
let v3202;if((v3193===v3201)){
const v3203=__nfValue(v3195["value"]);
const v3204=__nfValue(v3196["value"]);
v3202=Math.fround(__nfNumber(v3203) - __nfNumber(v3204));}else{
const v3205=3;
let v3206;if((v3193===v3205)){
const v3207=__nfValue(v3195["value"]);
const v3208=__nfValue(v3196["value"]);
v3206=Math.fround(__nfNumber(v3207) * __nfNumber(v3208));}else{
v3206=Math.fround((__nfNumber(__nfValue(v3195["value"])))/(__nfNumber(__nfValue(v3196["value"]))));}
v3202=v3206;}
v3198=v3202;}
const v3209=v3198;
const v3210=v3195["id"];
const v3211=v3196["id"];
const v3212=__nfValue(v3195["value"]);
const v3213=__nfValue(v3196["value"]);
const v3215=v3195["id"];
const v3216=4294967295;
const v3217=!(v3215===v3216);
let v3218=v3217;if(!v3218){
const v3219=v3196["id"];
const v3220=4294967295;
v3218=!(v3219===v3220);}
const v3221=v3218;
const v3222=__fn7(v3194,({["op"]:v3193,["a"]:v3210,["b"]:v3211,["av"]:v3212,["bv"]:v3213,["value"]:v3209}),v3221);
const v3223=v3222["tape"];
const v3225=v3085["w3"];
const v3228=v3085["w3"];
const v3230=3;
const v3231=1;
let v3232;if((v3230===v3231)){
const v3233=__nfValue(v3225["value"]);
const v3234=__nfValue(v3228["value"]);
v3232=Math.fround(__nfNumber(v3233) + __nfNumber(v3234));}else{
const v3235=2;
let v3236;if((v3230===v3235)){
const v3237=__nfValue(v3225["value"]);
const v3238=__nfValue(v3228["value"]);
v3236=Math.fround(__nfNumber(v3237) - __nfNumber(v3238));}else{
const v3239=3;
let v3240;if((v3230===v3239)){
const v3241=__nfValue(v3225["value"]);
const v3242=__nfValue(v3228["value"]);
v3240=Math.fround(__nfNumber(v3241) * __nfNumber(v3242));}else{
v3240=Math.fround((__nfNumber(__nfValue(v3225["value"])))/(__nfNumber(__nfValue(v3228["value"]))));}
v3236=v3240;}
v3232=v3236;}
const v3243=v3232;
const v3244=v3225["id"];
const v3245=v3228["id"];
const v3246=__nfValue(v3225["value"]);
const v3247=__nfValue(v3228["value"]);
const v3249=v3225["id"];
const v3250=4294967295;
const v3251=!(v3249===v3250);
let v3252=v3251;if(!v3252){
const v3253=v3228["id"];
const v3254=4294967295;
v3252=!(v3253===v3254);}
const v3255=v3252;
const v3256=__fn7(v3223,({["op"]:v3230,["a"]:v3244,["b"]:v3245,["av"]:v3246,["bv"]:v3247,["value"]:v3243}),v3255);
const v3257=1;
const v3258=v3256["tape"];
const v3259=v3222["value"];
const v3260=v3256["value"];
const v3261=1;
let v3262;if((v3257===v3261)){
const v3263=__nfValue(v3259["value"]);
const v3264=__nfValue(v3260["value"]);
v3262=Math.fround(__nfNumber(v3263) + __nfNumber(v3264));}else{
const v3265=2;
let v3266;if((v3257===v3265)){
const v3267=__nfValue(v3259["value"]);
const v3268=__nfValue(v3260["value"]);
v3266=Math.fround(__nfNumber(v3267) - __nfNumber(v3268));}else{
const v3269=3;
let v3270;if((v3257===v3269)){
const v3271=__nfValue(v3259["value"]);
const v3272=__nfValue(v3260["value"]);
v3270=Math.fround(__nfNumber(v3271) * __nfNumber(v3272));}else{
v3270=Math.fround((__nfNumber(__nfValue(v3259["value"])))/(__nfNumber(__nfValue(v3260["value"]))));}
v3266=v3270;}
v3262=v3266;}
const v3273=v3262;
const v3274=v3259["id"];
const v3275=v3260["id"];
const v3276=__nfValue(v3259["value"]);
const v3277=__nfValue(v3260["value"]);
const v3279=v3259["id"];
const v3280=4294967295;
const v3281=!(v3279===v3280);
let v3282=v3281;if(!v3282){
const v3283=v3260["id"];
const v3284=4294967295;
v3282=!(v3283===v3284);}
const v3285=v3282;
const v3286=false;
const v3287=(v3285===v3286);
let v3288=v3287;if(!v3288){
v3288=v3258["failed"];}
let v3289;
let v3290;
if(v3288){
const v3291=__fn6(v3273);
v3289=v3291;
v3290=v3258;
}else{
const v3292=v3258["nodes"];
const v3293=(v3292).length;
const v3294=v3258["maximum"];
let v3295;
let v3296;
if(((v3293) >= (v3294))){
const v3297=__fn6(v3273);
const v3298=true;
const v3299=v3258["nodes"];
const v3300=v3258["maximum"];
const v3302=({["value"]:v3297,["tape"]:({["nodes"]:v3299,["maximum"]:v3300,["failed"]:v3298})});
v3295=v3302["value"];
v3296=v3302["tape"];
}else{
const v3304=v3258["nodes"];
const v3305=({["op"]:v3257,["a"]:v3274,["b"]:v3275,["av"]:v3276,["bv"]:v3277,["value"]:v3273});
const v3306=__tempEdit(v3304,"push",v3305);
const v3307=v3258["maximum"];
const v3308=v3258["failed"];
const v3310=({["value"]:({["value"]:v3273,["id"]:v3293}),["tape"]:({["nodes"]:v3306,["maximum"]:v3307,["failed"]:v3308})});
v3295=v3310["value"];
v3296=v3310["tape"];
}
v3289=v3295;
v3290=v3296;
}
const v3312=v3290;
const v3314=v3085["w4"];
const v3317=v3085["w4"];
const v3319=3;
const v3320=1;
let v3321;if((v3319===v3320)){
const v3322=__nfValue(v3314["value"]);
const v3323=__nfValue(v3317["value"]);
v3321=Math.fround(__nfNumber(v3322) + __nfNumber(v3323));}else{
const v3324=2;
let v3325;if((v3319===v3324)){
const v3326=__nfValue(v3314["value"]);
const v3327=__nfValue(v3317["value"]);
v3325=Math.fround(__nfNumber(v3326) - __nfNumber(v3327));}else{
const v3328=3;
let v3329;if((v3319===v3328)){
const v3330=__nfValue(v3314["value"]);
const v3331=__nfValue(v3317["value"]);
v3329=Math.fround(__nfNumber(v3330) * __nfNumber(v3331));}else{
v3329=Math.fround((__nfNumber(__nfValue(v3314["value"])))/(__nfNumber(__nfValue(v3317["value"]))));}
v3325=v3329;}
v3321=v3325;}
const v3332=v3321;
const v3333=v3314["id"];
const v3334=v3317["id"];
const v3335=__nfValue(v3314["value"]);
const v3336=__nfValue(v3317["value"]);
const v3338=v3314["id"];
const v3339=4294967295;
const v3340=!(v3338===v3339);
let v3341=v3340;if(!v3341){
const v3342=v3317["id"];
const v3343=4294967295;
v3341=!(v3342===v3343);}
const v3344=v3341;
const v3345=__fn7(v3312,({["op"]:v3319,["a"]:v3333,["b"]:v3334,["av"]:v3335,["bv"]:v3336,["value"]:v3332}),v3344);
const v3346=1;
const v3347=v3345["tape"];
const v3348=v3289;
const v3349=v3345["value"];
const v3350=1;
let v3351;if((v3346===v3350)){
const v3352=__nfValue(v3348["value"]);
const v3353=__nfValue(v3349["value"]);
v3351=Math.fround(__nfNumber(v3352) + __nfNumber(v3353));}else{
const v3354=2;
let v3355;if((v3346===v3354)){
const v3356=__nfValue(v3348["value"]);
const v3357=__nfValue(v3349["value"]);
v3355=Math.fround(__nfNumber(v3356) - __nfNumber(v3357));}else{
const v3358=3;
let v3359;if((v3346===v3358)){
const v3360=__nfValue(v3348["value"]);
const v3361=__nfValue(v3349["value"]);
v3359=Math.fround(__nfNumber(v3360) * __nfNumber(v3361));}else{
v3359=Math.fround((__nfNumber(__nfValue(v3348["value"])))/(__nfNumber(__nfValue(v3349["value"]))));}
v3355=v3359;}
v3351=v3355;}
const v3362=v3351;
const v3363=v3348["id"];
const v3364=v3349["id"];
const v3365=__nfValue(v3348["value"]);
const v3366=__nfValue(v3349["value"]);
const v3368=v3348["id"];
const v3369=4294967295;
const v3370=!(v3368===v3369);
let v3371=v3370;if(!v3371){
const v3372=v3349["id"];
const v3373=4294967295;
v3371=!(v3372===v3373);}
const v3374=v3371;
const v3375=false;
const v3376=(v3374===v3375);
let v3377=v3376;if(!v3377){
v3377=v3347["failed"];}
let v3378;
let v3379;
if(v3377){
const v3380=__fn6(v3362);
v3378=v3380;
v3379=v3347;
}else{
const v3381=v3347["nodes"];
const v3382=(v3381).length;
const v3383=v3347["maximum"];
let v3384;
let v3385;
if(((v3382) >= (v3383))){
const v3386=__fn6(v3362);
const v3387=true;
const v3388=v3347["nodes"];
const v3389=v3347["maximum"];
const v3391=({["value"]:v3386,["tape"]:({["nodes"]:v3388,["maximum"]:v3389,["failed"]:v3387})});
v3384=v3391["value"];
v3385=v3391["tape"];
}else{
const v3393=v3347["nodes"];
const v3394=({["op"]:v3346,["a"]:v3363,["b"]:v3364,["av"]:v3365,["bv"]:v3366,["value"]:v3362});
const v3395=__tempEdit(v3393,"push",v3394);
const v3396=v3347["maximum"];
const v3397=v3347["failed"];
const v3399=({["value"]:({["value"]:v3362,["id"]:v3382}),["tape"]:({["nodes"]:v3395,["maximum"]:v3396,["failed"]:v3397})});
v3384=v3399["value"];
v3385=v3399["tape"];
}
v3378=v3384;
v3379=v3385;
}
const v3401=v3379;
const v3403=v3085["w5"];
const v3406=v3085["w5"];
const v3408=3;
const v3409=1;
let v3410;if((v3408===v3409)){
const v3411=__nfValue(v3403["value"]);
const v3412=__nfValue(v3406["value"]);
v3410=Math.fround(__nfNumber(v3411) + __nfNumber(v3412));}else{
const v3413=2;
let v3414;if((v3408===v3413)){
const v3415=__nfValue(v3403["value"]);
const v3416=__nfValue(v3406["value"]);
v3414=Math.fround(__nfNumber(v3415) - __nfNumber(v3416));}else{
const v3417=3;
let v3418;if((v3408===v3417)){
const v3419=__nfValue(v3403["value"]);
const v3420=__nfValue(v3406["value"]);
v3418=Math.fround(__nfNumber(v3419) * __nfNumber(v3420));}else{
v3418=Math.fround((__nfNumber(__nfValue(v3403["value"])))/(__nfNumber(__nfValue(v3406["value"]))));}
v3414=v3418;}
v3410=v3414;}
const v3421=v3410;
const v3422=v3403["id"];
const v3423=v3406["id"];
const v3424=__nfValue(v3403["value"]);
const v3425=__nfValue(v3406["value"]);
const v3427=v3403["id"];
const v3428=4294967295;
const v3429=!(v3427===v3428);
let v3430=v3429;if(!v3430){
const v3431=v3406["id"];
const v3432=4294967295;
v3430=!(v3431===v3432);}
const v3433=v3430;
const v3434=false;
const v3435=(v3433===v3434);
let v3436=v3435;if(!v3436){
v3436=v3401["failed"];}
let v3437;
let v3438;
if(v3436){
const v3439=__fn6(v3421);
v3437=v3439;
v3438=v3401;
}else{
const v3440=v3401["nodes"];
const v3441=(v3440).length;
const v3442=v3401["maximum"];
let v3443;
let v3444;
if(((v3441) >= (v3442))){
const v3445=__fn6(v3421);
const v3446=true;
const v3447=v3401["nodes"];
const v3448=v3401["maximum"];
const v3450=({["value"]:v3445,["tape"]:({["nodes"]:v3447,["maximum"]:v3448,["failed"]:v3446})});
v3443=v3450["value"];
v3444=v3450["tape"];
}else{
const v3452=v3401["nodes"];
const v3453=({["op"]:v3408,["a"]:v3422,["b"]:v3423,["av"]:v3424,["bv"]:v3425,["value"]:v3421});
const v3454=__tempEdit(v3452,"push",v3453);
const v3455=v3401["maximum"];
const v3456=v3401["failed"];
const v3458=({["value"]:({["value"]:v3421,["id"]:v3441}),["tape"]:({["nodes"]:v3454,["maximum"]:v3455,["failed"]:v3456})});
v3443=v3458["value"];
v3444=v3458["tape"];
}
v3437=v3443;
v3438=v3444;
}
const v3460=1;
const v3461=v3438;
const v3462=v3378;
const v3463=v3437;
const v3464=1;
let v3465;if((v3460===v3464)){
const v3466=__nfValue(v3462["value"]);
const v3467=__nfValue(v3463["value"]);
v3465=Math.fround(__nfNumber(v3466) + __nfNumber(v3467));}else{
const v3468=2;
let v3469;if((v3460===v3468)){
const v3470=__nfValue(v3462["value"]);
const v3471=__nfValue(v3463["value"]);
v3469=Math.fround(__nfNumber(v3470) - __nfNumber(v3471));}else{
const v3472=3;
let v3473;if((v3460===v3472)){
const v3474=__nfValue(v3462["value"]);
const v3475=__nfValue(v3463["value"]);
v3473=Math.fround(__nfNumber(v3474) * __nfNumber(v3475));}else{
v3473=Math.fround((__nfNumber(__nfValue(v3462["value"])))/(__nfNumber(__nfValue(v3463["value"]))));}
v3469=v3473;}
v3465=v3469;}
const v3476=v3465;
const v3477=v3462["id"];
const v3478=v3463["id"];
const v3479=__nfValue(v3462["value"]);
const v3480=__nfValue(v3463["value"]);
const v3482=v3462["id"];
const v3483=4294967295;
const v3484=!(v3482===v3483);
let v3485=v3484;if(!v3485){
const v3486=v3463["id"];
const v3487=4294967295;
v3485=!(v3486===v3487);}
const v3488=v3485;
const v3489=false;
const v3490=(v3488===v3489);
let v3491=v3490;if(!v3491){
v3491=v3461["failed"];}
let v3492;
let v3493;
if(v3491){
const v3494=__fn6(v3476);
v3492=v3494;
v3493=v3461;
}else{
const v3495=v3461["nodes"];
const v3496=(v3495).length;
const v3497=v3461["maximum"];
let v3498;
let v3499;
if(((v3496) >= (v3497))){
const v3500=__fn6(v3476);
const v3501=true;
const v3502=v3461["nodes"];
const v3503=v3461["maximum"];
const v3505=({["value"]:v3500,["tape"]:({["nodes"]:v3502,["maximum"]:v3503,["failed"]:v3501})});
v3498=v3505["value"];
v3499=v3505["tape"];
}else{
const v3507=v3461["nodes"];
const v3508=({["op"]:v3460,["a"]:v3477,["b"]:v3478,["av"]:v3479,["bv"]:v3480,["value"]:v3476});
const v3509=__tempEdit(v3507,"push",v3508);
const v3510=v3461["maximum"];
const v3511=v3461["failed"];
const v3513=({["value"]:({["value"]:v3476,["id"]:v3496}),["tape"]:({["nodes"]:v3509,["maximum"]:v3510,["failed"]:v3511})});
v3498=v3513["value"];
v3499=v3513["tape"];
}
v3492=v3498;
v3493=v3499;
}
const v3515=v3493;
const v3517=v3085["w6"];
const v3520=v3085["w6"];
const v3522=3;
const v3523=1;
let v3524;if((v3522===v3523)){
const v3525=__nfValue(v3517["value"]);
const v3526=__nfValue(v3520["value"]);
v3524=Math.fround(__nfNumber(v3525) + __nfNumber(v3526));}else{
const v3527=2;
let v3528;if((v3522===v3527)){
const v3529=__nfValue(v3517["value"]);
const v3530=__nfValue(v3520["value"]);
v3528=Math.fround(__nfNumber(v3529) - __nfNumber(v3530));}else{
const v3531=3;
let v3532;if((v3522===v3531)){
const v3533=__nfValue(v3517["value"]);
const v3534=__nfValue(v3520["value"]);
v3532=Math.fround(__nfNumber(v3533) * __nfNumber(v3534));}else{
v3532=Math.fround((__nfNumber(__nfValue(v3517["value"])))/(__nfNumber(__nfValue(v3520["value"]))));}
v3528=v3532;}
v3524=v3528;}
const v3535=v3524;
const v3536=v3517["id"];
const v3537=v3520["id"];
const v3538=__nfValue(v3517["value"]);
const v3539=__nfValue(v3520["value"]);
const v3541=v3517["id"];
const v3542=4294967295;
const v3543=!(v3541===v3542);
let v3544=v3543;if(!v3544){
const v3545=v3520["id"];
const v3546=4294967295;
v3544=!(v3545===v3546);}
const v3547=v3544;
const v3548=false;
const v3549=(v3547===v3548);
let v3550=v3549;if(!v3550){
v3550=v3515["failed"];}
let v3551;
let v3552;
if(v3550){
const v3553=__fn6(v3535);
v3551=v3553;
v3552=v3515;
}else{
const v3554=v3515["nodes"];
const v3555=(v3554).length;
const v3556=v3515["maximum"];
let v3557;
let v3558;
if(((v3555) >= (v3556))){
const v3559=__fn6(v3535);
const v3560=true;
const v3561=v3515["nodes"];
const v3562=v3515["maximum"];
const v3564=({["value"]:v3559,["tape"]:({["nodes"]:v3561,["maximum"]:v3562,["failed"]:v3560})});
v3557=v3564["value"];
v3558=v3564["tape"];
}else{
const v3566=v3515["nodes"];
const v3567=({["op"]:v3522,["a"]:v3536,["b"]:v3537,["av"]:v3538,["bv"]:v3539,["value"]:v3535});
const v3568=__tempEdit(v3566,"push",v3567);
const v3569=v3515["maximum"];
const v3570=v3515["failed"];
const v3572=({["value"]:({["value"]:v3535,["id"]:v3555}),["tape"]:({["nodes"]:v3568,["maximum"]:v3569,["failed"]:v3570})});
v3557=v3572["value"];
v3558=v3572["tape"];
}
v3551=v3557;
v3552=v3558;
}
const v3574=1;
const v3575=v3552;
const v3576=v3492;
const v3577=v3551;
const v3578=1;
let v3579;if((v3574===v3578)){
const v3580=__nfValue(v3576["value"]);
const v3581=__nfValue(v3577["value"]);
v3579=Math.fround(__nfNumber(v3580) + __nfNumber(v3581));}else{
const v3582=2;
let v3583;if((v3574===v3582)){
const v3584=__nfValue(v3576["value"]);
const v3585=__nfValue(v3577["value"]);
v3583=Math.fround(__nfNumber(v3584) - __nfNumber(v3585));}else{
const v3586=3;
let v3587;if((v3574===v3586)){
const v3588=__nfValue(v3576["value"]);
const v3589=__nfValue(v3577["value"]);
v3587=Math.fround(__nfNumber(v3588) * __nfNumber(v3589));}else{
v3587=Math.fround((__nfNumber(__nfValue(v3576["value"])))/(__nfNumber(__nfValue(v3577["value"]))));}
v3583=v3587;}
v3579=v3583;}
const v3590=v3579;
const v3591=v3576["id"];
const v3592=v3577["id"];
const v3593=__nfValue(v3576["value"]);
const v3594=__nfValue(v3577["value"]);
const v3596=v3576["id"];
const v3597=4294967295;
const v3598=!(v3596===v3597);
let v3599=v3598;if(!v3599){
const v3600=v3577["id"];
const v3601=4294967295;
v3599=!(v3600===v3601);}
const v3602=v3599;
const v3603=false;
const v3604=(v3602===v3603);
let v3605=v3604;if(!v3605){
v3605=v3575["failed"];}
let v3606;
let v3607;
if(v3605){
const v3608=__fn6(v3590);
v3606=v3608;
v3607=v3575;
}else{
const v3609=v3575["nodes"];
const v3610=(v3609).length;
const v3611=v3575["maximum"];
let v3612;
let v3613;
if(((v3610) >= (v3611))){
const v3614=__fn6(v3590);
const v3615=true;
const v3616=v3575["nodes"];
const v3617=v3575["maximum"];
const v3619=({["value"]:v3614,["tape"]:({["nodes"]:v3616,["maximum"]:v3617,["failed"]:v3615})});
v3612=v3619["value"];
v3613=v3619["tape"];
}else{
const v3621=v3575["nodes"];
const v3622=({["op"]:v3574,["a"]:v3591,["b"]:v3592,["av"]:v3593,["bv"]:v3594,["value"]:v3590});
const v3623=__tempEdit(v3621,"push",v3622);
const v3624=v3575["maximum"];
const v3625=v3575["failed"];
const v3627=({["value"]:({["value"]:v3590,["id"]:v3610}),["tape"]:({["nodes"]:v3623,["maximum"]:v3624,["failed"]:v3625})});
v3612=v3627["value"];
v3613=v3627["tape"];
}
v3606=v3612;
v3607=v3613;
}
const v3629=v3607;
const v3631=v3085["w7"];
const v3634=v3085["w7"];
const v3636=3;
const v3637=1;
let v3638;if((v3636===v3637)){
const v3639=__nfValue(v3631["value"]);
const v3640=__nfValue(v3634["value"]);
v3638=Math.fround(__nfNumber(v3639) + __nfNumber(v3640));}else{
const v3641=2;
let v3642;if((v3636===v3641)){
const v3643=__nfValue(v3631["value"]);
const v3644=__nfValue(v3634["value"]);
v3642=Math.fround(__nfNumber(v3643) - __nfNumber(v3644));}else{
const v3645=3;
let v3646;if((v3636===v3645)){
const v3647=__nfValue(v3631["value"]);
const v3648=__nfValue(v3634["value"]);
v3646=Math.fround(__nfNumber(v3647) * __nfNumber(v3648));}else{
v3646=Math.fround((__nfNumber(__nfValue(v3631["value"])))/(__nfNumber(__nfValue(v3634["value"]))));}
v3642=v3646;}
v3638=v3642;}
const v3649=v3638;
const v3650=v3631["id"];
const v3651=v3634["id"];
const v3652=__nfValue(v3631["value"]);
const v3653=__nfValue(v3634["value"]);
const v3655=v3631["id"];
const v3656=4294967295;
const v3657=!(v3655===v3656);
let v3658=v3657;if(!v3658){
const v3659=v3634["id"];
const v3660=4294967295;
v3658=!(v3659===v3660);}
const v3661=v3658;
const v3662=false;
const v3663=(v3661===v3662);
let v3664=v3663;if(!v3664){
v3664=v3629["failed"];}
let v3665;
let v3666;
if(v3664){
const v3667=__fn6(v3649);
v3665=v3667;
v3666=v3629;
}else{
const v3668=v3629["nodes"];
const v3669=(v3668).length;
const v3670=v3629["maximum"];
let v3671;
let v3672;
if(((v3669) >= (v3670))){
const v3673=__fn6(v3649);
const v3674=true;
const v3675=v3629["nodes"];
const v3676=v3629["maximum"];
const v3678=({["value"]:v3673,["tape"]:({["nodes"]:v3675,["maximum"]:v3676,["failed"]:v3674})});
v3671=v3678["value"];
v3672=v3678["tape"];
}else{
const v3680=v3629["nodes"];
const v3681=({["op"]:v3636,["a"]:v3650,["b"]:v3651,["av"]:v3652,["bv"]:v3653,["value"]:v3649});
const v3682=__tempEdit(v3680,"push",v3681);
const v3683=v3629["maximum"];
const v3684=v3629["failed"];
const v3686=({["value"]:({["value"]:v3649,["id"]:v3669}),["tape"]:({["nodes"]:v3682,["maximum"]:v3683,["failed"]:v3684})});
v3671=v3686["value"];
v3672=v3686["tape"];
}
v3665=v3671;
v3666=v3672;
}
const v3688=1;
const v3689=v3666;
const v3690=v3606;
const v3691=v3665;
const v3692=1;
let v3693;if((v3688===v3692)){
const v3694=__nfValue(v3690["value"]);
const v3695=__nfValue(v3691["value"]);
v3693=Math.fround(__nfNumber(v3694) + __nfNumber(v3695));}else{
const v3696=2;
let v3697;if((v3688===v3696)){
const v3698=__nfValue(v3690["value"]);
const v3699=__nfValue(v3691["value"]);
v3697=Math.fround(__nfNumber(v3698) - __nfNumber(v3699));}else{
const v3700=3;
let v3701;if((v3688===v3700)){
const v3702=__nfValue(v3690["value"]);
const v3703=__nfValue(v3691["value"]);
v3701=Math.fround(__nfNumber(v3702) * __nfNumber(v3703));}else{
v3701=Math.fround((__nfNumber(__nfValue(v3690["value"])))/(__nfNumber(__nfValue(v3691["value"]))));}
v3697=v3701;}
v3693=v3697;}
const v3704=v3693;
const v3705=v3690["id"];
const v3706=v3691["id"];
const v3707=__nfValue(v3690["value"]);
const v3708=__nfValue(v3691["value"]);
const v3710=v3690["id"];
const v3711=4294967295;
const v3712=!(v3710===v3711);
let v3713=v3712;if(!v3713){
const v3714=v3691["id"];
const v3715=4294967295;
v3713=!(v3714===v3715);}
const v3716=v3713;
const v3717=false;
const v3718=(v3716===v3717);
let v3719=v3718;if(!v3719){
v3719=v3689["failed"];}
let v3720;
let v3721;
if(v3719){
const v3722=__fn6(v3704);
v3720=v3722;
v3721=v3689;
}else{
const v3723=v3689["nodes"];
const v3724=(v3723).length;
const v3725=v3689["maximum"];
let v3726;
let v3727;
if(((v3724) >= (v3725))){
const v3728=__fn6(v3704);
const v3729=true;
const v3730=v3689["nodes"];
const v3731=v3689["maximum"];
const v3733=({["value"]:v3728,["tape"]:({["nodes"]:v3730,["maximum"]:v3731,["failed"]:v3729})});
v3726=v3733["value"];
v3727=v3733["tape"];
}else{
const v3735=v3689["nodes"];
const v3736=({["op"]:v3688,["a"]:v3705,["b"]:v3706,["av"]:v3707,["bv"]:v3708,["value"]:v3704});
const v3737=__tempEdit(v3735,"push",v3736);
const v3738=v3689["maximum"];
const v3739=v3689["failed"];
const v3741=({["value"]:({["value"]:v3704,["id"]:v3724}),["tape"]:({["nodes"]:v3737,["maximum"]:v3738,["failed"]:v3739})});
v3726=v3741["value"];
v3727=v3741["tape"];
}
v3720=v3726;
v3721=v3727;
}
const v3743=1;
const v3744=v3721;
const v3745=v3060;
const v3746=v3720;
const v3747=1;
let v3748;if((v3743===v3747)){
const v3749=__nfValue(v3745["value"]);
const v3750=__nfValue(v3746["value"]);
v3748=Math.fround(__nfNumber(v3749) + __nfNumber(v3750));}else{
const v3751=2;
let v3752;if((v3743===v3751)){
const v3753=__nfValue(v3745["value"]);
const v3754=__nfValue(v3746["value"]);
v3752=Math.fround(__nfNumber(v3753) - __nfNumber(v3754));}else{
const v3755=3;
let v3756;if((v3743===v3755)){
const v3757=__nfValue(v3745["value"]);
const v3758=__nfValue(v3746["value"]);
v3756=Math.fround(__nfNumber(v3757) * __nfNumber(v3758));}else{
v3756=Math.fround((__nfNumber(__nfValue(v3745["value"])))/(__nfNumber(__nfValue(v3746["value"]))));}
v3752=v3756;}
v3748=v3752;}
const v3759=v3748;
const v3760=v3745["id"];
const v3761=v3746["id"];
const v3762=__nfValue(v3745["value"]);
const v3763=__nfValue(v3746["value"]);
const v3765=v3745["id"];
const v3766=4294967295;
const v3767=!(v3765===v3766);
let v3768=v3767;if(!v3768){
const v3769=v3746["id"];
const v3770=4294967295;
v3768=!(v3769===v3770);}
const v3771=v3768;
const v3772=false;
const v3773=(v3771===v3772);
let v3774=v3773;if(!v3774){
v3774=v3744["failed"];}
let v3775;
let v3776;
if(v3774){
const v3777=__fn6(v3759);
v3775=v3777;
v3776=v3744;
}else{
const v3778=v3744["nodes"];
const v3779=(v3778).length;
const v3780=v3744["maximum"];
let v3781;
let v3782;
if(((v3779) >= (v3780))){
const v3783=__fn6(v3759);
const v3784=true;
const v3785=v3744["nodes"];
const v3786=v3744["maximum"];
const v3788=({["value"]:v3783,["tape"]:({["nodes"]:v3785,["maximum"]:v3786,["failed"]:v3784})});
v3781=v3788["value"];
v3782=v3788["tape"];
}else{
const v3790=v3744["nodes"];
const v3791=({["op"]:v3743,["a"]:v3760,["b"]:v3761,["av"]:v3762,["bv"]:v3763,["value"]:v3759});
const v3792=__tempEdit(v3790,"push",v3791);
const v3793=v3744["maximum"];
const v3794=v3744["failed"];
const v3796=({["value"]:({["value"]:v3759,["id"]:v3779}),["tape"]:({["nodes"]:v3792,["maximum"]:v3793,["failed"]:v3794})});
v3781=v3796["value"];
v3782=v3796["tape"];
}
v3775=v3781;
v3776=v3782;
}
const v3798=v3776;
const v3800=v1806["b3"];
const v3802=__fn15(v3800,v3798);
const v3803=1;
const v3804=v3802["tape"];
const v3805=v3775;
const v3806=v3802["value"];
const v3807=__fn9(v3803,v3804,v3805,v3806);
const v3808=v3807["tape"];
const v3810=v1806["b4"];
const v3812=__fn15(v3810,v3808);
const v3813=1;
const v3814=v3812["tape"];
const v3815=v3807["value"];
const v3816=v3812["value"];
const v3817=__fn9(v3813,v3814,v3815,v3816);
const v3818=v3817["tape"];
const v3820=v1806["b5"];
const v3822=__fn15(v3820,v3818);
const v3823=1;
const v3824=v3822["tape"];
const v3825=v3817["value"];
const v3826=v3822["value"];
const v3827=__fn9(v3823,v3824,v3825,v3826);
const v3828=v3827["tape"];
const v3830=v1806["b6"];
const v3832=__fn15(v3830,v3828);
const v3833=1;
const v3834=v3832["tape"];
const v3835=v3827["value"];
const v3836=v3832["value"];
const v3837=__fn9(v3833,v3834,v3835,v3836);
const v3838=v3837["tape"];
const v3840=v1806["b7"];
const v3842=__fn15(v3840,v3838);
const v3843=1;
const v3844=v3842["tape"];
const v3845=v3837["value"];
const v3846=v3842["value"];
const v3847=__fn9(v3843,v3844,v3845,v3846);
const v3848=v3847["tape"];
const v3850=2;
const v3851=v3847["value"];
const v3852=__fn9(v3850,v3848,v3851,v1807);
const v3853=v3852["value"];
const v3854=v3852["tape"];
const v3857=3;
return __fn9(v3857,v3854,v3853,v3853);}
function __fn17(v3858,v3859,v3860,v3861){
v3861=__nfValue(v3861);
const v3862=1000000;
let v3863;if(((v3859) > (v3862))){
v3863=({Err:"reverse differentiation capacity exceeds one million nodes"});}else{
const v3864=v3858["b0"];
const v3865=__nfValue(v3864["w0"]);
const v3866=new __InkBuffer([]);
const v3867=false;
const v3870=0;
const v3871=4294967295;
const v3872=4294967295;
const v3873=0.0;
const v3874=0.0;
const v3876=true;
const v3877=__fn7(({["nodes"]:v3866,["maximum"]:v3859,["failed"]:v3867}),({["op"]:v3870,["a"]:v3871,["b"]:v3872,["av"]:v3873,["bv"]:v3874,["value"]:v3865}),v3876);
const v3878=v3858["b0"];
const v3879=__nfValue(v3878["w1"]);
const v3880=v3877["tape"];
const v3881=__fn8(v3879,v3880);
const v3882=v3858["b0"];
const v3883=__nfValue(v3882["w2"]);
const v3884=v3881["tape"];
const v3885=__fn8(v3883,v3884);
const v3886=v3858["b0"];
const v3887=__nfValue(v3886["w3"]);
const v3888=v3885["tape"];
const v3889=__fn8(v3887,v3888);
const v3890=v3858["b0"];
const v3891=__nfValue(v3890["w4"]);
const v3892=v3889["tape"];
const v3893=__fn8(v3891,v3892);
const v3894=v3858["b0"];
const v3895=__nfValue(v3894["w5"]);
const v3896=v3893["tape"];
const v3897=__fn8(v3895,v3896);
const v3898=v3858["b0"];
const v3899=__nfValue(v3898["w6"]);
const v3900=v3897["tape"];
const v3901=__fn8(v3899,v3900);
const v3902=v3858["b0"];
const v3903=__nfValue(v3902["w7"]);
const v3904=v3901["tape"];
const v3905=__fn8(v3903,v3904);
const v3906=v3877["value"];
const v3907=v3881["value"];
const v3908=v3885["value"];
const v3909=v3889["value"];
const v3910=v3893["value"];
const v3911=v3897["value"];
const v3912=v3901["value"];
const v3913=v3905["value"];
const v3915=v3905["tape"];
const v3917=v3858["b1"];
const v3918=__nfValue(v3917["w0"]);
const v3919=__fn8(v3918,v3915);
const v3920=v3858["b1"];
const v3921=__nfValue(v3920["w1"]);
const v3922=v3919["tape"];
const v3923=__fn8(v3921,v3922);
const v3924=v3858["b1"];
const v3925=__nfValue(v3924["w2"]);
const v3926=v3923["tape"];
const v3927=__fn8(v3925,v3926);
const v3928=v3858["b1"];
const v3929=__nfValue(v3928["w3"]);
const v3930=v3927["tape"];
const v3931=__fn8(v3929,v3930);
const v3932=v3858["b1"];
const v3933=__nfValue(v3932["w4"]);
const v3934=v3931["tape"];
const v3935=__fn8(v3933,v3934);
const v3936=v3858["b1"];
const v3937=__nfValue(v3936["w5"]);
const v3938=v3935["tape"];
const v3939=__fn8(v3937,v3938);
const v3940=v3858["b1"];
const v3941=__nfValue(v3940["w6"]);
const v3942=v3939["tape"];
const v3943=__fn8(v3941,v3942);
const v3944=v3858["b1"];
const v3945=__nfValue(v3944["w7"]);
const v3946=v3943["tape"];
const v3947=__fn8(v3945,v3946);
const v3948=v3919["value"];
const v3949=v3923["value"];
const v3950=v3927["value"];
const v3951=v3931["value"];
const v3952=v3935["value"];
const v3953=v3939["value"];
const v3954=v3943["value"];
const v3955=v3947["value"];
const v3957=v3947["tape"];
const v3959=v3858["b2"];
const v3960=__nfValue(v3959["w0"]);
const v3961=__fn8(v3960,v3957);
const v3962=v3858["b2"];
const v3963=__nfValue(v3962["w1"]);
const v3964=v3961["tape"];
const v3965=__fn8(v3963,v3964);
const v3966=v3858["b2"];
const v3967=__nfValue(v3966["w2"]);
const v3968=v3965["tape"];
const v3969=__fn8(v3967,v3968);
const v3970=v3858["b2"];
const v3971=__nfValue(v3970["w3"]);
const v3972=v3969["tape"];
const v3973=__fn8(v3971,v3972);
const v3974=v3858["b2"];
const v3975=__nfValue(v3974["w4"]);
const v3976=v3973["tape"];
const v3977=__fn8(v3975,v3976);
const v3978=v3858["b2"];
const v3979=__nfValue(v3978["w5"]);
const v3980=v3977["tape"];
const v3981=__fn8(v3979,v3980);
const v3982=v3858["b2"];
const v3983=__nfValue(v3982["w6"]);
const v3984=v3981["tape"];
const v3985=__fn8(v3983,v3984);
const v3986=v3858["b2"];
const v3987=__nfValue(v3986["w7"]);
const v3988=v3985["tape"];
const v3989=__fn8(v3987,v3988);
const v3990=v3961["value"];
const v3991=v3965["value"];
const v3992=v3969["value"];
const v3993=v3973["value"];
const v3994=v3977["value"];
const v3995=v3981["value"];
const v3996=v3985["value"];
const v3997=v3989["value"];
const v3999=v3989["tape"];
const v4001=v3858["b3"];
const v4002=__nfValue(v4001["w0"]);
const v4003=__fn8(v4002,v3999);
const v4004=v3858["b3"];
const v4005=__nfValue(v4004["w1"]);
const v4006=v4003["tape"];
const v4007=__fn8(v4005,v4006);
const v4008=v3858["b3"];
const v4009=__nfValue(v4008["w2"]);
const v4010=v4007["tape"];
const v4011=__fn8(v4009,v4010);
const v4012=v3858["b3"];
const v4013=__nfValue(v4012["w3"]);
const v4014=v4011["tape"];
const v4015=__fn8(v4013,v4014);
const v4016=v3858["b3"];
const v4017=__nfValue(v4016["w4"]);
const v4018=v4015["tape"];
const v4019=__fn8(v4017,v4018);
const v4020=v3858["b3"];
const v4021=__nfValue(v4020["w5"]);
const v4022=v4019["tape"];
const v4023=__fn8(v4021,v4022);
const v4024=v3858["b3"];
const v4025=__nfValue(v4024["w6"]);
const v4026=v4023["tape"];
const v4027=__fn8(v4025,v4026);
const v4028=v3858["b3"];
const v4029=__nfValue(v4028["w7"]);
const v4030=v4027["tape"];
const v4031=__fn8(v4029,v4030);
const v4032=v4003["value"];
const v4033=v4007["value"];
const v4034=v4011["value"];
const v4035=v4015["value"];
const v4036=v4019["value"];
const v4037=v4023["value"];
const v4038=v4027["value"];
const v4039=v4031["value"];
const v4041=v4031["tape"];
const v4043=v3858["b4"];
const v4044=__nfValue(v4043["w0"]);
const v4045=__fn8(v4044,v4041);
const v4046=v3858["b4"];
const v4047=__nfValue(v4046["w1"]);
const v4048=v4045["tape"];
const v4049=__fn8(v4047,v4048);
const v4050=v3858["b4"];
const v4051=__nfValue(v4050["w2"]);
const v4052=v4049["tape"];
const v4053=__fn8(v4051,v4052);
const v4054=v3858["b4"];
const v4055=__nfValue(v4054["w3"]);
const v4056=v4053["tape"];
const v4057=__fn8(v4055,v4056);
const v4058=v3858["b4"];
const v4059=__nfValue(v4058["w4"]);
const v4060=v4057["tape"];
const v4061=__fn8(v4059,v4060);
const v4062=v3858["b4"];
const v4063=__nfValue(v4062["w5"]);
const v4064=v4061["tape"];
const v4065=__fn8(v4063,v4064);
const v4066=v3858["b4"];
const v4067=__nfValue(v4066["w6"]);
const v4068=v4065["tape"];
const v4069=__fn8(v4067,v4068);
const v4070=v3858["b4"];
const v4071=__nfValue(v4070["w7"]);
const v4072=v4069["tape"];
const v4073=__fn8(v4071,v4072);
const v4074=v4045["value"];
const v4075=v4049["value"];
const v4076=v4053["value"];
const v4077=v4057["value"];
const v4078=v4061["value"];
const v4079=v4065["value"];
const v4080=v4069["value"];
const v4081=v4073["value"];
const v4083=v4073["tape"];
const v4085=v3858["b5"];
const v4086=__nfValue(v4085["w0"]);
const v4087=__fn8(v4086,v4083);
const v4088=v3858["b5"];
const v4089=__nfValue(v4088["w1"]);
const v4090=v4087["tape"];
const v4091=__fn8(v4089,v4090);
const v4092=v3858["b5"];
const v4093=__nfValue(v4092["w2"]);
const v4094=v4091["tape"];
const v4095=__fn8(v4093,v4094);
const v4096=v3858["b5"];
const v4097=__nfValue(v4096["w3"]);
const v4098=v4095["tape"];
const v4099=__fn8(v4097,v4098);
const v4100=v3858["b5"];
const v4101=__nfValue(v4100["w4"]);
const v4102=v4099["tape"];
const v4103=__fn8(v4101,v4102);
const v4104=v3858["b5"];
const v4105=__nfValue(v4104["w5"]);
const v4106=v4103["tape"];
const v4107=__fn8(v4105,v4106);
const v4108=v3858["b5"];
const v4109=__nfValue(v4108["w6"]);
const v4110=v4107["tape"];
const v4111=__fn8(v4109,v4110);
const v4112=v3858["b5"];
const v4113=__nfValue(v4112["w7"]);
const v4114=v4111["tape"];
const v4115=__fn8(v4113,v4114);
const v4116=v4087["value"];
const v4117=v4091["value"];
const v4118=v4095["value"];
const v4119=v4099["value"];
const v4120=v4103["value"];
const v4121=v4107["value"];
const v4122=v4111["value"];
const v4123=v4115["value"];
const v4125=v4115["tape"];
const v4127=v3858["b6"];
const v4128=__nfValue(v4127["w0"]);
const v4129=__fn8(v4128,v4125);
const v4130=v3858["b6"];
const v4131=__nfValue(v4130["w1"]);
const v4132=v4129["tape"];
const v4133=__fn8(v4131,v4132);
const v4134=v3858["b6"];
const v4135=__nfValue(v4134["w2"]);
const v4136=v4133["tape"];
const v4137=__fn8(v4135,v4136);
const v4138=v3858["b6"];
const v4139=__nfValue(v4138["w3"]);
const v4140=v4137["tape"];
const v4141=__fn8(v4139,v4140);
const v4142=v3858["b6"];
const v4143=__nfValue(v4142["w4"]);
const v4144=v4141["tape"];
const v4145=__fn8(v4143,v4144);
const v4146=v3858["b6"];
const v4147=__nfValue(v4146["w5"]);
const v4148=v4145["tape"];
const v4149=__fn8(v4147,v4148);
const v4150=v3858["b6"];
const v4151=__nfValue(v4150["w6"]);
const v4152=v4149["tape"];
const v4153=__fn8(v4151,v4152);
const v4154=v3858["b6"];
const v4155=__nfValue(v4154["w7"]);
const v4156=v4153["tape"];
const v4157=__fn8(v4155,v4156);
const v4158=v4129["value"];
const v4159=v4133["value"];
const v4160=v4137["value"];
const v4161=v4141["value"];
const v4162=v4145["value"];
const v4163=v4149["value"];
const v4164=v4153["value"];
const v4165=v4157["value"];
const v4167=v4157["tape"];
const v4169=v3858["b7"];
const v4170=__nfValue(v4169["w0"]);
const v4171=__fn8(v4170,v4167);
const v4172=v3858["b7"];
const v4173=__nfValue(v4172["w1"]);
const v4174=v4171["tape"];
const v4175=__fn8(v4173,v4174);
const v4176=v3858["b7"];
const v4177=__nfValue(v4176["w2"]);
const v4178=v4175["tape"];
const v4179=__fn8(v4177,v4178);
const v4180=v3858["b7"];
const v4181=__nfValue(v4180["w3"]);
const v4182=v4179["tape"];
const v4183=__fn8(v4181,v4182);
const v4184=v3858["b7"];
const v4185=__nfValue(v4184["w4"]);
const v4186=v4183["tape"];
const v4187=__fn8(v4185,v4186);
const v4188=v3858["b7"];
const v4189=__nfValue(v4188["w5"]);
const v4190=v4187["tape"];
const v4191=__fn8(v4189,v4190);
const v4192=v3858["b7"];
const v4193=__nfValue(v4192["w6"]);
const v4194=v4191["tape"];
const v4195=__fn8(v4193,v4194);
const v4196=v3858["b7"];
const v4197=__nfValue(v4196["w7"]);
const v4198=v4195["tape"];
const v4199=__fn8(v4197,v4198);
const v4200=v4171["value"];
const v4201=v4175["value"];
const v4202=v4179["value"];
const v4203=v4183["value"];
const v4204=v4187["value"];
const v4205=v4191["value"];
const v4206=v4195["value"];
const v4207=v4199["value"];
const v4209=v4199["tape"];
const v4222=__fn6(v3861);
const v4223=__fn16(({["b0"]:({["w0"]:v3906,["w1"]:v3907,["w2"]:v3908,["w3"]:v3909,["w4"]:v3910,["w5"]:v3911,["w6"]:v3912,["w7"]:v3913}),["b1"]:({["w0"]:v3948,["w1"]:v3949,["w2"]:v3950,["w3"]:v3951,["w4"]:v3952,["w5"]:v3953,["w6"]:v3954,["w7"]:v3955}),["b2"]:({["w0"]:v3990,["w1"]:v3991,["w2"]:v3992,["w3"]:v3993,["w4"]:v3994,["w5"]:v3995,["w6"]:v3996,["w7"]:v3997}),["b3"]:({["w0"]:v4032,["w1"]:v4033,["w2"]:v4034,["w3"]:v4035,["w4"]:v4036,["w5"]:v4037,["w6"]:v4038,["w7"]:v4039}),["b4"]:({["w0"]:v4074,["w1"]:v4075,["w2"]:v4076,["w3"]:v4077,["w4"]:v4078,["w5"]:v4079,["w6"]:v4080,["w7"]:v4081}),["b5"]:({["w0"]:v4116,["w1"]:v4117,["w2"]:v4118,["w3"]:v4119,["w4"]:v4120,["w5"]:v4121,["w6"]:v4122,["w7"]:v4123}),["b6"]:({["w0"]:v4158,["w1"]:v4159,["w2"]:v4160,["w3"]:v4161,["w4"]:v4162,["w5"]:v4163,["w6"]:v4164,["w7"]:v4165}),["b7"]:({["w0"]:v4200,["w1"]:v4201,["w2"]:v4202,["w3"]:v4203,["w4"]:v4204,["w5"]:v4205,["w6"]:v4206,["w7"]:v4207})}),v4222,v4209);
const v4224=v4223["tape"];
let v4225;if(v4224["failed"]){
v4225=({Err:"reverse differentiation tape capacity exceeded"});}else{
const v4226=v4223["tape"];
const v4227=v4226["nodes"];
const v4228=v4227.freeze();
const v4229=v4223["value"];
const v4230=__fn14(v4228,v4229,v3860);
const v4231=v3906["id"];
let v4232;if(v4231<v4230.length){v4232=v4230[v4231];}else{
v4232=0.0;}
const v4233=__nfValue(v4232);
const v4234=v3907["id"];
let v4235;if(v4234<v4230.length){v4235=v4230[v4234];}else{
v4235=0.0;}
const v4236=__nfValue(v4235);
const v4237=v3908["id"];
let v4238;if(v4237<v4230.length){v4238=v4230[v4237];}else{
v4238=0.0;}
const v4239=__nfValue(v4238);
const v4240=v3909["id"];
let v4241;if(v4240<v4230.length){v4241=v4230[v4240];}else{
v4241=0.0;}
const v4242=__nfValue(v4241);
const v4243=v3910["id"];
let v4244;if(v4243<v4230.length){v4244=v4230[v4243];}else{
v4244=0.0;}
const v4245=__nfValue(v4244);
const v4246=v3911["id"];
let v4247;if(v4246<v4230.length){v4247=v4230[v4246];}else{
v4247=0.0;}
const v4248=__nfValue(v4247);
const v4249=v3912["id"];
let v4250;if(v4249<v4230.length){v4250=v4230[v4249];}else{
v4250=0.0;}
const v4251=__nfValue(v4250);
const v4252=v3913["id"];
let v4253;if(v4252<v4230.length){v4253=v4230[v4252];}else{
v4253=0.0;}
const v4254=__nfValue(v4253);
const v4256=v3948["id"];
let v4257;if(v4256<v4230.length){v4257=v4230[v4256];}else{
v4257=0.0;}
const v4258=__nfValue(v4257);
const v4259=v3949["id"];
let v4260;if(v4259<v4230.length){v4260=v4230[v4259];}else{
v4260=0.0;}
const v4261=__nfValue(v4260);
const v4262=v3950["id"];
let v4263;if(v4262<v4230.length){v4263=v4230[v4262];}else{
v4263=0.0;}
const v4264=__nfValue(v4263);
const v4265=v3951["id"];
let v4266;if(v4265<v4230.length){v4266=v4230[v4265];}else{
v4266=0.0;}
const v4267=__nfValue(v4266);
const v4268=v3952["id"];
let v4269;if(v4268<v4230.length){v4269=v4230[v4268];}else{
v4269=0.0;}
const v4270=__nfValue(v4269);
const v4271=v3953["id"];
let v4272;if(v4271<v4230.length){v4272=v4230[v4271];}else{
v4272=0.0;}
const v4273=__nfValue(v4272);
const v4274=v3954["id"];
let v4275;if(v4274<v4230.length){v4275=v4230[v4274];}else{
v4275=0.0;}
const v4276=__nfValue(v4275);
const v4277=v3955["id"];
let v4278;if(v4277<v4230.length){v4278=v4230[v4277];}else{
v4278=0.0;}
const v4279=__nfValue(v4278);
const v4281=v3990["id"];
let v4282;if(v4281<v4230.length){v4282=v4230[v4281];}else{
v4282=0.0;}
const v4283=__nfValue(v4282);
const v4284=v3991["id"];
let v4285;if(v4284<v4230.length){v4285=v4230[v4284];}else{
v4285=0.0;}
const v4286=__nfValue(v4285);
const v4287=v3992["id"];
let v4288;if(v4287<v4230.length){v4288=v4230[v4287];}else{
v4288=0.0;}
const v4289=__nfValue(v4288);
const v4290=v3993["id"];
let v4291;if(v4290<v4230.length){v4291=v4230[v4290];}else{
v4291=0.0;}
const v4292=__nfValue(v4291);
const v4293=v3994["id"];
let v4294;if(v4293<v4230.length){v4294=v4230[v4293];}else{
v4294=0.0;}
const v4295=__nfValue(v4294);
const v4296=v3995["id"];
let v4297;if(v4296<v4230.length){v4297=v4230[v4296];}else{
v4297=0.0;}
const v4298=__nfValue(v4297);
const v4299=v3996["id"];
let v4300;if(v4299<v4230.length){v4300=v4230[v4299];}else{
v4300=0.0;}
const v4301=__nfValue(v4300);
const v4302=v3997["id"];
let v4303;if(v4302<v4230.length){v4303=v4230[v4302];}else{
v4303=0.0;}
const v4304=__nfValue(v4303);
const v4306=v4032["id"];
let v4307;if(v4306<v4230.length){v4307=v4230[v4306];}else{
v4307=0.0;}
const v4308=__nfValue(v4307);
const v4309=v4033["id"];
let v4310;if(v4309<v4230.length){v4310=v4230[v4309];}else{
v4310=0.0;}
const v4311=__nfValue(v4310);
const v4312=v4034["id"];
let v4313;if(v4312<v4230.length){v4313=v4230[v4312];}else{
v4313=0.0;}
const v4314=__nfValue(v4313);
const v4315=v4035["id"];
let v4316;if(v4315<v4230.length){v4316=v4230[v4315];}else{
v4316=0.0;}
const v4317=__nfValue(v4316);
const v4318=v4036["id"];
let v4319;if(v4318<v4230.length){v4319=v4230[v4318];}else{
v4319=0.0;}
const v4320=__nfValue(v4319);
const v4321=v4037["id"];
let v4322;if(v4321<v4230.length){v4322=v4230[v4321];}else{
v4322=0.0;}
const v4323=__nfValue(v4322);
const v4324=v4038["id"];
let v4325;if(v4324<v4230.length){v4325=v4230[v4324];}else{
v4325=0.0;}
const v4326=__nfValue(v4325);
const v4327=v4039["id"];
let v4328;if(v4327<v4230.length){v4328=v4230[v4327];}else{
v4328=0.0;}
const v4329=__nfValue(v4328);
const v4331=v4074["id"];
let v4332;if(v4331<v4230.length){v4332=v4230[v4331];}else{
v4332=0.0;}
const v4333=__nfValue(v4332);
const v4334=v4075["id"];
let v4335;if(v4334<v4230.length){v4335=v4230[v4334];}else{
v4335=0.0;}
const v4336=__nfValue(v4335);
const v4337=v4076["id"];
let v4338;if(v4337<v4230.length){v4338=v4230[v4337];}else{
v4338=0.0;}
const v4339=__nfValue(v4338);
const v4340=v4077["id"];
let v4341;if(v4340<v4230.length){v4341=v4230[v4340];}else{
v4341=0.0;}
const v4342=__nfValue(v4341);
const v4343=v4078["id"];
let v4344;if(v4343<v4230.length){v4344=v4230[v4343];}else{
v4344=0.0;}
const v4345=__nfValue(v4344);
const v4346=v4079["id"];
let v4347;if(v4346<v4230.length){v4347=v4230[v4346];}else{
v4347=0.0;}
const v4348=__nfValue(v4347);
const v4349=v4080["id"];
let v4350;if(v4349<v4230.length){v4350=v4230[v4349];}else{
v4350=0.0;}
const v4351=__nfValue(v4350);
const v4352=v4081["id"];
let v4353;if(v4352<v4230.length){v4353=v4230[v4352];}else{
v4353=0.0;}
const v4354=__nfValue(v4353);
const v4356=v4116["id"];
let v4357;if(v4356<v4230.length){v4357=v4230[v4356];}else{
v4357=0.0;}
const v4358=__nfValue(v4357);
const v4359=v4117["id"];
let v4360;if(v4359<v4230.length){v4360=v4230[v4359];}else{
v4360=0.0;}
const v4361=__nfValue(v4360);
const v4362=v4118["id"];
let v4363;if(v4362<v4230.length){v4363=v4230[v4362];}else{
v4363=0.0;}
const v4364=__nfValue(v4363);
const v4365=v4119["id"];
let v4366;if(v4365<v4230.length){v4366=v4230[v4365];}else{
v4366=0.0;}
const v4367=__nfValue(v4366);
const v4368=v4120["id"];
let v4369;if(v4368<v4230.length){v4369=v4230[v4368];}else{
v4369=0.0;}
const v4370=__nfValue(v4369);
const v4371=v4121["id"];
let v4372;if(v4371<v4230.length){v4372=v4230[v4371];}else{
v4372=0.0;}
const v4373=__nfValue(v4372);
const v4374=v4122["id"];
let v4375;if(v4374<v4230.length){v4375=v4230[v4374];}else{
v4375=0.0;}
const v4376=__nfValue(v4375);
const v4377=v4123["id"];
let v4378;if(v4377<v4230.length){v4378=v4230[v4377];}else{
v4378=0.0;}
const v4379=__nfValue(v4378);
const v4381=v4158["id"];
let v4382;if(v4381<v4230.length){v4382=v4230[v4381];}else{
v4382=0.0;}
const v4383=__nfValue(v4382);
const v4384=v4159["id"];
let v4385;if(v4384<v4230.length){v4385=v4230[v4384];}else{
v4385=0.0;}
const v4386=__nfValue(v4385);
const v4387=v4160["id"];
let v4388;if(v4387<v4230.length){v4388=v4230[v4387];}else{
v4388=0.0;}
const v4389=__nfValue(v4388);
const v4390=v4161["id"];
let v4391;if(v4390<v4230.length){v4391=v4230[v4390];}else{
v4391=0.0;}
const v4392=__nfValue(v4391);
const v4393=v4162["id"];
let v4394;if(v4393<v4230.length){v4394=v4230[v4393];}else{
v4394=0.0;}
const v4395=__nfValue(v4394);
const v4396=v4163["id"];
let v4397;if(v4396<v4230.length){v4397=v4230[v4396];}else{
v4397=0.0;}
const v4398=__nfValue(v4397);
const v4399=v4164["id"];
let v4400;if(v4399<v4230.length){v4400=v4230[v4399];}else{
v4400=0.0;}
const v4401=__nfValue(v4400);
const v4402=v4165["id"];
let v4403;if(v4402<v4230.length){v4403=v4230[v4402];}else{
v4403=0.0;}
const v4404=__nfValue(v4403);
const v4406=v4200["id"];
let v4407;if(v4406<v4230.length){v4407=v4230[v4406];}else{
v4407=0.0;}
const v4408=__nfValue(v4407);
const v4409=v4201["id"];
let v4410;if(v4409<v4230.length){v4410=v4230[v4409];}else{
v4410=0.0;}
const v4411=__nfValue(v4410);
const v4412=v4202["id"];
let v4413;if(v4412<v4230.length){v4413=v4230[v4412];}else{
v4413=0.0;}
const v4414=__nfValue(v4413);
const v4415=v4203["id"];
let v4416;if(v4415<v4230.length){v4416=v4230[v4415];}else{
v4416=0.0;}
const v4417=__nfValue(v4416);
const v4418=v4204["id"];
let v4419;if(v4418<v4230.length){v4419=v4230[v4418];}else{
v4419=0.0;}
const v4420=__nfValue(v4419);
const v4421=v4205["id"];
let v4422;if(v4421<v4230.length){v4422=v4230[v4421];}else{
v4422=0.0;}
const v4423=__nfValue(v4422);
const v4424=v4206["id"];
let v4425;if(v4424<v4230.length){v4425=v4230[v4424];}else{
v4425=0.0;}
const v4426=__nfValue(v4425);
const v4427=v4207["id"];
let v4428;if(v4427<v4230.length){v4428=v4230[v4427];}else{
v4428=0.0;}
const v4429=__nfValue(v4428);
v4225=({Ok:({["b0"]:({["w0"]:v4233,["w1"]:v4236,["w2"]:v4239,["w3"]:v4242,["w4"]:v4245,["w5"]:v4248,["w6"]:v4251,["w7"]:v4254}),["b1"]:({["w0"]:v4258,["w1"]:v4261,["w2"]:v4264,["w3"]:v4267,["w4"]:v4270,["w5"]:v4273,["w6"]:v4276,["w7"]:v4279}),["b2"]:({["w0"]:v4283,["w1"]:v4286,["w2"]:v4289,["w3"]:v4292,["w4"]:v4295,["w5"]:v4298,["w6"]:v4301,["w7"]:v4304}),["b3"]:({["w0"]:v4308,["w1"]:v4311,["w2"]:v4314,["w3"]:v4317,["w4"]:v4320,["w5"]:v4323,["w6"]:v4326,["w7"]:v4329}),["b4"]:({["w0"]:v4333,["w1"]:v4336,["w2"]:v4339,["w3"]:v4342,["w4"]:v4345,["w5"]:v4348,["w6"]:v4351,["w7"]:v4354}),["b5"]:({["w0"]:v4358,["w1"]:v4361,["w2"]:v4364,["w3"]:v4367,["w4"]:v4370,["w5"]:v4373,["w6"]:v4376,["w7"]:v4379}),["b6"]:({["w0"]:v4383,["w1"]:v4386,["w2"]:v4389,["w3"]:v4392,["w4"]:v4395,["w5"]:v4398,["w6"]:v4401,["w7"]:v4404}),["b7"]:({["w0"]:v4408,["w1"]:v4411,["w2"]:v4414,["w3"]:v4417,["w4"]:v4420,["w5"]:v4423,["w6"]:v4426,["w7"]:v4429})})});}
v3863=v4225;}
return v3863;}
function __fn18(v4431,v4432,v4433,v4434){
v4434=__nfValue(v4434);
const v4435=1000000;
let v4436;if(((v4432) > (v4435))){
v4436=({Err:"reverse differentiation capacity exceeds one million nodes"});}else{
const v4437=v4431["b0"];
const v4438=__nfValue(v4437["w0"]);
const v4439=new __InkBuffer([]);
const v4440=false;
const v4442=__fn8(v4438,({["nodes"]:v4439,["maximum"]:v4432,["failed"]:v4440}));
const v4443=v4431["b0"];
const v4444=__nfValue(v4443["w1"]);
const v4445=v4442["tape"];
const v4446=__fn8(v4444,v4445);
const v4447=v4431["b0"];
const v4448=__nfValue(v4447["w2"]);
const v4449=v4446["tape"];
const v4450=__fn8(v4448,v4449);
const v4451=v4431["b0"];
const v4452=__nfValue(v4451["w3"]);
const v4453=v4450["tape"];
const v4454=__fn8(v4452,v4453);
const v4455=v4431["b0"];
const v4456=__nfValue(v4455["w4"]);
const v4457=v4454["tape"];
const v4458=__fn8(v4456,v4457);
const v4459=v4431["b0"];
const v4460=__nfValue(v4459["w5"]);
const v4461=v4458["tape"];
const v4462=__fn8(v4460,v4461);
const v4463=v4431["b0"];
const v4464=__nfValue(v4463["w6"]);
const v4465=v4462["tape"];
const v4466=__fn8(v4464,v4465);
const v4467=v4431["b0"];
const v4468=__nfValue(v4467["w7"]);
const v4469=v4466["tape"];
const v4470=__fn8(v4468,v4469);
const v4471=v4442["value"];
const v4472=v4446["value"];
const v4473=v4450["value"];
const v4474=v4454["value"];
const v4475=v4458["value"];
const v4476=v4462["value"];
const v4477=v4466["value"];
const v4478=v4470["value"];
const v4480=v4470["tape"];
const v4482=v4431["b1"];
const v4483=__nfValue(v4482["w0"]);
const v4484=__fn8(v4483,v4480);
const v4485=v4431["b1"];
const v4486=__nfValue(v4485["w1"]);
const v4487=v4484["tape"];
const v4488=__fn8(v4486,v4487);
const v4489=v4431["b1"];
const v4490=__nfValue(v4489["w2"]);
const v4491=v4488["tape"];
const v4492=__fn8(v4490,v4491);
const v4493=v4431["b1"];
const v4494=__nfValue(v4493["w3"]);
const v4495=v4492["tape"];
const v4496=__fn8(v4494,v4495);
const v4497=v4431["b1"];
const v4498=__nfValue(v4497["w4"]);
const v4499=v4496["tape"];
const v4500=__fn8(v4498,v4499);
const v4501=v4431["b1"];
const v4502=__nfValue(v4501["w5"]);
const v4503=v4500["tape"];
const v4504=__fn8(v4502,v4503);
const v4505=v4431["b1"];
const v4506=__nfValue(v4505["w6"]);
const v4507=v4504["tape"];
const v4508=__fn8(v4506,v4507);
const v4509=v4431["b1"];
const v4510=__nfValue(v4509["w7"]);
const v4511=v4508["tape"];
const v4512=__fn8(v4510,v4511);
const v4513=v4484["value"];
const v4514=v4488["value"];
const v4515=v4492["value"];
const v4516=v4496["value"];
const v4517=v4500["value"];
const v4518=v4504["value"];
const v4519=v4508["value"];
const v4520=v4512["value"];
const v4522=v4512["tape"];
const v4524=v4431["b2"];
const v4525=__nfValue(v4524["w0"]);
const v4526=__fn8(v4525,v4522);
const v4527=v4431["b2"];
const v4528=__nfValue(v4527["w1"]);
const v4529=v4526["tape"];
const v4530=__fn8(v4528,v4529);
const v4531=v4431["b2"];
const v4532=__nfValue(v4531["w2"]);
const v4533=v4530["tape"];
const v4534=__fn8(v4532,v4533);
const v4535=v4431["b2"];
const v4536=__nfValue(v4535["w3"]);
const v4537=v4534["tape"];
const v4538=__fn8(v4536,v4537);
const v4539=v4431["b2"];
const v4540=__nfValue(v4539["w4"]);
const v4541=v4538["tape"];
const v4542=__fn8(v4540,v4541);
const v4543=v4431["b2"];
const v4544=__nfValue(v4543["w5"]);
const v4545=v4542["tape"];
const v4546=__fn8(v4544,v4545);
const v4547=v4431["b2"];
const v4548=__nfValue(v4547["w6"]);
const v4549=v4546["tape"];
const v4550=__fn8(v4548,v4549);
const v4551=v4431["b2"];
const v4552=__nfValue(v4551["w7"]);
const v4553=v4550["tape"];
const v4554=__fn8(v4552,v4553);
const v4555=v4526["value"];
const v4556=v4530["value"];
const v4557=v4534["value"];
const v4558=v4538["value"];
const v4559=v4542["value"];
const v4560=v4546["value"];
const v4561=v4550["value"];
const v4562=v4554["value"];
const v4564=v4554["tape"];
const v4566=v4431["b3"];
const v4567=__nfValue(v4566["w0"]);
const v4568=__fn8(v4567,v4564);
const v4569=v4431["b3"];
const v4570=__nfValue(v4569["w1"]);
const v4571=v4568["tape"];
const v4572=__fn8(v4570,v4571);
const v4573=v4431["b3"];
const v4574=__nfValue(v4573["w2"]);
const v4575=v4572["tape"];
const v4576=__fn8(v4574,v4575);
const v4577=v4431["b3"];
const v4578=__nfValue(v4577["w3"]);
const v4579=v4576["tape"];
const v4580=__fn8(v4578,v4579);
const v4581=v4431["b3"];
const v4582=__nfValue(v4581["w4"]);
const v4583=v4580["tape"];
const v4584=__fn8(v4582,v4583);
const v4585=v4431["b3"];
const v4586=__nfValue(v4585["w5"]);
const v4587=v4584["tape"];
const v4588=__fn8(v4586,v4587);
const v4589=v4431["b3"];
const v4590=__nfValue(v4589["w6"]);
const v4591=v4588["tape"];
const v4592=__fn8(v4590,v4591);
const v4593=v4431["b3"];
const v4594=__nfValue(v4593["w7"]);
const v4595=v4592["tape"];
const v4596=__fn8(v4594,v4595);
const v4597=v4568["value"];
const v4598=v4572["value"];
const v4599=v4576["value"];
const v4600=v4580["value"];
const v4601=v4584["value"];
const v4602=v4588["value"];
const v4603=v4592["value"];
const v4604=v4596["value"];
const v4606=v4596["tape"];
const v4608=v4431["b4"];
const v4609=__nfValue(v4608["w0"]);
const v4610=__fn8(v4609,v4606);
const v4611=v4431["b4"];
const v4612=__nfValue(v4611["w1"]);
const v4613=v4610["tape"];
const v4614=__fn8(v4612,v4613);
const v4615=v4431["b4"];
const v4616=__nfValue(v4615["w2"]);
const v4617=v4614["tape"];
const v4618=__fn8(v4616,v4617);
const v4619=v4431["b4"];
const v4620=__nfValue(v4619["w3"]);
const v4621=v4618["tape"];
const v4622=__fn8(v4620,v4621);
const v4623=v4431["b4"];
const v4624=__nfValue(v4623["w4"]);
const v4625=v4622["tape"];
const v4626=__fn8(v4624,v4625);
const v4627=v4431["b4"];
const v4628=__nfValue(v4627["w5"]);
const v4629=v4626["tape"];
const v4630=__fn8(v4628,v4629);
const v4631=v4431["b4"];
const v4632=__nfValue(v4631["w6"]);
const v4633=v4630["tape"];
const v4634=__fn8(v4632,v4633);
const v4635=v4431["b4"];
const v4636=__nfValue(v4635["w7"]);
const v4637=v4634["tape"];
const v4638=__fn8(v4636,v4637);
const v4639=v4610["value"];
const v4640=v4614["value"];
const v4641=v4618["value"];
const v4642=v4622["value"];
const v4643=v4626["value"];
const v4644=v4630["value"];
const v4645=v4634["value"];
const v4646=v4638["value"];
const v4648=v4638["tape"];
const v4650=v4431["b5"];
const v4651=__nfValue(v4650["w0"]);
const v4652=__fn8(v4651,v4648);
const v4653=v4431["b5"];
const v4654=__nfValue(v4653["w1"]);
const v4655=v4652["tape"];
const v4656=__fn8(v4654,v4655);
const v4657=v4431["b5"];
const v4658=__nfValue(v4657["w2"]);
const v4659=v4656["tape"];
const v4660=__fn8(v4658,v4659);
const v4661=v4431["b5"];
const v4662=__nfValue(v4661["w3"]);
const v4663=v4660["tape"];
const v4664=__fn8(v4662,v4663);
const v4665=v4431["b5"];
const v4666=__nfValue(v4665["w4"]);
const v4667=v4664["tape"];
const v4668=__fn8(v4666,v4667);
const v4669=v4431["b5"];
const v4670=__nfValue(v4669["w5"]);
const v4671=v4668["tape"];
const v4672=__fn8(v4670,v4671);
const v4673=v4431["b5"];
const v4674=__nfValue(v4673["w6"]);
const v4675=v4672["tape"];
const v4676=__fn8(v4674,v4675);
const v4677=v4431["b5"];
const v4678=__nfValue(v4677["w7"]);
const v4679=v4676["tape"];
const v4680=__fn8(v4678,v4679);
const v4681=v4652["value"];
const v4682=v4656["value"];
const v4683=v4660["value"];
const v4684=v4664["value"];
const v4685=v4668["value"];
const v4686=v4672["value"];
const v4687=v4676["value"];
const v4688=v4680["value"];
const v4690=v4680["tape"];
const v4692=v4431["b6"];
const v4693=__nfValue(v4692["w0"]);
const v4694=__fn8(v4693,v4690);
const v4695=v4431["b6"];
const v4696=__nfValue(v4695["w1"]);
const v4697=v4694["tape"];
const v4698=__fn8(v4696,v4697);
const v4699=v4431["b6"];
const v4700=__nfValue(v4699["w2"]);
const v4701=v4698["tape"];
const v4702=__fn8(v4700,v4701);
const v4703=v4431["b6"];
const v4704=__nfValue(v4703["w3"]);
const v4705=v4702["tape"];
const v4706=__fn8(v4704,v4705);
const v4707=v4431["b6"];
const v4708=__nfValue(v4707["w4"]);
const v4709=v4706["tape"];
const v4710=__fn8(v4708,v4709);
const v4711=v4431["b6"];
const v4712=__nfValue(v4711["w5"]);
const v4713=v4710["tape"];
const v4714=__fn8(v4712,v4713);
const v4715=v4431["b6"];
const v4716=__nfValue(v4715["w6"]);
const v4717=v4714["tape"];
const v4718=__fn8(v4716,v4717);
const v4719=v4431["b6"];
const v4720=__nfValue(v4719["w7"]);
const v4721=v4718["tape"];
const v4722=__fn8(v4720,v4721);
const v4723=v4694["value"];
const v4724=v4698["value"];
const v4725=v4702["value"];
const v4726=v4706["value"];
const v4727=v4710["value"];
const v4728=v4714["value"];
const v4729=v4718["value"];
const v4730=v4722["value"];
const v4732=v4722["tape"];
const v4734=v4431["b7"];
const v4735=__nfValue(v4734["w0"]);
const v4736=__fn8(v4735,v4732);
const v4737=v4431["b7"];
const v4738=__nfValue(v4737["w1"]);
const v4739=v4736["tape"];
const v4740=__fn8(v4738,v4739);
const v4741=v4431["b7"];
const v4742=__nfValue(v4741["w2"]);
const v4743=v4740["tape"];
const v4744=__fn8(v4742,v4743);
const v4745=v4431["b7"];
const v4746=__nfValue(v4745["w3"]);
const v4747=v4744["tape"];
const v4748=__fn8(v4746,v4747);
const v4749=v4431["b7"];
const v4750=__nfValue(v4749["w4"]);
const v4751=v4748["tape"];
const v4752=__fn8(v4750,v4751);
const v4753=v4431["b7"];
const v4754=__nfValue(v4753["w5"]);
const v4755=v4752["tape"];
const v4756=__fn8(v4754,v4755);
const v4757=v4431["b7"];
const v4758=__nfValue(v4757["w6"]);
const v4759=v4756["tape"];
const v4760=__fn8(v4758,v4759);
const v4761=v4431["b7"];
const v4762=__nfValue(v4761["w7"]);
const v4763=v4760["tape"];
const v4764=__fn8(v4762,v4763);
const v4765=v4736["value"];
const v4766=v4740["value"];
const v4767=v4744["value"];
const v4768=v4748["value"];
const v4769=v4752["value"];
const v4770=v4756["value"];
const v4771=v4760["value"];
const v4772=v4764["value"];
const v4774=v4764["tape"];
const v4787=__fn6(v4434);
const v4788=__fn16(({["b0"]:({["w0"]:v4471,["w1"]:v4472,["w2"]:v4473,["w3"]:v4474,["w4"]:v4475,["w5"]:v4476,["w6"]:v4477,["w7"]:v4478}),["b1"]:({["w0"]:v4513,["w1"]:v4514,["w2"]:v4515,["w3"]:v4516,["w4"]:v4517,["w5"]:v4518,["w6"]:v4519,["w7"]:v4520}),["b2"]:({["w0"]:v4555,["w1"]:v4556,["w2"]:v4557,["w3"]:v4558,["w4"]:v4559,["w5"]:v4560,["w6"]:v4561,["w7"]:v4562}),["b3"]:({["w0"]:v4597,["w1"]:v4598,["w2"]:v4599,["w3"]:v4600,["w4"]:v4601,["w5"]:v4602,["w6"]:v4603,["w7"]:v4604}),["b4"]:({["w0"]:v4639,["w1"]:v4640,["w2"]:v4641,["w3"]:v4642,["w4"]:v4643,["w5"]:v4644,["w6"]:v4645,["w7"]:v4646}),["b5"]:({["w0"]:v4681,["w1"]:v4682,["w2"]:v4683,["w3"]:v4684,["w4"]:v4685,["w5"]:v4686,["w6"]:v4687,["w7"]:v4688}),["b6"]:({["w0"]:v4723,["w1"]:v4724,["w2"]:v4725,["w3"]:v4726,["w4"]:v4727,["w5"]:v4728,["w6"]:v4729,["w7"]:v4730}),["b7"]:({["w0"]:v4765,["w1"]:v4766,["w2"]:v4767,["w3"]:v4768,["w4"]:v4769,["w5"]:v4770,["w6"]:v4771,["w7"]:v4772})}),v4787,v4774);
const v4789=v4788["tape"];
let v4790;if(v4789["failed"]){
v4790=({Err:"reverse differentiation tape capacity exceeded"});}else{
const v4791=v4788["tape"];
const v4792=v4791["nodes"];
const v4793=v4792.freeze();
const v4794=v4788["value"];
const v4795=__fn14(v4793,v4794,v4433);
const v4796=v4788["value"];
const v4797=__nfValue(v4796["value"]);
const v4798=v4471["id"];
let v4799;if(v4798<v4795.length){v4799=v4795[v4798];}else{
v4799=0.0;}
const v4800=__nfValue(v4799);
const v4801=v4472["id"];
let v4802;if(v4801<v4795.length){v4802=v4795[v4801];}else{
v4802=0.0;}
const v4803=__nfValue(v4802);
const v4804=v4473["id"];
let v4805;if(v4804<v4795.length){v4805=v4795[v4804];}else{
v4805=0.0;}
const v4806=__nfValue(v4805);
const v4807=v4474["id"];
let v4808;if(v4807<v4795.length){v4808=v4795[v4807];}else{
v4808=0.0;}
const v4809=__nfValue(v4808);
const v4810=v4475["id"];
let v4811;if(v4810<v4795.length){v4811=v4795[v4810];}else{
v4811=0.0;}
const v4812=__nfValue(v4811);
const v4813=v4476["id"];
let v4814;if(v4813<v4795.length){v4814=v4795[v4813];}else{
v4814=0.0;}
const v4815=__nfValue(v4814);
const v4816=v4477["id"];
let v4817;if(v4816<v4795.length){v4817=v4795[v4816];}else{
v4817=0.0;}
const v4818=__nfValue(v4817);
const v4819=v4478["id"];
let v4820;if(v4819<v4795.length){v4820=v4795[v4819];}else{
v4820=0.0;}
const v4821=__nfValue(v4820);
const v4823=v4513["id"];
let v4824;if(v4823<v4795.length){v4824=v4795[v4823];}else{
v4824=0.0;}
const v4825=__nfValue(v4824);
const v4826=v4514["id"];
let v4827;if(v4826<v4795.length){v4827=v4795[v4826];}else{
v4827=0.0;}
const v4828=__nfValue(v4827);
const v4829=v4515["id"];
let v4830;if(v4829<v4795.length){v4830=v4795[v4829];}else{
v4830=0.0;}
const v4831=__nfValue(v4830);
const v4832=v4516["id"];
let v4833;if(v4832<v4795.length){v4833=v4795[v4832];}else{
v4833=0.0;}
const v4834=__nfValue(v4833);
const v4835=v4517["id"];
let v4836;if(v4835<v4795.length){v4836=v4795[v4835];}else{
v4836=0.0;}
const v4837=__nfValue(v4836);
const v4838=v4518["id"];
let v4839;if(v4838<v4795.length){v4839=v4795[v4838];}else{
v4839=0.0;}
const v4840=__nfValue(v4839);
const v4841=v4519["id"];
let v4842;if(v4841<v4795.length){v4842=v4795[v4841];}else{
v4842=0.0;}
const v4843=__nfValue(v4842);
const v4844=v4520["id"];
let v4845;if(v4844<v4795.length){v4845=v4795[v4844];}else{
v4845=0.0;}
const v4846=__nfValue(v4845);
const v4848=v4555["id"];
let v4849;if(v4848<v4795.length){v4849=v4795[v4848];}else{
v4849=0.0;}
const v4850=__nfValue(v4849);
const v4851=v4556["id"];
let v4852;if(v4851<v4795.length){v4852=v4795[v4851];}else{
v4852=0.0;}
const v4853=__nfValue(v4852);
const v4854=v4557["id"];
let v4855;if(v4854<v4795.length){v4855=v4795[v4854];}else{
v4855=0.0;}
const v4856=__nfValue(v4855);
const v4857=v4558["id"];
let v4858;if(v4857<v4795.length){v4858=v4795[v4857];}else{
v4858=0.0;}
const v4859=__nfValue(v4858);
const v4860=v4559["id"];
let v4861;if(v4860<v4795.length){v4861=v4795[v4860];}else{
v4861=0.0;}
const v4862=__nfValue(v4861);
const v4863=v4560["id"];
let v4864;if(v4863<v4795.length){v4864=v4795[v4863];}else{
v4864=0.0;}
const v4865=__nfValue(v4864);
const v4866=v4561["id"];
let v4867;if(v4866<v4795.length){v4867=v4795[v4866];}else{
v4867=0.0;}
const v4868=__nfValue(v4867);
const v4869=v4562["id"];
let v4870;if(v4869<v4795.length){v4870=v4795[v4869];}else{
v4870=0.0;}
const v4871=__nfValue(v4870);
const v4873=v4597["id"];
let v4874;if(v4873<v4795.length){v4874=v4795[v4873];}else{
v4874=0.0;}
const v4875=__nfValue(v4874);
const v4876=v4598["id"];
let v4877;if(v4876<v4795.length){v4877=v4795[v4876];}else{
v4877=0.0;}
const v4878=__nfValue(v4877);
const v4879=v4599["id"];
let v4880;if(v4879<v4795.length){v4880=v4795[v4879];}else{
v4880=0.0;}
const v4881=__nfValue(v4880);
const v4882=v4600["id"];
let v4883;if(v4882<v4795.length){v4883=v4795[v4882];}else{
v4883=0.0;}
const v4884=__nfValue(v4883);
const v4885=v4601["id"];
let v4886;if(v4885<v4795.length){v4886=v4795[v4885];}else{
v4886=0.0;}
const v4887=__nfValue(v4886);
const v4888=v4602["id"];
let v4889;if(v4888<v4795.length){v4889=v4795[v4888];}else{
v4889=0.0;}
const v4890=__nfValue(v4889);
const v4891=v4603["id"];
let v4892;if(v4891<v4795.length){v4892=v4795[v4891];}else{
v4892=0.0;}
const v4893=__nfValue(v4892);
const v4894=v4604["id"];
let v4895;if(v4894<v4795.length){v4895=v4795[v4894];}else{
v4895=0.0;}
const v4896=__nfValue(v4895);
const v4898=v4639["id"];
let v4899;if(v4898<v4795.length){v4899=v4795[v4898];}else{
v4899=0.0;}
const v4900=__nfValue(v4899);
const v4901=v4640["id"];
let v4902;if(v4901<v4795.length){v4902=v4795[v4901];}else{
v4902=0.0;}
const v4903=__nfValue(v4902);
const v4904=v4641["id"];
let v4905;if(v4904<v4795.length){v4905=v4795[v4904];}else{
v4905=0.0;}
const v4906=__nfValue(v4905);
const v4907=v4642["id"];
let v4908;if(v4907<v4795.length){v4908=v4795[v4907];}else{
v4908=0.0;}
const v4909=__nfValue(v4908);
const v4910=v4643["id"];
let v4911;if(v4910<v4795.length){v4911=v4795[v4910];}else{
v4911=0.0;}
const v4912=__nfValue(v4911);
const v4913=v4644["id"];
let v4914;if(v4913<v4795.length){v4914=v4795[v4913];}else{
v4914=0.0;}
const v4915=__nfValue(v4914);
const v4916=v4645["id"];
let v4917;if(v4916<v4795.length){v4917=v4795[v4916];}else{
v4917=0.0;}
const v4918=__nfValue(v4917);
const v4919=v4646["id"];
let v4920;if(v4919<v4795.length){v4920=v4795[v4919];}else{
v4920=0.0;}
const v4921=__nfValue(v4920);
const v4923=v4681["id"];
let v4924;if(v4923<v4795.length){v4924=v4795[v4923];}else{
v4924=0.0;}
const v4925=__nfValue(v4924);
const v4926=v4682["id"];
let v4927;if(v4926<v4795.length){v4927=v4795[v4926];}else{
v4927=0.0;}
const v4928=__nfValue(v4927);
const v4929=v4683["id"];
let v4930;if(v4929<v4795.length){v4930=v4795[v4929];}else{
v4930=0.0;}
const v4931=__nfValue(v4930);
const v4932=v4684["id"];
let v4933;if(v4932<v4795.length){v4933=v4795[v4932];}else{
v4933=0.0;}
const v4934=__nfValue(v4933);
const v4935=v4685["id"];
let v4936;if(v4935<v4795.length){v4936=v4795[v4935];}else{
v4936=0.0;}
const v4937=__nfValue(v4936);
const v4938=v4686["id"];
let v4939;if(v4938<v4795.length){v4939=v4795[v4938];}else{
v4939=0.0;}
const v4940=__nfValue(v4939);
const v4941=v4687["id"];
let v4942;if(v4941<v4795.length){v4942=v4795[v4941];}else{
v4942=0.0;}
const v4943=__nfValue(v4942);
const v4944=v4688["id"];
let v4945;if(v4944<v4795.length){v4945=v4795[v4944];}else{
v4945=0.0;}
const v4946=__nfValue(v4945);
const v4948=v4723["id"];
let v4949;if(v4948<v4795.length){v4949=v4795[v4948];}else{
v4949=0.0;}
const v4950=__nfValue(v4949);
const v4951=v4724["id"];
let v4952;if(v4951<v4795.length){v4952=v4795[v4951];}else{
v4952=0.0;}
const v4953=__nfValue(v4952);
const v4954=v4725["id"];
let v4955;if(v4954<v4795.length){v4955=v4795[v4954];}else{
v4955=0.0;}
const v4956=__nfValue(v4955);
const v4957=v4726["id"];
let v4958;if(v4957<v4795.length){v4958=v4795[v4957];}else{
v4958=0.0;}
const v4959=__nfValue(v4958);
const v4960=v4727["id"];
let v4961;if(v4960<v4795.length){v4961=v4795[v4960];}else{
v4961=0.0;}
const v4962=__nfValue(v4961);
const v4963=v4728["id"];
let v4964;if(v4963<v4795.length){v4964=v4795[v4963];}else{
v4964=0.0;}
const v4965=__nfValue(v4964);
const v4966=v4729["id"];
let v4967;if(v4966<v4795.length){v4967=v4795[v4966];}else{
v4967=0.0;}
const v4968=__nfValue(v4967);
const v4969=v4730["id"];
let v4970;if(v4969<v4795.length){v4970=v4795[v4969];}else{
v4970=0.0;}
const v4971=__nfValue(v4970);
const v4973=v4765["id"];
let v4974;if(v4973<v4795.length){v4974=v4795[v4973];}else{
v4974=0.0;}
const v4975=__nfValue(v4974);
const v4976=v4766["id"];
let v4977;if(v4976<v4795.length){v4977=v4795[v4976];}else{
v4977=0.0;}
const v4978=__nfValue(v4977);
const v4979=v4767["id"];
let v4980;if(v4979<v4795.length){v4980=v4795[v4979];}else{
v4980=0.0;}
const v4981=__nfValue(v4980);
const v4982=v4768["id"];
let v4983;if(v4982<v4795.length){v4983=v4795[v4982];}else{
v4983=0.0;}
const v4984=__nfValue(v4983);
const v4985=v4769["id"];
let v4986;if(v4985<v4795.length){v4986=v4795[v4985];}else{
v4986=0.0;}
const v4987=__nfValue(v4986);
const v4988=v4770["id"];
let v4989;if(v4988<v4795.length){v4989=v4795[v4988];}else{
v4989=0.0;}
const v4990=__nfValue(v4989);
const v4991=v4771["id"];
let v4992;if(v4991<v4795.length){v4992=v4795[v4991];}else{
v4992=0.0;}
const v4993=__nfValue(v4992);
const v4994=v4772["id"];
let v4995;if(v4994<v4795.length){v4995=v4795[v4994];}else{
v4995=0.0;}
const v4996=__nfValue(v4995);
v4790=({Ok:({["value"]:v4797,["gradient"]:({["b0"]:({["w0"]:v4800,["w1"]:v4803,["w2"]:v4806,["w3"]:v4809,["w4"]:v4812,["w5"]:v4815,["w6"]:v4818,["w7"]:v4821}),["b1"]:({["w0"]:v4825,["w1"]:v4828,["w2"]:v4831,["w3"]:v4834,["w4"]:v4837,["w5"]:v4840,["w6"]:v4843,["w7"]:v4846}),["b2"]:({["w0"]:v4850,["w1"]:v4853,["w2"]:v4856,["w3"]:v4859,["w4"]:v4862,["w5"]:v4865,["w6"]:v4868,["w7"]:v4871}),["b3"]:({["w0"]:v4875,["w1"]:v4878,["w2"]:v4881,["w3"]:v4884,["w4"]:v4887,["w5"]:v4890,["w6"]:v4893,["w7"]:v4896}),["b4"]:({["w0"]:v4900,["w1"]:v4903,["w2"]:v4906,["w3"]:v4909,["w4"]:v4912,["w5"]:v4915,["w6"]:v4918,["w7"]:v4921}),["b5"]:({["w0"]:v4925,["w1"]:v4928,["w2"]:v4931,["w3"]:v4934,["w4"]:v4937,["w5"]:v4940,["w6"]:v4943,["w7"]:v4946}),["b6"]:({["w0"]:v4950,["w1"]:v4953,["w2"]:v4956,["w3"]:v4959,["w4"]:v4962,["w5"]:v4965,["w6"]:v4968,["w7"]:v4971}),["b7"]:({["w0"]:v4975,["w1"]:v4978,["w2"]:v4981,["w3"]:v4984,["w4"]:v4987,["w5"]:v4990,["w6"]:v4993,["w7"]:v4996})})})});}
v4436=v4790;}
return v4436;}
function __into14(v4999,v5000,v5001,v5002){
let v5003=new __InkBuffer([]);
for(let v5004=0;v5004<v4999.length;v5004++){
const v5005=v4999[v5004];
const v5006=v5003;
const v5007=0.0;
v5003=__tempEdit(v5006,"push",v5007);
}
const v5008=v5003;
const v5009=v5000["id"];
const v5010=1.0;
const v5011=__fn11(v5008,v5009,v5010);
const v5012=(v4999).length;
let v5013=v5011;
let v5014=v5012;
for(let v5016=v4999.length-1;v5016>=0;v5016--){
const v5017=v4999[v5016];
const v5018=v5013;
const v5019=v5014;
const v5022=__fn13(v5017,({["gradient"]:v5018,["index"]:v5019}),v5001);
v5013=v5022["gradient"];
v5014=v5022["index"];
}
const v5023=({["gradient"]:v5013,["index"]:v5014});
const v5024=v5023["gradient"];
const v5025=v5024.freeze();
const v5026=v5025.length;
for(let v5027=0;v5027<v5026;v5027++){
v5002[v5027]=__intoOutput14(v5025[v5027]);
}
return v5026;}
const __namedTypes={"Block":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"},"Weights":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},"__ink_reverse_0_Flow":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"},"__ink_reverse_0_Node":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"__ink_reverse_0_Reverse":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Reverse"},"__ink_reverse_0_Tape":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"},"__ink_reverse_0_Wire":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"},"__ink_reverse_246":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"gradient","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"__ink_reverse_246"},"__ink_reverse_3":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"},"__ink_reverse_4":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"},"__ink_reverse_54":{"fields":[{"name":"value","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_54"},"__ink_reverse_7":{"fields":[{"name":"value","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_7"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"f62244be10d81711fa3a301747e834e6a446693b79d3f0e29df932c72f264cd8","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_computation":"native-number-with-exact-nonfinite-tags","f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"block","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":1,"internal":false,"name":"energy","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":2,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"stop","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}},{"destination":null,"index":3,"internal":false,"name":"linearized","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"stop","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}}},{"destination":null,"index":4,"internal":false,"name":"update","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"g","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"destination":null,"index":5,"internal":false,"name":"step","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"destination":null,"index":6,"internal":false,"name":"__ink_reverse_0_constant","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"destination":null,"index":7,"internal":true,"name":"__ink_reverse_0_append","parallel":false,"params":[{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}},{"name":"node","type":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"}},{"name":"active","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":8,"internal":true,"name":"__ink_reverse_0_seed","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":9,"internal":true,"name":"__ink_reverse_0_binary","parallel":false,"params":[{"name":"op","type":{"kind":"u32"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}},{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":10,"internal":true,"name":"__ink_reverse_0_unary","parallel":false,"params":[{"name":"op","type":{"kind":"u32"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}},{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":11,"internal":true,"name":"__ink_reverse_0_add","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"id","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":12,"internal":true,"name":"__ink_reverse_0_back_node","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"}},{"name":"amount","type":{"kind":"f32"}},{"name":"g","type":{"kind":"temporary"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":13,"internal":true,"name":"__ink_reverse_0_back_step","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"}},{"name":"work","type":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Reverse"}},{"name":"stopZero","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Reverse"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":14,"internal":false,"name":"__ink_reverse_0_backward","parallel":false,"params":[{"name":"nodes","type":{"element":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"kind":"list"}},{"name":"output","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"stopZero","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":15,"internal":true,"name":"__ink_reverse_5","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"__ink_reverse_6","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":16,"internal":true,"name":"__ink_reverse_1","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"}},{"name":"target","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"__ink_reverse_2","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"}},{"destination":null,"index":17,"internal":false,"name":"__ink_reverse_95","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"__ink_reverse_90","type":{"kind":"u32"}},{"name":"__ink_reverse_91","type":{"kind":"bool"}},{"name":"target","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}},{"destination":null,"index":18,"internal":false,"name":"__ink_reverse_173","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"__ink_reverse_168","type":{"kind":"u32"}},{"name":"__ink_reverse_169","type":{"kind":"bool"}},{"name":"target","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"gradient","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"__ink_reverse_246"}}}],"named_types":{"Block":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"},"Weights":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},"__ink_reverse_0_Flow":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_0_Flow"},"__ink_reverse_0_Node":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"__ink_reverse_0_Reverse":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Reverse"},"__ink_reverse_0_Tape":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"},"__ink_reverse_0_Wire":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"},"__ink_reverse_246":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"gradient","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"__ink_reverse_246"},"__ink_reverse_3":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"},"__ink_reverse_4":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"},"__ink_reverse_54":{"fields":[{"name":"value","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_54"},"__ink_reverse_7":{"fields":[{"name":"value","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"tape","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}}],"kind":"record","name":"__ink_reverse_7"}},"prepared_compiled":{"destination":{"call":"callPreparedCompiledInto","capacity":"trusted","failure":"destination may be partially written","float_values":"trusted public representation","inputs":"sealed compiled values","ownership":"caller-owned","structured_elements":"detached","tail":"unwritten"},"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":false,"function":"block","reason":"no reusable captured work"},{"delegated_calls":0,"factory":true,"function":"energy","retained_bindings":1},{"delegated_calls":1,"factory":true,"function":"derivatives","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"linearized","retained_bindings":0},{"factory":false,"function":"update","reason":"no reusable captured work"},{"factory":false,"function":"step","reason":"no reusable captured work"},{"factory":false,"function":"__ink_reverse_0_constant","reason":"no reusable captured work"},{"factory":false,"function":"__ink_reverse_0_append","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_seed","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_binary","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_unary","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_add","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_back_node","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_back_step","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_0_backward","reason":"no reusable lexical bindings"},{"factory":false,"function":"__ink_reverse_5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_1","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"__ink_reverse_95","reason":"prepared residual binding budget"},{"factory":false,"function":"__ink_reverse_173","reason":"prepared residual binding budget"}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"__ink_reverse_0_add":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_append":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_back_node":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_back_step":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_backward":{"arguments":{"format":"ink-value-wire-v1","identity":"369ca7294b9f7da184514c2d74f2fbffa34696c1fa5d3a2adaf1f053340d482d","named":{},"root":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"kind":"list"}},{"name":"output","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"stopZero","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"__ink_reverse_0_binary":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_constant":{"arguments":{"format":"ink-value-wire-v1","identity":"d4cb0361a7a8833933106ca6dd70006e19100c770fe048f31d961bc14fa899fc","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fabc4e63e940c6190680726874c8654deced79200b320c057b9389a135a08557","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}},"__ink_reverse_0_seed":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_0_unary":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_1":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_173":{"arguments":{"format":"ink-value-wire-v1","identity":"772e55c149016b0c33d9897cab8f367e21c65bb53aeb0fa169dff88bac69c6fe","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"__ink_reverse_168","type":{"kind":"u32"}},{"name":"__ink_reverse_169","type":{"kind":"bool"}},{"name":"target","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4ffa35b7d3f1ab446e1127a24bafbaa5f7471288e33b61e8dc5e1883d7e9f679","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"gradient","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"__ink_reverse_246"}}}},"__ink_reverse_5":{"unsupported":"unsupported wire descriptor"},"__ink_reverse_95":{"arguments":{"format":"ink-value-wire-v1","identity":"a764afaa47b125a3a75ab4f5da934c97967f93251c1a3456a802f8b5fb74c225","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"__ink_reverse_90","type":{"kind":"u32"}},{"name":"__ink_reverse_91","type":{"kind":"bool"}},{"name":"target","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"73558093d5b3e9c79d98ba6cdf59158e00946d53958debd073b06f83affc2f9a","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}}},"block":{"arguments":{"format":"ink-value-wire-v1","identity":"d7350abd66c0261671866f5345fdca4e192d28e158f2b79ed11b418ccd179ce0","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"0d213ca5d4367e0ac868384b4c6fdbfbb806ff6598011b5cebd3c5d861503c78","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"stop","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"73558093d5b3e9c79d98ba6cdf59158e00946d53958debd073b06f83affc2f9a","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}}},"energy":{"arguments":{"format":"ink-value-wire-v1","identity":"134a7c5d7d8092621fb988995fb2c1f6f2829b0619f2dfe3bb1a70931d37980d","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"linearized":{"arguments":{"format":"ink-value-wire-v1","identity":"0d213ca5d4367e0ac868384b4c6fdbfbb806ff6598011b5cebd3c5d861503c78","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"stop","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"29bcdada2d2b5ecb6deae18e25401ad25c1f0dc80bcd50defebf64892403468d","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}}}},"step":{"arguments":{"format":"ink-value-wire-v1","identity":"c03e610a6fb624d766057394819af94e2bc1248ab798d5dc38d2f5b244b71b70","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"2a24f9672d54097dab4ab3ea97e7db843366f58062ebee043da807c7c71698fc","named":{},"root":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}},"update":{"arguments":{"format":"ink-value-wire-v1","identity":"02720155312d47bc3ea05380c2dcebc5bb8ae1819cd4984a72ea0b6ff7cf217d","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"g","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"2a24f9672d54097dab4ab3ea97e7db843366f58062ebee043da807c7c71698fc","named":{},"root":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[false],"types":[{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}]},{"capture":[false,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"f32"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"f32"},{"kind":"u32"},{"kind":"bool"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"f32"},{"kind":"u32"},{"kind":"bool"}]},{"capture":[false,false,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"},{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},{"kind":"bool"}]},{"capture":[true,true],"types":[{"kind":"f32"},{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}]},{"capture":[true,true,false,false],"types":[{"kind":"u32"},{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"},{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"},{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}]},{"capture":[true,true,false],"types":[{"kind":"u32"},{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"},{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}]},{"capture":[true,true,true],"types":[{"kind":"temporary"},{"kind":"u32"},{"kind":"f32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},{"kind":"f32"},{"kind":"temporary"}]},{"capture":[false,false,true],"types":[{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Reverse"},{"kind":"bool"}]},{"capture":[false,false,true],"types":[{"element":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"kind":"list"},{"fields":[{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"},{"kind":"bool"}]},{"capture":[true,true],"types":[{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"},{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w1","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w2","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w3","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w4","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w5","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w6","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},{"name":"w7","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}}],"kind":"record","name":"__ink_reverse_4"}}],"kind":"record","name":"__ink_reverse_3"},{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"},{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"failed","type":{"kind":"bool"}}],"kind":"record","name":"__ink_reverse_0_Tape"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"u32"},{"kind":"bool"},{"kind":"f32"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"},{"kind":"u32"},{"kind":"bool"},{"kind":"f32"}]}];
export const functions=Object.freeze({...Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const output=__representation(f.result,true);
  const body=__implementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>{const context=new WeakMap();return output(implementation(...(needsInput ? args.map((v,i)=>input[i](v,context)) : args)),context);};
  return [f.name,entry];
}))),...Object.freeze(Object.fromEntries([["block",(()=>{const c0=__representation(__inputTypes[0].types[0],false,__inputTypes[0].capture[0]);const output=__representation(metadata.functions[0].result,true);const input=[c0],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&output===__identity)return __fn0;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return output(__fn0(...values),context);};return function(a0){if(arguments.length!==1)return fallback(...arguments);const context=(needsContext)?new WeakMap():null;const v0=c0(a0,context);return output(__fn0(v0),context);};})()],
["energy",(()=>{const c0=__representation(__inputTypes[1].types[0],false,__inputTypes[1].capture[0]);const c1=__representation(__inputTypes[1].types[1],false,__inputTypes[1].capture[1]);const output=__representation(metadata.functions[1].result,true);const input=[c0,c1],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&output===__identity)return __fn1;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return output(__fn1(...values),context);};return function(a0,a1){if(arguments.length!==2)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);return output(__fn1(v0,v1),context);};})()]]))});
export function call(name,args) {switch(name){case "__ink_reverse_0_append":case "__ink_reverse_0_seed":case "__ink_reverse_0_binary":case "__ink_reverse_0_unary":case "__ink_reverse_0_add":case "__ink_reverse_0_back_node":case "__ink_reverse_0_back_step":case "__ink_reverse_5":case "__ink_reverse_1":throw new Error('temporary storage is internal to a pure invocation');}return functions[name](...args);}
// Shared bounded binary codec; generated code supplies exact descriptors.
export const valueWireFormat='ink-value-wire-v1';
// A connection agrees on the complete value schema before using this format.
// Version byte + schema-directed fields; schema identity is out of band.
export const compactValueWireFormat='ink-value-session-v1';
const wireMagic=Uint8Array.of(73,78,75,86,65,76,0,1);
const wireEncoder=new TextEncoder(),wireDecoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const wireDefaults=Object.freeze({bytes:16777216,nodes:1000000,depth:128}),wireDefaultOptions=Object.freeze({});
const wireDecimal=s=>typeof s==='string'&&/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(s);
function wireLimits(options){if(options===wireDefaultOptions||options===wireDefaults)return wireDefaults;const l={...wireDefaults,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>wireDefaults[k])throw Error('wire hard resource limit');return l;}
const wireFloat=new DataView(new ArrayBuffer(4));
function wireDecodeText(bytes,start,end){
 if(end-start<=16){let text='';for(let i=start;i<end;i++){const byte=bytes[i];if(byte>=128)return wireDecoder.decode(bytes.subarray(start,end));text+=String.fromCharCode(byte);}return text;}
 return wireDecoder.decode(bytes.subarray(start,end));
}
function wireUtf8Length(text){let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff){bytes+=4;i++;}else bytes+=3;}return bytes;}
const wireOwn=(v,k)=>v!==null&&typeof v==='object'&&Object.hasOwn(v,k);
const wireTagged=(v,k)=>wireOwn(v,k)&&Object.keys(v).length===1;
const wireDouble=new DataView(new ArrayBuffer(8));
function wireF64Bits(v){
 if(typeof v==='number'&&Number.isFinite(v)){wireDouble.setFloat64(0,v,true);return wireDouble.getBigUint64(0,true);}
 if(!wireTagged(v,'F64Bits'))wireInvalidValue();const text=v.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))wireInvalidValue();
 const bits=BigInt(text);if(bits>18446744073709551615n)wireInvalidValue();return bits;
}
const wireCanonical=v=>Array.isArray(v)?'['+v.map(wireCanonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort((a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}).map(k=>JSON.stringify(k)+':'+wireCanonical(v[k])).join(',')+'}':JSON.stringify(v);
export async function createValueCodec(root,named={}){
 const used=new Set(),budget={nodes:100000};
 function check(t,d=0){
  if(d>64||--budget.nodes<0)throw Error('wire descriptor limit');
  const keys={u32:['kind'],u64:['kind'],i32:['kind'],f32:['kind'],f64:['kind'],bool:['kind'],unit:['kind'],string:['kind'],int:['kind'],id:['kind','name'],ref:['kind','name'],enum:['kind','name','variants'],record:['kind','name','fields'],list:['kind','element'],option:['kind','element'],vector:['kind','element','size'],result:['kind','ok','error']}[t?.kind];
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
// Resolve immutable descriptor edges once. Logical validation traverses the
// literal schema; single-child nodes use a loop rather than recursive closures.
function wireValuePlan(codec){
 const seen=new WeakMap();let remaining=100000;
 const build=type=>{
  const t=codec.resolve(type);if(seen.has(t))return seen.get(t);
  if(--remaining<0)throw Error('wire descriptor limit');const p={kind:t.kind,type:t,decode:null,decodeCompact:null};seen.set(t,p);
  if(t.kind==='record')p.fields=t.fields.map(f=>({name:f.name,plan:build(f.type)}));
  if(t.kind==='list'||t.kind==='vector'||t.kind==='option')p.element=build(t.element);
  if(t.kind==='result'){p.ok=build(t.ok);p.error=build(t.error);}
  return p;
 };return build(codec.descriptor.root);
}
function wireBindDecodePlan(root,compact=false){
 const seen=new Set(),pending=[root];let flags=0;
 while(pending.length){
  const p=pending.pop();if(seen.has(p))continue;seen.add(p);if(compact)p.decodeCompact=compactDecodeOperation(p);else p.decode=wireDecodeOperation(p);
  if(p.fields?.length>4)flags|=1;
  if(p.kind==='u32'||p.kind==='i32'||p.kind==='u64'||p.kind==='f32'||p.kind==='f64')flags|=2;
  if(p.fields)for(const f of p.fields)pending.push(f.plan);
  if(p.element)pending.push(p.element);
  if(p.ok){pending.push(p.ok);pending.push(p.error);}
 }
 return flags|4;
}
// Select literal descriptor operations once, without runtime source generation
// or eval. Recursive edges call the completed plan. The generic scanner remains
// the visitor/validation path and an independent materialisation implementation.
function wireReadOperation(p){
 const t=p.type;
 let read;
 switch(p.kind){
  case 'unit':read=(r,end)=>{r.size(end,0);return null;};break;
  case 'bool':read=(r,end)=>{r.size(end,1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':read=(r,end)=>{r.size(end,4);const n=r.view.getUint32(r.cursor,true);r.cursor=end;return n;};break;
  case 'i32':read=(r,end)=>{r.size(end,4);const n=r.view.getInt32(r.cursor,true);r.cursor=end;return n;};break;
  case 'f32':read=(r,end)=>{r.size(end,4);const value={F32Bits:r.view.getUint32(r.cursor,true)};r.cursor=end;return value;};break;
  case 'f64':read=(r,end)=>{r.size(end,8);const value={F64Bits:r.view.getBigUint64(r.cursor,true).toString()};r.cursor=end;return value;};break;
  case 'u64':read=(r,end)=>{r.size(end,8);const value=r.view.getBigUint64(r.cursor,true);r.cursor=end;return value;};break;
  case 'string':read=(r,end)=>r.text(end);break;
  case 'int':read=(r,end)=>{const text=r.text(end);if(!wireDecimal(text))throw Error('malformed wire text');return {Int:text};};break;
  case 'id':read=(r,end)=>{const text=r.text(end);if(!/^[0-9a-f]{32}$/.test(text))throw Error('malformed wire text');return text;};break;
  case 'enum':read=(r,end)=>{const text=r.text(end);if(!t.variants.includes(text))throw Error('malformed wire text');return text;};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   read=(r,end,d)=>{
    if(r.cursor+4>end)throw Error('wire list count');const n=r.view.getUint32(r.cursor,true);r.cursor+=4;
    if(n>r.remaining||n>Math.floor((end-r.cursor)/4)||size!==null&&n!==size)throw Error('wire sequence size');
    const values=new Array(n);for(let i=0;i<n;i++)values[i]=element.decode(r,end,d+1);return values;
   };break;
  }
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>({});break;
    case 1:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1)});break;
    case 2:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1)});break;
    case 3:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1),[fs[2].name]:fs[2].plan.decode(r,end,d+1)});break;
    case 4:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1),[fs[2].name]:fs[2].plan.decode(r,end,d+1),[fs[3].name]:fs[3].plan.decode(r,end,d+1)});break;
    default:read=(r,end,d)=>{const value={};for(const f of fs){r.property.value=f.plan.decode(r,end,d+1);Object.defineProperty(value,f.name,r.property);}return value;};
   }break;
  }
  case 'option':read=(r,end,d)=>{const tag=r.tag(end);return tag?{Some:p.element.decode(r,end,d+1)}:{None:null};};break;
  case 'result':read=(r,end,d)=>r.tag(end)?{Err:p.error.decode(r,end,d+1)}:{Ok:p.ok.decode(r,end,d+1)};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return read;
}
function wireDecodeOperation(p){
 if(p.kind==='record'&&p.fields.length===1){
  const field=p.fields[0],read=wireReadOperation(field.plan),name=field.name;
  return (r,parentEnd,d)=>{const end=r.enter(parentEnd,d),childEnd=r.enter(end,d+1),item=read(r,childEnd,d+1);if(r.cursor!==childEnd)throw Error('trailing wire frame bytes');const value={[name]:item};if(r.cursor!==end)throw Error('trailing wire frame bytes');return value;};
 }
 const read=wireReadOperation(p);
 return (r,parentEnd,d)=>{const end=r.enter(parentEnd,d),value=read(r,end,d);if(r.cursor!==end)throw Error('trailing wire frame bytes');return value;};
}
class WireDecodeCursor{
 constructor(bytes,view,limits){this.bytes=bytes;this.view=view;this.cursor=40;this.remaining=limits.nodes;this.depth=limits.depth;this.property=null;}
 enter(parentEnd,d){
  if(d>this.depth||--this.remaining<0||this.cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const start=this.cursor+4,end=start+this.view.getUint32(this.cursor,true);if(end>parentEnd)throw Error('truncated wire frame');this.cursor=start;return end;
 }
 size(end,n){if(end-this.cursor!==n)throw Error('malformed wire scalar');}
 tag(end){if(this.cursor===end||this.bytes[this.cursor]>1)throw Error('wire sum tag');return this.bytes[this.cursor++];}
 text(end){const text=wireDecodeText(this.bytes,this.cursor,end);this.cursor=end;return text;}
}
// Bind literal validation and postorder visitation once for every descriptor.
// No logical carriers are allocated; projection still validates every child.
function wireScanPlan(root){
 const seen=new WeakMap();
 const build=source=>{
  if(seen.has(source))return seen.get(source);
  const p={kind:source.kind,type:source.type,scan:null};seen.set(source,p);
  if(source.fields)p.fields=source.fields.map(f=>({plan:build(f.plan)}));
  if(source.element)p.element=build(source.element);
  if(source.ok){p.ok=build(source.ok);p.error=build(source.error);}
  p.scan=wireScanOperation(p);return p;
 };
 return build(root);
}
function wireScanOperation(p){
 const t=p.type;let read;
 switch(p.kind){
  case 'unit':read=(r,end)=>{r.size(end,0);return null;};break;
  case 'bool':read=(r,end)=>{r.size(end,1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':read=(r,end)=>{r.size(end,4);const n=r.view.getUint32(r.cursor,true);r.cursor=end;return n;};break;
  case 'i32':read=(r,end)=>{r.size(end,4);const n=r.view.getInt32(r.cursor,true);r.cursor=end;return n;};break;
  case 'f32':case 'f64':case 'u64':{const size=p.kind==='f32'?4:8;read=(r,end)=>{r.size(end,size);r.cursor=end;};break;}
  case 'string':read=(r,end)=>{let i=r.cursor;while(i<end&&r.bytes[i]<128)i++;if(i<end)wireDecoder.decode(r.bytes.subarray(r.cursor,end));r.cursor=end;};break;
  case 'int':case 'id':case 'enum':read=(r,end)=>{const text=r.text(end);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   read=(r,end,d)=>{if(r.cursor+4>end)throw Error('wire list count');const n=r.view.getUint32(r.cursor,true);r.cursor+=4;if(n>r.remaining||n>Math.floor((end-r.cursor)/4)||size!==null&&n!==size)throw Error('wire sequence size');for(let i=0;i<n;i++)element.scan(r,end,d+1);};break;
  }
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>{};break;
    case 1:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);};break;
    case 2:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);};break;
    case 3:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);fs[2].plan.scan(r,end,d+1);};break;
    case 4:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);fs[2].plan.scan(r,end,d+1);fs[3].plan.scan(r,end,d+1);};break;
    default:read=(r,end,d)=>{for(const f of fs)f.plan.scan(r,end,d+1);};
   }break;
  }
  case 'option':read=(r,end,d)=>{if(r.tag(end))p.element.scan(r,end,d+1);};break;
  case 'result':read=(r,end,d)=>{(r.tag(end)?p.error:p.ok).scan(r,end,d+1);};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return (r,parentEnd,d)=>{
  const end=r.enter(parentEnd,d),start=r.cursor,value=read(r,end,d);if(r.cursor!==end)throw Error('trailing wire frame bytes');
  const visitor=r.visitor;if(visitor&&(!r.selected||r.selected.has(t.name))){if(r.spans)visitor(t,r.bytes,start,end,d);else visitor(t,r.bytes.subarray(start,end),d);}
  return value;
 };
}
// Separate methods keep decoding's cursor callsites monomorphic. Both cursors
// are checked against the independent generic scanner and malformed fixtures.
class WireScanCursor{
 constructor(bytes,view,limits,visitor,selected,spans){this.bytes=bytes;this.view=view;this.cursor=40;this.remaining=limits.nodes;this.depth=limits.depth;this.visitor=visitor;this.selected=selected;this.spans=spans;}
 enter(parentEnd,d){
  if(d>this.depth||--this.remaining<0||this.cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const start=this.cursor+4,end=start+this.view.getUint32(this.cursor,true);if(end>parentEnd)throw Error('truncated wire frame');this.cursor=start;return end;
 }
 size(end,n){if(end-this.cursor!==n)throw Error('malformed wire scalar');}
 tag(end){if(this.cursor===end||this.bytes[this.cursor]>1)throw Error('wire sum tag');return this.bytes[this.cursor++];}
 text(end){const text=wireDecodeText(this.bytes,this.cursor,end);this.cursor=end;return text;}
}
function compactReadOperation(p){
 const t=p.type;let read;
 switch(p.kind){
  case 'unit':read=()=>null;break;
  case 'bool':read=r=>{r.require(1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':case 'i32':read=r=>{r.require(4);const n=p.kind==='u32'?r.view.getUint32(r.cursor,true):r.view.getInt32(r.cursor,true);r.cursor+=4;return n;};break;
  case 'f32':read=r=>{r.require(4);const n=r.view.getUint32(r.cursor,true);r.cursor+=4;return {F32Bits:n};};break;
  case 'f64':read=r=>{r.require(8);const n=r.view.getBigUint64(r.cursor,true);r.cursor+=8;return {F64Bits:n.toString()};};break;
  case 'u64':read=r=>{r.require(8);const n=r.view.getBigUint64(r.cursor,true);r.cursor+=8;return n;};break;
  case 'string':read=r=>r.text();break;
  case 'int':read=r=>{const text=r.text();if(!wireDecimal(text))throw Error('malformed wire text');return {Int:text};};break;
  case 'id':read=r=>{const text=r.text();if(!/^[0-9a-f]{32}$/.test(text))throw Error('malformed wire text');return text;};break;
  case 'enum':read=r=>{const text=r.text();if(!t.variants.includes(text))throw Error('malformed wire text');return text;};break;
  case 'list':case 'vector':read=(r,d)=>{const n=r.count();if(n>r.remaining||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');const values=new Array(n);for(let i=0;i<n;i++)values[i]=p.element.decodeCompact(r,d+1);return values;};break;
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>({});break;
    case 1:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1)});break;
    case 2:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1)});break;
    case 3:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1),[fs[2].name]:fs[2].plan.decodeCompact(r,d+1)});break;
    case 4:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1),[fs[2].name]:fs[2].plan.decodeCompact(r,d+1),[fs[3].name]:fs[3].plan.decodeCompact(r,d+1)});break;
    default:read=(r,d)=>{const value={};for(const f of fs){r.property.value=f.plan.decodeCompact(r,d+1);Object.defineProperty(value,f.name,r.property);}return value;};
   }break;
  }
  case 'option':read=(r,d)=>r.tag()?{Some:p.element.decodeCompact(r,d+1)}:{None:null};break;
  case 'result':read=(r,d)=>r.tag()?{Err:p.error.decodeCompact(r,d+1)}:{Ok:p.ok.decodeCompact(r,d+1)};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return read;
}
function compactDecodeOperation(p){
 if(p.kind==='record'&&p.fields.length===1){
  const field=p.fields[0],read=compactReadOperation(field.plan),name=field.name;
  return (r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');if(d+1>r.depth||--r.remaining<0)throw Error('wire node or depth limit');return {[name]:read(r,d+1)};};
 }
 const read=compactReadOperation(p);
 return (r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');return read(r,d);};
}
class CompactDecodeCursor{
 constructor(bytes,limits,flags){this.bytes=bytes;this.view=flags&2?new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength):null;this.cursor=1;this.remaining=limits.nodes;this.depth=limits.depth;this.property=null;}
 require(n){if(n>this.bytes.length-this.cursor)throw Error('truncated compact value');}
 count(){
  if(this.cursor>=this.bytes.length)throw Error('truncated compact value');
  const first=this.bytes[this.cursor++];if(first<128)return first;
  let value=first&127,scale=128;
  for(let i=1;i<5;i++){if(this.cursor>=this.bytes.length)throw Error('truncated compact value');const byte=this.bytes[this.cursor++];if(i===4&&byte>15)throw Error('compact count overflow');value+=(byte&127)*scale;if(byte<128){if(byte===0)throw Error('noncanonical compact count');return value;}scale*=128;}throw Error('compact count overflow');
 }
 tag(){if(this.cursor>=this.bytes.length)throw Error('truncated compact value');const tag=this.bytes[this.cursor++];if(tag>1)throw Error('wire sum tag');return tag;}
 text(){const n=this.count();this.require(n);const start=this.cursor;this.cursor+=n;return wireDecodeText(this.bytes,start,this.cursor);}
}
function wireInvalidValue(){throw Error('invalid value for wire schema');}
// Capture has the canonical logical meaning of decode(encode(value)), without
// allocating wire bytes. A separate plan leaves validation/decoder hot shapes
// unchanged and never retains host input containers between calls.
function wireCapturePlan(root,checked=true){
 const seen=new WeakMap();
 const build=source=>{
  if(seen.has(source))return seen.get(source);
  const p={kind:source.kind,type:source.type,capture:null};seen.set(source,p);
  if(source.fields)p.fields=source.fields.map(f=>({name:f.name,plan:build(f.plan)}));
  if(source.element)p.element=build(source.element);
  if(source.ok){p.ok=build(source.ok);p.error=build(source.error);}
  p.capture=checked?wireCaptureOperation(p):wireCopyOperation(p);return p;
 };return build(root);
}
function wireCaptureOperation(p){
 const t=p.type;let copy;
 switch(p.kind){
  case 'unit':copy=v=>{if(v!==null)wireInvalidValue();return null;};break;
  case 'bool':copy=(v,r)=>{if(typeof v!=='boolean')wireInvalidValue();r.add(1);return v;};break;
  case 'u32':case 'i32':{
   const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
   copy=(v,r)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();r.add(4);return v===0?0:v;};break;
  }
  case 'u64':copy=(v,r)=>{const kind=typeof v;if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();r.add(8);return n;};break;
  case 'f32':copy=(v,r)=>{let bits;if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();bits=wireFloat.getUint32(0,true);}else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}r.add(4);return {F32Bits:bits===0?0:bits};};break;
  case 'f64':copy=(v,r)=>{const bits=wireF64Bits(v);r.add(8);return {F64Bits:bits.toString()};};break;
  case 'string':case 'int':case 'id':case 'enum':copy=(v,r)=>{const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;if(typeof text!=='string'||!text.isWellFormed()||text.length>r.limit)wireInvalidValue();if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();r.add(wireUtf8Length(text));return p.kind==='int'?{Int:text}:text;};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   copy=(v,r,d)=>{if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();const n=v.length;if(n>r.remaining||size!==null&&n!==size)wireInvalidValue();r.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=element.capture(v[i],r,d+1);return out;};break;
  }
  case 'record':{
   const fs=p.fields;let fields;
   switch(fs.length){
    case 0:fields=()=>({});break;
    case 1:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1)});break;
    case 2:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1)});break;
    case 3:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1)});break;
    case 4:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1),[fs[3].name]:fs[3].plan.capture(v[fs[3].name],r,d+1)});break;
    default:fields=(v,r,d)=>{const out={};for(const f of fs){const value=f.plan.capture(v[f.name],r,d+1);Object.defineProperty(out,f.name,{value,enumerable:true,writable:true,configurable:true});}return out;};
   }
   copy=(v,r,d)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();for(const f of fs)if(!wireOwn(v,f.name))wireInvalidValue();return fields(v,r,d);};break;
  }
  case 'option':copy=(v,r,d)=>{r.add(1);if(wireTagged(v,'None')&&v.None===null)return {None:null};if(wireTagged(v,'Some'))return {Some:p.element.capture(v.Some,r,d+1)};wireInvalidValue();};break;
  case 'result':copy=(v,r,d)=>{r.add(1);if(wireTagged(v,'Ok'))return {Ok:p.ok.capture(v.Ok,r,d+1)};if(wireTagged(v,'Err'))return {Err:p.error.capture(v.Err,r,d+1)};wireInvalidValue();};break;
  default:copy=()=>{throw Error('unsupported wire kind');};
 }
 return (v,r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');r.add(4);return copy(v,r,d);};
}
class WireCaptureCursor{
 constructor(limits){this.remaining=limits.nodes;this.depth=limits.depth;this.limit=limits.bytes;this.bytes=40;this.add(0);}
 add(n){this.bytes+=n;if(this.bytes>this.limit)throw Error('wire byte limit');}
 enter(depth,bytes){if(depth>this.depth||--this.remaining<0)throw Error('wire node or depth limit');this.add(bytes);}
 text(value){if(value.length>this.limit)throw Error('wire byte limit');this.add(wireUtf8Length(value));}
}
// Literal lowerers share this fixed resource policy with logical capture.
export function createValueCaptureBudget(options=wireDefaultOptions){return new WireCaptureCursor(wireLimits(options));}
// The trusted-value API has the same canonical copy and ownership semantics.
// Its caller supplies a stable value accepted by validateValue. Shape/range
// checks remain at external capture boundaries; resource limits still apply.
function wireCopyOperation(p){
 let copy;
 switch(p.kind){
  case 'unit':copy=()=>null;break;
  case 'bool':copy=(v,r)=>{r.add(1);return v;};break;
  case 'u32':copy=(v,r)=>{r.add(4);return v>>>0;};break;
  case 'i32':copy=(v,r)=>{r.add(4);return v|0;};break;
  case 'u64':copy=(v,r)=>{r.add(8);return BigInt(v);};break;
  case 'f32':copy=(v,r)=>{let bits;if(typeof v==='number'){wireFloat.setFloat32(0,v,true);bits=wireFloat.getUint32(0,true);}else bits=v.F32Bits;r.add(4);return {F32Bits:bits===0?0:bits};};break;
  case 'f64':copy=(v,r)=>{const bits=wireF64Bits(v);r.add(8);return {F64Bits:bits.toString()};};break;
  case 'string':case 'id':case 'enum':copy=(v,r)=>{r.add(wireUtf8Length(v));return v;};break;
  case 'int':copy=(v,r)=>{const text=typeof v==='bigint'?v.toString():v.Int;r.add(wireUtf8Length(text));return {Int:text};};break;
  case 'list':case 'vector':copy=(v,r,d)=>{const n=v.length;if(n>r.remaining)throw Error('wire sequence size');r.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=p.element.capture(v[i],r,d+1);return out;};break;
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:copy=()=>({});break;
    case 1:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1)});break;
    case 2:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1)});break;
    case 3:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1)});break;
    case 4:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1),[fs[3].name]:fs[3].plan.capture(v[fs[3].name],r,d+1)});break;
    default:copy=(v,r,d)=>{const out={};for(const f of fs){const value=f.plan.capture(v[f.name],r,d+1);Object.defineProperty(out,f.name,{value,enumerable:true,writable:true,configurable:true});}return out;};
   }break;
  }
  case 'option':copy=(v,r,d)=>{r.add(1);return Object.hasOwn(v,'None')&&v.None===null?{None:null}:{Some:p.element.capture(v.Some,r,d+1)};};break;
  case 'result':copy=(v,r,d)=>{r.add(1);return Object.hasOwn(v,'Ok')?{Ok:p.ok.capture(v.Ok,r,d+1)}:{Err:p.error.capture(v.Err,r,d+1)};};break;
  default:copy=()=>{throw Error('unsupported wire kind');};
 }
 return (v,r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');r.add(4);return copy(v,r,d);};
}
// Emit the cached literal schema with one forward writer. Each value is checked
// where it is consumed; byte bounds belong to the writer, not a second size walk.
function wireEncodeValue(root,value,l,w){
 let remaining=l.nodes;const depthLimit=l.depth;
 const node=(p,v,d)=>{
  if(d>depthLimit||--remaining<0)throw Error('wire node or depth limit');
  const t=p.type,start=w.beginNode();
  switch(p.kind){
   case 'unit':if(v!==null)wireInvalidValue();break;
   case 'bool':if(typeof v!=='boolean')wireInvalidValue();w.byte(+v);break;
   case 'u32':case 'i32':{
    const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
    if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();w.word(v>>>0);break;
   }
   case 'u64':{
    const kind=typeof v;
    if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();
    const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();w.wide(n);break;
   }
   case 'f64':w.wide(wireF64Bits(v));break;
   case 'f32':{
    let bits;
    if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();bits=wireFloat.getUint32(0,true);}
    else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}
    w.word(bits);break;
   }
   case 'string':case 'int':case 'id':case 'enum':{
    const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;
    if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&(typeof text!=='string'||!/^[0-9a-f]{32}$/.test(text))||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();
    w.text(text);break;
   }
   case 'list':case 'vector':{
    if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();
    if(v.length>remaining||p.kind==='vector'&&v.length!==t.size)wireInvalidValue();
    w.count(v.length);for(let i=0;i<v.length;i++)node(p.element,v[i],d+1);break;
   }
   case 'record':{
    const fs=p.fields;
    if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();
    for(let i=0;i<fs.length;i++)if(!wireOwn(v,fs[i].name))wireInvalidValue();
    for(let i=0;i<fs.length;i++){const f=fs[i];node(f.plan,v[f.name],d+1);}break;
   }
   case 'option':{
    if(wireTagged(v,'None')&&v.None===null)w.byte(0);
    else if(wireTagged(v,'Some')){w.byte(1);node(p.element,v.Some,d+1);}else wireInvalidValue();break;
   }
   case 'result':{
    if(wireTagged(v,'Ok')){w.byte(0);node(p.ok,v.Ok,d+1);}
    else if(wireTagged(v,'Err')){w.byte(1);node(p.error,v.Err,d+1);}else wireInvalidValue();break;
   }
   default:throw Error('unsupported wire kind');
  }
  w.endNode(start);
 };
 node(root,value,0);
}
function wireCheckValue(root,value,l){
 let remaining=l.nodes,total=40;
 const add=n=>{total+=n;if(total>l.bytes)throw Error('wire byte limit');};
 const node=(p,v,d)=>{
  while(true){
   if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');
   const t=p.type;
   switch(p.kind){
    case 'unit':if(v!==null)wireInvalidValue();add(4);return;
    case 'bool':if(typeof v!=='boolean')wireInvalidValue();add(5);return;
    case 'u32':case 'i32':{
     const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
     if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();add(8);return;
    }
    case 'u64':{
     const kind=typeof v;
     if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();
     const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();add(12);return;
    }
    case 'f64':wireF64Bits(v);add(12);return;
    case 'f32':{
     if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();}
     else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();const bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}
     add(8);return;
    }
    case 'string':case 'int':case 'id':case 'enum':{
     const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;
     if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes)wireInvalidValue();
     if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();
     add(4+wireUtf8Length(text));return;
    }
    case 'list':case 'vector':{
     if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();
     if(v.length>remaining||p.kind==='vector'&&v.length!==t.size)wireInvalidValue();
     add(8);for(let i=0;i<v.length;i++)node(p.element,v[i],d+1);return;
    }
    case 'record':{
     const fs=p.fields;
     if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();
     for(let i=0;i<fs.length;i++)if(!wireOwn(v,fs[i].name))wireInvalidValue();
     add(4);if(!fs.length)return;
     for(let i=0;i<fs.length-1;i++)node(fs[i].plan,v[fs[i].name],d+1);
     const f=fs[fs.length-1];p=f.plan;v=v[f.name];d++;continue;
    }
    case 'option':{
     if(wireTagged(v,'None')&&v.None===null){add(5);return;}
     if(!wireTagged(v,'Some'))wireInvalidValue();add(5);p=p.element;v=v.Some;d++;continue;
    }
    case 'result':{
     if(wireTagged(v,'Ok')){add(5);p=p.ok;v=v.Ok;}
     else if(wireTagged(v,'Err')){add(5);p=p.error;v=v.Err;}else wireInvalidValue();
     d++;continue;
    }
    default:throw Error('unsupported wire kind');
   }
  }
 };
 node(root,value,0);if(total>l.bytes)throw Error('wire byte limit');
}
// A single cursor replaces per-node child closures and {end,value} temporaries.
// Projection filters limit callback materialisation, never schema validation.
function wireScanValue(root,bytes,view,l,materialize,visitor,selected,spans){
 let cursor=40,remaining=l.nodes;
 const property={value:null,enumerable:true,writable:true,configurable:true};
 const node=(p,parentEnd,d)=>{
  if(d>l.depth||--remaining<0||cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const t=p.type,start=cursor+4,end=start+view.getUint32(cursor,true);if(end>parentEnd)throw Error('truncated wire frame');cursor=start;let value;
  switch(p.kind){
   case 'unit':if(end-start!==0)throw Error('malformed wire scalar');value=null;break;
   case 'bool':if(end-start!==1)throw Error('malformed wire scalar');if(bytes[start]>1)throw Error('invalid wire Bool');value=!!bytes[start];cursor=end;break;
   case 'u32':case 'i32':if(end-start!==4)throw Error('malformed wire scalar');value=p.kind==='u32'?view.getUint32(start,true):view.getInt32(start,true);cursor=end;break;
   case 'f32':if(end-start!==4)throw Error('malformed wire scalar');if(materialize)value={F32Bits:view.getUint32(start,true)};cursor=end;break;
   case 'f64':if(end-start!==8)throw Error('malformed wire scalar');if(materialize)value={F64Bits:view.getBigUint64(start,true).toString()};cursor=end;break;
   case 'u64':if(end-start!==8)throw Error('malformed wire scalar');if(materialize)value=view.getBigUint64(start,true);cursor=end;break;
   case 'string':case 'int':case 'id':case 'enum':{
    if(p.kind==='string'&&!materialize){let i=start;while(i<end&&bytes[i]<128)i++;if(i<end)wireDecoder.decode(bytes.subarray(start,end));}
    else{const text=wireDecodeText(bytes,start,end);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=p.kind==='int'?{Int:text}:text;}
    cursor=end;break;
   }
   case 'list':case 'vector':{
    if(start+4>end)throw Error('wire list count');const n=view.getUint32(start,true);cursor+=4;
    if(n>remaining||n>Math.floor((end-cursor)/4)||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');
    if(materialize)value=[];for(let i=0;i<n;i++){const child=node(p.element,end,d+1);if(materialize)value.push(child);}break;
   }
   case 'record':{
    const fs=p.fields;
    // Computed literal keys create own data properties even for __proto__ or
    // prototype setters. Common small records need no descriptor allocations.
    if(materialize&&fs.length<=4){
     switch(fs.length){case 0:value={};break;case 1:value={[fs[0].name]:node(fs[0].plan,end,d+1)};break;case 2:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1)};break;case 3:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1),[fs[2].name]:node(fs[2].plan,end,d+1)};break;case 4:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1),[fs[2].name]:node(fs[2].plan,end,d+1),[fs[3].name]:node(fs[3].plan,end,d+1)};break;}
    }else{if(materialize)value={};for(const f of fs){const child=node(f.plan,end,d+1);if(materialize){property.value=child;Object.defineProperty(value,f.name,property);}}}break;
   }
   case 'option':case 'result':{
    if(start===end||bytes[cursor]>1)throw Error('wire sum tag');const tag=bytes[cursor++];
    if(p.kind==='option'&&tag===0){if(materialize)value={None:null};}
    else{const label=p.kind==='option'?'Some':tag===0?'Ok':'Err',child=node(p.kind==='option'?p.element:tag===0?p.ok:p.error,end,d+1);if(materialize)value={[label]:child};}break;
   }
   default:throw Error('unsupported wire kind');
  }
  if(cursor!==end)throw Error('trailing wire frame bytes');
  if(visitor&&(!selected||selected.has(t.name))){if(spans)visitor(t,bytes,start,end,d);else visitor(t,bytes.subarray(start,end),d);}
  return value;
 };
 const result=node(root,bytes.length,0);if(cursor!==bytes.length)throw Error('trailing wire bytes');return result;
}
export class ValueCodec{
 #hash;
 #header;
 #headerWords;
 #descriptor;
 #valuePlan;
 #compactCodec;
 #encoder;
 #decodeBound=0;
 #scanPlan=null;
 #capturePlan=null;
 #copyPlan=null;
 get descriptor(){return this.#descriptor;}
 constructor(descriptor){
  // This synchronous path is for compiler-generated immutable metadata. For
  // untrusted descriptors use createValueCodec and compare the computed identity.
  if(descriptor?.format!==valueWireFormat||!/^[0-9a-f]{64}$/.test(descriptor.identity))throw Error('invalid wire schema');
  this.#descriptor=structuredClone(descriptor);this.#hash=Uint8Array.from(descriptor.identity.match(/../g),s=>parseInt(s,16));
  this.#header=new Uint8Array(40);this.#header.set(wireMagic);this.#header.set(this.#hash,8);
  const headerView=new DataView(this.#header.buffer);this.#headerWords=Array.from({length:10},(_,i)=>headerView.getUint32(i*4,true));
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}};freeze(this.descriptor);this.#valuePlan=wireValuePlan(this);
 }
 resolve(t){for(let i=0;i<64;i++){if(t.kind!=='ref')return t;t=this.descriptor.named[t.name];if(!t)throw Error('wire reference');}throw Error('wire reference cycle');}
 validateValue(value,options=wireDefaultOptions){wireCheckValue(this.#valuePlan,value,wireLimits(options));return true;}
 capture(value,options=wireDefaultOptions){const limits=wireLimits(options);this.#capturePlan??=wireCapturePlan(this.#valuePlan);return this.#capturePlan.capture(value,new WireCaptureCursor(limits),0);}
 copy(value,options=wireDefaultOptions){const limits=wireLimits(options);this.#copyPlan??=wireCapturePlan(this.#valuePlan,false);return this.#copyPlan.capture(value,new WireCaptureCursor(limits),0);}
 compact(){return this.#compactCodec??=new CompactValueCodec(this);}
 encode(value,options=wireDefaultOptions){
  const l=wireLimits(options),w=this.#encoder&&!this.#encoder.active?this.#encoder:new WireEncoder(l);
  this.#encoder??=w;w.reset(l);
  try{w.bytes(this.#header);wireEncodeValue(this.#valuePlan,value,l,w);return w.finish();}
  finally{w.active=false;if(w.capacity>4096&&this.#encoder===w)this.#encoder=undefined;}
 }
 encodeWith(emit,options=wireDefaultOptions){
  const w=new WireEncoder(options);w.bytes(wireMagic);w.bytes(this.#hash);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 scan(bytes,options=wireDefaultOptions,materialize=false,visitor=null,names=null,spans=false){
  const l=wireLimits(options);if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<44||bytes.length>l.bytes)throw Error('wire byte limit or header');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<10;i++)if(view.getUint32(i*4,true)!==this.#headerWords[i])throw Error('wire format or schema mismatch');
  if(names!==null&&(!Array.isArray(names)||names.length>100000||names.some(n=>typeof n!=='string')))throw Error('wire visitor names');
  if(materialize&&!visitor){this.#decodeBound||=wireBindDecodePlan(this.#valuePlan);const cursor=new WireDecodeCursor(bytes,view,l);if(this.#decodeBound&1)cursor.property={value:null,enumerable:true,writable:true,configurable:true};const value=this.#valuePlan.decode(cursor,bytes.length,0);if(cursor.cursor!==bytes.length)throw Error('trailing wire bytes');return value;}
  if(!materialize){this.#scanPlan??=wireScanPlan(this.#valuePlan);const cursor=new WireScanCursor(bytes,view,l,visitor,names===null?null:new Set(names),spans),value=this.#scanPlan.scan(cursor,bytes.length,0);if(cursor.cursor!==bytes.length)throw Error('trailing wire bytes');return value;}
  return wireScanValue(this.#valuePlan,bytes,view,l,materialize,visitor,names===null?null:new Set(names),spans);
 }
 visit(bytes,visitor,options=wireDefaultOptions,names=null){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor,names);}
 visitSpans(bytes,visitor,options=wireDefaultOptions,names=null){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor,names,true);}
 validate(bytes,options=wireDefaultOptions){this.scan(bytes,options,false);return true;}
 decode(bytes,options=wireDefaultOptions){return this.scan(bytes,options,true);}
}

// Bounded forward emission avoids building and repeatedly joining child buffers.
class WireEncoder{
 #data=new Uint8Array(256);#view=new DataView(this.#data.buffer);#at=0;#remaining;#depth=0;#byteLimit;#depthLimit;
 active=false;
 constructor(options){this.reset(options);}
 reset(options){const limits=wireLimits(options);this.#byteLimit=limits.bytes;this.#depthLimit=limits.depth;this.#remaining=limits.nodes;this.#depth=0;this.#at=0;this.active=true;}
 get capacity(){return this.#data.length;}
 get position(){return this.#at;}
 beginNode(){const at=this.#at;this.word(0);return at;}
 endNode(at){this.patchWord(at,this.#at-at-4);}
 count(n){this.word(n);}
 beginCount(){const at=this.position;this.count(0);return at;}
 endCount(at,n){this.patchWord(at,n);}
 #reserve(size){
  const end=this.#at+size;if(end>this.#byteLimit)throw Error('wire byte limit');
  if(end>this.#data.length){const next=new Uint8Array(Math.min(this.#byteLimit,Math.max(end,this.#data.length*2)));next.set(this.#data.subarray(0,this.#at));this.#data=next;this.#view=new DataView(next.buffer);}
  return end;
 }
 bytes(bytes){const end=this.#reserve(bytes.length);this.#data.set(bytes,this.#at);this.#at=end;}
 byte(n){if(!Number.isInteger(n)||n<0||n>255)throw Error('wire byte range');this.#reserve(1);this.#data[this.#at++]=n;}
 word(n){if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire word range');const end=this.#reserve(4);this.#view.setUint32(this.#at,n,true);this.#at=end;}
 wide(n){if(typeof n!=='bigint'||n<0n||n>18446744073709551615n)throw Error('wire wide range');const end=this.#reserve(8);this.#view.setBigUint64(this.#at,n,true);this.#at=end;}
 text(text,count=false){
  if(typeof text!=='string')throw Error('wire Unicode');
  if(text.length<=16){
   let ascii=true;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)>=128){ascii=false;break;}
   if(ascii){if(count)this.count(text.length);const end=this.#reserve(text.length);for(let i=0;i<text.length;i++)this.#data[this.#at+i]=text.charCodeAt(i);this.#at=end;return;}
  }
  if(!text.isWellFormed())throw Error('wire Unicode');const size=wireUtf8Length(text);if(count)this.count(size);
  const end=this.#reserve(size),r=wireEncoder.encodeInto(text,this.#data.subarray(this.#at,end));if(r.read!==text.length||r.written!==size)throw Error('wire UTF-8 size');this.#at=end;
 }
 patchWord(at,n){if(!Number.isInteger(at)||at<0||at+4>this.#at||!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire patch offset');this.#view.setUint32(at,n,true);}
 patchByte(at,n){if(!Number.isInteger(at)||at<0||at>=this.#at||!Number.isInteger(n)||n<0||n>255)throw Error('wire patch offset');this.#data[at]=n;}
 replace(at,removed,bytes){
  if(!Number.isInteger(at)||!Number.isInteger(removed)||at<0||removed<0||at+removed>this.#at||!(bytes instanceof Uint8Array))throw Error('wire replacement range');
  const extra=bytes.length-removed,end=extra>0?this.#reserve(extra):this.#at+extra;
  this.#data.copyWithin(at+bytes.length,at+removed,this.#at);this.#data.set(bytes,at);this.#at=end;
 }
 // Literal generated writers use balanced frames without per-node callbacks.
 // An exception abandons this invocation; encodeWith never reuses its writer.
 openFrame(){if(this.#depth>this.#depthLimit||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.beginNode();this.#depth++;return at;}
 closeFrame(at){if(this.#depth===0)throw Error('wire frame boundary');this.#depth--;this.endNode(at);}
 frame(emit){if(this.#depth>this.#depthLimit||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.beginNode();this.#depth++;try{emit(this);}finally{this.#depth--;}this.endNode(at);}
 reorder(start,spans){
  const sorted=spans.slice().sort((a,b)=>a[0]-b[0]);let at=start;
  for(const [a,b] of sorted){if(!Number.isInteger(a)||!Number.isInteger(b)||a!==at||b<a)throw Error('wire span permutation');at=b;}
  if(start<0||start>this.#at||at!==this.#at)throw Error('wire span permutation');
  if(spans.every((s,i)=>s===sorted[i]))return;
  const copy=this.#data.slice(start,this.#at);at=start;for(const [a,b] of spans){this.#data.set(copy.subarray(a-start,b-start),at);at+=b-a;}
 }
 finish(){if(this.#depth!==0)throw Error('wire frame boundary');return this.#data.slice(0,this.#at);}
}

class CompactWireEncoder extends WireEncoder{
 beginNode(){return 0;}
 endNode(){}
 endCount(at,n){
  if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('compact count range');
  if(n<128){this.patchByte(at,n);return;}
  const bytes=[];while(n>=128){bytes.push(n%128+128);n=Math.floor(n/128);}bytes.push(n);this.replace(at,1,Uint8Array.from(bytes));
 }
 count(n){
  if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('compact count range');
  while(n>=128){this.byte(n%128+128);n=Math.floor(n/128);}this.byte(n);
 }
 text(text){super.text(text,true);}
}

function compactScanValue(root,bytes,l,materialize){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let cursor=1,remaining=l.nodes;
 const require=n=>{if(n>bytes.length-cursor)throw Error('truncated compact value');};
 const count=()=>{
  let value=0,scale=1;
  for(let i=0;i<5;i++){
   require(1);const byte=bytes[cursor++];
   if(i===4&&byte>15)throw Error('compact count overflow');
   value+=(byte&127)*scale;
   if(byte<128){if(i>0&&byte===0)throw Error('noncanonical compact count');return value;}
   scale*=128;
  }throw Error('compact count overflow');
 };
 const property={value:null,enumerable:true,writable:true,configurable:true};
 const node=(p,d)=>{
  if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');
  const t=p.type;let value;
  switch(p.kind){
   case 'unit':return null;
   case 'bool':require(1);if(bytes[cursor]>1)throw Error('invalid wire Bool');return !!bytes[cursor++];
   case 'u32':case 'i32':require(4);value=p.kind==='u32'?view.getUint32(cursor,true):view.getInt32(cursor,true);cursor+=4;return value;
   case 'f32':require(4);if(materialize)value={F32Bits:view.getUint32(cursor,true)};cursor+=4;return value;
   case 'f64':require(8);if(materialize)value={F64Bits:view.getBigUint64(cursor,true).toString()};cursor+=8;return value;
   case 'u64':require(8);if(materialize)value=view.getBigUint64(cursor,true);cursor+=8;return value;
   case 'string':case 'int':case 'id':case 'enum':{
    const n=count();require(n);const start=cursor;cursor+=n;
    if(p.kind==='string'&&!materialize){let i=start;while(i<cursor&&bytes[i]<128)i++;if(i<cursor)wireDecoder.decode(bytes.subarray(start,cursor));}
    else{const text=wireDecodeText(bytes,start,cursor);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=p.kind==='int'?{Int:text}:text;}
    return value;
   }
   case 'list':case 'vector':{
    const n=count();if(n>remaining||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');
    if(materialize)value=[];for(let i=0;i<n;i++){const child=node(p.element,d+1);if(materialize)value.push(child);}return value;
   }
   case 'record':{
    const fs=p.fields;
    if(materialize&&fs.length<=4){
     switch(fs.length){case 0:return {};case 1:return {[fs[0].name]:node(fs[0].plan,d+1)};case 2:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1)};case 3:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1),[fs[2].name]:node(fs[2].plan,d+1)};case 4:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1),[fs[2].name]:node(fs[2].plan,d+1),[fs[3].name]:node(fs[3].plan,d+1)};}
    }
    if(materialize)value={};for(const f of fs){const child=node(f.plan,d+1);if(materialize){property.value=child;Object.defineProperty(value,f.name,property);}}return value;
   }
   case 'option':case 'result':{
    require(1);const tag=bytes[cursor++];if(tag>1)throw Error('wire sum tag');
    if(p.kind==='option'&&tag===0)return materialize?{None:null}:undefined;
    const label=p.kind==='option'?'Some':tag===0?'Ok':'Err',child=node(p.kind==='option'?p.element:tag===0?p.ok:p.error,d+1);
    return materialize?{[label]:child}:undefined;
   }
   default:throw Error('unsupported wire kind');
  }
 };
 const value=node(root,0);if(cursor!==bytes.length)throw Error('trailing compact bytes');return value;
}

// General transport codec, independent of source rewrites and checkpoints.
// The sender/receiver must negotiate this exact identity and format. There is
// deliberately no claim that the bytes themselves identify their schema.
export class CompactValueCodec{
 #source;#plan;#encoder;#decodeBound=0;
 get format(){return compactValueWireFormat;}
 get identity(){return this.#source.descriptor.identity;}
 constructor(valueCodec){if(!(valueCodec instanceof ValueCodec))throw Error('compact codec requires a checked value codec');this.#source=valueCodec;this.#plan=wireValuePlan(valueCodec);}
 encode(value,options=wireDefaultOptions){
  const l=wireLimits(options),w=this.#encoder&&!this.#encoder.active?this.#encoder:new CompactWireEncoder(l);
  this.#encoder??=w;w.reset(l);
  try{w.byte(1);wireEncodeValue(this.#plan,value,l,w);return w.finish();}
  finally{w.active=false;if(w.capacity>4096&&this.#encoder===w)this.#encoder=undefined;}
 }
 encodeWith(emit,options=wireDefaultOptions){
  const w=new CompactWireEncoder(options);w.byte(1);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 #scan(bytes,options,materialize){
  const l=wireLimits(options);
  if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<1||bytes.length>l.bytes)throw Error('wire byte limit or header');
  if(bytes[0]!==1)throw Error('compact format mismatch');
  if(materialize){this.#decodeBound||=wireBindDecodePlan(this.#plan,true);const cursor=new CompactDecodeCursor(bytes,l,this.#decodeBound);if(this.#decodeBound&1)cursor.property={value:null,enumerable:true,writable:true,configurable:true};const value=this.#plan.decodeCompact(cursor,0);if(cursor.cursor!==bytes.length)throw Error('trailing compact bytes');return value;}
  return compactScanValue(this.#plan,bytes,l,materialize);
 }
 decode(bytes,options=wireDefaultOptions){return this.#scan(bytes,options,true);}
 validate(bytes,options=wireDefaultOptions){this.#scan(bytes,options,false);return true;}
}

// Compiler materialisers consume already validated bytes synchronously. This
// factory is for trusted emitted code, not untrusted descriptor/callback data.
// The complete generic validator runs before any compiler reader is invoked.
class ValidatedValueReader{
 constructor(bytes,compact){this.bytes=bytes;this.view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);this.cursor=compact?1:40;this.compact=compact;}
 frame(){if(this.compact)return 0;const end=this.cursor+4+this.view.getUint32(this.cursor,true);this.cursor+=4;return end;}
 finish(end){if(!this.compact&&this.cursor!==end)throw Error('compiled reader frame mismatch');}
 byte(){return this.bytes[this.cursor++];}
 word(){const n=this.view.getUint32(this.cursor,true);this.cursor+=4;return n;}
 signed(){const n=this.view.getInt32(this.cursor,true);this.cursor+=4;return n;}
 wide(){const n=this.view.getBigUint64(this.cursor,true);this.cursor+=8;return n;}
 count(){if(!this.compact)return this.word();let n=0,scale=1,byte;do{byte=this.byte();n+=(byte&127)*scale;scale*=128;}while(byte>=128);return n;}
 text(end){const n=this.compact?this.count():end-this.cursor,start=this.cursor;this.cursor+=n;return wireDecodeText(this.bytes,start,this.cursor);}
}
class CompiledCompactValueCodec extends CompactValueCodec{
 #read;
 constructor(source,read){super(source);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){super.validate(bytes,options);const reader=new ValidatedValueReader(bytes,true),value=this.#read(reader);if(reader.cursor!==bytes.length)throw Error('compiled reader trailing bytes');return value;}
}
class CompiledValueCodec extends ValueCodec{
 #read;#compiledCompact=null;
 constructor(descriptor,read){super(descriptor);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){super.validate(bytes,options);const reader=new ValidatedValueReader(bytes,false),value=this.#read(reader);if(reader.cursor!==bytes.length)throw Error('compiled reader trailing bytes');return value;}
 compact(){return this.#compiledCompact??=new CompiledCompactValueCodec(this,this.#read);}
}
export function createCompiledValueCodec(descriptor,read){if(typeof read!=='function')throw Error('compiled value reader required');return new CompiledValueCodec(descriptor,read);}

// Trusted literal materialisers may use this checked reader to validate and
// construct in one traversal. The emitter must use frame/finish at every source
// node, typed text reads and counted sequence reads; arbitrary callbacks do not
// establish a schema correspondence proof. The independent scanner remains the
// validation oracle and the original factory retains its pre-validation path.
function literalValueHeader(identity){
 const bytes=new Uint8Array(40);bytes.set(wireMagic);
 for(let i=0;i<32;i++)bytes[i+8]=parseInt(identity.slice(i*2,i*2+2),16);
 const view=new DataView(bytes.buffer),words=new Uint32Array(10);
 for(let i=0;i<10;i++)words[i]=view.getUint32(i*4,true);
 return words;
}
class CheckedLiteralValueReader {
 constructor(bytes,header,compact,limits){
  if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<(compact?1:44)||bytes.length>limits.bytes)throw Error('wire byte limit or header');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(compact){if(bytes[0]!==1)throw Error('compact format mismatch');}
  else for(let i=0;i<10;i++)if(view.getUint32(i*4,true)!==header[i])throw Error('wire format or schema mismatch');
  this.bytes=bytes;this.view=view;
  this.cursor=compact?1:40;this.compact=compact;this.remaining=limits.nodes;this.depth=limits.depth;this.ends=[];
 }
 require(n){if(this.cursor+n>(this.ends.at(-1)??this.bytes.length))throw Error('truncated wire frame');}
 frame(){
  if(this.ends.length>this.depth||--this.remaining<0)throw Error('wire node or depth limit');
  let end=this.bytes.length;
  if(!this.compact){this.require(4);end=this.cursor+4+this.view.getUint32(this.cursor,true);this.require(end-this.cursor);this.cursor+=4;}
  this.ends.push(end);return this.compact?0:end;
 }
 finish(end){
  if(!this.ends.length||!this.compact&&(this.ends.at(-1)!==end||this.cursor!==end))throw Error('compiled reader frame mismatch');
  this.ends.pop();
 }
 byte(){this.require(1);const value=this.bytes[this.cursor++];if(value>1)throw Error('wire sum tag or Bool');return value;}
 word(){this.require(4);const value=this.view.getUint32(this.cursor,true);this.cursor+=4;return value;}
 signed(){this.require(4);const value=this.view.getInt32(this.cursor,true);this.cursor+=4;return value;}
 wide(){this.require(8);const value=this.view.getBigUint64(this.cursor,true);this.cursor+=8;return value;}
 rawCount(){
  if(!this.compact)return this.word();
  let value=0,scale=1;
  for(let i=0;i<5;i++){
   this.require(1);const byte=this.bytes[this.cursor++];
   if(i===4&&byte>15)throw Error('compact count overflow');
   value+=(byte&127)*scale;
   if(byte<128){if(i>0&&byte===0)throw Error('noncanonical compact count');return value;}
   scale*=128;
  }
  throw Error('compact count overflow');
 }
 count(size){
  const value=this.rawCount();
  if(value>this.remaining||size!==undefined&&value!==size)throw Error('wire sequence size');
  return value;
 }
 text(end,kind='string',variants){
  const size=this.compact?this.rawCount():end-this.cursor;
  this.require(size);const start=this.cursor;this.cursor+=size;
  const value=wireDecodeText(this.bytes,start,this.cursor);
  if(kind==='int'&&!wireDecimal(value)||kind==='id'&&!/^[0-9a-f]{32}$/.test(value)||kind==='enum'&&!variants.includes(value))throw Error('malformed wire text');
  return value;
 }
 complete(){if(this.ends.length||this.cursor!==this.bytes.length)throw Error('compiled reader trailing bytes');}
}
// Compact source nodes have no individual frame ends: retain the same checked
// depth/node order using a counter, with bounds against the complete buffer.
class CheckedCompactLiteralValueReader extends CheckedLiteralValueReader {
 constructor(bytes,limits){super(bytes,null,true,limits);this.level=0;}
 require(n){if(this.cursor+n>this.bytes.length)throw Error('truncated wire frame');}
 frame(){if(this.level>this.depth||--this.remaining<0)throw Error('wire node or depth limit');this.level++;return 0;}
 finish(_end){if(!this.level)throw Error('compiled reader frame mismatch');this.level--;}
 complete(){if(this.level||this.cursor!==this.bytes.length)throw Error('compiled reader trailing bytes');}
}
class FusedCompactValueCodec extends CompactValueCodec {
 #read;
 constructor(source,read){super(source);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){
  const limits=wireLimits(options);
  try{const reader=new CheckedCompactLiteralValueReader(bytes,limits),value=this.#read(reader);reader.complete();return value;}
  catch(error){super.validate(bytes,limits);throw error;}
 }
}
class FusedValueCodec extends ValueCodec {
 #read;#header;#fusedCompact=null;
 constructor(descriptor,read){super(descriptor);this.#read=read;this.#header=literalValueHeader(this.descriptor.identity);}
 decode(bytes,options=wireDefaultOptions){
  const limits=wireLimits(options);
  try{const reader=new CheckedLiteralValueReader(bytes,this.#header,false,limits),value=this.#read(reader);reader.complete();return value;}
  catch(error){super.validate(bytes,limits);throw error;}
 }
 compact(){return this.#fusedCompact??=new FusedCompactValueCodec(this,this.#read);}
}
export function createFusedValueCodec(descriptor,read){if(typeof read!=='function')throw Error('compiled value reader required');return new FusedValueCodec(descriptor,read);}
// JSON text is a boundary adapter to an ordinary recursive Ink datatype.
// No JavaScript Number conversion occurs for JSON numeric tokens.
export function jsonNumberToken(s){return typeof s==='string'&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(s);}
// JSON numeric tokens have an ASCII grammar. Check validated UTF-8 spans
// directly, preserving exact lexemes without allocating a decoded String.
function jsonNumberSpan(bytes,lo,hi){
 let at=lo;if(bytes[at]===45)at++;
 if(at>=hi)return false;
 if(bytes[at]===48)at++;
 else{if(bytes[at]<49||bytes[at]>57)return false;do{at++;}while(at<hi&&bytes[at]>=48&&bytes[at]<=57);}
 if(at<hi&&bytes[at]===46){const start=++at;while(at<hi&&bytes[at]>=48&&bytes[at]<=57)at++;if(at===start)return false;}
 if(at<hi&&(bytes[at]===69||bytes[at]===101)){at++;if(at<hi&&(bytes[at]===43||bytes[at]===45))at++;const start=at;while(at<hi&&bytes[at]>=48&&bytes[at]<=57)at++;if(at===start)return false;}
 return at===hi;
}
const jsonWireEncoder=new TextEncoder();
// Scalar conversion completes before writer callbacks; no per-value byte array.
const jsonFloatScratch=new DataView(new ArrayBuffer(4));
function jsonUtf8Length(text){if(text.length>16&&!/[^\x00-\x7f]/.test(text))return text.length;let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff){bytes+=4;i++;}else bytes+=3;}return bytes;}
const jsonLimits={bytes:16777216,nodes:1000000,depth:128};
const jsonQuoters=new WeakSet();
/** Explicit, bounded reuse of immutable JSON string quotes. Cache payload bytes
 * are UTF-16 storage estimates; entry caps bound separate Map/object overhead.
 * Logical output budgets are charged again on every use, including cache hits.
 */
export function createJsonQuoter({maxEntries=1024,maxBytes=131072}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<0||maxEntries>65536||!Number.isSafeInteger(maxBytes)||maxBytes<0||maxBytes>16777216)throw Error('JSON quote cache budget');
 const entries=new Map();let bytes=0,hits=0,misses=0;
 const token=value=>{
  const prior=entries.get(value);if(prior!==undefined){hits++;return prior;}
  if(typeof value!=='string'||!value.isWellFormed())throw Error('invalid JSON String');
  misses++;const text=JSON.stringify(value),size=2*(value.length+text.length),quoted=Object.freeze({text,utf8Bytes:jsonUtf8Length(text)});
  if(maxEntries&&size<=maxBytes){
   while(entries.size&&(entries.size>=maxEntries||bytes+size>maxBytes)){const key=entries.keys().next().value;bytes-=2*(key.length+entries.get(key).text.length);entries.delete(key);}
   entries.set(value,quoted);bytes+=size;
  }
  return quoted;
 };
 const quoter=Object.freeze({
  token,
  quote(value){return token(value).text;},
  clear(){entries.clear();bytes=0;},
  stats(){return {entries:entries.size,payload_bytes:bytes,hits,misses};},
 });jsonQuoters.add(quoter);return quoter;
}
function checkedJsonLimits(options){const l={...jsonLimits,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>jsonLimits[k])throw Error('JSON hard resource limit');return l;}
function jsonVariant(index,item){let payload=index===0?{}:{item0:item};if(index<5)payload={Ok:payload};for(let i=0;i<index;i++)payload={Err:payload};return {payload};}
export function parseJson(text,options={}){return parseJsonValue(text,options,null);}
function parseJsonValue(text,options,boundary){
 const p=new JsonWireReader(text,options);
 const value=(d,wireDepth=0)=>{
  p.node(d);const c=p.peek();
  if(c==='n'&&text.startsWith('null',p.at)){boundary?.node(0,wireDepth);p.at+=4;return jsonVariant(0,null);}if(c==='t'&&text.startsWith('true',p.at)){boundary?.node(1,wireDepth);p.at+=4;return jsonVariant(1,true);}if(c==='f'&&text.startsWith('false',p.at)){boundary?.node(1,wireDepth);p.at+=5;return jsonVariant(1,false);}
  if(c==='"'){boundary?.node(3,wireDepth);const item=p.string();boundary?.text(item);return jsonVariant(3,item);}
  if(c==='['){boundary?.node(4,wireDepth);p.at++;const xs=[];if(!p.eat(']'))while(true){xs.push(value(d+1,wireDepth+8));if(p.eat(']'))break;if(!p.eat(','))throw Error('JSON array separator');}return jsonVariant(4,xs);}
  if(c==='{'){boundary?.node(5,wireDepth);p.at++;const xs=[],seen=new Set();if(!p.eat('}'))while(true){const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);boundary?.member(key,wireDepth);if(!p.eat(':'))throw Error('JSON object colon');xs.push({key,value:value(d+1,wireDepth+9)});if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON object separator');}return jsonVariant(5,xs);}
  if(c==='-'||c>='0'&&c<='9'){const token=p.number();boundary?.node(2,wireDepth);boundary?.text(token);return jsonVariant(2,token);}
  throw Error('invalid JSON value');
 };
 const out=value(0);p.finish();return out;
}
export function stringifyJson(value,options={}){return stringifyJsonValue(value,options,null);}
function stringifyJsonValue(value,options,boundary){
 const l=checkedJsonLimits(options);let remaining=l.nodes,bytes=0,output='';
 const emit=s=>{bytes+=jsonUtf8Length(s);if(bytes>l.bytes)throw Error('JSON byte limit');output+=s;};
 const write=(v,d,wireDepth=0)=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');if(!v||Object.keys(v).length!==1||!Object.hasOwn(v,'payload'))throw Error('invalid JSON record');let p=v.payload,index=0;
  while(index<5&&p&&Object.hasOwn(p,'Err')){if(Object.keys(p).length!==1||boundary&&Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Err;index++;}
  if(index<5){if(!p||Object.keys(p).length!==1||!Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Ok;}
  if(!p||Object.keys(p).length!==(index===0?0:1)||index>0&&!Object.hasOwn(p,'item0'))throw Error('invalid JSON payload');const item=p.item0;boundary?.node(index,wireDepth);
  switch(index){
   case 0:emit('null');break;
   case 1:if(typeof item!=='boolean')throw Error('invalid JSON Boolean');emit(item?'true':'false');break;
   case 2:if(!jsonNumberToken(item))throw Error('invalid JSON number');boundary?.text(item);emit(item);break;
   case 3:if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');boundary?.text(item);emit(JSON.stringify(item));break;
   case 4:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Array');const count=item.length;let visited=0;emit('[');item.forEach((x,i)=>{visited++;if(i)emit(',');write(x,d+1,wireDepth+8);});if(visited!==count)throw Error('invalid JSON Array');emit(']');break;}
   case 5:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Object');const count=item.length,seen=new Set();let visited=0;emit('{');item.forEach((m,i)=>{visited++;if(!m||Object.keys(m).length!==2||typeof m.key!=='string'||!m.key.isWellFormed()||!Object.hasOwn(m,'value')||boundary&&!Object.hasOwn(m,'key'))throw Error('invalid JSON member');if(seen.has(m.key))throw Error('duplicate JSON object key');seen.add(m.key);boundary?.member(m.key,wireDepth);if(i)emit(',');emit(JSON.stringify(m.key));emit(':');write(m.value,d+1,wireDepth+9);});if(visited!==count)throw Error('invalid JSON Object');emit('}');break;}
  }
 };write(value,0);return output;
}
// The adapter's schema is the fixed recursive JSON library shape checked by
// JsonCodec. Charge its ordinary record/sum/list wire nodes while parsing or
// rendering, rather than interpreting and walking the completed tree again.
function jsonBoundaryBudget(options){
 const l=checkedJsonLimits(options);let remaining=l.nodes,total=40;
 const charge=(nodes,bytes,depth)=>{remaining-=nodes;total+=bytes;if(remaining<0||depth>l.depth)throw Error('wire node or depth limit');if(total>l.bytes)throw Error('wire byte limit');};
 return {
  node(index,depth){charge(index===0?3:index<4?index+4:8,index===0?13:index===1?23:index===2?27:index===3?32:41,depth+(index===0?2:index<4?index+3:7));},
  text(text){charge(0,jsonUtf8Length(text),0);},
  member(key,depth){charge(2,8+jsonUtf8Length(key),depth+9);},
 };
}
function jsonSameSchema(a,b){
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&jsonSameSchema(a[k],b[k]));
}
// Host-object conversion is opt-in and JavaScript-only. Inspect data properties
// rather than invoking getters/toJSON; reflection is not a sandbox for proxies.
function jsonJSKeys(value){
 if(!value||typeof value!=='object')throw Error('expected a plain JavaScript object');
 const prototype=Object.getPrototypeOf(value);
 if(prototype!==Object.prototype&&prototype!==null)throw Error('expected a plain JavaScript object');
 const keys=Reflect.ownKeys(value);
 if(keys.some(k=>typeof k!=='string'))throw Error('JavaScript symbol keys are unsupported');
 return keys;
}
function jsonJSData(value,key){
 const property=Object.getOwnPropertyDescriptor(value,key);
 if(!property||!property.enumerable||!Object.hasOwn(property,'value'))throw Error('expected an enumerable own data property');
 return property.value;
}
function jsonJSRecord(value,names){
 const keys=jsonJSKeys(value);
 if(keys.length!==names.length||keys.some(k=>!names.includes(k)))throw Error('invalid JSON record or variant');
}
function jsonJSArray(value,remaining){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('expected a plain JavaScript array');
 const length=value.length;
 if(length>remaining)throw Error('JSON node limit');
 const keys=Reflect.ownKeys(value);
 if(keys.length!==length+1||keys.some(k=>typeof k!=='string'||k!=='length'&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=length)))throw Error('sparse or decorated JavaScript arrays are unsupported');
 return length;
}
function jsonFromJS(value,options){
 const limits=checkedJsonLimits(options),boundary=jsonBoundaryBudget(limits),active=new WeakSet();let remaining=limits.nodes;
 const text=value=>{if(!value.isWellFormed())throw Error('invalid JSON Unicode');boundary.text(value);return value;};
 const visit=(value,depth,wireDepth)=>{
  if(depth>limits.depth||--remaining<0)throw Error('JSON node or depth limit');
  if(value===null){boundary.node(0,wireDepth);return jsonVariant(0);}
  switch(typeof value){
   case 'boolean':boundary.node(1,wireDepth);return jsonVariant(1,value);
   case 'string':boundary.node(3,wireDepth);return jsonVariant(3,text(value));
   case 'number':
    if(!Number.isFinite(value))throw Error('non-finite JavaScript numbers are unsupported');
    boundary.node(2,wireDepth);return jsonVariant(2,text(Object.is(value,-0)?'-0':String(value)));
   case 'bigint':boundary.node(2,wireDepth);return jsonVariant(2,text(String(value)));
   case 'object':break;
   default:throw Error('unsupported JavaScript value');
  }
  if(active.has(value))throw Error('cyclic JavaScript value');
  active.add(value);
  try{
   if(Array.isArray(value)){
    boundary.node(4,wireDepth);const count=jsonJSArray(value,remaining),items=[];
    for(let i=0;i<count;i++)items.push(visit(jsonJSData(value,String(i)),depth+1,wireDepth+8));
    return jsonVariant(4,items);
   }
   boundary.node(5,wireDepth);const keys=jsonJSKeys(value),members=[];
   if(keys.length>remaining)throw Error('JSON node limit');
   for(const key of keys){
    if(!key.isWellFormed())throw Error('invalid JSON Unicode');
    boundary.member(key,wireDepth);
    members.push({key,value:visit(jsonJSData(value,key),depth+1,wireDepth+9)});
   }
   return jsonVariant(5,members);
  }finally{active.delete(value);}
 };
 return visit(value,0,0);
}
function jsonDecimalKey(token){
 const [,sign,whole,fraction='',exponent='0']=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
 const digits=(whole+fraction).replace(/^0+/,'');
 if(!digits)return '0';
 const trimmed=digits.replace(/0+$/,'');
 return sign+trimmed+'e'+(Number(exponent)-fraction.length+digits.length-trimmed.length);
}
function jsonToJS(value,options){
 const limits=checkedJsonLimits(options),boundary=jsonBoundaryBudget(limits),mode=options?.numbers??'number',active=new WeakSet();let remaining=limits.nodes;
 if(!['number','bigint','string'].includes(mode))throw Error('unknown JavaScript number policy');
 const number=token=>{
  if(!jsonNumberToken(token))throw Error('invalid JSON number');
  boundary.text(token);
  if(mode==='string')return token;
  if(mode==='bigint')return BigInt(jsonInteger(token,4096));
  const result=Number(token);
  if(!Number.isFinite(result)||jsonDecimalKey(token)!==jsonDecimalKey(String(result)))throw Error('JSON number loses precision as JavaScript Number; choose numbers: bigint or string');
  return result;
 };
 const visit=(value,depth,wireDepth)=>{
  if(depth>limits.depth||--remaining<0)throw Error('JSON node or depth limit');
  jsonJSRecord(value,['payload']);
  if(active.has(value))throw Error('cyclic JSON value');
  active.add(value);
  try{
   let payload=jsonJSData(value,'payload'),index=0;
   while(index<5&&Object.hasOwn(payload,'Err')){jsonJSRecord(payload,['Err']);payload=jsonJSData(payload,'Err');index++;}
   if(index<5){jsonJSRecord(payload,['Ok']);payload=jsonJSData(payload,'Ok');}
   jsonJSRecord(payload,index===0?[]:['item0']);boundary.node(index,wireDepth);
   const item=index===0?null:jsonJSData(payload,'item0');
   if(index===0)return null;
   if(index===1){if(typeof item!=='boolean')throw Error('invalid JSON Boolean');return item;}
   if(index===2)return number(item);
   if(index===3){if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');boundary.text(item);return item;}
   const count=jsonJSArray(item,remaining);
   if(index===4){const out=[];for(let i=0;i<count;i++)out.push(visit(jsonJSData(item,String(i)),depth+1,wireDepth+8));return out;}
   const out={},seen=new Set();
   for(let i=0;i<count;i++){
    const member=jsonJSData(item,String(i));jsonJSRecord(member,['key','value']);const key=jsonJSData(member,'key');
    if(typeof key!=='string'||!key.isWellFormed())throw Error('invalid JSON member key');
    if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);boundary.member(key,wireDepth);
    Object.defineProperty(out,key,{value:visit(jsonJSData(member,'value'),depth+1,wireDepth+9),enumerable:true,writable:true,configurable:true});
   }
   return out;
  }finally{active.delete(value);}
 };
 return visit(value,0,0);
}
const jsonConstructionPaths=Object.freeze(Array.from({length:6},(_,index)=>Object.freeze([0,...Array(index).fill(1),...(index<5?[0]:[]),0])));
function parseJsonConstructed(text,options,builder){
 const p=new JsonWireReader(text,options);
 const paths=jsonConstructionPaths;
 const fused=typeof builder.openPath==='function';
 const begin=index=>{if(fused){builder.openPath(paths[index]);return;}for(const choice of paths[index])builder.open(choice);};
 const end=index=>{for(let i=0;i<(fused?1:index<5?index+3:7);i++)builder.close();};
 const leaf=(index,item)=>{if(typeof builder.scalarPath==='function'){builder.scalarPath(paths[index],item);return;}begin(index);builder.scalar(item);end(index);};
 const value=d=>{
  p.node(d);const c=p.peek();
  if(c==='n'&&text.startsWith('null',p.at)){p.at+=4;if(typeof builder.emptyPath==='function')builder.emptyPath(paths[0]);else{begin(0);end(0);}return;}
  if(c==='t'&&text.startsWith('true',p.at)){p.at+=4;leaf(1,true);return;}
  if(c==='f'&&text.startsWith('false',p.at)){p.at+=5;leaf(1,false);return;}
  if(c==='"'){leaf(3,p.string());return;}
  if(c==='['){begin(4);builder.open(0);p.at++;if(!p.eat(']'))while(true){value(d+1);if(p.eat(']'))break;if(!p.eat(','))throw Error('JSON array separator');}builder.close();end(4);return;}
  if(c==='{'){begin(5);builder.open(0);p.at++;const seen=new Set();if(!p.eat('}'))while(true){const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');builder.open(0);builder.scalar(key);value(d+1);builder.close();if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON object separator');}builder.close();end(5);return;}
  if(c==='-'||c>='0'&&c<='9'){const token=p.number();leaf(2,token);return;}
  throw Error('invalid JSON value');
 };
 value(0);p.finish();return builder.finish();
}
const jsonCompiledRenderers=new WeakMap();
function compiledJsonRenderer(json,codec,unwrap){
 if(typeof codec?.reducer!=='function')throw Error('compiled JSON reduction unavailable');
 const source=codec.resolve(codec.descriptor.root),root=json.values.descriptor.root;
 const selected=unwrap&&source.kind==='result'?codec.resolve(source.ok):source;
 if(!jsonSameSchema(root,selected)||unwrap&&source.kind!=='result')throw Error('compiled JSON schema mismatch');
 let variants=root.fields[0].type;const roles=new Map([[root.name,'root']]);
 let member;
 for(let index=0;index<6;index++){
  const branch=index<5?variants.ok:variants;roles.set(branch.name,index);
  if(index===5){member=branch.fields[0].type.element.name;roles.set(member,'member');}
  if(index<5)variants=variants.error;
 }
 const nodeRoles=new Map();
 return codec.reducer((node,index)=>{
  const role=roles.get(node.name);nodeRoles.set(index,role);
  if(node.kind==='record'){
   if(role==='root')return value=>value;
   if(role==='member')return (key,value,context)=>{
    const text=(context.quoter?context.quote(key,true):context.add(JSON.stringify(key)+':'))+value,seen=context.members;
    if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);return text;
   };
   if(role===0)return context=>context.add('null');
   if(role===1)return (value,context)=>context.add(value?'true':'false');
   if(role===2)return (token,context)=>{if(!jsonNumberToken(token))throw Error('invalid JSON number');return context.add(token);};
   if(role===3)return (value,context)=>context.quoter?context.quote(value,false):context.add(JSON.stringify(value));
   if(role===4)return (value,context)=>{context.add('[]');return '['+value+']';};
   if(role===5)return (value,context)=>{context.add('{}');return '{'+value+'}';};
   return ()=>null;
  }
  if(node.kind==='list'||node.kind==='vector'){
   const members=nodeRoles.get(node.children[0])==='member';
   return {
    start:(_length,context)=>{
     const out={text:'',parent:members?context.members:null};
     if(members)context.members=new Set();return out;
    },
    step:(out,value,index,context)=>{out.text+=(index?context.add(','):'')+value;return out;},
    finish:(out,context)=>{if(members)context.members=out.parent;return out.text;},
   };
  }
  if(node.kind==='result'){
   // A Result<Json,E> boundary is explicitly requested by the caller. Ordinary
   // JSON's own sums only propagate an already rendered branch.
   if(unwrap&&nodeRoles.get(node.children[0])==='root')return (tag,value)=>{if(tag)throw Error('JSON result is Err');return value;};
   return (_tag,value)=>value;
  }
  if(node.kind==='string')return value=>{if(!value.isWellFormed())throw Error('invalid JSON String');return value;};
  return value=>value;
 });
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
  }if(!jsonSameSchema(root,valueCodec.resolve({kind:'ref',name:root.name})))throw Error('JSON recursive schema mismatch');this.values=valueCodec;
 }
 parse(text,options={}){return parseJsonValue(text,options,jsonBoundaryBudget(options));}
 parseCompiled(codec,text,options={}){
  if(codec?.identity!==this.values.descriptor.identity||typeof codec.builder!=='function')throw Error('compiled JSON schema mismatch');
  const builder=codec.builder(options);try{return parseJsonConstructed(text,options,builder);}catch(error){builder.abort();throw error;}
 }
 stringify(value,options={}){return stringifyJsonValue(value,options,jsonBoundaryBudget(options));}
 stringifyCompiled(codec,handle,options={}){
  const limits=checkedJsonLimits(options),unwrap=options.unwrapResult===true;
  const quoter=options.quoter;if(quoter!==undefined&&!jsonQuoters.has(quoter))throw Error('JSON quote cache owner mismatch');
  let codecs=jsonCompiledRenderers.get(this);if(!codecs)jsonCompiledRenderers.set(this,codecs=new WeakMap());
  let renderers=codecs.get(codec);if(!renderers)codecs.set(codec,renderers=new Map());
  let render=renderers.get(unwrap);if(!render)renderers.set(unwrap,render=compiledJsonRenderer(this,codec,unwrap));
  let bytes=0;const context={
   quoter,
   add(text){bytes+=jsonUtf8Length(text);if(bytes>limits.bytes)throw Error('JSON byte limit');return text;},
   quote(value,colon){
    if(!quoter)return this.add(JSON.stringify(value)+(colon?':':''));
    const token=quoter.token(value);bytes+=token.utf8Bytes+(colon?1:0);if(bytes>limits.bytes)throw Error('JSON byte limit');return token.text+(colon?':':'');
   },
  };
  const text=render(handle,context,limits);
  return text;
 }
 fromJS(value,options={}){return jsonFromJS(value,options);}
 toJS(value,options={}){return jsonToJS(value,options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,false);}
 parseCompact(text,options={}){return streamJsonBinary(this.values,text,options,false,true);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,true);}
 validateBinary(bytes,options={}){
  const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});let view;
  this.values.visitSpans(bytes,(type,data,start,end)=>{
   view??=new DataView(data.buffer,data.byteOffset,data.byteLength);
   if(type.name===this.numberBranch){const length=view.getUint32(start,true);if(!jsonNumberSpan(data,start+4,start+4+length))throw Error('invalid JSON number token');}
   if(type.name===this.objectBranch){const listEnd=start+4+view.getUint32(start,true),count=view.getUint32(start+4,true),seen=new Set();let at=start+8;for(let i=0;i<count;i++){const memberEnd=at+4+view.getUint32(at,true),keyStart=at+8,keyEnd=keyStart+view.getUint32(at+4,true),key=decoder.decode(data.subarray(keyStart,keyEnd));if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);at=memberEnd;}if(at!==listEnd)throw Error('invalid JSON object frame');}
  },options,[this.numberBranch,this.objectBranch]);return true;

 }
}
function jsonUnpack(value){let p=value.payload,i=0;while(i<5&&Object.hasOwn(p,'Err')){p=p.Err;i++;}return [i,(i<5?p.Ok:p).item0];}
function jsonInteger(token,limit){
 if(!jsonNumberToken(token))throw Error('invalid JSON number');const negative=token[0]==='-',raw=negative?token.slice(1):token,[mantissa,exp='0']=raw.split(/[eE]/);let digits=mantissa.replace('.','');if(/^0+$/.test(digits))return '0';const exponent=Number(exp),fraction=mantissa.includes('.')?mantissa.length-mantissa.indexOf('.')-1:0,shift=exponent-fraction;
 if(!Number.isSafeInteger(exponent)||!Number.isSafeInteger(shift))throw Error('JSON integer exponent limit');
 if(shift<0){const cut=-shift;if(cut>=digits.length||!/^[0]+$/.test(digits.slice(-cut)))throw Error('JSON number is not an integer');digits=digits.slice(0,-cut);}else{if(digits.length+shift>limit)throw Error('JSON integer magnitude limit');digits+='0'.repeat(shift);}
 digits=digits.replace(/^0+/,'');if(digits.length>limit)throw Error('JSON integer magnitude limit');return (negative?'-':'')+digits;
}
function jsonBinary64Value(v){
 if(typeof v==='number')return v;
 const text=v.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))throw Error('invalid F64Bits');
 const bits=BigInt(text);if(bits>18446744073709551615n)throw Error('invalid F64Bits');
 const b=new DataView(new ArrayBuffer(8));b.setBigUint64(0,bits,true);return b.getFloat64(0,true);
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
    case 'f64':{if(kind!==2)fail();const n=Number(item),b=new DataView(new ArrayBuffer(8));if(!Number.isFinite(n))throw Error('JSON f64 overflow');b.setFloat64(0,n,true);return {F64Bits:b.getBigUint64(0,true).toString()};}
    case 'f32':{if(kind!==2)fail();const n=Number(item),b=new DataView(new ArrayBuffer(4));b.setFloat32(0,n,true);if(!Number.isFinite(b.getFloat32(0,true)))throw Error('JSON f32 overflow');return {F32Bits:b.getUint32(0,true)};}
    case 'string':case 'enum':case 'id':if(kind!==3)fail();return item;
    case 'list':case 'vector':if(kind!==4)fail();return item.map(x=>read(t.element,x,d+1));
    case 'record':{if(kind!==5||item.length!==t.fields.length)throw Error('unknown or missing JSON record field');const fields=new Map(item.map(m=>[m.key,m.value])),out={};for(const f of t.fields){if(!fields.has(f.name))throw Error('missing JSON record field');Object.defineProperty(out,f.name,{value:read(f.type,fields.get(f.name),d+1),writable:true,enumerable:true,configurable:true});}return out;}
    case 'option':case 'result':{if(kind!==5||item.length!==1)fail();const m=item[0];if(t.kind==='option'&&m.key==='None'&&jsonUnpack(m.value)[0]===0)return {None:null};const child=t.kind==='option'&&m.key==='Some'?t.element:t.kind==='result'&&m.key==='Ok'?t.ok:t.kind==='result'&&m.key==='Err'?t.error:null;if(!child)fail();return {[m.key]:read(child,m.value,d+1)};}
    default:fail();
   }
  };
  const out=read(this.values.descriptor.root,document,0);this.values.validateValue(out,options);return out;
 }
 encode(value,options={}){
  this.values.validateValue(value,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
  const write=(type,v,d)=>{
   if(d>l.depth||--remaining<0)throw Error('typed JSON resource limit');const t=this.values.resolve(type);
   switch(t.kind){
    case 'unit':return jsonVariant(0);
    case 'bool':return jsonVariant(1,v);
    case 'u32':case 'u64':case 'i32':return jsonVariant(2,String(v));
    case 'int':return jsonVariant(2,typeof v==='bigint'?String(v):v.Int);
    case 'f64':{const n=jsonBinary64Value(v);if(!Number.isFinite(n))throw Error('non-finite f64 cannot encode as JSON');return jsonVariant(2,Object.is(n,-0)?'-0':String(n));}
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
 parseCompact(text,options={}){return streamJsonBinary(this.values,text,options,true,true);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,false);}
}

// Token reader shared by schema-directed and arbitrary-JSON wire emission.
class JsonWireReader{
 constructor(text,options){this.l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>this.l.bytes||jsonUtf8Length(text)>this.l.bytes)throw Error('JSON byte or Unicode limit');this.text=text;this.at=0;this.remaining=this.l.nodes;}
 ws(){while(this.at<this.text.length){const c=this.text.charCodeAt(this.at);if(c!==32&&c!==9&&c!==10&&c!==13)break;this.at++;}}
 peek(){this.ws();return this.text[this.at];}
 eat(c){this.ws();if(this.text[this.at]===c){this.at++;return true;}return false;}
 node(d){if(d>this.l.depth||--this.remaining<0)throw Error('JSON node or depth limit');}
 string(){
  this.ws();const start=this.at;if(this.text[start]!=='"')throw Error('expected JSON string');
  const end=this.text.indexOf('"',start+1);if(end<0)throw Error('unterminated JSON string');
  const raw=this.text.slice(start+1,end);
  if(!raw.includes('\\')&&!/[\x00-\x1f]/.test(raw)){this.at=end+1;return raw;}
  this.at=start+1;while(this.at<this.text.length){if(this.text[this.at]==='"'){this.at++;const v=JSON.parse(this.text.slice(start,this.at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(this.text[this.at]==='\\')this.at+=2;else this.at++;}throw Error('unterminated JSON string');
 }
 number(){const start=this.at;while(this.at<this.text.length){const c=this.text.charCodeAt(this.at);if(!(c>=48&&c<=57||c===45||c===43||c===46||c===101||c===69))break;this.at++;}const token=this.text.slice(start,this.at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return token;}
 leaf(d){this.node(d);const c=this.peek();if(c==='n'&&this.text.startsWith('null',this.at)){this.at+=4;return null;}if(c==='t'&&this.text.startsWith('true',this.at)){this.at+=4;return true;}if(c==='f'&&this.text.startsWith('false',this.at)){this.at+=5;return false;}if(c==='"')return this.string();if(c==='-'||c>='0'&&c<='9')return this.number();throw Error('invalid JSON scalar');}
 finish(){this.ws();if(this.at!==this.text.length)throw Error('trailing JSON text');}
}
function streamJsonBinary(values,text,options,typed,compact=false){
 const p=new JsonWireReader(text,options),utf8=jsonWireEncoder;
 const list=(w,open,close,item)=>{if(!p.eat(open))throw Error('JSON container shape');const at=w.beginCount();let count=0;if(!p.eat(close))while(true){item(w);count++;if(p.eat(close))break;if(!p.eat(','))throw Error('JSON container separator');}w.endCount(at,count);};
 const variant=(w,index,level,emit)=>{if(level<index)w.frame(w=>{w.byte(1);variant(w,index,level+1,emit);});else if(index<5)w.frame(w=>{w.byte(0);w.frame(emit);});else w.frame(emit);};
 const json=(w,d)=>{
  const ch=p.peek(),index=ch==='n'?0:ch==='t'||ch==='f'?1:ch==='-'||ch>='0'&&ch<='9'?2:ch==='"'?3:ch==='['?4:ch==='{'?5:-1;if(index<0)throw Error('invalid JSON value');
  const leaf=index<4?p.leaf(d):null;if(index>=4)p.node(d);
  w.frame(w=>variant(w,index,0,w=>{
   if(index===0)return;if(index===1){w.frame(w=>w.byte(+leaf));return;}
   if(index===2||index===3){w.frame(w=>w.text(leaf));return;}
   w.frame(w=>{if(index===4)list(w,'[',']',w=>json(w,d+1));else{const seen=new Set();list(w,'{','}',w=>{const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');w.frame(w=>{w.frame(w=>w.text(key));json(w,d+1);});});}});
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
    if(t.kind==='option'&&key==='None'){if(p.leaf(d+1)!==null)throw Error('JSON None payload');w.byte(0);}
    else{const child=t.kind==='option'&&key==='Some'?t.element:t.kind==='result'&&key==='Ok'?t.ok:t.kind==='result'&&key==='Err'?t.error:null;if(!child)throw Error('invalid JSON tag');w.byte(key==='Ok'?0:1);read(child,w,d+1);}
    if(!p.eat('}'))throw Error('expected exactly one JSON tag');return;
   }
   const ch=p.peek(),v=p.leaf(d),bad=()=>{throw Error('JSON does not match '+t.kind);};
   if(t.kind==='unit'){if(v!==null)bad();return;}
   if(t.kind==='bool'){if(typeof v!=='boolean')bad();w.byte(+v);return;}
   if(['string','id','enum'].includes(t.kind)){if(ch!=='"')bad();w.text(v);return;}
   if(ch!=='-'&&!(ch>='0'&&ch<='9'))bad();
   if(t.kind==='int'){w.text(jsonInteger(v,4096));return;}
   if(t.kind==='f64'){const n=Number(v);if(!Number.isFinite(n))throw Error('JSON f64 overflow');const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,n,true);w.wide(b.getBigUint64(0,true));}
   else if(t.kind==='f32'){jsonFloatScratch.setFloat32(0,Number(v),true);if(!Number.isFinite(jsonFloatScratch.getFloat32(0,true)))throw Error('JSON f32 overflow');w.word(jsonFloatScratch.getUint32(0,true));}
   else{const n=BigInt(jsonInteger(v,t.kind==='u64'?20:10));if(t.kind==='u64'){if(n<0n||n>18446744073709551615n)bad();w.wide(n);}else if(t.kind==='u32'){if(n<0n||n>4294967295n)bad();w.word(Number(n));}else if(t.kind==='i32'){if(n< -2147483648n||n>2147483647n)bad();w.word(Number(n)>>>0);}else bad();}
  });
 };
 return (compact?values.compact():values).encodeWith(w=>{if(typed)read(values.descriptor.root,w,0);else json(w,0);p.finish();},options);
}

// Render validated bytes in a single traversal; only the final text is owned.
function streamWireJsonText(values,bytes,options,library){
 values.validate(bytes,options);const l=checkedJsonLimits(options),parts=[];let size=0,remaining=l.nodes;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const emit=s=>{size+=jsonUtf8Length(s);if(size>l.bytes)throw Error('JSON byte limit');parts.push(s);};
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
   case 'f64':{const n=dv.getFloat64(p,true);if(!Number.isFinite(n))throw Error('non-finite f64 cannot encode as JSON');emit(Object.is(n,-0)?'-0':String(n));break;}
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

/** Owned, optional read view of arbitrary JSON. Auxiliary indexes contain member
 * offsets only. Logical order, exact number tokens and missing/null remain intact.
 * This does not transparently replace any compiled Ink action or its state.
 */
export function createJsonLookup(text,{stepEntries=16,minReads=4,maxEntries=4096,maxObjects=64,maxIndexBytes=262144,...limits}={}){
 for(const [v,max]of [[stepEntries,4096],[minReads,1000000],[maxEntries,1000000],[maxObjects,256],[maxIndexBytes,16777216]])if(!Number.isSafeInteger(v)||v<0||v>max)throw Error('JSON index budget');
 let root=parseJson(text,limits),indexes=new Map(),entries=0,indexBytes=0;
 const stats={reads:0,writes:0,scanned_members:0,index_hits:0,built_entries:0,invalidations:0};
 function parts(path){
  if(!Array.isArray(path))throw Error('JSON lookup path');const n=path.length;if(n>128)throw Error('JSON lookup path');
  const owned=[];for(let i=0;i<n;i++){const d=Object.getOwnPropertyDescriptor(path,String(i));if(!d||!Object.hasOwn(d,'value'))throw Error('JSON lookup path');const p=d.value;if(!(typeof p==='string'&&p.isWellFormed()&&p.length<=4096)&&!(Number.isSafeInteger(p)&&p>=0))throw Error('JSON lookup path');owned.push(p);}return owned;
 }
 function variant(value){let p=value.payload,index=0;while(index<5&&Object.hasOwn(p,'Err')){p=p.Err;index++;}return {index,item:(index<5?p.Ok:p).item0};}
 function resolve(document,path,indexed){
  let value=document,budget=stepEntries;
  for(let depth=0;depth<path.length;depth++){
   const part=path[depth],v=variant(value);
   if(typeof part==='number'){
    if(v.index!==4)throw Error('expected JSON array');if(part>=v.item.length)return {found:false};value=v.item[part];continue;
   }
   if(v.index!==5)throw Error('expected JSON object');
   const prefix=path.slice(0,depth),key=JSON.stringify(prefix),overhead=128+prefix.reduce((n,p)=>n+(typeof p==='string'?16+p.length*2:8),0);let idx=indexed?indexes.get(key):null;
   if(indexed&&!idx&&indexes.size<maxObjects&&indexBytes+overhead<=maxIndexBytes){idx={path:prefix,reads:0,cursor:0,keys:new Map(),bytes:overhead};indexes.set(key,idx);indexBytes+=overhead;}
   if(idx){
    idx.reads++;
    if(idx.reads>=minReads)while(budget>0&&idx.cursor<v.item.length&&entries<maxEntries){
     const member=v.item[idx.cursor],bytes=64+member.key.length*2;
     if(indexBytes+bytes>maxIndexBytes)break;
     idx.keys.set(member.key,idx.cursor++);idx.bytes+=bytes;indexBytes+=bytes;entries++;stats.built_entries++;budget--;
    }
    if(idx.keys.has(part)){stats.index_hits++;value=v.item[idx.keys.get(part)].value;continue;}
   }
   let found=false;
   for(let i=idx?.cursor??0;i<v.item.length;i++){if(indexed)stats.scanned_members++;if(v.item[i].key===part){value=v.item[i].value;found=true;break;}}
   if(!found)return {found:false};
  }
  return {found:true,value};
 }
 return {
  lookup(path){stats.reads++;const r=resolve(root,parts(path),true);return r.found?{found:true,value:structuredClone(r.value)}:r;},
  set(path,key,text){
   path=parts(path);if(typeof key!=='string'||!key.isWellFormed())throw Error('JSON object key');
   const replacement=parseJson(text,limits),next=structuredClone(root),r=resolve(next,path,false);
   if(!r.found)throw Error('JSON update path missing');const object=variant(r.value);if(object.index!==5)throw Error('expected JSON object');
   const members=[{key,value:replacement},...object.item.filter(m=>m.key!==key)];
   // Validate the complete resulting document before publishing a write.
   let payload=r.value.payload;for(let i=0;i<5;i++)payload=payload.Err;payload.item0=members;
   stringifyJson(next,limits);root=next;stats.writes++;
   for(const [id,idx]of indexes)if(idx.path.length>=path.length&&path.every((p,i)=>p===idx.path[i])){entries-=idx.keys.size;indexBytes-=idx.bytes;indexes.delete(id);stats.invalidations++;}
  },
  replace(text){const next=parseJson(text,limits);root=next;stats.writes++;stats.invalidations+=indexes.size;indexes.clear();entries=0;indexBytes=0;},
  stringify(){return stringifyJson(root,limits);},
  stats(){return {...stats,index_entries:entries,index_objects:indexes.size,index_bytes:indexBytes};}
 };
}
function __ownedValue8(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue0(value[i],budget,depth+1);return out;}
function __ownedValue1(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue2(value.Ok,budget,depth+1)}:{Err:__ownedValue4(value.Err,budget,depth+1)};}
function __ownedValue9(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue10(value.Ok,budget,depth+1)}:{Err:__ownedValue4(value.Err,budget,depth+1)};}
function __ownedValue5(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue0(value.Ok,budget,depth+1)}:{Err:__ownedValue4(value.Err,budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["b0"]:__ownedValue3(value["b0"],budget,depth+1),["b1"]:__ownedValue3(value["b1"],budget,depth+1),["b2"]:__ownedValue3(value["b2"],budget,depth+1),["b3"]:__ownedValue3(value["b3"],budget,depth+1),["b4"]:__ownedValue3(value["b4"],budget,depth+1),["b5"]:__ownedValue3(value["b5"],budget,depth+1),["b6"]:__ownedValue3(value["b6"],budget,depth+1),["b7"]:__ownedValue3(value["b7"],budget,depth+1)};}
function __ownedValue10(value,budget,depth){budget.enter(depth,4);return {["value"]:__ownedValue0(value["value"],budget,depth+1),["gradient"]:__ownedValue2(value["gradient"],budget,depth+1)};}
function __ownedValue6(value,budget,depth){budget.enter(depth,4);return {["value"]:__ownedValue0(value["value"],budget,depth+1),["id"]:__ownedValue7(value["id"],budget,depth+1)};}
function __ownedValue3(value,budget,depth){budget.enter(depth,4);return {["w0"]:__ownedValue0(value["w0"],budget,depth+1),["w1"]:__ownedValue0(value["w1"],budget,depth+1),["w2"]:__ownedValue0(value["w2"],budget,depth+1),["w3"]:__ownedValue0(value["w3"],budget,depth+1),["w4"]:__ownedValue0(value["w4"],budget,depth+1),["w5"]:__ownedValue0(value["w5"],budget,depth+1),["w6"]:__ownedValue0(value["w6"],budget,depth+1),["w7"]:__ownedValue0(value["w7"],budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __ownedValue4(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue7(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["block",__ownedValue0],["energy",__ownedValue0],["derivatives",__ownedValue1],["linearized",__ownedValue5],["update",__ownedValue2],["step",__ownedValue2],["__ink_reverse_0_constant",__ownedValue6],["__ink_reverse_0_backward",__ownedValue8],["__ink_reverse_95",__ownedValue1],["__ink_reverse_173",__ownedValue9]]));
function __wireValue1(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue2(reader);reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue4(reader);reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue14(reader)}:{Ok:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue14(reader)}:{Ok:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue14(reader)}:{Ok:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={["b0"]:__wireValue11(reader),["b1"]:__wireValue11(reader),["b2"]:__wireValue11(reader),["b3"]:__wireValue11(reader),["b4"]:__wireValue11(reader),["b5"]:__wireValue11(reader),["b6"]:__wireValue11(reader),["b7"]:__wireValue11(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["nodes"]:__wireValue1(reader),["output"]:__wireValue5(reader),["stopZero"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={["op"]:__wireValue3(reader),["a"]:__wireValue3(reader),["b"]:__wireValue3(reader),["av"]:__wireValue4(reader),["bv"]:__wireValue4(reader),["value"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value={["value"]:__wireValue4(reader),["gradient"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["value"]:__wireValue4(reader),["id"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={["value"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["__ink_reverse_168"]:__wireValue3(reader),["__ink_reverse_169"]:__wireValue6(reader),["target"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["__ink_reverse_90"]:__wireValue3(reader),["__ink_reverse_91"]:__wireValue6(reader),["target"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["g"]:__wireValue10(reader),["rate"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["target"]:__wireValue4(reader),["maximum"]:__wireValue3(reader),["stop"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["target"]:__wireValue4(reader),["rate"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["w"]:__wireValue10(reader),["target"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value={["w"]:__wireValue11(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["w0"]:__wireValue4(reader),["w1"]:__wireValue4(reader),["w2"]:__wireValue4(reader),["w3"]:__wireValue4(reader),["w4"]:__wireValue4(reader),["w5"]:__wireValue4(reader),["w6"]:__wireValue4(reader),["w7"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["__ink_reverse_0_backward",[__wireValue0,__wireValue7]],["__ink_reverse_0_constant",[__wireValue8,__wireValue5]],["__ink_reverse_173",[__wireValue9,__wireValue12]],["__ink_reverse_95",[__wireValue15,__wireValue16]],["block",[__wireValue17,__wireValue4]],["derivatives",[__wireValue18,__wireValue16]],["energy",[__wireValue19,__wireValue4]],["linearized",[__wireValue18,__wireValue20]],["step",[__wireValue21,__wireValue10]],["update",[__wireValue22,__wireValue10]]]));
const __ownedImplementations=Object.freeze(Object.fromEntries([["block",(()=>{const c0=__representation(__inputTypes[0].types[0],false,__inputTypes[0].capture[0]);const input=[c0],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity)return __fn0;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn0(...values);};return function(a0){if(arguments.length!==1)return fallback(...arguments);const context=(needsContext)?new WeakMap():null;const v0=c0(a0,context);return __fn0(v0);};})()],
["energy",(()=>{const c0=__representation(__inputTypes[1].types[0],false,__inputTypes[1].capture[0]);const c1=__representation(__inputTypes[1].types[1],false,__inputTypes[1].capture[1]);const input=[c0,c1],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity)return __fn1;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn1(...values);};return function(a0,a1){if(arguments.length!==2)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);return __fn1(v0,v1);};})()],
["derivatives",(()=>{const c0=__representation(__inputTypes[2].types[0],false,__inputTypes[2].capture[0]);const c1=__representation(__inputTypes[2].types[1],false,__inputTypes[2].capture[1]);const c2=__representation(__inputTypes[2].types[2],false,__inputTypes[2].capture[2]);const c3=__representation(__inputTypes[2].types[3],false,__inputTypes[2].capture[3]);const input=[c0,c1,c2,c3],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity&&c3===__identity)return __fn2;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn2(...values);};return function(a0,a1,a2,a3){if(arguments.length!==4)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object')+Number(c3!==__identity&&a3!==null&&typeof a3==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);const v3=c3(a3,context);return __fn2(v0,v1,v2,v3);};})()],
["linearized",(()=>{const c0=__representation(__inputTypes[3].types[0],false,__inputTypes[3].capture[0]);const c1=__representation(__inputTypes[3].types[1],false,__inputTypes[3].capture[1]);const c2=__representation(__inputTypes[3].types[2],false,__inputTypes[3].capture[2]);const c3=__representation(__inputTypes[3].types[3],false,__inputTypes[3].capture[3]);const input=[c0,c1,c2,c3],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity&&c3===__identity)return __fn3;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn3(...values);};return function(a0,a1,a2,a3){if(arguments.length!==4)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object')+Number(c3!==__identity&&a3!==null&&typeof a3==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);const v3=c3(a3,context);return __fn3(v0,v1,v2,v3);};})()],
["update",(()=>{const c0=__representation(__inputTypes[4].types[0],false,__inputTypes[4].capture[0]);const c1=__representation(__inputTypes[4].types[1],false,__inputTypes[4].capture[1]);const c2=__representation(__inputTypes[4].types[2],false,__inputTypes[4].capture[2]);const input=[c0,c1,c2],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity||c1!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity)return __fn4;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn4(...values);};return function(a0,a1,a2){if(arguments.length!==3)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);return __fn4(v0,v1,v2);};})()],
["step",(()=>{const c0=__representation(__inputTypes[5].types[0],false,__inputTypes[5].capture[0]);const c1=__representation(__inputTypes[5].types[1],false,__inputTypes[5].capture[1]);const c2=__representation(__inputTypes[5].types[2],false,__inputTypes[5].capture[2]);const input=[c0,c1,c2],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity)return __fn5;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn5(...values);};return function(a0,a1,a2){if(arguments.length!==3)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);return __fn5(v0,v1,v2);};})()],
["__ink_reverse_0_constant",(()=>{const c0=__representation(__inputTypes[6].types[0],false,__inputTypes[6].capture[0]);const input=[c0],needsInput=input.some(c=>c!==__identity);const needsContext=false;if(c0===__identity)return __fn6;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn6(...values);};return function(a0){if(arguments.length!==1)return fallback(...arguments);const context=(needsContext)?new WeakMap():null;const v0=c0(a0,context);return __fn6(v0);};})()],
["__ink_reverse_0_backward",(()=>{const c0=__representation(__inputTypes[14].types[0],false,__inputTypes[14].capture[0]);const c1=__representation(__inputTypes[14].types[1],false,__inputTypes[14].capture[1]);const c2=__representation(__inputTypes[14].types[2],false,__inputTypes[14].capture[2]);const input=[c0,c1,c2],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity||c1!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity)return __fn14;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn14(...values);};return function(a0,a1,a2){if(arguments.length!==3)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);return __fn14(v0,v1,v2);};})()],
["__ink_reverse_95",(()=>{const c0=__representation(__inputTypes[17].types[0],false,__inputTypes[17].capture[0]);const c1=__representation(__inputTypes[17].types[1],false,__inputTypes[17].capture[1]);const c2=__representation(__inputTypes[17].types[2],false,__inputTypes[17].capture[2]);const c3=__representation(__inputTypes[17].types[3],false,__inputTypes[17].capture[3]);const input=[c0,c1,c2,c3],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity&&c3===__identity)return __fn17;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn17(...values);};return function(a0,a1,a2,a3){if(arguments.length!==4)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object')+Number(c3!==__identity&&a3!==null&&typeof a3==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);const v3=c3(a3,context);return __fn17(v0,v1,v2,v3);};})()],
["__ink_reverse_173",(()=>{const c0=__representation(__inputTypes[18].types[0],false,__inputTypes[18].capture[0]);const c1=__representation(__inputTypes[18].types[1],false,__inputTypes[18].capture[1]);const c2=__representation(__inputTypes[18].types[2],false,__inputTypes[18].capture[2]);const c3=__representation(__inputTypes[18].types[3],false,__inputTypes[18].capture[3]);const input=[c0,c1,c2,c3],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity&&c3===__identity)return __fn18;const fallback=(...args)=>{const context=new WeakMap();const values=needsInput?args.map((v,i)=>input[i](v,context)):args;return __fn18(...values);};return function(a0,a1,a2,a3){if(arguments.length!==4)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object')+Number(c3!==__identity&&a3!==null&&typeof a3==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);const v3=c3(a3,context);return __fn18(v0,v1,v2,v3);};})()]]));

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze(Object.hasOwn(__wireReaders,name)?{arguments:createCompiledValueCodec(s.arguments,__wireReaders[name][0]),result:createCompiledValueCodec(s.result,__wireReaders[name][1])}:{arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
function __callEncoded(name,bytes,limits,compact){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const input=compact?codecs.arguments.compact():codecs.arguments,output=compact?codecs.result.compact():codecs.result;
 const entry=__compiledEntries.get(name);
 if(entry){
  const slot=compact?1:0;
  entry.argumentCodecs[slot]??=(entry.boundaryReaders[slot]?createFusedValueCodec:createCompiledValueCodec)(metadata.wire.functions[name].arguments,entry.arguments);
  const decoder=entry.argumentCodecs[slot];
  const values=(compact?decoder.compact():decoder).decode(bytes,limits),args=f.params.map(p=>values[p.name]);
  if(entry.precondition!==null&&__implementations[entry.precondition](...args)!==true)throw Error('contract precondition failed');
  return __compiledEncodeResult(entry,__implementations[entry.index](...args),limits,compact);
 }
 const values=input.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return output.encode(result,limits);
}
export function callBinary(name,bytes,limits={}){return __callEncoded(name,bytes,limits,false);}
export function callCompact(name,bytes,limits={}){return __callEncoded(name,bytes,limits,true);}
// Same stable, well-typed caller inputs as call; the result owns every container.
// The checked source return type justifies trusted copying, not arbitrary input.
export function callOwned(name,args,limits={}){
 if(!Object.hasOwn(__ownedFunctions,name)||!Object.hasOwn(functions,name))throw Error('unsupported owned function');
 const result=__ownedImplementations[name](...args);return __ownedFunctions[name](result,createValueCaptureBudget(limits),0);
}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture10(value[i],budget,depth+1);return out;}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture1(value[i],budget,depth+1);return out;}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture2(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture13(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture1(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==8){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b0")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b1")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b2")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b3")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b4")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b5")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b6")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b7")){throw Error('invalid value for wire schema');}return {["b0"]:__privateCapture0(value["b0"],budget,depth+1),["b1"]:__privateCapture0(value["b1"],budget,depth+1),["b2"]:__privateCapture0(value["b2"],budget,depth+1),["b3"]:__privateCapture0(value["b3"],budget,depth+1),["b4"]:__privateCapture0(value["b4"],budget,depth+1),["b5"]:__privateCapture0(value["b5"],budget,depth+1),["b6"]:__privateCapture0(value["b6"],budget,depth+1),["b7"]:__privateCapture0(value["b7"],budget,depth+1)};}
function __privateCapture10(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"op")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"a")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"av")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"bv")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}return {["op"]:__privateCapture3(value["op"],budget,depth+1),["a"]:__privateCapture3(value["a"],budget,depth+1),["b"]:__privateCapture3(value["b"],budget,depth+1),["av"]:__privateCapture1(value["av"],budget,depth+1),["bv"]:__privateCapture1(value["bv"],budget,depth+1),["value"]:__privateCapture1(value["value"],budget,depth+1)};}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gradient")){throw Error('invalid value for wire schema');}return {["value"]:__privateCapture1(value["value"],budget,depth+1),["gradient"]:__privateCapture2(value["gradient"],budget,depth+1)};}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"id")){throw Error('invalid value for wire schema');}return {["value"]:__privateCapture1(value["value"],budget,depth+1),["id"]:__privateCapture3(value["id"],budget,depth+1)};}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==8){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w0")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w1")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w2")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w3")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w4")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w5")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w6")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"w7")){throw Error('invalid value for wire schema');}return {["w0"]:__privateCapture1(value["w0"],budget,depth+1),["w1"]:__privateCapture1(value["w1"],budget,depth+1),["w2"]:__privateCapture1(value["w2"],budget,depth+1),["w3"]:__privateCapture1(value["w3"],budget,depth+1),["w4"]:__privateCapture1(value["w4"],budget,depth+1),["w5"]:__privateCapture1(value["w5"],budget,depth+1),["w6"]:__privateCapture1(value["w6"],budget,depth+1),["w7"]:__privateCapture1(value["w7"],budget,depth+1)};}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return __nfFromBits(bits);}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue15(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue16(reader);reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue1(reader);reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue21(reader)};reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value={["b0"]:__privateWireValue0(reader),["b1"]:__privateWireValue0(reader),["b2"]:__privateWireValue0(reader),["b3"]:__privateWireValue0(reader),["b4"]:__privateWireValue0(reader),["b5"]:__privateWireValue0(reader),["b6"]:__privateWireValue0(reader),["b7"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value={["nodes"]:__privateWireValue15(reader),["output"]:__privateWireValue13(reader),["stopZero"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["op"]:__privateWireValue5(reader),["a"]:__privateWireValue5(reader),["b"]:__privateWireValue5(reader),["av"]:__privateWireValue1(reader),["bv"]:__privateWireValue1(reader),["value"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["value"]:__privateWireValue1(reader),["gradient"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value={["value"]:__privateWireValue1(reader),["id"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value={["value"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["__ink_reverse_168"]:__privateWireValue5(reader),["__ink_reverse_169"]:__privateWireValue6(reader),["target"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["__ink_reverse_90"]:__privateWireValue5(reader),["__ink_reverse_91"]:__privateWireValue6(reader),["target"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["g"]:__privateWireValue3(reader),["rate"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["target"]:__privateWireValue1(reader),["maximum"]:__privateWireValue5(reader),["stop"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["target"]:__privateWireValue1(reader),["rate"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value={["w"]:__privateWireValue3(reader),["target"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["w"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value={["w0"]:__privateWireValue1(reader),["w1"]:__privateWireValue1(reader),["w2"]:__privateWireValue1(reader),["w3"]:__privateWireValue1(reader),["w4"]:__privateWireValue1(reader),["w5"]:__privateWireValue1(reader),["w6"]:__privateWireValue1(reader),["w7"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value=__nfFromBits(reader.word());reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue10(value[i],budget,depth+1);return out;}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue1(value[i],budget,depth+1);return out;}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue2(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue13(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue1(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,4);return {["b0"]:__compiledOwnedValue0(value["b0"],budget,depth+1),["b1"]:__compiledOwnedValue0(value["b1"],budget,depth+1),["b2"]:__compiledOwnedValue0(value["b2"],budget,depth+1),["b3"]:__compiledOwnedValue0(value["b3"],budget,depth+1),["b4"]:__compiledOwnedValue0(value["b4"],budget,depth+1),["b5"]:__compiledOwnedValue0(value["b5"],budget,depth+1),["b6"]:__compiledOwnedValue0(value["b6"],budget,depth+1),["b7"]:__compiledOwnedValue0(value["b7"],budget,depth+1)};}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,4);return {["op"]:__compiledOwnedValue3(value["op"],budget,depth+1),["a"]:__compiledOwnedValue3(value["a"],budget,depth+1),["b"]:__compiledOwnedValue3(value["b"],budget,depth+1),["av"]:__compiledOwnedValue1(value["av"],budget,depth+1),["bv"]:__compiledOwnedValue1(value["bv"],budget,depth+1),["value"]:__compiledOwnedValue1(value["value"],budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,4);return {["value"]:__compiledOwnedValue1(value["value"],budget,depth+1),["gradient"]:__compiledOwnedValue2(value["gradient"],budget,depth+1)};}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);return {["value"]:__compiledOwnedValue1(value["value"],budget,depth+1),["id"]:__compiledOwnedValue3(value["id"],budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,4);return {["w0"]:__compiledOwnedValue1(value["w0"],budget,depth+1),["w1"]:__compiledOwnedValue1(value["w1"],budget,depth+1),["w2"]:__compiledOwnedValue1(value["w2"],budget,depth+1),["w3"]:__compiledOwnedValue1(value["w3"],budget,depth+1),["w4"]:__compiledOwnedValue1(value["w4"],budget,depth+1),["w5"]:__compiledOwnedValue1(value["w5"],budget,depth+1),["w6"]:__compiledOwnedValue1(value["w6"],budget,depth+1),["w7"]:__compiledOwnedValue1(value["w7"],budget,depth+1)};}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __destinationOwnedValue0(value,budget,depth){budget.enter(depth,8);return __nfOutput(value);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite10(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite1(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite2(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite13(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite1(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();__privateWireWrite0(writer,value["b0"],compact);__privateWireWrite0(writer,value["b1"],compact);__privateWireWrite0(writer,value["b2"],compact);__privateWireWrite0(writer,value["b3"],compact);__privateWireWrite0(writer,value["b4"],compact);__privateWireWrite0(writer,value["b5"],compact);__privateWireWrite0(writer,value["b6"],compact);__privateWireWrite0(writer,value["b7"],compact);writer.closeFrame(frame);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["op"],compact);__privateWireWrite3(writer,value["a"],compact);__privateWireWrite3(writer,value["b"],compact);__privateWireWrite1(writer,value["av"],compact);__privateWireWrite1(writer,value["bv"],compact);__privateWireWrite1(writer,value["value"],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["value"],compact);__privateWireWrite2(writer,value["gradient"],compact);writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["value"],compact);__privateWireWrite3(writer,value["id"],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["w0"],compact);__privateWireWrite1(writer,value["w1"],compact);__privateWireWrite1(writer,value["w2"],compact);__privateWireWrite1(writer,value["w3"],compact);__privateWireWrite1(writer,value["w4"],compact);__privateWireWrite1(writer,value["w5"],compact);__privateWireWrite1(writer,value["w6"],compact);__privateWireWrite1(writer,value["w7"],compact);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();writer.word(__nfBits(value));writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
// Handles have no mutable private payload surface. Membership and type identity
// are checked by this module's closure; copied/foreign objects cannot forge them.
const __compiledHandles=new WeakMap();
const __compiledBindings=new WeakMap();
function __compiledHandle(identity,value,guaranteed=false){
 const handle=Object.freeze(Object.create(null));
 __compiledHandles.set(handle,{identity,value,guaranteed});return handle;
}
function __compiledEntry(handle,identity){
 const entry=__compiledHandles.get(handle);
 if(!entry||entry.identity!==identity)throw Error('compiled value type or owner mismatch');
 return entry;
}
function __compiledUnwrap(handle,identity){return __compiledEntry(handle,identity).value;}
// Emit the portable schema's framing/scalar events without creating a buffer
// or exposing private composite nodes. Only this wrapper receives callbacks
// from the literal writer; host visitors never receive those closures.
function __compiledValueEvents(sink,limits){
 const methods=['begin','end','byte','word','wide','text','count'];
 for(const name of methods)if(typeof sink?.[name]!=='function')throw Error('compiled value visitor method: '+name);
 const budget=createValueCaptureBudget(limits);let depth=0,closed=false;
 const active=()=>{if(closed)throw Error('compiled value visitor is closed');};
 const writer=Object.freeze({
  openFrame(){active();budget.enter(depth,4);depth++;sink.begin();return 0;}
  ,closeFrame(){active();if(depth===0)throw Error('wire frame boundary');try{sink.end();}finally{depth--;}}
  ,frame(emit){active();budget.enter(depth,4);depth++;sink.begin();try{emit();sink.end();}finally{depth--;}}
  ,byte(value){active();budget.add(1);sink.byte(value);}
  ,word(value){active();budget.add(4);sink.word(value);}
  ,wide(value){active();budget.add(8);sink.wide(value);}
  ,text(value){active();budget.text(value);sink.text(value);}
  ,count(value){active();budget.add(4);if(value>budget.remaining)throw Error('wire sequence size');sink.count(value);}
 });
 return {writer,close(){closed=true;}};
}
function __compiledReduction(factory,root,reduce,identity){
 if(typeof factory!=='function')throw Error('compiled reduction factory');
 const reducers=[],seen=new Set(),nodes=__reductionNodes();
 const prepare=index=>{
  if(seen.has(index))return;seen.add(index);
  const node=nodes[index];
  for(const child of node.children)prepare(child);
  const reducer=factory(node,index);
  if(node.kind==='list'||node.kind==='vector'){
   const start=reducer?.start,step=reducer?.step,finish=reducer?.finish;
   if(typeof start!=='function'||typeof step!=='function'||typeof finish!=='function')throw Error('compiled collection reduction');
   reducers[index]=Object.freeze({start,step,finish});
  }else{
   if(typeof reducer!=='function')throw Error('compiled value reduction');
   reducers[index]=reducer;
  }
 };
 prepare(root);Object.freeze(reducers);
 return Object.freeze(function(handle,context,limits={}){
  const value=__compiledUnwrap(handle,identity),budget=createValueCaptureBudget(limits);
  return reduce(value,reducers,budget,0,context);
 });
}
function __compiledCodec(schema,capture,read,write,copy,constructorRoot,reductionRoot,reduce,portableFused=false,compactFused=false){
 const privateCodec=createCompiledValueCodec(schema,read),publicCodec=privateCodec;
 let fusedCodec;const fused=()=>fusedCodec??=createFusedValueCodec(schema,read);
 const identity=schema.identity;
 const codec=Object.freeze({
  identity,
  descriptor:publicCodec.descriptor,
  resolve(type){return publicCodec.resolve(type);},
  capture(value,limits={}){
   return __compiledHandle(identity,capture(value,createValueCaptureBudget(limits),0));
  },
  decode(bytes,limits={}){return __compiledHandle(identity,(portableFused?fused():privateCodec).decode(bytes,limits));},
  decodeCompact(bytes,limits={}){return __compiledHandle(identity,(compactFused?fused():privateCodec).compact().decode(bytes,limits));},
  decodeFused(bytes,limits={}){return __compiledHandle(identity,fused().decode(bytes,limits));},
  decodeCompactFused(bytes,limits={}){return __compiledHandle(identity,fused().compact().decode(bytes,limits));},
  encode(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.encodeWith(writer=>write(writer,value,false),limits);},
  encodeCompact(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.compact().encodeWith(writer=>write(writer,value,true),limits);},
  materialize(handle,limits={}){return copy(__compiledUnwrap(handle,identity),createValueCaptureBudget(limits),0);},
  builder(limits={}){return __valueBuilder(__constructorNodes(),constructorRoot,identity,limits);},
  reducer(factory){return __compiledReduction(factory,reductionRoot,reduce,identity);},
  visit(handle,sink,limits={}){
   const value=__compiledUnwrap(handle,identity),events=__compiledValueEvents(sink,limits);
   try{write(events.writer,value,false);}finally{events.close();}
  },
 });
 __compiledBindings.set(codec,{publicCodec,write,capture});return codec;
}

function __compiledEncodeResult(entry,value,limits,compact){
 const {publicCodec,write}=__compiledBindings.get(entry.result());
 return (compact?publicCodec.compact():publicCodec).encodeWith(writer=>write(writer,value,compact),limits);
}
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'record',fields:["w0","w1","w2","w3","w4","w5","w6","w7"],patterns:[{bytes:4,label:"record",children:[1,1,1,1,1,1,1,1],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["w0"]:values[0],["w1"]:values[1],["w2"]:values[2],["w3"]:values[3],["w4"]:values[4],["w5"]:values[5],["w6"]:values[6],["w7"]:values[7]})}]},{kind:"f32",scalar:__privateCapture1},{kind:'record',fields:["b0","b1","b2","b3","b4","b5","b6","b7"],patterns:[{bytes:4,label:"record",children:[0,0,0,0,0,0,0,0],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["b0"]:values[0],["b1"]:values[1],["b2"]:values[2],["b3"]:values[3],["b4"]:values[4],["b5"]:values[5],["b6"]:values[6],["b7"]:values[7]})}]},{kind:"u32",scalar:__privateCapture3},{kind:"bool",scalar:__privateCapture4},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[2],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"string",scalar:__privateCapture6},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[1],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["value","id"],patterns:[{bytes:4,label:"record",children:[1,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["value"]:values[0],["id"]:values[1]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[10],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["op","a","b","av","bv","value"],patterns:[{bytes:4,label:"record",children:[3,3,3,1,1,1],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["op"]:values[0],["a"]:values[1],["b"]:values[2],["av"]:values[3],["bv"]:values[4],["value"]:values[5]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[1],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[13],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["value","gradient"],patterns:[{bytes:4,label:"record",children:[1,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["value"]:values[0],["gradient"]:values[1]})}]}];}
// Typed input construction only: plans contain literal constructor/capture
// functions emitted from source schemas. No source expression evaluator.
// All frames and private values remain in this closure; callers receive only
// an owned opaque handle after one complete, well-typed root is constructed.
const __constructorPaths=new WeakMap();
function __valueBuilder(nodes,root,identity,limits){
 const budget=createValueCaptureBudget(limits),frames=[];
 let result,targetNode,targetDepth,complete=false,closed=false,failed=false,busy=false;
 const fail=message=>{failed=true;frames.length=0;result=undefined;throw Error(message);};
 const active=()=>{if(failed||closed)throw Error('value builder is closed');};
 const expected=()=>{
  if(!frames.length){if(complete)fail('value builder root already complete');targetNode=root;targetDepth=0;return;}
  const frame=frames.at(-1),position=frame.values.length;
  if(!frame.pattern.sequence&&position>=frame.pattern.children.length)fail('value builder constructor is full');
  targetNode=frame.pattern.sequence?frame.pattern.children[0]:frame.pattern.children[position];targetDepth=frame.depth+frame.pattern.childDepth;
 };
 const accept=value=>{
  if(frames.length)frames.at(-1).values.push(value);
  else{result=value;complete=true;}
 };
 const execute=(operation,first,second)=>{
  active();if(busy)throw Error('value builder operation already active');busy=true;
  try{return operation(first,second);}catch(error){failed=true;frames.length=0;result=undefined;throw error;}finally{busy=false;}
 };
 // Compile and cache constructor paths independently of the session's values.
 const pathPlan=(choices,startNode,startDepth)=>{
   if(!Array.isArray(choices)||choices.length===0||choices.length>128)fail('invalid value builder path');
   let cache=__constructorPaths.get(nodes);if(!cache){cache=new WeakMap();__constructorPaths.set(nodes,cache);}
   let entries=cache.get(choices),saved=entries?.get(startNode);
   if(saved)return saved;
   const path=[],charges=[];let node=startNode,depth=startDepth;
   for(let i=0;i<choices.length;i++){
    const choice=choices[i],patterns=nodes[node].patterns;
    if(!Number.isSafeInteger(choice)||choice<0||!patterns||choice>=patterns.length)fail('invalid value builder constructor');
    const pattern=patterns[choice];charges.push([pattern,depth-startDepth]);path.push({pattern,node:nodes[node]});
    if(i+1<choices.length){if(pattern.sequence||pattern.children.length!==1)fail('value builder path is not unary');node=pattern.children[0];depth+=pattern.childDepth;}
   }
   const terminal=path.at(-1).pattern;
   // Compose literal constructor functions once per path, instead of
   // allocating and interpreting another recursive closure for every value.
   const compose=at=>{
    const {pattern,node}=path[at];
    if(node.flat){
     let index=0,last=at;
     while(last<path.length&&path[last].node.kind==='result'){
      if(path[last].pattern.sumBranch===0)break;
      index++;last++;
     }
     if(last===path.length){
      let make=args=>args[0];
      for(let i=path.length-1;i>=at;i--){const inner=make,p=path[i].pattern;make=args=>p.make([inner(args)]);}
      return make;
     }
     const payload=path[last].node.kind==='result'?(last+1<path.length?compose(last+1):args=>args[0]):compose(last);
     return args=>node.flat(index,payload(args));
    }
    const inner=at+1<path.length?compose(at+1):null;
    if(pattern.transparent)return inner??(args=>args[0]);
    return inner?args=>pattern.make([inner(args)]):pattern.make;
   };
   const make=compose(0);
   // Scalar paths use the same literal constructors, but pass the leaf
   // directly through erased records and flat sums. No temporary argument
   // array is needed at those edges. Ordinary constructors keep their array
   // calling convention; no private value reaches the public builder API.
   const composeScalar=at=>{
    const {pattern,node}=path[at];
    if(node.flat){
     let index=0,last=at;
     while(last<path.length&&path[last].node.kind==='result'){
      if(path[last].pattern.sumBranch===0)break;
      index++;last++;
     }
     if(last===path.length){
      let make=value=>value;
      for(let i=path.length-1;i>=at;i--){const inner=make,p=path[i].pattern;make=value=>p.make([inner(value)]);}
      return make;
     }
     const payload=path[last].node.kind==='result'?(last+1<path.length?composeScalar(last+1):value=>value):composeScalar(last);
     return value=>node.flat(index,payload(value));
    }
    const inner=at+1<path.length?composeScalar(at+1):null;
    if(pattern.transparent)return inner??(value=>value);
    return inner?value=>pattern.make([inner(value)]):value=>pattern.make([value]);
   };
   const scalar=composeScalar(0);
   const pattern={...terminal,make};
   // Only frozen arrays of ordinary data properties can key reusable plans.
   // Mutable arrays and frozen accessor arrays retain checked per-call paths.
   const fixed=charges.every(([p])=>Number.isSafeInteger(p.bytes)&&p.bytes>=4);
   const plan={pattern,scalar,charges,offset:depth-startDepth,bytes:fixed?charges.reduce((n,[p])=>n+p.bytes,0):null};
   let reusable=Object.isFrozen(choices);
   for(let i=0;reusable&&i<choices.length;i++){const field=Object.getOwnPropertyDescriptor(choices,String(i));reusable=!!field&&Object.hasOwn(field,'value');}
   if(reusable){
    if(!entries){entries=new Map();cache.set(choices,entries);}entries.set(startNode,plan);
   }
   return plan;
 };
 const chargePath=(plan,depth)=>{
  // Each emitted constructor consumes one node and a fixed frame/tag cost.
  // Only take the combined charge when every original check would succeed.
  // Replaying the original order retains the exact first failure otherwise.
  if(plan.bytes!==null&&depth+plan.offset<=budget.depth&&plan.charges.length<=budget.remaining&&budget.bytes+plan.bytes<=budget.limit){
   budget.remaining-=plan.charges.length;budget.bytes+=plan.bytes;return;
  }
  for(const [pattern,offset]of plan.charges)pattern.charge(budget,depth+offset);
 };
 // Operations are allocated once per session, and share expected-node
 // scratch only while the existing reentrancy guard is held.
 const openOperation=(choice)=>{
   expected();const node=nodes[targetNode];
   if(!Number.isSafeInteger(choice)||choice<0||!node.patterns||choice>=node.patterns.length)fail('invalid value builder constructor');
   const pattern=node.patterns[choice];pattern.charge(budget,targetDepth);
   frames.push({pattern,depth:targetDepth,values:[]});
 };
 const openPathOperation=(choices)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth);
   chargePath(plan,targetDepth);
   frames.push({pattern:plan.pattern,depth:targetDepth+plan.offset,values:[]});
 };
 const scalarPathOperation=(choices,value)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth),pattern=plan.pattern;
   if(pattern.sequence||pattern.children.length!==1)fail('value builder path has no scalar leaf');
   const capture=nodes[pattern.children[0]].scalar;
   if(typeof capture!=='function')fail('value builder path has no scalar leaf');
   chargePath(plan,targetDepth);
   const leaf=capture(value,budget,targetDepth+plan.offset+pattern.childDepth);
   accept(plan.scalar(leaf));
 };
 const emptyPathOperation=(choices)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth),pattern=plan.pattern;
   if(pattern.sequence||pattern.children.length!==0)fail('value builder path is not empty');
   chargePath(plan,targetDepth);accept(pattern.make([]));
 };
 const scalarOperation=(value)=>{
   expected();const capture=nodes[targetNode].scalar;
   if(typeof capture!=='function')fail('value builder expects a constructor');
   accept(capture(value,budget,targetDepth));
 };
 const closeOperation=()=>{
   if(!frames.length)fail('value builder has no open constructor');
   const frame=frames.at(-1),pattern=frame.pattern,count=frame.values.length;
   if(!pattern.sequence&&count!==pattern.children.length||pattern.size!==undefined&&count!==pattern.size)fail('value builder constructor arity');
   if(pattern.sequence&&count>budget.limit)fail('wire sequence size');
   const value=pattern.make(frame.values);
   frames.pop();accept(value);
 };
 const finishOperation=()=>{
   if(frames.length||!complete)fail('value builder root is incomplete');
   closed=true;const handle=__compiledHandle(identity,result);result=undefined;return handle;
 };
 const api=Object.freeze({
  open(choice){return execute(openOperation,choice);},
  // Charge every source constructor even when unary paths share one frame.
  openPath(choices){return execute(openPathOperation,choices);},
  // Complete the path and leaf without intermediate session frames.
  scalarPath(choices,value){return execute(scalarPathOperation,choices,value);},
  emptyPath(choices){return execute(emptyPathOperation,choices);},
  scalar(value){return execute(scalarOperation,value);},
  close(){return execute(closeOperation);},
  finish(){return execute(finishOperation);},
  abort(){if(busy)throw Error('value builder operation already active');failed=true;frames.length=0;result=undefined;},
 });
 return api;
}
function __reduceValue0(value,r,b,d,c){b.enter(d,4);return r[0](__reduceValue1(value["w0"],r,b,d+1,c),__reduceValue1(value["w1"],r,b,d+1,c),__reduceValue1(value["w2"],r,b,d+1,c),__reduceValue1(value["w3"],r,b,d+1,c),__reduceValue1(value["w4"],r,b,d+1,c),__reduceValue1(value["w5"],r,b,d+1,c),__reduceValue1(value["w6"],r,b,d+1,c),__reduceValue1(value["w7"],r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,8);return r[1]({F32Bits:__nfBits(value)},c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,4);return r[2](__reduceValue0(value["b0"],r,b,d+1,c),__reduceValue0(value["b1"],r,b,d+1,c),__reduceValue0(value["b2"],r,b,d+1,c),__reduceValue0(value["b3"],r,b,d+1,c),__reduceValue0(value["b4"],r,b,d+1,c),__reduceValue0(value["b5"],r,b,d+1,c),__reduceValue0(value["b6"],r,b,d+1,c),__reduceValue0(value["b7"],r,b,d+1,c),c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);return r[3](value,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,5);return r[4](value,c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[5](0,__reduceValue2(value.Ok,r,b,d+1,c),c):r[5](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,4);b.text(value);return r[6](value,c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[7](0,__reduceValue1(value.Ok,r,b,d+1,c),c):r[7](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,4);return r[8](__reduceValue1(value["value"],r,b,d+1,c),__reduceValue3(value["id"],r,b,d+1,c),c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[9];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue10(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,4);return r[10](__reduceValue3(value["op"],r,b,d+1,c),__reduceValue3(value["a"],r,b,d+1,c),__reduceValue3(value["b"],r,b,d+1,c),__reduceValue1(value["av"],r,b,d+1,c),__reduceValue1(value["bv"],r,b,d+1,c),__reduceValue1(value["value"],r,b,d+1,c),c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[11];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue1(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[12](0,__reduceValue13(value.Ok,r,b,d+1,c),c):r[12](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,4);return r[13](__reduceValue1(value["value"],r,b,d+1,c),__reduceValue2(value["gradient"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,1,1,1,1,1,1,1]),"fields":Object.freeze(["w0","w1","w2","w3","w4","w5","w6","w7"]),"kind":"record","name":"Block"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([0,0,0,0,0,0,0,0]),"fields":Object.freeze(["b0","b1","b2","b3","b4","b5","b6","b7"]),"kind":"record","name":"Weights"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([2,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([1,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([1,3]),"fields":Object.freeze(["value","id"]),"kind":"record","name":"__ink_reverse_0_Wire"}),Object.freeze({"children":Object.freeze([10]),"kind":"list"}),Object.freeze({"children":Object.freeze([3,3,3,1,1,1]),"fields":Object.freeze(["op","a","b","av","bv","value"]),"kind":"record","name":"__ink_reverse_0_Node"}),Object.freeze({"children":Object.freeze([1]),"kind":"list"}),Object.freeze({"children":Object.freeze([13,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([1,2]),"fields":Object.freeze(["value","gradient"]),"kind":"record","name":"__ink_reverse_246"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"8f108905058681501602b2cd9cd2c994d1c9d660961813ee407b3135e8c57f38","named":__compiledNamed0(),"root":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"2a24f9672d54097dab4ab3ea97e7db843366f58062ebee043da807c7c71698fc","named":__compiledNamed0(),"root":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}},__privateCapture2,__privateWireValue3,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture3,__privateWireValue5,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture4,__privateWireValue6,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"73558093d5b3e9c79d98ba6cdf59158e00946d53958debd073b06f83affc2f9a","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}},__privateCapture5,__privateWireValue7,__privateWireWrite5,__compiledOwnedValue5,5,5,__reduceValue5,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"29bcdada2d2b5ecb6deae18e25401ad25c1f0dc80bcd50defebf64892403468d","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}}},__privateCapture7,__privateWireValue10,__privateWireWrite7,__compiledOwnedValue7,7,7,__reduceValue7,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fabc4e63e940c6190680726874c8654deced79200b320c057b9389a135a08557","named":__compiledNamed0(),"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"id","type":{"kind":"u32"}}],"kind":"record","name":"__ink_reverse_0_Wire"}},__privateCapture8,__privateWireValue13,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"8d20db2e18176975b811079510807748b5da77b30341fa86eaec165fb19262b0","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"op","type":{"kind":"u32"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"av","type":{"kind":"f32"}},{"name":"bv","type":{"kind":"f32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_reverse_0_Node"},"kind":"list"}},__privateCapture9,__privateWireValue15,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture11,__privateWireValue17,__privateWireWrite11,__compiledOwnedValue11,11,11,__reduceValue11,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"4ffa35b7d3f1ab446e1127a24bafbaa5f7471288e33b61e8dc5e1883d7e9f679","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"gradient","type":{"fields":[{"name":"b0","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b1","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b2","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b3","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b4","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b5","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b6","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}},{"name":"b7","type":{"fields":[{"name":"w0","type":{"kind":"f32"}},{"name":"w1","type":{"kind":"f32"}},{"name":"w2","type":{"kind":"f32"}},{"name":"w3","type":{"kind":"f32"}},{"name":"w4","type":{"kind":"f32"}},{"name":"w5","type":{"kind":"f32"}},{"name":"w6","type":{"kind":"f32"}},{"name":"w7","type":{"kind":"f32"}}],"kind":"record","name":"Block"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"__ink_reverse_246"}}},__privateCapture12,__privateWireValue20,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
const __compiledEntries=new Map([["block",{index:0,params:[__compiledCodec0],result:__compiledCodec1,destination:null,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["energy",{index:1,params:[__compiledCodec2,__compiledCodec1],result:__compiledCodec1,destination:null,arguments:__privateWireValue4,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["derivatives",{index:2,params:[__compiledCodec2,__compiledCodec1,__compiledCodec3,__compiledCodec4],result:__compiledCodec5,destination:null,arguments:__privateWireValue9,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["linearized",{index:3,params:[__compiledCodec2,__compiledCodec1,__compiledCodec3,__compiledCodec4],result:__compiledCodec6,destination:null,arguments:__privateWireValue9,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["update",{index:4,params:[__compiledCodec2,__compiledCodec2,__compiledCodec1],result:__compiledCodec2,destination:null,arguments:__privateWireValue11,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["step",{index:5,params:[__compiledCodec2,__compiledCodec1,__compiledCodec1],result:__compiledCodec2,destination:null,arguments:__privateWireValue12,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["__ink_reverse_0_constant",{index:6,params:[__compiledCodec1],result:__compiledCodec7,destination:null,arguments:__privateWireValue14,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["__ink_reverse_0_backward",{index:14,params:[__compiledCodec8,__compiledCodec7,__compiledCodec4],result:__compiledCodec9,destination:{copy:__destinationOwnedValue0,direct:__into14},arguments:__privateWireValue18,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["__ink_reverse_95",{index:17,params:[__compiledCodec2,__compiledCodec3,__compiledCodec4,__compiledCodec1],result:__compiledCodec5,destination:null,arguments:__privateWireValue19,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["__ink_reverse_173",{index:18,params:[__compiledCodec2,__compiledCodec3,__compiledCodec4,__compiledCodec1],result:__compiledCodec10,destination:null,arguments:__privateWireValue22,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}]]);

export const compiledValues=Object.freeze(Object.fromEntries([...__compiledEntries].map(([name,entry])=>[name,Object.freeze({get params(){return Object.freeze(entry.params.map(codec=>codec()));},get result(){return entry.result();}})])));
function __compiledValidate(entry,owned){
 const values=owned.map(v=>v.value);
 const established=entry.onlyTypeGuards&&entry.needsInvariants.every((needed,i)=>!needed||owned[i].guaranteed);
 if(entry.precondition!==null&&!established){
  if(__implementations[entry.precondition](...values)!==true)throw Error('contract precondition failed');
  for(let i=0;i<owned.length;i++)if(entry.needsInvariants[i])owned[i].guaranteed=true;
 }
 return values;
}
export function callCompiled(name,args){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(args)||args.length!==entry.params.length)throw Error('unsupported compiled call');
 const owned=entry.params.map((codec,i)=>__compiledEntry(args[i],codec().identity)),values=__compiledValidate(entry,owned);
 // Checked source outputs satisfy their declared value interfaces. Private
 // handles expose only detached copies and never retain mutable host inputs.
 return __compiledHandle(entry.result().identity,__implementations[entry.index](...values),true);
}

// Explicit sealed-value partial application. Each token owns a bounded set of
// lexical caches; no mutable host object, global memo table or error is retained.
const __preparedCompiled=new WeakMap();
export function prepareCompiled(name,bindings){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(bindings)||bindings.length>entry.params.length)throw Error('unsupported prepared compiled call');
 const captured=new Array(entry.params.length),fixed=new Array(entry.params.length).fill(false);
 for(const binding of bindings){
  if(!Array.isArray(binding)||binding.length!==2)throw Error('prepared compiled binding');
  const [index,handle]=binding;
  if(!Number.isInteger(index)||index<0||index>=fixed.length||fixed[index])throw Error('prepared compiled parameter');
  captured[index]=__compiledEntry(handle,entry.params[index]().identity);fixed[index]=true;
 }
 const remaining=fixed.flatMap((yes,i)=>yes?[]:[i]);
 const factory=__preparedFactories.get(entry.index);
 const run=factory?factory(fixed):__implementations[entry.index];
 const token=Object.freeze(Object.create(null));
 __preparedCompiled.set(token,{entry,captured,remaining,run});return token;
}
export function callPreparedCompiled(token,args){
 const prepared=__preparedCompiled.get(token);
 if(!prepared||!Array.isArray(args)||args.length!==prepared.remaining.length)throw Error('invalid prepared compiled call');
 const {entry,captured,remaining,run}=prepared,owned=captured.slice();
 for(let i=0;i<remaining.length;i++){const at=remaining[i];owned[at]=__compiledEntry(args[i],entry.params[at]().identity);}
 const values=__compiledValidate(entry,owned);
 return __compiledHandle(entry.result().identity,run(...values),true);
}
// The caller owns sufficiently large, disjoint destination storage. This is
// the trusted Into ABI, not a bounded wire/materialization operation. Private
// retained containers never escape: structured elements are deeply detached.
const __destinationBudget=Object.freeze({remaining:Infinity,enter(){},text(){}});
export function callPreparedCompiledInto(token,args,destination){
 const prepared=__preparedCompiled.get(token);
 if(!prepared||!prepared.entry.destination||!Array.isArray(args)||args.length!==prepared.remaining.length)throw Error('invalid prepared compiled destination call');
 const {entry,captured,remaining,run}=prepared,owned=captured.slice();
 for(let i=0;i<remaining.length;i++){const at=remaining[i];owned[at]=__compiledEntry(args[i],entry.params[at]().identity);}
 const values=__compiledValidate(entry,owned),into=entry.destination;
 // Ordinary scalar-list bodies can write the terminal stage directly. A
 // residual body keeps its lexical caches and copies only its final elements.
 if(into.direct&&run===__implementations[entry.index])return into.direct(...values,destination);
 const result=run(...values),n=result.length;
 for(let i=0;i<n;i++)destination[i]=into.copy(result[i],__destinationBudget,0);
 return n;
}
const __intoOutput14=__representation(metadata.functions[14].result.element,true);
const __intoImplementations=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,__into14,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries([["__ink_reverse_0_backward",(()=>{const c0=__representation(__inputTypes[14].types[0],false,__inputTypes[14].capture[0]);const c1=__representation(__inputTypes[14].types[1],false,__inputTypes[14].capture[1]);const c2=__representation(__inputTypes[14].types[2],false,__inputTypes[14].capture[2]);const input=[c0,c1,c2],needsInput=input.some(c=>c!==__identity);const needsContext=(c0!==__identity||c1!==__identity);if(c0===__identity&&c1===__identity&&c2===__identity)return __into14;const fallback=(...args)=>{const context=new WeakMap();const values=input.map((convert,i)=>convert(args[i],context));return __into14(...values,args[3]);};return function(a0,a1,a2,destination){if(arguments.length!==4)return fallback(...arguments);const context=(needsContext||(Number(c0!==__identity&&a0!==null&&typeof a0==='object')+Number(c1!==__identity&&a1!==null&&typeof a1==='object')+Number(c2!==__identity&&a2!==null&&typeof a2==='object'))>1)?new WeakMap():null;const v0=c0(a0,context);const v1=c1(a1,context);const v2=c2(a2,context);return __into14(v0,v1,v2,destination);};})()]]));
export function callInto(name,args,destination){switch(name){case "__ink_reverse_0_append":case "__ink_reverse_0_seed":case "__ink_reverse_0_binary":case "__ink_reverse_0_unary":case "__ink_reverse_0_add":case "__ink_reverse_0_back_node":case "__ink_reverse_0_back_step":case "__ink_reverse_5":case "__ink_reverse_1":throw new Error('temporary storage is internal to a pure invocation');}return functionsInto[name](...args,destination);}

function __preparedPart(mask,path){
 for(const field of path){
  if(mask===true)return true;
  if(!mask || typeof mask!=="object")return false;
  mask=Object.hasOwn(mask.fields,field)?mask.fields[field]:false;
 }
 return mask;
}
function __preparedStable(mask,path){const part=__preparedPart(mask,path);return part===true || (!!part && part.all===true);}
function __prepareFn1(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["b0"])&&__preparedStable(fixed[0],["b1"])&&__preparedStable(fixed[0],["b2"])&&__preparedStable(fixed[0],["b3"])&&__preparedStable(fixed[0],["b4"])&&__preparedStable(fixed[0],["b5"])&&__preparedStable(fixed[0],["b6"])&&__preparedStable(fixed[0],["b7"])&&__preparedStable(fixed[1],[]))))return __fn1;const v5034=__preparedStable(fixed[0],["b0"])&&__preparedStable(fixed[0],["b1"])&&__preparedStable(fixed[0],["b2"])&&__preparedStable(fixed[0],["b3"])&&__preparedStable(fixed[0],["b4"])&&__preparedStable(fixed[0],["b5"])&&__preparedStable(fixed[0],["b6"])&&__preparedStable(fixed[0],["b7"])&&__preparedStable(fixed[1],[]);
let v5033=false,v5032;
return function(v5029,v5030){v5030=__nfValue(v5030);
let v5031;if(v5034&&v5033){v5031=v5032;}else{
const v5035=v5029["b0"];
const v5036=__fn0(v5035);
const v5037=v5029["b1"];
const v5038=__fn0(v5037);
const v5039=Math.fround(__nfNumber(v5036) + __nfNumber(v5038));
const v5040=v5029["b2"];
const v5041=__fn0(v5040);
const v5042=Math.fround(v5039 + __nfNumber(v5041));
const v5043=v5029["b3"];
const v5044=__fn0(v5043);
const v5045=Math.fround(v5042 + __nfNumber(v5044));
const v5046=v5029["b4"];
const v5047=__fn0(v5046);
const v5048=Math.fround(v5045 + __nfNumber(v5047));
const v5049=v5029["b5"];
const v5050=__fn0(v5049);
const v5051=Math.fround(v5048 + __nfNumber(v5050));
const v5052=v5029["b6"];
const v5053=__fn0(v5052);
const v5054=Math.fround(v5051 + __nfNumber(v5053));
const v5055=v5029["b7"];
const v5056=__fn0(v5055);
const v5057=Math.fround(v5054 + __nfNumber(v5056));
v5031=Math.fround(v5057 - __nfNumber(v5030));if(v5034){v5032=v5031;v5033=true;}}
const v5058=__nfValue(v5031);
const v5059=__nfValue(v5031);
return Math.fround(__nfNumber(v5058) * __nfNumber(v5059));};}
function __prepareFn2(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["b0","w0"])&&__preparedStable(fixed[2],[]))))return __fn2;const v5066=depth<15&&__preparedFactories.has(17)&&((__preparedStable(fixed[0],["b0","w0"])&&__preparedStable(fixed[2],[])));
let v5064;
return function(v5060,v5061,v5062,v5063){v5061=__nfValue(v5061);
let v5067;if(v5066){if(!v5064){const v5065=__preparedFactories.get(17);v5064=v5065([fixed[0],fixed[2],fixed[3],fixed[1]],depth+1);}v5067=v5064(v5060,v5062,v5063,v5061);}else{v5067=__fn17(v5060,v5062,v5063,v5061);}
return v5067;};}
function __prepareFn3(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["b0","w0"])&&__preparedStable(fixed[2],[]))))return __fn3;const v5074=depth<15&&__preparedFactories.has(18)&&((__preparedStable(fixed[0],["b0","w0"])&&__preparedStable(fixed[2],[])));
let v5072;
return function(v5068,v5069,v5070,v5071){v5069=__nfValue(v5069);
let v5075;if(v5074){if(!v5072){const v5073=__preparedFactories.get(18);v5072=v5073([fixed[0],fixed[2],fixed[3],fixed[1]],depth+1);}v5075=v5072(v5068,v5070,v5071,v5069);}else{v5075=__fn18(v5068,v5070,v5071,v5069);}
const v5076=v5075;
let v5077;if(Object.hasOwn(v5076,"Ok")){
const v5078=v5076["Ok"];
v5077=({Ok:__nfValue(v5078["value"])});}else{
v5077=({Err:v5076["Err"]});}
return v5077;};}
const __preparedFactories=new Map([[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3]]);

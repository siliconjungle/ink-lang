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
const __nfValue = value => typeof value === 'number' ? Math.fround(value) : value;
// Number operands have already been normalised at their typed read or producer.
const __nfNumber = value => typeof value === 'number' ? value : __float(value.F32Bits);
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
function __fn0(){
const v0=10;
const v1=6;
const v2=6;
const v3=[v1,v2];
const v4=4;
const v5=10000;
return __fn9(v0,v3,v4,v5);}
function __fn1(v6,v7,v8){
return __fn13(v6,v7,v8);}
function __fn2(v9,v10,v11,v12){
return __fn14(v9,v10,v11,v12);}
function __fn3(v13,v14,v15,v16){
const v17=v13["valid"];
const v18=false;
const v19=(v17===v18);
let v20=v19;if(!v20){
const v21=v13["parameters"];
v20=((v21) > (v16));}
const v22=v20;
let v23=v22;if(!v23){
const v24=v13["nodes"];
v23=((v24) > (v16));}
const v25=v23;
let v26=v25;if(!v26){
const v27=v13["width"];
v26=((v27) > (v16));}
const v28=v26;
let v29=v28;if(!v29){
v29=((v14) > (v16));}
let v30;if(v29){
const v31=false;
const v32=v13["parameters"];
const v33=v13["nodes"];
const v34=v13["width"];
v30=({["parameters"]:v32,["nodes"]:v33,["width"]:v34,["valid"]:v31});}else{
let v35;if(v15){
v35=2;}else{
v35=1;}
const v36=v35;
const v37=v13["width"];
const v38=1;
const v39=(((v37) + (v38)) >>> 0);
const v40=(Math.imul(v39,v36) >>> 0);
const v41=v13["width"];
const v42=(Math.imul(v41,v36) >>> 0);
const v43=1;
const v44=(((v42) + (v43)) >>> 0);
const v45=v13["parameters"];
const v46=(((v16) - (v45)) >>> 0);
let v47;if(v40===0 ){
v47=0;}else{
v47=(Math.trunc(v46/v40)+0);}
const v48=v47;
const v49=((v14) <= (v48));
let v50=v49;if(v50){
const v51=0;
const v52=(v44===v51);
let v53=v52;if(!v53){
const v54=v13["nodes"];
const v55=(((v16) - (v54)) >>> 0);
let v56;if(v44===0 ){
v56=0;}else{
v56=(Math.trunc(v55/v44)+0);}
const v57=v56;
v53=((v14) <= (v57));}
v50=v53;}
const v58=v50;
let v59;if(v58){
const v60=v13["parameters"];
const v61=(Math.imul(v40,v14) >>> 0);
const v62=(((v60) + (v61)) >>> 0);
const v63=v13["nodes"];
const v64=(Math.imul(v44,v14) >>> 0);
const v65=(((v63) + (v64)) >>> 0);
const v66=true;
v59=({["parameters"]:v62,["nodes"]:v65,["width"]:v14,["valid"]:v66});}else{
const v67=false;
const v68=v13["parameters"];
const v69=v13["nodes"];
const v70=v13["width"];
v59=({["parameters"]:v68,["nodes"]:v69,["width"]:v70,["valid"]:v67});}
v30=v59;}
return v30;}
function __fn4(v71,v72,v73,v74){
const v75=(v72).length;
const v76=(((v74) + (v75)) >>> 0);
const v77=__nfFromBits(1065353216);
const v78=({["wire"]:v76,["coefficient"]:v77});
const v79=new __InkBuffer(Array.from([v78]));
let v80=({["nodes"]:v71,["parameter"]:v74,["terms"]:v79});
for(let v81=0;v81<v72.length;v81++){
const v82=(v72[v81]>>>0);
const v83=v80;
const v84=v83["nodes"];
const v85=v80;
const v86=v85["parameter"];
const v87=v80;
const v88=v87["terms"];
const v89=(v84).length;
const v90=(((v73) + (v89)) >>> 0);
const v91=__fn21(v86,v82);
const v92=__tempEdit(v84,"push",v91);
const v93=__nfFromBits(1065353216);
const v94=({["wire"]:v90,["coefficient"]:v93});
const v95=__tempEdit(v88,"push",v94);
const v96=1;
const v97=(((v86) + (v96)) >>> 0);
v80=({["nodes"]:v92,["parameter"]:v97,["terms"]:v95});
}
const v98=v80;
const v99=v98["nodes"];
const v100=v98["parameter"];
const v101=v98["terms"];
const v102=v101.freeze();
const v103=1;
const v104=(((v76) + (v103)) >>> 0);
return ({["nodes"]:v99,["terms"]:v102,["parameter"]:v104});}
function __fn5(v105,v106){
const v107=v105["nodes"];
const v108=v105["inputs"];
const v109=v105["parameter"];
const v110=__fn4(v107,v106,v108,v109);
const v111=v110["nodes"];
const v112=v105["inputs"];
const v113=v110["parameter"];
const v114=__fn4(v111,v106,v112,v113);
const v115=v105["inputs"];
const v116=v114["nodes"];
const v117=(v116).length;
const v118=(((v115) + (v117)) >>> 0);
const v119=v114["nodes"];
const v120=v110["terms"];
const v121=__nfFromBits(0);
const v122=v114["terms"];
const v123=__nfFromBits(0);
const v124=__fn28(v120,v121,v122,v123);
const v125=__tempEdit(v119,"push",v124);
const v126=v105["outputs"];
const v127=__tempEdit(v126,"push",v118);
const v128=v114["parameter"];
const v129=v105["inputs"];
return ({["nodes"]:v125,["outputs"]:v127,["parameter"]:v128,["inputs"]:v129});}
function __fn6(v130,v131){
const v132=v130["nodes"];
const v133=v130["inputs"];
const v134=v130["parameter"];
const v135=__fn4(v132,v131,v133,v134);
const v136=v130["inputs"];
const v137=v135["nodes"];
const v138=(v137).length;
const v139=(((v136) + (v138)) >>> 0);
const v140=v135["nodes"];
const v141=v135["terms"];
const v142=__nfFromBits(0);
const v143=__fn27(v141,v142);
const v144=__tempEdit(v140,"push",v143);
const v145=v130["outputs"];
const v146=__tempEdit(v145,"push",v139);
const v147=v135["parameter"];
const v148=v130["inputs"];
return ({["nodes"]:v144,["outputs"]:v146,["parameter"]:v147,["inputs"]:v148});}
function __fn7(v149,v150,v151){
let v152=v149;
for(let v153=0;v153<v150;v153++){
if(false){break;}
const v154=(v153>>>0);
const v155=v152;
v152=__fn5(v155,v151);}
return v152;}
function __fn8(v156,v157,v158){
let v159=v156;
for(let v160=0;v160<v157;v160++){
if(false){break;}
const v161=(v160>>>0);
const v162=v159;
v159=__fn6(v162,v158);}
return v159;}
function __fn9(v163,v164,v165,v166){
const v167=1000000;
const v168=((v166) > (v167));
let v169=v168;if(!v169){
v169=((v163) > (v166));}
let v170;if(v169){
v170=({Err:"network capacity"});}else{
const v171=0;
const v172=0;
const v173=true;
const v175=({["parameters"]:v171,["nodes"]:v172,["width"]:v163,["valid"]:v173});
let v176=({["shape"]:v175});
for(let v177=0;v177<v164.length;v177++){
const v178=(v164[v177]>>>0);
const v179=v176;
const v180=v179["shape"];
const v181=true;
const v182=__fn3(v180,v178,v181,v166);
v176=({["shape"]:v182});
}
const v183=v176;
const v184=v183["shape"];
const v185=false;
const v186=__fn3(v184,v165,v185,v166);
const v187=v186["valid"];
const v188=false;
const v189=(v187===v188);
let v190=v189;if(!v190){
const v191=v186["parameters"];
const v192=(((v166) - (v191)) >>> 0);
v190=((v163) > (v192));}
const v193=v190;
let v194=v193;if(!v194){
const v195=v186["nodes"];
const v196=v186["parameters"];
const v197=(((v166) - (v196)) >>> 0);
const v198=(((v197) - (v163)) >>> 0);
v194=((v195) > (v198));}
let v199;if(v194){
v199=({Err:"network capacity"});}else{
const v200=v186["parameters"];
const v201=(((v200) + (v163)) >>> 0);
const v202=new __InkBuffer([]);
let v203=v202;
for(let v204=0;v204<v163;v204++){
if(false){break;}
const v205=(v204>>>0);
const v206=v203;
const v207=v186["parameters"];
const v208=(((v207) + (v205)) >>> 0);
v203=__tempEdit(v206,"push",v208);}
const v209=v203;
const v210=v209.freeze();
const v211=new __InkBuffer([]);
const v212=new __InkBuffer([]);
const v213=0;
const v214=({["nodes"]:v211,["outputs"]:v212,["parameter"]:v213,["inputs"]:v201});
let v215=({["layer"]:v214,["wires"]:v210});
for(let v216=0;v216<v164.length;v216++){
const v217=(v164[v216]>>>0);
const v218=v215;
const v219=v218["layer"];
const v220=v215;
const v221=v220["wires"];
const v222=__fn7(v219,v217,v221);
const v223=v222["outputs"];
const v224=v223.freeze();
const v225=v222["nodes"];
const v226=new __InkBuffer([]);
const v227=v222["parameter"];
const v228=({["nodes"]:v225,["outputs"]:v226,["parameter"]:v227,["inputs"]:v201});
v215=({["layer"]:v228,["wires"]:v224});
}
const v229=v215;
const v230=v229["layer"];
const v231=v229["wires"];
const v232=__fn8(v230,v165,v231);
const v233=v232["nodes"];
const v234=v233.freeze();
const v235=v232["outputs"];
const v236=v235.freeze();
const v237=v232["parameter"];
const v238=v186["parameters"];
let v239;if(!(v237===v238)){
v239=({Err:"network parameter layout"});}else{
const v240=__fn39(v201,v234,v236,v166);
let v241;if(Object.hasOwn(v240,"Ok")){
const v242=v240["Ok"];
const v243=v186["parameters"];
v241=({Ok:({["graph"]:v242,["parameters"]:v243,["features"]:v163,["outputs"]:v165})});}else{
const v244=v240["Err"];
v241=({Err:v244});}
v239=v241;}
v199=v239;}
v170=v199;}
return v170;}
function __fn10(v245){
return v245["parameters"];}
function __fn11(v246){
return v246["features"];}
function __fn12(v247){
const v248=v247["graph"];
return __fn40(v248);}
function __fn13(v249,v250,v251){
const v252=(v250).length;
const v253=v249["parameters"];
const v254=!(v252===v253);
let v255=v254;if(!v255){
const v256=(v251).length;
const v257=v249["features"];
v255=!(v256===v257);}
let v258;if(v255){
v258=({Err:"network input shape"});}else{
const v259=v249["graph"];
const v260=v250.length;
const v261=v251.length;
const v262=new Array(v260+v261);
for(let v263=0;v263<v260;v263++){v262[v263]=v250[v263];}
for(let v264=0;v264<v261;v264++){v262[v260+v264]=v251[v264];}
v258=__fn53(v259,v262);}
return v258;}
function __fn14(v265,v266,v267,v268){
const v269=(v266).length;
const v270=v265["parameters"];
const v271=!(v269===v270);
let v272=v271;if(!v272){
const v273=(v267).length;
const v274=v265["features"];
v272=!(v273===v274);}
let v275;if(v272){
v275=({Err:"network input shape"});}else{
const v276=v265["graph"];
const v277=v266.length;
const v278=v267.length;
const v279=new Array(v277+v278);
for(let v280=0;v280<v277;v280++){v279[v280]=v266[v280];}
for(let v281=0;v281<v278;v281++){v279[v277+v281]=v267[v281];}
const v282=__fn33();
const v283=__fn66(v276,v279,v268,v282);
let v284;if(Object.hasOwn(v283,"Ok")){
const v285=v283["Ok"];
const v286=__nfValue(v285["loss"]);
const v287=v285["outputs"];
const v288=v285["gradient"];
const v289=v288.slice(0,v265["parameters"]);
v284=({Ok:({["loss"]:v286,["outputs"]:v287,["gradient"]:v289})});}else{
const v290=v283["Err"];
v284=({Err:v290});}
v275=v284;}
return v275;}
function __fn15(v291,v292,v293){
const v294="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v295="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v296=0;
const v297=__nfFromBits(0);
const v298=[];
const v299=[];
const v300=__nfFromBits(0);
const v301=[];
const v302=false;
const v303=false;
return ({["kind"]:v291,["binary"]:v294,["unary"]:v295,["a"]:v292,["b"]:v293,["c"]:v296,["value"]:v297,["terms"]:v298,["gates"]:v299,["gate_bias"]:v300,["table"]:v301,["below"]:v302,["above"]:v303});}
function __fn16(v304){
const v305="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v306=0;
const v307=0;
const v308=__fn15(v305,v306,v307);
const v309=__nfValue(v304);
const v310=v308["kind"];
const v311=v308["binary"];
const v312=v308["unary"];
const v313=v308["a"];
const v314=v308["b"];
const v315=v308["c"];
const v316=__nfValue(v309);
const v317=v308["terms"];
const v318=v308["gates"];
const v319=__nfValue(v308["gate_bias"]);
const v320=v308["table"];
const v321=v308["below"];
const v322=v308["above"];
return ({["kind"]:v310,["binary"]:v311,["unary"]:v312,["a"]:v313,["b"]:v314,["c"]:v315,["value"]:v316,["terms"]:v317,["gates"]:v318,["gate_bias"]:v319,["table"]:v320,["below"]:v321,["above"]:v322});}
function __fn17(v323,v324,v325){
const v326="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v327=__fn15(v326,v324,v325);
const v328=v327["kind"];
const v329=v327["unary"];
const v330=v327["a"];
const v331=v327["b"];
const v332=v327["c"];
const v333=__nfValue(v327["value"]);
const v334=v327["terms"];
const v335=v327["gates"];
const v336=__nfValue(v327["gate_bias"]);
const v337=v327["table"];
const v338=v327["below"];
const v339=v327["above"];
return ({["kind"]:v328,["binary"]:v323,["unary"]:v329,["a"]:v330,["b"]:v331,["c"]:v332,["value"]:v333,["terms"]:v334,["gates"]:v335,["gate_bias"]:v336,["table"]:v337,["below"]:v338,["above"]:v339});}
function __fn18(v340,v341){
const v342="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v343=0;
const v344=__fn15(v342,v341,v343);
const v345=v344["kind"];
const v346=v344["binary"];
const v347=v344["a"];
const v348=v344["b"];
const v349=v344["c"];
const v350=__nfValue(v344["value"]);
const v351=v344["terms"];
const v352=v344["gates"];
const v353=__nfValue(v344["gate_bias"]);
const v354=v344["table"];
const v355=v344["below"];
const v356=v344["above"];
return ({["kind"]:v345,["binary"]:v346,["unary"]:v340,["a"]:v347,["b"]:v348,["c"]:v349,["value"]:v350,["terms"]:v351,["gates"]:v352,["gate_bias"]:v353,["table"]:v354,["below"]:v355,["above"]:v356});}
function __fn19(v357,v358){
const v359="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
return __fn17(v359,v357,v358);}
function __fn20(v360,v361){
const v362="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
return __fn17(v362,v360,v361);}
function __fn21(v363,v364){
const v365="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
return __fn17(v365,v363,v364);}
function __fn22(v366,v367){
const v368="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
return __fn17(v368,v366,v367);}
function __fn23(v369){
const v370="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
return __fn18(v370,v369);}
function __fn24(v371){
const v372="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
return __fn18(v372,v371);}
function __fn25(v373){
const v374="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
return __fn18(v374,v373);}
function __fn26(v375){
const v376="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
return __fn18(v376,v375);}
function __fn27(v377,v378){
const v379="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v380=0;
const v381=0;
const v382=__fn15(v379,v380,v381);
const v383=__nfValue(v378);
const v384=v382["kind"];
const v385=v382["binary"];
const v386=v382["unary"];
const v387=v382["a"];
const v388=v382["b"];
const v389=v382["c"];
const v390=__nfValue(v383);
const v391=v382["gates"];
const v392=__nfValue(v382["gate_bias"]);
const v393=v382["table"];
const v394=v382["below"];
const v395=v382["above"];
return ({["kind"]:v384,["binary"]:v385,["unary"]:v386,["a"]:v387,["b"]:v388,["c"]:v389,["value"]:v390,["terms"]:v377,["gates"]:v391,["gate_bias"]:v392,["table"]:v393,["below"]:v394,["above"]:v395});}
function __fn28(v396,v397,v398,v399){
const v400="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v401=0;
const v402=0;
const v403=__fn15(v400,v401,v402);
const v404=__nfValue(v397);
const v405=__nfValue(v399);
const v406=v403["kind"];
const v407=v403["binary"];
const v408=v403["unary"];
const v409=v403["a"];
const v410=v403["b"];
const v411=v403["c"];
const v412=__nfValue(v404);
const v413=__nfValue(v405);
const v414=v403["table"];
const v415=v403["below"];
const v416=v403["above"];
return ({["kind"]:v406,["binary"]:v407,["unary"]:v408,["a"]:v409,["b"]:v410,["c"]:v411,["value"]:v412,["terms"]:v396,["gates"]:v398,["gate_bias"]:v413,["table"]:v414,["below"]:v415,["above"]:v416});}
function __fn29(v417,v418,v419){
const v420="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v421=__fn15(v420,v417,v418);
const v422=v421["kind"];
const v423=v421["binary"];
const v424=v421["unary"];
const v425=v421["a"];
const v426=v421["b"];
const v427=__nfValue(v421["value"]);
const v428=v421["terms"];
const v429=v421["gates"];
const v430=__nfValue(v421["gate_bias"]);
const v431=v421["table"];
const v432=v421["below"];
const v433=v421["above"];
return ({["kind"]:v422,["binary"]:v423,["unary"]:v424,["a"]:v425,["b"]:v426,["c"]:v419,["value"]:v427,["terms"]:v428,["gates"]:v429,["gate_bias"]:v430,["table"]:v431,["below"]:v432,["above"]:v433});}
function __fn30(v434,v435,v436,v437){
const v438="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v439=0;
const v440=__fn15(v438,v434,v439);
const v441=v440["kind"];
const v442=v440["binary"];
const v443=v440["unary"];
const v444=v440["a"];
const v445=v440["b"];
const v446=v440["c"];
const v447=__nfValue(v440["value"]);
const v448=v440["terms"];
const v449=v440["gates"];
const v450=__nfValue(v440["gate_bias"]);
return ({["kind"]:v441,["binary"]:v442,["unary"]:v443,["a"]:v444,["b"]:v445,["c"]:v446,["value"]:v447,["terms"]:v448,["gates"]:v449,["gate_bias"]:v450,["table"]:v435,["below"]:v436,["above"]:v437});}
function __fn31(){
const v451=false;
const v452="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
const v453="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
const v454="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v451,["boolean"]:v452,["index"]:v453,["zero"]:v454});}
function __fn32(){
const v455=true;
const v456="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v457="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v458="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v455,["boolean"]:v456,["index"]:v457,["zero"]:v458});}
function __fn33(){
const v459=true;
const v460="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v461="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v462="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
return ({["piecewise"]:v459,["boolean"]:v460,["index"]:v461,["zero"]:v462});}
function __fn34(v463){
const v464=v463["kind"];
const v465="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v466;if((v464===v465)){
v466=[];}else{
const v467="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v468;if((v464===v467)){
const v469=v463["a"];
const v470=v463["b"];
v468=[v469,v470];}else{
const v471="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v472;if((v464===v471)){
const v473=v463["a"];
v472=[v473];}else{
const v474="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v475;if((v464===v474)){
const v476=v463["terms"];
const v477=v476.length;
const v478=new Array(v477);
for(let v479=0;v479<v477;v479++){
const v480=v476[v479];
v478[v479]=v480["wire"];
}
v475=v478;}else{
const v481="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v482;if((v464===v481)){
const v483=v463["terms"];
const v484=v483.length;
const v485=new Array(v484);
for(let v486=0;v486<v484;v486++){
const v487=v483[v486];
v485[v486]=v487["wire"];
}
const v488=v463["gates"];
const v489=v488.length;
const v490=new Array(v489);
for(let v491=0;v491<v489;v491++){
const v492=v488[v491];
v490[v491]=v492["wire"];
}
const v493=v485.length;
const v494=v490.length;
const v495=new Array(v493+v494);
for(let v496=0;v496<v493;v496++){v495[v496]=v485[v496];}
for(let v497=0;v497<v494;v497++){v495[v493+v497]=v490[v497];}
v482=v495;}else{
const v498="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v499;if((v464===v498)){
const v500=v463["a"];
const v501=v463["b"];
const v502=v463["c"];
v499=[v500,v501,v502];}else{
const v503=v463["a"];
const v504=[v503];
const v505=v463["table"];
const v506=v504.length;
const v507=v505.length;
const v508=new Array(v506+v507);
for(let v509=0;v509<v506;v509++){v508[v509]=v504[v509];}
for(let v510=0;v510<v507;v510++){v508[v506+v510]=v505[v510];}
v499=v508;}
v482=v499;}
v475=v482;}
v472=v475;}
v468=v472;}
v466=v468;}
return v466;}
function __fn35(v511,v512){
const v513=v511["kind"];
const v514="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v515;if((v513===v514)){
v515=v511;}else{
const v516="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v517;if((v513===v516)){
const v518=v511["a"];
let v519;if(v518<v512.length){v519=v512[v518];}else{
v519=0;}
const v520=v519;
const v521=v511["b"];
let v522;if(v521<v512.length){v522=v512[v521];}else{
v522=0;}
const v523=v522;
const v524=v511["kind"];
const v525=v511["binary"];
const v526=v511["unary"];
const v527=v511["c"];
const v528=__nfValue(v511["value"]);
const v529=v511["terms"];
const v530=v511["gates"];
const v531=__nfValue(v511["gate_bias"]);
const v532=v511["table"];
const v533=v511["below"];
const v534=v511["above"];
v517=({["kind"]:v524,["binary"]:v525,["unary"]:v526,["a"]:v520,["b"]:v523,["c"]:v527,["value"]:v528,["terms"]:v529,["gates"]:v530,["gate_bias"]:v531,["table"]:v532,["below"]:v533,["above"]:v534});}else{
const v535="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v536;if((v513===v535)){
const v537=v511["a"];
let v538;if(v537<v512.length){v538=v512[v537];}else{
v538=0;}
const v539=v538;
const v540=v511["kind"];
const v541=v511["binary"];
const v542=v511["unary"];
const v543=v511["b"];
const v544=v511["c"];
const v545=__nfValue(v511["value"]);
const v546=v511["terms"];
const v547=v511["gates"];
const v548=__nfValue(v511["gate_bias"]);
const v549=v511["table"];
const v550=v511["below"];
const v551=v511["above"];
v536=({["kind"]:v540,["binary"]:v541,["unary"]:v542,["a"]:v539,["b"]:v543,["c"]:v544,["value"]:v545,["terms"]:v546,["gates"]:v547,["gate_bias"]:v548,["table"]:v549,["below"]:v550,["above"]:v551});}else{
const v552="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v553;if((v513===v552)){
const v554=v511["terms"];
const v555=v554.length;
const v556=new Array(v555);
for(let v557=0;v557<v555;v557++){
const v558=v554[v557];
const v559=v558["wire"];
let v560;if(v559<v512.length){v560=v512[v559];}else{
v560=0;}
const v561=v560;
const v562=__nfValue(v558["coefficient"]);
v556[v557]=({["wire"]:v561,["coefficient"]:v562});
}
const v563=v511["kind"];
const v564=v511["binary"];
const v565=v511["unary"];
const v566=v511["a"];
const v567=v511["b"];
const v568=v511["c"];
const v569=__nfValue(v511["value"]);
const v570=v511["gates"];
const v571=__nfValue(v511["gate_bias"]);
const v572=v511["table"];
const v573=v511["below"];
const v574=v511["above"];
v553=({["kind"]:v563,["binary"]:v564,["unary"]:v565,["a"]:v566,["b"]:v567,["c"]:v568,["value"]:v569,["terms"]:v556,["gates"]:v570,["gate_bias"]:v571,["table"]:v572,["below"]:v573,["above"]:v574});}else{
const v575="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v576;if((v513===v575)){
const v577=v511["terms"];
const v578=v577.length;
const v579=new Array(v578);
for(let v580=0;v580<v578;v580++){
const v581=v577[v580];
const v582=v581["wire"];
let v583;if(v582<v512.length){v583=v512[v582];}else{
v583=0;}
const v584=v583;
const v585=__nfValue(v581["coefficient"]);
v579[v580]=({["wire"]:v584,["coefficient"]:v585});
}
const v586=v511["gates"];
const v587=v586.length;
const v588=new Array(v587);
for(let v589=0;v589<v587;v589++){
const v590=v586[v589];
const v591=v590["wire"];
let v592;if(v591<v512.length){v592=v512[v591];}else{
v592=0;}
const v593=v592;
const v594=__nfValue(v590["coefficient"]);
v588[v589]=({["wire"]:v593,["coefficient"]:v594});
}
const v595=v511["kind"];
const v596=v511["binary"];
const v597=v511["unary"];
const v598=v511["a"];
const v599=v511["b"];
const v600=v511["c"];
const v601=__nfValue(v511["value"]);
const v602=__nfValue(v511["gate_bias"]);
const v603=v511["table"];
const v604=v511["below"];
const v605=v511["above"];
v576=({["kind"]:v595,["binary"]:v596,["unary"]:v597,["a"]:v598,["b"]:v599,["c"]:v600,["value"]:v601,["terms"]:v579,["gates"]:v588,["gate_bias"]:v602,["table"]:v603,["below"]:v604,["above"]:v605});}else{
const v606="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v607;if((v513===v606)){
const v608=v511["a"];
let v609;if(v608<v512.length){v609=v512[v608];}else{
v609=0;}
const v610=v609;
const v611=v511["b"];
let v612;if(v611<v512.length){v612=v512[v611];}else{
v612=0;}
const v613=v612;
const v614=v511["c"];
let v615;if(v614<v512.length){v615=v512[v614];}else{
v615=0;}
const v616=v615;
const v617=v511["kind"];
const v618=v511["binary"];
const v619=v511["unary"];
const v620=__nfValue(v511["value"]);
const v621=v511["terms"];
const v622=v511["gates"];
const v623=__nfValue(v511["gate_bias"]);
const v624=v511["table"];
const v625=v511["below"];
const v626=v511["above"];
v607=({["kind"]:v617,["binary"]:v618,["unary"]:v619,["a"]:v610,["b"]:v613,["c"]:v616,["value"]:v620,["terms"]:v621,["gates"]:v622,["gate_bias"]:v623,["table"]:v624,["below"]:v625,["above"]:v626});}else{
const v627=v511["a"];
let v628;if(v627<v512.length){v628=v512[v627];}else{
v628=0;}
const v629=v628;
const v630=v511["table"];
const v631=v630.length;
const v632=new Array(v631);
for(let v633=0;v633<v631;v633++){
const v634=(v630[v633]>>>0);
let v635;if(v634<v512.length){v635=v512[v634];}else{
v635=0;}
v632[v633]=v635;
}
const v636=v511["kind"];
const v637=v511["binary"];
const v638=v511["unary"];
const v639=v511["b"];
const v640=v511["c"];
const v641=__nfValue(v511["value"]);
const v642=v511["terms"];
const v643=v511["gates"];
const v644=__nfValue(v511["gate_bias"]);
const v645=v511["below"];
const v646=v511["above"];
v607=({["kind"]:v636,["binary"]:v637,["unary"]:v638,["a"]:v629,["b"]:v639,["c"]:v640,["value"]:v641,["terms"]:v642,["gates"]:v643,["gate_bias"]:v644,["table"]:v632,["below"]:v645,["above"]:v646});}
v576=v607;}
v553=v576;}
v536=v553;}
v517=v536;}
v515=v517;}
return v515;}
function __fn36(v647,v648,v649){
const v650=v648["wire"];
const v651=1;
const v652=(((v650) - (v651)) >>> 0);
const v653=v648["live"];
let v654;if(v652<v653.length){v654=v653.item(v652);}else{
v654=false;}
let v655;if(v654){
const v656=__fn34(v647);
let v657=({["live"]:v653});
for(let v658=0;v658<v656.length;v658++){
const v659=(v656[v658]>>>0);
const v660=v657;
const v661=v660["live"];
const v662=__tempSet(v661,v659,true,false);
v657=({["live"]:v662});
}
const v663=v657;
const v664=v663["live"];
v655=({["live"]:v664,["wire"]:v652});}else{
v655=({["live"]:v653,["wire"]:v652});}
return v655;}
function __fn37(v665,v666){
const v667=v665["kind"];
const v668="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v669;if((v667===v668)){
v669=true;}else{
const v670="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v671;if((v667===v670)){
const v672=v665["a"];
const v673=((v672) < (v666));
let v674=v673;if(v674){
const v675=v665["b"];
v674=((v675) < (v666));}
v671=v674;}else{
const v676="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v677;if((v667===v676)){
const v678=v665["a"];
v677=((v678) < (v666));}else{
const v679="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v680;if((v667===v679)){
const v681=v665["terms"];
let v682=true;
for(let v683=0;v683<v681.length;v683++){
const v684=v681[v683];
const v685=v682;
let v686=v685;if(v686){
const v687=v684["wire"];
v686=((v687) < (v666));}
v682=v686;
}
v680=v682;}else{
const v688="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v689;if((v667===v688)){
const v690=v665["terms"];
let v691=true;
for(let v692=0;v692<v690.length;v692++){
const v693=v690[v692];
const v694=v691;
let v695=v694;if(v695){
const v696=v693["wire"];
v695=((v696) < (v666));}
v691=v695;
}
const v697=v691;
let v698=v697;if(v698){
const v699=v665["gates"];
let v700=true;
for(let v701=0;v701<v699.length;v701++){
const v702=v699[v701];
const v703=v700;
let v704=v703;if(v704){
const v705=v702["wire"];
v704=((v705) < (v666));}
v700=v704;
}
v698=v700;}
v689=v698;}else{
const v706="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v707;if((v667===v706)){
const v708=v665["a"];
const v709=((v708) < (v666));
let v710=v709;if(v710){
const v711=v665["b"];
v710=((v711) < (v666));}
const v712=v710;
let v713=v712;if(v713){
const v714=v665["c"];
v713=((v714) < (v666));}
v707=v713;}else{
const v715=v665["a"];
const v716=((v715) < (v666));
let v717=v716;if(v717){
const v718=v665["table"];
let v719=true;
for(let v720=0;v720<v718.length;v720++){
const v721=(v718[v720]>>>0);
const v722=v719;
let v723=v722;if(v723){
v723=((v721) < (v666));}
v719=v723;
}
v717=v719;}
v707=v717;}
v689=v707;}
v680=v689;}
v677=v680;}
v671=v677;}
v669=v671;}
return v669;}
function __fn38(v724,v725,v726){
const v727=v725.length;
const v728=4294967295;
const v729=((v727) > (v728));
let v730=v729;if(!v730){
const v731=(v725).length;
const v732=4294967295;
const v733=(((v732) - (v724)) >>> 0);
v730=((v731) > (v733));}
let v734;if(v730){
v734=false;}else{
const v735=(v725).length;
const v736=(((v724) + (v735)) >>> 0);
const v737=true;
let v738=({["wire"]:v724,["valid"]:v737});
for(let v739=0;v739<v725.length;v739++){
const v740=v725[v739];
const v741=v738;
const v742=v741["wire"];
const v743=1;
const v744=(((v742) + (v743)) >>> 0);
const v745=v738;
const v746=v745["valid"];
let v747=v746;if(v747){
const v748=v738;
const v749=v748["wire"];
v747=__fn37(v740,v749);}
const v750=v747;
v738=({["wire"]:v744,["valid"]:v750});
}
const v751=v738;
const v752=v751["valid"];
let v753=v752;if(v753){
let v754=true;
for(let v755=0;v755<v726.length;v755++){
const v756=(v726[v755]>>>0);
const v757=v754;
let v758=v757;if(v758){
v758=((v756) < (v736));}
v754=v758;
}
v753=v754;}
v734=v753;}
return v734;}
function __fn39(v759,v760,v761,v762){
const v763=v760.length;
const v764=4294967295;
const v765=((v763) > (v764));
let v766=v765;if(!v766){
v766=((v759) > (v762));}
const v767=v766;
let v768=v767;if(!v768){
const v769=(v760).length;
const v770=(((v762) - (v759)) >>> 0);
v768=((v769) > (v770));}
let v771;if(v768){
v771=({Err:"graph capacity"});}else{
const v772=__fn38(v759,v760,v761);
const v773=false;
let v774;if((v772===v773)){
v774=({Err:"graph is not topologically ordered"});}else{
const v775=(v760).length;
const v776=(((v759) + (v775)) >>> 0);
const v777=__bufferFill(v776,false);
let v778=({["live"]:v777});
for(let v779=0;v779<v761.length;v779++){
const v780=(v761[v779]>>>0);
const v781=v778;
const v782=v781["live"];
const v783=__tempSet(v782,v780,true,false);
v778=({["live"]:v783});
}
const v784=v778;
const v785=v784["live"];
let v786=({["live"]:v785,["wire"]:v776});
for(let v787=v760.length-1;v787>=0;v787--){
const v788=v760[v787];
const v789=v786;
v786=__fn36(v788,v789,v759);
}
const v790=v786;
const v791=v790["live"];
const v792=v791.freeze();
const v793=__bufferFill(v776,0);
let v794=v793;
for(let v795=0;v795<v759;v795++){
if(false){break;}
const v796=(v795>>>0);
const v797=v794;
v794=__tempSet(v797,v796,v796,false);}
const v798=v794;
let v799=({["next"]:v759,["positions"]:v798,["wire"]:v759});
for(let v800=0;v800<v760.length;v800++){
const v801=v760[v800];
const v802=v799;
const v803=v802["next"];
const v804=v799;
const v805=v804["positions"];
const v806=v799;
const v807=v806["wire"];
let v808;if(v807<v792.length){v808=v792[v807];}else{
v808=false;}
let v809;if(v808){
const v810=__tempSet(v805,v807,v803,false);
const v811=1;
const v812=(((v803) + (v811)) >>> 0);
const v813=1;
const v814=(((v807) + (v813)) >>> 0);
v809=({["next"]:v812,["positions"]:v810,["wire"]:v814});}else{
const v815=1;
const v816=(((v807) + (v815)) >>> 0);
v809=({["next"]:v803,["positions"]:v805,["wire"]:v816});}
v799=v809;
}
const v817=v799;
const v818=v817["next"];
const v819=v817["positions"];
const v820=v817["wire"];
const v821=v819.freeze();
const v822=new __InkBuffer([]);
let v823=({["compact"]:v822,["wire"]:v759});
for(let v824=0;v824<v760.length;v824++){
const v825=v760[v824];
const v826=v823;
const v827=v826["compact"];
const v828=v823;
const v829=v828["wire"];
let v830;if(v829<v792.length){v830=v792[v829];}else{
v830=false;}
let v831;if(v830){
const v832=__fn35(v825,v821);
const v833=__tempEdit(v827,"push",v832);
const v834=1;
const v835=(((v829) + (v834)) >>> 0);
v831=({["compact"]:v833,["wire"]:v835});}else{
const v836=1;
const v837=(((v829) + (v836)) >>> 0);
v831=({["compact"]:v827,["wire"]:v837});}
v823=v831;
}
const v838=v823;
const v839=v838["compact"];
const v840=v838["wire"];
const v841=v839.freeze();
const v842=v761.length;
const v843=new Array(v842);
for(let v844=0;v844<v842;v844++){
const v845=(v761[v844]>>>0);
let v846;if(v845<v821.length){v846=v821[v845];}else{
v846=0;}
v843[v844]=v846;
}
v774=({Ok:({["inputs"]:v759,["nodes"]:v841,["roots"]:v843})});}
v771=v774;}
return v771;}
function __fn40(v847){
return (v847["nodes"]).length;}
function __fn41(v848){
return v848["inputs"];}
function __fn42(v849){
return (v849["roots"]).length;}
function __fn43(v850,v851,v852){
const v853="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v854;if((v850===v853)){
const v855=__nfValue(v851);
const v856=__nfValue(v852);
v854=Math.fround(__nfNumber(v855) + __nfNumber(v856));}else{
const v857="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v858;if((v850===v857)){
const v859=__nfValue(v851);
const v860=__nfValue(v852);
v858=Math.fround(__nfNumber(v859) - __nfNumber(v860));}else{
const v861="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v862;if((v850===v861)){
const v863=__nfValue(v851);
const v864=__nfValue(v852);
v862=Math.fround(__nfNumber(v863) * __nfNumber(v864));}else{
v862=Math.fround((__nfNumber(__nfValue(v851)))/(__nfNumber(__nfValue(v852))));}
v858=v862;}
v854=v858;}
return v854;}
function __fn44(v865){
let v866;if(Number.isNaN(__nfNumber(__nfValue(v865)))){
v866=__nfFromBits(2143289344);}else{
const v867=__nfValue(v865);
const v868=__nfFromBits(0);
let v869;if(((__nfNumber(v867)) > (__nfNumber(v868)))){
v869=__nfValue(v865);}else{
v869=__nfFromBits(0);}
v866=v869;}
return v866;}
function __fn45(v870,v871){
const v872="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v873;if((v870===v872)){
v873=Math.fround(Math.sqrt(__nfNumber(__nfValue(v871))));}else{
const v874="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v875;if((v870===v874)){
const v876=__nfValue(v871);
v875=__nfNeg(v876);}else{
const v877="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v878;if((v870===v877)){
const v879=__nfValue(v871);
v878=__fn44(v879);}else{
const v880=__nfValue(v871);
const v881=__nfFromBits(0);
let v882;if(((__nfNumber(v880)) > (__nfNumber(v881)))){
v882=__nfFromBits(1065353216);}else{
v882=__nfFromBits(0);}
v878=v882;}
v875=v878;}
v873=v875;}
return v873;}
function __fn46(v883,v884){
const v885=v883["kind"];
const v886="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v887;if((v885===v886)){
v887=__nfValue(v883["value"]);}else{
const v888="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v889;if((v885===v888)){
const v890=v883["binary"];
const v891=v883["a"];
let v892;if(v891<v884.length){v892=v884.item(v891);}else{
v892=__nfFromBits(0);}
const v893=__nfValue(v892);
const v894=v883["b"];
let v895;if(v894<v884.length){v895=v884.item(v894);}else{
v895=__nfFromBits(0);}
const v896=__nfValue(v895);
v889=__fn43(v890,v893,v896);}else{
const v897="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v898;if((v885===v897)){
const v899=v883["unary"];
const v900=v883["a"];
let v901;if(v900<v884.length){v901=v884.item(v900);}else{
v901=__nfFromBits(0);}
const v902=__nfValue(v901);
v898=__fn45(v899,v902);}else{
const v903="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v904;if((v885===v903)){
v904=__nfFromBits(0);}else{
const v905="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v906;if((v885===v905)){
v906=__nfFromBits(0);}else{
const v907="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v908;if((v885===v907)){
const v909=v883["a"];
let v910;if(v909<v884.length){v910=v884.item(v909);}else{
v910=__nfFromBits(0);}
const v911=__nfValue(v910);
const v912=__nfFromBits(0);
let v913;if(((__nfNumber(v911)) > (__nfNumber(v912)))){
const v914=v883["c"];
let v915;if(v914<v884.length){v915=v884.item(v914);}else{
v915=__nfFromBits(0);}
v913=__nfValue(v915);}else{
const v916=v883["b"];
let v917;if(v916<v884.length){v917=v884.item(v916);}else{
v917=__nfFromBits(0);}
v913=__nfValue(v917);}
v908=v913;}else{
v908=__nfFromBits(0);}
v906=v908;}
v904=v906;}
v898=v904;}
v889=v898;}
v887=v889;}
const v918=v887;
const v919=__nfValue(v918);
return ({["values"]:v884,["value"]:v919});}
function __fn47(v920,v921,v922){
const v923=0;
const v924=(v920).length;
const v925=v920.range(v923,v924);
let v926=__nfValue(v922);
for(let v927=0;v927<v921.length;v927++){
const v928=v921[v927];
const v929=__nfValue(v926);
const v930=__nfValue(v928["coefficient"]);
const v931=v928["wire"];
let v932;if(v931<v925.length){v932=v925.item(v931);}else{
v932=__nfFromBits(0);}
const v933=__nfValue(v932);
const v934=Math.fround(__nfNumber(v930) * __nfNumber(v933));
v926=Math.fround(__nfNumber(v929) + v934);
}
const v935=__nfValue(v926);
const v936=__nfValue(v935);
return ({["values"]:v920,["value"]:v936});}
function __fn48(v937,v938){
const v939=v937["terms"];
const v940=__nfValue(v937["value"]);
const v941=__fn47(v938,v939,v940);
const v942=v941["values"];
const v943=v937["gates"];
const v944=__nfValue(v937["gate_bias"]);
const v945=__fn47(v942,v943,v944);
const v946=v945["values"];
const v947=__nfValue(v941["value"]);
const v948=__nfValue(v945["value"]);
const v949=__fn44(v948);
const v950=Math.fround(__nfNumber(v947) * __nfNumber(v949));
return ({["values"]:v946,["value"]:v950});}
function __fn49(v951,v952,v953,v954){
const v955=0;
const v956=(v952===v955);
let v957=v956;if(!v957){
const v958=Number.isFinite(__nfNumber(__nfValue(v951)));
const v959=false;
v957=(v958===v959);}
let v960;if(v957){
v960=({None:null});}else{
const v961=__nfValue(v951);
const v962=__nfFromBits(0);
let v963;if(((__nfNumber(v961)) < (__nfNumber(v962)))){
let v964;if(v953){
v964=({None:null});}else{
v964=({Some:0});}
v963=v964;}else{
const v965=__nfValue(v951);
const v966=Math.fround(v952);
let v967;if(((__nfNumber(v965)) >= (__nfNumber(v966)))){
let v968;if(v954){
v968=({None:null});}else{
const v969=1;
v968=({Some:(((v952) - (v969)) >>> 0)});}
v967=v968;}else{
v967=__ink_from_float(__nfNumber(__nfValue(v951)), "u32");}
v963=v967;}
v960=v963;}
return v960;}
function __fn50(v970,v971){
const v972=v970["a"];
let v973;if(v972<v971.length){v973=v971.item(v972);}else{
v973=__nfFromBits(0);}
const v974=__nfValue(v973);
const v975=(v970["table"]).length;
const v976=v970["below"];
const v977=v970["above"];
const v978=__fn49(v974,v975,v976,v977);
let v979;if(Object.hasOwn(v978,"Some")){
const v980=v978["Some"];
const v981=v970["table"];
let v982;if(v980<v981.length){v982=v981[v980];}else{
v982=0;}
const v983=v982;
let v984;if(v983<v971.length){v984=v971.item(v983);}else{
v984=__nfFromBits(0);}
v979=__nfValue(v984);}else{
const v985=null;
v979=__nfFromBits(0);}
const v986=__nfValue(v979);
const v987=__nfValue(v986);
return ({["values"]:v971,["value"]:v987});}
function __fn51(v988,v989){
const v990=v989["values"];
const v991=v989["finite_indices"];
let v992=v991;if(v992){
const v993=v988["kind"];
const v994="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v995=!(v993===v994);
let v996=v995;if(!v996){
const v997=v988["a"];
let v998;if(v997<v990.length){v998=v990.item(v997);}else{
v998=__nfFromBits(0);}
v996=Number.isFinite(__nfNumber(__nfValue(v998)));}
v992=v996;}
const v999=v992;
const v1000=v988["kind"];
const v1001="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1002;if((v1000===v1001)){
v1002=__fn46(v988,v990);}else{
const v1003="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1004;if((v1000===v1003)){
v1004=__fn46(v988,v990);}else{
const v1005="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1006;if((v1000===v1005)){
v1006=__fn46(v988,v990);}else{
const v1007="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1008;if((v1000===v1007)){
const v1009=v988["terms"];
const v1010=__nfValue(v988["value"]);
v1008=__fn47(v990,v1009,v1010);}else{
const v1011="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1012;if((v1000===v1011)){
v1012=__fn48(v988,v990);}else{
const v1013="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1014;if((v1000===v1013)){
v1014=__fn46(v988,v990);}else{
v1014=__fn50(v988,v990);}
v1012=v1014;}
v1008=v1012;}
v1006=v1008;}
v1004=v1006;}
v1002=v1004;}
const v1015=v1002;
const v1016=v1015["values"];
const v1017=__nfValue(v1015["value"]);
const v1018=__tempEdit(v1016,"push",v1017);
return ({["values"]:v1018,["finite_indices"]:v999});}
function __fn52(v1019,v1020){
const v1021=(v1020).length;
const v1022=v1019["inputs"];
let v1023;if(!(v1021===v1022)){
v1023=({Err:"graph input shape"});}else{
const v1024=v1019["inputs"];
const v1025=v1019["nodes"];
const v1026=v1019["roots"];
const v1027=__fn38(v1024,v1025,v1026);
const v1028=false;
let v1029;if((v1027===v1028)){
v1029=({Err:"invalid prepared graph"});}else{
const v1030=v1019["nodes"];
const v1031=new __InkBuffer(Array.from(v1020));
const v1032=true;
let v1033=({["values"]:v1031,["finite_indices"]:v1032});
for(let v1034=0;v1034<v1030.length;v1034++){
const v1035=v1030[v1034];
const v1036=v1033;
v1033=__fn51(v1035,v1036);
}
const v1037=v1033;
const v1038=v1037["values"];
const v1039=v1038.freeze();
const v1040=v1037["finite_indices"];
const v1041=false;
let v1042;if((v1040===v1041)){
v1042=({Err:"nonfinite graph index"});}else{
const v1043=v1019["roots"];
const v1044=v1043.length;
const v1045=new Array(v1044);
for(let v1046=0;v1046<v1044;v1046++){
const v1047=(v1043[v1046]>>>0);
let v1048;if(v1047<v1039.length){v1048=v1039[v1047];}else{
v1048=__nfFromBits(0);}
v1045[v1046]=__nfValue(v1048);
}
v1042=({Ok:({["values"]:v1039,["outputs"]:v1045})});}
v1029=v1042;}
v1023=v1029;}
return v1023;}
function __fn53(v1049,v1050){
const v1051=__fn52(v1049,v1050);
let v1052;if(Object.hasOwn(v1051,"Ok")){
const v1053=v1051["Ok"];
v1052=({Ok:v1053["outputs"]});}else{v1052=({Err:v1051.Err});}
return v1052;}
function __fn54(v1054,v1055,v1056){
let v1057;if(v1055<v1054.length){v1057=v1054.item(v1055);}else{
v1057=__nfFromBits(0);}
const v1058=__nfValue(v1057);
const v1059=__nfValue(v1058);
const v1060=__nfValue(v1056);
return __tempSet(v1054,v1055,Math.fround(__nfNumber(v1059) + __nfNumber(v1060)),false);}
function __fn55(v1061,v1062,v1063){
let v1064=({["g"]:v1061});
for(let v1065=0;v1065<v1062.length;v1065++){
const v1066=v1062[v1065];
const v1067=v1064;
const v1068=v1067["g"];
const v1069=v1066["wire"];
const v1070=__nfValue(v1063);
const v1071=__nfValue(v1066["coefficient"]);
const v1072=Math.fround(__nfNumber(v1070) * __nfNumber(v1071));
const v1073=__fn54(v1068,v1069,v1072);
v1064=({["g"]:v1073});
}
const v1074=v1064;
const v1075=v1074["g"];
return v1075;}
function __fn56(v1076,v1077){
const v1078="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1079;if((v1076===v1078)){
v1079=true;}else{
const v1080="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1081;if((v1076===v1080)){
v1081=true;}else{
const v1082="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1083;if((v1076===v1082)){
v1083=v1077["piecewise"];}else{
const v1084=v1077["boolean"];
const v1085="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v1083=!(v1084===v1085);}
v1081=v1083;}
v1079=v1081;}
return v1079;}
function __fn57(v1086,v1087){
const v1088=v1086["kind"];
const v1089="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1090;if((v1088===v1089)){
v1090=true;}else{
const v1091="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1092;if((v1088===v1091)){
v1092=true;}else{
const v1093="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1094;if((v1088===v1093)){
const v1095=v1086["unary"];
v1094=__fn56(v1095,v1087);}else{
const v1096="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1097;if((v1088===v1096)){
v1097=true;}else{
const v1098="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1099;if((v1088===v1098)){
v1099=v1087["piecewise"];}else{
const v1100="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1101;if((v1088===v1100)){
v1101=v1087["piecewise"];}else{
const v1102=v1087["index"];
const v1103="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v1101=!(v1102===v1103);}
v1099=v1101;}
v1097=v1099;}
v1094=v1097;}
v1092=v1094;}
v1090=v1092;}
return v1090;}
function __fn58(v1104,v1105,v1106,v1107,v1108,v1109,v1110){
const v1111=__nfValue(v1107);
let v1112=__nfValue(v1111);
for(let v1113=0;v1113<v1106.length;v1113++){
const v1114=v1106[v1113];
const v1115=__nfValue(v1112);
const v1116=__nfValue(v1114["coefficient"]);
const v1117=v1114["wire"];
let v1118;if(v1117<v1105.length){v1118=v1105[v1117];}else{
v1118=__nfFromBits(0);}
const v1119=__nfValue(v1118);
const v1120=__nfValue(v1119);
const v1121=Math.fround(__nfNumber(v1116) * __nfNumber(v1120));
v1112=Math.fround(__nfNumber(v1115) + v1121);
}
const v1122=v1112;
const v1123=__nfValue(v1122);
const v1124=__nfValue(v1109);
let v1125=__nfValue(v1124);
for(let v1126=0;v1126<v1108.length;v1126++){
const v1127=v1108[v1126];
const v1128=__nfValue(v1125);
const v1129=__nfValue(v1127["coefficient"]);
const v1130=v1127["wire"];
let v1131;if(v1130<v1105.length){v1131=v1105[v1130];}else{
v1131=__nfFromBits(0);}
const v1132=__nfValue(v1131);
const v1133=__nfValue(v1132);
const v1134=Math.fround(__nfNumber(v1129) * __nfNumber(v1133));
v1125=Math.fround(__nfNumber(v1128) + v1134);
}
const v1135=v1125;
const v1136=__nfValue(v1135);
const v1137=__nfValue(v1110);
const v1138=__nfValue(v1136);
const v1139=__fn44(v1138);
const v1140=Math.fround(__nfNumber(v1137) * __nfNumber(v1139));
const v1141=__fn55(v1104,v1106,v1140);
const v1142=__nfValue(v1136);
const v1143=__nfFromBits(0);
let v1144;if(((__nfNumber(v1142)) > (__nfNumber(v1143)))){
const v1145=__nfValue(v1110);
const v1146=__nfValue(v1123);
const v1147=Math.fround(__nfNumber(v1145) * __nfNumber(v1146));
v1144=__fn55(v1141,v1108,v1147);}else{
v1144=v1141;}
return v1144;}
function __fn59(v1148,v1149,v1150,v1151,v1152,v1153,v1154,v1155){
let v1156;if(v1150<v1149.length){v1156=v1149[v1150];}else{
v1156=__nfFromBits(0);}
const v1157=__nfValue(v1156);
const v1158=(v1151).length;
const v1159=0;
const v1160=((v1158) > (v1159));
let v1161=v1160;if(v1161){
const v1162=__nfValue(v1157);
const v1163=__nfFromBits(0);
const v1164=((__nfNumber(v1162)) < (__nfNumber(v1163)));
let v1165=v1164;if(v1165){
v1165=v1152;}
const v1166=v1165;
const v1167=false;
v1161=(v1166===v1167);}
const v1168=v1161;
let v1169=v1168;if(v1169){
const v1170=__nfValue(v1157);
const v1171=Math.fround(v1158);
const v1172=((__nfNumber(v1170)) >= (__nfNumber(v1171)));
let v1173=v1172;if(v1173){
v1173=v1153;}
const v1174=v1173;
const v1175=false;
v1169=(v1174===v1175);}
const v1176=v1169;
const v1177=__nfValue(v1157);
const v1178=__nfFromBits(0);
let v1179;if(((__nfNumber(v1177)) < (__nfNumber(v1178)))){
v1179=0;}else{
const v1180=__nfValue(v1157);
const v1181=Math.fround(v1158);
let v1182;if(((__nfNumber(v1180)) >= (__nfNumber(v1181)))){
const v1183=1;
v1182=(((v1158) - (v1183)) >>> 0);}else{
const v1184=__ink_from_float(__nfNumber(__nfValue(v1157)), "u32");
let v1185;if(Object.hasOwn(v1184,"Some")){
const v1186=v1184["Some"];
v1185=v1186;}else{
const v1187=null;
v1185=0;}
v1182=v1185;}
v1179=v1182;}
const v1188=v1179;
let v1189;if(v1176){
let v1190;if(v1188<v1151.length){v1190=v1151[v1188];}else{
v1190=0;}
const v1191=v1190;
const v1192=__nfValue(v1154);
v1189=__fn54(v1148,v1191,v1192);}else{
v1189=v1148;}
const v1193=v1189;
const v1194=Math.fround(Math.floor(__nfNumber(__nfValue(v1157))));
const v1195=(v1151).length;
const v1196=0;
let v1197;if((v1195===v1196)){
v1197=__nfFromBits(0);}else{
const v1198=__nfValue(v1194);
const v1199=__nfFromBits(0);
let v1200;if(((__nfNumber(v1198)) < (__nfNumber(v1199)))){
let v1201;if(v1152){
v1201=__nfFromBits(0);}else{
const v1202=0;
let v1203;if(v1202<v1151.length){v1203=v1151[v1202];}else{
v1203=0;}
const v1204=v1203;
let v1205;if(v1204<v1149.length){v1205=v1149[v1204];}else{
v1205=__nfFromBits(0);}
const v1206=__nfValue(v1205);
v1201=__nfValue(v1206);}
v1200=v1201;}else{
const v1207=__nfValue(v1194);
const v1208=Math.fround((v1151).length);
let v1209;if(((__nfNumber(v1207)) >= (__nfNumber(v1208)))){
let v1210;if(v1153){
v1210=__nfFromBits(0);}else{
const v1211=(v1151).length;
const v1212=1;
const v1213=(((v1211) - (v1212)) >>> 0);
let v1214;if(v1213<v1151.length){v1214=v1151[v1213];}else{
v1214=0;}
const v1215=v1214;
let v1216;if(v1215<v1149.length){v1216=v1149[v1215];}else{
v1216=__nfFromBits(0);}
const v1217=__nfValue(v1216);
v1210=__nfValue(v1217);}
v1209=v1210;}else{
const v1218=__ink_from_float(__nfNumber(__nfValue(v1194)), "u32");
let v1219;if(Object.hasOwn(v1218,"Some")){
const v1220=v1218["Some"];
v1219=v1220;}else{
const v1221=null;
v1219=0;}
const v1222=v1219;
let v1223;if(v1222<v1151.length){v1223=v1151[v1222];}else{
v1223=0;}
const v1224=v1223;
let v1225;if(v1224<v1149.length){v1225=v1149[v1224];}else{
v1225=__nfFromBits(0);}
const v1226=__nfValue(v1225);
v1209=__nfValue(v1226);}
v1200=v1209;}
v1197=v1200;}
const v1227=v1197;
const v1228=__nfValue(v1227);
const v1229=Math.fround(Math.floor(__nfNumber(__nfValue(v1157))));
const v1230=__nfFromBits(1065353216);
const v1231=Math.fround(__nfNumber(v1229) - v1230);
const v1232=(v1151).length;
const v1233=0;
let v1234;if((v1232===v1233)){
v1234=__nfFromBits(0);}else{
const v1235=__nfFromBits(0);
let v1236;if(((__nfNumber(v1231)) < (__nfNumber(v1235)))){
let v1237;if(v1152){
v1237=__nfFromBits(0);}else{
const v1238=0;
let v1239;if(v1238<v1151.length){v1239=v1151[v1238];}else{
v1239=0;}
const v1240=v1239;
let v1241;if(v1240<v1149.length){v1241=v1149[v1240];}else{
v1241=__nfFromBits(0);}
const v1242=__nfValue(v1241);
v1237=__nfValue(v1242);}
v1236=v1237;}else{
const v1243=Math.fround((v1151).length);
let v1244;if(((__nfNumber(v1231)) >= (__nfNumber(v1243)))){
let v1245;if(v1153){
v1245=__nfFromBits(0);}else{
const v1246=(v1151).length;
const v1247=1;
const v1248=(((v1246) - (v1247)) >>> 0);
let v1249;if(v1248<v1151.length){v1249=v1151[v1248];}else{
v1249=0;}
const v1250=v1249;
let v1251;if(v1250<v1149.length){v1251=v1149[v1250];}else{
v1251=__nfFromBits(0);}
const v1252=__nfValue(v1251);
v1245=__nfValue(v1252);}
v1244=v1245;}else{
const v1253=__ink_from_float(__nfNumber(v1231), "u32");
let v1254;if(Object.hasOwn(v1253,"Some")){
const v1255=v1253["Some"];
v1254=v1255;}else{
const v1256=null;
v1254=0;}
const v1257=v1254;
let v1258;if(v1257<v1151.length){v1258=v1151[v1257];}else{
v1258=0;}
const v1259=v1258;
let v1260;if(v1259<v1149.length){v1260=v1149[v1259];}else{
v1260=__nfFromBits(0);}
const v1261=__nfValue(v1260);
v1244=__nfValue(v1261);}
v1236=v1244;}
v1234=v1236;}
const v1262=v1234;
const v1263=__nfValue(v1262);
const v1264=Math.fround(__nfNumber(v1228) - __nfNumber(v1263));
const v1265=v1155["index"];
const v1266="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference";
let v1267;if((v1265===v1266)){
const v1268=__nfValue(v1154);
const v1269=Math.fround(__nfNumber(v1268) * v1264);
v1267=__fn54(v1193,v1150,v1269);}else{
v1267=v1193;}
return v1267;}
function __fn60(v1270,v1271,v1272,v1273,v1274,v1275){
const v1276="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v1277;if((v1270===v1276)){
const v1278=__nfValue(v1275);
const v1279=__fn54(v1271,v1273,v1278);
const v1280=__nfValue(v1275);
v1277=__fn54(v1279,v1274,v1280);}else{
const v1281="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v1282;if((v1270===v1281)){
const v1283=__nfValue(v1275);
const v1284=__fn54(v1271,v1273,v1283);
const v1285=__nfValue(v1275);
const v1286=__nfNeg(v1285);
v1282=__fn54(v1284,v1274,v1286);}else{
const v1287="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v1288;if((v1270===v1287)){
const v1289=__nfValue(v1275);
let v1290;if(v1274<v1272.length){v1290=v1272[v1274];}else{
v1290=__nfFromBits(0);}
const v1291=__nfValue(v1290);
const v1292=Math.fround(__nfNumber(v1289) * __nfNumber(v1291));
const v1293=__fn54(v1271,v1273,v1292);
const v1294=__nfValue(v1275);
let v1295;if(v1273<v1272.length){v1295=v1272[v1273];}else{
v1295=__nfFromBits(0);}
const v1296=__nfValue(v1295);
const v1297=Math.fround(__nfNumber(v1294) * __nfNumber(v1296));
v1288=__fn54(v1293,v1274,v1297);}else{
let v1298;if(v1274<v1272.length){v1298=v1272[v1274];}else{
v1298=__nfFromBits(0);}
const v1299=Math.fround((__nfNumber(__nfValue(v1275)))/(__nfNumber(__nfValue(v1298))));
const v1300=__fn54(v1271,v1273,v1299);
const v1301=__nfValue(v1275);
let v1302;if(v1273<v1272.length){v1302=v1272[v1273];}else{
v1302=__nfFromBits(0);}
const v1303=__nfValue(v1302);
let v1304;if(v1274<v1272.length){v1304=v1272[v1274];}else{
v1304=__nfFromBits(0);}
const v1305=__nfValue(v1304);
let v1306;if(v1274<v1272.length){v1306=v1272[v1274];}else{
v1306=__nfFromBits(0);}
const v1307=__nfValue(v1306);
const v1308=Math.fround((__nfNumber(Math.fround(__nfNumber(v1301) * __nfNumber(v1303))))/(__nfNumber(Math.fround(__nfNumber(v1305) * __nfNumber(v1307)))));
const v1309=__nfNeg(v1308);
v1288=__fn54(v1300,v1274,v1309);}
v1282=v1288;}
v1277=v1282;}
return v1277;}
function __fn61(v1310,v1311,v1312,v1313,v1314,v1315,v1316){
const v1317="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1318;if((v1310===v1317)){
const v1319=__nfFromBits(1073741824);
let v1320;if(v1314<v1312.length){v1320=v1312[v1314];}else{
v1320=__nfFromBits(0);}
const v1321=__nfValue(v1320);
const v1322=Math.fround((__nfNumber(__nfValue(v1315)))/(__nfNumber(Math.fround(v1319 * __nfNumber(v1321)))));
v1318=__fn54(v1311,v1313,v1322);}else{
const v1323="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1324;if((v1310===v1323)){
const v1325=__nfValue(v1315);
const v1326=__nfNeg(v1325);
v1324=__fn54(v1311,v1313,v1326);}else{
const v1327="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1328;if((v1310===v1327)){
let v1329;if(v1313<v1312.length){v1329=v1312[v1313];}else{
v1329=__nfFromBits(0);}
let v1330;if(Number.isNaN(__nfNumber(__nfValue(v1329)))){
const v1331=__nfFromBits(2143289344);
v1330=__fn54(v1311,v1313,v1331);}else{
let v1332;if(v1313<v1312.length){v1332=v1312[v1313];}else{
v1332=__nfFromBits(0);}
const v1333=__nfValue(v1332);
const v1334=__nfFromBits(0);
let v1335;if(((__nfNumber(v1333)) > (__nfNumber(v1334)))){
const v1336=__nfValue(v1315);
v1335=__fn54(v1311,v1313,v1336);}else{
v1335=v1311;}
v1330=v1335;}
v1328=v1330;}else{
const v1337=v1316["boolean"];
const v1338="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough";
let v1339;if((v1337===v1338)){
const v1340=__nfValue(v1315);
v1339=__fn54(v1311,v1313,v1340);}else{
v1339=v1311;}
v1328=v1339;}
v1324=v1328;}
v1318=v1324;}
return v1318;}
function __fn62(v1341,v1342,v1343,v1344){
const v1345=v1342["wire"];
const v1346=1;
const v1347=(((v1345) - (v1346)) >>> 0);
const v1348=v1342["gradient"];
let v1349;if(v1347<v1348.length){v1349=v1348.item(v1347);}else{
v1349=__nfFromBits(0);}
const v1350=__nfValue(v1349);
const v1351=v1344["zero"];
const v1352="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
const v1353=(v1351===v1352);
let v1354=v1353;if(v1354){
const v1355=__nfValue(v1350);
const v1356=__nfFromBits(0);
v1354=((__nfNumber(v1355)) === (__nfNumber(v1356)));}
let v1357;if(v1354){
v1357=({["gradient"]:v1348,["wire"]:v1347});}else{
const v1358=v1341["kind"];
const v1359="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1360;if((v1358===v1359)){
v1360=v1348;}else{
const v1361="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1362;if((v1358===v1361)){
const v1363=v1341["binary"];
const v1364=v1341["a"];
const v1365=v1341["b"];
const v1366=__nfValue(v1350);
v1362=__fn60(v1363,v1348,v1343,v1364,v1365,v1366);}else{
const v1367="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1368;if((v1358===v1367)){
const v1369=v1341["unary"];
const v1370=v1341["a"];
const v1371=__nfValue(v1350);
v1368=__fn61(v1369,v1348,v1343,v1370,v1347,v1371,v1344);}else{
const v1372="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1373;if((v1358===v1372)){
const v1374=v1341["terms"];
const v1375=__nfValue(v1350);
v1373=__fn55(v1348,v1374,v1375);}else{
const v1376="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1377;if((v1358===v1376)){
const v1378=v1341["terms"];
const v1379=__nfValue(v1341["value"]);
const v1380=v1341["gates"];
const v1381=__nfValue(v1341["gate_bias"]);
const v1382=__nfValue(v1350);
v1377=__fn58(v1348,v1343,v1378,v1379,v1380,v1381,v1382);}else{
const v1383="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1384;if((v1358===v1383)){
const v1385=v1341["a"];
let v1386;if(v1385<v1343.length){v1386=v1343[v1385];}else{
v1386=__nfFromBits(0);}
const v1387=__nfValue(v1386);
const v1388=__nfFromBits(0);
let v1389;if(((__nfNumber(v1387)) > (__nfNumber(v1388)))){
const v1390=v1341["c"];
const v1391=__nfValue(v1350);
v1389=__fn54(v1348,v1390,v1391);}else{
const v1392=v1341["b"];
const v1393=__nfValue(v1350);
v1389=__fn54(v1348,v1392,v1393);}
v1384=v1389;}else{
const v1394=v1341["a"];
const v1395=v1341["table"];
const v1396=v1341["below"];
const v1397=v1341["above"];
const v1398=__nfValue(v1350);
v1384=__fn59(v1348,v1343,v1394,v1395,v1396,v1397,v1398,v1344);}
v1377=v1384;}
v1373=v1377;}
v1368=v1373;}
v1362=v1368;}
v1360=v1362;}
const v1399=v1360;
v1357=({["gradient"]:v1399,["wire"]:v1347});}
return v1357;}
function __fn63(v1400,v1401,v1402,v1403){
const v1404=(v1401).length;
const v1405=v1400["inputs"];
const v1406=(v1400["nodes"]).length;
const v1407=(((v1405) + (v1406)) >>> 0);
const v1408=!(v1404===v1407);
let v1409=v1408;if(!v1409){
const v1410=(v1402).length;
const v1411=(v1400["roots"]).length;
v1409=!(v1410===v1411);}
const v1412=v1409;
let v1413=v1412;if(!v1413){
const v1414=v1400["inputs"];
const v1415=v1400["nodes"];
const v1416=v1400["roots"];
const v1417=__fn38(v1414,v1415,v1416);
const v1418=false;
v1413=(v1417===v1418);}
let v1419;if(v1413){
v1419=({Err:"cotangent shape"});}else{
v1419=__fn64(v1400,v1401,v1402,v1403);}
return v1419;}
function __fn64(v1420,v1421,v1422,v1423){
const v1424=v1420["nodes"];
let v1425=true;
for(let v1426=0;v1426<v1424.length;v1426++){
const v1427=v1424[v1426];
const v1428=v1425;
let v1429=v1428;if(v1429){
v1429=__fn57(v1427,v1423);}
v1425=v1429;
}
const v1430=v1425;
const v1431=false;
let v1432;if((v1430===v1431)){
v1432=({Err:"explicit gradient policy required"});}else{
const v1433=__bufferFill((v1421).length,__nfFromBits(0));
const v1434=0;
let v1435=({["g"]:v1433,["i"]:v1434});
for(let v1436=0;v1436<v1422.length;v1436++){
const v1437=v1422[v1436];
const v1438=v1435;
const v1439=v1438["g"];
const v1440=v1435;
const v1441=v1440["i"];
const v1442=v1420["roots"];
let v1443;if(v1441<v1442.length){v1443=v1442[v1441];}else{
v1443=0;}
const v1444=v1443;
const v1445=__nfValue(v1437);
const v1446=__fn54(v1439,v1444,v1445);
const v1447=1;
const v1448=(((v1441) + (v1447)) >>> 0);
v1435=({["g"]:v1446,["i"]:v1448});
}
const v1449=v1435;
const v1450=v1449["g"];
const v1451=v1449["i"];
const v1452=v1420["nodes"];
const v1453=(v1421).length;
let v1454=({["gradient"]:v1450,["wire"]:v1453});
for(let v1455=v1452.length-1;v1455>=0;v1455--){
const v1456=v1452[v1455];
const v1457=v1454;
v1454=__fn62(v1456,v1457,v1421,v1423);
}
const v1458=v1454;
const v1459=v1458["gradient"];
const v1460=v1459.freeze();
v1432=({Ok:v1460.slice(0,v1420["inputs"])});}
return v1432;}
function __fn65(v1461,v1462,v1463,v1464){
const v1465=(v1463).length;
const v1466=(v1461["roots"]).length;
let v1467;if(!(v1465===v1466)){
v1467=({Err:"cotangent shape"});}else{
const v1468=__fn52(v1461,v1462);
let v1469;if(Object.hasOwn(v1468,"Ok")){
const v1470=v1468["Ok"];
const v1471=v1470["values"];
const v1472=__fn64(v1461,v1471,v1463,v1464);
let v1473;if(Object.hasOwn(v1472,"Ok")){
const v1474=v1472["Ok"];
const v1475=v1470["outputs"];
v1473=({Ok:({["outputs"]:v1475,["gradient"]:v1474})});}else{
const v1476=v1472["Err"];
v1473=({Err:v1476});}
v1469=v1473;}else{
const v1477=v1468["Err"];
v1469=({Err:v1477});}
v1467=v1469;}
return v1467;}
function __fn66(v1478,v1479,v1480,v1481){
const v1482=(v1480).length;
const v1483=0;
const v1484=(v1482===v1483);
let v1485=v1484;if(!v1485){
const v1486=(v1480).length;
const v1487=(v1478["roots"]).length;
v1485=!(v1486===v1487);}
let v1488;if(v1485){
v1488=({Err:"target shape"});}else{
const v1489=__fn52(v1478,v1479);
let v1490;if(Object.hasOwn(v1489,"Ok")){
const v1491=v1489["Ok"];
const v1492=v1491["outputs"];
const v1493=Math.min(v1492.length,v1480.length);
const v1494=new Array(v1493);
for(let v1495=0;v1495<v1493;v1495++){
const v1496=v1492[v1495];
const v1497=v1480[v1495];
const v1498=__nfValue(v1496);
const v1499=__nfValue(v1497);
v1494[v1495]=Math.fround(__nfNumber(v1498) - __nfNumber(v1499));
}
const v1500=Math.fround((v1480).length);
const v1501=v1494.length;
const v1502=new Array(v1501);
for(let v1503=0;v1503<v1501;v1503++){
const v1504=v1494[v1503];
const v1505=__nfValue(v1504);
const v1506=__nfValue(v1504);
v1502[v1503]=Math.fround(__nfNumber(v1505) * __nfNumber(v1506));
}
let v1507=0;for(let v1508=0;v1508<v1502.length;v1508++){
const v1509=v1502[v1508];
v1507=Math.fround(__nfNumber(v1507) + __nfNumber(v1509));}
const v1510=Math.fround((__nfNumber(v1507))/(__nfNumber(__nfValue(v1500))));
const v1511=Number.isFinite(__nfNumber(v1510));
const v1512=false;
let v1513;if((v1511===v1512)){
v1513=({Err:"nonfinite loss"});}else{
const v1514=v1494.length;
const v1515=new Array(v1514);
for(let v1516=0;v1516<v1514;v1516++){
const v1517=v1494[v1516];
const v1518=__nfFromBits(1073741824);
const v1519=__nfValue(v1517);
v1515[v1516]=Math.fround((__nfNumber(Math.fround(v1518 * __nfNumber(v1519))))/(__nfNumber(__nfValue(v1500))));
}
const v1520=v1491["values"];
const v1521=__fn64(v1478,v1520,v1515,v1481);
let v1522;if(Object.hasOwn(v1521,"Ok")){
const v1523=v1521["Ok"];
const v1524=v1491["outputs"];
v1522=({Ok:({["loss"]:v1510,["outputs"]:v1524,["gradient"]:v1523})});}else{
const v1525=v1521["Err"];
v1522=({Err:v1525});}
v1513=v1522;}
v1490=v1513;}else{
const v1526=v1489["Err"];
v1490=({Err:v1526});}
v1488=v1490;}
return v1488;}
function __into34(v1527,v1528){
const v1529=v1527["kind"];
const v1530="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1531;if((v1529===v1530)){
const v1532=[];
const v1533=v1532.length;
for(let v1534=0;v1534<v1533;v1534++){
v1528[v1534]=v1532[v1534];
}
v1531=v1533;}else{
const v1535="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1536;if((v1529===v1535)){
const v1537=v1527["a"];
const v1538=v1527["b"];
const v1539=[v1537,v1538];
const v1540=v1539.length;
for(let v1541=0;v1541<v1540;v1541++){
v1528[v1541]=v1539[v1541];
}
v1536=v1540;}else{
const v1542="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1543;if((v1529===v1542)){
const v1544=v1527["a"];
const v1545=[v1544];
const v1546=v1545.length;
for(let v1547=0;v1547<v1546;v1547++){
v1528[v1547]=v1545[v1547];
}
v1543=v1546;}else{
const v1548="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1549;if((v1529===v1548)){
const v1550=v1527["terms"];
const v1551=v1550.length;
for(let v1553=0;v1553<v1551;v1553++){
const v1554=v1550[v1553];
v1528[v1553]=v1554["wire"];
}
v1549=v1551;}else{
const v1555="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1556;if((v1529===v1555)){
const v1557=v1527["terms"];
const v1558=v1557.length;
const v1559=new Array(v1558);
for(let v1560=0;v1560<v1558;v1560++){
const v1561=v1557[v1560];
v1559[v1560]=v1561["wire"];
}
const v1562=v1527["gates"];
const v1563=v1562.length;
const v1564=new Array(v1563);
for(let v1565=0;v1565<v1563;v1565++){
const v1566=v1562[v1565];
v1564[v1565]=v1566["wire"];
}
const v1567=v1559.length;
const v1568=v1564.length;
for(let v1569=0;v1569<v1567;v1569++){
v1528[0+v1569]=v1559[v1569];
}
for(let v1570=0;v1570<v1568;v1570++){
v1528[v1567+v1570]=v1564[v1570];
}
const v1571=v1567+v1568;
v1556=v1571;}else{
const v1572="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1573;if((v1529===v1572)){
const v1574=v1527["a"];
const v1575=v1527["b"];
const v1576=v1527["c"];
const v1577=[v1574,v1575,v1576];
const v1578=v1577.length;
for(let v1579=0;v1579<v1578;v1579++){
v1528[v1579]=v1577[v1579];
}
v1573=v1578;}else{
const v1580=v1527["a"];
const v1581=[v1580];
const v1582=v1527["table"];
const v1583=v1581.length;
const v1584=v1582.length;
for(let v1585=0;v1585<v1583;v1585++){
v1528[0+v1585]=v1581[v1585];
}
for(let v1586=0;v1586<v1584;v1586++){
v1528[v1583+v1586]=v1582[v1586];
}
const v1587=v1583+v1584;
v1573=v1587;}
v1556=v1573;}
v1549=v1556;}
v1543=v1549;}
v1536=v1543;}
v1531=v1536;}
return v1531;}
const __namedTypes={"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v13","core_sha256":"9338413f78e17f718fac03914ac343c278c1d2d146b19e45df99472e95eb7a7a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"network","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":1,"internal":false,"name":"predict","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":2,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":3,"internal":false,"name":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"destination":null,"index":4,"internal":true,"name":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","parallel":false,"params":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"inputs","type":{"kind":"u32"}},{"name":"parameter","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"}},{"destination":null,"index":5,"internal":true,"name":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":6,"internal":true,"name":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":7,"internal":true,"name":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":8,"internal":true,"name":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":9,"internal":false,"name":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","parallel":false,"params":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":10,"internal":false,"name":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":11,"internal":false,"name":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":12,"internal":false,"name":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":13,"internal":false,"name":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":14,"internal":false,"name":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":15,"internal":false,"name":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":16,"internal":false,"name":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":17,"internal":false,"name":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":18,"internal":false,"name":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":19,"internal":false,"name":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":20,"internal":false,"name":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":21,"internal":false,"name":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":22,"internal":false,"name":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":23,"internal":false,"name":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":24,"internal":false,"name":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":25,"internal":false,"name":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":26,"internal":false,"name":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":27,"internal":false,"name":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":28,"internal":false,"name":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":29,"internal":false,"name":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","parallel":false,"params":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":30,"internal":false,"name":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","parallel":false,"params":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":31,"internal":false,"name":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":32,"internal":false,"name":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":33,"internal":false,"name":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":34,"internal":false,"name":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":35,"internal":false,"name":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":36,"internal":true,"name":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"name":"inputs","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"destination":null,"index":37,"internal":false,"name":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":38,"internal":false,"name":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":39,"internal":false,"name":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},{"destination":null,"index":40,"internal":false,"name":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":41,"internal":false,"name":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":42,"internal":false,"name":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":43,"internal":false,"name":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":44,"internal":false,"name":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":45,"internal":false,"name":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":46,"internal":true,"name":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":47,"internal":true,"name":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","parallel":false,"params":[{"name":"values","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":48,"internal":true,"name":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":49,"internal":false,"name":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","parallel":false,"params":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":50,"internal":true,"name":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":51,"internal":true,"name":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}},{"destination":null,"index":52,"internal":false,"name":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},{"destination":null,"index":53,"internal":false,"name":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":54,"internal":true,"name":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":55,"internal":true,"name":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":56,"internal":false,"name":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":57,"internal":false,"name":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":58,"internal":true,"name":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ts","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gs","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":59,"internal":true,"name":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":60,"internal":true,"name":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":61,"internal":true,"name":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"wire","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":62,"internal":true,"name":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"destination":null,"index":63,"internal":false,"name":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":64,"internal":false,"name":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":65,"internal":false,"name":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},{"destination":null,"index":66,"internal":false,"name":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}],"named_types":{"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"delegated_calls":1,"factory":true,"function":"network","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"predict","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"derivatives","retained_bindings":0},{"delegated_calls":0,"factory":true,"function":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","retained_bindings":6},{"factory":false,"function":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":3,"factory":true,"function":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","retained_bindings":10},{"factory":false,"function":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","retained_bindings":0},{"factory":false,"function":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","retained_bindings":2},{"delegated_calls":0,"factory":true,"function":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","retained_bindings":2},{"delegated_calls":0,"factory":true,"function":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","retained_bindings":0},{"delegated_calls":0,"factory":true,"function":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","retained_bindings":3},{"delegated_calls":0,"factory":true,"function":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","retained_bindings":5},{"delegated_calls":0,"factory":true,"function":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","retained_bindings":2},{"delegated_calls":0,"factory":true,"function":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","retained_bindings":4},{"factory":false,"function":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","retained_bindings":12},{"factory":false,"function":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","retained_bindings":10},{"factory":false,"function":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","retained_bindings":1},{"factory":false,"function":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","retained_bindings":1},{"factory":false,"function":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":1,"factory":true,"function":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","retained_bindings":0},{"factory":false,"function":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","retained_bindings":1},{"factory":false,"function":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":2,"factory":true,"function":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","retained_bindings":3},{"delegated_calls":1,"factory":true,"function":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","retained_bindings":0}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"66b5345fc0cf9b6c2f592ee9b987411cbf17923f512aeb095f808cc9069307cb","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda":{"arguments":{"format":"ink-value-wire-v1","identity":"7254fbee57d42f736c0f825449a9b065c12198183b33b26d30428ff920a008ae","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b":{"arguments":{"format":"ink-value-wire-v1","identity":"555dc53c180f658bfeadabb7dc93faee3ecb050e4d361f2317d479a981d70366","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}}},"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef":{"arguments":{"format":"ink-value-wire-v1","identity":"28ef8297283ebede64ffe544630efa9356af29e3803672c36e707dc524c40af1","named":{},"root":{"fields":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}}},"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885":{"arguments":{"format":"ink-value-wire-v1","identity":"2e0e1dcbe39022ec0013995dcb0ad9599bb14f81894818dd7060c98db35e5d34","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54":{"arguments":{"format":"ink-value-wire-v1","identity":"2c9054b387b8572a66262afe8a2faee4b7a920b3a5bfb92db1126257747f1fd0","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37":{"arguments":{"format":"ink-value-wire-v1","identity":"d4cb0361a7a8833933106ca6dd70006e19100c770fe048f31d961bc14fa899fc","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926":{"arguments":{"format":"ink-value-wire-v1","identity":"b04b32203f8d88e2db519e2e81cbaa387f5a1fa076ea8a147c2b109278fe5299","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":{"unsupported":"unsupported wire descriptor"},"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b":{"arguments":{"format":"ink-value-wire-v1","identity":"17ee49e34ea5590c8aa89fbcc5cdde0b5e5b337ceaabb58d902e892e0b22008f","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":{"unsupported":"unsupported wire descriptor"},"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680":{"arguments":{"format":"ink-value-wire-v1","identity":"1a130fd0ae83873939c3a1dd7db0523d36e865b9102a6628c436dd1503402d53","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":{"unsupported":"unsupported wire descriptor"},"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3":{"arguments":{"format":"ink-value-wire-v1","identity":"f6ca75f73d60cd2314d69c64454363e593db695767e343195d3b23919755c574","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5":{"arguments":{"format":"ink-value-wire-v1","identity":"3061a46bc74994007e2c94750186c015993dcdb0b813ca54f2c8031fbae28ae1","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":{"unsupported":"unsupported wire descriptor"},"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30":{"arguments":{"format":"ink-value-wire-v1","identity":"c25723d7f2d5c86fdce912dff77de10ffff544058fed24a24e223b43ca727991","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}}},"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":{"unsupported":"unsupported wire descriptor"},"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465":{"arguments":{"format":"ink-value-wire-v1","identity":"857eb1fd05b55c610f44a62e8bf5909738cf119299eddaf110ddd150f5e6272d","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":{"unsupported":"unsupported wire descriptor"},"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e":{"arguments":{"format":"ink-value-wire-v1","identity":"ed136e460e172de1e9db88a4ce327b9fc66430265d41930c518abc13cfe2e33e","named":{},"root":{"fields":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870":{"arguments":{"format":"ink-value-wire-v1","identity":"1f67ce9481e7bf03a3ba8bccc64b89e5b1d9b8f8a998daa1446d82f94a820dea","named":{},"root":{"fields":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2":{"arguments":{"format":"ink-value-wire-v1","identity":"6d8292587d247aa2935d40c05b97e3e8ee25c23a651a20e8a39f9b9a91a4167f","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":{"unsupported":"unsupported wire descriptor"},"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":{"unsupported":"unsupported wire descriptor"},"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c":{"arguments":{"format":"ink-value-wire-v1","identity":"1f3d1f2e5000eabd3285bec367aea83311b89ab0ac1924cb638c4d675e087937","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc":{"arguments":{"format":"ink-value-wire-v1","identity":"607073caea048d19b6ff898d804ca7c0689e88386444b2d2fbfb06bd1c9a0b07","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":{"unsupported":"unsupported wire descriptor"},"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":{"unsupported":"unsupported wire descriptor"},"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e":{"arguments":{"format":"ink-value-wire-v1","identity":"7aa59bf208f3650543459db164197f9767215047ec4b0a391fd81b408a47694a","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":{"unsupported":"unsupported wire descriptor"},"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":{"unsupported":"unsupported wire descriptor"},"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0":{"arguments":{"format":"ink-value-wire-v1","identity":"fc196cc25690823dcbe69ce5b7beb1a54cfad2f6a3a27524d4fe309db03538c6","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096":{"arguments":{"format":"ink-value-wire-v1","identity":"bb4f6cbf585c1725e771d97023bb1e02f6c172cf56394954edf02c361e6ffc0e","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd":{"arguments":{"format":"ink-value-wire-v1","identity":"700a0161a0e4bb6ba9dbf453a8dfe5ea8476df708b4a84e6f0946c2a3667f241","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919":{"arguments":{"format":"ink-value-wire-v1","identity":"75df379d5249d5925250176c06044d8eed3cdd1bbcada81ac35d377b355cba75","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":{"unsupported":"unsupported wire descriptor"},"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c":{"arguments":{"format":"ink-value-wire-v1","identity":"3f17cb2fa22c2f1c799254580140d2b7d9f44d03f28a4e0c26daf7520e8fd345","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d":{"arguments":{"format":"ink-value-wire-v1","identity":"468c20c617405d169739cb1297bc13838a3c83cc05dec2f1e904ba16794225fd","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":{},"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}},"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":{"unsupported":"unsupported wire descriptor"},"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":{"unsupported":"unsupported wire descriptor"},"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":{"unsupported":"unsupported wire descriptor"},"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":{"unsupported":"unsupported wire descriptor"},"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":{"unsupported":"unsupported wire descriptor"},"network":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"predict":{"arguments":{"format":"ink-value-wire-v1","identity":"52008da29dbc58d254eca7d42a46144e532dd7f71050928ac698f667999edecd","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18,__fn19,__fn20,__fn21,__fn22,__fn23,__fn24,__fn25,__fn26,__fn27,__fn28,__fn29,__fn30,__fn31,__fn32,__fn33,__fn34,__fn35,__fn36,__fn37,__fn38,__fn39,__fn40,__fn41,__fn42,__fn43,__fn44,__fn45,__fn46,__fn47,__fn48,__fn49,__fn50,__fn51,__fn52,__fn53,__fn54,__fn55,__fn56,__fn57,__fn58,__fn59,__fn60,__fn61,__fn62,__fn63,__fn64,__fn65,__fn66];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[],"types":[]},{"capture":[false,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},{"kind":"u32"},{"kind":"bool"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"kind":"temporary"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[false,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false],"types":[{"fields":[{"name":"parameters","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false],"types":[{"fields":[{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true,true],"types":[{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true,true],"types":[{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"kind":"u32"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"bool"},{"kind":"bool"}]},{"capture":[],"types":[]},{"capture":[],"types":[]},{"capture":[],"types":[]},{"capture":[false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}]},{"capture":[true,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[false,false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"u32"}]},{"capture":[true,false,true],"types":[{"kind":"u32"},{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"}]},{"capture":[false],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[false],"types":[{"fields":[{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[true,false,true],"types":[{"kind":"temporary"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[true,true,true,true],"types":[{"kind":"f32"},{"kind":"u32"},{"kind":"bool"},{"kind":"bool"}]},{"capture":[false,true],"types":[{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[false,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}]},{"capture":[false,true],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"kind":"temporary"},{"kind":"u32"},{"kind":"f32"}]},{"capture":[true,false,true],"types":[{"kind":"temporary"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,false],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[true,true,false,true,false,true,true],"types":[{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,true,true,false],"types":[{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"bool"},{"kind":"bool"},{"kind":"f32"},{"fields":[{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[true,true,true,true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,true,false],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"},{"kind":"f32"},{"fields":[{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,false,true,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]}];

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
export function call(name,args) {switch(name){case "ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":case "ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":case "ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":case "ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":case "ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":case "ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":case "ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":case "ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":case "ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":case "ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":case "ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":case "ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":case "ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":case "ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":case "ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":case "ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":case "ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":case "ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":throw new Error('temporary storage is internal to a pure invocation');}return functions[name](...args);}
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
function __ownedValue4(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue5(value[i],budget,depth+1);return out;}
function __ownedValue10(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue11(value[i],budget,depth+1);return out;}
function __ownedValue16(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue9(value[i],budget,depth+1);return out;}
function __ownedValue12(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue3(value[i],budget,depth+1);return out;}
function __ownedValue25(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue3(value.Some,budget,depth+1)};}
function __ownedValue15(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue16(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue1(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue24(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue2(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue17(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue18(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue28(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue29(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue27(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["graph"]:__ownedValue2(value["graph"],budget,depth+1),["parameters"]:__ownedValue3(value["parameters"],budget,depth+1),["features"]:__ownedValue3(value["features"],budget,depth+1),["outputs"]:__ownedValue3(value["outputs"],budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["inputs"]:__ownedValue3(value["inputs"],budget,depth+1),["nodes"]:__ownedValue4(value["nodes"],budget,depth+1),["roots"]:__ownedValue12(value["roots"],budget,depth+1)};}
function __ownedValue5(value,budget,depth){budget.enter(depth,4);return {["kind"]:__ownedValue6(value["kind"],budget,depth+1),["binary"]:__ownedValue7(value["binary"],budget,depth+1),["unary"]:__ownedValue8(value["unary"],budget,depth+1),["a"]:__ownedValue3(value["a"],budget,depth+1),["b"]:__ownedValue3(value["b"],budget,depth+1),["c"]:__ownedValue3(value["c"],budget,depth+1),["value"]:__ownedValue9(value["value"],budget,depth+1),["terms"]:__ownedValue10(value["terms"],budget,depth+1),["gates"]:__ownedValue10(value["gates"],budget,depth+1),["gate_bias"]:__ownedValue9(value["gate_bias"],budget,depth+1),["table"]:__ownedValue12(value["table"],budget,depth+1),["below"]:__ownedValue13(value["below"],budget,depth+1),["above"]:__ownedValue13(value["above"],budget,depth+1)};}
function __ownedValue18(value,budget,depth){budget.enter(depth,4);return {["loss"]:__ownedValue9(value["loss"],budget,depth+1),["outputs"]:__ownedValue16(value["outputs"],budget,depth+1),["gradient"]:__ownedValue16(value["gradient"],budget,depth+1)};}
function __ownedValue29(value,budget,depth){budget.enter(depth,4);return {["outputs"]:__ownedValue16(value["outputs"],budget,depth+1),["gradient"]:__ownedValue16(value["gradient"],budget,depth+1)};}
function __ownedValue19(value,budget,depth){budget.enter(depth,4);return {["parameters"]:__ownedValue3(value["parameters"],budget,depth+1),["nodes"]:__ownedValue3(value["nodes"],budget,depth+1),["width"]:__ownedValue3(value["width"],budget,depth+1),["valid"]:__ownedValue13(value["valid"],budget,depth+1)};}
function __ownedValue20(value,budget,depth){budget.enter(depth,4);return {["piecewise"]:__ownedValue13(value["piecewise"],budget,depth+1),["boolean"]:__ownedValue21(value["boolean"],budget,depth+1),["index"]:__ownedValue22(value["index"],budget,depth+1),["zero"]:__ownedValue23(value["zero"],budget,depth+1)};}
function __ownedValue27(value,budget,depth){budget.enter(depth,4);return {["values"]:__ownedValue16(value["values"],budget,depth+1),["outputs"]:__ownedValue16(value["outputs"],budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,4);return {["wire"]:__ownedValue3(value["wire"],budget,depth+1),["coefficient"]:__ownedValue9(value["coefficient"],budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue22(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue23(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue7(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue21(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue9(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __ownedValue14(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["network",__ownedValue0],["predict",__ownedValue15],["derivatives",__ownedValue17],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",__ownedValue19],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",__ownedValue0],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",__ownedValue3],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",__ownedValue3],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",__ownedValue3],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",__ownedValue15],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",__ownedValue17],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",__ownedValue5],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",__ownedValue5],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",__ownedValue5],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",__ownedValue5],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",__ownedValue5],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",__ownedValue5],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",__ownedValue5],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",__ownedValue5],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",__ownedValue5],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",__ownedValue5],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",__ownedValue5],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",__ownedValue5],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",__ownedValue5],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",__ownedValue5],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",__ownedValue5],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",__ownedValue5],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",__ownedValue20],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",__ownedValue20],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",__ownedValue20],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",__ownedValue12],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",__ownedValue5],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",__ownedValue13],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",__ownedValue13],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",__ownedValue24],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",__ownedValue3],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",__ownedValue3],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",__ownedValue3],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",__ownedValue9],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",__ownedValue9],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",__ownedValue9],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",__ownedValue25],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",__ownedValue26],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",__ownedValue15],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",__ownedValue13],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",__ownedValue13],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",__ownedValue15],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",__ownedValue15],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",__ownedValue28],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",__ownedValue17]]));
function __wireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue5(reader);reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue11(reader);reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue9(reader);reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue3(reader);reader.finish(end);return value;}
function __wireValue48(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue3(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue49(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue43(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue44(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue17(reader)}:{Ok:__wireValue26(reader)};reader.finish(end);return value;}
function __wireValue36(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __wireValue35(reader){const end=reader.frame();const value={["a"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue53(reader){const end=reader.frame();const value={["a"]:__wireValue3(reader),["b"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["a"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value={["features"]:__wireValue3(reader),["hidden"]:__wireValue12(reader),["outputs"]:__wireValue3(reader),["maximum"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue46(reader){const end=reader.frame();const value={["gate"]:__wireValue3(reader),["off"]:__wireValue3(reader),["on"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["graph"]:__wireValue2(reader),["parameters"]:__wireValue3(reader),["features"]:__wireValue3(reader),["outputs"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue47(reader){const end=reader.frame();const value={["index"]:__wireValue9(reader),["n"]:__wireValue3(reader),["below"]:__wireValue13(reader),["above"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue38(reader){const end=reader.frame();const value={["index"]:__wireValue3(reader),["table"]:__wireValue12(reader),["below"]:__wireValue13(reader),["above"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value={["inputs"]:__wireValue3(reader),["nodes"]:__wireValue4(reader),["roots"]:__wireValue12(reader),["maximum"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue56(reader){const end=reader.frame();const value={["inputs"]:__wireValue3(reader),["nodes"]:__wireValue4(reader),["roots"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={["inputs"]:__wireValue3(reader),["nodes"]:__wireValue4(reader),["roots"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value={["kind"]:__wireValue8(reader),["a"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue41(reader){const end=reader.frame();const value={["kind"]:__wireValue8(reader),["a"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["kind"]:__wireValue8(reader),["policy"]:__wireValue29(reader)};reader.finish(end);return value;}
function __wireValue55(reader){const end=reader.frame();const value={["kind"]:__wireValue6(reader),["a"]:__wireValue3(reader),["b"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["kind"]:__wireValue6(reader),["binary"]:__wireValue7(reader),["unary"]:__wireValue8(reader),["a"]:__wireValue3(reader),["b"]:__wireValue3(reader),["c"]:__wireValue3(reader),["value"]:__wireValue9(reader),["terms"]:__wireValue10(reader),["gates"]:__wireValue10(reader),["gate_bias"]:__wireValue9(reader),["table"]:__wireValue12(reader),["below"]:__wireValue13(reader),["above"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue51(reader){const end=reader.frame();const value={["kind"]:__wireValue7(reader),["a"]:__wireValue9(reader),["b"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue52(reader){const end=reader.frame();const value={["kind"]:__wireValue7(reader),["a"]:__wireValue3(reader),["b"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value={["loss"]:__wireValue9(reader),["outputs"]:__wireValue14(reader),["gradient"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["network"]:__wireValue1(reader),["weights"]:__wireValue14(reader),["context"]:__wireValue14(reader),["target"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue63(reader){const end=reader.frame();const value={["network"]:__wireValue1(reader),["weights"]:__wireValue14(reader),["context"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue40(reader){const end=reader.frame();const value={["network"]:__wireValue1(reader),["weights"]:__wireValue14(reader),["features"]:__wireValue14(reader),["target"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue54(reader){const end=reader.frame();const value={["network"]:__wireValue1(reader),["weights"]:__wireValue14(reader),["features"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue37(reader){const end=reader.frame();const value={["network"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue57(reader){const end=reader.frame();const value={["node"]:__wireValue5(reader),["policy"]:__wireValue29(reader)};reader.finish(end);return value;}
function __wireValue58(reader){const end=reader.frame();const value={["node"]:__wireValue5(reader),["positions"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue39(reader){const end=reader.frame();const value={["node"]:__wireValue5(reader),["wire"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue50(reader){const end=reader.frame();const value={["node"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue44(reader){const end=reader.frame();const value={["outputs"]:__wireValue14(reader),["gradient"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue61(reader){const end=reader.frame();const value={["parameters"]:__wireValue3(reader),["nodes"]:__wireValue3(reader),["width"]:__wireValue3(reader),["valid"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value={["piecewise"]:__wireValue13(reader),["boolean"]:__wireValue30(reader),["index"]:__wireValue31(reader),["zero"]:__wireValue32(reader)};reader.finish(end);return value;}
function __wireValue42(reader){const end=reader.frame();const value={["plan"]:__wireValue2(reader),["input"]:__wireValue14(reader),["seeds"]:__wireValue14(reader),["policy"]:__wireValue29(reader)};reader.finish(end);return value;}
function __wireValue59(reader){const end=reader.frame();const value={["plan"]:__wireValue2(reader),["input"]:__wireValue14(reader),["target"]:__wireValue14(reader),["policy"]:__wireValue29(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["plan"]:__wireValue2(reader),["input"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue62(reader){const end=reader.frame();const value={["plan"]:__wireValue2(reader),["values"]:__wireValue14(reader),["seeds"]:__wireValue14(reader),["policy"]:__wireValue29(reader)};reader.finish(end);return value;}
function __wireValue34(reader){const end=reader.frame();const value={["plan"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue60(reader){const end=reader.frame();const value={["s"]:__wireValue61(reader),["width"]:__wireValue3(reader),["gated"]:__wireValue13(reader),["maximum"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["terms"]:__wireValue10(reader),["bias"]:__wireValue9(reader),["gates"]:__wireValue10(reader),["gate_bias"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue45(reader){const end=reader.frame();const value={["terms"]:__wireValue10(reader),["bias"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const value={["value"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value={["values"]:__wireValue14(reader),["outputs"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["wire"]:__wireValue3(reader),["coefficient"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __wireValue8Variants=Object.freeze(["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]);
function __wireValue8(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue8Variants);reader.finish(end);return value;}
const __wireValue31Variants=Object.freeze(["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]);
function __wireValue31(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue31Variants);reader.finish(end);return value;}
const __wireValue6Variants=Object.freeze(["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]);
function __wireValue6(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue6Variants);reader.finish(end);return value;}
const __wireValue32Variants=Object.freeze(["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]);
function __wireValue32(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue32Variants);reader.finish(end);return value;}
const __wireValue7Variants=Object.freeze(["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]);
function __wireValue7(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue7Variants);reader.finish(end);return value;}
const __wireValue30Variants=Object.freeze(["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]);
function __wireValue30(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue30Variants);reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["derivatives",[__wireValue0,__wireValue15]],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",[__wireValue18,__wireValue5]],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",[__wireValue19,__wireValue5]],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",[__wireValue20,__wireValue21]],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",[__wireValue19,__wireValue5]],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",[__wireValue19,__wireValue5]],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",[__wireValue22,__wireValue23]],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",[__wireValue19,__wireValue5]],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",[__wireValue24,__wireValue25]],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",[__wireValue27,__wireValue9]],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",[__wireValue28,__wireValue13]],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",[__wireValue33,__wireValue5]],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",[__wireValue34,__wireValue3]],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",[__wireValue35,__wireValue9]],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",[__wireValue36,__wireValue29]],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",[__wireValue37,__wireValue3]],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",[__wireValue38,__wireValue5]],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",[__wireValue39,__wireValue13]],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",[__wireValue36,__wireValue29]],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",[__wireValue40,__wireValue15]],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",[__wireValue41,__wireValue5]],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",[__wireValue34,__wireValue3]],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",[__wireValue42,__wireValue43]],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",[__wireValue45,__wireValue5]],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",[__wireValue46,__wireValue5]],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",[__wireValue47,__wireValue48]],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",[__wireValue24,__wireValue49]],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",[__wireValue37,__wireValue3]],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",[__wireValue50,__wireValue12]],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",[__wireValue51,__wireValue9]],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",[__wireValue36,__wireValue29]],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",[__wireValue52,__wireValue5]],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",[__wireValue53,__wireValue5]],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",[__wireValue54,__wireValue49]],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",[__wireValue37,__wireValue3]],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",[__wireValue55,__wireValue5]],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",[__wireValue56,__wireValue13]],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",[__wireValue57,__wireValue13]],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",[__wireValue58,__wireValue5]],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",[__wireValue59,__wireValue15]],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",[__wireValue60,__wireValue61]],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",[__wireValue62,__wireValue49]],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",[__wireValue53,__wireValue5]],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",[__wireValue62,__wireValue49]],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",[__wireValue53,__wireValue5]],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",[__wireValue53,__wireValue5]],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",[__wireValue34,__wireValue3]],["network",[__wireValue36,__wireValue23]],["predict",[__wireValue63,__wireValue49]]]));

const __ownedImplementations=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>{
 const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
 const body=__implementations[f.index];
 const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
 return [f.name,input.every(c=>c===__identity)?implementation:(...args)=>{const context=new WeakMap();return implementation(...args.map((v,i)=>input[i](v,context)));}];
})));

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
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture5(value[i],budget,depth+1);return out;}
function __privateCapture10(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture11(value[i],budget,depth+1);return out;}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture9(value[i],budget,depth+1);return out;}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture3(value[i],budget,depth+1);return out;}
function __privateCapture25(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture3(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture15(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture1(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture24(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture2(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture17(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture18(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture28(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture29(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture26(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture27(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"graph")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"parameters")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"features")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}return {["graph"]:__privateCapture2(value["graph"],budget,depth+1),["parameters"]:__privateCapture3(value["parameters"],budget,depth+1),["features"]:__privateCapture3(value["features"],budget,depth+1),["outputs"]:__privateCapture3(value["outputs"],budget,depth+1)};}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"inputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"nodes")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"roots")){throw Error('invalid value for wire schema');}return {["inputs"]:__privateCapture3(value["inputs"],budget,depth+1),["nodes"]:__privateCapture4(value["nodes"],budget,depth+1),["roots"]:__privateCapture12(value["roots"],budget,depth+1)};}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==13){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"kind")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"binary")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"unary")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"a")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"c")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"terms")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gates")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gate_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"table")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"below")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"above")){throw Error('invalid value for wire schema');}return {["kind"]:__privateCapture6(value["kind"],budget,depth+1),["binary"]:__privateCapture7(value["binary"],budget,depth+1),["unary"]:__privateCapture8(value["unary"],budget,depth+1),["a"]:__privateCapture3(value["a"],budget,depth+1),["b"]:__privateCapture3(value["b"],budget,depth+1),["c"]:__privateCapture3(value["c"],budget,depth+1),["value"]:__privateCapture9(value["value"],budget,depth+1),["terms"]:__privateCapture10(value["terms"],budget,depth+1),["gates"]:__privateCapture10(value["gates"],budget,depth+1),["gate_bias"]:__privateCapture9(value["gate_bias"],budget,depth+1),["table"]:__privateCapture12(value["table"],budget,depth+1),["below"]:__privateCapture13(value["below"],budget,depth+1),["above"]:__privateCapture13(value["above"],budget,depth+1)};}
function __privateCapture18(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"loss")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gradient")){throw Error('invalid value for wire schema');}return {["loss"]:__privateCapture9(value["loss"],budget,depth+1),["outputs"]:__privateCapture15(value["outputs"],budget,depth+1),["gradient"]:__privateCapture15(value["gradient"],budget,depth+1)};}
function __privateCapture29(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gradient")){throw Error('invalid value for wire schema');}return {["outputs"]:__privateCapture15(value["outputs"],budget,depth+1),["gradient"]:__privateCapture15(value["gradient"],budget,depth+1)};}
function __privateCapture19(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"parameters")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"nodes")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"valid")){throw Error('invalid value for wire schema');}return {["parameters"]:__privateCapture3(value["parameters"],budget,depth+1),["nodes"]:__privateCapture3(value["nodes"],budget,depth+1),["width"]:__privateCapture3(value["width"],budget,depth+1),["valid"]:__privateCapture13(value["valid"],budget,depth+1)};}
function __privateCapture20(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"piecewise")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"boolean")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"zero")){throw Error('invalid value for wire schema');}return {["piecewise"]:__privateCapture13(value["piecewise"],budget,depth+1),["boolean"]:__privateCapture21(value["boolean"],budget,depth+1),["index"]:__privateCapture22(value["index"],budget,depth+1),["zero"]:__privateCapture23(value["zero"],budget,depth+1)};}
function __privateCapture27(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"values")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}return {["values"]:__privateCapture15(value["values"],budget,depth+1),["outputs"]:__privateCapture15(value["outputs"],budget,depth+1)};}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"wire")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"coefficient")){throw Error('invalid value for wire schema');}return {["wire"]:__privateCapture3(value["wire"],budget,depth+1),["coefficient"]:__privateCapture9(value["coefficient"],budget,depth+1)};}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture22(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture23(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture21(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return __nfFromBits(bits);}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue5(reader);reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue11(reader);reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue9(reader);reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue3(reader);reader.finish(end);return value;}
function __privateWireValue52(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue3(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue46(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue20(reader)};reader.finish(end);return value;}
function __privateWireValue60(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue61(reader)};reader.finish(end);return value;}
function __privateWireValue54(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue55(reader)};reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __privateWireValue50(reader){const end=reader.frame();const value={["a"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue32(reader){const end=reader.frame();const value={["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue33(reader){const end=reader.frame();const value={["a"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const value={["features"]:__privateWireValue3(reader),["hidden"]:__privateWireValue12(reader),["outputs"]:__privateWireValue3(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue36(reader){const end=reader.frame();const value={["gate"]:__privateWireValue3(reader),["off"]:__privateWireValue3(reader),["on"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value={["graph"]:__privateWireValue2(reader),["parameters"]:__privateWireValue3(reader),["features"]:__privateWireValue3(reader),["outputs"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue53(reader){const end=reader.frame();const value={["index"]:__privateWireValue9(reader),["n"]:__privateWireValue3(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue37(reader){const end=reader.frame();const value={["index"]:__privateWireValue3(reader),["table"]:__privateWireValue12(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue47(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue45(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue51(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["a"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue31(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["a"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue57(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["policy"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const value={["kind"]:__privateWireValue6(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value={["kind"]:__privateWireValue6(reader),["binary"]:__privateWireValue7(reader),["unary"]:__privateWireValue8(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader),["c"]:__privateWireValue3(reader),["value"]:__privateWireValue9(reader),["terms"]:__privateWireValue10(reader),["gates"]:__privateWireValue10(reader),["gate_bias"]:__privateWireValue9(reader),["table"]:__privateWireValue12(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue49(reader){const end=reader.frame();const value={["kind"]:__privateWireValue7(reader),["a"]:__privateWireValue9(reader),["b"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value={["kind"]:__privateWireValue7(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value={["loss"]:__privateWireValue9(reader),["outputs"]:__privateWireValue16(reader),["gradient"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue16(reader),["context"]:__privateWireValue16(reader),["target"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue16(reader),["context"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue16(reader),["features"]:__privateWireValue16(reader),["target"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue16(reader),["features"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue58(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["policy"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue43(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["positions"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue44(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["wire"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue42(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue61(reader){const end=reader.frame();const value={["outputs"]:__privateWireValue16(reader),["gradient"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value={["parameters"]:__privateWireValue3(reader),["nodes"]:__privateWireValue3(reader),["width"]:__privateWireValue3(reader),["valid"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue38(reader){const end=reader.frame();const value={["piecewise"]:__privateWireValue13(reader),["boolean"]:__privateWireValue39(reader),["index"]:__privateWireValue40(reader),["zero"]:__privateWireValue41(reader)};reader.finish(end);return value;}
function __privateWireValue62(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue16(reader),["seeds"]:__privateWireValue16(reader),["policy"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue63(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue16(reader),["target"]:__privateWireValue16(reader),["policy"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue56(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue59(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["values"]:__privateWireValue16(reader),["seeds"]:__privateWireValue16(reader),["policy"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue48(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue23(reader){const end=reader.frame();const value={["s"]:__privateWireValue22(reader),["width"]:__privateWireValue3(reader),["gated"]:__privateWireValue13(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue35(reader){const end=reader.frame();const value={["terms"]:__privateWireValue10(reader),["bias"]:__privateWireValue9(reader),["gates"]:__privateWireValue10(reader),["gate_bias"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue34(reader){const end=reader.frame();const value={["terms"]:__privateWireValue10(reader),["bias"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["value"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue55(reader){const end=reader.frame();const value={["values"]:__privateWireValue16(reader),["outputs"]:__privateWireValue16(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={["wire"]:__privateWireValue3(reader),["coefficient"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __privateWireValue8Variants=Object.freeze(["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]);
function __privateWireValue8(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue8Variants);reader.finish(end);return value;}
const __privateWireValue40Variants=Object.freeze(["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]);
function __privateWireValue40(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue40Variants);reader.finish(end);return value;}
const __privateWireValue6Variants=Object.freeze(["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]);
function __privateWireValue6(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue6Variants);reader.finish(end);return value;}
const __privateWireValue41Variants=Object.freeze(["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]);
function __privateWireValue41(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue41Variants);reader.finish(end);return value;}
const __privateWireValue7Variants=Object.freeze(["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]);
function __privateWireValue7(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue7Variants);reader.finish(end);return value;}
const __privateWireValue39Variants=Object.freeze(["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]);
function __privateWireValue39(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue39Variants);reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value=__nfFromBits(reader.word());reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue5(value[i],budget,depth+1);return out;}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue11(value[i],budget,depth+1);return out;}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue9(value[i],budget,depth+1);return out;}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue3(value[i],budget,depth+1);return out;}
function __compiledOwnedValue25(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue3(value.Some,budget,depth+1)};}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue15(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue1(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue24(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue2(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue17(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue18(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue28(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue29(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue27(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,4);return {["graph"]:__compiledOwnedValue2(value["graph"],budget,depth+1),["parameters"]:__compiledOwnedValue3(value["parameters"],budget,depth+1),["features"]:__compiledOwnedValue3(value["features"],budget,depth+1),["outputs"]:__compiledOwnedValue3(value["outputs"],budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,4);return {["inputs"]:__compiledOwnedValue3(value["inputs"],budget,depth+1),["nodes"]:__compiledOwnedValue4(value["nodes"],budget,depth+1),["roots"]:__compiledOwnedValue12(value["roots"],budget,depth+1)};}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,4);return {["kind"]:__compiledOwnedValue6(value["kind"],budget,depth+1),["binary"]:__compiledOwnedValue7(value["binary"],budget,depth+1),["unary"]:__compiledOwnedValue8(value["unary"],budget,depth+1),["a"]:__compiledOwnedValue3(value["a"],budget,depth+1),["b"]:__compiledOwnedValue3(value["b"],budget,depth+1),["c"]:__compiledOwnedValue3(value["c"],budget,depth+1),["value"]:__compiledOwnedValue9(value["value"],budget,depth+1),["terms"]:__compiledOwnedValue10(value["terms"],budget,depth+1),["gates"]:__compiledOwnedValue10(value["gates"],budget,depth+1),["gate_bias"]:__compiledOwnedValue9(value["gate_bias"],budget,depth+1),["table"]:__compiledOwnedValue12(value["table"],budget,depth+1),["below"]:__compiledOwnedValue13(value["below"],budget,depth+1),["above"]:__compiledOwnedValue13(value["above"],budget,depth+1)};}
function __compiledOwnedValue18(value,budget,depth){budget.enter(depth,4);return {["loss"]:__compiledOwnedValue9(value["loss"],budget,depth+1),["outputs"]:__compiledOwnedValue15(value["outputs"],budget,depth+1),["gradient"]:__compiledOwnedValue15(value["gradient"],budget,depth+1)};}
function __compiledOwnedValue29(value,budget,depth){budget.enter(depth,4);return {["outputs"]:__compiledOwnedValue15(value["outputs"],budget,depth+1),["gradient"]:__compiledOwnedValue15(value["gradient"],budget,depth+1)};}
function __compiledOwnedValue19(value,budget,depth){budget.enter(depth,4);return {["parameters"]:__compiledOwnedValue3(value["parameters"],budget,depth+1),["nodes"]:__compiledOwnedValue3(value["nodes"],budget,depth+1),["width"]:__compiledOwnedValue3(value["width"],budget,depth+1),["valid"]:__compiledOwnedValue13(value["valid"],budget,depth+1)};}
function __compiledOwnedValue20(value,budget,depth){budget.enter(depth,4);return {["piecewise"]:__compiledOwnedValue13(value["piecewise"],budget,depth+1),["boolean"]:__compiledOwnedValue21(value["boolean"],budget,depth+1),["index"]:__compiledOwnedValue22(value["index"],budget,depth+1),["zero"]:__compiledOwnedValue23(value["zero"],budget,depth+1)};}
function __compiledOwnedValue27(value,budget,depth){budget.enter(depth,4);return {["values"]:__compiledOwnedValue15(value["values"],budget,depth+1),["outputs"]:__compiledOwnedValue15(value["outputs"],budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,4);return {["wire"]:__compiledOwnedValue3(value["wire"],budget,depth+1),["coefficient"]:__compiledOwnedValue9(value["coefficient"],budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue22(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue23(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue21(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite5(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite11(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite9(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite3(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite25(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite3(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite15(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite1(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite24(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite2(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite17(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite18(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite28(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite29(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite26(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite27(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["graph"],compact);__privateWireWrite3(writer,value["parameters"],compact);__privateWireWrite3(writer,value["features"],compact);__privateWireWrite3(writer,value["outputs"],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["inputs"],compact);__privateWireWrite4(writer,value["nodes"],compact);__privateWireWrite12(writer,value["roots"],compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();__privateWireWrite6(writer,value["kind"],compact);__privateWireWrite7(writer,value["binary"],compact);__privateWireWrite8(writer,value["unary"],compact);__privateWireWrite3(writer,value["a"],compact);__privateWireWrite3(writer,value["b"],compact);__privateWireWrite3(writer,value["c"],compact);__privateWireWrite9(writer,value["value"],compact);__privateWireWrite10(writer,value["terms"],compact);__privateWireWrite10(writer,value["gates"],compact);__privateWireWrite9(writer,value["gate_bias"],compact);__privateWireWrite12(writer,value["table"],compact);__privateWireWrite13(writer,value["below"],compact);__privateWireWrite13(writer,value["above"],compact);writer.closeFrame(frame);}
function __privateWireWrite18(writer,value,compact){const frame=writer.openFrame();__privateWireWrite9(writer,value["loss"],compact);__privateWireWrite15(writer,value["outputs"],compact);__privateWireWrite15(writer,value["gradient"],compact);writer.closeFrame(frame);}
function __privateWireWrite29(writer,value,compact){const frame=writer.openFrame();__privateWireWrite15(writer,value["outputs"],compact);__privateWireWrite15(writer,value["gradient"],compact);writer.closeFrame(frame);}
function __privateWireWrite19(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["parameters"],compact);__privateWireWrite3(writer,value["nodes"],compact);__privateWireWrite3(writer,value["width"],compact);__privateWireWrite13(writer,value["valid"],compact);writer.closeFrame(frame);}
function __privateWireWrite20(writer,value,compact){const frame=writer.openFrame();__privateWireWrite13(writer,value["piecewise"],compact);__privateWireWrite21(writer,value["boolean"],compact);__privateWireWrite22(writer,value["index"],compact);__privateWireWrite23(writer,value["zero"],compact);writer.closeFrame(frame);}
function __privateWireWrite27(writer,value,compact){const frame=writer.openFrame();__privateWireWrite15(writer,value["values"],compact);__privateWireWrite15(writer,value["outputs"],compact);writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["wire"],compact);__privateWireWrite9(writer,value["coefficient"],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite22(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite23(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite21(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();writer.word(__nfBits(value));writer.closeFrame(frame);}
function __privateWireWrite14(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[1],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["graph","parameters","features","outputs"],patterns:[{bytes:4,label:"record",children:[2,3,3,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["graph"]:values[0],["parameters"]:values[1],["features"]:values[2],["outputs"]:values[3]})}]},{kind:'record',fields:["inputs","nodes","roots"],patterns:[{bytes:4,label:"record",children:[3,4,12],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["inputs"]:values[0],["nodes"]:values[1],["roots"]:values[2]})}]},{kind:"u32",scalar:__privateCapture3},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[5],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["kind","binary","unary","a","b","c","value","terms","gates","gate_bias","table","below","above"],patterns:[{bytes:4,label:"record",children:[6,7,8,3,3,3,9,10,10,9,12,13,13],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["kind"]:values[0],["binary"]:values[1],["unary"]:values[2],["a"]:values[3],["b"]:values[4],["c"]:values[5],["value"]:values[6],["terms"]:values[7],["gates"]:values[8],["gate_bias"]:values[9],["table"]:values[10],["below"]:values[11],["above"]:values[12]})}]},{kind:"enum",scalar:__privateCapture6},{kind:"enum",scalar:__privateCapture7},{kind:"enum",scalar:__privateCapture8},{kind:"f32",scalar:__privateCapture9},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[11],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["wire","coefficient"],patterns:[{bytes:4,label:"record",children:[3,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["wire"]:values[0],["coefficient"]:values[1]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[3],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"bool",scalar:__privateCapture13},{kind:"string",scalar:__privateCapture14},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[9],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[15],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[18],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["loss","outputs","gradient"],patterns:[{bytes:4,label:"record",children:[9,15,15],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["loss"]:values[0],["outputs"]:values[1],["gradient"]:values[2]})}]},{kind:'record',fields:["parameters","nodes","width","valid"],patterns:[{bytes:4,label:"record",children:[3,3,3,13],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["parameters"]:values[0],["nodes"]:values[1],["width"]:values[2],["valid"]:values[3]})}]},{kind:'record',fields:["piecewise","boolean","index","zero"],patterns:[{bytes:4,label:"record",children:[13,21,22,23],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["piecewise"]:values[0],["boolean"]:values[1],["index"]:values[2],["zero"]:values[3]})}]},{kind:"enum",scalar:__privateCapture21},{kind:"enum",scalar:__privateCapture22},{kind:"enum",scalar:__privateCapture23},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[2],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[27],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["values","outputs"],patterns:[{bytes:4,label:"record",children:[15,15],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["values"]:values[0],["outputs"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[29],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["outputs","gradient"],patterns:[{bytes:4,label:"record",children:[15,15],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["outputs"]:values[0],["gradient"]:values[1]})}]}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[0](0,__reduceValue1(value.Ok,r,b,d+1,c),c):r[0](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,4);return r[1](__reduceValue2(value["graph"],r,b,d+1,c),__reduceValue3(value["parameters"],r,b,d+1,c),__reduceValue3(value["features"],r,b,d+1,c),__reduceValue3(value["outputs"],r,b,d+1,c),c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,4);return r[2](__reduceValue3(value["inputs"],r,b,d+1,c),__reduceValue4(value["nodes"],r,b,d+1,c),__reduceValue12(value["roots"],r,b,d+1,c),c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);return r[3](value,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[4];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue5(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,4);return r[5](__reduceValue6(value["kind"],r,b,d+1,c),__reduceValue7(value["binary"],r,b,d+1,c),__reduceValue8(value["unary"],r,b,d+1,c),__reduceValue3(value["a"],r,b,d+1,c),__reduceValue3(value["b"],r,b,d+1,c),__reduceValue3(value["c"],r,b,d+1,c),__reduceValue9(value["value"],r,b,d+1,c),__reduceValue10(value["terms"],r,b,d+1,c),__reduceValue10(value["gates"],r,b,d+1,c),__reduceValue9(value["gate_bias"],r,b,d+1,c),__reduceValue12(value["table"],r,b,d+1,c),__reduceValue13(value["below"],r,b,d+1,c),__reduceValue13(value["above"],r,b,d+1,c),c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,4);b.text(value);return r[6](value,c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,4);b.text(value);return r[7](value,c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,4);b.text(value);return r[8](value,c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,8);return r[9]({F32Bits:__nfBits(value)},c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[10];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue11(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,4);return r[11](__reduceValue3(value["wire"],r,b,d+1,c),__reduceValue9(value["coefficient"],r,b,d+1,c),c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[12];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue3(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,5);return r[13](value,c);}
function __reduceValue14(value,r,b,d,c){b.enter(d,4);b.text(value);return r[14](value,c);}
function __reduceValue15(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[15];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue9(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[16](0,__reduceValue15(value.Ok,r,b,d+1,c),c):r[16](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue17(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[17](0,__reduceValue18(value.Ok,r,b,d+1,c),c):r[17](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue18(value,r,b,d,c){b.enter(d,4);return r[18](__reduceValue9(value["loss"],r,b,d+1,c),__reduceValue15(value["outputs"],r,b,d+1,c),__reduceValue15(value["gradient"],r,b,d+1,c),c);}
function __reduceValue19(value,r,b,d,c){b.enter(d,4);return r[19](__reduceValue3(value["parameters"],r,b,d+1,c),__reduceValue3(value["nodes"],r,b,d+1,c),__reduceValue3(value["width"],r,b,d+1,c),__reduceValue13(value["valid"],r,b,d+1,c),c);}
function __reduceValue20(value,r,b,d,c){b.enter(d,4);return r[20](__reduceValue13(value["piecewise"],r,b,d+1,c),__reduceValue21(value["boolean"],r,b,d+1,c),__reduceValue22(value["index"],r,b,d+1,c),__reduceValue23(value["zero"],r,b,d+1,c),c);}
function __reduceValue21(value,r,b,d,c){b.enter(d,4);b.text(value);return r[21](value,c);}
function __reduceValue22(value,r,b,d,c){b.enter(d,4);b.text(value);return r[22](value,c);}
function __reduceValue23(value,r,b,d,c){b.enter(d,4);b.text(value);return r[23](value,c);}
function __reduceValue24(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[24](0,__reduceValue2(value.Ok,r,b,d+1,c),c):r[24](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue25(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[25](0,null,c):r[25](1,__reduceValue3(value.Some,r,b,d+1,c),c);}
function __reduceValue26(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[26](0,__reduceValue27(value.Ok,r,b,d+1,c),c):r[26](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue27(value,r,b,d,c){b.enter(d,4);return r[27](__reduceValue15(value["values"],r,b,d+1,c),__reduceValue15(value["outputs"],r,b,d+1,c),c);}
function __reduceValue28(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[28](0,__reduceValue29(value.Ok,r,b,d+1,c),c):r[28](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue29(value,r,b,d,c){b.enter(d,4);return r[29](__reduceValue15(value["outputs"],r,b,d+1,c),__reduceValue15(value["gradient"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([2,3,3,3]),"fields":Object.freeze(["graph","parameters","features","outputs"]),"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}),Object.freeze({"children":Object.freeze([3,4,12]),"fields":Object.freeze(["inputs","nodes","roots"]),"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([5]),"kind":"list"}),Object.freeze({"children":Object.freeze([6,7,8,3,3,3,9,10,10,9,12,13,13]),"fields":Object.freeze(["kind","binary","unary","a","b","c","value","terms","gates","gate_bias","table","below","above"]),"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([11]),"kind":"list"}),Object.freeze({"children":Object.freeze([3,9]),"fields":Object.freeze(["wire","coefficient"]),"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"}),Object.freeze({"children":Object.freeze([3]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([9]),"kind":"list"}),Object.freeze({"children":Object.freeze([15,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([18,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([9,15,15]),"fields":Object.freeze(["loss","outputs","gradient"]),"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}),Object.freeze({"children":Object.freeze([3,3,3,13]),"fields":Object.freeze(["parameters","nodes","width","valid"]),"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}),Object.freeze({"children":Object.freeze([13,21,22,23]),"fields":Object.freeze(["piecewise","boolean","index","zero"]),"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8"}),Object.freeze({"children":Object.freeze([2,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([3]),"kind":"option"}),Object.freeze({"children":Object.freeze([27,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([15,15]),"fields":Object.freeze(["values","outputs"]),"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}),Object.freeze({"children":Object.freeze([29,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([15,15]),"fields":Object.freeze(["outputs","gradient"]),"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"c29995596451ae7a21400d17e81d4f2ca8be614ad563bd5faf845f101abbabb7","named":__compiledNamed0(),"root":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture15,__privateWireValue16,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},__privateCapture16,__privateWireValue17,__privateWireWrite16,__compiledOwnedValue16,16,16,__reduceValue16,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},__privateCapture17,__privateWireValue19,__privateWireWrite17,__compiledOwnedValue17,17,17,__reduceValue17,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":__compiledNamed0(),"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},__privateCapture19,__privateWireValue22,__privateWireWrite19,__compiledOwnedValue19,19,19,__reduceValue19,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture3,__privateWireValue3,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture13,__privateWireValue13,__privateWireWrite13,__compiledOwnedValue13,13,13,__reduceValue13,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"list"}},__privateCapture12,__privateWireValue12,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ad51270866d4f33efec0e7cf448c799ff1f9d4eb38a15700830bfcd18d0842d2","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},__privateCapture6,__privateWireValue6,__privateWireWrite6,__compiledOwnedValue6,6,6,__reduceValue6,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":__compiledNamed0(),"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},__privateCapture5,__privateWireValue5,__privateWireWrite5,__compiledOwnedValue5,5,5,__reduceValue5,false,false);}
let __compiledCodec11Value;function __compiledCodec11(){return __compiledCodec11Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture9,__privateWireValue9,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec12Value;function __compiledCodec12(){return __compiledCodec12Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"5e9d2560d1631617c5b6fbd31eb44e6a78a53596609e3288344ef50f0a623193","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},__privateCapture7,__privateWireValue7,__privateWireWrite7,__compiledOwnedValue7,7,7,__reduceValue7,false,false);}
let __compiledCodec13Value;function __compiledCodec13(){return __compiledCodec13Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"11e308754fe5a47839d506acbdbac68914598d732c9b50d164b272fcfb111857","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},__privateCapture8,__privateWireValue8,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec14Value;function __compiledCodec14(){return __compiledCodec14Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"94820bbba8093c293ec1b0b07bf5edd0c6fc268622d768485889779720c698e3","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},__privateCapture10,__privateWireValue10,__privateWireWrite10,__compiledOwnedValue10,10,10,__reduceValue10,false,false);}
let __compiledCodec15Value;function __compiledCodec15(){return __compiledCodec15Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":__compiledNamed0(),"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},__privateCapture20,__privateWireValue38,__privateWireWrite20,__compiledOwnedValue20,20,20,__reduceValue20,false,false);}
let __compiledCodec16Value;function __compiledCodec16(){return __compiledCodec16Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"15bad3ed40eda25cff4964be36be0712e1169f8eaaafd6fd9744a93d1fca16ab","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},__privateCapture4,__privateWireValue4,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec17Value;function __compiledCodec17(){return __compiledCodec17Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},__privateCapture24,__privateWireValue46,__privateWireWrite24,__compiledOwnedValue24,24,24,__reduceValue24,false,false);}
let __compiledCodec18Value;function __compiledCodec18(){return __compiledCodec18Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b64cdc960194d6c2917b734c4b84079c0947d2ac89b217e7a2c033e7ce62b73d","named":__compiledNamed0(),"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec19Value;function __compiledCodec19(){return __compiledCodec19Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"option"}},__privateCapture25,__privateWireValue52,__privateWireWrite25,__compiledOwnedValue25,25,25,__reduceValue25,false,false);}
let __compiledCodec20Value;function __compiledCodec20(){return __compiledCodec20Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},__privateCapture26,__privateWireValue54,__privateWireWrite26,__compiledOwnedValue26,26,26,__reduceValue26,false,false);}
let __compiledCodec21Value;function __compiledCodec21(){return __compiledCodec21Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},__privateCapture28,__privateWireValue60,__privateWireWrite28,__compiledOwnedValue28,28,28,__reduceValue28,false,false);}
const __compiledEntries=new Map([["network",{index:0,params:[],result:__compiledCodec0,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["predict",{index:1,params:[__compiledCodec1,__compiledCodec2,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue18,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["derivatives",{index:2,params:[__compiledCodec1,__compiledCodec2,__compiledCodec2,__compiledCodec2],result:__compiledCodec4,arguments:__privateWireValue21,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",{index:3,params:[__compiledCodec5,__compiledCodec6,__compiledCodec7,__compiledCodec6],result:__compiledCodec5,arguments:__privateWireValue23,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",{index:9,params:[__compiledCodec6,__compiledCodec8,__compiledCodec6,__compiledCodec6],result:__compiledCodec0,arguments:__privateWireValue24,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",{index:10,params:[__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",{index:11,params:[__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",{index:12,params:[__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",{index:13,params:[__compiledCodec1,__compiledCodec2,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue26,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",{index:14,params:[__compiledCodec1,__compiledCodec2,__compiledCodec2,__compiledCodec2],result:__compiledCodec4,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",{index:15,params:[__compiledCodec9,__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue28,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",{index:16,params:[__compiledCodec11],result:__compiledCodec10,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",{index:17,params:[__compiledCodec12,__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue30,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",{index:18,params:[__compiledCodec13,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",{index:19,params:[__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",{index:20,params:[__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",{index:21,params:[__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",{index:22,params:[__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",{index:23,params:[__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",{index:24,params:[__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",{index:25,params:[__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",{index:26,params:[__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",{index:27,params:[__compiledCodec14,__compiledCodec11],result:__compiledCodec10,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",{index:28,params:[__compiledCodec14,__compiledCodec11,__compiledCodec14,__compiledCodec11],result:__compiledCodec10,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",{index:29,params:[__compiledCodec6,__compiledCodec6,__compiledCodec6],result:__compiledCodec10,arguments:__privateWireValue36,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",{index:30,params:[__compiledCodec6,__compiledCodec8,__compiledCodec7,__compiledCodec7],result:__compiledCodec10,arguments:__privateWireValue37,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",{index:31,params:[],result:__compiledCodec15,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",{index:32,params:[],result:__compiledCodec15,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",{index:33,params:[],result:__compiledCodec15,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",{index:34,params:[__compiledCodec10],result:__compiledCodec8,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",{index:35,params:[__compiledCodec10,__compiledCodec8],result:__compiledCodec10,arguments:__privateWireValue43,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",{index:37,params:[__compiledCodec10,__compiledCodec6],result:__compiledCodec7,arguments:__privateWireValue44,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",{index:38,params:[__compiledCodec6,__compiledCodec16,__compiledCodec8],result:__compiledCodec7,arguments:__privateWireValue45,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",{index:39,params:[__compiledCodec6,__compiledCodec16,__compiledCodec8,__compiledCodec6],result:__compiledCodec17,arguments:__privateWireValue47,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",{index:40,params:[__compiledCodec18],result:__compiledCodec6,arguments:__privateWireValue48,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",{index:41,params:[__compiledCodec18],result:__compiledCodec6,arguments:__privateWireValue48,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",{index:42,params:[__compiledCodec18],result:__compiledCodec6,arguments:__privateWireValue48,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",{index:43,params:[__compiledCodec12,__compiledCodec11,__compiledCodec11],result:__compiledCodec11,arguments:__privateWireValue49,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",{index:44,params:[__compiledCodec11],result:__compiledCodec11,arguments:__privateWireValue50,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",{index:45,params:[__compiledCodec13,__compiledCodec11],result:__compiledCodec11,arguments:__privateWireValue51,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",{index:49,params:[__compiledCodec11,__compiledCodec6,__compiledCodec7,__compiledCodec7],result:__compiledCodec19,arguments:__privateWireValue53,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",{index:52,params:[__compiledCodec18,__compiledCodec2],result:__compiledCodec20,arguments:__privateWireValue56,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",{index:53,params:[__compiledCodec18,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue56,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",{index:56,params:[__compiledCodec13,__compiledCodec15],result:__compiledCodec7,arguments:__privateWireValue57,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",{index:57,params:[__compiledCodec10,__compiledCodec15],result:__compiledCodec7,arguments:__privateWireValue58,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",{index:63,params:[__compiledCodec18,__compiledCodec2,__compiledCodec2,__compiledCodec15],result:__compiledCodec3,arguments:__privateWireValue59,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",{index:64,params:[__compiledCodec18,__compiledCodec2,__compiledCodec2,__compiledCodec15],result:__compiledCodec3,arguments:__privateWireValue59,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",{index:65,params:[__compiledCodec18,__compiledCodec2,__compiledCodec2,__compiledCodec15],result:__compiledCodec21,arguments:__privateWireValue62,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",{index:66,params:[__compiledCodec18,__compiledCodec2,__compiledCodec2,__compiledCodec15],result:__compiledCodec4,arguments:__privateWireValue63,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}]]);

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
const __intoImplementations=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,__into34,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){switch(name){case "ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":case "ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":case "ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":case "ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":case "ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":case "ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":case "ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":case "ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":case "ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":case "ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":case "ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":case "ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":case "ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":case "ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":case "ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":case "ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":case "ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":case "ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":throw new Error('temporary storage is internal to a pure invocation');}return functionsInto[name](...args,destination);}
function __prepareFn0(fixed,depth=0){if(depth>=16)return __fn0;let v1594;
return function(){const v1588=10;
const v1589=6;
const v1590=6;
const v1591=[v1589,v1590];
const v1592=4;
const v1593=10000;
if(!v1594){const v1595=__preparedFactories.get(9);v1594=v1595?v1595([true,true,true,true],depth+1):__fn9;}
return v1594(v1588,v1591,v1592,v1593);};}
function __prepareFn1(fixed,depth=0){if(depth>=16)return __fn1;let v1599;
return function(v1596,v1597,v1598){if(!v1599){const v1600=__preparedFactories.get(13);v1599=v1600?v1600([fixed[0],fixed[1],fixed[2]],depth+1):__fn13;}
return v1599(v1596,v1597,v1598);};}
function __prepareFn2(fixed,depth=0){if(depth>=16)return __fn2;let v1605;
return function(v1601,v1602,v1603,v1604){if(!v1605){const v1606=__preparedFactories.get(14);v1605=v1606?v1606([fixed[0],fixed[1],fixed[2],fixed[3]],depth+1):__fn14;}
return v1605(v1601,v1602,v1603,v1604);};}
function __prepareFn3(fixed,depth=0){if(depth>=16)return __fn3;const v1629=true;let v1628=false,v1627;
const v1637=fixed[2];let v1636=false,v1635;
const v1642=fixed[0]&&fixed[2];let v1641=false,v1640;
const v1650=fixed[0]&&fixed[2];let v1649=false,v1648;
const v1658=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1657=false,v1656;
const v1689=true;let v1688=false,v1687;
return function(v1607,v1608,v1609,v1610){const v1611=v1607["valid"];
const v1612=false;
const v1613=(v1611===v1612);
let v1614=v1613;if(!v1614){
const v1615=v1607["parameters"];
v1614=((v1615) > (v1610));}
const v1616=v1614;
let v1617=v1616;if(!v1617){
const v1618=v1607["nodes"];
v1617=((v1618) > (v1610));}
const v1619=v1617;
let v1620=v1619;if(!v1620){
const v1621=v1607["width"];
v1620=((v1621) > (v1610));}
const v1622=v1620;
let v1623=v1622;if(!v1623){
v1623=((v1608) > (v1610));}
const v1624=v1623;
let v1625;if(v1624){
let v1626;if(v1629&&v1628){v1626=v1627;}else{
v1626=false;if(v1629){v1627=v1626;v1628=true;}}
const v1630=v1607["parameters"];
const v1631=v1607["nodes"];
const v1632=v1607["width"];
const v1633=v1626;
v1625=({["parameters"]:v1630,["nodes"]:v1631,["width"]:v1632,["valid"]:v1633});}else{
let v1634;if(v1637&&v1636){v1634=v1635;}else{
let v1638;if(v1609){
v1638=2;}else{
v1638=1;}
v1634=v1638;if(v1637){v1635=v1634;v1636=true;}}
let v1639;if(v1642&&v1641){v1639=v1640;}else{
const v1643=v1607["width"];
const v1644=1;
const v1645=(((v1643) + (v1644)) >>> 0);
const v1646=v1634;
v1639=(Math.imul(v1645,v1646) >>> 0);if(v1642){v1640=v1639;v1641=true;}}
let v1647;if(v1650&&v1649){v1647=v1648;}else{
const v1651=v1607["width"];
const v1652=v1634;
const v1653=(Math.imul(v1651,v1652) >>> 0);
const v1654=1;
v1647=(((v1653) + (v1654)) >>> 0);if(v1650){v1648=v1647;v1649=true;}}
let v1655;if(v1658&&v1657){v1655=v1656;}else{
const v1659=v1607["parameters"];
const v1660=(((v1610) - (v1659)) >>> 0);
const v1661=v1639;
let v1662;if(v1661===0 ){
v1662=0;}else{
v1662=(Math.trunc(v1660/v1661)+0);}
const v1663=v1662;
const v1664=((v1608) <= (v1663));
let v1665=v1664;if(v1665){
const v1666=v1647;
const v1667=0;
const v1668=(v1666===v1667);
let v1669=v1668;if(!v1669){
const v1670=v1607["nodes"];
const v1671=(((v1610) - (v1670)) >>> 0);
const v1672=v1647;
let v1673;if(v1672===0 ){
v1673=0;}else{
v1673=(Math.trunc(v1671/v1672)+0);}
const v1674=v1673;
v1669=((v1608) <= (v1674));}
v1665=v1669;}
v1655=v1665;if(v1658){v1656=v1655;v1657=true;}}
const v1675=v1655;
let v1676;if(v1675){
const v1677=v1607["parameters"];
const v1678=v1639;
const v1679=(Math.imul(v1678,v1608) >>> 0);
const v1680=(((v1677) + (v1679)) >>> 0);
const v1681=v1607["nodes"];
const v1682=v1647;
const v1683=(Math.imul(v1682,v1608) >>> 0);
const v1684=(((v1681) + (v1683)) >>> 0);
const v1685=true;
v1676=({["parameters"]:v1680,["nodes"]:v1684,["width"]:v1608,["valid"]:v1685});}else{
let v1686;if(v1689&&v1688){v1686=v1687;}else{
v1686=false;if(v1689){v1687=v1686;v1688=true;}}
const v1690=v1607["parameters"];
const v1691=v1607["nodes"];
const v1692=v1607["width"];
const v1693=v1686;
v1676=({["parameters"]:v1690,["nodes"]:v1691,["width"]:v1692,["valid"]:v1693});}
v1625=v1676;}
return v1625;};}
function __prepareFn9(fixed,depth=0){if(depth>=16)return __fn9;const v1706=fixed[0];let v1705=false,v1704;
const v1713=fixed[0]&&fixed[1]&&fixed[3];let v1712=false,v1711;
let v1723;
const v1729=fixed[0]&&fixed[1]&&fixed[3];let v1728=false,v1727;
const v1734=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1733=false,v1732;
let v1737;
const v1760=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1759=false,v1758;
const v1767=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1766=false,v1765;
const v1779=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1778=false,v1777;
const v1808=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1807=false,v1806;
const v1816=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1815=false,v1814;
const v1822=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1821=false,v1820;
let v1834;
return function(v1694,v1695,v1696,v1697){const v1698=1000000;
const v1699=((v1697) > (v1698));
let v1700=v1699;if(!v1700){
v1700=((v1694) > (v1697));}
const v1701=v1700;
let v1702;if(v1701){
v1702=({Err:"network capacity"});}else{
let v1703;if(v1706&&v1705){v1703=v1704;}else{
const v1707=0;
const v1708=0;
const v1709=true;
v1703=({["parameters"]:v1707,["nodes"]:v1708,["width"]:v1694,["valid"]:v1709});if(v1706){v1704=v1703;v1705=true;}}
let v1710;if(v1713&&v1712){v1710=v1711;}else{
const v1714=v1703;
let v1715=({["shape"]:v1714});
for(let v1716=0;v1716<v1695.length;v1716++){
const v1717=(v1695[v1716]>>>0);
const v1719=v1715;
const v1718=v1719["shape"];
const v1721=v1718;
const v1722=true;
if(!v1723){const v1724=__preparedFactories.get(3);v1723=v1724?v1724([false,false,true,fixed[3]],depth+1):__fn3;}
const v1720=v1723(v1721,v1717,v1722,v1697);
const v1725=v1720;
v1715=({["shape"]:v1725});
}
v1710=v1715;if(v1713){v1711=v1710;v1712=true;}}
let v1726;if(v1729&&v1728){v1726=v1727;}else{
const v1730=v1710;
v1726=v1730["shape"];if(v1729){v1727=v1726;v1728=true;}}
let v1731;if(v1734&&v1733){v1731=v1732;}else{
const v1735=v1726;
const v1736=false;
if(!v1737){const v1738=__preparedFactories.get(3);v1737=v1738?v1738([fixed[0]&&fixed[1]&&fixed[3],fixed[2],true,fixed[3]],depth+1):__fn3;}
v1731=v1737(v1735,v1696,v1736,v1697);if(v1734){v1732=v1731;v1733=true;}}
const v1739=v1731;
const v1740=v1739["valid"];
const v1741=false;
const v1742=(v1740===v1741);
let v1743=v1742;if(!v1743){
const v1744=v1731;
const v1745=v1744["parameters"];
const v1746=(((v1697) - (v1745)) >>> 0);
v1743=((v1694) > (v1746));}
const v1747=v1743;
let v1748=v1747;if(!v1748){
const v1749=v1731;
const v1750=v1749["nodes"];
const v1751=v1731;
const v1752=v1751["parameters"];
const v1753=(((v1697) - (v1752)) >>> 0);
const v1754=(((v1753) - (v1694)) >>> 0);
v1748=((v1750) > (v1754));}
const v1755=v1748;
let v1756;if(v1755){
v1756=({Err:"network capacity"});}else{
let v1757;if(v1760&&v1759){v1757=v1758;}else{
const v1761=v1731;
const v1762=v1761["parameters"];
v1757=(((v1762) + (v1694)) >>> 0);if(v1760){v1758=v1757;v1759=true;}}
const v1763=new __InkBuffer([]);
let v1764;if(v1767&&v1766){v1764=v1765;}else{
let v1768=v1763;
for(let v1769=0;v1769<v1694;v1769++){
if(false){break;}
const v1770=(v1769>>>0);
const v1771=v1768;
const v1772=v1731;
const v1773=v1772["parameters"];
const v1774=(((v1773) + (v1770)) >>> 0);
v1768=__tempEdit(v1771,"push",v1774);}
const v1775=v1768;
v1764=v1775.freeze();if(v1767){v1765=v1764;v1766=true;}}
let v1776;if(v1779&&v1778){v1776=v1777;}else{
v1776=v1764;if(v1779){v1777=v1776;v1778=true;}}
const v1781=new __InkBuffer([]);
const v1782=new __InkBuffer([]);
const v1783=0;
const v1784=v1757;
const v1780=({["nodes"]:v1781,["outputs"]:v1782,["parameter"]:v1783,["inputs"]:v1784});
const v1786=v1780;
const v1787=v1776;
let v1788=({["layer"]:v1786,["wires"]:v1787});
for(let v1789=0;v1789<v1695.length;v1789++){
const v1790=(v1695[v1789]>>>0);
const v1791=v1788;
const v1792=v1791["layer"];
const v1793=v1788;
const v1794=v1793["wires"];
const v1795=__fn7(v1792,v1790,v1794);
const v1796=v1795["outputs"];
const v1797=v1796.freeze();
const v1798=v1795["nodes"];
const v1799=new __InkBuffer([]);
const v1800=v1795["parameter"];
const v1801=v1757;
const v1802=({["nodes"]:v1798,["outputs"]:v1799,["parameter"]:v1800,["inputs"]:v1801});
v1788=({["layer"]:v1802,["wires"]:v1797});
}
const v1785=v1788;
const v1804=v1785;
const v1803=v1804["layer"];
let v1805;if(v1808&&v1807){v1805=v1806;}else{
const v1809=v1785;
v1805=v1809["wires"];if(v1808){v1806=v1805;v1807=true;}}
const v1811=v1803;
const v1812=v1805;
const v1810=__fn8(v1811,v1696,v1812);
let v1813;if(v1816&&v1815){v1813=v1814;}else{
const v1817=v1810;
const v1818=v1817["nodes"];
v1813=v1818.freeze();if(v1816){v1814=v1813;v1815=true;}}
let v1819;if(v1822&&v1821){v1819=v1820;}else{
const v1823=v1810;
const v1824=v1823["outputs"];
v1819=v1824.freeze();if(v1822){v1820=v1819;v1821=true;}}
const v1825=v1810;
const v1826=v1825["parameter"];
const v1827=v1731;
const v1828=v1827["parameters"];
const v1829=!(v1826===v1828);
let v1830;if(v1829){
v1830=({Err:"network parameter layout"});}else{
const v1831=v1757;
const v1832=v1813;
const v1833=v1819;
if(!v1834){const v1835=__preparedFactories.get(39);v1834=v1835?v1835([fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[3]],depth+1):__fn39;}
const v1836=v1834(v1831,v1832,v1833,v1697);
let v1838;if(Object.hasOwn(v1836,"Ok")){
const v1839=v1836["Ok"];
const v1840=v1731;
const v1841=v1840["parameters"];
v1838=({Ok:({["graph"]:v1839,["parameters"]:v1841,["features"]:v1694,["outputs"]:v1696})});}else{
const v1842=v1836["Err"];
v1838=({Err:v1842});}
v1830=v1838;}
v1756=v1830;}
v1702=v1756;}
return v1702;};}
function __prepareFn13(fixed,depth=0){if(depth>=16)return __fn13;let v1864;
return function(v1847,v1848,v1849){const v1850=(v1848).length;
const v1851=v1847["parameters"];
const v1852=!(v1850===v1851);
let v1853=v1852;if(!v1853){
const v1854=(v1849).length;
const v1855=v1847["features"];
v1853=!(v1854===v1855);}
const v1856=v1853;
let v1857;if(v1856){
v1857=({Err:"network input shape"});}else{
const v1858=v1847["graph"];
const v1859=v1848.length;
const v1860=v1849.length;
const v1861=new Array(v1859+v1860);
for(let v1862=0;v1862<v1859;v1862++){v1861[v1862]=v1848[v1862];}
for(let v1863=0;v1863<v1860;v1863++){v1861[v1859+v1863]=v1849[v1863];}
if(!v1864){const v1865=__preparedFactories.get(53);v1864=v1865?v1865([fixed[0],fixed[1]&&fixed[2]],depth+1):__fn53;}
v1857=v1864(v1858,v1861);}
return v1857;};}
function __prepareFn14(fixed,depth=0){if(depth>=16)return __fn14;let v1885;
return function(v1866,v1867,v1868,v1869){const v1870=(v1867).length;
const v1871=v1866["parameters"];
const v1872=!(v1870===v1871);
let v1873=v1872;if(!v1873){
const v1874=(v1868).length;
const v1875=v1866["features"];
v1873=!(v1874===v1875);}
const v1876=v1873;
let v1877;if(v1876){
v1877=({Err:"network input shape"});}else{
const v1878=v1866["graph"];
const v1879=v1867.length;
const v1880=v1868.length;
const v1881=new Array(v1879+v1880);
for(let v1882=0;v1882<v1879;v1882++){v1881[v1882]=v1867[v1882];}
for(let v1883=0;v1883<v1880;v1883++){v1881[v1879+v1883]=v1868[v1883];}
const v1884=__fn33();
if(!v1885){const v1886=__preparedFactories.get(66);v1885=v1886?v1886([fixed[0],fixed[1]&&fixed[2],fixed[3],true],depth+1):__fn66;}
const v1887=v1885(v1878,v1881,v1869,v1884);
let v1889;if(Object.hasOwn(v1887,"Ok")){
const v1890=v1887["Ok"];
const v1891=__nfValue(v1890["loss"]);
const v1892=v1890["outputs"];
const v1893=v1890["gradient"];
const v1894=v1893.slice(0,v1866["parameters"]);
v1889=({Ok:({["loss"]:v1891,["outputs"]:v1892,["gradient"]:v1894})});}else{
const v1895=v1887["Err"];
v1889=({Err:v1895});}
v1877=v1889;}
return v1877;};}
function __prepareFn16(fixed,depth=0){if(depth>=16)return __fn16;const v1913=true;let v1912=false,v1911;
const v1920=fixed[0];let v1919=false,v1918;
return function(v1909){let v1910;if(v1913&&v1912){v1910=v1911;}else{
const v1914="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v1915=0;
const v1916=0;
v1910=__fn15(v1914,v1915,v1916);if(v1913){v1911=v1910;v1912=true;}}
let v1917;if(v1920&&v1919){v1917=v1918;}else{
v1917=__nfValue(v1909);if(v1920){v1918=v1917;v1919=true;}}
const v1921=v1910;
const v1922=v1921["kind"];
const v1923=v1910;
const v1924=v1923["binary"];
const v1925=v1910;
const v1926=v1925["unary"];
const v1927=v1910;
const v1928=v1927["a"];
const v1929=v1910;
const v1930=v1929["b"];
const v1931=v1910;
const v1932=v1931["c"];
const v1933=__nfValue(v1917);
const v1934=v1910;
const v1935=v1934["terms"];
const v1936=v1910;
const v1937=v1936["gates"];
const v1938=v1910;
const v1939=__nfValue(v1938["gate_bias"]);
const v1940=v1910;
const v1941=v1940["table"];
const v1942=v1910;
const v1943=v1942["below"];
const v1944=v1910;
const v1945=v1944["above"];
return ({["kind"]:v1922,["binary"]:v1924,["unary"]:v1926,["a"]:v1928,["b"]:v1930,["c"]:v1932,["value"]:v1933,["terms"]:v1935,["gates"]:v1937,["gate_bias"]:v1939,["table"]:v1941,["below"]:v1943,["above"]:v1945});};}
function __prepareFn17(fixed,depth=0){if(depth>=16)return __fn17;const v1952=fixed[1]&&fixed[2];let v1951=false,v1950;
const v1957=fixed[0];let v1956=false,v1955;
return function(v1946,v1947,v1948){let v1949;if(v1952&&v1951){v1949=v1950;}else{
const v1953="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
v1949=__fn15(v1953,v1947,v1948);if(v1952){v1950=v1949;v1951=true;}}
let v1954;if(v1957&&v1956){v1954=v1955;}else{
v1954=v1946;if(v1957){v1955=v1954;v1956=true;}}
const v1958=v1949;
const v1959=v1958["kind"];
const v1960=v1954;
const v1961=v1949;
const v1962=v1961["unary"];
const v1963=v1949;
const v1964=v1963["a"];
const v1965=v1949;
const v1966=v1965["b"];
const v1967=v1949;
const v1968=v1967["c"];
const v1969=v1949;
const v1970=__nfValue(v1969["value"]);
const v1971=v1949;
const v1972=v1971["terms"];
const v1973=v1949;
const v1974=v1973["gates"];
const v1975=v1949;
const v1976=__nfValue(v1975["gate_bias"]);
const v1977=v1949;
const v1978=v1977["table"];
const v1979=v1949;
const v1980=v1979["below"];
const v1981=v1949;
const v1982=v1981["above"];
return ({["kind"]:v1959,["binary"]:v1960,["unary"]:v1962,["a"]:v1964,["b"]:v1966,["c"]:v1968,["value"]:v1970,["terms"]:v1972,["gates"]:v1974,["gate_bias"]:v1976,["table"]:v1978,["below"]:v1980,["above"]:v1982});};}
function __prepareFn18(fixed,depth=0){if(depth>=16)return __fn18;const v1988=fixed[1];let v1987=false,v1986;
const v1994=fixed[0];let v1993=false,v1992;
return function(v1983,v1984){let v1985;if(v1988&&v1987){v1985=v1986;}else{
const v1989="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v1990=0;
v1985=__fn15(v1989,v1984,v1990);if(v1988){v1986=v1985;v1987=true;}}
let v1991;if(v1994&&v1993){v1991=v1992;}else{
v1991=v1983;if(v1994){v1992=v1991;v1993=true;}}
const v1995=v1985;
const v1996=v1995["kind"];
const v1997=v1985;
const v1998=v1997["binary"];
const v1999=v1991;
const v2000=v1985;
const v2001=v2000["a"];
const v2002=v1985;
const v2003=v2002["b"];
const v2004=v1985;
const v2005=v2004["c"];
const v2006=v1985;
const v2007=__nfValue(v2006["value"]);
const v2008=v1985;
const v2009=v2008["terms"];
const v2010=v1985;
const v2011=v2010["gates"];
const v2012=v1985;
const v2013=__nfValue(v2012["gate_bias"]);
const v2014=v1985;
const v2015=v2014["table"];
const v2016=v1985;
const v2017=v2016["below"];
const v2018=v1985;
const v2019=v2018["above"];
return ({["kind"]:v1996,["binary"]:v1998,["unary"]:v1999,["a"]:v2001,["b"]:v2003,["c"]:v2005,["value"]:v2007,["terms"]:v2009,["gates"]:v2011,["gate_bias"]:v2013,["table"]:v2015,["below"]:v2017,["above"]:v2019});};}
function __prepareFn19(fixed,depth=0){if(depth>=16)return __fn19;let v2023;
return function(v2020,v2021){const v2022="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
if(!v2023){const v2024=__preparedFactories.get(17);v2023=v2024?v2024([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v2023(v2022,v2020,v2021);};}
function __prepareFn20(fixed,depth=0){if(depth>=16)return __fn20;let v2028;
return function(v2025,v2026){const v2027="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
if(!v2028){const v2029=__preparedFactories.get(17);v2028=v2029?v2029([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v2028(v2027,v2025,v2026);};}
function __prepareFn21(fixed,depth=0){if(depth>=16)return __fn21;let v2033;
return function(v2030,v2031){const v2032="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
if(!v2033){const v2034=__preparedFactories.get(17);v2033=v2034?v2034([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v2033(v2032,v2030,v2031);};}
function __prepareFn22(fixed,depth=0){if(depth>=16)return __fn22;let v2038;
return function(v2035,v2036){const v2037="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
if(!v2038){const v2039=__preparedFactories.get(17);v2038=v2039?v2039([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v2038(v2037,v2035,v2036);};}
function __prepareFn23(fixed,depth=0){if(depth>=16)return __fn23;let v2042;
return function(v2040){const v2041="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
if(!v2042){const v2043=__preparedFactories.get(18);v2042=v2043?v2043([true,fixed[0]],depth+1):__fn18;}
return v2042(v2041,v2040);};}
function __prepareFn24(fixed,depth=0){if(depth>=16)return __fn24;let v2046;
return function(v2044){const v2045="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
if(!v2046){const v2047=__preparedFactories.get(18);v2046=v2047?v2047([true,fixed[0]],depth+1):__fn18;}
return v2046(v2045,v2044);};}
function __prepareFn25(fixed,depth=0){if(depth>=16)return __fn25;let v2050;
return function(v2048){const v2049="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
if(!v2050){const v2051=__preparedFactories.get(18);v2050=v2051?v2051([true,fixed[0]],depth+1):__fn18;}
return v2050(v2049,v2048);};}
function __prepareFn26(fixed,depth=0){if(depth>=16)return __fn26;let v2054;
return function(v2052){const v2053="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
if(!v2054){const v2055=__preparedFactories.get(18);v2054=v2055?v2055([true,fixed[0]],depth+1):__fn18;}
return v2054(v2053,v2052);};}
function __prepareFn27(fixed,depth=0){if(depth>=16)return __fn27;const v2061=true;let v2060=false,v2059;
const v2068=fixed[0];let v2067=false,v2066;
const v2072=fixed[1];let v2071=false,v2070;
return function(v2056,v2057){let v2058;if(v2061&&v2060){v2058=v2059;}else{
const v2062="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v2063=0;
const v2064=0;
v2058=__fn15(v2062,v2063,v2064);if(v2061){v2059=v2058;v2060=true;}}
let v2065;if(v2068&&v2067){v2065=v2066;}else{
v2065=v2056;if(v2068){v2066=v2065;v2067=true;}}
let v2069;if(v2072&&v2071){v2069=v2070;}else{
v2069=__nfValue(v2057);if(v2072){v2070=v2069;v2071=true;}}
const v2073=v2058;
const v2074=v2073["kind"];
const v2075=v2058;
const v2076=v2075["binary"];
const v2077=v2058;
const v2078=v2077["unary"];
const v2079=v2058;
const v2080=v2079["a"];
const v2081=v2058;
const v2082=v2081["b"];
const v2083=v2058;
const v2084=v2083["c"];
const v2085=__nfValue(v2069);
const v2086=v2065;
const v2087=v2058;
const v2088=v2087["gates"];
const v2089=v2058;
const v2090=__nfValue(v2089["gate_bias"]);
const v2091=v2058;
const v2092=v2091["table"];
const v2093=v2058;
const v2094=v2093["below"];
const v2095=v2058;
const v2096=v2095["above"];
return ({["kind"]:v2074,["binary"]:v2076,["unary"]:v2078,["a"]:v2080,["b"]:v2082,["c"]:v2084,["value"]:v2085,["terms"]:v2086,["gates"]:v2088,["gate_bias"]:v2090,["table"]:v2092,["below"]:v2094,["above"]:v2096});};}
function __prepareFn28(fixed,depth=0){if(depth>=16)return __fn28;const v2104=true;let v2103=false,v2102;
const v2111=fixed[0];let v2110=false,v2109;
const v2115=fixed[1];let v2114=false,v2113;
const v2119=fixed[2];let v2118=false,v2117;
const v2123=fixed[3];let v2122=false,v2121;
return function(v2097,v2098,v2099,v2100){let v2101;if(v2104&&v2103){v2101=v2102;}else{
const v2105="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v2106=0;
const v2107=0;
v2101=__fn15(v2105,v2106,v2107);if(v2104){v2102=v2101;v2103=true;}}
let v2108;if(v2111&&v2110){v2108=v2109;}else{
v2108=v2097;if(v2111){v2109=v2108;v2110=true;}}
let v2112;if(v2115&&v2114){v2112=v2113;}else{
v2112=__nfValue(v2098);if(v2115){v2113=v2112;v2114=true;}}
let v2116;if(v2119&&v2118){v2116=v2117;}else{
v2116=v2099;if(v2119){v2117=v2116;v2118=true;}}
let v2120;if(v2123&&v2122){v2120=v2121;}else{
v2120=__nfValue(v2100);if(v2123){v2121=v2120;v2122=true;}}
const v2124=v2101;
const v2125=v2124["kind"];
const v2126=v2101;
const v2127=v2126["binary"];
const v2128=v2101;
const v2129=v2128["unary"];
const v2130=v2101;
const v2131=v2130["a"];
const v2132=v2101;
const v2133=v2132["b"];
const v2134=v2101;
const v2135=v2134["c"];
const v2136=__nfValue(v2112);
const v2137=v2108;
const v2138=v2116;
const v2139=__nfValue(v2120);
const v2140=v2101;
const v2141=v2140["table"];
const v2142=v2101;
const v2143=v2142["below"];
const v2144=v2101;
const v2145=v2144["above"];
return ({["kind"]:v2125,["binary"]:v2127,["unary"]:v2129,["a"]:v2131,["b"]:v2133,["c"]:v2135,["value"]:v2136,["terms"]:v2137,["gates"]:v2138,["gate_bias"]:v2139,["table"]:v2141,["below"]:v2143,["above"]:v2145});};}
function __prepareFn29(fixed,depth=0){if(depth>=16)return __fn29;const v2152=fixed[0]&&fixed[1];let v2151=false,v2150;
const v2157=fixed[2];let v2156=false,v2155;
return function(v2146,v2147,v2148){let v2149;if(v2152&&v2151){v2149=v2150;}else{
const v2153="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
v2149=__fn15(v2153,v2146,v2147);if(v2152){v2150=v2149;v2151=true;}}
let v2154;if(v2157&&v2156){v2154=v2155;}else{
v2154=v2148;if(v2157){v2155=v2154;v2156=true;}}
const v2158=v2149;
const v2159=v2158["kind"];
const v2160=v2149;
const v2161=v2160["binary"];
const v2162=v2149;
const v2163=v2162["unary"];
const v2164=v2149;
const v2165=v2164["a"];
const v2166=v2149;
const v2167=v2166["b"];
const v2168=v2154;
const v2169=v2149;
const v2170=__nfValue(v2169["value"]);
const v2171=v2149;
const v2172=v2171["terms"];
const v2173=v2149;
const v2174=v2173["gates"];
const v2175=v2149;
const v2176=__nfValue(v2175["gate_bias"]);
const v2177=v2149;
const v2178=v2177["table"];
const v2179=v2149;
const v2180=v2179["below"];
const v2181=v2149;
const v2182=v2181["above"];
return ({["kind"]:v2159,["binary"]:v2161,["unary"]:v2163,["a"]:v2165,["b"]:v2167,["c"]:v2168,["value"]:v2170,["terms"]:v2172,["gates"]:v2174,["gate_bias"]:v2176,["table"]:v2178,["below"]:v2180,["above"]:v2182});};}
function __prepareFn30(fixed,depth=0){if(depth>=16)return __fn30;const v2190=fixed[0];let v2189=false,v2188;
const v2196=fixed[1];let v2195=false,v2194;
const v2200=fixed[2];let v2199=false,v2198;
const v2204=fixed[3];let v2203=false,v2202;
return function(v2183,v2184,v2185,v2186){let v2187;if(v2190&&v2189){v2187=v2188;}else{
const v2191="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v2192=0;
v2187=__fn15(v2191,v2183,v2192);if(v2190){v2188=v2187;v2189=true;}}
let v2193;if(v2196&&v2195){v2193=v2194;}else{
v2193=v2184;if(v2196){v2194=v2193;v2195=true;}}
let v2197;if(v2200&&v2199){v2197=v2198;}else{
v2197=v2185;if(v2200){v2198=v2197;v2199=true;}}
let v2201;if(v2204&&v2203){v2201=v2202;}else{
v2201=v2186;if(v2204){v2202=v2201;v2203=true;}}
const v2205=v2187;
const v2206=v2205["kind"];
const v2207=v2187;
const v2208=v2207["binary"];
const v2209=v2187;
const v2210=v2209["unary"];
const v2211=v2187;
const v2212=v2211["a"];
const v2213=v2187;
const v2214=v2213["b"];
const v2215=v2187;
const v2216=v2215["c"];
const v2217=v2187;
const v2218=__nfValue(v2217["value"]);
const v2219=v2187;
const v2220=v2219["terms"];
const v2221=v2187;
const v2222=v2221["gates"];
const v2223=v2187;
const v2224=__nfValue(v2223["gate_bias"]);
const v2225=v2193;
const v2226=v2197;
const v2227=v2201;
return ({["kind"]:v2206,["binary"]:v2208,["unary"]:v2210,["a"]:v2212,["b"]:v2214,["c"]:v2216,["value"]:v2218,["terms"]:v2220,["gates"]:v2222,["gate_bias"]:v2224,["table"]:v2225,["below"]:v2226,["above"]:v2227});};}
function __prepareFn34(fixed,depth=0){if(depth>=16)return __fn34;const v2244=fixed[0];let v2243=false,v2242;
return function(v2240){let v2241;if(v2244&&v2243){v2241=v2242;}else{
v2241=v2240["kind"];if(v2244){v2242=v2241;v2243=true;}}
const v2245=v2241;
const v2246="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v2247=(v2245===v2246);
let v2248;if(v2247){
v2248=[];}else{
const v2249=v2241;
const v2250="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v2251=(v2249===v2250);
let v2252;if(v2251){
const v2253=v2240["a"];
const v2254=v2240["b"];
v2252=[v2253,v2254];}else{
const v2255=v2241;
const v2256="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v2257=(v2255===v2256);
let v2258;if(v2257){
const v2259=v2240["a"];
v2258=[v2259];}else{
const v2260=v2241;
const v2261="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v2262=(v2260===v2261);
let v2263;if(v2262){
const v2264=v2240["terms"];
const v2265=[];for(let v2266=0;v2266<v2264.length;v2266++){
const v2267=v2264[v2266];
v2265.push(v2267["wire"]);}
v2263=v2265;}else{
const v2268=v2241;
const v2269="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v2270=(v2268===v2269);
let v2271;if(v2270){
const v2272=v2240["terms"];
const v2273=v2272.length;
const v2274=new Array(v2273);
for(let v2275=0;v2275<v2273;v2275++){
const v2276=v2272[v2275];
v2274[v2275]=v2276["wire"];
}
const v2277=v2240["gates"];
const v2278=v2277.length;
const v2279=new Array(v2278);
for(let v2280=0;v2280<v2278;v2280++){
const v2281=v2277[v2280];
v2279[v2280]=v2281["wire"];
}
const v2282=v2274.length;
const v2283=v2279.length;
const v2284=new Array(v2282+v2283);
for(let v2285=0;v2285<v2282;v2285++){v2284[v2285]=v2274[v2285];}
for(let v2286=0;v2286<v2283;v2286++){v2284[v2282+v2286]=v2279[v2286];}
v2271=v2284;}else{
const v2287=v2241;
const v2288="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v2289=(v2287===v2288);
let v2290;if(v2289){
const v2291=v2240["a"];
const v2292=v2240["b"];
const v2293=v2240["c"];
v2290=[v2291,v2292,v2293];}else{
const v2294=v2240["a"];
const v2295=[v2294];
const v2296=v2240["table"];
const v2297=v2295.length;
const v2298=v2296.length;
const v2299=new Array(v2297+v2298);
for(let v2300=0;v2300<v2297;v2300++){v2299[v2300]=v2295[v2300];}
for(let v2301=0;v2301<v2298;v2301++){v2299[v2297+v2301]=v2296[v2301];}
v2290=v2299;}
v2271=v2290;}
v2263=v2271;}
v2258=v2263;}
v2252=v2258;}
v2248=v2252;}
return v2248;};}
function __prepareFn35(fixed,depth=0){if(depth>=16)return __fn35;const v2307=fixed[0];let v2306=false,v2305;
const v2319=fixed[0]&&fixed[1];let v2318=false,v2317;
const v2325=fixed[0]&&fixed[1];let v2324=false,v2323;
const v2348=fixed[0]&&fixed[1];let v2347=false,v2346;
const v2371=fixed[0]&&fixed[1];let v2370=false,v2369;
const v2400=fixed[0]&&fixed[1];let v2399=false,v2398;
const v2412=fixed[0]&&fixed[1];let v2411=false,v2410;
const v2441=fixed[0]&&fixed[1];let v2440=false,v2439;
const v2447=fixed[0]&&fixed[1];let v2446=false,v2445;
const v2453=fixed[0]&&fixed[1];let v2452=false,v2451;
const v2472=fixed[0]&&fixed[1];let v2471=false,v2470;
const v2478=fixed[0]&&fixed[1];let v2477=false,v2476;
return function(v2302,v2303){let v2304;if(v2307&&v2306){v2304=v2305;}else{
v2304=v2302["kind"];if(v2307){v2305=v2304;v2306=true;}}
const v2308=v2304;
const v2309="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v2310=(v2308===v2309);
let v2311;if(v2310){
v2311=v2302;}else{
const v2312=v2304;
const v2313="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v2314=(v2312===v2313);
let v2315;if(v2314){
let v2316;if(v2319&&v2318){v2316=v2317;}else{
const v2320=v2302["a"];
let v2321;if(v2320<v2303.length){v2321=v2303[v2320];}else{
v2321=0;}
v2316=v2321;if(v2319){v2317=v2316;v2318=true;}}
let v2322;if(v2325&&v2324){v2322=v2323;}else{
const v2326=v2302["b"];
let v2327;if(v2326<v2303.length){v2327=v2303[v2326];}else{
v2327=0;}
v2322=v2327;if(v2325){v2323=v2322;v2324=true;}}
const v2328=v2302["kind"];
const v2329=v2302["binary"];
const v2330=v2302["unary"];
const v2331=v2316;
const v2332=v2322;
const v2333=v2302["c"];
const v2334=__nfValue(v2302["value"]);
const v2335=v2302["terms"];
const v2336=v2302["gates"];
const v2337=__nfValue(v2302["gate_bias"]);
const v2338=v2302["table"];
const v2339=v2302["below"];
const v2340=v2302["above"];
v2315=({["kind"]:v2328,["binary"]:v2329,["unary"]:v2330,["a"]:v2331,["b"]:v2332,["c"]:v2333,["value"]:v2334,["terms"]:v2335,["gates"]:v2336,["gate_bias"]:v2337,["table"]:v2338,["below"]:v2339,["above"]:v2340});}else{
const v2341=v2304;
const v2342="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v2343=(v2341===v2342);
let v2344;if(v2343){
let v2345;if(v2348&&v2347){v2345=v2346;}else{
const v2349=v2302["a"];
let v2350;if(v2349<v2303.length){v2350=v2303[v2349];}else{
v2350=0;}
v2345=v2350;if(v2348){v2346=v2345;v2347=true;}}
const v2351=v2302["kind"];
const v2352=v2302["binary"];
const v2353=v2302["unary"];
const v2354=v2345;
const v2355=v2302["b"];
const v2356=v2302["c"];
const v2357=__nfValue(v2302["value"]);
const v2358=v2302["terms"];
const v2359=v2302["gates"];
const v2360=__nfValue(v2302["gate_bias"]);
const v2361=v2302["table"];
const v2362=v2302["below"];
const v2363=v2302["above"];
v2344=({["kind"]:v2351,["binary"]:v2352,["unary"]:v2353,["a"]:v2354,["b"]:v2355,["c"]:v2356,["value"]:v2357,["terms"]:v2358,["gates"]:v2359,["gate_bias"]:v2360,["table"]:v2361,["below"]:v2362,["above"]:v2363});}else{
const v2364=v2304;
const v2365="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v2366=(v2364===v2365);
let v2367;if(v2366){
let v2368;if(v2371&&v2370){v2368=v2369;}else{
const v2372=v2302["terms"];
const v2373=[];for(let v2374=0;v2374<v2372.length;v2374++){
const v2375=v2372[v2374];
const v2376=v2375["wire"];
let v2377;if(v2376<v2303.length){v2377=v2303[v2376];}else{
v2377=0;}
const v2378=v2377;
const v2379=__nfValue(v2375["coefficient"]);
v2373.push(({["wire"]:v2378,["coefficient"]:v2379}));}
v2368=v2373;if(v2371){v2369=v2368;v2370=true;}}
const v2380=v2302["kind"];
const v2381=v2302["binary"];
const v2382=v2302["unary"];
const v2383=v2302["a"];
const v2384=v2302["b"];
const v2385=v2302["c"];
const v2386=__nfValue(v2302["value"]);
const v2387=v2368;
const v2388=v2302["gates"];
const v2389=__nfValue(v2302["gate_bias"]);
const v2390=v2302["table"];
const v2391=v2302["below"];
const v2392=v2302["above"];
v2367=({["kind"]:v2380,["binary"]:v2381,["unary"]:v2382,["a"]:v2383,["b"]:v2384,["c"]:v2385,["value"]:v2386,["terms"]:v2387,["gates"]:v2388,["gate_bias"]:v2389,["table"]:v2390,["below"]:v2391,["above"]:v2392});}else{
const v2393=v2304;
const v2394="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v2395=(v2393===v2394);
let v2396;if(v2395){
let v2397;if(v2400&&v2399){v2397=v2398;}else{
const v2401=v2302["terms"];
const v2402=[];for(let v2403=0;v2403<v2401.length;v2403++){
const v2404=v2401[v2403];
const v2405=v2404["wire"];
let v2406;if(v2405<v2303.length){v2406=v2303[v2405];}else{
v2406=0;}
const v2407=v2406;
const v2408=__nfValue(v2404["coefficient"]);
v2402.push(({["wire"]:v2407,["coefficient"]:v2408}));}
v2397=v2402;if(v2400){v2398=v2397;v2399=true;}}
let v2409;if(v2412&&v2411){v2409=v2410;}else{
const v2413=v2302["gates"];
const v2414=[];for(let v2415=0;v2415<v2413.length;v2415++){
const v2416=v2413[v2415];
const v2417=v2416["wire"];
let v2418;if(v2417<v2303.length){v2418=v2303[v2417];}else{
v2418=0;}
const v2419=v2418;
const v2420=__nfValue(v2416["coefficient"]);
v2414.push(({["wire"]:v2419,["coefficient"]:v2420}));}
v2409=v2414;if(v2412){v2410=v2409;v2411=true;}}
const v2421=v2302["kind"];
const v2422=v2302["binary"];
const v2423=v2302["unary"];
const v2424=v2302["a"];
const v2425=v2302["b"];
const v2426=v2302["c"];
const v2427=__nfValue(v2302["value"]);
const v2428=v2397;
const v2429=v2409;
const v2430=__nfValue(v2302["gate_bias"]);
const v2431=v2302["table"];
const v2432=v2302["below"];
const v2433=v2302["above"];
v2396=({["kind"]:v2421,["binary"]:v2422,["unary"]:v2423,["a"]:v2424,["b"]:v2425,["c"]:v2426,["value"]:v2427,["terms"]:v2428,["gates"]:v2429,["gate_bias"]:v2430,["table"]:v2431,["below"]:v2432,["above"]:v2433});}else{
const v2434=v2304;
const v2435="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v2436=(v2434===v2435);
let v2437;if(v2436){
let v2438;if(v2441&&v2440){v2438=v2439;}else{
const v2442=v2302["a"];
let v2443;if(v2442<v2303.length){v2443=v2303[v2442];}else{
v2443=0;}
v2438=v2443;if(v2441){v2439=v2438;v2440=true;}}
let v2444;if(v2447&&v2446){v2444=v2445;}else{
const v2448=v2302["b"];
let v2449;if(v2448<v2303.length){v2449=v2303[v2448];}else{
v2449=0;}
v2444=v2449;if(v2447){v2445=v2444;v2446=true;}}
let v2450;if(v2453&&v2452){v2450=v2451;}else{
const v2454=v2302["c"];
let v2455;if(v2454<v2303.length){v2455=v2303[v2454];}else{
v2455=0;}
v2450=v2455;if(v2453){v2451=v2450;v2452=true;}}
const v2456=v2302["kind"];
const v2457=v2302["binary"];
const v2458=v2302["unary"];
const v2459=v2438;
const v2460=v2444;
const v2461=v2450;
const v2462=__nfValue(v2302["value"]);
const v2463=v2302["terms"];
const v2464=v2302["gates"];
const v2465=__nfValue(v2302["gate_bias"]);
const v2466=v2302["table"];
const v2467=v2302["below"];
const v2468=v2302["above"];
v2437=({["kind"]:v2456,["binary"]:v2457,["unary"]:v2458,["a"]:v2459,["b"]:v2460,["c"]:v2461,["value"]:v2462,["terms"]:v2463,["gates"]:v2464,["gate_bias"]:v2465,["table"]:v2466,["below"]:v2467,["above"]:v2468});}else{
let v2469;if(v2472&&v2471){v2469=v2470;}else{
const v2473=v2302["a"];
let v2474;if(v2473<v2303.length){v2474=v2303[v2473];}else{
v2474=0;}
v2469=v2474;if(v2472){v2470=v2469;v2471=true;}}
let v2475;if(v2478&&v2477){v2475=v2476;}else{
const v2479=v2302["table"];
const v2480=[];for(let v2481=0;v2481<v2479.length;v2481++){
const v2482=(v2479[v2481]>>>0);
let v2483;if(v2482<v2303.length){v2483=v2303[v2482];}else{
v2483=0;}
v2480.push(v2483);}
v2475=v2480;if(v2478){v2476=v2475;v2477=true;}}
const v2484=v2302["kind"];
const v2485=v2302["binary"];
const v2486=v2302["unary"];
const v2487=v2469;
const v2488=v2302["b"];
const v2489=v2302["c"];
const v2490=__nfValue(v2302["value"]);
const v2491=v2302["terms"];
const v2492=v2302["gates"];
const v2493=__nfValue(v2302["gate_bias"]);
const v2494=v2475;
const v2495=v2302["below"];
const v2496=v2302["above"];
v2437=({["kind"]:v2484,["binary"]:v2485,["unary"]:v2486,["a"]:v2487,["b"]:v2488,["c"]:v2489,["value"]:v2490,["terms"]:v2491,["gates"]:v2492,["gate_bias"]:v2493,["table"]:v2494,["below"]:v2495,["above"]:v2496});}
v2396=v2437;}
v2367=v2396;}
v2344=v2367;}
v2315=v2344;}
v2311=v2315;}
return v2311;};}
function __prepareFn37(fixed,depth=0){if(depth>=16)return __fn37;const v2502=fixed[0];let v2501=false,v2500;
return function(v2497,v2498){let v2499;if(v2502&&v2501){v2499=v2500;}else{
v2499=v2497["kind"];if(v2502){v2500=v2499;v2501=true;}}
const v2503=v2499;
const v2504="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v2505=(v2503===v2504);
let v2506;if(v2505){
v2506=true;}else{
const v2507=v2499;
const v2508="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v2509=(v2507===v2508);
let v2510;if(v2509){
const v2511=v2497["a"];
const v2512=((v2511) < (v2498));
let v2513=v2512;if(v2513){
const v2514=v2497["b"];
v2513=((v2514) < (v2498));}
v2510=v2513;}else{
const v2515=v2499;
const v2516="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v2517=(v2515===v2516);
let v2518;if(v2517){
const v2519=v2497["a"];
v2518=((v2519) < (v2498));}else{
const v2520=v2499;
const v2521="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v2522=(v2520===v2521);
let v2523;if(v2522){
const v2524=v2497["terms"];
let v2525=true;
for(let v2526=0;v2526<v2524.length;v2526++){
const v2527=v2524[v2526];
const v2528=v2525;
let v2529=v2528;if(v2529){
const v2530=v2527["wire"];
v2529=((v2530) < (v2498));}
v2525=v2529;
}
v2523=v2525;}else{
const v2531=v2499;
const v2532="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v2533=(v2531===v2532);
let v2534;if(v2533){
const v2535=v2497["terms"];
let v2536=true;
for(let v2537=0;v2537<v2535.length;v2537++){
const v2538=v2535[v2537];
const v2539=v2536;
let v2540=v2539;if(v2540){
const v2541=v2538["wire"];
v2540=((v2541) < (v2498));}
v2536=v2540;
}
const v2542=v2536;
let v2543=v2542;if(v2543){
const v2544=v2497["gates"];
let v2545=true;
for(let v2546=0;v2546<v2544.length;v2546++){
const v2547=v2544[v2546];
const v2548=v2545;
let v2549=v2548;if(v2549){
const v2550=v2547["wire"];
v2549=((v2550) < (v2498));}
v2545=v2549;
}
v2543=v2545;}
v2534=v2543;}else{
const v2551=v2499;
const v2552="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v2553=(v2551===v2552);
let v2554;if(v2553){
const v2555=v2497["a"];
const v2556=((v2555) < (v2498));
let v2557=v2556;if(v2557){
const v2558=v2497["b"];
v2557=((v2558) < (v2498));}
const v2559=v2557;
let v2560=v2559;if(v2560){
const v2561=v2497["c"];
v2560=((v2561) < (v2498));}
v2554=v2560;}else{
const v2562=v2497["a"];
const v2563=((v2562) < (v2498));
let v2564=v2563;if(v2564){
const v2565=v2497["table"];
let v2566=true;
for(let v2567=0;v2567<v2565.length;v2567++){
const v2568=(v2565[v2567]>>>0);
const v2569=v2566;
let v2570=v2569;if(v2570){
v2570=((v2568) < (v2498));}
v2566=v2570;
}
v2564=v2566;}
v2554=v2564;}
v2534=v2554;}
v2523=v2534;}
v2518=v2523;}
v2510=v2518;}
v2506=v2510;}
return v2506;};}
function __prepareFn38(fixed,depth=0){if(depth>=16)return __fn38;const v2586=fixed[0]&&fixed[1];let v2585=false,v2584;
const v2591=fixed[0]&&fixed[1];let v2590=false,v2589;
return function(v2571,v2572,v2573){const v2574=v2572.length;
const v2575=4294967295;
const v2576=((v2574) > (v2575));
let v2577=v2576;if(!v2577){
const v2578=(v2572).length;
const v2579=4294967295;
const v2580=(((v2579) - (v2571)) >>> 0);
v2577=((v2578) > (v2580));}
const v2581=v2577;
let v2582;if(v2581){
v2582=false;}else{
let v2583;if(v2586&&v2585){v2583=v2584;}else{
const v2587=(v2572).length;
v2583=(((v2571) + (v2587)) >>> 0);if(v2586){v2584=v2583;v2585=true;}}
let v2588;if(v2591&&v2590){v2588=v2589;}else{
const v2592=true;
let v2593=({["wire"]:v2571,["valid"]:v2592});
for(let v2594=0;v2594<v2572.length;v2594++){
const v2595=v2572[v2594];
const v2596=v2593;
const v2597=v2596["wire"];
const v2598=1;
const v2599=(((v2597) + (v2598)) >>> 0);
const v2600=v2593;
const v2601=v2600["valid"];
let v2602=v2601;if(v2602){
const v2603=v2593;
const v2604=v2603["wire"];
v2602=__fn37(v2595,v2604);}
const v2605=v2602;
v2593=({["wire"]:v2599,["valid"]:v2605});
}
v2588=v2593;if(v2591){v2589=v2588;v2590=true;}}
const v2606=v2588;
const v2607=v2606["valid"];
let v2608=v2607;if(v2608){
let v2609=true;
for(let v2610=0;v2610<v2573.length;v2610++){
const v2611=(v2573[v2610]>>>0);
const v2612=v2609;
let v2613=v2612;if(v2613){
const v2614=v2583;
v2613=((v2611) < (v2614));}
v2609=v2613;
}
v2608=v2609;}
v2582=v2608;}
return v2582;};}
function __prepareFn39(fixed,depth=0){if(depth>=16)return __fn39;const v2632=fixed[0]&&fixed[1]&&fixed[2];let v2631=false,v2630;
let v2633;
const v2643=fixed[0]&&fixed[1];let v2642=false,v2641;
const v2666=fixed[0]&&fixed[1]&&fixed[2];let v2665=false,v2664;
const v2679=fixed[0];let v2678=false,v2677;
const v2683=fixed[0];let v2682=false,v2681;
const v2710=fixed[0]&&fixed[1]&&fixed[2];let v2709=false,v2708;
const v2717=fixed[0]&&fixed[1]&&fixed[2];let v2716=false,v2715;
const v2722=fixed[0]&&fixed[1]&&fixed[2];let v2721=false,v2720;
const v2728=fixed[0];let v2727=false,v2726;
const v2754=fixed[0]&&fixed[1]&&fixed[2];let v2753=false,v2752;
return function(v2615,v2616,v2617,v2618){const v2619=v2616.length;
const v2620=4294967295;
const v2621=((v2619) > (v2620));
let v2622=v2621;if(!v2622){
v2622=((v2615) > (v2618));}
const v2623=v2622;
let v2624=v2623;if(!v2624){
const v2625=(v2616).length;
const v2626=(((v2618) - (v2615)) >>> 0);
v2624=((v2625) > (v2626));}
const v2627=v2624;
let v2628;if(v2627){
v2628=({Err:"graph capacity"});}else{
let v2629;if(v2632&&v2631){v2629=v2630;}else{
if(!v2633){const v2634=__preparedFactories.get(38);v2633=v2634?v2634([fixed[0],fixed[1],fixed[2]],depth+1):__fn38;}
const v2635=v2633(v2615,v2616,v2617);
const v2637=false;
v2629=(v2635===v2637);if(v2632){v2630=v2629;v2631=true;}}
let v2639;if(v2629){
v2639=({Err:"graph is not topologically ordered"});}else{
let v2640;if(v2643&&v2642){v2640=v2641;}else{
const v2644=(v2616).length;
v2640=(((v2615) + (v2644)) >>> 0);if(v2643){v2641=v2640;v2642=true;}}
const v2645=__bufferFill(v2640,false);
const v2647=v2645;
let v2648=({["live"]:v2647});
for(let v2649=0;v2649<v2617.length;v2649++){
const v2650=(v2617[v2649]>>>0);
const v2651=v2648;
const v2652=v2651["live"];
const v2653=__tempSet(v2652,v2650,true,false);
v2648=({["live"]:v2653});
}
const v2646=v2648;
const v2655=v2646;
const v2654=v2655["live"];
const v2657=v2654;
const v2658=v2640;
let v2659=({["live"]:v2657,["wire"]:v2658});
for(let v2660=v2616.length-1;v2660>=0;v2660--){
const v2661=v2616[v2660];
const v2662=v2659;
v2659=__fn36(v2661,v2662,v2615);
}
const v2656=v2659;
let v2663;if(v2666&&v2665){v2663=v2664;}else{
const v2667=v2656;
const v2668=v2667["live"];
v2663=v2668.freeze();if(v2666){v2664=v2663;v2665=true;}}
const v2669=__bufferFill(v2640,0);
let v2671=v2669;
for(let v2672=0;v2672<v2615;v2672++){
if(false){break;}
const v2673=(v2672>>>0);
const v2674=v2671;
v2671=__tempSet(v2674,v2673,v2673,false);}
const v2670=v2671;
const v2675=v2670;
let v2676;if(v2679&&v2678){v2676=v2677;}else{
v2676=v2615;if(v2679){v2677=v2676;v2678=true;}}
let v2680;if(v2683&&v2682){v2680=v2681;}else{
v2680=v2615;if(v2683){v2681=v2680;v2682=true;}}
const v2685=v2680;
const v2686=v2675;
const v2687=v2676;
let v2688=({["next"]:v2685,["positions"]:v2686,["wire"]:v2687});
for(let v2689=0;v2689<v2616.length;v2689++){
const v2690=v2616[v2689];
const v2691=v2688;
const v2692=v2691["next"];
const v2693=v2688;
const v2694=v2693["positions"];
const v2695=v2688;
const v2696=v2695["wire"];
const v2697=v2663;
let v2698;if(v2696<v2697.length){v2698=v2697[v2696];}else{
v2698=false;}
let v2699;if(v2698){
const v2700=__tempSet(v2694,v2696,v2692,false);
const v2701=1;
const v2702=(((v2692) + (v2701)) >>> 0);
const v2703=1;
const v2704=(((v2696) + (v2703)) >>> 0);
v2699=({["next"]:v2702,["positions"]:v2700,["wire"]:v2704});}else{
const v2705=1;
const v2706=(((v2696) + (v2705)) >>> 0);
v2699=({["next"]:v2692,["positions"]:v2694,["wire"]:v2706});}
v2688=v2699;
}
const v2684=v2688;
let v2707;if(v2710&&v2709){v2707=v2708;}else{
const v2711=v2684;
v2707=v2711["next"];if(v2710){v2708=v2707;v2709=true;}}
const v2713=v2684;
const v2712=v2713["positions"];
let v2714;if(v2717&&v2716){v2714=v2715;}else{
const v2718=v2684;
v2714=v2718["wire"];if(v2717){v2715=v2714;v2716=true;}}
let v2719;if(v2722&&v2721){v2719=v2720;}else{
const v2723=v2712;
v2719=v2723.freeze();if(v2722){v2720=v2719;v2721=true;}}
const v2724=new __InkBuffer([]);
let v2725;if(v2728&&v2727){v2725=v2726;}else{
v2725=v2615;if(v2728){v2726=v2725;v2727=true;}}
const v2730=v2724;
const v2731=v2725;
let v2732=({["compact"]:v2730,["wire"]:v2731});
for(let v2733=0;v2733<v2616.length;v2733++){
const v2734=v2616[v2733];
const v2735=v2732;
const v2736=v2735["compact"];
const v2737=v2732;
const v2738=v2737["wire"];
const v2739=v2663;
let v2740;if(v2738<v2739.length){v2740=v2739[v2738];}else{
v2740=false;}
let v2741;if(v2740){
const v2742=v2719;
const v2743=__fn35(v2734,v2742);
const v2744=__tempEdit(v2736,"push",v2743);
const v2745=1;
const v2746=(((v2738) + (v2745)) >>> 0);
v2741=({["compact"]:v2744,["wire"]:v2746});}else{
const v2747=1;
const v2748=(((v2738) + (v2747)) >>> 0);
v2741=({["compact"]:v2736,["wire"]:v2748});}
v2732=v2741;
}
const v2729=v2732;
const v2750=v2729;
const v2749=v2750["compact"];
let v2751;if(v2754&&v2753){v2751=v2752;}else{
const v2755=v2729;
v2751=v2755["wire"];if(v2754){v2752=v2751;v2753=true;}}
const v2756=v2749;
const v2757=v2756.freeze();
const v2758=v2617.length;
const v2759=new Array(v2758);
for(let v2760=0;v2760<v2758;v2760++){
const v2761=(v2617[v2760]>>>0);
const v2762=v2719;
let v2763;if(v2761<v2762.length){v2763=v2762[v2761];}else{
v2763=0;}
v2759[v2760]=v2763;
}
v2639=({Ok:({["inputs"]:v2615,["nodes"]:v2757,["roots"]:v2759})});}
v2628=v2639;}
return v2628;};}
function __prepareFn43(fixed,depth=0){if(depth>=16)return __fn43;const v2773=fixed[0];let v2772=false,v2771;
return function(v2767,v2768,v2769){let v2770;if(v2773&&v2772){v2770=v2771;}else{
v2770=v2767;if(v2773){v2771=v2770;v2772=true;}}
const v2774=v2770;
const v2775="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v2776=(v2774===v2775);
let v2777;if(v2776){
const v2778=__nfValue(v2768);
const v2779=__nfValue(v2769);
v2777=Math.fround(__nfNumber(v2778) + __nfNumber(v2779));}else{
const v2780=v2770;
const v2781="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v2782=(v2780===v2781);
let v2783;if(v2782){
const v2784=__nfValue(v2768);
const v2785=__nfValue(v2769);
v2783=Math.fround(__nfNumber(v2784) - __nfNumber(v2785));}else{
const v2786=v2770;
const v2787="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v2788=(v2786===v2787);
let v2789;if(v2788){
const v2790=__nfValue(v2768);
const v2791=__nfValue(v2769);
v2789=Math.fround(__nfNumber(v2790) * __nfNumber(v2791));}else{
v2789=Math.fround((__nfNumber(__nfValue(v2768)))/(__nfNumber(__nfValue(v2769))));}
v2783=v2789;}
v2777=v2783;}
return v2777;};}
function __prepareFn45(fixed,depth=0){if(depth>=16)return __fn45;const v2804=fixed[0];let v2803=false,v2802;
return function(v2799,v2800){let v2801;if(v2804&&v2803){v2801=v2802;}else{
v2801=v2799;if(v2804){v2802=v2801;v2803=true;}}
const v2805=v2801;
const v2806="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v2807=(v2805===v2806);
let v2808;if(v2807){
v2808=Math.fround(Math.sqrt(__nfNumber(__nfValue(v2800))));}else{
const v2809=v2801;
const v2810="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v2811=(v2809===v2810);
let v2812;if(v2811){
const v2813=__nfValue(v2800);
v2812=__nfNeg(v2813);}else{
const v2814=v2801;
const v2815="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v2816=(v2814===v2815);
let v2817;if(v2816){
const v2818=__nfValue(v2800);
v2817=__fn44(v2818);}else{
const v2819=__nfValue(v2800);
const v2820=__nfFromBits(0);
const v2821=((__nfNumber(v2819)) > (__nfNumber(v2820)));
let v2822;if(v2821){
v2822=__nfFromBits(1065353216);}else{
v2822=__nfFromBits(0);}
v2817=v2822;}
v2812=v2817;}
v2808=v2812;}
return v2808;};}
function __prepareFn52(fixed,depth=0){if(depth>=16)return __fn52;const v2854=fixed[0];let v2853=false,v2852;
let v2858;
const v2876=fixed[0]&&fixed[1];let v2875=false,v2874;
return function(v2845,v2846){const v2847=(v2846).length;
const v2848=v2845["inputs"];
const v2849=!(v2847===v2848);
let v2850;if(v2849){
v2850=({Err:"graph input shape"});}else{
let v2851;if(v2854&&v2853){v2851=v2852;}else{
const v2855=v2845["inputs"];
const v2856=v2845["nodes"];
const v2857=v2845["roots"];
if(!v2858){const v2859=__preparedFactories.get(38);v2858=v2859?v2859([fixed[0],fixed[0],fixed[0]],depth+1):__fn38;}
const v2860=v2858(v2855,v2856,v2857);
const v2862=false;
v2851=(v2860===v2862);if(v2854){v2852=v2851;v2853=true;}}
let v2864;if(v2851){
v2864=({Err:"invalid prepared graph"});}else{
const v2866=v2845["nodes"];
const v2867=new __InkBuffer(Array.from(v2846));
const v2868=true;
let v2869=({["values"]:v2867,["finite_indices"]:v2868});
for(let v2870=0;v2870<v2866.length;v2870++){
const v2871=v2866[v2870];
const v2872=v2869;
v2869=__fn51(v2871,v2872);
}
const v2865=v2869;
let v2873;if(v2876&&v2875){v2873=v2874;}else{
const v2877=v2865;
const v2878=v2877["values"];
v2873=v2878.freeze();if(v2876){v2874=v2873;v2875=true;}}
const v2879=v2865;
const v2880=v2879["finite_indices"];
const v2881=false;
const v2882=(v2880===v2881);
let v2883;if(v2882){
v2883=({Err:"nonfinite graph index"});}else{
const v2884=v2873;
const v2885=v2845["roots"];
const v2886=v2885.length;
const v2887=new Array(v2886);
for(let v2888=0;v2888<v2886;v2888++){
const v2889=(v2885[v2888]>>>0);
const v2890=v2873;
let v2891;if(v2889<v2890.length){v2891=v2890[v2889];}else{
v2891=__nfFromBits(0);}
v2887[v2888]=__nfValue(v2891);
}
v2883=({Ok:({["values"]:v2884,["outputs"]:v2887})});}
v2864=v2883;}
v2850=v2864;}
return v2850;};}
function __prepareFn53(fixed,depth=0){if(depth>=16)return __fn53;let v2894;
return function(v2892,v2893){if(!v2894){const v2895=__preparedFactories.get(52);v2894=v2895?v2895([fixed[0],fixed[1]],depth+1):__fn52;}
const v2896=v2894(v2892,v2893);
let v2898;if(Object.hasOwn(v2896,"Ok")){
const v2899=v2896["Ok"];
v2898=({Ok:v2899["outputs"]});}else{v2898=({Err:v2896.Err});}
return v2898;};}
function __prepareFn56(fixed,depth=0){if(depth>=16)return __fn56;const v2905=fixed[0];let v2904=false,v2903;
return function(v2900,v2901){let v2902;if(v2905&&v2904){v2902=v2903;}else{
v2902=v2900;if(v2905){v2903=v2902;v2904=true;}}
const v2906=v2902;
const v2907="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v2908=(v2906===v2907);
let v2909;if(v2908){
v2909=true;}else{
const v2910=v2902;
const v2911="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v2912=(v2910===v2911);
let v2913;if(v2912){
v2913=true;}else{
const v2914=v2902;
const v2915="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v2916=(v2914===v2915);
let v2917;if(v2916){
v2917=v2901["piecewise"];}else{
const v2918=v2901["boolean"];
const v2919="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v2917=!(v2918===v2919);}
v2913=v2917;}
v2909=v2913;}
return v2909;};}
function __prepareFn57(fixed,depth=0){if(depth>=16)return __fn57;const v2925=fixed[0];let v2924=false,v2923;
return function(v2920,v2921){let v2922;if(v2925&&v2924){v2922=v2923;}else{
v2922=v2920["kind"];if(v2925){v2923=v2922;v2924=true;}}
const v2926=v2922;
const v2927="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v2928=(v2926===v2927);
let v2929;if(v2928){
v2929=true;}else{
const v2930=v2922;
const v2931="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v2932=(v2930===v2931);
let v2933;if(v2932){
v2933=true;}else{
const v2934=v2922;
const v2935="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v2936=(v2934===v2935);
let v2937;if(v2936){
const v2938=v2920["unary"];
v2937=__fn56(v2938,v2921);}else{
const v2939=v2922;
const v2940="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v2941=(v2939===v2940);
let v2942;if(v2941){
v2942=true;}else{
const v2943=v2922;
const v2944="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v2945=(v2943===v2944);
let v2946;if(v2945){
v2946=v2921["piecewise"];}else{
const v2947=v2922;
const v2948="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v2949=(v2947===v2948);
let v2950;if(v2949){
v2950=v2921["piecewise"];}else{
const v2951=v2921["index"];
const v2952="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v2950=!(v2951===v2952);}
v2946=v2950;}
v2942=v2946;}
v2937=v2942;}
v2933=v2937;}
v2929=v2933;}
return v2929;};}
function __prepareFn63(fixed,depth=0){if(depth>=16)return __fn63;const v2960=fixed[0]&&fixed[1]&&fixed[2];let v2959=false,v2958;
let v2974;
let v2981;
return function(v2953,v2954,v2955,v2956){let v2957;if(v2960&&v2959){v2957=v2958;}else{
const v2961=(v2954).length;
const v2962=v2953["inputs"];
const v2963=(v2953["nodes"]).length;
const v2964=(((v2962) + (v2963)) >>> 0);
const v2965=!(v2961===v2964);
let v2966=v2965;if(!v2966){
const v2967=(v2955).length;
const v2968=(v2953["roots"]).length;
v2966=!(v2967===v2968);}
const v2969=v2966;
let v2970;if(v2969){
v2970=true;}else{
const v2971=v2953["inputs"];
const v2972=v2953["nodes"];
const v2973=v2953["roots"];
if(!v2974){const v2975=__preparedFactories.get(38);v2974=v2975?v2975([fixed[0],fixed[0],fixed[0]],depth+1):__fn38;}
const v2976=v2974(v2971,v2972,v2973);
const v2978=false;
v2970=(v2976===v2978);}
v2957=v2970;if(v2960){v2958=v2957;v2959=true;}}
let v2980;if(v2957){
v2980=({Err:"cotangent shape"});}else{
if(!v2981){const v2982=__preparedFactories.get(64);v2981=v2982?v2982([fixed[0],fixed[1],fixed[2],fixed[3]],depth+1):__fn64;}
v2980=v2981(v2953,v2954,v2955,v2956);}
return v2980;};}
function __prepareFn64(fixed,depth=0){if(depth>=16)return __fn64;const v2990=fixed[0]&&fixed[3];let v2989=false,v2988;
const v3005=true;let v3004=false,v3003;
const v3028=fixed[0]&&fixed[1]&&fixed[2];let v3027=false,v3026;
return function(v2983,v2984,v2985,v2986){let v2987;if(v2990&&v2989){v2987=v2988;}else{
const v2991=v2983["nodes"];
let v2992=true;
for(let v2993=0;v2993<v2991.length;v2993++){
const v2994=v2991[v2993];
const v2995=v2992;
let v2996=v2995;if(v2996){
v2996=__fn57(v2994,v2986);}
v2992=v2996;
}
v2987=v2992;if(v2990){v2988=v2987;v2989=true;}}
const v2997=v2987;
const v2998=false;
const v2999=(v2997===v2998);
let v3000;if(v2999){
v3000=({Err:"explicit gradient policy required"});}else{
const v3001=__bufferFill((v2984).length,__nfFromBits(0));
let v3002;if(v3005&&v3004){v3002=v3003;}else{
v3002=0;if(v3005){v3003=v3002;v3004=true;}}
const v3007=v3001;
const v3008=v3002;
let v3009=({["g"]:v3007,["i"]:v3008});
for(let v3010=0;v3010<v2985.length;v3010++){
const v3011=v2985[v3010];
const v3012=v3009;
const v3013=v3012["g"];
const v3014=v3009;
const v3015=v3014["i"];
const v3016=v2983["roots"];
let v3017;if(v3015<v3016.length){v3017=v3016[v3015];}else{
v3017=0;}
const v3018=v3017;
const v3019=__nfValue(v3011);
const v3020=__fn54(v3013,v3018,v3019);
const v3021=1;
const v3022=(((v3015) + (v3021)) >>> 0);
v3009=({["g"]:v3020,["i"]:v3022});
}
const v3006=v3009;
const v3024=v3006;
const v3023=v3024["g"];
let v3025;if(v3028&&v3027){v3025=v3026;}else{
const v3029=v3006;
v3025=v3029["i"];if(v3028){v3026=v3025;v3027=true;}}
const v3031=v2983["nodes"];
const v3032=v3023;
const v3033=(v2984).length;
let v3034=({["gradient"]:v3032,["wire"]:v3033});
for(let v3035=v3031.length-1;v3035>=0;v3035--){
const v3036=v3031[v3035];
const v3037=v3034;
v3034=__fn62(v3036,v3037,v2984,v2986);
}
const v3030=v3034;
const v3038=v3030;
const v3039=v3038["gradient"];
const v3040=v3039.freeze();
v3000=({Ok:v3040.slice(0,v2983["inputs"])});}
return v3000;};}
function __prepareFn65(fixed,depth=0){if(depth>=16)return __fn65;let v3049;
return function(v3041,v3042,v3043,v3044){const v3045=(v3043).length;
const v3046=(v3041["roots"]).length;
const v3047=!(v3045===v3046);
let v3048;if(v3047){
v3048=({Err:"cotangent shape"});}else{
if(!v3049){const v3050=__preparedFactories.get(52);v3049=v3050?v3050([fixed[0],fixed[1]],depth+1):__fn52;}
const v3051=v3049(v3041,v3042);
let v3053;if(Object.hasOwn(v3051,"Ok")){
const v3054=v3051["Ok"];
const v3055=v3054["values"];
const v3056=__fn64(v3041,v3055,v3043,v3044);
let v3057;if(Object.hasOwn(v3056,"Ok")){
const v3058=v3056["Ok"];
const v3059=v3054["outputs"];
v3057=({Ok:({["outputs"]:v3059,["gradient"]:v3058})});}else{
const v3060=v3056["Err"];
v3057=({Err:v3060});}
v3053=v3057;}else{
const v3061=v3051["Err"];
v3053=({Err:v3061});}
v3048=v3053;}
return v3048;};}
function __prepareFn66(fixed,depth=0){if(depth>=16)return __fn66;let v3074;
return function(v3062,v3063,v3064,v3065){const v3066=(v3064).length;
const v3067=0;
const v3068=(v3066===v3067);
let v3069=v3068;if(!v3069){
const v3070=(v3064).length;
const v3071=(v3062["roots"]).length;
v3069=!(v3070===v3071);}
const v3072=v3069;
let v3073;if(v3072){
v3073=({Err:"target shape"});}else{
if(!v3074){const v3075=__preparedFactories.get(52);v3074=v3075?v3075([fixed[0],fixed[1]],depth+1):__fn52;}
const v3076=v3074(v3062,v3063);
let v3078;if(Object.hasOwn(v3076,"Ok")){
const v3079=v3076["Ok"];
const v3080=v3079["outputs"];
const v3081=Math.min(v3080.length,v3064.length);
const v3082=new Array(v3081);
for(let v3083=0;v3083<v3081;v3083++){
const v3084=v3080[v3083];
const v3085=v3064[v3083];
const v3086=__nfValue(v3084);
const v3087=__nfValue(v3085);
v3082[v3083]=Math.fround(__nfNumber(v3086) - __nfNumber(v3087));
}
const v3088=Math.fround((v3064).length);
const v3089=v3082.length;
const v3090=new Array(v3089);
for(let v3091=0;v3091<v3089;v3091++){
const v3092=v3082[v3091];
const v3093=__nfValue(v3092);
const v3094=__nfValue(v3092);
v3090[v3091]=Math.fround(__nfNumber(v3093) * __nfNumber(v3094));
}
let v3095=0;for(let v3096=0;v3096<v3090.length;v3096++){
const v3097=v3090[v3096];
v3095=Math.fround(__nfNumber(v3095) + __nfNumber(v3097));}
const v3098=Math.fround((__nfNumber(v3095))/(__nfNumber(__nfValue(v3088))));
const v3099=Number.isFinite(__nfNumber(v3098));
const v3100=false;
let v3101;if((v3099===v3100)){
v3101=({Err:"nonfinite loss"});}else{
const v3102=v3082.length;
const v3103=new Array(v3102);
for(let v3104=0;v3104<v3102;v3104++){
const v3105=v3082[v3104];
const v3106=__nfFromBits(1073741824);
const v3107=__nfValue(v3105);
v3103[v3104]=Math.fround((__nfNumber(Math.fround(v3106 * __nfNumber(v3107))))/(__nfNumber(__nfValue(v3088))));
}
const v3108=v3079["values"];
const v3109=__fn64(v3062,v3108,v3103,v3065);
let v3110;if(Object.hasOwn(v3109,"Ok")){
const v3111=v3109["Ok"];
const v3112=v3079["outputs"];
v3110=({Ok:({["loss"]:v3098,["outputs"]:v3112,["gradient"]:v3111})});}else{
const v3113=v3109["Err"];
v3110=({Err:v3113});}
v3101=v3110;}
v3078=v3101;}else{
const v3114=v3076["Err"];
v3078=({Err:v3114});}
v3073=v3078;}
return v3073;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[9,__prepareFn9],[13,__prepareFn13],[14,__prepareFn14],[16,__prepareFn16],[17,__prepareFn17],[18,__prepareFn18],[19,__prepareFn19],[20,__prepareFn20],[21,__prepareFn21],[22,__prepareFn22],[23,__prepareFn23],[24,__prepareFn24],[25,__prepareFn25],[26,__prepareFn26],[27,__prepareFn27],[28,__prepareFn28],[29,__prepareFn29],[30,__prepareFn30],[34,__prepareFn34],[35,__prepareFn35],[37,__prepareFn37],[38,__prepareFn38],[39,__prepareFn39],[43,__prepareFn43],[45,__prepareFn45],[52,__prepareFn52],[53,__prepareFn53],[56,__prepareFn56],[57,__prepareFn57],[63,__prepareFn63],[64,__prepareFn64],[65,__prepareFn65],[66,__prepareFn66]]);

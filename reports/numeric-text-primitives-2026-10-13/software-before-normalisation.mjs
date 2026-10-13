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
// Fixed word semantics, including arithmetic signed right shift. Shift and
// rotation counts wrap modulo width; no source-pattern optimisation lives here.
function __word(op,a,b,bits) {
  const width=BigInt(Math.abs(bits)), k=BigInt(b??0)%width;
  const x=BigInt(a), y=BigInt(b??0), unsigned=BigInt.asUintN(Number(width),x);
  let r;
  switch(op) {
    case 'word_not':r=~x;break;
    case 'word_and':r=x&y;break;
    case 'word_or':r=x|y;break;
    case 'word_xor':r=x^y;break;
    case 'wrapping_shl':r=x<<k;break;
    case 'wrapping_shr':r=x>>k;break;
    case 'rotate_left':r=(unsigned<<k)|(unsigned>>(width-k));break;
    case 'rotate_right':r=(unsigned>>k)|(unsigned<<(width-k));break;
    default:throw new Error('unknown word operation');
  }
  r=bits<0?BigInt.asIntN(Number(width),r):BigInt.asUintN(Number(width),r);
  return bits===64?r:Number(r);
}
function __fn0(v0){
const v1=v0;
const v2=v1.length;
const v3=new Array(v2);
for(let v4=0;v4<v2;v4++){
const v5=v1[v4];
const v6=v5;
const v7=__nfValue(v6["x"]);
const v8=v5;
const v9=__nfValue(v8["x"]);
const v10=__nfValue(Math.fround(__nfNumber(v7) * __nfNumber(v9)));
const v11=v5;
const v12=__nfValue(v11["y"]);
const v13=v5;
const v14=__nfValue(v13["y"]);
const v15=__nfValue(Math.fround(__nfNumber(v12) * __nfNumber(v14)));
v3[v4]=__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v10) + __nfNumber(v15)))))));
}
return v3;}
function __fn1(v16){
const v17=v16;
const v18=v17.length;
const v19=new Array(v18);
for(let v20=0;v20<v18;v20++){
const v21=v17[v20];
const v22=v21;
v19[v20]=__fn16(v22);
}
return v19;}
function __fn2(v23){
const v24=v23;
const v25=v24.length;
const v26=new Array(v25);
for(let v27=0;v27<v25;v27++){
const v28=v24[v27];
v26[v27]=__nfValue(Math.fround(__ink_round_even(__nfNumber(__nfValue(v28)))));
}
return v26;}
function __fn3(v29){
const v30=v29;
const v31=v30.length;
const v32=new Array(v31);
for(let v33=0;v33<v31;v33++){
const v34=v30[v33];
const v35=__nfValue(v34);
v32[v33]=__fn17(v35);
}
return v32;}
function __fn4(v36){
const v37=v36;
const v38=v37.length;
const v39=new Array(v38);
for(let v40=0;v40<v38;v40++){
const v41=v37[v40];
const v42=__nfValue(v41);
v39[v40]=__fn19(v42);
}
return v39;}
function __fn5(v43){
const v44=v43;
const v45=v44.length;
const v46=new Array(v45);
for(let v47=0;v47<v45;v47++){
const v48=v44[v47];
const v49=__nfValue(v48);
v46[v47]=__fn20(v49);
}
return v46;}
function __fn6(v50,v51){
const v52=v50;
const v53=v52.length;
const v54=new Array(v53);
for(let v55=0;v55<v53;v55++){
const v56=v52[v55];
v54[v55]=__ink_find(v56,v51,0);
}
return v54;}
function __fn7(v57,v58,v59){
const v60=v57;
const v61=v60.length;
const v62=new Array(v61);
for(let v63=0;v63<v61;v63++){
const v64=v60[v63];
v62[v63]=__ink_slice(v64,v58,v59);
}
return v62;}
function __fn8(v65){
const v66=v65;
const v67=v66.length;
const v68=new Array(v67);
for(let v69=0;v69<v67;v69++){
const v70=v66[v69];
v68[v69]=__ink_count(v70,"popcount",32);
}
return v68;}
function __fn9(v71){
const v72=__nfBits(__nfValue(v71));
const v73=2147483647;
return __nfValue(__nfFromBits(__word("word_and",v72,v73,32)));}
function __fn10(v74,v75){
const v76=Number.isNaN(__nfNumber(__nfValue(v74)));
let v77=v76;if(!v77){
v77=Number.isNaN(__nfNumber(__nfValue(v75)));}
let v78;if(v77){
v78=__nfValue(__nfFromBits(2143289344));}else{
const v79=__nfValue(v74);
const v80=__nfValue(__nfFromBits(0));
const v81=((__nfNumber(v79)) === (__nfNumber(v80)));
let v82=v81;if(v82){
const v83=__nfValue(v75);
const v84=__nfValue(__nfFromBits(0));
v82=((__nfNumber(v83)) === (__nfNumber(v84)));}
let v85;if(v82){
const v86=__nfBits(__nfValue(v74));
const v87=__nfBits(__nfValue(v75));
v85=__nfValue(__nfFromBits(__word("word_or",v86,v87,32)));}else{
const v88=__nfValue(v74);
const v89=__nfValue(v75);
let v90;if(((__nfNumber(v88)) < (__nfNumber(v89)))){
v90=__nfValue(v74);}else{
v90=__nfValue(v75);}
v85=__nfValue(v90);}
v78=__nfValue(v85);}
return __nfValue(v78);}
function __fn11(v91,v92){
const v93=Number.isNaN(__nfNumber(__nfValue(v91)));
let v94=v93;if(!v94){
v94=Number.isNaN(__nfNumber(__nfValue(v92)));}
let v95;if(v94){
v95=__nfValue(__nfFromBits(2143289344));}else{
const v96=__nfValue(v91);
const v97=__nfValue(__nfFromBits(0));
const v98=((__nfNumber(v96)) === (__nfNumber(v97)));
let v99=v98;if(v99){
const v100=__nfValue(v92);
const v101=__nfValue(__nfFromBits(0));
v99=((__nfNumber(v100)) === (__nfNumber(v101)));}
let v102;if(v99){
const v103=__nfBits(__nfValue(v91));
const v104=__nfBits(__nfValue(v92));
v102=__nfValue(__nfFromBits(__word("word_and",v103,v104,32)));}else{
const v105=__nfValue(v91);
const v106=__nfValue(v92);
let v107;if(((__nfNumber(v105)) > (__nfNumber(v106)))){
v107=__nfValue(v91);}else{
v107=__nfValue(v92);}
v102=__nfValue(v107);}
v95=__nfValue(v102);}
return __nfValue(v95);}
function __fn12(v108,v109,v110){
const v111=__nfValue(v109);
const v112=__nfValue(v110);
let v113;if(((__nfNumber(v111)) > (__nfNumber(v112)))){
v113=__nfValue(__nfFromBits(2143289344));}else{
const v114=__nfValue(v108);
const v115=__nfValue(v109);
const v116=__nfValue(__fn11(v114,v115));
const v117=__nfValue(v110);
v113=__nfValue(__fn10(v116,v117));}
return __nfValue(v113);}
function __fn13(v118){
const v119=v118;
const v120=__nfValue(v119[0]);
const v121=__nfValue(__fn9(v120));
const v122=v118;
const v123=__nfValue(v122[1]);
const v124=__nfValue(__fn9(v123));
const v125=__nfValue(__fn11(v121,v124));
const v126=__nfValue(v125);
const v127=__nfValue(__nfFromBits(0));
let v128;if(((__nfNumber(v126)) === (__nfNumber(v127)))){
v128=__nfValue(__nfFromBits(0));}else{
const v129=Number.isFinite(__nfNumber(__nfValue(v125)));
const v130=false;
let v131;if((v129===v130)){
v131=__nfValue(v125);}else{
const v132=v118;
const v133=__nfValue(Math.fround((__nfNumber(__nfValue(v132[0])))/(__nfNumber(__nfValue(v125)))));
const v134=v118;
const v135=__nfValue(Math.fround((__nfNumber(__nfValue(v134[1])))/(__nfNumber(__nfValue(v125)))));
const v136=__nfValue(v125);
const v137=__nfValue(v133);
const v138=__nfValue(v133);
const v139=__nfValue(Math.fround(__nfNumber(v137) * __nfNumber(v138)));
const v140=__nfValue(v135);
const v141=__nfValue(v135);
const v142=__nfValue(Math.fround(__nfNumber(v140) * __nfNumber(v141)));
const v143=__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v139) + __nfNumber(v142)))))));
v131=__nfValue(__nfValue(__nfValue(Math.fround(__nfNumber(v136) * __nfNumber(v143)))));}
v128=__nfValue(v131);}
return __nfValue(__nfValue(v128));}
function __fn14(v144){
const v145=v144;
const v146=__nfValue(v145[0]);
const v147=__nfValue(__fn9(v146));
const v148=v144;
const v149=__nfValue(v148[1]);
const v150=__nfValue(__fn9(v149));
const v151=__nfValue(__fn11(v147,v150));
const v152=v144;
const v153=__nfValue(v152[2]);
const v154=__nfValue(__fn9(v153));
const v155=__nfValue(__fn11(v151,v154));
const v156=__nfValue(v155);
const v157=__nfValue(__nfFromBits(0));
let v158;if(((__nfNumber(v156)) === (__nfNumber(v157)))){
v158=__nfValue(__nfFromBits(0));}else{
const v159=Number.isFinite(__nfNumber(__nfValue(v155)));
const v160=false;
let v161;if((v159===v160)){
v161=__nfValue(v155);}else{
const v162=v144;
const v163=__nfValue(Math.fround((__nfNumber(__nfValue(v162[0])))/(__nfNumber(__nfValue(v155)))));
const v164=v144;
const v165=__nfValue(Math.fround((__nfNumber(__nfValue(v164[1])))/(__nfNumber(__nfValue(v155)))));
const v166=v144;
const v167=__nfValue(Math.fround((__nfNumber(__nfValue(v166[2])))/(__nfNumber(__nfValue(v155)))));
const v168=__nfValue(v155);
const v169=__nfValue(v163);
const v170=__nfValue(v163);
const v171=__nfValue(Math.fround(__nfNumber(v169) * __nfNumber(v170)));
const v172=__nfValue(v165);
const v173=__nfValue(v165);
const v174=__nfValue(Math.fround(__nfNumber(v172) * __nfNumber(v173)));
const v175=__nfValue(Math.fround(__nfNumber(v171) + __nfNumber(v174)));
const v176=__nfValue(v167);
const v177=__nfValue(v167);
const v178=__nfValue(Math.fround(__nfNumber(v176) * __nfNumber(v177)));
const v179=__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v175) + __nfNumber(v178)))))));
v161=__nfValue(__nfValue(__nfValue(__nfValue(Math.fround(__nfNumber(v168) * __nfNumber(v179))))));}
v158=__nfValue(v161);}
return __nfValue(__nfValue(v158));}
function __fn15(v180){
const v181=v180;
const v182=__nfValue(v181[0]);
const v183=__nfValue(__fn9(v182));
const v184=v180;
const v185=__nfValue(v184[1]);
const v186=__nfValue(__fn9(v185));
const v187=__nfValue(__fn11(v183,v186));
const v188=__nfValue(v187);
const v189=__nfValue(__nfFromBits(0));
const v190=((__nfNumber(v188)) === (__nfNumber(v189)));
let v191=v190;if(!v191){
const v192=Number.isFinite(__nfNumber(__nfValue(v187)));
const v193=false;
v191=(v192===v193);}
let v194;if(v191){
v194=({None:null});}else{
const v195=v180;
const v196=__nfValue(Math.fround((__nfNumber(__nfValue(v195[0])))/(__nfNumber(__nfValue(v187)))));
const v197=v180;
const v198=__nfValue(Math.fround((__nfNumber(__nfValue(v197[1])))/(__nfNumber(__nfValue(v187)))));
const v199=__nfValue(v196);
const v200=__nfValue(v196);
const v201=__nfValue(Math.fround(__nfNumber(v199) * __nfNumber(v200)));
const v202=__nfValue(v198);
const v203=__nfValue(v198);
const v204=__nfValue(Math.fround(__nfNumber(v202) * __nfNumber(v203)));
const v205=__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v201) + __nfNumber(v204)))))));
const v206=__nfValue(Math.fround((__nfNumber(__nfValue(v196)))/(__nfNumber(__nfValue(v205)))));
const v207=__nfValue(Math.fround((__nfNumber(__nfValue(v198)))/(__nfNumber(__nfValue(v205)))));
v194=({Some:[v206,v207]});}
return v194;}
function __fn16(v208){
const v209=v208;
const v210=__nfValue(v209[0]);
const v211=__nfValue(__fn9(v210));
const v212=v208;
const v213=__nfValue(v212[1]);
const v214=__nfValue(__fn9(v213));
const v215=__nfValue(__fn11(v211,v214));
const v216=v208;
const v217=__nfValue(v216[2]);
const v218=__nfValue(__fn9(v217));
const v219=__nfValue(__fn11(v215,v218));
const v220=__nfValue(v219);
const v221=__nfValue(__nfFromBits(0));
const v222=((__nfNumber(v220)) === (__nfNumber(v221)));
let v223=v222;if(!v223){
const v224=Number.isFinite(__nfNumber(__nfValue(v219)));
const v225=false;
v223=(v224===v225);}
let v226;if(v223){
v226=({None:null});}else{
const v227=v208;
const v228=__nfValue(Math.fround((__nfNumber(__nfValue(v227[0])))/(__nfNumber(__nfValue(v219)))));
const v229=v208;
const v230=__nfValue(Math.fround((__nfNumber(__nfValue(v229[1])))/(__nfNumber(__nfValue(v219)))));
const v231=v208;
const v232=__nfValue(Math.fround((__nfNumber(__nfValue(v231[2])))/(__nfNumber(__nfValue(v219)))));
const v233=__nfValue(v228);
const v234=__nfValue(v228);
const v235=__nfValue(Math.fround(__nfNumber(v233) * __nfNumber(v234)));
const v236=__nfValue(v230);
const v237=__nfValue(v230);
const v238=__nfValue(Math.fround(__nfNumber(v236) * __nfNumber(v237)));
const v239=__nfValue(Math.fround(__nfNumber(v235) + __nfNumber(v238)));
const v240=__nfValue(v232);
const v241=__nfValue(v232);
const v242=__nfValue(Math.fround(__nfNumber(v240) * __nfNumber(v241)));
const v243=__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v239) + __nfNumber(v242)))))));
const v244=__nfValue(Math.fround((__nfNumber(__nfValue(v228)))/(__nfNumber(__nfValue(v243)))));
const v245=__nfValue(Math.fround((__nfNumber(__nfValue(v230)))/(__nfNumber(__nfValue(v243)))));
const v246=__nfValue(Math.fround((__nfNumber(__nfValue(v232)))/(__nfNumber(__nfValue(v243)))));
v226=({Some:[v244,v245,v246]});}
return v226;}
function __fn17(v247){
const v248=Number.isFinite(__nfNumber(__nfValue(v247)));
const v249=false;
const v250=(v248===v249);
let v251=v250;if(!v251){
const v252=__nfValue(v247);
const v253=__nfValue(__fn9(v252));
const v254=__nfValue(__nfFromBits(1078530011));
v251=((__nfNumber(v253)) > (__nfNumber(v254)));}
let v255;if(v251){
v255=({None:null});}else{
const v256=__nfValue(v247);
const v257=__nfValue(v247);
const v258=__nfValue(Math.fround(__nfNumber(v256) * __nfNumber(v257)));
const v259=__nfValue(v247);
const v260=__nfValue(__nfFromBits(1065353216));
const v261=__nfValue(v258);
const v262=__nfValue(__nfFromBits(1042983595));
const v263=__nfValue(__nfNeg(v262));
const v264=__nfValue(v258);
const v265=__nfValue(__nfFromBits(1007192201));
const v266=__nfValue(v258);
const v267=__nfValue(__nfFromBits(961547521));
const v268=__nfValue(__nfNeg(v267));
const v269=__nfValue(v258);
const v270=__nfValue(__nfFromBits(909700893));
const v271=__nfValue(v258);
const v272=__nfValue(__nfFromBits(852963883));
const v273=__nfValue(__nfNeg(v272));
const v274=__nfValue(v258);
const v275=__nfValue(__nfFromBits(791712305));
const v276=__nfValue(v258);
const v277=__nfValue(__nfFromBits(727138207));
const v278=__nfValue(__nfNeg(v277));
const v279=__nfValue(v258);
const v280=__nfValue(__nfFromBits(659199548));
const v281=__nfValue(Math.fround(__nfNumber(v279) * __nfNumber(v280)));
const v282=__nfValue(Math.fround(__nfNumber(v278) + __nfNumber(v281)));
const v283=__nfValue(Math.fround(__nfNumber(v276) * __nfNumber(v282)));
const v284=__nfValue(Math.fround(__nfNumber(v275) + __nfNumber(v283)));
const v285=__nfValue(Math.fround(__nfNumber(v274) * __nfNumber(v284)));
const v286=__nfValue(Math.fround(__nfNumber(v273) + __nfNumber(v285)));
const v287=__nfValue(Math.fround(__nfNumber(v271) * __nfNumber(v286)));
const v288=__nfValue(Math.fround(__nfNumber(v270) + __nfNumber(v287)));
const v289=__nfValue(Math.fround(__nfNumber(v269) * __nfNumber(v288)));
const v290=__nfValue(Math.fround(__nfNumber(v268) + __nfNumber(v289)));
const v291=__nfValue(Math.fround(__nfNumber(v266) * __nfNumber(v290)));
const v292=__nfValue(Math.fround(__nfNumber(v265) + __nfNumber(v291)));
const v293=__nfValue(Math.fround(__nfNumber(v264) * __nfNumber(v292)));
const v294=__nfValue(Math.fround(__nfNumber(v263) + __nfNumber(v293)));
const v295=__nfValue(Math.fround(__nfNumber(v261) * __nfNumber(v294)));
const v296=__nfValue(Math.fround(__nfNumber(v260) + __nfNumber(v295)));
v255=({Some:__nfValue(Math.fround(__nfNumber(v259) * __nfNumber(v296)))});}
return v255;}
function __fn18(v297){
const v298=Number.isFinite(__nfNumber(__nfValue(v297)));
const v299=false;
const v300=(v298===v299);
let v301=v300;if(!v301){
const v302=__nfValue(v297);
const v303=__nfValue(__fn9(v302));
const v304=__nfValue(__nfFromBits(1078530011));
v301=((__nfNumber(v303)) > (__nfNumber(v304)));}
let v305;if(v301){
v305=({None:null});}else{
const v306=__nfValue(v297);
const v307=__nfValue(v297);
const v308=__nfValue(Math.fround(__nfNumber(v306) * __nfNumber(v307)));
const v309=__nfValue(__nfFromBits(1065353216));
const v310=__nfValue(v308);
const v311=__nfValue(__nfFromBits(1056964608));
const v312=__nfValue(__nfNeg(v311));
const v313=__nfValue(v308);
const v314=__nfValue(__nfFromBits(1026206379));
const v315=__nfValue(v308);
const v316=__nfValue(__nfFromBits(985008993));
const v317=__nfValue(__nfNeg(v316));
const v318=__nfValue(v308);
const v319=__nfValue(__nfFromBits(936381697));
const v320=__nfValue(v308);
const v321=__nfValue(__nfFromBits(882111102));
const v322=__nfValue(__nfNeg(v321));
const v323=__nfValue(v308);
const v324=__nfValue(__nfFromBits(823097031));
const v325=__nfValue(v308);
const v326=__nfValue(__nfFromBits(759810981));
const v327=__nfValue(__nfNeg(v326));
const v328=__nfValue(v308);
const v329=__nfValue(__nfFromBits(693583775));
const v330=__nfValue(v308);
const v331=__nfValue(__nfFromBits(624169923));
const v332=__nfValue(__nfNeg(v331));
const v333=__nfValue(Math.fround(__nfNumber(v330) * __nfNumber(v332)));
const v334=__nfValue(Math.fround(__nfNumber(v329) + __nfNumber(v333)));
const v335=__nfValue(Math.fround(__nfNumber(v328) * __nfNumber(v334)));
const v336=__nfValue(Math.fround(__nfNumber(v327) + __nfNumber(v335)));
const v337=__nfValue(Math.fround(__nfNumber(v325) * __nfNumber(v336)));
const v338=__nfValue(Math.fround(__nfNumber(v324) + __nfNumber(v337)));
const v339=__nfValue(Math.fround(__nfNumber(v323) * __nfNumber(v338)));
const v340=__nfValue(Math.fround(__nfNumber(v322) + __nfNumber(v339)));
const v341=__nfValue(Math.fround(__nfNumber(v320) * __nfNumber(v340)));
const v342=__nfValue(Math.fround(__nfNumber(v319) + __nfNumber(v341)));
const v343=__nfValue(Math.fround(__nfNumber(v318) * __nfNumber(v342)));
const v344=__nfValue(Math.fround(__nfNumber(v317) + __nfNumber(v343)));
const v345=__nfValue(Math.fround(__nfNumber(v315) * __nfNumber(v344)));
const v346=__nfValue(Math.fround(__nfNumber(v314) + __nfNumber(v345)));
const v347=__nfValue(Math.fround(__nfNumber(v313) * __nfNumber(v346)));
const v348=__nfValue(Math.fround(__nfNumber(v312) + __nfNumber(v347)));
const v349=__nfValue(Math.fround(__nfNumber(v310) * __nfNumber(v348)));
v305=({Some:__nfValue(Math.fround(__nfNumber(v309) + __nfNumber(v349)))});}
return v305;}
function __fn19(v350){
const v351=Number.isFinite(__nfNumber(__nfValue(v350)));
const v352=false;
const v353=(v351===v352);
let v354=v353;if(!v354){
const v355=__nfValue(v350);
const v356=__nfValue(__fn9(v355));
const v357=__nfValue(__nfFromBits(1117782016));
v354=((__nfNumber(v356)) > (__nfNumber(v357)));}
let v358;if(v354){
v358=({None:null});}else{
const v359=__nfValue(v350);
const v360=__nfValue(__nfFromBits(1069066811));
const v361=__nfValue(Math.fround(__ink_round_even(__nfNumber(__nfValue(Math.fround(__nfNumber(v359) * __nfNumber(v360)))))));
const v362=__ink_from_float(__nfNumber(__nfValue(v361)), "i32");
let v363;if(Object.hasOwn(v362,"Some")){
const v364=v362["Some"];
v363=v364;}else{
const v365=null;
v363=0;}
const v366=v363;
const v367=__nfValue(v350);
const v368=__nfValue(v361);
const v369=__nfValue(__nfFromBits(1060205056));
const v370=__nfValue(Math.fround(__nfNumber(v368) * __nfNumber(v369)));
const v371=__nfValue(Math.fround(__nfNumber(v367) - __nfNumber(v370)));
const v372=__nfValue(v361);
const v373=__nfValue(__nfFromBits(901758606));
const v374=__nfValue(Math.fround(__nfNumber(v372) * __nfNumber(v373)));
const v375=__nfValue(Math.fround(__nfNumber(v371) - __nfNumber(v374)));
const v376=__nfValue(__nfFromBits(1065353216));
const v377=__nfValue(v375);
const v378=__nfValue(__nfFromBits(1065353216));
const v379=__nfValue(v375);
const v380=__nfValue(__nfFromBits(1056964608));
const v381=__nfValue(v375);
const v382=__nfValue(__nfFromBits(1042983595));
const v383=__nfValue(v375);
const v384=__nfValue(__nfFromBits(1026206379));
const v385=__nfValue(v375);
const v386=__nfValue(__nfFromBits(1007192201));
const v387=__nfValue(v375);
const v388=__nfValue(__nfFromBits(985008993));
const v389=__nfValue(v375);
const v390=__nfValue(__nfFromBits(961547521));
const v391=__nfValue(Math.fround(__nfNumber(v389) * __nfNumber(v390)));
const v392=__nfValue(Math.fround(__nfNumber(v388) + __nfNumber(v391)));
const v393=__nfValue(Math.fround(__nfNumber(v387) * __nfNumber(v392)));
const v394=__nfValue(Math.fround(__nfNumber(v386) + __nfNumber(v393)));
const v395=__nfValue(Math.fround(__nfNumber(v385) * __nfNumber(v394)));
const v396=__nfValue(Math.fround(__nfNumber(v384) + __nfNumber(v395)));
const v397=__nfValue(Math.fround(__nfNumber(v383) * __nfNumber(v396)));
const v398=__nfValue(Math.fround(__nfNumber(v382) + __nfNumber(v397)));
const v399=__nfValue(Math.fround(__nfNumber(v381) * __nfNumber(v398)));
const v400=__nfValue(Math.fround(__nfNumber(v380) + __nfNumber(v399)));
const v401=__nfValue(Math.fround(__nfNumber(v379) * __nfNumber(v400)));
const v402=__nfValue(Math.fround(__nfNumber(v378) + __nfNumber(v401)));
const v403=__nfValue(Math.fround(__nfNumber(v377) * __nfNumber(v402)));
const v404=__nfValue(Math.fround(__nfNumber(v376) + __nfNumber(v403)));
const v405=v366;
const v406=127;
const v407=__ink_from_float(__nfNumber(__nfValue(Math.fround((((v405) + (v406)) | 0)))), "u32");
let v408;if(Object.hasOwn(v407,"Some")){
const v409=v407["Some"];
v408=v409;}else{
const v410=null;
v408=0;}
const v411=v408;
const v412=__nfValue(v404);
const v413=v411;
const v414=23;
const v415=__nfValue(__nfFromBits(__word("wrapping_shl",v413,v414,32)));
v358=({Some:__nfValue(Math.fround(__nfNumber(v412) * __nfNumber(v415)))});}
return v358;}
function __fn20(v416){
const v417=Number.isFinite(__nfNumber(__nfValue(v416)));
const v418=false;
const v419=(v417===v418);
let v420=v419;if(!v420){
const v421=__nfValue(v416);
const v422=__nfValue(__nfFromBits(0));
v420=((__nfNumber(v421)) <= (__nfNumber(v422)));}
let v423;if(v420){
v423=({None:null});}else{
const v424=__nfValue(v416);
const v425=__nfValue(__nfFromBits(8388608));
let v426;if(((__nfNumber(v424)) < (__nfNumber(v425)))){
const v427=__nfValue(v416);
const v428=__nfValue(__nfFromBits(1258291200));
v426=__nfValue(Math.fround(__nfNumber(v427) * __nfNumber(v428)));}else{
v426=__nfValue(v416);}
const v429=__nfValue(v426);
const v430=__nfValue(v416);
const v431=__nfValue(__nfFromBits(8388608));
let v432;if(((__nfNumber(v430)) < (__nfNumber(v431)))){
v432=__nfValue(__nfFromBits(1102577664));}else{
v432=__nfValue(__nfFromBits(0));}
const v433=__nfValue(v432);
const v434=__nfBits(__nfValue(v429));
const v435=v434;
const v436=23;
const v437=__nfValue(Math.fround(__word("wrapping_shr",v435,v436,32)));
const v438=__nfValue(__nfFromBits(1123942400));
const v439=__nfValue(Math.fround(__nfNumber(v437) - __nfNumber(v438)));
const v440=__nfValue(v433);
const v441=__nfValue(Math.fround(__nfNumber(v439) - __nfNumber(v440)));
const v442=v434;
const v443=8388607;
const v444=__word("word_and",v442,v443,32);
const v445=1065353216;
const v446=__nfValue(__nfFromBits(__word("word_or",v444,v445,32)));
const v447=__nfValue(v446);
const v448=__nfValue(__nfFromBits(1065353216));
const v449=__nfValue(v446);
const v450=__nfValue(__nfFromBits(1065353216));
const v451=__nfValue(Math.fround((__nfNumber(__nfValue(Math.fround(__nfNumber(v447) - __nfNumber(v448)))))/(__nfNumber(__nfValue(Math.fround(__nfNumber(v449) + __nfNumber(v450)))))));
const v452=__nfValue(v451);
const v453=__nfValue(v451);
const v454=__nfValue(Math.fround(__nfNumber(v452) * __nfNumber(v453)));
const v455=__nfValue(__nfFromBits(1073741824));
const v456=__nfValue(v451);
const v457=__nfValue(Math.fround(__nfNumber(v455) * __nfNumber(v456)));
const v458=__nfValue(__nfFromBits(1065353216));
const v459=__nfValue(v454);
const v460=__nfValue(__nfFromBits(1051372203));
const v461=__nfValue(v454);
const v462=__nfValue(__nfFromBits(1045220557));
const v463=__nfValue(v454);
const v464=__nfValue(__nfFromBits(1041385765));
const v465=__nfValue(v454);
const v466=__nfValue(__nfFromBits(1038323257));
const v467=__nfValue(v454);
const v468=__nfValue(__nfFromBits(1035611788));
const v469=__nfValue(v454);
const v470=__nfValue(__nfFromBits(1033734617));
const v471=__nfValue(v454);
const v472=__nfValue(__nfFromBits(1032358025));
const v473=__nfValue(Math.fround(__nfNumber(v471) * __nfNumber(v472)));
const v474=__nfValue(Math.fround(__nfNumber(v470) + __nfNumber(v473)));
const v475=__nfValue(Math.fround(__nfNumber(v469) * __nfNumber(v474)));
const v476=__nfValue(Math.fround(__nfNumber(v468) + __nfNumber(v475)));
const v477=__nfValue(Math.fround(__nfNumber(v467) * __nfNumber(v476)));
const v478=__nfValue(Math.fround(__nfNumber(v466) + __nfNumber(v477)));
const v479=__nfValue(Math.fround(__nfNumber(v465) * __nfNumber(v478)));
const v480=__nfValue(Math.fround(__nfNumber(v464) + __nfNumber(v479)));
const v481=__nfValue(Math.fround(__nfNumber(v463) * __nfNumber(v480)));
const v482=__nfValue(Math.fround(__nfNumber(v462) + __nfNumber(v481)));
const v483=__nfValue(Math.fround(__nfNumber(v461) * __nfNumber(v482)));
const v484=__nfValue(Math.fround(__nfNumber(v460) + __nfNumber(v483)));
const v485=__nfValue(Math.fround(__nfNumber(v459) * __nfNumber(v484)));
const v486=__nfValue(Math.fround(__nfNumber(v458) + __nfNumber(v485)));
const v487=__nfValue(Math.fround(__nfNumber(v457) * __nfNumber(v486)));
const v488=__nfValue(v441);
const v489=__nfValue(__nfFromBits(1060205080));
const v490=__nfValue(Math.fround(__nfNumber(v488) * __nfNumber(v489)));
const v491=__nfValue(v487);
v423=({Some:__nfValue(Math.fround(__nfNumber(v490) + __nfNumber(v491)))});}
return v423;}
function __fn21(v492){
const v493=__nfValue(v492);
const v494=__nfValue(__nfFromBits(1060205080));
const v495=__nfValue(Math.fround(__nfNumber(v493) * __nfNumber(v494)));
return __fn19(v495);}
function __fn22(v496){
const v497=__nfValue(v496);
const v498=__fn20(v497);
let v499;if(Object.hasOwn(v498,"Some")){
const v500=v498["Some"];
const v501=__nfValue(v500);
const v502=__nfValue(__nfFromBits(1069066811));
v499=({Some:__nfValue(Math.fround(__nfNumber(v501) * __nfNumber(v502)))});}else{v499=v498;}
return v499;}
function __fn23(){
const v503=[];
return ({["chunks"]:v503});}
function __fn24(v504){
const v505=v504;
const v506=[v505];
return ({["chunks"]:v506});}
function __fn25(v507,v508){
const v509=v507;
const v510=v509["chunks"];
const v511=v508;
const v512=v511["chunks"];
const v513=v510.length;
const v514=v512.length;
const v515=new Array(v513+v514);
for(let v516=0;v516<v513;v516++){v515[v516]=v510[v516];}
for(let v517=0;v517<v514;v517++){v515[v513+v517]=v512[v517];}
const v518=v515;
return ({["chunks"]:v518});}
function __fn26(v519){
const v520=v519;
const v521=v520["chunks"];
let v522=({Some:0});
for(let v523=0;v523<v521.length;v523++){
const v524=v521[v523];
const v525=v522;
let v526;if(Object.hasOwn(v525,"Some")){
const v527=v525["Some"];
const v528=v527;
const v529=__ink_bytes(v524).length;
const v530=(((v528) + (v529)) >>> 0);
const v531=v527;
let v532;if(((v530) < (v531))){
v532=({None:null});}else{
const v533=v527;
const v534=__ink_bytes(v524).length;
v532=({Some:(((v533) + (v534)) >>> 0)});}
v526=v532;}else{
const v535=null;
v526=({None:null});}
v522=v526;
}
return v522;}
function __fn27(v536){
const v537=v536;
const v538=v537["chunks"];
let v539="";
for(let v540=0;v540<v538.length;v540++){
const v541=v538[v540];
v539=__ink_concat(v539,v541);
}
return v539;}
function __fn28(v542,v543,v544){
const v545=v542;
return __ink_slice(__fn27(v545),v543,v544);}
function __fn29(v546,v547,v548){
const v549=v546;
return __ink_find(__fn27(v549),v547,v548);}
function __fn30(v550,v551,v552){
const v553=v550;
const v554=__fn27(v553);
const v555=__ink_bytes(v554).length;
const v556=__ink_slice(v554,0,v551);
let v557;if(Object.hasOwn(v556,"Some")){
const v558=v556["Some"];
const v559=__ink_slice(v554,v551,v555);
let v560;if(Object.hasOwn(v559,"Some")){
const v561=v559["Some"];
const v562=v558;
const v563=v552;
const v564=v561;
const v565=[v562,v563,v564];
v560=({Some:({["chunks"]:v565})});}else{v560=v559;}
v557=v560;}else{
const v566=null;
v557=({None:null});}
return v557;}
function __into0(v567,v568){
const v569=v567;
const v570=v569.length;
for(let v572=0;v572<v570;v572++){
const v573=v569[v572];
const v574=v573;
const v575=__nfValue(v574["x"]);
const v576=v573;
const v577=__nfValue(v576["x"]);
const v578=__nfValue(Math.fround(__nfNumber(v575) * __nfNumber(v577)));
const v579=v573;
const v580=__nfValue(v579["y"]);
const v581=v573;
const v582=__nfValue(v581["y"]);
const v583=__nfValue(Math.fround(__nfNumber(v580) * __nfNumber(v582)));
v568[v572]=__intoOutput0(__nfValue(Math.fround(Math.sqrt(__nfNumber(__nfValue(Math.fround(__nfNumber(v578) + __nfNumber(v583))))))));
}
return v570;}
function __into1(v584,v585){
const v586=v584;
const v587=v586.length;
for(let v589=0;v589<v587;v589++){
const v590=v586[v589];
const v591=v590;
v585[v589]=__intoOutput1(__fn16(v591));
}
return v587;}
function __into2(v592,v593){
const v594=v592;
const v595=v594.length;
for(let v597=0;v597<v595;v597++){
const v598=v594[v597];
v593[v597]=__intoOutput2(__nfValue(Math.fround(__ink_round_even(__nfNumber(__nfValue(v598))))));
}
return v595;}
function __into3(v599,v600){
const v601=v599;
const v602=v601.length;
for(let v604=0;v604<v602;v604++){
const v605=v601[v604];
const v606=__nfValue(v605);
v600[v604]=__intoOutput3(__fn17(v606));
}
return v602;}
function __into4(v607,v608){
const v609=v607;
const v610=v609.length;
for(let v612=0;v612<v610;v612++){
const v613=v609[v612];
const v614=__nfValue(v613);
v608[v612]=__intoOutput4(__fn19(v614));
}
return v610;}
function __into5(v615,v616){
const v617=v615;
const v618=v617.length;
for(let v620=0;v620<v618;v620++){
const v621=v617[v620];
const v622=__nfValue(v621);
v616[v620]=__intoOutput5(__fn20(v622));
}
return v618;}
function __into6(v623,v624,v625){
const v626=v623;
const v627=v626.length;
for(let v629=0;v629<v627;v629++){
const v630=v626[v629];
v625[v629]=__ink_find(v630,v624,0);
}
return v627;}
function __into7(v631,v632,v633,v634){
const v635=v631;
const v636=v635.length;
for(let v638=0;v638<v636;v638++){
const v639=v635[v638];
v634[v638]=__ink_slice(v639,v632,v633);
}
return v636;}
function __into8(v640,v641){
const v642=v640;
const v643=v642.length;
for(let v645=0;v645<v643;v645++){
const v646=v642[v645];
v641[v645]=__ink_count(v646,"popcount",32);
}
return v643;}
const __namedTypes={"Point":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}}],"kind":"record","name":"Point"},"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"be0cf5b23d3450c7db032b3f0dcb6bd1dd8045bcfb62bccf4e985b49a16ed449","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"gl_length","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}}],"kind":"record","name":"Point"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":1,"internal":false,"name":"normalise","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"list"}}],"precondition":null,"result":{"element":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":2,"internal":false,"name":"rounding","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":3,"internal":false,"name":"sine","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":4,"internal":false,"name":"exponential","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":5,"internal":false,"name":"logarithm","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":6,"internal":false,"name":"text_search","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"string"},"kind":"list"}},{"name":"needle","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"element":{"kind":"u32"},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":7,"internal":false,"name":"text_slices","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"string"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"end","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"element":{"kind":"string"},"kind":"option"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":8,"internal":false,"name":"popcounts","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":9,"internal":false,"name":"ink_meab485dda6bf215fd4c96d716b02eb7555d6c19a1e1743b581cfea717a5403db","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":10,"internal":false,"name":"ink_m9d6122ab86034cf8d0f893887c0d4489dba75899a1077f22f6cee4e3b28af847","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":11,"internal":false,"name":"ink_mfaf9950ab6d5a872bf1cf86fb264be3b366ecb9a38a1d50b33513562432a00d4","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":12,"internal":false,"name":"ink_m127e69359c7cd27a895b66757ef67df31d97a8c222e2727863b7e8873909540f","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}},{"name":"lo","type":{"kind":"f32"}},{"name":"hi","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":13,"internal":false,"name":"ink_m6292b5caacb544879ea24e115c739a794d55b6c821c0f3094cbd82099ed4fc81","parallel":false,"params":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":2}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":14,"internal":false,"name":"ink_m9c8fdd99a3648d57203c0dacf72b98c0d5e861a637fd44e4ae6db576108ef1f1","parallel":false,"params":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":3}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":15,"internal":false,"name":"ink_mcb2b8dca9fb075bcbbe5813a993157da0d7f268ccf26c9d78b0c812829994165","parallel":false,"params":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":2}}],"precondition":null,"result":{"element":{"element":{"kind":"f32"},"kind":"vector","size":2},"kind":"option"}},{"destination":null,"index":16,"internal":false,"name":"ink_mc74cfa3f3db25571d894854acfd21970922d99b9aede5dc2a7e006ac12e6735d","parallel":false,"params":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":3}}],"precondition":null,"result":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"option"}},{"destination":null,"index":17,"internal":false,"name":"ink_m9dfacde12de3f6b9660f8f01c3863ef9c95c0154dcce1b608240a72e51918f98","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":18,"internal":false,"name":"ink_me1206f572ff5966e44841351aeaec3c6b9af2ebbdecdec53a3691744bf194456","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":19,"internal":false,"name":"ink_m1de8f3fe21b7705bddefeb679e8eb7b955ecaeae85ef6d8e1d2fd7294c96aaea","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":20,"internal":false,"name":"ink_mac2595216babac275bb556ab0720797b85bb596014b1f340d743ad238cf93106","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":21,"internal":false,"name":"ink_ma1cf907673914aeb49fc9c2fe03bb2cc53dc85a588e7b0118ae6f0c427c1183b","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":22,"internal":false,"name":"ink_m9057259189db5b2370d7869f162447b21cf92ac81ef2a4fed96c0b9ff074614d","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"option"}},{"destination":null,"index":23,"internal":false,"name":"ink_ma7ec436572dc1385c48442b35f8a22ba8b9faec9697a94feca73983e2d62d0ee","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"destination":null,"index":24,"internal":false,"name":"ink_m341c9b2cee322a53e9d9171894f47a5e3eba61f7d3331f6fe46e1b29be1898d4","parallel":false,"params":[{"name":"s","type":{"kind":"string"}}],"precondition":null,"result":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"destination":null,"index":25,"internal":false,"name":"ink_m08d35afce7bef38bc53f976584587748a3c811c53fcb717624fca240428d8a87","parallel":false,"params":[{"name":"a","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"b","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"precondition":null,"result":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"destination":null,"index":26,"internal":false,"name":"ink_m543a295ccf5607a605ace5fe53e763645726fed26ac4470321be1a07f5035cb3","parallel":false,"params":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":27,"internal":false,"name":"ink_m714a3ac269f841a371f34eb202f919be16cf95b54a64c56f6dae93ce14631275","parallel":false,"params":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"precondition":null,"result":{"kind":"string"}},{"destination":null,"index":28,"internal":false,"name":"ink_mad39f3c5b0f825412649fa3c3c021151bf7839c9a1213da2abf668f5769afb4e","parallel":false,"params":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"start","type":{"kind":"u32"}},{"name":"end","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"string"},"kind":"option"}},{"destination":null,"index":29,"internal":false,"name":"ink_m35e94f2244f1c61a4ee89bcb96c25b41f284536647142a95fa5be51986a86ed1","parallel":false,"params":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"needle","type":{"kind":"string"}},{"name":"start","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":30,"internal":false,"name":"ink_mcdd72e2861d9d398afb1df6e8277580470e23b7f42056a14be5c13394aaeb12b","parallel":false,"params":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"at","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},"kind":"option"}}],"named_types":{"Point":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}}],"kind":"record","name":"Point"},"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"exponential":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"1597238de9d400931c4bd6d736d0a5411d7abbfe5ed4a49b76816e57e264e214","named":{},"root":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}}},"gl_length":{"arguments":{"format":"ink-value-wire-v1","identity":"517af936fb6d952aca7aa7d0c551cbfeef3a83ce34174179691c0b620acc9bc3","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}}],"kind":"record","name":"Point"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"ink_m08d35afce7bef38bc53f976584587748a3c811c53fcb717624fca240428d8a87":{"arguments":{"format":"ink-value-wire-v1","identity":"424505f5dba1b6ee5793fe85222b26942dc2e28ddd20df2e8764e36747d7b815","named":{},"root":{"fields":[{"name":"a","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"b","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e1d4d7c58bbd1ca3f3c39fcf765160bc19953ba6ce1483e68e527b71c2647c32","named":{},"root":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}},"ink_m127e69359c7cd27a895b66757ef67df31d97a8c222e2727863b7e8873909540f":{"arguments":{"format":"ink-value-wire-v1","identity":"0a9544b495c8c6aa0c2147161293e41ab2be48428ea4deb17805651c28753939","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"lo","type":{"kind":"f32"}},{"name":"hi","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1de8f3fe21b7705bddefeb679e8eb7b955ecaeae85ef6d8e1d2fd7294c96aaea":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_m341c9b2cee322a53e9d9171894f47a5e3eba61f7d3331f6fe46e1b29be1898d4":{"arguments":{"format":"ink-value-wire-v1","identity":"43c7d39d28f9f34c6101b156917972ccb2af4901881013363490ab274999eb7f","named":{},"root":{"fields":[{"name":"s","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e1d4d7c58bbd1ca3f3c39fcf765160bc19953ba6ce1483e68e527b71c2647c32","named":{},"root":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}},"ink_m35e94f2244f1c61a4ee89bcb96c25b41f284536647142a95fa5be51986a86ed1":{"arguments":{"format":"ink-value-wire-v1","identity":"938838600504f2d12905d61a96cc13384cd370a320101b2feffa64d26f0722d8","named":{},"root":{"fields":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"needle","type":{"kind":"string"}},{"name":"start","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m543a295ccf5607a605ace5fe53e763645726fed26ac4470321be1a07f5035cb3":{"arguments":{"format":"ink-value-wire-v1","identity":"b5b40b5e5fe207f3ce16522ca7301ccb6a9eb7b5387cc55680339014c2083a4a","named":{},"root":{"fields":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m6292b5caacb544879ea24e115c739a794d55b6c821c0f3094cbd82099ed4fc81":{"arguments":{"format":"ink-value-wire-v1","identity":"8f0b83a4d07c148387dbfee13a3b991911fa5a6cfed6e4f1cc7f077c85da09eb","named":{},"root":{"fields":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":2}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m714a3ac269f841a371f34eb202f919be16cf95b54a64c56f6dae93ce14631275":{"arguments":{"format":"ink-value-wire-v1","identity":"b5b40b5e5fe207f3ce16522ca7301ccb6a9eb7b5387cc55680339014c2083a4a","named":{},"root":{"fields":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"1cdb97f14e69255770652db593f88ce0009f937c28d02381f37b2c643dc1470e","named":{},"root":{"kind":"string"}}},"ink_m9057259189db5b2370d7869f162447b21cf92ac81ef2a4fed96c0b9ff074614d":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_m9c8fdd99a3648d57203c0dacf72b98c0d5e861a637fd44e4ae6db576108ef1f1":{"arguments":{"format":"ink-value-wire-v1","identity":"ec73d937d06d046cd2e340b3ca1543fc4739ab75a27c82a531048a27a7521af6","named":{},"root":{"fields":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":3}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m9d6122ab86034cf8d0f893887c0d4489dba75899a1077f22f6cee4e3b28af847":{"arguments":{"format":"ink-value-wire-v1","identity":"39be0df26c39a9ee25e63705fdfe40f7dd1b768ef4da2b76705ce577d483e7b0","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m9dfacde12de3f6b9660f8f01c3863ef9c95c0154dcce1b608240a72e51918f98":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_ma1cf907673914aeb49fc9c2fe03bb2cc53dc85a588e7b0118ae6f0c427c1183b":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_ma7ec436572dc1385c48442b35f8a22ba8b9faec9697a94feca73983e2d62d0ee":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e1d4d7c58bbd1ca3f3c39fcf765160bc19953ba6ce1483e68e527b71c2647c32","named":{},"root":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}}},"ink_mac2595216babac275bb556ab0720797b85bb596014b1f340d743ad238cf93106":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_mad39f3c5b0f825412649fa3c3c021151bf7839c9a1213da2abf668f5769afb4e":{"arguments":{"format":"ink-value-wire-v1","identity":"6495513849290c736b2a855cfc9c7b2cbdbf8b7dc51bb1ed14d2da72d0421f27","named":{},"root":{"fields":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"start","type":{"kind":"u32"}},{"name":"end","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e6ec2005c4843453596f9f4142340982753d0b37b69b33e8d21e40b51b08bc43","named":{},"root":{"element":{"kind":"string"},"kind":"option"}}},"ink_mc74cfa3f3db25571d894854acfd21970922d99b9aede5dc2a7e006ac12e6735d":{"arguments":{"format":"ink-value-wire-v1","identity":"ec73d937d06d046cd2e340b3ca1543fc4739ab75a27c82a531048a27a7521af6","named":{},"root":{"fields":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":3}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"290a0fd1980aff3287323af810098a93b090b0b0c4289e4e20a889abca0cf569","named":{},"root":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"option"}}},"ink_mcb2b8dca9fb075bcbbe5813a993157da0d7f268ccf26c9d78b0c812829994165":{"arguments":{"format":"ink-value-wire-v1","identity":"8f0b83a4d07c148387dbfee13a3b991911fa5a6cfed6e4f1cc7f077c85da09eb","named":{},"root":{"fields":[{"name":"v","type":{"element":{"kind":"f32"},"kind":"vector","size":2}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"812a35579877bc34e4f38da52a14598845e601fe45857b93d9b50e9db7eb8af2","named":{},"root":{"element":{"element":{"kind":"f32"},"kind":"vector","size":2},"kind":"option"}}},"ink_mcdd72e2861d9d398afb1df6e8277580470e23b7f42056a14be5c13394aaeb12b":{"arguments":{"format":"ink-value-wire-v1","identity":"0aa422a244ee9854ebf63a163c0b2456ddc368fde08437bd27481b1f1ee20d08","named":{},"root":{"fields":[{"name":"t","type":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}},{"name":"at","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"c70a19f6a672da3c7dc4c46434c318caeec699bb85e1e9e81ecb01aa617b97ed","named":{},"root":{"element":{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},"kind":"option"}}},"ink_me1206f572ff5966e44841351aeaec3c6b9af2ebbdecdec53a3691744bf194456":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7760d77e249d4e0c353424402e0aff333173b7212a663c48a1382e11c95ff9e7","named":{},"root":{"element":{"kind":"f32"},"kind":"option"}}},"ink_meab485dda6bf215fd4c96d716b02eb7555d6c19a1e1743b581cfea717a5403db":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_mfaf9950ab6d5a872bf1cf86fb264be3b366ecb9a38a1d50b33513562432a00d4":{"arguments":{"format":"ink-value-wire-v1","identity":"39be0df26c39a9ee25e63705fdfe40f7dd1b768ef4da2b76705ce577d483e7b0","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"logarithm":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"1597238de9d400931c4bd6d736d0a5411d7abbfe5ed4a49b76816e57e264e214","named":{},"root":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}}},"normalise":{"arguments":{"format":"ink-value-wire-v1","identity":"704e143efb762a104284efe7c71a85f9fd48d9be2f9308ce70e320998f949c58","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fdb34ef1afb571ebbe1f957058053e408732b00cef010bb89038b1b4ee90aa8c","named":{},"root":{"element":{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"option"},"kind":"list"}}},"popcounts":{"arguments":{"format":"ink-value-wire-v1","identity":"40c474b26407b61251cf7479f9144e6f4df9a1f1b14620d3209a5615b8fa85a4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"rounding":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"sine":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"1597238de9d400931c4bd6d736d0a5411d7abbfe5ed4a49b76816e57e264e214","named":{},"root":{"element":{"element":{"kind":"f32"},"kind":"option"},"kind":"list"}}},"text_search":{"arguments":{"format":"ink-value-wire-v1","identity":"7a6d08f93c616b32a97170e71f59ddd0b76eca559e55893286accb1a5e5690ae","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"string"},"kind":"list"}},{"name":"needle","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"49858212e041452d059a997d6d7fcc4050234daabe4779afc2ff4145b85d7fb6","named":{},"root":{"element":{"element":{"kind":"u32"},"kind":"option"},"kind":"list"}}},"text_slices":{"arguments":{"format":"ink-value-wire-v1","identity":"4ccca64cd1e2a805b1c0123958f6a1bfe8ba7037ff8d59e522e3056a617d5831","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"string"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"end","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4293b0f6dcebd68255b87ce1a19b885ed990be276c77e9cb9e501d26a8d9e2f5","named":{},"root":{"element":{"element":{"kind":"string"},"kind":"option"},"kind":"list"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18,__fn19,__fn20,__fn21,__fn22,__fn23,__fn24,__fn25,__fn26,__fn27,__fn28,__fn29,__fn30];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[false],"types":[{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}}],"kind":"record","name":"Point"},"kind":"list"}]},{"capture":[true],"types":[{"element":{"element":{"kind":"f32"},"kind":"vector","size":3},"kind":"list"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"string"},"kind":"list"},{"kind":"string"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"string"},"kind":"list"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true],"types":[{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"kind":"f32"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"vector","size":2}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"vector","size":3}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"vector","size":2}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"vector","size":3}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[],"types":[]},{"capture":[true],"types":[{"kind":"string"}]},{"capture":[false,false],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}]},{"capture":[false],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}]},{"capture":[false],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},{"kind":"string"},{"kind":"u32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"chunks","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"ink_m475e1940bf4f164f3b01e9e9ebcb1018d5a49b1f2ce01f0c80645fd3fd326f24"},{"kind":"u32"},{"kind":"string"}]}];

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
const __intoOutput0=__representation(metadata.functions[0].result.element,true);
const __intoOutput1=__representation(metadata.functions[1].result.element,true);
const __intoOutput2=__representation(metadata.functions[2].result.element,true);
const __intoOutput3=__representation(metadata.functions[3].result.element,true);
const __intoOutput4=__representation(metadata.functions[4].result.element,true);
const __intoOutput5=__representation(metadata.functions[5].result.element,true);
const __intoImplementations=[__into0,__into1,__into2,__into3,__into4,__into5,__into6,__into7,__into8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

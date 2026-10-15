const __recordElisions=new Set([]);
const __nativeF32=true;
// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
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
const v9=v6;
const v10=v7;
const v11=v8;
return __fn13(v9,v10,v11);}
function __fn2(v12,v13,v14,v15){
const v16=v12;
const v17=v13;
const v18=v14;
const v19=v15;
return __fn14(v16,v17,v18,v19);}
function __fn3(v20,v21,v22,v23){
const v24=v20;
const v25=v24["valid"];
const v26=false;
const v27=(v25===v26);
let v28=v27;if(!v28){
const v29=v20;
const v30=v29["parameters"];
const v31=v23;
v28=((v30) > (v31));}
const v32=v28;
let v33=v32;if(!v33){
const v34=v20;
const v35=v34["nodes"];
const v36=v23;
v33=((v35) > (v36));}
const v37=v33;
let v38=v37;if(!v38){
const v39=v20;
const v40=v39["width"];
const v41=v23;
v38=((v40) > (v41));}
const v42=v38;
let v43=v42;if(!v43){
const v44=v21;
const v45=v23;
v43=((v44) > (v45));}
let v46;if(v43){
const v47=false;
const v48=v20;
const v49=v48["parameters"];
const v50=v20;
const v51=v50["nodes"];
const v52=v20;
const v53=v52["width"];
const v54=v47;
v46=({["parameters"]:v49,["nodes"]:v51,["width"]:v53,["valid"]:v54});}else{
let v55;if(v22){
v55=2;}else{
v55=1;}
const v56=v55;
const v57=v20;
const v58=v57["width"];
const v59=1;
const v60=(((v58) + (v59)) >>> 0);
const v61=v56;
const v62=(Math.imul(v60,v61) >>> 0);
const v63=v20;
const v64=v63["width"];
const v65=v56;
const v66=(Math.imul(v64,v65) >>> 0);
const v67=1;
const v68=(((v66) + (v67)) >>> 0);
const v69=v21;
const v70=v23;
const v71=v20;
const v72=v71["parameters"];
const v73=(((v70) - (v72)) >>> 0);
const v74=v62;
let v75;if(v74===0 ){
v75=0;}else{
v75=(Math.trunc(v73/v74)+0);}
const v76=v75;
const v77=((v69) <= (v76));
let v78=v77;if(v78){
const v79=v68;
const v80=0;
const v81=(v79===v80);
let v82=v81;if(!v82){
const v83=v21;
const v84=v23;
const v85=v20;
const v86=v85["nodes"];
const v87=(((v84) - (v86)) >>> 0);
const v88=v68;
let v89;if(v88===0 ){
v89=0;}else{
v89=(Math.trunc(v87/v88)+0);}
const v90=v89;
v82=((v83) <= (v90));}
v78=v82;}
const v91=v78;
let v92;if(v91){
const v93=v20;
const v94=v93["parameters"];
const v95=v62;
const v96=v21;
const v97=(Math.imul(v95,v96) >>> 0);
const v98=(((v94) + (v97)) >>> 0);
const v99=v20;
const v100=v99["nodes"];
const v101=v68;
const v102=v21;
const v103=(Math.imul(v101,v102) >>> 0);
const v104=(((v100) + (v103)) >>> 0);
const v105=v21;
const v106=true;
v92=({["parameters"]:v98,["nodes"]:v104,["width"]:v105,["valid"]:v106});}else{
const v107=false;
const v108=v20;
const v109=v108["parameters"];
const v110=v20;
const v111=v110["nodes"];
const v112=v20;
const v113=v112["width"];
const v114=v107;
v92=({["parameters"]:v109,["nodes"]:v111,["width"]:v113,["valid"]:v114});}
v46=v92;}
return v46;}
function __fn4(v115,v116,v117,v118){
const v119=v118;
const v120=(v116).length;
const v121=(((v119) + (v120)) >>> 0);
const v122=v115;
const v123=v121;
const v124=__nfFromBits(1065353216);
const v125=({["wire"]:v123,["coefficient"]:v124});
const v126=new __InkBuffer(Array.from([v125]));
const v127=v118;
const v128=v116;
const v129=v122;
const v130=v127;
const v131=v126;
let v132=({["nodes"]:v129,["parameter"]:v130,["terms"]:v131});
for(let v133=0;v133<v128.length;v133++){
const v134=(v128[v133]>>>0);
const v135=v132;
const v136=v135["nodes"];
const v137=v132;
const v138=v137["parameter"];
const v139=v132;
const v140=v139["terms"];
const v141=v117;
const v142=v136;
const v143=(v142).length;
const v144=(((v141) + (v143)) >>> 0);
const v145=v136;
const v146=v138;
const v147=v134;
const v148=__fn21(v146,v147);
const v149=__tempEdit(v145,"push",v148);
const v150=v140;
const v151=v144;
const v152=__nfFromBits(1065353216);
const v153=({["wire"]:v151,["coefficient"]:v152});
const v154=__tempEdit(v150,"push",v153);
const v155=v138;
const v156=1;
const v157=(((v155) + (v156)) >>> 0);
const v158=v149;
const v159=v157;
const v160=v154;
v132=({["nodes"]:v158,["parameter"]:v159,["terms"]:v160});
}
const v161=v132;
const v162=v161;
const v163=v162["nodes"];
const v164=v161;
const v165=v164["parameter"];
const v166=v161;
const v167=v166["terms"];
const v168=v163;
const v169=v167;
const v170=v169.freeze();
const v171=v121;
const v172=1;
const v173=(((v171) + (v172)) >>> 0);
return ({["nodes"]:v168,["terms"]:v170,["parameter"]:v173});}
function __fn5(v174,v175){
const v176=v174;
const v177=v176["nodes"];
const v178=v175;
const v179=v174;
const v180=v179["inputs"];
const v181=v174;
const v182=v181["parameter"];
const v183=__fn4(v177,v178,v180,v182);
const v184=v183;
const v185=v184["nodes"];
const v186=v175;
const v187=v174;
const v188=v187["inputs"];
const v189=v183;
const v190=v189["parameter"];
const v191=__fn4(v185,v186,v188,v190);
const v192=v174;
const v193=v192["inputs"];
const v194=v191;
const v195=v194["nodes"];
const v196=(v195).length;
const v197=(((v193) + (v196)) >>> 0);
const v198=v191;
const v199=v198["nodes"];
const v200=v183;
const v201=v200["terms"];
const v202=__nfFromBits(0);
const v203=v191;
const v204=v203["terms"];
const v205=__nfFromBits(0);
const v206=__fn28(v201,v202,v204,v205);
const v207=__tempEdit(v199,"push",v206);
const v208=v207;
const v209=v174;
const v210=v209["outputs"];
const v211=v197;
const v212=__tempEdit(v210,"push",v211);
const v213=v191;
const v214=v213["parameter"];
const v215=v174;
const v216=v215["inputs"];
return ({["nodes"]:v208,["outputs"]:v212,["parameter"]:v214,["inputs"]:v216});}
function __fn6(v217,v218){
const v219=v217;
const v220=v219["nodes"];
const v221=v218;
const v222=v217;
const v223=v222["inputs"];
const v224=v217;
const v225=v224["parameter"];
const v226=__fn4(v220,v221,v223,v225);
const v227=v217;
const v228=v227["inputs"];
const v229=v226;
const v230=v229["nodes"];
const v231=(v230).length;
const v232=(((v228) + (v231)) >>> 0);
const v233=v226;
const v234=v233["nodes"];
const v235=v226;
const v236=v235["terms"];
const v237=__nfFromBits(0);
const v238=__fn27(v236,v237);
const v239=__tempEdit(v234,"push",v238);
const v240=v239;
const v241=v217;
const v242=v241["outputs"];
const v243=v232;
const v244=__tempEdit(v242,"push",v243);
const v245=v226;
const v246=v245["parameter"];
const v247=v217;
const v248=v247["inputs"];
return ({["nodes"]:v240,["outputs"]:v244,["parameter"]:v246,["inputs"]:v248});}
function __fn7(v249,v250,v251){
const v252=v250;
let v253=v249;
for(let v254=0;v254<v252;v254++){
if(false){break;}
const v255=(v254>>>0);
const v256=v253;
const v257=v251;
v253=__fn5(v256,v257);}
return v253;}
function __fn8(v258,v259,v260){
const v261=v259;
let v262=v258;
for(let v263=0;v263<v261;v263++){
if(false){break;}
const v264=(v263>>>0);
const v265=v262;
const v266=v260;
v262=__fn6(v265,v266);}
return v262;}
function __fn9(v267,v268,v269,v270){
const v271=v270;
const v272=1000000;
const v273=((v271) > (v272));
let v274=v273;if(!v274){
const v275=v267;
const v276=v270;
v274=((v275) > (v276));}
let v277;if(v274){
v277=({Err:"network capacity"});}else{
const v278=0;
const v279=0;
const v280=v267;
const v281=true;
const v283=v268;
const v284=({["parameters"]:v278,["nodes"]:v279,["width"]:v280,["valid"]:v281});
let v285=({["shape"]:v284});
for(let v286=0;v286<v283.length;v286++){
const v287=(v283[v286]>>>0);
const v288=v285;
const v289=v288["shape"];
const v290=v289;
const v291=v287;
const v292=true;
const v293=v270;
const v294=__fn3(v290,v291,v292,v293);
const v295=v294;
v285=({["shape"]:v295});
}
const v296=v285;
const v297=v296;
const v298=v297["shape"];
const v299=v298;
const v300=v269;
const v301=false;
const v302=v270;
const v303=__fn3(v299,v300,v301,v302);
const v304=v303;
const v305=v304["valid"];
const v306=false;
const v307=(v305===v306);
let v308=v307;if(!v308){
const v309=v267;
const v310=v270;
const v311=v303;
const v312=v311["parameters"];
const v313=(((v310) - (v312)) >>> 0);
v308=((v309) > (v313));}
const v314=v308;
let v315=v314;if(!v315){
const v316=v303;
const v317=v316["nodes"];
const v318=v270;
const v319=v303;
const v320=v319["parameters"];
const v321=(((v318) - (v320)) >>> 0);
const v322=v267;
const v323=(((v321) - (v322)) >>> 0);
v315=((v317) > (v323));}
let v324;if(v315){
v324=({Err:"network capacity"});}else{
const v325=v303;
const v326=v325["parameters"];
const v327=v267;
const v328=(((v326) + (v327)) >>> 0);
const v329=new __InkBuffer([]);
const v330=v267;
let v331=v329;
for(let v332=0;v332<v330;v332++){
if(false){break;}
const v333=(v332>>>0);
const v334=v331;
const v335=v303;
const v336=v335["parameters"];
const v337=v333;
const v338=(((v336) + (v337)) >>> 0);
v331=__tempEdit(v334,"push",v338);}
const v339=v331;
const v340=v339.freeze();
const v341=v340;
const v342=new __InkBuffer([]);
const v343=new __InkBuffer([]);
const v344=0;
const v345=v328;
const v346=({["nodes"]:v342,["outputs"]:v343,["parameter"]:v344,["inputs"]:v345});
const v347=v268;
const v348=v346;
const v349=v341;
let v350=({["layer"]:v348,["wires"]:v349});
for(let v351=0;v351<v347.length;v351++){
const v352=(v347[v351]>>>0);
const v353=v350;
const v354=v353["layer"];
const v355=v350;
const v356=v355["wires"];
const v357=v354;
const v358=v352;
const v359=v356;
const v360=__fn7(v357,v358,v359);
const v361=v360;
const v362=v361["outputs"];
const v363=v362.freeze();
const v364=v360;
const v365=v364["nodes"];
const v366=new __InkBuffer([]);
const v367=v360;
const v368=v367["parameter"];
const v369=v328;
const v370=({["nodes"]:v365,["outputs"]:v366,["parameter"]:v368,["inputs"]:v369});
const v371=v370;
const v372=v363;
v350=({["layer"]:v371,["wires"]:v372});
}
const v373=v350;
const v374=v373;
const v375=v374["layer"];
const v376=v373;
const v377=v376["wires"];
const v378=v375;
const v379=v269;
const v380=v377;
const v381=__fn8(v378,v379,v380);
const v382=v381;
const v383=v382["nodes"];
const v384=v383.freeze();
const v385=v381;
const v386=v385["outputs"];
const v387=v386.freeze();
const v388=v381;
const v389=v388["parameter"];
const v390=v303;
const v391=v390["parameters"];
let v392;if(!(v389===v391)){
v392=({Err:"network parameter layout"});}else{
const v393=v328;
const v394=v384;
const v395=v387;
const v396=v270;
const v397=__fn39(v393,v394,v395,v396);
let v398;if(Object.hasOwn(v397,"Ok")){
const v399=v397["Ok"];
const v400=v399;
const v401=v400;
const v402=v303;
const v403=v402["parameters"];
const v404=v267;
const v405=v269;
v398=({Ok:({["graph"]:v401,["parameters"]:v403,["features"]:v404,["outputs"]:v405})});}else{
const v406=v397["Err"];
v398=({Err:v406});}
v392=v398;}
v324=v392;}
v277=v324;}
return v277;}
function __fn10(v407){
const v408=v407;
return v408["parameters"];}
function __fn11(v409){
const v410=v409;
return v410["features"];}
function __fn12(v411){
const v412=v411;
const v413=v412["graph"];
return __fn40(v413);}
function __fn13(v414,v415,v416){
const v417=(v415).length;
const v418=v414;
const v419=v418["parameters"];
const v420=!(v417===v419);
let v421=v420;if(!v421){
const v422=(v416).length;
const v423=v414;
const v424=v423["features"];
v421=!(v422===v424);}
let v425;if(v421){
v425=({Err:"network input shape"});}else{
const v426=v414;
const v427=v426["graph"];
const v428=v415;
const v429=v416;
const v430=v428.length;
const v431=v429.length;
const v432=new Array(v430+v431);
for(let v433=0;v433<v430;v433++){v432[v433]=v428[v433];}
for(let v434=0;v434<v431;v434++){v432[v430+v434]=v429[v434];}
const v435=v432;
v425=__fn53(v427,v435);}
return v425;}
function __fn14(v436,v437,v438,v439){
const v440=(v437).length;
const v441=v436;
const v442=v441["parameters"];
const v443=!(v440===v442);
let v444=v443;if(!v444){
const v445=(v438).length;
const v446=v436;
const v447=v446["features"];
v444=!(v445===v447);}
let v448;if(v444){
v448=({Err:"network input shape"});}else{
const v449=v436;
const v450=v449["graph"];
const v451=v437;
const v452=v438;
const v453=v451.length;
const v454=v452.length;
const v455=new Array(v453+v454);
for(let v456=0;v456<v453;v456++){v455[v456]=v451[v456];}
for(let v457=0;v457<v454;v457++){v455[v453+v457]=v452[v457];}
const v458=v455;
const v459=v439;
const v460=__fn33();
const v461=__fn66(v450,v458,v459,v460);
let v462;if(Object.hasOwn(v461,"Ok")){
const v463=v461["Ok"];
const v464=v463;
const v465=v464;
const v466=__nfValue(v465["loss"]);
const v467=v464;
const v468=v467["outputs"];
const v469=v464;
const v470=v469["gradient"];
const v471=v436;
const v472=v470.slice(0,v471["parameters"]);
v462=({Ok:({["loss"]:v466,["outputs"]:v468,["gradient"]:v472})});}else{
const v473=v461["Err"];
v462=({Err:v473});}
v448=v462;}
return v448;}
function __fn15(v474,v475,v476){
const v477=v474;
const v478="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v479="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v480=v475;
const v481=v476;
const v482=0;
const v483=__nfFromBits(0);
const v484=[];
const v485=[];
const v486=__nfFromBits(0);
const v487=[];
const v488=false;
const v489=false;
return ({["kind"]:v477,["binary"]:v478,["unary"]:v479,["a"]:v480,["b"]:v481,["c"]:v482,["value"]:v483,["terms"]:v484,["gates"]:v485,["gate_bias"]:v486,["table"]:v487,["below"]:v488,["above"]:v489});}
function __fn16(v490){
const v491="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v492=0;
const v493=0;
const v494=__fn15(v491,v492,v493);
const v495=__nfValue(v490);
const v496=v494;
const v497=v496["kind"];
const v498=v494;
const v499=v498["binary"];
const v500=v494;
const v501=v500["unary"];
const v502=v494;
const v503=v502["a"];
const v504=v494;
const v505=v504["b"];
const v506=v494;
const v507=v506["c"];
const v508=__nfValue(v495);
const v509=v494;
const v510=v509["terms"];
const v511=v494;
const v512=v511["gates"];
const v513=v494;
const v514=__nfValue(v513["gate_bias"]);
const v515=v494;
const v516=v515["table"];
const v517=v494;
const v518=v517["below"];
const v519=v494;
const v520=v519["above"];
return ({["kind"]:v497,["binary"]:v499,["unary"]:v501,["a"]:v503,["b"]:v505,["c"]:v507,["value"]:v508,["terms"]:v510,["gates"]:v512,["gate_bias"]:v514,["table"]:v516,["below"]:v518,["above"]:v520});}
function __fn17(v521,v522,v523){
const v524="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v525=v522;
const v526=v523;
const v527=__fn15(v524,v525,v526);
const v528=v521;
const v529=v527;
const v530=v529["kind"];
const v531=v528;
const v532=v527;
const v533=v532["unary"];
const v534=v527;
const v535=v534["a"];
const v536=v527;
const v537=v536["b"];
const v538=v527;
const v539=v538["c"];
const v540=v527;
const v541=__nfValue(v540["value"]);
const v542=v527;
const v543=v542["terms"];
const v544=v527;
const v545=v544["gates"];
const v546=v527;
const v547=__nfValue(v546["gate_bias"]);
const v548=v527;
const v549=v548["table"];
const v550=v527;
const v551=v550["below"];
const v552=v527;
const v553=v552["above"];
return ({["kind"]:v530,["binary"]:v531,["unary"]:v533,["a"]:v535,["b"]:v537,["c"]:v539,["value"]:v541,["terms"]:v543,["gates"]:v545,["gate_bias"]:v547,["table"]:v549,["below"]:v551,["above"]:v553});}
function __fn18(v554,v555){
const v556="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v557=v555;
const v558=0;
const v559=__fn15(v556,v557,v558);
const v560=v554;
const v561=v559;
const v562=v561["kind"];
const v563=v559;
const v564=v563["binary"];
const v565=v560;
const v566=v559;
const v567=v566["a"];
const v568=v559;
const v569=v568["b"];
const v570=v559;
const v571=v570["c"];
const v572=v559;
const v573=__nfValue(v572["value"]);
const v574=v559;
const v575=v574["terms"];
const v576=v559;
const v577=v576["gates"];
const v578=v559;
const v579=__nfValue(v578["gate_bias"]);
const v580=v559;
const v581=v580["table"];
const v582=v559;
const v583=v582["below"];
const v584=v559;
const v585=v584["above"];
return ({["kind"]:v562,["binary"]:v564,["unary"]:v565,["a"]:v567,["b"]:v569,["c"]:v571,["value"]:v573,["terms"]:v575,["gates"]:v577,["gate_bias"]:v579,["table"]:v581,["below"]:v583,["above"]:v585});}
function __fn19(v586,v587){
const v588="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v589=v586;
const v590=v587;
return __fn17(v588,v589,v590);}
function __fn20(v591,v592){
const v593="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v594=v591;
const v595=v592;
return __fn17(v593,v594,v595);}
function __fn21(v596,v597){
const v598="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v599=v596;
const v600=v597;
return __fn17(v598,v599,v600);}
function __fn22(v601,v602){
const v603="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
const v604=v601;
const v605=v602;
return __fn17(v603,v604,v605);}
function __fn23(v606){
const v607="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v608=v606;
return __fn18(v607,v608);}
function __fn24(v609){
const v610="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v611=v609;
return __fn18(v610,v611);}
function __fn25(v612){
const v613="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v614=v612;
return __fn18(v613,v614);}
function __fn26(v615){
const v616="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
const v617=v615;
return __fn18(v616,v617);}
function __fn27(v618,v619){
const v620="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v621=0;
const v622=0;
const v623=__fn15(v620,v621,v622);
const v624=v618;
const v625=__nfValue(v619);
const v626=v623;
const v627=v626["kind"];
const v628=v623;
const v629=v628["binary"];
const v630=v623;
const v631=v630["unary"];
const v632=v623;
const v633=v632["a"];
const v634=v623;
const v635=v634["b"];
const v636=v623;
const v637=v636["c"];
const v638=__nfValue(v625);
const v639=v624;
const v640=v623;
const v641=v640["gates"];
const v642=v623;
const v643=__nfValue(v642["gate_bias"]);
const v644=v623;
const v645=v644["table"];
const v646=v623;
const v647=v646["below"];
const v648=v623;
const v649=v648["above"];
return ({["kind"]:v627,["binary"]:v629,["unary"]:v631,["a"]:v633,["b"]:v635,["c"]:v637,["value"]:v638,["terms"]:v639,["gates"]:v641,["gate_bias"]:v643,["table"]:v645,["below"]:v647,["above"]:v649});}
function __fn28(v650,v651,v652,v653){
const v654="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v655=0;
const v656=0;
const v657=__fn15(v654,v655,v656);
const v658=v650;
const v659=__nfValue(v651);
const v660=v652;
const v661=__nfValue(v653);
const v662=v657;
const v663=v662["kind"];
const v664=v657;
const v665=v664["binary"];
const v666=v657;
const v667=v666["unary"];
const v668=v657;
const v669=v668["a"];
const v670=v657;
const v671=v670["b"];
const v672=v657;
const v673=v672["c"];
const v674=__nfValue(v659);
const v675=v658;
const v676=v660;
const v677=__nfValue(v661);
const v678=v657;
const v679=v678["table"];
const v680=v657;
const v681=v680["below"];
const v682=v657;
const v683=v682["above"];
return ({["kind"]:v663,["binary"]:v665,["unary"]:v667,["a"]:v669,["b"]:v671,["c"]:v673,["value"]:v674,["terms"]:v675,["gates"]:v676,["gate_bias"]:v677,["table"]:v679,["below"]:v681,["above"]:v683});}
function __fn29(v684,v685,v686){
const v687="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v688=v684;
const v689=v685;
const v690=__fn15(v687,v688,v689);
const v691=v686;
const v692=v690;
const v693=v692["kind"];
const v694=v690;
const v695=v694["binary"];
const v696=v690;
const v697=v696["unary"];
const v698=v690;
const v699=v698["a"];
const v700=v690;
const v701=v700["b"];
const v702=v691;
const v703=v690;
const v704=__nfValue(v703["value"]);
const v705=v690;
const v706=v705["terms"];
const v707=v690;
const v708=v707["gates"];
const v709=v690;
const v710=__nfValue(v709["gate_bias"]);
const v711=v690;
const v712=v711["table"];
const v713=v690;
const v714=v713["below"];
const v715=v690;
const v716=v715["above"];
return ({["kind"]:v693,["binary"]:v695,["unary"]:v697,["a"]:v699,["b"]:v701,["c"]:v702,["value"]:v704,["terms"]:v706,["gates"]:v708,["gate_bias"]:v710,["table"]:v712,["below"]:v714,["above"]:v716});}
function __fn30(v717,v718,v719,v720){
const v721="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v722=v717;
const v723=0;
const v724=__fn15(v721,v722,v723);
const v725=v718;
const v726=v719;
const v727=v720;
const v728=v724;
const v729=v728["kind"];
const v730=v724;
const v731=v730["binary"];
const v732=v724;
const v733=v732["unary"];
const v734=v724;
const v735=v734["a"];
const v736=v724;
const v737=v736["b"];
const v738=v724;
const v739=v738["c"];
const v740=v724;
const v741=__nfValue(v740["value"]);
const v742=v724;
const v743=v742["terms"];
const v744=v724;
const v745=v744["gates"];
const v746=v724;
const v747=__nfValue(v746["gate_bias"]);
const v748=v725;
const v749=v726;
const v750=v727;
return ({["kind"]:v729,["binary"]:v731,["unary"]:v733,["a"]:v735,["b"]:v737,["c"]:v739,["value"]:v741,["terms"]:v743,["gates"]:v745,["gate_bias"]:v747,["table"]:v748,["below"]:v749,["above"]:v750});}
function __fn31(){
const v751=false;
const v752="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
const v753="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
const v754="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v751,["boolean"]:v752,["index"]:v753,["zero"]:v754});}
function __fn32(){
const v755=true;
const v756="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v757="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v758="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v755,["boolean"]:v756,["index"]:v757,["zero"]:v758});}
function __fn33(){
const v759=true;
const v760="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v761="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v762="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
return ({["piecewise"]:v759,["boolean"]:v760,["index"]:v761,["zero"]:v762});}
function __fn34(v763){
const v764=v763;
const v765=v764["kind"];
const v766=v765;
const v767="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v768;if((v766===v767)){
v768=[];}else{
const v769=v765;
const v770="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v771;if((v769===v770)){
const v772=v763;
const v773=v772["a"];
const v774=v763;
const v775=v774["b"];
v771=[v773,v775];}else{
const v776=v765;
const v777="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v778;if((v776===v777)){
const v779=v763;
const v780=v779["a"];
v778=[v780];}else{
const v781=v765;
const v782="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v783;if((v781===v782)){
const v784=v763;
const v785=v784["terms"];
const v786=v785.length;
const v787=new Array(v786);
for(let v788=0;v788<v786;v788++){
const v789=v785[v788];
const v790=v789;
v787[v788]=v790["wire"];
}
v783=v787;}else{
const v791=v765;
const v792="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v793;if((v791===v792)){
const v794=v763;
const v795=v794["terms"];
const v796=v795.length;
const v797=new Array(v796);
for(let v798=0;v798<v796;v798++){
const v799=v795[v798];
const v800=v799;
v797[v798]=v800["wire"];
}
const v801=v797;
const v802=v763;
const v803=v802["gates"];
const v804=v803.length;
const v805=new Array(v804);
for(let v806=0;v806<v804;v806++){
const v807=v803[v806];
const v808=v807;
v805[v806]=v808["wire"];
}
const v809=v805;
const v810=v801.length;
const v811=v809.length;
const v812=new Array(v810+v811);
for(let v813=0;v813<v810;v813++){v812[v813]=v801[v813];}
for(let v814=0;v814<v811;v814++){v812[v810+v814]=v809[v814];}
v793=v812;}else{
const v815=v765;
const v816="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v817;if((v815===v816)){
const v818=v763;
const v819=v818["a"];
const v820=v763;
const v821=v820["b"];
const v822=v763;
const v823=v822["c"];
v817=[v819,v821,v823];}else{
const v824=v763;
const v825=v824["a"];
const v826=[v825];
const v827=v763;
const v828=v827["table"];
const v829=v826.length;
const v830=v828.length;
const v831=new Array(v829+v830);
for(let v832=0;v832<v829;v832++){v831[v832]=v826[v832];}
for(let v833=0;v833<v830;v833++){v831[v829+v833]=v828[v833];}
v817=v831;}
v793=v817;}
v783=v793;}
v778=v783;}
v771=v778;}
v768=v771;}
return v768;}
function __fn35(v834,v835){
const v836=v834;
const v837=v836["kind"];
const v838=v837;
const v839="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v840;if((v838===v839)){
v840=v834;}else{
const v841=v837;
const v842="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v843;if((v841===v842)){
const v844=v835;
const v845=v834;
const v846=v845["a"];
let v847;if(v846<v844.length){v847=v844[v846];}else{
v847=0;}
const v848=v847;
const v849=v835;
const v850=v834;
const v851=v850["b"];
let v852;if(v851<v849.length){v852=v849[v851];}else{
v852=0;}
const v853=v852;
const v854=v834;
const v855=v854["kind"];
const v856=v834;
const v857=v856["binary"];
const v858=v834;
const v859=v858["unary"];
const v860=v848;
const v861=v853;
const v862=v834;
const v863=v862["c"];
const v864=v834;
const v865=__nfValue(v864["value"]);
const v866=v834;
const v867=v866["terms"];
const v868=v834;
const v869=v868["gates"];
const v870=v834;
const v871=__nfValue(v870["gate_bias"]);
const v872=v834;
const v873=v872["table"];
const v874=v834;
const v875=v874["below"];
const v876=v834;
const v877=v876["above"];
v843=({["kind"]:v855,["binary"]:v857,["unary"]:v859,["a"]:v860,["b"]:v861,["c"]:v863,["value"]:v865,["terms"]:v867,["gates"]:v869,["gate_bias"]:v871,["table"]:v873,["below"]:v875,["above"]:v877});}else{
const v878=v837;
const v879="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v880;if((v878===v879)){
const v881=v835;
const v882=v834;
const v883=v882["a"];
let v884;if(v883<v881.length){v884=v881[v883];}else{
v884=0;}
const v885=v884;
const v886=v834;
const v887=v886["kind"];
const v888=v834;
const v889=v888["binary"];
const v890=v834;
const v891=v890["unary"];
const v892=v885;
const v893=v834;
const v894=v893["b"];
const v895=v834;
const v896=v895["c"];
const v897=v834;
const v898=__nfValue(v897["value"]);
const v899=v834;
const v900=v899["terms"];
const v901=v834;
const v902=v901["gates"];
const v903=v834;
const v904=__nfValue(v903["gate_bias"]);
const v905=v834;
const v906=v905["table"];
const v907=v834;
const v908=v907["below"];
const v909=v834;
const v910=v909["above"];
v880=({["kind"]:v887,["binary"]:v889,["unary"]:v891,["a"]:v892,["b"]:v894,["c"]:v896,["value"]:v898,["terms"]:v900,["gates"]:v902,["gate_bias"]:v904,["table"]:v906,["below"]:v908,["above"]:v910});}else{
const v911=v837;
const v912="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v913;if((v911===v912)){
const v914=v834;
const v915=v914["terms"];
const v916=v915.length;
const v917=new Array(v916);
for(let v918=0;v918<v916;v918++){
const v919=v915[v918];
const v920=v835;
const v921=v919;
const v922=v921["wire"];
let v923;if(v922<v920.length){v923=v920[v922];}else{
v923=0;}
const v924=v923;
const v925=v919;
const v926=__nfValue(v925["coefficient"]);
v917[v918]=({["wire"]:v924,["coefficient"]:v926});
}
const v927=v917;
const v928=v834;
const v929=v928["kind"];
const v930=v834;
const v931=v930["binary"];
const v932=v834;
const v933=v932["unary"];
const v934=v834;
const v935=v934["a"];
const v936=v834;
const v937=v936["b"];
const v938=v834;
const v939=v938["c"];
const v940=v834;
const v941=__nfValue(v940["value"]);
const v942=v927;
const v943=v834;
const v944=v943["gates"];
const v945=v834;
const v946=__nfValue(v945["gate_bias"]);
const v947=v834;
const v948=v947["table"];
const v949=v834;
const v950=v949["below"];
const v951=v834;
const v952=v951["above"];
v913=({["kind"]:v929,["binary"]:v931,["unary"]:v933,["a"]:v935,["b"]:v937,["c"]:v939,["value"]:v941,["terms"]:v942,["gates"]:v944,["gate_bias"]:v946,["table"]:v948,["below"]:v950,["above"]:v952});}else{
const v953=v837;
const v954="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v955;if((v953===v954)){
const v956=v834;
const v957=v956["terms"];
const v958=v957.length;
const v959=new Array(v958);
for(let v960=0;v960<v958;v960++){
const v961=v957[v960];
const v962=v835;
const v963=v961;
const v964=v963["wire"];
let v965;if(v964<v962.length){v965=v962[v964];}else{
v965=0;}
const v966=v965;
const v967=v961;
const v968=__nfValue(v967["coefficient"]);
v959[v960]=({["wire"]:v966,["coefficient"]:v968});
}
const v969=v959;
const v970=v834;
const v971=v970["gates"];
const v972=v971.length;
const v973=new Array(v972);
for(let v974=0;v974<v972;v974++){
const v975=v971[v974];
const v976=v835;
const v977=v975;
const v978=v977["wire"];
let v979;if(v978<v976.length){v979=v976[v978];}else{
v979=0;}
const v980=v979;
const v981=v975;
const v982=__nfValue(v981["coefficient"]);
v973[v974]=({["wire"]:v980,["coefficient"]:v982});
}
const v983=v973;
const v984=v834;
const v985=v984["kind"];
const v986=v834;
const v987=v986["binary"];
const v988=v834;
const v989=v988["unary"];
const v990=v834;
const v991=v990["a"];
const v992=v834;
const v993=v992["b"];
const v994=v834;
const v995=v994["c"];
const v996=v834;
const v997=__nfValue(v996["value"]);
const v998=v969;
const v999=v983;
const v1000=v834;
const v1001=__nfValue(v1000["gate_bias"]);
const v1002=v834;
const v1003=v1002["table"];
const v1004=v834;
const v1005=v1004["below"];
const v1006=v834;
const v1007=v1006["above"];
v955=({["kind"]:v985,["binary"]:v987,["unary"]:v989,["a"]:v991,["b"]:v993,["c"]:v995,["value"]:v997,["terms"]:v998,["gates"]:v999,["gate_bias"]:v1001,["table"]:v1003,["below"]:v1005,["above"]:v1007});}else{
const v1008=v837;
const v1009="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1010;if((v1008===v1009)){
const v1011=v835;
const v1012=v834;
const v1013=v1012["a"];
let v1014;if(v1013<v1011.length){v1014=v1011[v1013];}else{
v1014=0;}
const v1015=v1014;
const v1016=v835;
const v1017=v834;
const v1018=v1017["b"];
let v1019;if(v1018<v1016.length){v1019=v1016[v1018];}else{
v1019=0;}
const v1020=v1019;
const v1021=v835;
const v1022=v834;
const v1023=v1022["c"];
let v1024;if(v1023<v1021.length){v1024=v1021[v1023];}else{
v1024=0;}
const v1025=v1024;
const v1026=v834;
const v1027=v1026["kind"];
const v1028=v834;
const v1029=v1028["binary"];
const v1030=v834;
const v1031=v1030["unary"];
const v1032=v1015;
const v1033=v1020;
const v1034=v1025;
const v1035=v834;
const v1036=__nfValue(v1035["value"]);
const v1037=v834;
const v1038=v1037["terms"];
const v1039=v834;
const v1040=v1039["gates"];
const v1041=v834;
const v1042=__nfValue(v1041["gate_bias"]);
const v1043=v834;
const v1044=v1043["table"];
const v1045=v834;
const v1046=v1045["below"];
const v1047=v834;
const v1048=v1047["above"];
v1010=({["kind"]:v1027,["binary"]:v1029,["unary"]:v1031,["a"]:v1032,["b"]:v1033,["c"]:v1034,["value"]:v1036,["terms"]:v1038,["gates"]:v1040,["gate_bias"]:v1042,["table"]:v1044,["below"]:v1046,["above"]:v1048});}else{
const v1049=v835;
const v1050=v834;
const v1051=v1050["a"];
let v1052;if(v1051<v1049.length){v1052=v1049[v1051];}else{
v1052=0;}
const v1053=v1052;
const v1054=v834;
const v1055=v1054["table"];
const v1056=v1055.length;
const v1057=new Array(v1056);
for(let v1058=0;v1058<v1056;v1058++){
const v1059=(v1055[v1058]>>>0);
const v1060=v835;
const v1061=v1059;
let v1062;if(v1061<v1060.length){v1062=v1060[v1061];}else{
v1062=0;}
v1057[v1058]=v1062;
}
const v1063=v1057;
const v1064=v834;
const v1065=v1064["kind"];
const v1066=v834;
const v1067=v1066["binary"];
const v1068=v834;
const v1069=v1068["unary"];
const v1070=v1053;
const v1071=v834;
const v1072=v1071["b"];
const v1073=v834;
const v1074=v1073["c"];
const v1075=v834;
const v1076=__nfValue(v1075["value"]);
const v1077=v834;
const v1078=v1077["terms"];
const v1079=v834;
const v1080=v1079["gates"];
const v1081=v834;
const v1082=__nfValue(v1081["gate_bias"]);
const v1083=v1063;
const v1084=v834;
const v1085=v1084["below"];
const v1086=v834;
const v1087=v1086["above"];
v1010=({["kind"]:v1065,["binary"]:v1067,["unary"]:v1069,["a"]:v1070,["b"]:v1072,["c"]:v1074,["value"]:v1076,["terms"]:v1078,["gates"]:v1080,["gate_bias"]:v1082,["table"]:v1083,["below"]:v1085,["above"]:v1087});}
v955=v1010;}
v913=v955;}
v880=v913;}
v843=v880;}
v840=v843;}
return v840;}
function __fn36(v1088,v1089,v1090){
const v1091=v1089;
const v1092=v1091["wire"];
const v1093=1;
const v1094=(((v1092) - (v1093)) >>> 0);
const v1095=v1089;
const v1096=v1095["live"];
const v1097=v1096;
const v1098=v1094;
let v1099;if(v1098<v1097.length){v1099=v1097.item(v1098);}else{
v1099=false;}
let v1100;if(v1099){
const v1101=v1088;
const v1102=__fn34(v1101);
const v1103=v1096;
let v1104=({["live"]:v1103});
for(let v1105=0;v1105<v1102.length;v1105++){
const v1106=(v1102[v1105]>>>0);
const v1107=v1104;
const v1108=v1107["live"];
const v1109=v1108;
const v1110=v1106;
const v1111=__tempSet(v1109,v1110,true,false);
const v1112=v1111;
v1104=({["live"]:v1112});
}
const v1113=v1104;
const v1114=v1113;
const v1115=v1114["live"];
const v1116=v1115;
const v1117=v1094;
v1100=({["live"]:v1116,["wire"]:v1117});}else{
const v1118=v1096;
const v1119=v1094;
v1100=({["live"]:v1118,["wire"]:v1119});}
return v1100;}
function __fn37(v1120,v1121){
const v1122=v1120;
const v1123=v1122["kind"];
const v1124=v1123;
const v1125="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1126;if((v1124===v1125)){
v1126=true;}else{
const v1127=v1123;
const v1128="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1129;if((v1127===v1128)){
const v1130=v1120;
const v1131=v1130["a"];
const v1132=v1121;
const v1133=((v1131) < (v1132));
let v1134=v1133;if(v1134){
const v1135=v1120;
const v1136=v1135["b"];
const v1137=v1121;
v1134=((v1136) < (v1137));}
v1129=v1134;}else{
const v1138=v1123;
const v1139="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1140;if((v1138===v1139)){
const v1141=v1120;
const v1142=v1141["a"];
const v1143=v1121;
v1140=((v1142) < (v1143));}else{
const v1144=v1123;
const v1145="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1146;if((v1144===v1145)){
const v1147=v1120;
const v1148=v1147["terms"];
let v1149=true;
for(let v1150=0;v1150<v1148.length;v1150++){
const v1151=v1148[v1150];
const v1152=v1149;
let v1153=v1152;if(v1153){
const v1154=v1151;
const v1155=v1154["wire"];
const v1156=v1121;
v1153=((v1155) < (v1156));}
v1149=v1153;
}
v1146=v1149;}else{
const v1157=v1123;
const v1158="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1159;if((v1157===v1158)){
const v1160=v1120;
const v1161=v1160["terms"];
let v1162=true;
for(let v1163=0;v1163<v1161.length;v1163++){
const v1164=v1161[v1163];
const v1165=v1162;
let v1166=v1165;if(v1166){
const v1167=v1164;
const v1168=v1167["wire"];
const v1169=v1121;
v1166=((v1168) < (v1169));}
v1162=v1166;
}
const v1170=v1162;
let v1171=v1170;if(v1171){
const v1172=v1120;
const v1173=v1172["gates"];
let v1174=true;
for(let v1175=0;v1175<v1173.length;v1175++){
const v1176=v1173[v1175];
const v1177=v1174;
let v1178=v1177;if(v1178){
const v1179=v1176;
const v1180=v1179["wire"];
const v1181=v1121;
v1178=((v1180) < (v1181));}
v1174=v1178;
}
v1171=v1174;}
v1159=v1171;}else{
const v1182=v1123;
const v1183="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1184;if((v1182===v1183)){
const v1185=v1120;
const v1186=v1185["a"];
const v1187=v1121;
const v1188=((v1186) < (v1187));
let v1189=v1188;if(v1189){
const v1190=v1120;
const v1191=v1190["b"];
const v1192=v1121;
v1189=((v1191) < (v1192));}
const v1193=v1189;
let v1194=v1193;if(v1194){
const v1195=v1120;
const v1196=v1195["c"];
const v1197=v1121;
v1194=((v1196) < (v1197));}
v1184=v1194;}else{
const v1198=v1120;
const v1199=v1198["a"];
const v1200=v1121;
const v1201=((v1199) < (v1200));
let v1202=v1201;if(v1202){
const v1203=v1120;
const v1204=v1203["table"];
let v1205=true;
for(let v1206=0;v1206<v1204.length;v1206++){
const v1207=(v1204[v1206]>>>0);
const v1208=v1205;
let v1209=v1208;if(v1209){
const v1210=v1207;
const v1211=v1121;
v1209=((v1210) < (v1211));}
v1205=v1209;
}
v1202=v1205;}
v1184=v1202;}
v1159=v1184;}
v1146=v1159;}
v1140=v1146;}
v1129=v1140;}
v1126=v1129;}
return v1126;}
function __fn38(v1212,v1213,v1214){
const v1215=v1213;
const v1216=v1215.length;
const v1217=4294967295;
const v1218=((v1216) > (v1217));
let v1219=v1218;if(!v1219){
const v1220=(v1213).length;
const v1221=4294967295;
const v1222=v1212;
const v1223=(((v1221) - (v1222)) >>> 0);
v1219=((v1220) > (v1223));}
let v1224;if(v1219){
v1224=false;}else{
const v1225=v1212;
const v1226=(v1213).length;
const v1227=(((v1225) + (v1226)) >>> 0);
const v1228=v1213;
const v1229=v1212;
const v1230=true;
let v1231=({["wire"]:v1229,["valid"]:v1230});
for(let v1232=0;v1232<v1228.length;v1232++){
const v1233=v1228[v1232];
const v1234=v1231;
const v1235=v1234["wire"];
const v1236=1;
const v1237=(((v1235) + (v1236)) >>> 0);
const v1238=v1231;
const v1239=v1238["valid"];
let v1240=v1239;if(v1240){
const v1241=v1233;
const v1242=v1231;
const v1243=v1242["wire"];
v1240=__fn37(v1241,v1243);}
const v1244=v1240;
v1231=({["wire"]:v1237,["valid"]:v1244});
}
const v1245=v1231;
const v1246=v1245;
const v1247=v1246["valid"];
let v1248=v1247;if(v1248){
const v1249=v1214;
let v1250=true;
for(let v1251=0;v1251<v1249.length;v1251++){
const v1252=(v1249[v1251]>>>0);
const v1253=v1250;
let v1254=v1253;if(v1254){
const v1255=v1252;
const v1256=v1227;
v1254=((v1255) < (v1256));}
v1250=v1254;
}
v1248=v1250;}
v1224=v1248;}
return v1224;}
function __fn39(v1257,v1258,v1259,v1260){
const v1261=v1258;
const v1262=v1261.length;
const v1263=4294967295;
const v1264=((v1262) > (v1263));
let v1265=v1264;if(!v1265){
const v1266=v1257;
const v1267=v1260;
v1265=((v1266) > (v1267));}
const v1268=v1265;
let v1269=v1268;if(!v1269){
const v1270=(v1258).length;
const v1271=v1260;
const v1272=v1257;
const v1273=(((v1271) - (v1272)) >>> 0);
v1269=((v1270) > (v1273));}
let v1274;if(v1269){
v1274=({Err:"graph capacity"});}else{
const v1275=v1257;
const v1276=v1258;
const v1277=v1259;
const v1278=__fn38(v1275,v1276,v1277);
const v1279=false;
let v1280;if((v1278===v1279)){
v1280=({Err:"graph is not topologically ordered"});}else{
const v1281=v1257;
const v1282=(v1258).length;
const v1283=(((v1281) + (v1282)) >>> 0);
const v1284=__bufferFill(v1283,false);
const v1285=v1259;
const v1286=v1284;
let v1287=({["live"]:v1286});
for(let v1288=0;v1288<v1285.length;v1288++){
const v1289=(v1285[v1288]>>>0);
const v1290=v1287;
const v1291=v1290["live"];
const v1292=v1291;
const v1293=v1289;
const v1294=__tempSet(v1292,v1293,true,false);
const v1295=v1294;
v1287=({["live"]:v1295});
}
const v1296=v1287;
const v1297=v1296;
const v1298=v1297["live"];
const v1299=v1258;
const v1300=v1298;
const v1301=v1283;
let v1302=({["live"]:v1300,["wire"]:v1301});
for(let v1303=v1299.length-1;v1303>=0;v1303--){
const v1304=v1299[v1303];
const v1305=v1304;
const v1306=v1302;
const v1307=v1257;
v1302=__fn36(v1305,v1306,v1307);
}
const v1308=v1302;
const v1309=v1308;
const v1310=v1309["live"];
const v1311=v1310.freeze();
const v1312=__bufferFill(v1283,0);
const v1313=v1257;
let v1314=v1312;
for(let v1315=0;v1315<v1313;v1315++){
if(false){break;}
const v1316=(v1315>>>0);
const v1317=v1314;
const v1318=v1316;
v1314=__tempSet(v1317,v1318,v1316,false);}
const v1319=v1314;
const v1320=v1319;
const v1321=v1257;
const v1322=v1257;
const v1323=v1258;
const v1324=v1322;
const v1325=v1320;
const v1326=v1321;
let v1327=({["next"]:v1324,["positions"]:v1325,["wire"]:v1326});
for(let v1328=0;v1328<v1323.length;v1328++){
const v1329=v1323[v1328];
const v1330=v1327;
const v1331=v1330["next"];
const v1332=v1327;
const v1333=v1332["positions"];
const v1334=v1327;
const v1335=v1334["wire"];
const v1336=v1311;
const v1337=v1335;
let v1338;if(v1337<v1336.length){v1338=v1336[v1337];}else{
v1338=false;}
let v1339;if(v1338){
const v1340=v1333;
const v1341=v1335;
const v1342=__tempSet(v1340,v1341,v1331,false);
const v1343=v1331;
const v1344=1;
const v1345=(((v1343) + (v1344)) >>> 0);
const v1346=v1335;
const v1347=1;
const v1348=(((v1346) + (v1347)) >>> 0);
const v1349=v1345;
const v1350=v1342;
const v1351=v1348;
v1339=({["next"]:v1349,["positions"]:v1350,["wire"]:v1351});}else{
const v1352=v1335;
const v1353=1;
const v1354=(((v1352) + (v1353)) >>> 0);
const v1355=v1331;
const v1356=v1333;
const v1357=v1354;
v1339=({["next"]:v1355,["positions"]:v1356,["wire"]:v1357});}
v1327=v1339;
}
const v1358=v1327;
const v1359=v1358;
const v1360=v1359["next"];
const v1361=v1358;
const v1362=v1361["positions"];
const v1363=v1358;
const v1364=v1363["wire"];
const v1365=v1362;
const v1366=v1365.freeze();
const v1367=new __InkBuffer([]);
const v1368=v1257;
const v1369=v1258;
const v1370=v1367;
const v1371=v1368;
let v1372=({["compact"]:v1370,["wire"]:v1371});
for(let v1373=0;v1373<v1369.length;v1373++){
const v1374=v1369[v1373];
const v1375=v1372;
const v1376=v1375["compact"];
const v1377=v1372;
const v1378=v1377["wire"];
const v1379=v1311;
const v1380=v1378;
let v1381;if(v1380<v1379.length){v1381=v1379[v1380];}else{
v1381=false;}
let v1382;if(v1381){
const v1383=v1376;
const v1384=v1374;
const v1385=v1366;
const v1386=__fn35(v1384,v1385);
const v1387=__tempEdit(v1383,"push",v1386);
const v1388=v1378;
const v1389=1;
const v1390=(((v1388) + (v1389)) >>> 0);
const v1391=v1387;
const v1392=v1390;
v1382=({["compact"]:v1391,["wire"]:v1392});}else{
const v1393=v1378;
const v1394=1;
const v1395=(((v1393) + (v1394)) >>> 0);
const v1396=v1376;
const v1397=v1395;
v1382=({["compact"]:v1396,["wire"]:v1397});}
v1372=v1382;
}
const v1398=v1372;
const v1399=v1398;
const v1400=v1399["compact"];
const v1401=v1398;
const v1402=v1401["wire"];
const v1403=v1257;
const v1404=v1400;
const v1405=v1404.freeze();
const v1406=v1259;
const v1407=v1406.length;
const v1408=new Array(v1407);
for(let v1409=0;v1409<v1407;v1409++){
const v1410=(v1406[v1409]>>>0);
const v1411=v1366;
const v1412=v1410;
let v1413;if(v1412<v1411.length){v1413=v1411[v1412];}else{
v1413=0;}
v1408[v1409]=v1413;
}
const v1414=v1408;
v1280=({Ok:({["inputs"]:v1403,["nodes"]:v1405,["roots"]:v1414})});}
v1274=v1280;}
return v1274;}
function __fn40(v1415){
const v1416=v1415;
return (v1416["nodes"]).length;}
function __fn41(v1417){
const v1418=v1417;
return v1418["inputs"];}
function __fn42(v1419){
const v1420=v1419;
return (v1420["roots"]).length;}
function __fn43(v1421,v1422,v1423){
const v1424=v1421;
const v1425=v1424;
const v1426="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v1427;if((v1425===v1426)){
const v1428=__nfValue(v1422);
const v1429=__nfValue(v1423);
v1427=Math.fround(__nfNumber(v1428) + __nfNumber(v1429));}else{
const v1430=v1424;
const v1431="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v1432;if((v1430===v1431)){
const v1433=__nfValue(v1422);
const v1434=__nfValue(v1423);
v1432=Math.fround(__nfNumber(v1433) - __nfNumber(v1434));}else{
const v1435=v1424;
const v1436="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v1437;if((v1435===v1436)){
const v1438=__nfValue(v1422);
const v1439=__nfValue(v1423);
v1437=Math.fround(__nfNumber(v1438) * __nfNumber(v1439));}else{
v1437=Math.fround((__nfNumber(__nfValue(v1422)))/(__nfNumber(__nfValue(v1423))));}
v1432=v1437;}
v1427=v1432;}
return v1427;}
function __fn44(v1440){
let v1441;if(Number.isNaN(__nfNumber(__nfValue(v1440)))){
v1441=__nfFromBits(2143289344);}else{
const v1442=__nfValue(v1440);
const v1443=__nfFromBits(0);
let v1444;if(((__nfNumber(v1442)) > (__nfNumber(v1443)))){
v1444=__nfValue(v1440);}else{
v1444=__nfFromBits(0);}
v1441=v1444;}
return v1441;}
function __fn45(v1445,v1446){
const v1447=v1445;
const v1448=v1447;
const v1449="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1450;if((v1448===v1449)){
v1450=Math.fround(Math.sqrt(__nfNumber(__nfValue(v1446))));}else{
const v1451=v1447;
const v1452="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1453;if((v1451===v1452)){
const v1454=__nfValue(v1446);
v1453=__nfNeg(v1454);}else{
const v1455=v1447;
const v1456="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1457;if((v1455===v1456)){
const v1458=__nfValue(v1446);
v1457=__fn44(v1458);}else{
const v1459=__nfValue(v1446);
const v1460=__nfFromBits(0);
let v1461;if(((__nfNumber(v1459)) > (__nfNumber(v1460)))){
v1461=__nfFromBits(1065353216);}else{
v1461=__nfFromBits(0);}
v1457=v1461;}
v1453=v1457;}
v1450=v1453;}
return v1450;}
function __fn46(v1462,v1463){
const v1464=v1462;
const v1465=v1464["kind"];
const v1466=v1465;
const v1467="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1468;if((v1466===v1467)){
const v1469=v1462;
v1468=__nfValue(v1469["value"]);}else{
const v1470=v1465;
const v1471="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1472;if((v1470===v1471)){
const v1473=v1462;
const v1474=v1473["binary"];
const v1475=v1463;
const v1476=v1462;
const v1477=v1476["a"];
let v1478;if(v1477<v1475.length){v1478=v1475.item(v1477);}else{
v1478=__nfFromBits(0);}
const v1479=__nfValue(v1478);
const v1480=v1463;
const v1481=v1462;
const v1482=v1481["b"];
let v1483;if(v1482<v1480.length){v1483=v1480.item(v1482);}else{
v1483=__nfFromBits(0);}
const v1484=__nfValue(v1483);
v1472=__fn43(v1474,v1479,v1484);}else{
const v1485=v1465;
const v1486="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1487;if((v1485===v1486)){
const v1488=v1462;
const v1489=v1488["unary"];
const v1490=v1463;
const v1491=v1462;
const v1492=v1491["a"];
let v1493;if(v1492<v1490.length){v1493=v1490.item(v1492);}else{
v1493=__nfFromBits(0);}
const v1494=__nfValue(v1493);
v1487=__fn45(v1489,v1494);}else{
const v1495=v1465;
const v1496="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1497;if((v1495===v1496)){
v1497=__nfFromBits(0);}else{
const v1498=v1465;
const v1499="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1500;if((v1498===v1499)){
v1500=__nfFromBits(0);}else{
const v1501=v1465;
const v1502="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1503;if((v1501===v1502)){
const v1504=v1463;
const v1505=v1462;
const v1506=v1505["a"];
let v1507;if(v1506<v1504.length){v1507=v1504.item(v1506);}else{
v1507=__nfFromBits(0);}
const v1508=__nfValue(v1507);
const v1509=__nfFromBits(0);
let v1510;if(((__nfNumber(v1508)) > (__nfNumber(v1509)))){
const v1511=v1463;
const v1512=v1462;
const v1513=v1512["c"];
let v1514;if(v1513<v1511.length){v1514=v1511.item(v1513);}else{
v1514=__nfFromBits(0);}
v1510=__nfValue(v1514);}else{
const v1515=v1463;
const v1516=v1462;
const v1517=v1516["b"];
let v1518;if(v1517<v1515.length){v1518=v1515.item(v1517);}else{
v1518=__nfFromBits(0);}
v1510=__nfValue(v1518);}
v1503=v1510;}else{
v1503=__nfFromBits(0);}
v1500=v1503;}
v1497=v1500;}
v1487=v1497;}
v1472=v1487;}
v1468=v1472;}
const v1519=v1468;
const v1520=v1463;
const v1521=__nfValue(v1519);
return ({["values"]:v1520,["value"]:v1521});}
function __fn47(v1522,v1523,v1524){
const v1525=v1522;
const v1526=0;
const v1527=v1522;
const v1528=(v1527).length;
const v1529=v1525.range(v1526,v1528);
const v1530=v1523;
let v1531=__nfValue(v1524);
for(let v1532=0;v1532<v1530.length;v1532++){
const v1533=v1530[v1532];
const v1534=__nfValue(v1531);
const v1535=v1533;
const v1536=__nfValue(v1535["coefficient"]);
const v1537=v1529;
const v1538=v1533;
const v1539=v1538["wire"];
let v1540;if(v1539<v1537.length){v1540=v1537.item(v1539);}else{
v1540=__nfFromBits(0);}
const v1541=__nfValue(v1540);
const v1542=Math.fround(__nfNumber(v1536) * __nfNumber(v1541));
v1531=Math.fround(__nfNumber(v1534) + v1542);
}
const v1543=__nfValue(v1531);
const v1544=v1522;
const v1545=__nfValue(v1543);
return ({["values"]:v1544,["value"]:v1545});}
function __fn48(v1546,v1547){
const v1548=v1547;
const v1549=v1546;
const v1550=v1549["terms"];
const v1551=v1546;
const v1552=__nfValue(v1551["value"]);
const v1553=__fn47(v1548,v1550,v1552);
const v1554=v1553;
const v1555=v1554["values"];
const v1556=v1546;
const v1557=v1556["gates"];
const v1558=v1546;
const v1559=__nfValue(v1558["gate_bias"]);
const v1560=__fn47(v1555,v1557,v1559);
const v1561=v1560;
const v1562=v1561["values"];
const v1563=v1553;
const v1564=__nfValue(v1563["value"]);
const v1565=v1560;
const v1566=__nfValue(v1565["value"]);
const v1567=__fn44(v1566);
const v1568=Math.fround(__nfNumber(v1564) * __nfNumber(v1567));
return ({["values"]:v1562,["value"]:v1568});}
function __fn49(v1569,v1570,v1571,v1572){
const v1573=v1570;
const v1574=0;
const v1575=(v1573===v1574);
let v1576=v1575;if(!v1576){
const v1577=Number.isFinite(__nfNumber(__nfValue(v1569)));
const v1578=false;
v1576=(v1577===v1578);}
let v1579;if(v1576){
v1579=({None:null});}else{
const v1580=__nfValue(v1569);
const v1581=__nfFromBits(0);
let v1582;if(((__nfNumber(v1580)) < (__nfNumber(v1581)))){
let v1583;if(v1571){
v1583=({None:null});}else{
v1583=({Some:0});}
v1582=v1583;}else{
const v1584=__nfValue(v1569);
const v1585=Math.fround(v1570);
let v1586;if(((__nfNumber(v1584)) >= (__nfNumber(v1585)))){
let v1587;if(v1572){
v1587=({None:null});}else{
const v1588=v1570;
const v1589=1;
v1587=({Some:(((v1588) - (v1589)) >>> 0)});}
v1586=v1587;}else{
v1586=__ink_from_float(__nfNumber(__nfValue(v1569)), "u32");}
v1582=v1586;}
v1579=v1582;}
return v1579;}
function __fn50(v1590,v1591){
const v1592=v1591;
const v1593=v1590;
const v1594=v1593["a"];
let v1595;if(v1594<v1592.length){v1595=v1592.item(v1594);}else{
v1595=__nfFromBits(0);}
const v1596=__nfValue(v1595);
const v1597=v1590;
const v1598=(v1597["table"]).length;
const v1599=v1590;
const v1600=v1599["below"];
const v1601=v1590;
const v1602=v1601["above"];
const v1603=__fn49(v1596,v1598,v1600,v1602);
const v1604=v1603;
let v1605;if(Object.hasOwn(v1604,"Some")){
const v1606=v1604["Some"];
const v1607=v1591;
const v1608=v1590;
const v1609=v1608["table"];
const v1610=v1606;
let v1611;if(v1610<v1609.length){v1611=v1609[v1610];}else{
v1611=0;}
const v1612=v1611;
let v1613;if(v1612<v1607.length){v1613=v1607.item(v1612);}else{
v1613=__nfFromBits(0);}
v1605=__nfValue(v1613);}else{
const v1614=null;
v1605=__nfFromBits(0);}
const v1615=__nfValue(v1605);
const v1616=v1591;
const v1617=__nfValue(v1615);
return ({["values"]:v1616,["value"]:v1617});}
function __fn51(v1618,v1619){
const v1620=v1619;
const v1621=v1620["values"];
const v1622=v1619;
const v1623=v1622["finite_indices"];
let v1624=v1623;if(v1624){
const v1625=v1618;
const v1626=v1625["kind"];
const v1627="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v1628=!(v1626===v1627);
let v1629=v1628;if(!v1629){
const v1630=v1621;
const v1631=v1618;
const v1632=v1631["a"];
let v1633;if(v1632<v1630.length){v1633=v1630.item(v1632);}else{
v1633=__nfFromBits(0);}
v1629=Number.isFinite(__nfNumber(__nfValue(v1633)));}
v1624=v1629;}
const v1634=v1624;
const v1635=v1618;
const v1636=v1635["kind"];
const v1637=v1636;
const v1638="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1639;if((v1637===v1638)){
const v1640=v1618;
const v1641=v1621;
v1639=__fn46(v1640,v1641);}else{
const v1642=v1636;
const v1643="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1644;if((v1642===v1643)){
const v1645=v1618;
const v1646=v1621;
v1644=__fn46(v1645,v1646);}else{
const v1647=v1636;
const v1648="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1649;if((v1647===v1648)){
const v1650=v1618;
const v1651=v1621;
v1649=__fn46(v1650,v1651);}else{
const v1652=v1636;
const v1653="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1654;if((v1652===v1653)){
const v1655=v1621;
const v1656=v1618;
const v1657=v1656["terms"];
const v1658=v1618;
const v1659=__nfValue(v1658["value"]);
v1654=__fn47(v1655,v1657,v1659);}else{
const v1660=v1636;
const v1661="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1662;if((v1660===v1661)){
const v1663=v1618;
const v1664=v1621;
v1662=__fn48(v1663,v1664);}else{
const v1665=v1636;
const v1666="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1667;if((v1665===v1666)){
const v1668=v1618;
const v1669=v1621;
v1667=__fn46(v1668,v1669);}else{
const v1670=v1618;
const v1671=v1621;
v1667=__fn50(v1670,v1671);}
v1662=v1667;}
v1654=v1662;}
v1649=v1654;}
v1644=v1649;}
v1639=v1644;}
const v1672=v1639;
const v1673=v1672;
const v1674=v1673["values"];
const v1675=v1672;
const v1676=__nfValue(v1675["value"]);
const v1677=__tempEdit(v1674,"push",v1676);
const v1678=v1634;
return ({["values"]:v1677,["finite_indices"]:v1678});}
function __fn52(v1679,v1680){
const v1681=(v1680).length;
const v1682=v1679;
const v1683=v1682["inputs"];
let v1684;if(!(v1681===v1683)){
v1684=({Err:"graph input shape"});}else{
const v1685=v1679;
const v1686=v1685["inputs"];
const v1687=v1679;
const v1688=v1687["nodes"];
const v1689=v1679;
const v1690=v1689["roots"];
const v1691=__fn38(v1686,v1688,v1690);
const v1692=false;
let v1693;if((v1691===v1692)){
v1693=({Err:"invalid prepared graph"});}else{
const v1694=v1679;
const v1695=v1694["nodes"];
const v1696=new __InkBuffer(Array.from(v1680));
const v1697=true;
let v1698=({["values"]:v1696,["finite_indices"]:v1697});
for(let v1699=0;v1699<v1695.length;v1699++){
const v1700=v1695[v1699];
const v1701=v1700;
const v1702=v1698;
v1698=__fn51(v1701,v1702);
}
const v1703=v1698;
const v1704=v1703;
const v1705=v1704["values"];
const v1706=v1705.freeze();
const v1707=v1703;
const v1708=v1707["finite_indices"];
const v1709=false;
let v1710;if((v1708===v1709)){
v1710=({Err:"nonfinite graph index"});}else{
const v1711=v1706;
const v1712=v1679;
const v1713=v1712["roots"];
const v1714=v1713.length;
const v1715=new Array(v1714);
for(let v1716=0;v1716<v1714;v1716++){
const v1717=(v1713[v1716]>>>0);
const v1718=v1706;
const v1719=v1717;
let v1720;if(v1719<v1718.length){v1720=v1718[v1719];}else{
v1720=__nfFromBits(0);}
v1715[v1716]=__nfValue(v1720);
}
const v1721=v1715;
v1710=({Ok:({["values"]:v1711,["outputs"]:v1721})});}
v1693=v1710;}
v1684=v1693;}
return v1684;}
function __fn53(v1722,v1723){
const v1724=v1722;
const v1725=v1723;
const v1726=__fn52(v1724,v1725);
let v1727;if(Object.hasOwn(v1726,"Ok")){
const v1728=v1726["Ok"];
const v1729=v1728;
v1727=({Ok:v1729["outputs"]});}else{v1727=({Err:v1726.Err});}
return v1727;}
function __fn54(v1730,v1731,v1732){
const v1733=v1730;
const v1734=v1731;
let v1735;if(v1734<v1733.length){v1735=v1733.item(v1734);}else{
v1735=__nfFromBits(0);}
const v1736=__nfValue(v1735);
const v1737=v1730;
const v1738=v1731;
const v1739=__nfValue(v1736);
const v1740=__nfValue(v1732);
return __tempSet(v1737,v1738,Math.fround(__nfNumber(v1739) + __nfNumber(v1740)),false);}
function __fn55(v1741,v1742,v1743){
const v1744=v1741;
const v1745=v1742;
const v1746=v1744;
let v1747=({["g"]:v1746});
for(let v1748=0;v1748<v1745.length;v1748++){
const v1749=v1745[v1748];
const v1750=v1747;
const v1751=v1750["g"];
const v1752=v1751;
const v1753=v1749;
const v1754=v1753["wire"];
const v1755=__nfValue(v1743);
const v1756=v1749;
const v1757=__nfValue(v1756["coefficient"]);
const v1758=Math.fround(__nfNumber(v1755) * __nfNumber(v1757));
const v1759=__fn54(v1752,v1754,v1758);
const v1760=v1759;
v1747=({["g"]:v1760});
}
const v1761=v1747;
const v1762=v1761;
const v1763=v1762["g"];
return v1763;}
function __fn56(v1764,v1765){
const v1766=v1764;
const v1767=v1766;
const v1768="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1769;if((v1767===v1768)){
v1769=true;}else{
const v1770=v1766;
const v1771="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1772;if((v1770===v1771)){
v1772=true;}else{
const v1773=v1766;
const v1774="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1775;if((v1773===v1774)){
const v1776=v1765;
v1775=v1776["piecewise"];}else{
const v1777=v1765;
const v1778=v1777["boolean"];
const v1779="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v1775=!(v1778===v1779);}
v1772=v1775;}
v1769=v1772;}
return v1769;}
function __fn57(v1780,v1781){
const v1782=v1780;
const v1783=v1782["kind"];
const v1784=v1783;
const v1785="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1786;if((v1784===v1785)){
v1786=true;}else{
const v1787=v1783;
const v1788="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1789;if((v1787===v1788)){
v1789=true;}else{
const v1790=v1783;
const v1791="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1792;if((v1790===v1791)){
const v1793=v1780;
const v1794=v1793["unary"];
const v1795=v1781;
v1792=__fn56(v1794,v1795);}else{
const v1796=v1783;
const v1797="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1798;if((v1796===v1797)){
v1798=true;}else{
const v1799=v1783;
const v1800="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1801;if((v1799===v1800)){
const v1802=v1781;
v1801=v1802["piecewise"];}else{
const v1803=v1783;
const v1804="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1805;if((v1803===v1804)){
const v1806=v1781;
v1805=v1806["piecewise"];}else{
const v1807=v1781;
const v1808=v1807["index"];
const v1809="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v1805=!(v1808===v1809);}
v1801=v1805;}
v1798=v1801;}
v1792=v1798;}
v1789=v1792;}
v1786=v1789;}
return v1786;}
function __fn58(v1810,v1811,v1812,v1813,v1814,v1815,v1816){
const v1817=v1812;
const v1818=__nfValue(v1813);
const v1819=v1817;
let v1820=__nfValue(v1818);
for(let v1821=0;v1821<v1819.length;v1821++){
const v1822=v1819[v1821];
const v1823=__nfValue(v1820);
const v1824=v1822;
const v1825=__nfValue(v1824["coefficient"]);
const v1826=v1822;
const v1827=v1826["wire"];
const v1828=v1827;
const v1829=v1811;
const v1830=v1828;
let v1831;if(v1830<v1829.length){v1831=v1829[v1830];}else{
v1831=__nfFromBits(0);}
const v1832=__nfValue(v1831);
const v1833=__nfValue(v1832);
const v1834=Math.fround(__nfNumber(v1825) * __nfNumber(v1833));
v1820=Math.fround(__nfNumber(v1823) + v1834);
}
const v1835=v1820;
const v1836=__nfValue(v1835);
const v1837=v1814;
const v1838=__nfValue(v1815);
const v1839=v1837;
let v1840=__nfValue(v1838);
for(let v1841=0;v1841<v1839.length;v1841++){
const v1842=v1839[v1841];
const v1843=__nfValue(v1840);
const v1844=v1842;
const v1845=__nfValue(v1844["coefficient"]);
const v1846=v1842;
const v1847=v1846["wire"];
const v1848=v1847;
const v1849=v1811;
const v1850=v1848;
let v1851;if(v1850<v1849.length){v1851=v1849[v1850];}else{
v1851=__nfFromBits(0);}
const v1852=__nfValue(v1851);
const v1853=__nfValue(v1852);
const v1854=Math.fround(__nfNumber(v1845) * __nfNumber(v1853));
v1840=Math.fround(__nfNumber(v1843) + v1854);
}
const v1855=v1840;
const v1856=__nfValue(v1855);
const v1857=v1810;
const v1858=v1812;
const v1859=__nfValue(v1816);
const v1860=__nfValue(v1856);
const v1861=__fn44(v1860);
const v1862=Math.fround(__nfNumber(v1859) * __nfNumber(v1861));
const v1863=__fn55(v1857,v1858,v1862);
const v1864=__nfValue(v1856);
const v1865=__nfFromBits(0);
let v1866;if(((__nfNumber(v1864)) > (__nfNumber(v1865)))){
const v1867=v1863;
const v1868=v1814;
const v1869=__nfValue(v1816);
const v1870=__nfValue(v1836);
const v1871=Math.fround(__nfNumber(v1869) * __nfNumber(v1870));
v1866=__fn55(v1867,v1868,v1871);}else{
v1866=v1863;}
return v1866;}
function __fn59(v1872,v1873,v1874,v1875,v1876,v1877,v1878,v1879){
const v1880=v1873;
const v1881=v1874;
let v1882;if(v1881<v1880.length){v1882=v1880[v1881];}else{
v1882=__nfFromBits(0);}
const v1883=__nfValue(v1882);
const v1884=(v1875).length;
const v1885=v1884;
const v1886=0;
const v1887=((v1885) > (v1886));
let v1888=v1887;if(v1888){
const v1889=__nfValue(v1883);
const v1890=__nfFromBits(0);
const v1891=((__nfNumber(v1889)) < (__nfNumber(v1890)));
let v1892=v1891;if(v1892){
v1892=v1876;}
const v1893=v1892;
const v1894=false;
v1888=(v1893===v1894);}
const v1895=v1888;
let v1896=v1895;if(v1896){
const v1897=__nfValue(v1883);
const v1898=Math.fround(v1884);
const v1899=((__nfNumber(v1897)) >= (__nfNumber(v1898)));
let v1900=v1899;if(v1900){
v1900=v1877;}
const v1901=v1900;
const v1902=false;
v1896=(v1901===v1902);}
const v1903=v1896;
const v1904=__nfValue(v1883);
const v1905=__nfFromBits(0);
let v1906;if(((__nfNumber(v1904)) < (__nfNumber(v1905)))){
v1906=0;}else{
const v1907=__nfValue(v1883);
const v1908=Math.fround(v1884);
let v1909;if(((__nfNumber(v1907)) >= (__nfNumber(v1908)))){
const v1910=v1884;
const v1911=1;
v1909=(((v1910) - (v1911)) >>> 0);}else{
const v1912=__ink_from_float(__nfNumber(__nfValue(v1883)), "u32");
let v1913;if(Object.hasOwn(v1912,"Some")){
const v1914=v1912["Some"];
v1913=v1914;}else{
const v1915=null;
v1913=0;}
v1909=v1913;}
v1906=v1909;}
const v1916=v1906;
let v1917;if(v1903){
const v1918=v1872;
const v1919=v1875;
const v1920=v1916;
let v1921;if(v1920<v1919.length){v1921=v1919[v1920];}else{
v1921=0;}
const v1922=v1921;
const v1923=__nfValue(v1878);
v1917=__fn54(v1918,v1922,v1923);}else{
v1917=v1872;}
const v1924=v1917;
const v1925=v1875;
const v1926=Math.fround(Math.floor(__nfNumber(__nfValue(v1883))));
const v1927=v1876;
const v1928=v1877;
const v1929=(v1925).length;
const v1930=0;
let v1931;if((v1929===v1930)){
v1931=__nfFromBits(0);}else{
const v1932=__nfValue(v1926);
const v1933=__nfFromBits(0);
let v1934;if(((__nfNumber(v1932)) < (__nfNumber(v1933)))){
let v1935;if(v1927){
v1935=__nfFromBits(0);}else{
const v1936=v1925;
const v1937=0;
let v1938;if(v1937<v1936.length){v1938=v1936[v1937];}else{
v1938=0;}
const v1939=v1938;
const v1940=v1939;
const v1941=v1873;
const v1942=v1940;
let v1943;if(v1942<v1941.length){v1943=v1941[v1942];}else{
v1943=__nfFromBits(0);}
const v1944=__nfValue(v1943);
v1935=__nfValue(v1944);}
v1934=v1935;}else{
const v1945=__nfValue(v1926);
const v1946=Math.fround((v1925).length);
let v1947;if(((__nfNumber(v1945)) >= (__nfNumber(v1946)))){
let v1948;if(v1928){
v1948=__nfFromBits(0);}else{
const v1949=v1925;
const v1950=(v1925).length;
const v1951=1;
const v1952=(((v1950) - (v1951)) >>> 0);
let v1953;if(v1952<v1949.length){v1953=v1949[v1952];}else{
v1953=0;}
const v1954=v1953;
const v1955=v1954;
const v1956=v1873;
const v1957=v1955;
let v1958;if(v1957<v1956.length){v1958=v1956[v1957];}else{
v1958=__nfFromBits(0);}
const v1959=__nfValue(v1958);
v1948=__nfValue(v1959);}
v1947=v1948;}else{
const v1960=__ink_from_float(__nfNumber(__nfValue(v1926)), "u32");
let v1961;if(Object.hasOwn(v1960,"Some")){
const v1962=v1960["Some"];
v1961=v1962;}else{
const v1963=null;
v1961=0;}
const v1964=v1961;
const v1965=v1925;
const v1966=v1964;
let v1967;if(v1966<v1965.length){v1967=v1965[v1966];}else{
v1967=0;}
const v1968=v1967;
const v1969=v1968;
const v1970=v1873;
const v1971=v1969;
let v1972;if(v1971<v1970.length){v1972=v1970[v1971];}else{
v1972=__nfFromBits(0);}
const v1973=__nfValue(v1972);
v1947=__nfValue(v1973);}
v1934=v1947;}
v1931=v1934;}
const v1974=v1931;
const v1975=__nfValue(v1974);
const v1976=v1875;
const v1977=Math.fround(Math.floor(__nfNumber(__nfValue(v1883))));
const v1978=__nfFromBits(1065353216);
const v1979=Math.fround(__nfNumber(v1977) - v1978);
const v1980=v1876;
const v1981=v1877;
const v1982=(v1976).length;
const v1983=0;
let v1984;if((v1982===v1983)){
v1984=__nfFromBits(0);}else{
const v1985=v1979;
const v1986=__nfFromBits(0);
let v1987;if(((__nfNumber(v1985)) < (__nfNumber(v1986)))){
let v1988;if(v1980){
v1988=__nfFromBits(0);}else{
const v1989=v1976;
const v1990=0;
let v1991;if(v1990<v1989.length){v1991=v1989[v1990];}else{
v1991=0;}
const v1992=v1991;
const v1993=v1992;
const v1994=v1873;
const v1995=v1993;
let v1996;if(v1995<v1994.length){v1996=v1994[v1995];}else{
v1996=__nfFromBits(0);}
const v1997=__nfValue(v1996);
v1988=__nfValue(v1997);}
v1987=v1988;}else{
const v1998=v1979;
const v1999=Math.fround((v1976).length);
let v2000;if(((__nfNumber(v1998)) >= (__nfNumber(v1999)))){
let v2001;if(v1981){
v2001=__nfFromBits(0);}else{
const v2002=v1976;
const v2003=(v1976).length;
const v2004=1;
const v2005=(((v2003) - (v2004)) >>> 0);
let v2006;if(v2005<v2002.length){v2006=v2002[v2005];}else{
v2006=0;}
const v2007=v2006;
const v2008=v2007;
const v2009=v1873;
const v2010=v2008;
let v2011;if(v2010<v2009.length){v2011=v2009[v2010];}else{
v2011=__nfFromBits(0);}
const v2012=__nfValue(v2011);
v2001=__nfValue(v2012);}
v2000=v2001;}else{
const v2013=__ink_from_float(__nfNumber(v1979), "u32");
let v2014;if(Object.hasOwn(v2013,"Some")){
const v2015=v2013["Some"];
v2014=v2015;}else{
const v2016=null;
v2014=0;}
const v2017=v2014;
const v2018=v1976;
const v2019=v2017;
let v2020;if(v2019<v2018.length){v2020=v2018[v2019];}else{
v2020=0;}
const v2021=v2020;
const v2022=v2021;
const v2023=v1873;
const v2024=v2022;
let v2025;if(v2024<v2023.length){v2025=v2023[v2024];}else{
v2025=__nfFromBits(0);}
const v2026=__nfValue(v2025);
v2000=__nfValue(v2026);}
v1987=v2000;}
v1984=v1987;}
const v2027=v1984;
const v2028=__nfValue(v2027);
const v2029=Math.fround(__nfNumber(v1975) - __nfNumber(v2028));
const v2030=v1879;
const v2031=v2030["index"];
const v2032="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference";
let v2033;if((v2031===v2032)){
const v2034=v1924;
const v2035=v1874;
const v2036=__nfValue(v1878);
const v2037=v2029;
const v2038=Math.fround(__nfNumber(v2036) * v2037);
v2033=__fn54(v2034,v2035,v2038);}else{
v2033=v1924;}
return v2033;}
function __fn60(v2039,v2040,v2041,v2042,v2043,v2044){
const v2045=v2039;
const v2046=v2045;
const v2047="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v2048;if((v2046===v2047)){
const v2049=v2040;
const v2050=v2042;
const v2051=__nfValue(v2044);
const v2052=__fn54(v2049,v2050,v2051);
const v2053=v2043;
const v2054=__nfValue(v2044);
v2048=__fn54(v2052,v2053,v2054);}else{
const v2055=v2045;
const v2056="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v2057;if((v2055===v2056)){
const v2058=v2040;
const v2059=v2042;
const v2060=__nfValue(v2044);
const v2061=__fn54(v2058,v2059,v2060);
const v2062=v2043;
const v2063=__nfValue(v2044);
const v2064=__nfNeg(v2063);
v2057=__fn54(v2061,v2062,v2064);}else{
const v2065=v2045;
const v2066="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v2067;if((v2065===v2066)){
const v2068=v2040;
const v2069=v2042;
const v2070=__nfValue(v2044);
const v2071=v2041;
const v2072=v2043;
let v2073;if(v2072<v2071.length){v2073=v2071[v2072];}else{
v2073=__nfFromBits(0);}
const v2074=__nfValue(v2073);
const v2075=Math.fround(__nfNumber(v2070) * __nfNumber(v2074));
const v2076=__fn54(v2068,v2069,v2075);
const v2077=v2043;
const v2078=__nfValue(v2044);
const v2079=v2041;
const v2080=v2042;
let v2081;if(v2080<v2079.length){v2081=v2079[v2080];}else{
v2081=__nfFromBits(0);}
const v2082=__nfValue(v2081);
const v2083=Math.fround(__nfNumber(v2078) * __nfNumber(v2082));
v2067=__fn54(v2076,v2077,v2083);}else{
const v2084=v2040;
const v2085=v2042;
const v2086=v2041;
const v2087=v2043;
let v2088;if(v2087<v2086.length){v2088=v2086[v2087];}else{
v2088=__nfFromBits(0);}
const v2089=Math.fround((__nfNumber(__nfValue(v2044)))/(__nfNumber(__nfValue(v2088))));
const v2090=__fn54(v2084,v2085,v2089);
const v2091=v2043;
const v2092=__nfValue(v2044);
const v2093=v2041;
const v2094=v2042;
let v2095;if(v2094<v2093.length){v2095=v2093[v2094];}else{
v2095=__nfFromBits(0);}
const v2096=__nfValue(v2095);
const v2097=v2041;
const v2098=v2043;
let v2099;if(v2098<v2097.length){v2099=v2097[v2098];}else{
v2099=__nfFromBits(0);}
const v2100=__nfValue(v2099);
const v2101=v2041;
const v2102=v2043;
let v2103;if(v2102<v2101.length){v2103=v2101[v2102];}else{
v2103=__nfFromBits(0);}
const v2104=__nfValue(v2103);
const v2105=Math.fround((__nfNumber(Math.fround(__nfNumber(v2092) * __nfNumber(v2096))))/(__nfNumber(Math.fround(__nfNumber(v2100) * __nfNumber(v2104)))));
const v2106=__nfNeg(v2105);
v2067=__fn54(v2090,v2091,v2106);}
v2057=v2067;}
v2048=v2057;}
return v2048;}
function __fn61(v2107,v2108,v2109,v2110,v2111,v2112,v2113){
const v2114=v2107;
const v2115=v2114;
const v2116="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v2117;if((v2115===v2116)){
const v2118=v2108;
const v2119=v2110;
const v2120=__nfFromBits(1073741824);
const v2121=v2109;
const v2122=v2111;
let v2123;if(v2122<v2121.length){v2123=v2121[v2122];}else{
v2123=__nfFromBits(0);}
const v2124=__nfValue(v2123);
const v2125=Math.fround((__nfNumber(__nfValue(v2112)))/(__nfNumber(Math.fround(v2120 * __nfNumber(v2124)))));
v2117=__fn54(v2118,v2119,v2125);}else{
const v2126=v2114;
const v2127="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v2128;if((v2126===v2127)){
const v2129=v2108;
const v2130=v2110;
const v2131=__nfValue(v2112);
const v2132=__nfNeg(v2131);
v2128=__fn54(v2129,v2130,v2132);}else{
const v2133=v2114;
const v2134="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v2135;if((v2133===v2134)){
const v2136=v2109;
const v2137=v2110;
let v2138;if(v2137<v2136.length){v2138=v2136[v2137];}else{
v2138=__nfFromBits(0);}
let v2139;if(Number.isNaN(__nfNumber(__nfValue(v2138)))){
const v2140=v2108;
const v2141=v2110;
const v2142=__nfFromBits(2143289344);
v2139=__fn54(v2140,v2141,v2142);}else{
const v2143=v2109;
const v2144=v2110;
let v2145;if(v2144<v2143.length){v2145=v2143[v2144];}else{
v2145=__nfFromBits(0);}
const v2146=__nfValue(v2145);
const v2147=__nfFromBits(0);
let v2148;if(((__nfNumber(v2146)) > (__nfNumber(v2147)))){
const v2149=v2108;
const v2150=v2110;
const v2151=__nfValue(v2112);
v2148=__fn54(v2149,v2150,v2151);}else{
v2148=v2108;}
v2139=v2148;}
v2135=v2139;}else{
const v2152=v2113;
const v2153=v2152["boolean"];
const v2154="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough";
let v2155;if((v2153===v2154)){
const v2156=v2108;
const v2157=v2110;
const v2158=__nfValue(v2112);
v2155=__fn54(v2156,v2157,v2158);}else{
v2155=v2108;}
v2135=v2155;}
v2128=v2135;}
v2117=v2128;}
return v2117;}
function __fn62(v2159,v2160,v2161,v2162){
const v2163=v2160;
const v2164=v2163["wire"];
const v2165=1;
const v2166=(((v2164) - (v2165)) >>> 0);
const v2167=v2160;
const v2168=v2167["gradient"];
const v2169=v2168;
const v2170=v2166;
let v2171;if(v2170<v2169.length){v2171=v2169.item(v2170);}else{
v2171=__nfFromBits(0);}
const v2172=__nfValue(v2171);
const v2173=v2162;
const v2174=v2173["zero"];
const v2175="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
const v2176=(v2174===v2175);
let v2177=v2176;if(v2177){
const v2178=__nfValue(v2172);
const v2179=__nfFromBits(0);
v2177=((__nfNumber(v2178)) === (__nfNumber(v2179)));}
let v2180;if(v2177){
const v2181=v2168;
const v2182=v2166;
v2180=({["gradient"]:v2181,["wire"]:v2182});}else{
const v2183=v2159;
const v2184=v2183["kind"];
const v2185=v2184;
const v2186="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v2187;if((v2185===v2186)){
v2187=v2168;}else{
const v2188=v2184;
const v2189="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v2190;if((v2188===v2189)){
const v2191=v2159;
const v2192=v2191["binary"];
const v2193=v2168;
const v2194=v2161;
const v2195=v2159;
const v2196=v2195["a"];
const v2197=v2159;
const v2198=v2197["b"];
const v2199=__nfValue(v2172);
v2190=__fn60(v2192,v2193,v2194,v2196,v2198,v2199);}else{
const v2200=v2184;
const v2201="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v2202;if((v2200===v2201)){
const v2203=v2159;
const v2204=v2203["unary"];
const v2205=v2168;
const v2206=v2161;
const v2207=v2159;
const v2208=v2207["a"];
const v2209=v2166;
const v2210=__nfValue(v2172);
const v2211=v2162;
v2202=__fn61(v2204,v2205,v2206,v2208,v2209,v2210,v2211);}else{
const v2212=v2184;
const v2213="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v2214;if((v2212===v2213)){
const v2215=v2168;
const v2216=v2159;
const v2217=v2216["terms"];
const v2218=__nfValue(v2172);
v2214=__fn55(v2215,v2217,v2218);}else{
const v2219=v2184;
const v2220="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v2221;if((v2219===v2220)){
const v2222=v2168;
const v2223=v2161;
const v2224=v2159;
const v2225=v2224["terms"];
const v2226=v2159;
const v2227=__nfValue(v2226["value"]);
const v2228=v2159;
const v2229=v2228["gates"];
const v2230=v2159;
const v2231=__nfValue(v2230["gate_bias"]);
const v2232=__nfValue(v2172);
v2221=__fn58(v2222,v2223,v2225,v2227,v2229,v2231,v2232);}else{
const v2233=v2184;
const v2234="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v2235;if((v2233===v2234)){
const v2236=v2161;
const v2237=v2159;
const v2238=v2237["a"];
let v2239;if(v2238<v2236.length){v2239=v2236[v2238];}else{
v2239=__nfFromBits(0);}
const v2240=__nfValue(v2239);
const v2241=__nfFromBits(0);
let v2242;if(((__nfNumber(v2240)) > (__nfNumber(v2241)))){
const v2243=v2168;
const v2244=v2159;
const v2245=v2244["c"];
const v2246=__nfValue(v2172);
v2242=__fn54(v2243,v2245,v2246);}else{
const v2247=v2168;
const v2248=v2159;
const v2249=v2248["b"];
const v2250=__nfValue(v2172);
v2242=__fn54(v2247,v2249,v2250);}
v2235=v2242;}else{
const v2251=v2168;
const v2252=v2161;
const v2253=v2159;
const v2254=v2253["a"];
const v2255=v2159;
const v2256=v2255["table"];
const v2257=v2159;
const v2258=v2257["below"];
const v2259=v2159;
const v2260=v2259["above"];
const v2261=__nfValue(v2172);
const v2262=v2162;
v2235=__fn59(v2251,v2252,v2254,v2256,v2258,v2260,v2261,v2262);}
v2221=v2235;}
v2214=v2221;}
v2202=v2214;}
v2190=v2202;}
v2187=v2190;}
const v2263=v2187;
const v2264=v2263;
const v2265=v2166;
v2180=({["gradient"]:v2264,["wire"]:v2265});}
return v2180;}
function __fn63(v2266,v2267,v2268,v2269){
const v2270=(v2267).length;
const v2271=v2266;
const v2272=v2271["inputs"];
const v2273=v2266;
const v2274=(v2273["nodes"]).length;
const v2275=(((v2272) + (v2274)) >>> 0);
const v2276=!(v2270===v2275);
let v2277=v2276;if(!v2277){
const v2278=(v2268).length;
const v2279=v2266;
const v2280=(v2279["roots"]).length;
v2277=!(v2278===v2280);}
const v2281=v2277;
let v2282=v2281;if(!v2282){
const v2283=v2266;
const v2284=v2283["inputs"];
const v2285=v2266;
const v2286=v2285["nodes"];
const v2287=v2266;
const v2288=v2287["roots"];
const v2289=__fn38(v2284,v2286,v2288);
const v2290=false;
v2282=(v2289===v2290);}
let v2291;if(v2282){
v2291=({Err:"cotangent shape"});}else{
const v2292=v2266;
const v2293=v2267;
const v2294=v2268;
const v2295=v2269;
v2291=__fn64(v2292,v2293,v2294,v2295);}
return v2291;}
function __fn64(v2296,v2297,v2298,v2299){
const v2300=v2296;
const v2301=v2300["nodes"];
let v2302=true;
for(let v2303=0;v2303<v2301.length;v2303++){
const v2304=v2301[v2303];
const v2305=v2302;
let v2306=v2305;if(v2306){
const v2307=v2304;
const v2308=v2299;
v2306=__fn57(v2307,v2308);}
v2302=v2306;
}
const v2309=v2302;
const v2310=v2309;
const v2311=false;
let v2312;if((v2310===v2311)){
v2312=({Err:"explicit gradient policy required"});}else{
const v2313=__bufferFill((v2297).length,__nfFromBits(0));
const v2314=0;
const v2315=v2298;
const v2316=v2313;
const v2317=v2314;
let v2318=({["g"]:v2316,["i"]:v2317});
for(let v2319=0;v2319<v2315.length;v2319++){
const v2320=v2315[v2319];
const v2321=v2318;
const v2322=v2321["g"];
const v2323=v2318;
const v2324=v2323["i"];
const v2325=v2322;
const v2326=v2296;
const v2327=v2326["roots"];
const v2328=v2324;
let v2329;if(v2328<v2327.length){v2329=v2327[v2328];}else{
v2329=0;}
const v2330=v2329;
const v2331=__nfValue(v2320);
const v2332=__fn54(v2325,v2330,v2331);
const v2333=v2324;
const v2334=1;
const v2335=(((v2333) + (v2334)) >>> 0);
const v2336=v2332;
const v2337=v2335;
v2318=({["g"]:v2336,["i"]:v2337});
}
const v2338=v2318;
const v2339=v2338;
const v2340=v2339["g"];
const v2341=v2338;
const v2342=v2341["i"];
const v2343=v2296;
const v2344=v2343["nodes"];
const v2345=v2340;
const v2346=(v2297).length;
let v2347=({["gradient"]:v2345,["wire"]:v2346});
for(let v2348=v2344.length-1;v2348>=0;v2348--){
const v2349=v2344[v2348];
const v2350=v2349;
const v2351=v2347;
const v2352=v2297;
const v2353=v2299;
v2347=__fn62(v2350,v2351,v2352,v2353);
}
const v2354=v2347;
const v2355=v2354;
const v2356=v2355["gradient"];
const v2357=v2356.freeze();
const v2358=v2296;
v2312=({Ok:v2357.slice(0,v2358["inputs"])});}
return v2312;}
function __fn65(v2359,v2360,v2361,v2362){
const v2363=(v2361).length;
const v2364=v2359;
const v2365=(v2364["roots"]).length;
let v2366;if(!(v2363===v2365)){
v2366=({Err:"cotangent shape"});}else{
const v2367=v2359;
const v2368=v2360;
const v2369=__fn52(v2367,v2368);
let v2370;if(Object.hasOwn(v2369,"Ok")){
const v2371=v2369["Ok"];
const v2372=v2371;
const v2373=v2359;
const v2374=v2372;
const v2375=v2374["values"];
const v2376=v2361;
const v2377=v2362;
const v2378=__fn64(v2373,v2375,v2376,v2377);
let v2379;if(Object.hasOwn(v2378,"Ok")){
const v2380=v2378["Ok"];
const v2381=v2380;
const v2382=v2372;
const v2383=v2382["outputs"];
const v2384=v2381;
v2379=({Ok:({["outputs"]:v2383,["gradient"]:v2384})});}else{
const v2385=v2378["Err"];
v2379=({Err:v2385});}
v2370=v2379;}else{
const v2386=v2369["Err"];
v2370=({Err:v2386});}
v2366=v2370;}
return v2366;}
function __fn66(v2387,v2388,v2389,v2390){
const v2391=(v2389).length;
const v2392=0;
const v2393=(v2391===v2392);
let v2394=v2393;if(!v2394){
const v2395=(v2389).length;
const v2396=v2387;
const v2397=(v2396["roots"]).length;
v2394=!(v2395===v2397);}
let v2398;if(v2394){
v2398=({Err:"target shape"});}else{
const v2399=v2387;
const v2400=v2388;
const v2401=__fn52(v2399,v2400);
let v2402;if(Object.hasOwn(v2401,"Ok")){
const v2403=v2401["Ok"];
const v2404=v2403;
const v2405=v2404;
const v2406=v2405["outputs"];
const v2407=v2389;
const v2408=Math.min(v2406.length,v2407.length);
const v2409=new Array(v2408);
for(let v2410=0;v2410<v2408;v2410++){
const v2411=v2406[v2410];
const v2412=v2407[v2410];
const v2413=__nfValue(v2411);
const v2414=__nfValue(v2412);
v2409[v2410]=Math.fround(__nfNumber(v2413) - __nfNumber(v2414));
}
const v2415=v2409;
const v2416=Math.fround((v2389).length);
const v2417=v2415;
const v2418=v2417.length;
const v2419=new Array(v2418);
for(let v2420=0;v2420<v2418;v2420++){
const v2421=v2417[v2420];
const v2422=__nfValue(v2421);
const v2423=__nfValue(v2421);
v2419[v2420]=Math.fround(__nfNumber(v2422) * __nfNumber(v2423));
}
const v2424=v2419;
let v2425=0;for(let v2426=0;v2426<v2424.length;v2426++){
const v2427=v2424[v2426];
v2425=Math.fround(__nfNumber(v2425) + __nfNumber(v2427));}
const v2428=Math.fround((__nfNumber(v2425))/(__nfNumber(__nfValue(v2416))));
const v2429=Number.isFinite(__nfNumber(v2428));
const v2430=false;
let v2431;if((v2429===v2430)){
v2431=({Err:"nonfinite loss"});}else{
const v2432=v2415;
const v2433=v2432.length;
const v2434=new Array(v2433);
for(let v2435=0;v2435<v2433;v2435++){
const v2436=v2432[v2435];
const v2437=__nfFromBits(1073741824);
const v2438=__nfValue(v2436);
v2434[v2435]=Math.fround((__nfNumber(Math.fround(v2437 * __nfNumber(v2438))))/(__nfNumber(__nfValue(v2416))));
}
const v2439=v2434;
const v2440=v2387;
const v2441=v2404;
const v2442=v2441["values"];
const v2443=v2439;
const v2444=v2390;
const v2445=__fn64(v2440,v2442,v2443,v2444);
let v2446;if(Object.hasOwn(v2445,"Ok")){
const v2447=v2445["Ok"];
const v2448=v2447;
const v2449=v2428;
const v2450=v2404;
const v2451=v2450["outputs"];
const v2452=v2448;
v2446=({Ok:({["loss"]:v2449,["outputs"]:v2451,["gradient"]:v2452})});}else{
const v2453=v2445["Err"];
v2446=({Err:v2453});}
v2431=v2446;}
v2402=v2431;}else{
const v2454=v2401["Err"];
v2402=({Err:v2454});}
v2398=v2402;}
return v2398;}
function __into34(v2455,v2456){
const v2457=v2455;
const v2458=v2457["kind"];
const v2459=v2458;
const v2460="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v2461;if((v2459===v2460)){
const v2462=[];
const v2463=v2462.length;
for(let v2464=0;v2464<v2463;v2464++){
v2456[v2464]=v2462[v2464];
}
v2461=v2463;}else{
const v2465=v2458;
const v2466="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v2467;if((v2465===v2466)){
const v2468=v2455;
const v2469=v2468["a"];
const v2470=v2455;
const v2471=v2470["b"];
const v2472=[v2469,v2471];
const v2473=v2472.length;
for(let v2474=0;v2474<v2473;v2474++){
v2456[v2474]=v2472[v2474];
}
v2467=v2473;}else{
const v2475=v2458;
const v2476="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v2477;if((v2475===v2476)){
const v2478=v2455;
const v2479=v2478["a"];
const v2480=[v2479];
const v2481=v2480.length;
for(let v2482=0;v2482<v2481;v2482++){
v2456[v2482]=v2480[v2482];
}
v2477=v2481;}else{
const v2483=v2458;
const v2484="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v2485;if((v2483===v2484)){
const v2486=v2455;
const v2487=v2486["terms"];
const v2488=v2487.length;
for(let v2490=0;v2490<v2488;v2490++){
const v2491=v2487[v2490];
const v2492=v2491;
v2456[v2490]=v2492["wire"];
}
v2485=v2488;}else{
const v2493=v2458;
const v2494="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v2495;if((v2493===v2494)){
const v2496=v2455;
const v2497=v2496["terms"];
const v2498=v2497.length;
const v2499=new Array(v2498);
for(let v2500=0;v2500<v2498;v2500++){
const v2501=v2497[v2500];
const v2502=v2501;
v2499[v2500]=v2502["wire"];
}
const v2503=v2499;
const v2504=v2455;
const v2505=v2504["gates"];
const v2506=v2505.length;
const v2507=new Array(v2506);
for(let v2508=0;v2508<v2506;v2508++){
const v2509=v2505[v2508];
const v2510=v2509;
v2507[v2508]=v2510["wire"];
}
const v2511=v2507;
const v2512=v2503.length;
const v2513=v2511.length;
for(let v2514=0;v2514<v2512;v2514++){
v2456[0+v2514]=v2503[v2514];
}
for(let v2515=0;v2515<v2513;v2515++){
v2456[v2512+v2515]=v2511[v2515];
}
const v2516=v2512+v2513;
v2495=v2516;}else{
const v2517=v2458;
const v2518="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v2519;if((v2517===v2518)){
const v2520=v2455;
const v2521=v2520["a"];
const v2522=v2455;
const v2523=v2522["b"];
const v2524=v2455;
const v2525=v2524["c"];
const v2526=[v2521,v2523,v2525];
const v2527=v2526.length;
for(let v2528=0;v2528<v2527;v2528++){
v2456[v2528]=v2526[v2528];
}
v2519=v2527;}else{
const v2529=v2455;
const v2530=v2529["a"];
const v2531=[v2530];
const v2532=v2455;
const v2533=v2532["table"];
const v2534=v2531.length;
const v2535=v2533.length;
for(let v2536=0;v2536<v2534;v2536++){
v2456[0+v2536]=v2531[v2536];
}
for(let v2537=0;v2537<v2535;v2537++){
v2456[v2534+v2537]=v2533[v2537];
}
const v2538=v2534+v2535;
v2519=v2538;}
v2495=v2519;}
v2485=v2495;}
v2477=v2485;}
v2467=v2477;}
v2461=v2467;}
return v2461;}
function __prepareFn0(fixed){const v2548=true;let v2547=false,v2546;
const v2559=true;let v2558=false,v2557;
const v2567=true;let v2566=false,v2565;
const v2584=true;let v2583=false,v2582;
const v2589=true;let v2588=false,v2587;
const v2597=true;let v2596=false,v2595;
const v2624=true;let v2623=false,v2622;
const v2635=true;let v2634=false,v2633;
const v2639=true;let v2638=false,v2637;
const v2644=true;let v2643=false,v2642;
const v2653=true;let v2652=false,v2651;
const v2662=true;let v2661=false,v2660;
const v2688=true;let v2687=false,v2686;
const v2707=true;let v2706=false,v2705;
const v2718=true;let v2717=false,v2716;
const v2743=true;let v2742=false,v2741;
const v2751=true;let v2750=false,v2749;
const v2765=true;let v2764=false,v2763;
const v2803=true;let v2802=false,v2801;
const v2812=true;let v2811=false,v2810;
const v2818=true;let v2817=false,v2816;
const v2824=true;let v2823=false,v2822;
const v2837=true;let v2836=false,v2835;
const v2855=true;let v2854=false,v2853;
const v2865=true;let v2864=false,v2863;
const v2896=true;let v2895=false,v2894;
const v2911=true;let v2910=false,v2909;
const v2915=true;let v2914=false,v2913;
const v2955=true;let v2954=false,v2953;
const v2962=true;let v2961=false,v2960;
const v2967=true;let v2966=false,v2965;
const v2973=true;let v2972=false,v2971;
const v3009=true;let v3008=false,v3007;
return function(){const v2539=10;
const v2540=6;
const v2541=6;
const v2542=[v2540,v2541];
const v2543=4;
const v2544=10000;
let v2545;if(v2548&&v2547){v2545=v2546;}else{
const v2549=v2544;
const v2550=1000000;
const v2551=((v2549) > (v2550));
let v2552=v2551;if(!v2552){
const v2553=v2539;
const v2554=v2544;
v2552=((v2553) > (v2554));}
v2545=v2552;if(v2548){v2546=v2545;v2547=true;}}
let v2555;if(v2545){
v2555=({Err:"network capacity"});}else{
let v2556;if(v2559&&v2558){v2556=v2557;}else{
const v2560=0;
const v2561=0;
const v2562=v2539;
const v2563=true;
v2556=({["parameters"]:v2560,["nodes"]:v2561,["width"]:v2562,["valid"]:v2563});if(v2559){v2557=v2556;v2558=true;}}
let v2564;if(v2567&&v2566){v2564=v2565;}else{
const v2568=v2542;
const v2569=v2556;
let v2570=({["shape"]:v2569});
for(let v2571=0;v2571<v2568.length;v2571++){
const v2572=(v2568[v2571]>>>0);
const v2573=v2570;
const v2574=v2573["shape"];
const v2575=v2574;
const v2576=v2572;
const v2577=true;
const v2578=v2544;
const v2579=__fn3(v2575,v2576,v2577,v2578);
const v2580=v2579;
v2570=({["shape"]:v2580});
}
v2564=v2570;if(v2567){v2565=v2564;v2566=true;}}
let v2581;if(v2584&&v2583){v2581=v2582;}else{
const v2585=v2564;
v2581=v2585["shape"];if(v2584){v2582=v2581;v2583=true;}}
let v2586;if(v2589&&v2588){v2586=v2587;}else{
const v2590=v2581;
const v2591=v2543;
const v2592=false;
const v2593=v2544;
let v2594;if(v2597&&v2596){v2594=v2595;}else{
const v2598=v2590;
const v2599=v2598["valid"];
const v2600=false;
const v2601=(v2599===v2600);
let v2602=v2601;if(!v2602){
const v2603=v2590;
const v2604=v2603["parameters"];
const v2605=v2593;
v2602=((v2604) > (v2605));}
const v2606=v2602;
let v2607=v2606;if(!v2607){
const v2608=v2590;
const v2609=v2608["nodes"];
const v2610=v2593;
v2607=((v2609) > (v2610));}
const v2611=v2607;
let v2612=v2611;if(!v2612){
const v2613=v2590;
const v2614=v2613["width"];
const v2615=v2593;
v2612=((v2614) > (v2615));}
const v2616=v2612;
let v2617=v2616;if(!v2617){
const v2618=v2591;
const v2619=v2593;
v2617=((v2618) > (v2619));}
v2594=v2617;if(v2597){v2595=v2594;v2596=true;}}
let v2620;if(v2594){
let v2621;if(v2624&&v2623){v2621=v2622;}else{
v2621=false;if(v2624){v2622=v2621;v2623=true;}}
const v2625=v2590;
const v2626=v2625["parameters"];
const v2627=v2590;
const v2628=v2627["nodes"];
const v2629=v2590;
const v2630=v2629["width"];
const v2631=v2621;
v2620=({["parameters"]:v2626,["nodes"]:v2628,["width"]:v2630,["valid"]:v2631});}else{
let v2632;if(v2635&&v2634){v2632=v2633;}else{
let v2636;if(v2639&&v2638){v2636=v2637;}else{
v2636=v2592;if(v2639){v2637=v2636;v2638=true;}}
let v2640;if(v2636){
v2640=2;}else{
v2640=1;}
v2632=v2640;if(v2635){v2633=v2632;v2634=true;}}
let v2641;if(v2644&&v2643){v2641=v2642;}else{
const v2645=v2590;
const v2646=v2645["width"];
const v2647=1;
const v2648=(((v2646) + (v2647)) >>> 0);
const v2649=v2632;
v2641=(Math.imul(v2648,v2649) >>> 0);if(v2644){v2642=v2641;v2643=true;}}
let v2650;if(v2653&&v2652){v2650=v2651;}else{
const v2654=v2590;
const v2655=v2654["width"];
const v2656=v2632;
const v2657=(Math.imul(v2655,v2656) >>> 0);
const v2658=1;
v2650=(((v2657) + (v2658)) >>> 0);if(v2653){v2651=v2650;v2652=true;}}
let v2659;if(v2662&&v2661){v2659=v2660;}else{
const v2663=v2591;
const v2664=v2593;
const v2665=v2590;
const v2666=v2665["parameters"];
const v2667=(((v2664) - (v2666)) >>> 0);
const v2668=v2641;
let v2669;if(v2668===0 ){
v2669=0;}else{
v2669=(Math.trunc(v2667/v2668)+0);}
const v2670=v2669;
const v2671=((v2663) <= (v2670));
let v2672=v2671;if(v2672){
const v2673=v2650;
const v2674=0;
const v2675=(v2673===v2674);
let v2676=v2675;if(!v2676){
const v2677=v2591;
const v2678=v2593;
const v2679=v2590;
const v2680=v2679["nodes"];
const v2681=(((v2678) - (v2680)) >>> 0);
const v2682=v2650;
let v2683;if(v2682===0 ){
v2683=0;}else{
v2683=(Math.trunc(v2681/v2682)+0);}
const v2684=v2683;
v2676=((v2677) <= (v2684));}
v2672=v2676;}
v2659=v2672;if(v2662){v2660=v2659;v2661=true;}}
let v2685;if(v2688&&v2687){v2685=v2686;}else{
v2685=v2659;if(v2688){v2686=v2685;v2687=true;}}
let v2689;if(v2685){
const v2690=v2590;
const v2691=v2690["parameters"];
const v2692=v2641;
const v2693=v2591;
const v2694=(Math.imul(v2692,v2693) >>> 0);
const v2695=(((v2691) + (v2694)) >>> 0);
const v2696=v2590;
const v2697=v2696["nodes"];
const v2698=v2650;
const v2699=v2591;
const v2700=(Math.imul(v2698,v2699) >>> 0);
const v2701=(((v2697) + (v2700)) >>> 0);
const v2702=v2591;
const v2703=true;
v2689=({["parameters"]:v2695,["nodes"]:v2701,["width"]:v2702,["valid"]:v2703});}else{
let v2704;if(v2707&&v2706){v2704=v2705;}else{
v2704=false;if(v2707){v2705=v2704;v2706=true;}}
const v2708=v2590;
const v2709=v2708["parameters"];
const v2710=v2590;
const v2711=v2710["nodes"];
const v2712=v2590;
const v2713=v2712["width"];
const v2714=v2704;
v2689=({["parameters"]:v2709,["nodes"]:v2711,["width"]:v2713,["valid"]:v2714});}
v2620=v2689;}
v2586=v2620;if(v2589){v2587=v2586;v2588=true;}}
let v2715;if(v2718&&v2717){v2715=v2716;}else{
const v2719=v2586;
const v2720=v2719["valid"];
const v2721=false;
const v2722=(v2720===v2721);
let v2723=v2722;if(!v2723){
const v2724=v2539;
const v2725=v2544;
const v2726=v2586;
const v2727=v2726["parameters"];
const v2728=(((v2725) - (v2727)) >>> 0);
v2723=((v2724) > (v2728));}
const v2729=v2723;
let v2730=v2729;if(!v2730){
const v2731=v2586;
const v2732=v2731["nodes"];
const v2733=v2544;
const v2734=v2586;
const v2735=v2734["parameters"];
const v2736=(((v2733) - (v2735)) >>> 0);
const v2737=v2539;
const v2738=(((v2736) - (v2737)) >>> 0);
v2730=((v2732) > (v2738));}
v2715=v2730;if(v2718){v2716=v2715;v2717=true;}}
let v2739;if(v2715){
v2739=({Err:"network capacity"});}else{
let v2740;if(v2743&&v2742){v2740=v2741;}else{
const v2744=v2586;
const v2745=v2744["parameters"];
const v2746=v2539;
v2740=(((v2745) + (v2746)) >>> 0);if(v2743){v2741=v2740;v2742=true;}}
const v2747=new __InkBuffer([]);
let v2748;if(v2751&&v2750){v2748=v2749;}else{
const v2752=v2539;
let v2753=v2747;
for(let v2754=0;v2754<v2752;v2754++){
if(false){break;}
const v2755=(v2754>>>0);
const v2756=v2753;
const v2757=v2586;
const v2758=v2757["parameters"];
const v2759=v2755;
const v2760=(((v2758) + (v2759)) >>> 0);
v2753=__tempEdit(v2756,"push",v2760);}
const v2761=v2753;
v2748=v2761.freeze();if(v2751){v2749=v2748;v2750=true;}}
let v2762;if(v2765&&v2764){v2762=v2763;}else{
v2762=v2748;if(v2765){v2763=v2762;v2764=true;}}
const v2767=new __InkBuffer([]);
const v2768=new __InkBuffer([]);
const v2769=0;
const v2770=v2740;
const v2766=({["nodes"]:v2767,["outputs"]:v2768,["parameter"]:v2769,["inputs"]:v2770});
const v2772=v2542;
const v2773=v2766;
const v2774=v2762;
let v2775=({["layer"]:v2773,["wires"]:v2774});
for(let v2776=0;v2776<v2772.length;v2776++){
const v2777=(v2772[v2776]>>>0);
const v2778=v2775;
const v2779=v2778["layer"];
const v2780=v2775;
const v2781=v2780["wires"];
const v2782=v2779;
const v2783=v2777;
const v2784=v2781;
const v2785=__fn7(v2782,v2783,v2784);
const v2786=v2785;
const v2787=v2786["outputs"];
const v2788=v2787.freeze();
const v2789=v2785;
const v2790=v2789["nodes"];
const v2791=new __InkBuffer([]);
const v2792=v2785;
const v2793=v2792["parameter"];
const v2794=v2740;
const v2795=({["nodes"]:v2790,["outputs"]:v2791,["parameter"]:v2793,["inputs"]:v2794});
const v2796=v2795;
const v2797=v2788;
v2775=({["layer"]:v2796,["wires"]:v2797});
}
const v2771=v2775;
const v2799=v2771;
const v2798=v2799["layer"];
let v2800;if(v2803&&v2802){v2800=v2801;}else{
const v2804=v2771;
v2800=v2804["wires"];if(v2803){v2801=v2800;v2802=true;}}
const v2806=v2798;
const v2807=v2543;
const v2808=v2800;
const v2805=__fn8(v2806,v2807,v2808);
let v2809;if(v2812&&v2811){v2809=v2810;}else{
const v2813=v2805;
const v2814=v2813["nodes"];
v2809=v2814.freeze();if(v2812){v2810=v2809;v2811=true;}}
let v2815;if(v2818&&v2817){v2815=v2816;}else{
const v2819=v2805;
const v2820=v2819["outputs"];
v2815=v2820.freeze();if(v2818){v2816=v2815;v2817=true;}}
let v2821;if(v2824&&v2823){v2821=v2822;}else{
const v2825=v2805;
const v2826=v2825["parameter"];
const v2827=v2586;
const v2828=v2827["parameters"];
v2821=!(v2826===v2828);if(v2824){v2822=v2821;v2823=true;}}
let v2829;if(v2821){
v2829=({Err:"network parameter layout"});}else{
const v2830=v2740;
const v2831=v2809;
const v2832=v2815;
const v2833=v2544;
let v2834;if(v2837&&v2836){v2834=v2835;}else{
const v2838=v2831;
const v2839=v2838.length;
const v2840=4294967295;
const v2841=((v2839) > (v2840));
let v2842=v2841;if(!v2842){
const v2843=v2830;
const v2844=v2833;
v2842=((v2843) > (v2844));}
const v2845=v2842;
let v2846=v2845;if(!v2846){
const v2847=(v2831).length;
const v2848=v2833;
const v2849=v2830;
const v2850=(((v2848) - (v2849)) >>> 0);
v2846=((v2847) > (v2850));}
v2834=v2846;if(v2837){v2835=v2834;v2836=true;}}
let v2851;if(v2834){
v2851=({Err:"graph capacity"});}else{
let v2852;if(v2855&&v2854){v2852=v2853;}else{
const v2856=v2830;
const v2857=v2831;
const v2858=v2832;
const v2859=__fn38(v2856,v2857,v2858);
const v2860=false;
v2852=(v2859===v2860);if(v2855){v2853=v2852;v2854=true;}}
let v2861;if(v2852){
v2861=({Err:"graph is not topologically ordered"});}else{
let v2862;if(v2865&&v2864){v2862=v2863;}else{
const v2866=v2830;
const v2867=(v2831).length;
v2862=(((v2866) + (v2867)) >>> 0);if(v2865){v2863=v2862;v2864=true;}}
const v2868=__bufferFill(v2862,false);
const v2870=v2832;
const v2871=v2868;
let v2872=({["live"]:v2871});
for(let v2873=0;v2873<v2870.length;v2873++){
const v2874=(v2870[v2873]>>>0);
const v2875=v2872;
const v2876=v2875["live"];
const v2877=v2876;
const v2878=v2874;
const v2879=__tempSet(v2877,v2878,true,false);
const v2880=v2879;
v2872=({["live"]:v2880});
}
const v2869=v2872;
const v2882=v2869;
const v2881=v2882["live"];
const v2884=v2831;
const v2885=v2881;
const v2886=v2862;
let v2887=({["live"]:v2885,["wire"]:v2886});
for(let v2888=v2884.length-1;v2888>=0;v2888--){
const v2889=v2884[v2888];
const v2890=v2889;
const v2891=v2887;
const v2892=v2830;
v2887=__fn36(v2890,v2891,v2892);
}
const v2883=v2887;
let v2893;if(v2896&&v2895){v2893=v2894;}else{
const v2897=v2883;
const v2898=v2897["live"];
v2893=v2898.freeze();if(v2896){v2894=v2893;v2895=true;}}
const v2899=__bufferFill(v2862,0);
const v2901=v2830;
let v2902=v2899;
for(let v2903=0;v2903<v2901;v2903++){
if(false){break;}
const v2904=(v2903>>>0);
const v2905=v2902;
const v2906=v2904;
v2902=__tempSet(v2905,v2906,v2904,false);}
const v2900=v2902;
const v2907=v2900;
let v2908;if(v2911&&v2910){v2908=v2909;}else{
v2908=v2830;if(v2911){v2909=v2908;v2910=true;}}
let v2912;if(v2915&&v2914){v2912=v2913;}else{
v2912=v2830;if(v2915){v2913=v2912;v2914=true;}}
const v2917=v2831;
const v2918=v2912;
const v2919=v2907;
const v2920=v2908;
let v2921=({["next"]:v2918,["positions"]:v2919,["wire"]:v2920});
for(let v2922=0;v2922<v2917.length;v2922++){
const v2923=v2917[v2922];
const v2924=v2921;
const v2925=v2924["next"];
const v2926=v2921;
const v2927=v2926["positions"];
const v2928=v2921;
const v2929=v2928["wire"];
const v2930=v2893;
const v2931=v2929;
let v2932;if(v2931<v2930.length){v2932=v2930[v2931];}else{
v2932=false;}
let v2933;if(v2932){
const v2934=v2927;
const v2935=v2929;
const v2936=__tempSet(v2934,v2935,v2925,false);
const v2937=v2925;
const v2938=1;
const v2939=(((v2937) + (v2938)) >>> 0);
const v2940=v2929;
const v2941=1;
const v2942=(((v2940) + (v2941)) >>> 0);
const v2943=v2939;
const v2944=v2936;
const v2945=v2942;
v2933=({["next"]:v2943,["positions"]:v2944,["wire"]:v2945});}else{
const v2946=v2929;
const v2947=1;
const v2948=(((v2946) + (v2947)) >>> 0);
const v2949=v2925;
const v2950=v2927;
const v2951=v2948;
v2933=({["next"]:v2949,["positions"]:v2950,["wire"]:v2951});}
v2921=v2933;
}
const v2916=v2921;
let v2952;if(v2955&&v2954){v2952=v2953;}else{
const v2956=v2916;
v2952=v2956["next"];if(v2955){v2953=v2952;v2954=true;}}
const v2958=v2916;
const v2957=v2958["positions"];
let v2959;if(v2962&&v2961){v2959=v2960;}else{
const v2963=v2916;
v2959=v2963["wire"];if(v2962){v2960=v2959;v2961=true;}}
let v2964;if(v2967&&v2966){v2964=v2965;}else{
const v2968=v2957;
v2964=v2968.freeze();if(v2967){v2965=v2964;v2966=true;}}
const v2969=new __InkBuffer([]);
let v2970;if(v2973&&v2972){v2970=v2971;}else{
v2970=v2830;if(v2973){v2971=v2970;v2972=true;}}
const v2975=v2831;
const v2976=v2969;
const v2977=v2970;
let v2978=({["compact"]:v2976,["wire"]:v2977});
for(let v2979=0;v2979<v2975.length;v2979++){
const v2980=v2975[v2979];
const v2981=v2978;
const v2982=v2981["compact"];
const v2983=v2978;
const v2984=v2983["wire"];
const v2985=v2893;
const v2986=v2984;
let v2987;if(v2986<v2985.length){v2987=v2985[v2986];}else{
v2987=false;}
let v2988;if(v2987){
const v2989=v2982;
const v2990=v2980;
const v2991=v2964;
const v2992=__fn35(v2990,v2991);
const v2993=__tempEdit(v2989,"push",v2992);
const v2994=v2984;
const v2995=1;
const v2996=(((v2994) + (v2995)) >>> 0);
const v2997=v2993;
const v2998=v2996;
v2988=({["compact"]:v2997,["wire"]:v2998});}else{
const v2999=v2984;
const v3000=1;
const v3001=(((v2999) + (v3000)) >>> 0);
const v3002=v2982;
const v3003=v3001;
v2988=({["compact"]:v3002,["wire"]:v3003});}
v2978=v2988;
}
const v2974=v2978;
const v3005=v2974;
const v3004=v3005["compact"];
let v3006;if(v3009&&v3008){v3006=v3007;}else{
const v3010=v2974;
v3006=v3010["wire"];if(v3009){v3007=v3006;v3008=true;}}
const v3011=v2830;
const v3012=v3004;
const v3013=v3012.freeze();
const v3014=v2832;
const v3015=v3014.length;
const v3016=new Array(v3015);
for(let v3017=0;v3017<v3015;v3017++){
const v3018=(v3014[v3017]>>>0);
const v3019=v2964;
const v3020=v3018;
let v3021;if(v3020<v3019.length){v3021=v3019[v3020];}else{
v3021=0;}
v3016[v3017]=v3021;
}
const v3022=v3016;
v2861=({Ok:({["inputs"]:v3011,["nodes"]:v3013,["roots"]:v3022})});}
v2851=v2861;}
const v3023=v2851;
const v3025=v3023;
let v3026;if(Object.hasOwn(v3025,"Ok")){
const v3027=v3025["Ok"];
const v3028=v3027;
const v3029=v3028;
const v3030=v2586;
const v3031=v3030["parameters"];
const v3032=v2539;
const v3033=v2543;
v3026=({Ok:({["graph"]:v3029,["parameters"]:v3031,["features"]:v3032,["outputs"]:v3033})});}else{
const v3034=v3025["Err"];
v3026=({Err:v3034});}
v2829=v3026;}
v2739=v2829;}
v2555=v2739;}
return v2555;};}
function __prepareFn1(fixed){const v3044=fixed[0]&&fixed[1]&&fixed[2];let v3043=false,v3042;
const v3069=fixed[0]&&fixed[1]&&fixed[2];let v3068=false,v3067;
const v3077=fixed[0];let v3076=false,v3075;
const v3100=fixed[0]&&fixed[1]&&fixed[2];let v3099=false,v3098;
const v3106=fixed[0]&&fixed[1]&&fixed[2];let v3105=false,v3104;
return function(v3035,v3036,v3037){const v3038=v3035;
const v3039=v3036;
const v3040=v3037;
let v3041;if(v3044&&v3043){v3041=v3042;}else{
const v3045=(v3039).length;
const v3046=v3038;
const v3047=v3046["parameters"];
const v3048=!(v3045===v3047);
let v3049=v3048;if(!v3049){
const v3050=(v3040).length;
const v3051=v3038;
const v3052=v3051["features"];
v3049=!(v3050===v3052);}
v3041=v3049;if(v3044){v3042=v3041;v3043=true;}}
let v3053;if(v3041){
v3053=({Err:"network input shape"});}else{
const v3054=v3038;
const v3055=v3054["graph"];
const v3056=v3039;
const v3057=v3040;
const v3058=v3056.length;
const v3059=v3057.length;
const v3060=new Array(v3058+v3059);
for(let v3061=0;v3061<v3058;v3061++){v3060[v3061]=v3056[v3061];}
for(let v3062=0;v3062<v3059;v3062++){v3060[v3058+v3062]=v3057[v3062];}
const v3063=v3060;
const v3064=v3055;
const v3065=v3063;
let v3066;if(v3069&&v3068){v3066=v3067;}else{
const v3070=(v3065).length;
const v3071=v3064;
const v3072=v3071["inputs"];
v3066=!(v3070===v3072);if(v3069){v3067=v3066;v3068=true;}}
let v3073;if(v3066){
v3073=({Err:"graph input shape"});}else{
let v3074;if(v3077&&v3076){v3074=v3075;}else{
const v3078=v3064;
const v3079=v3078["inputs"];
const v3080=v3064;
const v3081=v3080["nodes"];
const v3082=v3064;
const v3083=v3082["roots"];
const v3084=__fn38(v3079,v3081,v3083);
const v3085=false;
v3074=(v3084===v3085);if(v3077){v3075=v3074;v3076=true;}}
let v3086;if(v3074){
v3086=({Err:"invalid prepared graph"});}else{
const v3088=v3064;
const v3089=v3088["nodes"];
const v3090=new __InkBuffer(Array.from(v3065));
const v3091=true;
let v3092=({["values"]:v3090,["finite_indices"]:v3091});
for(let v3093=0;v3093<v3089.length;v3093++){
const v3094=v3089[v3093];
const v3095=v3094;
const v3096=v3092;
v3092=__fn51(v3095,v3096);
}
const v3087=v3092;
let v3097;if(v3100&&v3099){v3097=v3098;}else{
const v3101=v3087;
const v3102=v3101["values"];
v3097=v3102.freeze();if(v3100){v3098=v3097;v3099=true;}}
let v3103;if(v3106&&v3105){v3103=v3104;}else{
const v3107=v3087;
const v3108=v3107["finite_indices"];
const v3109=false;
v3103=(v3108===v3109);if(v3106){v3104=v3103;v3105=true;}}
let v3110;if(v3103){
v3110=({Err:"nonfinite graph index"});}else{
const v3111=v3097;
const v3112=v3064;
const v3113=v3112["roots"];
const v3114=v3113.length;
const v3115=new Array(v3114);
for(let v3116=0;v3116<v3114;v3116++){
const v3117=(v3113[v3116]>>>0);
const v3118=v3097;
const v3119=v3117;
let v3120;if(v3119<v3118.length){v3120=v3118[v3119];}else{
v3120=__nfFromBits(0);}
v3115[v3116]=__nfValue(v3120);
}
const v3121=v3115;
v3110=({Ok:({["values"]:v3111,["outputs"]:v3121})});}
v3086=v3110;}
v3073=v3086;}
const v3122=v3073;
const v3124=v3122;
let v3125;if(Object.hasOwn(v3124,"Ok")){
const v3126=v3124["Ok"];
const v3127=v3126;
v3125=({Ok:v3127["outputs"]});}else{v3125=({Err:v3124.Err});}
v3053=v3125;}
return v3053;};}
function __prepareFn2(fixed){const v3139=fixed[0]&&fixed[1]&&fixed[2];let v3138=false,v3137;
const v3164=fixed[0]&&fixed[3];let v3163=false,v3162;
const v3178=fixed[0]&&fixed[1]&&fixed[2];let v3177=false,v3176;
const v3186=fixed[0];let v3185=false,v3184;
const v3209=fixed[0]&&fixed[1]&&fixed[2];let v3208=false,v3207;
const v3215=fixed[0]&&fixed[1]&&fixed[2];let v3214=false,v3213;
return function(v3128,v3129,v3130,v3131){const v3132=v3128;
const v3133=v3129;
const v3134=v3130;
const v3135=v3131;
let v3136;if(v3139&&v3138){v3136=v3137;}else{
const v3140=(v3133).length;
const v3141=v3132;
const v3142=v3141["parameters"];
const v3143=!(v3140===v3142);
let v3144=v3143;if(!v3144){
const v3145=(v3134).length;
const v3146=v3132;
const v3147=v3146["features"];
v3144=!(v3145===v3147);}
v3136=v3144;if(v3139){v3137=v3136;v3138=true;}}
let v3148;if(v3136){
v3148=({Err:"network input shape"});}else{
const v3149=v3132;
const v3150=v3149["graph"];
const v3151=v3133;
const v3152=v3134;
const v3153=v3151.length;
const v3154=v3152.length;
const v3155=new Array(v3153+v3154);
for(let v3156=0;v3156<v3153;v3156++){v3155[v3156]=v3151[v3156];}
for(let v3157=0;v3157<v3154;v3157++){v3155[v3153+v3157]=v3152[v3157];}
const v3158=v3155;
const v3159=v3135;
const v3160=__fn33();
let v3161;if(v3164&&v3163){v3161=v3162;}else{
const v3165=(v3159).length;
const v3166=0;
const v3167=(v3165===v3166);
let v3168=v3167;if(!v3168){
const v3169=(v3159).length;
const v3170=v3150;
const v3171=(v3170["roots"]).length;
v3168=!(v3169===v3171);}
v3161=v3168;if(v3164){v3162=v3161;v3163=true;}}
let v3172;if(v3161){
v3172=({Err:"target shape"});}else{
const v3173=v3150;
const v3174=v3158;
let v3175;if(v3178&&v3177){v3175=v3176;}else{
const v3179=(v3174).length;
const v3180=v3173;
const v3181=v3180["inputs"];
v3175=!(v3179===v3181);if(v3178){v3176=v3175;v3177=true;}}
let v3182;if(v3175){
v3182=({Err:"graph input shape"});}else{
let v3183;if(v3186&&v3185){v3183=v3184;}else{
const v3187=v3173;
const v3188=v3187["inputs"];
const v3189=v3173;
const v3190=v3189["nodes"];
const v3191=v3173;
const v3192=v3191["roots"];
const v3193=__fn38(v3188,v3190,v3192);
const v3194=false;
v3183=(v3193===v3194);if(v3186){v3184=v3183;v3185=true;}}
let v3195;if(v3183){
v3195=({Err:"invalid prepared graph"});}else{
const v3197=v3173;
const v3198=v3197["nodes"];
const v3199=new __InkBuffer(Array.from(v3174));
const v3200=true;
let v3201=({["values"]:v3199,["finite_indices"]:v3200});
for(let v3202=0;v3202<v3198.length;v3202++){
const v3203=v3198[v3202];
const v3204=v3203;
const v3205=v3201;
v3201=__fn51(v3204,v3205);
}
const v3196=v3201;
let v3206;if(v3209&&v3208){v3206=v3207;}else{
const v3210=v3196;
const v3211=v3210["values"];
v3206=v3211.freeze();if(v3209){v3207=v3206;v3208=true;}}
let v3212;if(v3215&&v3214){v3212=v3213;}else{
const v3216=v3196;
const v3217=v3216["finite_indices"];
const v3218=false;
v3212=(v3217===v3218);if(v3215){v3213=v3212;v3214=true;}}
let v3219;if(v3212){
v3219=({Err:"nonfinite graph index"});}else{
const v3220=v3206;
const v3221=v3173;
const v3222=v3221["roots"];
const v3223=v3222.length;
const v3224=new Array(v3223);
for(let v3225=0;v3225<v3223;v3225++){
const v3226=(v3222[v3225]>>>0);
const v3227=v3206;
const v3228=v3226;
let v3229;if(v3228<v3227.length){v3229=v3227[v3228];}else{
v3229=__nfFromBits(0);}
v3224[v3225]=__nfValue(v3229);
}
const v3230=v3224;
v3219=({Ok:({["values"]:v3220,["outputs"]:v3230})});}
v3195=v3219;}
v3182=v3195;}
const v3231=v3182;
const v3233=v3231;
let v3234;if(Object.hasOwn(v3233,"Ok")){
const v3235=v3233["Ok"];
const v3236=v3235;
const v3237=v3236;
const v3238=v3237["outputs"];
const v3239=v3159;
const v3240=Math.min(v3238.length,v3239.length);
const v3241=new Array(v3240);
for(let v3242=0;v3242<v3240;v3242++){
const v3243=v3238[v3242];
const v3244=v3239[v3242];
const v3245=__nfValue(v3243);
const v3246=__nfValue(v3244);
v3241[v3242]=Math.fround(__nfNumber(v3245) - __nfNumber(v3246));
}
const v3247=v3241;
const v3248=Math.fround((v3159).length);
const v3249=v3247;
const v3250=v3249.length;
const v3251=new Array(v3250);
for(let v3252=0;v3252<v3250;v3252++){
const v3253=v3249[v3252];
const v3254=__nfValue(v3253);
const v3255=__nfValue(v3253);
v3251[v3252]=Math.fround(__nfNumber(v3254) * __nfNumber(v3255));
}
const v3256=v3251;
let v3257=0;for(let v3258=0;v3258<v3256.length;v3258++){
const v3259=v3256[v3258];
v3257=Math.fround(__nfNumber(v3257) + __nfNumber(v3259));}
const v3260=Math.fround((__nfNumber(v3257))/(__nfNumber(__nfValue(v3248))));
const v3261=Number.isFinite(__nfNumber(v3260));
const v3262=false;
let v3263;if((v3261===v3262)){
v3263=({Err:"nonfinite loss"});}else{
const v3264=v3247;
const v3265=v3264.length;
const v3266=new Array(v3265);
for(let v3267=0;v3267<v3265;v3267++){
const v3268=v3264[v3267];
const v3269=__nfFromBits(1073741824);
const v3270=__nfValue(v3268);
v3266[v3267]=Math.fround((__nfNumber(Math.fround(v3269 * __nfNumber(v3270))))/(__nfNumber(__nfValue(v3248))));
}
const v3271=v3266;
const v3272=v3150;
const v3273=v3236;
const v3274=v3273["values"];
const v3275=v3271;
const v3276=v3160;
const v3277=__fn64(v3272,v3274,v3275,v3276);
let v3278;if(Object.hasOwn(v3277,"Ok")){
const v3279=v3277["Ok"];
const v3280=v3279;
const v3281=v3260;
const v3282=v3236;
const v3283=v3282["outputs"];
const v3284=v3280;
v3278=({Ok:({["loss"]:v3281,["outputs"]:v3283,["gradient"]:v3284})});}else{
const v3285=v3277["Err"];
v3278=({Err:v3285});}
v3263=v3278;}
v3234=v3263;}else{
const v3286=v3233["Err"];
v3234=({Err:v3286});}
v3172=v3234;}
const v3287=v3172;
const v3289=v3287;
let v3290;if(Object.hasOwn(v3289,"Ok")){
const v3291=v3289["Ok"];
const v3292=v3291;
const v3293=v3292;
const v3294=__nfValue(v3293["loss"]);
const v3295=v3292;
const v3296=v3295["outputs"];
const v3297=v3292;
const v3298=v3297["gradient"];
const v3299=v3132;
const v3300=v3298.slice(0,v3299["parameters"]);
v3290=({Ok:({["loss"]:v3294,["outputs"]:v3296,["gradient"]:v3300})});}else{
const v3301=v3289["Err"];
v3290=({Err:v3301});}
v3148=v3290;}
return v3148;};}
function __prepareFn3(fixed){const v3309=fixed[0]&&fixed[1]&&fixed[3];let v3308=false,v3307;
const v3336=true;let v3335=false,v3334;
const v3347=fixed[2];let v3346=false,v3345;
const v3351=fixed[2];let v3350=false,v3349;
const v3356=fixed[0]&&fixed[2];let v3355=false,v3354;
const v3365=fixed[0]&&fixed[2];let v3364=false,v3363;
const v3374=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3373=false,v3372;
const v3400=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3399=false,v3398;
const v3419=true;let v3418=false,v3417;
return function(v3302,v3303,v3304,v3305){let v3306;if(v3309&&v3308){v3306=v3307;}else{
const v3310=v3302;
const v3311=v3310["valid"];
const v3312=false;
const v3313=(v3311===v3312);
let v3314=v3313;if(!v3314){
const v3315=v3302;
const v3316=v3315["parameters"];
const v3317=v3305;
v3314=((v3316) > (v3317));}
const v3318=v3314;
let v3319=v3318;if(!v3319){
const v3320=v3302;
const v3321=v3320["nodes"];
const v3322=v3305;
v3319=((v3321) > (v3322));}
const v3323=v3319;
let v3324=v3323;if(!v3324){
const v3325=v3302;
const v3326=v3325["width"];
const v3327=v3305;
v3324=((v3326) > (v3327));}
const v3328=v3324;
let v3329=v3328;if(!v3329){
const v3330=v3303;
const v3331=v3305;
v3329=((v3330) > (v3331));}
v3306=v3329;if(v3309){v3307=v3306;v3308=true;}}
let v3332;if(v3306){
let v3333;if(v3336&&v3335){v3333=v3334;}else{
v3333=false;if(v3336){v3334=v3333;v3335=true;}}
const v3337=v3302;
const v3338=v3337["parameters"];
const v3339=v3302;
const v3340=v3339["nodes"];
const v3341=v3302;
const v3342=v3341["width"];
const v3343=v3333;
v3332=({["parameters"]:v3338,["nodes"]:v3340,["width"]:v3342,["valid"]:v3343});}else{
let v3344;if(v3347&&v3346){v3344=v3345;}else{
let v3348;if(v3351&&v3350){v3348=v3349;}else{
v3348=v3304;if(v3351){v3349=v3348;v3350=true;}}
let v3352;if(v3348){
v3352=2;}else{
v3352=1;}
v3344=v3352;if(v3347){v3345=v3344;v3346=true;}}
let v3353;if(v3356&&v3355){v3353=v3354;}else{
const v3357=v3302;
const v3358=v3357["width"];
const v3359=1;
const v3360=(((v3358) + (v3359)) >>> 0);
const v3361=v3344;
v3353=(Math.imul(v3360,v3361) >>> 0);if(v3356){v3354=v3353;v3355=true;}}
let v3362;if(v3365&&v3364){v3362=v3363;}else{
const v3366=v3302;
const v3367=v3366["width"];
const v3368=v3344;
const v3369=(Math.imul(v3367,v3368) >>> 0);
const v3370=1;
v3362=(((v3369) + (v3370)) >>> 0);if(v3365){v3363=v3362;v3364=true;}}
let v3371;if(v3374&&v3373){v3371=v3372;}else{
const v3375=v3303;
const v3376=v3305;
const v3377=v3302;
const v3378=v3377["parameters"];
const v3379=(((v3376) - (v3378)) >>> 0);
const v3380=v3353;
let v3381;if(v3380===0 ){
v3381=0;}else{
v3381=(Math.trunc(v3379/v3380)+0);}
const v3382=v3381;
const v3383=((v3375) <= (v3382));
let v3384=v3383;if(v3384){
const v3385=v3362;
const v3386=0;
const v3387=(v3385===v3386);
let v3388=v3387;if(!v3388){
const v3389=v3303;
const v3390=v3305;
const v3391=v3302;
const v3392=v3391["nodes"];
const v3393=(((v3390) - (v3392)) >>> 0);
const v3394=v3362;
let v3395;if(v3394===0 ){
v3395=0;}else{
v3395=(Math.trunc(v3393/v3394)+0);}
const v3396=v3395;
v3388=((v3389) <= (v3396));}
v3384=v3388;}
v3371=v3384;if(v3374){v3372=v3371;v3373=true;}}
let v3397;if(v3400&&v3399){v3397=v3398;}else{
v3397=v3371;if(v3400){v3398=v3397;v3399=true;}}
let v3401;if(v3397){
const v3402=v3302;
const v3403=v3402["parameters"];
const v3404=v3353;
const v3405=v3303;
const v3406=(Math.imul(v3404,v3405) >>> 0);
const v3407=(((v3403) + (v3406)) >>> 0);
const v3408=v3302;
const v3409=v3408["nodes"];
const v3410=v3362;
const v3411=v3303;
const v3412=(Math.imul(v3410,v3411) >>> 0);
const v3413=(((v3409) + (v3412)) >>> 0);
const v3414=v3303;
const v3415=true;
v3401=({["parameters"]:v3407,["nodes"]:v3413,["width"]:v3414,["valid"]:v3415});}else{
let v3416;if(v3419&&v3418){v3416=v3417;}else{
v3416=false;if(v3419){v3417=v3416;v3418=true;}}
const v3420=v3302;
const v3421=v3420["parameters"];
const v3422=v3302;
const v3423=v3422["nodes"];
const v3424=v3302;
const v3425=v3424["width"];
const v3426=v3416;
v3401=({["parameters"]:v3421,["nodes"]:v3423,["width"]:v3425,["valid"]:v3426});}
v3332=v3401;}
return v3332;};}
function __prepareFn9(fixed){const v3434=fixed[0]&&fixed[3];let v3433=false,v3432;
const v3445=fixed[0];let v3444=false,v3443;
const v3453=fixed[0]&&fixed[1]&&fixed[3];let v3452=false,v3451;
const v3470=fixed[0]&&fixed[1]&&fixed[3];let v3469=false,v3468;
const v3475=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3474=false,v3473;
const v3483=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3482=false,v3481;
const v3510=true;let v3509=false,v3508;
const v3521=true;let v3520=false,v3519;
const v3525=true;let v3524=false,v3523;
const v3530=fixed[0]&&fixed[1]&&fixed[3];let v3529=false,v3528;
const v3539=fixed[0]&&fixed[1]&&fixed[3];let v3538=false,v3537;
const v3548=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3547=false,v3546;
const v3574=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3573=false,v3572;
const v3593=true;let v3592=false,v3591;
const v3604=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3603=false,v3602;
const v3629=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3628=false,v3627;
const v3637=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3636=false,v3635;
const v3651=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3650=false,v3649;
const v3689=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3688=false,v3687;
const v3698=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3697=false,v3696;
const v3704=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3703=false,v3702;
const v3710=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3709=false,v3708;
const v3723=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3722=false,v3721;
const v3741=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3740=false,v3739;
const v3751=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3750=false,v3749;
const v3782=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3781=false,v3780;
const v3797=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3796=false,v3795;
const v3801=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3800=false,v3799;
const v3841=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3840=false,v3839;
const v3848=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3847=false,v3846;
const v3853=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3852=false,v3851;
const v3859=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3858=false,v3857;
const v3895=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3894=false,v3893;
return function(v3427,v3428,v3429,v3430){let v3431;if(v3434&&v3433){v3431=v3432;}else{
const v3435=v3430;
const v3436=1000000;
const v3437=((v3435) > (v3436));
let v3438=v3437;if(!v3438){
const v3439=v3427;
const v3440=v3430;
v3438=((v3439) > (v3440));}
v3431=v3438;if(v3434){v3432=v3431;v3433=true;}}
let v3441;if(v3431){
v3441=({Err:"network capacity"});}else{
let v3442;if(v3445&&v3444){v3442=v3443;}else{
const v3446=0;
const v3447=0;
const v3448=v3427;
const v3449=true;
v3442=({["parameters"]:v3446,["nodes"]:v3447,["width"]:v3448,["valid"]:v3449});if(v3445){v3443=v3442;v3444=true;}}
let v3450;if(v3453&&v3452){v3450=v3451;}else{
const v3454=v3428;
const v3455=v3442;
let v3456=({["shape"]:v3455});
for(let v3457=0;v3457<v3454.length;v3457++){
const v3458=(v3454[v3457]>>>0);
const v3459=v3456;
const v3460=v3459["shape"];
const v3461=v3460;
const v3462=v3458;
const v3463=true;
const v3464=v3430;
const v3465=__fn3(v3461,v3462,v3463,v3464);
const v3466=v3465;
v3456=({["shape"]:v3466});
}
v3450=v3456;if(v3453){v3451=v3450;v3452=true;}}
let v3467;if(v3470&&v3469){v3467=v3468;}else{
const v3471=v3450;
v3467=v3471["shape"];if(v3470){v3468=v3467;v3469=true;}}
let v3472;if(v3475&&v3474){v3472=v3473;}else{
const v3476=v3467;
const v3477=v3429;
const v3478=false;
const v3479=v3430;
let v3480;if(v3483&&v3482){v3480=v3481;}else{
const v3484=v3476;
const v3485=v3484["valid"];
const v3486=false;
const v3487=(v3485===v3486);
let v3488=v3487;if(!v3488){
const v3489=v3476;
const v3490=v3489["parameters"];
const v3491=v3479;
v3488=((v3490) > (v3491));}
const v3492=v3488;
let v3493=v3492;if(!v3493){
const v3494=v3476;
const v3495=v3494["nodes"];
const v3496=v3479;
v3493=((v3495) > (v3496));}
const v3497=v3493;
let v3498=v3497;if(!v3498){
const v3499=v3476;
const v3500=v3499["width"];
const v3501=v3479;
v3498=((v3500) > (v3501));}
const v3502=v3498;
let v3503=v3502;if(!v3503){
const v3504=v3477;
const v3505=v3479;
v3503=((v3504) > (v3505));}
v3480=v3503;if(v3483){v3481=v3480;v3482=true;}}
let v3506;if(v3480){
let v3507;if(v3510&&v3509){v3507=v3508;}else{
v3507=false;if(v3510){v3508=v3507;v3509=true;}}
const v3511=v3476;
const v3512=v3511["parameters"];
const v3513=v3476;
const v3514=v3513["nodes"];
const v3515=v3476;
const v3516=v3515["width"];
const v3517=v3507;
v3506=({["parameters"]:v3512,["nodes"]:v3514,["width"]:v3516,["valid"]:v3517});}else{
let v3518;if(v3521&&v3520){v3518=v3519;}else{
let v3522;if(v3525&&v3524){v3522=v3523;}else{
v3522=v3478;if(v3525){v3523=v3522;v3524=true;}}
let v3526;if(v3522){
v3526=2;}else{
v3526=1;}
v3518=v3526;if(v3521){v3519=v3518;v3520=true;}}
let v3527;if(v3530&&v3529){v3527=v3528;}else{
const v3531=v3476;
const v3532=v3531["width"];
const v3533=1;
const v3534=(((v3532) + (v3533)) >>> 0);
const v3535=v3518;
v3527=(Math.imul(v3534,v3535) >>> 0);if(v3530){v3528=v3527;v3529=true;}}
let v3536;if(v3539&&v3538){v3536=v3537;}else{
const v3540=v3476;
const v3541=v3540["width"];
const v3542=v3518;
const v3543=(Math.imul(v3541,v3542) >>> 0);
const v3544=1;
v3536=(((v3543) + (v3544)) >>> 0);if(v3539){v3537=v3536;v3538=true;}}
let v3545;if(v3548&&v3547){v3545=v3546;}else{
const v3549=v3477;
const v3550=v3479;
const v3551=v3476;
const v3552=v3551["parameters"];
const v3553=(((v3550) - (v3552)) >>> 0);
const v3554=v3527;
let v3555;if(v3554===0 ){
v3555=0;}else{
v3555=(Math.trunc(v3553/v3554)+0);}
const v3556=v3555;
const v3557=((v3549) <= (v3556));
let v3558=v3557;if(v3558){
const v3559=v3536;
const v3560=0;
const v3561=(v3559===v3560);
let v3562=v3561;if(!v3562){
const v3563=v3477;
const v3564=v3479;
const v3565=v3476;
const v3566=v3565["nodes"];
const v3567=(((v3564) - (v3566)) >>> 0);
const v3568=v3536;
let v3569;if(v3568===0 ){
v3569=0;}else{
v3569=(Math.trunc(v3567/v3568)+0);}
const v3570=v3569;
v3562=((v3563) <= (v3570));}
v3558=v3562;}
v3545=v3558;if(v3548){v3546=v3545;v3547=true;}}
let v3571;if(v3574&&v3573){v3571=v3572;}else{
v3571=v3545;if(v3574){v3572=v3571;v3573=true;}}
let v3575;if(v3571){
const v3576=v3476;
const v3577=v3576["parameters"];
const v3578=v3527;
const v3579=v3477;
const v3580=(Math.imul(v3578,v3579) >>> 0);
const v3581=(((v3577) + (v3580)) >>> 0);
const v3582=v3476;
const v3583=v3582["nodes"];
const v3584=v3536;
const v3585=v3477;
const v3586=(Math.imul(v3584,v3585) >>> 0);
const v3587=(((v3583) + (v3586)) >>> 0);
const v3588=v3477;
const v3589=true;
v3575=({["parameters"]:v3581,["nodes"]:v3587,["width"]:v3588,["valid"]:v3589});}else{
let v3590;if(v3593&&v3592){v3590=v3591;}else{
v3590=false;if(v3593){v3591=v3590;v3592=true;}}
const v3594=v3476;
const v3595=v3594["parameters"];
const v3596=v3476;
const v3597=v3596["nodes"];
const v3598=v3476;
const v3599=v3598["width"];
const v3600=v3590;
v3575=({["parameters"]:v3595,["nodes"]:v3597,["width"]:v3599,["valid"]:v3600});}
v3506=v3575;}
v3472=v3506;if(v3475){v3473=v3472;v3474=true;}}
let v3601;if(v3604&&v3603){v3601=v3602;}else{
const v3605=v3472;
const v3606=v3605["valid"];
const v3607=false;
const v3608=(v3606===v3607);
let v3609=v3608;if(!v3609){
const v3610=v3427;
const v3611=v3430;
const v3612=v3472;
const v3613=v3612["parameters"];
const v3614=(((v3611) - (v3613)) >>> 0);
v3609=((v3610) > (v3614));}
const v3615=v3609;
let v3616=v3615;if(!v3616){
const v3617=v3472;
const v3618=v3617["nodes"];
const v3619=v3430;
const v3620=v3472;
const v3621=v3620["parameters"];
const v3622=(((v3619) - (v3621)) >>> 0);
const v3623=v3427;
const v3624=(((v3622) - (v3623)) >>> 0);
v3616=((v3618) > (v3624));}
v3601=v3616;if(v3604){v3602=v3601;v3603=true;}}
let v3625;if(v3601){
v3625=({Err:"network capacity"});}else{
let v3626;if(v3629&&v3628){v3626=v3627;}else{
const v3630=v3472;
const v3631=v3630["parameters"];
const v3632=v3427;
v3626=(((v3631) + (v3632)) >>> 0);if(v3629){v3627=v3626;v3628=true;}}
const v3633=new __InkBuffer([]);
let v3634;if(v3637&&v3636){v3634=v3635;}else{
const v3638=v3427;
let v3639=v3633;
for(let v3640=0;v3640<v3638;v3640++){
if(false){break;}
const v3641=(v3640>>>0);
const v3642=v3639;
const v3643=v3472;
const v3644=v3643["parameters"];
const v3645=v3641;
const v3646=(((v3644) + (v3645)) >>> 0);
v3639=__tempEdit(v3642,"push",v3646);}
const v3647=v3639;
v3634=v3647.freeze();if(v3637){v3635=v3634;v3636=true;}}
let v3648;if(v3651&&v3650){v3648=v3649;}else{
v3648=v3634;if(v3651){v3649=v3648;v3650=true;}}
const v3653=new __InkBuffer([]);
const v3654=new __InkBuffer([]);
const v3655=0;
const v3656=v3626;
const v3652=({["nodes"]:v3653,["outputs"]:v3654,["parameter"]:v3655,["inputs"]:v3656});
const v3658=v3428;
const v3659=v3652;
const v3660=v3648;
let v3661=({["layer"]:v3659,["wires"]:v3660});
for(let v3662=0;v3662<v3658.length;v3662++){
const v3663=(v3658[v3662]>>>0);
const v3664=v3661;
const v3665=v3664["layer"];
const v3666=v3661;
const v3667=v3666["wires"];
const v3668=v3665;
const v3669=v3663;
const v3670=v3667;
const v3671=__fn7(v3668,v3669,v3670);
const v3672=v3671;
const v3673=v3672["outputs"];
const v3674=v3673.freeze();
const v3675=v3671;
const v3676=v3675["nodes"];
const v3677=new __InkBuffer([]);
const v3678=v3671;
const v3679=v3678["parameter"];
const v3680=v3626;
const v3681=({["nodes"]:v3676,["outputs"]:v3677,["parameter"]:v3679,["inputs"]:v3680});
const v3682=v3681;
const v3683=v3674;
v3661=({["layer"]:v3682,["wires"]:v3683});
}
const v3657=v3661;
const v3685=v3657;
const v3684=v3685["layer"];
let v3686;if(v3689&&v3688){v3686=v3687;}else{
const v3690=v3657;
v3686=v3690["wires"];if(v3689){v3687=v3686;v3688=true;}}
const v3692=v3684;
const v3693=v3429;
const v3694=v3686;
const v3691=__fn8(v3692,v3693,v3694);
let v3695;if(v3698&&v3697){v3695=v3696;}else{
const v3699=v3691;
const v3700=v3699["nodes"];
v3695=v3700.freeze();if(v3698){v3696=v3695;v3697=true;}}
let v3701;if(v3704&&v3703){v3701=v3702;}else{
const v3705=v3691;
const v3706=v3705["outputs"];
v3701=v3706.freeze();if(v3704){v3702=v3701;v3703=true;}}
let v3707;if(v3710&&v3709){v3707=v3708;}else{
const v3711=v3691;
const v3712=v3711["parameter"];
const v3713=v3472;
const v3714=v3713["parameters"];
v3707=!(v3712===v3714);if(v3710){v3708=v3707;v3709=true;}}
let v3715;if(v3707){
v3715=({Err:"network parameter layout"});}else{
const v3716=v3626;
const v3717=v3695;
const v3718=v3701;
const v3719=v3430;
let v3720;if(v3723&&v3722){v3720=v3721;}else{
const v3724=v3717;
const v3725=v3724.length;
const v3726=4294967295;
const v3727=((v3725) > (v3726));
let v3728=v3727;if(!v3728){
const v3729=v3716;
const v3730=v3719;
v3728=((v3729) > (v3730));}
const v3731=v3728;
let v3732=v3731;if(!v3732){
const v3733=(v3717).length;
const v3734=v3719;
const v3735=v3716;
const v3736=(((v3734) - (v3735)) >>> 0);
v3732=((v3733) > (v3736));}
v3720=v3732;if(v3723){v3721=v3720;v3722=true;}}
let v3737;if(v3720){
v3737=({Err:"graph capacity"});}else{
let v3738;if(v3741&&v3740){v3738=v3739;}else{
const v3742=v3716;
const v3743=v3717;
const v3744=v3718;
const v3745=__fn38(v3742,v3743,v3744);
const v3746=false;
v3738=(v3745===v3746);if(v3741){v3739=v3738;v3740=true;}}
let v3747;if(v3738){
v3747=({Err:"graph is not topologically ordered"});}else{
let v3748;if(v3751&&v3750){v3748=v3749;}else{
const v3752=v3716;
const v3753=(v3717).length;
v3748=(((v3752) + (v3753)) >>> 0);if(v3751){v3749=v3748;v3750=true;}}
const v3754=__bufferFill(v3748,false);
const v3756=v3718;
const v3757=v3754;
let v3758=({["live"]:v3757});
for(let v3759=0;v3759<v3756.length;v3759++){
const v3760=(v3756[v3759]>>>0);
const v3761=v3758;
const v3762=v3761["live"];
const v3763=v3762;
const v3764=v3760;
const v3765=__tempSet(v3763,v3764,true,false);
const v3766=v3765;
v3758=({["live"]:v3766});
}
const v3755=v3758;
const v3768=v3755;
const v3767=v3768["live"];
const v3770=v3717;
const v3771=v3767;
const v3772=v3748;
let v3773=({["live"]:v3771,["wire"]:v3772});
for(let v3774=v3770.length-1;v3774>=0;v3774--){
const v3775=v3770[v3774];
const v3776=v3775;
const v3777=v3773;
const v3778=v3716;
v3773=__fn36(v3776,v3777,v3778);
}
const v3769=v3773;
let v3779;if(v3782&&v3781){v3779=v3780;}else{
const v3783=v3769;
const v3784=v3783["live"];
v3779=v3784.freeze();if(v3782){v3780=v3779;v3781=true;}}
const v3785=__bufferFill(v3748,0);
const v3787=v3716;
let v3788=v3785;
for(let v3789=0;v3789<v3787;v3789++){
if(false){break;}
const v3790=(v3789>>>0);
const v3791=v3788;
const v3792=v3790;
v3788=__tempSet(v3791,v3792,v3790,false);}
const v3786=v3788;
const v3793=v3786;
let v3794;if(v3797&&v3796){v3794=v3795;}else{
v3794=v3716;if(v3797){v3795=v3794;v3796=true;}}
let v3798;if(v3801&&v3800){v3798=v3799;}else{
v3798=v3716;if(v3801){v3799=v3798;v3800=true;}}
const v3803=v3717;
const v3804=v3798;
const v3805=v3793;
const v3806=v3794;
let v3807=({["next"]:v3804,["positions"]:v3805,["wire"]:v3806});
for(let v3808=0;v3808<v3803.length;v3808++){
const v3809=v3803[v3808];
const v3810=v3807;
const v3811=v3810["next"];
const v3812=v3807;
const v3813=v3812["positions"];
const v3814=v3807;
const v3815=v3814["wire"];
const v3816=v3779;
const v3817=v3815;
let v3818;if(v3817<v3816.length){v3818=v3816[v3817];}else{
v3818=false;}
let v3819;if(v3818){
const v3820=v3813;
const v3821=v3815;
const v3822=__tempSet(v3820,v3821,v3811,false);
const v3823=v3811;
const v3824=1;
const v3825=(((v3823) + (v3824)) >>> 0);
const v3826=v3815;
const v3827=1;
const v3828=(((v3826) + (v3827)) >>> 0);
const v3829=v3825;
const v3830=v3822;
const v3831=v3828;
v3819=({["next"]:v3829,["positions"]:v3830,["wire"]:v3831});}else{
const v3832=v3815;
const v3833=1;
const v3834=(((v3832) + (v3833)) >>> 0);
const v3835=v3811;
const v3836=v3813;
const v3837=v3834;
v3819=({["next"]:v3835,["positions"]:v3836,["wire"]:v3837});}
v3807=v3819;
}
const v3802=v3807;
let v3838;if(v3841&&v3840){v3838=v3839;}else{
const v3842=v3802;
v3838=v3842["next"];if(v3841){v3839=v3838;v3840=true;}}
const v3844=v3802;
const v3843=v3844["positions"];
let v3845;if(v3848&&v3847){v3845=v3846;}else{
const v3849=v3802;
v3845=v3849["wire"];if(v3848){v3846=v3845;v3847=true;}}
let v3850;if(v3853&&v3852){v3850=v3851;}else{
const v3854=v3843;
v3850=v3854.freeze();if(v3853){v3851=v3850;v3852=true;}}
const v3855=new __InkBuffer([]);
let v3856;if(v3859&&v3858){v3856=v3857;}else{
v3856=v3716;if(v3859){v3857=v3856;v3858=true;}}
const v3861=v3717;
const v3862=v3855;
const v3863=v3856;
let v3864=({["compact"]:v3862,["wire"]:v3863});
for(let v3865=0;v3865<v3861.length;v3865++){
const v3866=v3861[v3865];
const v3867=v3864;
const v3868=v3867["compact"];
const v3869=v3864;
const v3870=v3869["wire"];
const v3871=v3779;
const v3872=v3870;
let v3873;if(v3872<v3871.length){v3873=v3871[v3872];}else{
v3873=false;}
let v3874;if(v3873){
const v3875=v3868;
const v3876=v3866;
const v3877=v3850;
const v3878=__fn35(v3876,v3877);
const v3879=__tempEdit(v3875,"push",v3878);
const v3880=v3870;
const v3881=1;
const v3882=(((v3880) + (v3881)) >>> 0);
const v3883=v3879;
const v3884=v3882;
v3874=({["compact"]:v3883,["wire"]:v3884});}else{
const v3885=v3870;
const v3886=1;
const v3887=(((v3885) + (v3886)) >>> 0);
const v3888=v3868;
const v3889=v3887;
v3874=({["compact"]:v3888,["wire"]:v3889});}
v3864=v3874;
}
const v3860=v3864;
const v3891=v3860;
const v3890=v3891["compact"];
let v3892;if(v3895&&v3894){v3892=v3893;}else{
const v3896=v3860;
v3892=v3896["wire"];if(v3895){v3893=v3892;v3894=true;}}
const v3897=v3716;
const v3898=v3890;
const v3899=v3898.freeze();
const v3900=v3718;
const v3901=v3900.length;
const v3902=new Array(v3901);
for(let v3903=0;v3903<v3901;v3903++){
const v3904=(v3900[v3903]>>>0);
const v3905=v3850;
const v3906=v3904;
let v3907;if(v3906<v3905.length){v3907=v3905[v3906];}else{
v3907=0;}
v3902[v3903]=v3907;
}
const v3908=v3902;
v3747=({Ok:({["inputs"]:v3897,["nodes"]:v3899,["roots"]:v3908})});}
v3737=v3747;}
const v3909=v3737;
const v3911=v3909;
let v3912;if(Object.hasOwn(v3911,"Ok")){
const v3913=v3911["Ok"];
const v3914=v3913;
const v3915=v3914;
const v3916=v3472;
const v3917=v3916["parameters"];
const v3918=v3427;
const v3919=v3429;
v3912=({Ok:({["graph"]:v3915,["parameters"]:v3917,["features"]:v3918,["outputs"]:v3919})});}else{
const v3920=v3911["Err"];
v3912=({Err:v3920});}
v3715=v3912;}
v3625=v3715;}
v3441=v3625;}
return v3441;};}
function __prepareFn13(fixed){const v3935=fixed[0]&&fixed[1]&&fixed[2];let v3934=false,v3933;
const v3960=fixed[0]&&fixed[1]&&fixed[2];let v3959=false,v3958;
const v3968=fixed[0];let v3967=false,v3966;
const v3991=fixed[0]&&fixed[1]&&fixed[2];let v3990=false,v3989;
const v3997=fixed[0]&&fixed[1]&&fixed[2];let v3996=false,v3995;
return function(v3929,v3930,v3931){let v3932;if(v3935&&v3934){v3932=v3933;}else{
const v3936=(v3930).length;
const v3937=v3929;
const v3938=v3937["parameters"];
const v3939=!(v3936===v3938);
let v3940=v3939;if(!v3940){
const v3941=(v3931).length;
const v3942=v3929;
const v3943=v3942["features"];
v3940=!(v3941===v3943);}
v3932=v3940;if(v3935){v3933=v3932;v3934=true;}}
let v3944;if(v3932){
v3944=({Err:"network input shape"});}else{
const v3945=v3929;
const v3946=v3945["graph"];
const v3947=v3930;
const v3948=v3931;
const v3949=v3947.length;
const v3950=v3948.length;
const v3951=new Array(v3949+v3950);
for(let v3952=0;v3952<v3949;v3952++){v3951[v3952]=v3947[v3952];}
for(let v3953=0;v3953<v3950;v3953++){v3951[v3949+v3953]=v3948[v3953];}
const v3954=v3951;
const v3955=v3946;
const v3956=v3954;
let v3957;if(v3960&&v3959){v3957=v3958;}else{
const v3961=(v3956).length;
const v3962=v3955;
const v3963=v3962["inputs"];
v3957=!(v3961===v3963);if(v3960){v3958=v3957;v3959=true;}}
let v3964;if(v3957){
v3964=({Err:"graph input shape"});}else{
let v3965;if(v3968&&v3967){v3965=v3966;}else{
const v3969=v3955;
const v3970=v3969["inputs"];
const v3971=v3955;
const v3972=v3971["nodes"];
const v3973=v3955;
const v3974=v3973["roots"];
const v3975=__fn38(v3970,v3972,v3974);
const v3976=false;
v3965=(v3975===v3976);if(v3968){v3966=v3965;v3967=true;}}
let v3977;if(v3965){
v3977=({Err:"invalid prepared graph"});}else{
const v3979=v3955;
const v3980=v3979["nodes"];
const v3981=new __InkBuffer(Array.from(v3956));
const v3982=true;
let v3983=({["values"]:v3981,["finite_indices"]:v3982});
for(let v3984=0;v3984<v3980.length;v3984++){
const v3985=v3980[v3984];
const v3986=v3985;
const v3987=v3983;
v3983=__fn51(v3986,v3987);
}
const v3978=v3983;
let v3988;if(v3991&&v3990){v3988=v3989;}else{
const v3992=v3978;
const v3993=v3992["values"];
v3988=v3993.freeze();if(v3991){v3989=v3988;v3990=true;}}
let v3994;if(v3997&&v3996){v3994=v3995;}else{
const v3998=v3978;
const v3999=v3998["finite_indices"];
const v4000=false;
v3994=(v3999===v4000);if(v3997){v3995=v3994;v3996=true;}}
let v4001;if(v3994){
v4001=({Err:"nonfinite graph index"});}else{
const v4002=v3988;
const v4003=v3955;
const v4004=v4003["roots"];
const v4005=v4004.length;
const v4006=new Array(v4005);
for(let v4007=0;v4007<v4005;v4007++){
const v4008=(v4004[v4007]>>>0);
const v4009=v3988;
const v4010=v4008;
let v4011;if(v4010<v4009.length){v4011=v4009[v4010];}else{
v4011=__nfFromBits(0);}
v4006[v4007]=__nfValue(v4011);
}
const v4012=v4006;
v4001=({Ok:({["values"]:v4002,["outputs"]:v4012})});}
v3977=v4001;}
v3964=v3977;}
const v4013=v3964;
const v4015=v4013;
let v4016;if(Object.hasOwn(v4015,"Ok")){
const v4017=v4015["Ok"];
const v4018=v4017;
v4016=({Ok:v4018["outputs"]});}else{v4016=({Err:v4015.Err});}
v3944=v4016;}
return v3944;};}
function __prepareFn14(fixed){const v4026=fixed[0]&&fixed[1]&&fixed[2];let v4025=false,v4024;
const v4051=fixed[0]&&fixed[3];let v4050=false,v4049;
const v4065=fixed[0]&&fixed[1]&&fixed[2];let v4064=false,v4063;
const v4073=fixed[0];let v4072=false,v4071;
const v4096=fixed[0]&&fixed[1]&&fixed[2];let v4095=false,v4094;
const v4102=fixed[0]&&fixed[1]&&fixed[2];let v4101=false,v4100;
return function(v4019,v4020,v4021,v4022){let v4023;if(v4026&&v4025){v4023=v4024;}else{
const v4027=(v4020).length;
const v4028=v4019;
const v4029=v4028["parameters"];
const v4030=!(v4027===v4029);
let v4031=v4030;if(!v4031){
const v4032=(v4021).length;
const v4033=v4019;
const v4034=v4033["features"];
v4031=!(v4032===v4034);}
v4023=v4031;if(v4026){v4024=v4023;v4025=true;}}
let v4035;if(v4023){
v4035=({Err:"network input shape"});}else{
const v4036=v4019;
const v4037=v4036["graph"];
const v4038=v4020;
const v4039=v4021;
const v4040=v4038.length;
const v4041=v4039.length;
const v4042=new Array(v4040+v4041);
for(let v4043=0;v4043<v4040;v4043++){v4042[v4043]=v4038[v4043];}
for(let v4044=0;v4044<v4041;v4044++){v4042[v4040+v4044]=v4039[v4044];}
const v4045=v4042;
const v4046=v4022;
const v4047=__fn33();
let v4048;if(v4051&&v4050){v4048=v4049;}else{
const v4052=(v4046).length;
const v4053=0;
const v4054=(v4052===v4053);
let v4055=v4054;if(!v4055){
const v4056=(v4046).length;
const v4057=v4037;
const v4058=(v4057["roots"]).length;
v4055=!(v4056===v4058);}
v4048=v4055;if(v4051){v4049=v4048;v4050=true;}}
let v4059;if(v4048){
v4059=({Err:"target shape"});}else{
const v4060=v4037;
const v4061=v4045;
let v4062;if(v4065&&v4064){v4062=v4063;}else{
const v4066=(v4061).length;
const v4067=v4060;
const v4068=v4067["inputs"];
v4062=!(v4066===v4068);if(v4065){v4063=v4062;v4064=true;}}
let v4069;if(v4062){
v4069=({Err:"graph input shape"});}else{
let v4070;if(v4073&&v4072){v4070=v4071;}else{
const v4074=v4060;
const v4075=v4074["inputs"];
const v4076=v4060;
const v4077=v4076["nodes"];
const v4078=v4060;
const v4079=v4078["roots"];
const v4080=__fn38(v4075,v4077,v4079);
const v4081=false;
v4070=(v4080===v4081);if(v4073){v4071=v4070;v4072=true;}}
let v4082;if(v4070){
v4082=({Err:"invalid prepared graph"});}else{
const v4084=v4060;
const v4085=v4084["nodes"];
const v4086=new __InkBuffer(Array.from(v4061));
const v4087=true;
let v4088=({["values"]:v4086,["finite_indices"]:v4087});
for(let v4089=0;v4089<v4085.length;v4089++){
const v4090=v4085[v4089];
const v4091=v4090;
const v4092=v4088;
v4088=__fn51(v4091,v4092);
}
const v4083=v4088;
let v4093;if(v4096&&v4095){v4093=v4094;}else{
const v4097=v4083;
const v4098=v4097["values"];
v4093=v4098.freeze();if(v4096){v4094=v4093;v4095=true;}}
let v4099;if(v4102&&v4101){v4099=v4100;}else{
const v4103=v4083;
const v4104=v4103["finite_indices"];
const v4105=false;
v4099=(v4104===v4105);if(v4102){v4100=v4099;v4101=true;}}
let v4106;if(v4099){
v4106=({Err:"nonfinite graph index"});}else{
const v4107=v4093;
const v4108=v4060;
const v4109=v4108["roots"];
const v4110=v4109.length;
const v4111=new Array(v4110);
for(let v4112=0;v4112<v4110;v4112++){
const v4113=(v4109[v4112]>>>0);
const v4114=v4093;
const v4115=v4113;
let v4116;if(v4115<v4114.length){v4116=v4114[v4115];}else{
v4116=__nfFromBits(0);}
v4111[v4112]=__nfValue(v4116);
}
const v4117=v4111;
v4106=({Ok:({["values"]:v4107,["outputs"]:v4117})});}
v4082=v4106;}
v4069=v4082;}
const v4118=v4069;
const v4120=v4118;
let v4121;if(Object.hasOwn(v4120,"Ok")){
const v4122=v4120["Ok"];
const v4123=v4122;
const v4124=v4123;
const v4125=v4124["outputs"];
const v4126=v4046;
const v4127=Math.min(v4125.length,v4126.length);
const v4128=new Array(v4127);
for(let v4129=0;v4129<v4127;v4129++){
const v4130=v4125[v4129];
const v4131=v4126[v4129];
const v4132=__nfValue(v4130);
const v4133=__nfValue(v4131);
v4128[v4129]=Math.fround(__nfNumber(v4132) - __nfNumber(v4133));
}
const v4134=v4128;
const v4135=Math.fround((v4046).length);
const v4136=v4134;
const v4137=v4136.length;
const v4138=new Array(v4137);
for(let v4139=0;v4139<v4137;v4139++){
const v4140=v4136[v4139];
const v4141=__nfValue(v4140);
const v4142=__nfValue(v4140);
v4138[v4139]=Math.fround(__nfNumber(v4141) * __nfNumber(v4142));
}
const v4143=v4138;
let v4144=0;for(let v4145=0;v4145<v4143.length;v4145++){
const v4146=v4143[v4145];
v4144=Math.fround(__nfNumber(v4144) + __nfNumber(v4146));}
const v4147=Math.fround((__nfNumber(v4144))/(__nfNumber(__nfValue(v4135))));
const v4148=Number.isFinite(__nfNumber(v4147));
const v4149=false;
let v4150;if((v4148===v4149)){
v4150=({Err:"nonfinite loss"});}else{
const v4151=v4134;
const v4152=v4151.length;
const v4153=new Array(v4152);
for(let v4154=0;v4154<v4152;v4154++){
const v4155=v4151[v4154];
const v4156=__nfFromBits(1073741824);
const v4157=__nfValue(v4155);
v4153[v4154]=Math.fround((__nfNumber(Math.fround(v4156 * __nfNumber(v4157))))/(__nfNumber(__nfValue(v4135))));
}
const v4158=v4153;
const v4159=v4037;
const v4160=v4123;
const v4161=v4160["values"];
const v4162=v4158;
const v4163=v4047;
const v4164=__fn64(v4159,v4161,v4162,v4163);
let v4165;if(Object.hasOwn(v4164,"Ok")){
const v4166=v4164["Ok"];
const v4167=v4166;
const v4168=v4147;
const v4169=v4123;
const v4170=v4169["outputs"];
const v4171=v4167;
v4165=({Ok:({["loss"]:v4168,["outputs"]:v4170,["gradient"]:v4171})});}else{
const v4172=v4164["Err"];
v4165=({Err:v4172});}
v4150=v4165;}
v4121=v4150;}else{
const v4173=v4120["Err"];
v4121=({Err:v4173});}
v4059=v4121;}
const v4174=v4059;
const v4176=v4174;
let v4177;if(Object.hasOwn(v4176,"Ok")){
const v4178=v4176["Ok"];
const v4179=v4178;
const v4180=v4179;
const v4181=__nfValue(v4180["loss"]);
const v4182=v4179;
const v4183=v4182["outputs"];
const v4184=v4179;
const v4185=v4184["gradient"];
const v4186=v4019;
const v4187=v4185.slice(0,v4186["parameters"]);
v4177=({Ok:({["loss"]:v4181,["outputs"]:v4183,["gradient"]:v4187})});}else{
const v4188=v4176["Err"];
v4177=({Err:v4188});}
v4035=v4177;}
return v4035;};}
function __prepareFn16(fixed){const v4209=true;let v4208=false,v4207;
const v4229=fixed[0];let v4228=false,v4227;
return function(v4205){let v4206;if(v4209&&v4208){v4206=v4207;}else{
const v4210="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v4211=0;
const v4212=0;
const v4213=v4210;
const v4214="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4215="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4216=v4211;
const v4217=v4212;
const v4218=0;
const v4219=__nfFromBits(0);
const v4220=[];
const v4221=[];
const v4222=__nfFromBits(0);
const v4223=[];
const v4224=false;
const v4225=false;
v4206=({["kind"]:v4213,["binary"]:v4214,["unary"]:v4215,["a"]:v4216,["b"]:v4217,["c"]:v4218,["value"]:v4219,["terms"]:v4220,["gates"]:v4221,["gate_bias"]:v4222,["table"]:v4223,["below"]:v4224,["above"]:v4225});if(v4209){v4207=v4206;v4208=true;}}
let v4226;if(v4229&&v4228){v4226=v4227;}else{
v4226=__nfValue(v4205);if(v4229){v4227=v4226;v4228=true;}}
const v4230=v4206;
const v4231=v4230["kind"];
const v4232=v4206;
const v4233=v4232["binary"];
const v4234=v4206;
const v4235=v4234["unary"];
const v4236=v4206;
const v4237=v4236["a"];
const v4238=v4206;
const v4239=v4238["b"];
const v4240=v4206;
const v4241=v4240["c"];
const v4242=__nfValue(v4226);
const v4243=v4206;
const v4244=v4243["terms"];
const v4245=v4206;
const v4246=v4245["gates"];
const v4247=v4206;
const v4248=__nfValue(v4247["gate_bias"]);
const v4249=v4206;
const v4250=v4249["table"];
const v4251=v4206;
const v4252=v4251["below"];
const v4253=v4206;
const v4254=v4253["above"];
return ({["kind"]:v4231,["binary"]:v4233,["unary"]:v4235,["a"]:v4237,["b"]:v4239,["c"]:v4241,["value"]:v4242,["terms"]:v4244,["gates"]:v4246,["gate_bias"]:v4248,["table"]:v4250,["below"]:v4252,["above"]:v4254});};}
function __prepareFn17(fixed){const v4261=fixed[1]&&fixed[2];let v4260=false,v4259;
const v4281=fixed[0];let v4280=false,v4279;
return function(v4255,v4256,v4257){let v4258;if(v4261&&v4260){v4258=v4259;}else{
const v4262="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4263=v4256;
const v4264=v4257;
const v4265=v4262;
const v4266="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4267="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4268=v4263;
const v4269=v4264;
const v4270=0;
const v4271=__nfFromBits(0);
const v4272=[];
const v4273=[];
const v4274=__nfFromBits(0);
const v4275=[];
const v4276=false;
const v4277=false;
v4258=({["kind"]:v4265,["binary"]:v4266,["unary"]:v4267,["a"]:v4268,["b"]:v4269,["c"]:v4270,["value"]:v4271,["terms"]:v4272,["gates"]:v4273,["gate_bias"]:v4274,["table"]:v4275,["below"]:v4276,["above"]:v4277});if(v4261){v4259=v4258;v4260=true;}}
let v4278;if(v4281&&v4280){v4278=v4279;}else{
v4278=v4255;if(v4281){v4279=v4278;v4280=true;}}
const v4282=v4258;
const v4283=v4282["kind"];
const v4284=v4278;
const v4285=v4258;
const v4286=v4285["unary"];
const v4287=v4258;
const v4288=v4287["a"];
const v4289=v4258;
const v4290=v4289["b"];
const v4291=v4258;
const v4292=v4291["c"];
const v4293=v4258;
const v4294=__nfValue(v4293["value"]);
const v4295=v4258;
const v4296=v4295["terms"];
const v4297=v4258;
const v4298=v4297["gates"];
const v4299=v4258;
const v4300=__nfValue(v4299["gate_bias"]);
const v4301=v4258;
const v4302=v4301["table"];
const v4303=v4258;
const v4304=v4303["below"];
const v4305=v4258;
const v4306=v4305["above"];
return ({["kind"]:v4283,["binary"]:v4284,["unary"]:v4286,["a"]:v4288,["b"]:v4290,["c"]:v4292,["value"]:v4294,["terms"]:v4296,["gates"]:v4298,["gate_bias"]:v4300,["table"]:v4302,["below"]:v4304,["above"]:v4306});};}
function __prepareFn18(fixed){const v4312=fixed[1];let v4311=false,v4310;
const v4332=fixed[0];let v4331=false,v4330;
return function(v4307,v4308){let v4309;if(v4312&&v4311){v4309=v4310;}else{
const v4313="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4314=v4308;
const v4315=0;
const v4316=v4313;
const v4317="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4318="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4319=v4314;
const v4320=v4315;
const v4321=0;
const v4322=__nfFromBits(0);
const v4323=[];
const v4324=[];
const v4325=__nfFromBits(0);
const v4326=[];
const v4327=false;
const v4328=false;
v4309=({["kind"]:v4316,["binary"]:v4317,["unary"]:v4318,["a"]:v4319,["b"]:v4320,["c"]:v4321,["value"]:v4322,["terms"]:v4323,["gates"]:v4324,["gate_bias"]:v4325,["table"]:v4326,["below"]:v4327,["above"]:v4328});if(v4312){v4310=v4309;v4311=true;}}
let v4329;if(v4332&&v4331){v4329=v4330;}else{
v4329=v4307;if(v4332){v4330=v4329;v4331=true;}}
const v4333=v4309;
const v4334=v4333["kind"];
const v4335=v4309;
const v4336=v4335["binary"];
const v4337=v4329;
const v4338=v4309;
const v4339=v4338["a"];
const v4340=v4309;
const v4341=v4340["b"];
const v4342=v4309;
const v4343=v4342["c"];
const v4344=v4309;
const v4345=__nfValue(v4344["value"]);
const v4346=v4309;
const v4347=v4346["terms"];
const v4348=v4309;
const v4349=v4348["gates"];
const v4350=v4309;
const v4351=__nfValue(v4350["gate_bias"]);
const v4352=v4309;
const v4353=v4352["table"];
const v4354=v4309;
const v4355=v4354["below"];
const v4356=v4309;
const v4357=v4356["above"];
return ({["kind"]:v4334,["binary"]:v4336,["unary"]:v4337,["a"]:v4339,["b"]:v4341,["c"]:v4343,["value"]:v4345,["terms"]:v4347,["gates"]:v4349,["gate_bias"]:v4351,["table"]:v4353,["below"]:v4355,["above"]:v4357});};}
function __prepareFn19(fixed){const v4366=fixed[0]&&fixed[1];let v4365=false,v4364;
const v4386=true;let v4385=false,v4384;
return function(v4358,v4359){const v4360="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4361=v4358;
const v4362=v4359;
let v4363;if(v4366&&v4365){v4363=v4364;}else{
const v4367="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4368=v4361;
const v4369=v4362;
const v4370=v4367;
const v4371="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4372="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4373=v4368;
const v4374=v4369;
const v4375=0;
const v4376=__nfFromBits(0);
const v4377=[];
const v4378=[];
const v4379=__nfFromBits(0);
const v4380=[];
const v4381=false;
const v4382=false;
v4363=({["kind"]:v4370,["binary"]:v4371,["unary"]:v4372,["a"]:v4373,["b"]:v4374,["c"]:v4375,["value"]:v4376,["terms"]:v4377,["gates"]:v4378,["gate_bias"]:v4379,["table"]:v4380,["below"]:v4381,["above"]:v4382});if(v4366){v4364=v4363;v4365=true;}}
let v4383;if(v4386&&v4385){v4383=v4384;}else{
v4383=v4360;if(v4386){v4384=v4383;v4385=true;}}
const v4387=v4363;
const v4388=v4387["kind"];
const v4389=v4383;
const v4390=v4363;
const v4391=v4390["unary"];
const v4392=v4363;
const v4393=v4392["a"];
const v4394=v4363;
const v4395=v4394["b"];
const v4396=v4363;
const v4397=v4396["c"];
const v4398=v4363;
const v4399=__nfValue(v4398["value"]);
const v4400=v4363;
const v4401=v4400["terms"];
const v4402=v4363;
const v4403=v4402["gates"];
const v4404=v4363;
const v4405=__nfValue(v4404["gate_bias"]);
const v4406=v4363;
const v4407=v4406["table"];
const v4408=v4363;
const v4409=v4408["below"];
const v4410=v4363;
const v4411=v4410["above"];
return ({["kind"]:v4388,["binary"]:v4389,["unary"]:v4391,["a"]:v4393,["b"]:v4395,["c"]:v4397,["value"]:v4399,["terms"]:v4401,["gates"]:v4403,["gate_bias"]:v4405,["table"]:v4407,["below"]:v4409,["above"]:v4411});};}
function __prepareFn20(fixed){const v4420=fixed[0]&&fixed[1];let v4419=false,v4418;
const v4440=true;let v4439=false,v4438;
return function(v4412,v4413){const v4414="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v4415=v4412;
const v4416=v4413;
let v4417;if(v4420&&v4419){v4417=v4418;}else{
const v4421="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4422=v4415;
const v4423=v4416;
const v4424=v4421;
const v4425="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4426="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4427=v4422;
const v4428=v4423;
const v4429=0;
const v4430=__nfFromBits(0);
const v4431=[];
const v4432=[];
const v4433=__nfFromBits(0);
const v4434=[];
const v4435=false;
const v4436=false;
v4417=({["kind"]:v4424,["binary"]:v4425,["unary"]:v4426,["a"]:v4427,["b"]:v4428,["c"]:v4429,["value"]:v4430,["terms"]:v4431,["gates"]:v4432,["gate_bias"]:v4433,["table"]:v4434,["below"]:v4435,["above"]:v4436});if(v4420){v4418=v4417;v4419=true;}}
let v4437;if(v4440&&v4439){v4437=v4438;}else{
v4437=v4414;if(v4440){v4438=v4437;v4439=true;}}
const v4441=v4417;
const v4442=v4441["kind"];
const v4443=v4437;
const v4444=v4417;
const v4445=v4444["unary"];
const v4446=v4417;
const v4447=v4446["a"];
const v4448=v4417;
const v4449=v4448["b"];
const v4450=v4417;
const v4451=v4450["c"];
const v4452=v4417;
const v4453=__nfValue(v4452["value"]);
const v4454=v4417;
const v4455=v4454["terms"];
const v4456=v4417;
const v4457=v4456["gates"];
const v4458=v4417;
const v4459=__nfValue(v4458["gate_bias"]);
const v4460=v4417;
const v4461=v4460["table"];
const v4462=v4417;
const v4463=v4462["below"];
const v4464=v4417;
const v4465=v4464["above"];
return ({["kind"]:v4442,["binary"]:v4443,["unary"]:v4445,["a"]:v4447,["b"]:v4449,["c"]:v4451,["value"]:v4453,["terms"]:v4455,["gates"]:v4457,["gate_bias"]:v4459,["table"]:v4461,["below"]:v4463,["above"]:v4465});};}
function __prepareFn21(fixed){const v4474=fixed[0]&&fixed[1];let v4473=false,v4472;
const v4494=true;let v4493=false,v4492;
return function(v4466,v4467){const v4468="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v4469=v4466;
const v4470=v4467;
let v4471;if(v4474&&v4473){v4471=v4472;}else{
const v4475="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4476=v4469;
const v4477=v4470;
const v4478=v4475;
const v4479="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4480="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4481=v4476;
const v4482=v4477;
const v4483=0;
const v4484=__nfFromBits(0);
const v4485=[];
const v4486=[];
const v4487=__nfFromBits(0);
const v4488=[];
const v4489=false;
const v4490=false;
v4471=({["kind"]:v4478,["binary"]:v4479,["unary"]:v4480,["a"]:v4481,["b"]:v4482,["c"]:v4483,["value"]:v4484,["terms"]:v4485,["gates"]:v4486,["gate_bias"]:v4487,["table"]:v4488,["below"]:v4489,["above"]:v4490});if(v4474){v4472=v4471;v4473=true;}}
let v4491;if(v4494&&v4493){v4491=v4492;}else{
v4491=v4468;if(v4494){v4492=v4491;v4493=true;}}
const v4495=v4471;
const v4496=v4495["kind"];
const v4497=v4491;
const v4498=v4471;
const v4499=v4498["unary"];
const v4500=v4471;
const v4501=v4500["a"];
const v4502=v4471;
const v4503=v4502["b"];
const v4504=v4471;
const v4505=v4504["c"];
const v4506=v4471;
const v4507=__nfValue(v4506["value"]);
const v4508=v4471;
const v4509=v4508["terms"];
const v4510=v4471;
const v4511=v4510["gates"];
const v4512=v4471;
const v4513=__nfValue(v4512["gate_bias"]);
const v4514=v4471;
const v4515=v4514["table"];
const v4516=v4471;
const v4517=v4516["below"];
const v4518=v4471;
const v4519=v4518["above"];
return ({["kind"]:v4496,["binary"]:v4497,["unary"]:v4499,["a"]:v4501,["b"]:v4503,["c"]:v4505,["value"]:v4507,["terms"]:v4509,["gates"]:v4511,["gate_bias"]:v4513,["table"]:v4515,["below"]:v4517,["above"]:v4519});};}
function __prepareFn22(fixed){const v4528=fixed[0]&&fixed[1];let v4527=false,v4526;
const v4548=true;let v4547=false,v4546;
return function(v4520,v4521){const v4522="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
const v4523=v4520;
const v4524=v4521;
let v4525;if(v4528&&v4527){v4525=v4526;}else{
const v4529="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4530=v4523;
const v4531=v4524;
const v4532=v4529;
const v4533="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4534="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4535=v4530;
const v4536=v4531;
const v4537=0;
const v4538=__nfFromBits(0);
const v4539=[];
const v4540=[];
const v4541=__nfFromBits(0);
const v4542=[];
const v4543=false;
const v4544=false;
v4525=({["kind"]:v4532,["binary"]:v4533,["unary"]:v4534,["a"]:v4535,["b"]:v4536,["c"]:v4537,["value"]:v4538,["terms"]:v4539,["gates"]:v4540,["gate_bias"]:v4541,["table"]:v4542,["below"]:v4543,["above"]:v4544});if(v4528){v4526=v4525;v4527=true;}}
let v4545;if(v4548&&v4547){v4545=v4546;}else{
v4545=v4522;if(v4548){v4546=v4545;v4547=true;}}
const v4549=v4525;
const v4550=v4549["kind"];
const v4551=v4545;
const v4552=v4525;
const v4553=v4552["unary"];
const v4554=v4525;
const v4555=v4554["a"];
const v4556=v4525;
const v4557=v4556["b"];
const v4558=v4525;
const v4559=v4558["c"];
const v4560=v4525;
const v4561=__nfValue(v4560["value"]);
const v4562=v4525;
const v4563=v4562["terms"];
const v4564=v4525;
const v4565=v4564["gates"];
const v4566=v4525;
const v4567=__nfValue(v4566["gate_bias"]);
const v4568=v4525;
const v4569=v4568["table"];
const v4570=v4525;
const v4571=v4570["below"];
const v4572=v4525;
const v4573=v4572["above"];
return ({["kind"]:v4550,["binary"]:v4551,["unary"]:v4553,["a"]:v4555,["b"]:v4557,["c"]:v4559,["value"]:v4561,["terms"]:v4563,["gates"]:v4565,["gate_bias"]:v4567,["table"]:v4569,["below"]:v4571,["above"]:v4573});};}
function __prepareFn23(fixed){const v4580=fixed[0];let v4579=false,v4578;
const v4600=true;let v4599=false,v4598;
return function(v4574){const v4575="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4576=v4574;
let v4577;if(v4580&&v4579){v4577=v4578;}else{
const v4581="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4582=v4576;
const v4583=0;
const v4584=v4581;
const v4585="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4586="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4587=v4582;
const v4588=v4583;
const v4589=0;
const v4590=__nfFromBits(0);
const v4591=[];
const v4592=[];
const v4593=__nfFromBits(0);
const v4594=[];
const v4595=false;
const v4596=false;
v4577=({["kind"]:v4584,["binary"]:v4585,["unary"]:v4586,["a"]:v4587,["b"]:v4588,["c"]:v4589,["value"]:v4590,["terms"]:v4591,["gates"]:v4592,["gate_bias"]:v4593,["table"]:v4594,["below"]:v4595,["above"]:v4596});if(v4580){v4578=v4577;v4579=true;}}
let v4597;if(v4600&&v4599){v4597=v4598;}else{
v4597=v4575;if(v4600){v4598=v4597;v4599=true;}}
const v4601=v4577;
const v4602=v4601["kind"];
const v4603=v4577;
const v4604=v4603["binary"];
const v4605=v4597;
const v4606=v4577;
const v4607=v4606["a"];
const v4608=v4577;
const v4609=v4608["b"];
const v4610=v4577;
const v4611=v4610["c"];
const v4612=v4577;
const v4613=__nfValue(v4612["value"]);
const v4614=v4577;
const v4615=v4614["terms"];
const v4616=v4577;
const v4617=v4616["gates"];
const v4618=v4577;
const v4619=__nfValue(v4618["gate_bias"]);
const v4620=v4577;
const v4621=v4620["table"];
const v4622=v4577;
const v4623=v4622["below"];
const v4624=v4577;
const v4625=v4624["above"];
return ({["kind"]:v4602,["binary"]:v4604,["unary"]:v4605,["a"]:v4607,["b"]:v4609,["c"]:v4611,["value"]:v4613,["terms"]:v4615,["gates"]:v4617,["gate_bias"]:v4619,["table"]:v4621,["below"]:v4623,["above"]:v4625});};}
function __prepareFn24(fixed){const v4632=fixed[0];let v4631=false,v4630;
const v4652=true;let v4651=false,v4650;
return function(v4626){const v4627="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v4628=v4626;
let v4629;if(v4632&&v4631){v4629=v4630;}else{
const v4633="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4634=v4628;
const v4635=0;
const v4636=v4633;
const v4637="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4638="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4639=v4634;
const v4640=v4635;
const v4641=0;
const v4642=__nfFromBits(0);
const v4643=[];
const v4644=[];
const v4645=__nfFromBits(0);
const v4646=[];
const v4647=false;
const v4648=false;
v4629=({["kind"]:v4636,["binary"]:v4637,["unary"]:v4638,["a"]:v4639,["b"]:v4640,["c"]:v4641,["value"]:v4642,["terms"]:v4643,["gates"]:v4644,["gate_bias"]:v4645,["table"]:v4646,["below"]:v4647,["above"]:v4648});if(v4632){v4630=v4629;v4631=true;}}
let v4649;if(v4652&&v4651){v4649=v4650;}else{
v4649=v4627;if(v4652){v4650=v4649;v4651=true;}}
const v4653=v4629;
const v4654=v4653["kind"];
const v4655=v4629;
const v4656=v4655["binary"];
const v4657=v4649;
const v4658=v4629;
const v4659=v4658["a"];
const v4660=v4629;
const v4661=v4660["b"];
const v4662=v4629;
const v4663=v4662["c"];
const v4664=v4629;
const v4665=__nfValue(v4664["value"]);
const v4666=v4629;
const v4667=v4666["terms"];
const v4668=v4629;
const v4669=v4668["gates"];
const v4670=v4629;
const v4671=__nfValue(v4670["gate_bias"]);
const v4672=v4629;
const v4673=v4672["table"];
const v4674=v4629;
const v4675=v4674["below"];
const v4676=v4629;
const v4677=v4676["above"];
return ({["kind"]:v4654,["binary"]:v4656,["unary"]:v4657,["a"]:v4659,["b"]:v4661,["c"]:v4663,["value"]:v4665,["terms"]:v4667,["gates"]:v4669,["gate_bias"]:v4671,["table"]:v4673,["below"]:v4675,["above"]:v4677});};}
function __prepareFn25(fixed){const v4684=fixed[0];let v4683=false,v4682;
const v4704=true;let v4703=false,v4702;
return function(v4678){const v4679="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v4680=v4678;
let v4681;if(v4684&&v4683){v4681=v4682;}else{
const v4685="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4686=v4680;
const v4687=0;
const v4688=v4685;
const v4689="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4690="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4691=v4686;
const v4692=v4687;
const v4693=0;
const v4694=__nfFromBits(0);
const v4695=[];
const v4696=[];
const v4697=__nfFromBits(0);
const v4698=[];
const v4699=false;
const v4700=false;
v4681=({["kind"]:v4688,["binary"]:v4689,["unary"]:v4690,["a"]:v4691,["b"]:v4692,["c"]:v4693,["value"]:v4694,["terms"]:v4695,["gates"]:v4696,["gate_bias"]:v4697,["table"]:v4698,["below"]:v4699,["above"]:v4700});if(v4684){v4682=v4681;v4683=true;}}
let v4701;if(v4704&&v4703){v4701=v4702;}else{
v4701=v4679;if(v4704){v4702=v4701;v4703=true;}}
const v4705=v4681;
const v4706=v4705["kind"];
const v4707=v4681;
const v4708=v4707["binary"];
const v4709=v4701;
const v4710=v4681;
const v4711=v4710["a"];
const v4712=v4681;
const v4713=v4712["b"];
const v4714=v4681;
const v4715=v4714["c"];
const v4716=v4681;
const v4717=__nfValue(v4716["value"]);
const v4718=v4681;
const v4719=v4718["terms"];
const v4720=v4681;
const v4721=v4720["gates"];
const v4722=v4681;
const v4723=__nfValue(v4722["gate_bias"]);
const v4724=v4681;
const v4725=v4724["table"];
const v4726=v4681;
const v4727=v4726["below"];
const v4728=v4681;
const v4729=v4728["above"];
return ({["kind"]:v4706,["binary"]:v4708,["unary"]:v4709,["a"]:v4711,["b"]:v4713,["c"]:v4715,["value"]:v4717,["terms"]:v4719,["gates"]:v4721,["gate_bias"]:v4723,["table"]:v4725,["below"]:v4727,["above"]:v4729});};}
function __prepareFn26(fixed){const v4736=fixed[0];let v4735=false,v4734;
const v4756=true;let v4755=false,v4754;
return function(v4730){const v4731="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
const v4732=v4730;
let v4733;if(v4736&&v4735){v4733=v4734;}else{
const v4737="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4738=v4732;
const v4739=0;
const v4740=v4737;
const v4741="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4742="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4743=v4738;
const v4744=v4739;
const v4745=0;
const v4746=__nfFromBits(0);
const v4747=[];
const v4748=[];
const v4749=__nfFromBits(0);
const v4750=[];
const v4751=false;
const v4752=false;
v4733=({["kind"]:v4740,["binary"]:v4741,["unary"]:v4742,["a"]:v4743,["b"]:v4744,["c"]:v4745,["value"]:v4746,["terms"]:v4747,["gates"]:v4748,["gate_bias"]:v4749,["table"]:v4750,["below"]:v4751,["above"]:v4752});if(v4736){v4734=v4733;v4735=true;}}
let v4753;if(v4756&&v4755){v4753=v4754;}else{
v4753=v4731;if(v4756){v4754=v4753;v4755=true;}}
const v4757=v4733;
const v4758=v4757["kind"];
const v4759=v4733;
const v4760=v4759["binary"];
const v4761=v4753;
const v4762=v4733;
const v4763=v4762["a"];
const v4764=v4733;
const v4765=v4764["b"];
const v4766=v4733;
const v4767=v4766["c"];
const v4768=v4733;
const v4769=__nfValue(v4768["value"]);
const v4770=v4733;
const v4771=v4770["terms"];
const v4772=v4733;
const v4773=v4772["gates"];
const v4774=v4733;
const v4775=__nfValue(v4774["gate_bias"]);
const v4776=v4733;
const v4777=v4776["table"];
const v4778=v4733;
const v4779=v4778["below"];
const v4780=v4733;
const v4781=v4780["above"];
return ({["kind"]:v4758,["binary"]:v4760,["unary"]:v4761,["a"]:v4763,["b"]:v4765,["c"]:v4767,["value"]:v4769,["terms"]:v4771,["gates"]:v4773,["gate_bias"]:v4775,["table"]:v4777,["below"]:v4779,["above"]:v4781});};}
function __prepareFn27(fixed){const v4787=true;let v4786=false,v4785;
const v4807=fixed[0];let v4806=false,v4805;
const v4811=fixed[1];let v4810=false,v4809;
return function(v4782,v4783){let v4784;if(v4787&&v4786){v4784=v4785;}else{
const v4788="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v4789=0;
const v4790=0;
const v4791=v4788;
const v4792="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4793="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4794=v4789;
const v4795=v4790;
const v4796=0;
const v4797=__nfFromBits(0);
const v4798=[];
const v4799=[];
const v4800=__nfFromBits(0);
const v4801=[];
const v4802=false;
const v4803=false;
v4784=({["kind"]:v4791,["binary"]:v4792,["unary"]:v4793,["a"]:v4794,["b"]:v4795,["c"]:v4796,["value"]:v4797,["terms"]:v4798,["gates"]:v4799,["gate_bias"]:v4800,["table"]:v4801,["below"]:v4802,["above"]:v4803});if(v4787){v4785=v4784;v4786=true;}}
let v4804;if(v4807&&v4806){v4804=v4805;}else{
v4804=v4782;if(v4807){v4805=v4804;v4806=true;}}
let v4808;if(v4811&&v4810){v4808=v4809;}else{
v4808=__nfValue(v4783);if(v4811){v4809=v4808;v4810=true;}}
const v4812=v4784;
const v4813=v4812["kind"];
const v4814=v4784;
const v4815=v4814["binary"];
const v4816=v4784;
const v4817=v4816["unary"];
const v4818=v4784;
const v4819=v4818["a"];
const v4820=v4784;
const v4821=v4820["b"];
const v4822=v4784;
const v4823=v4822["c"];
const v4824=__nfValue(v4808);
const v4825=v4804;
const v4826=v4784;
const v4827=v4826["gates"];
const v4828=v4784;
const v4829=__nfValue(v4828["gate_bias"]);
const v4830=v4784;
const v4831=v4830["table"];
const v4832=v4784;
const v4833=v4832["below"];
const v4834=v4784;
const v4835=v4834["above"];
return ({["kind"]:v4813,["binary"]:v4815,["unary"]:v4817,["a"]:v4819,["b"]:v4821,["c"]:v4823,["value"]:v4824,["terms"]:v4825,["gates"]:v4827,["gate_bias"]:v4829,["table"]:v4831,["below"]:v4833,["above"]:v4835});};}
function __prepareFn28(fixed){const v4843=true;let v4842=false,v4841;
const v4863=fixed[0];let v4862=false,v4861;
const v4867=fixed[1];let v4866=false,v4865;
const v4871=fixed[2];let v4870=false,v4869;
const v4875=fixed[3];let v4874=false,v4873;
return function(v4836,v4837,v4838,v4839){let v4840;if(v4843&&v4842){v4840=v4841;}else{
const v4844="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v4845=0;
const v4846=0;
const v4847=v4844;
const v4848="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4849="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4850=v4845;
const v4851=v4846;
const v4852=0;
const v4853=__nfFromBits(0);
const v4854=[];
const v4855=[];
const v4856=__nfFromBits(0);
const v4857=[];
const v4858=false;
const v4859=false;
v4840=({["kind"]:v4847,["binary"]:v4848,["unary"]:v4849,["a"]:v4850,["b"]:v4851,["c"]:v4852,["value"]:v4853,["terms"]:v4854,["gates"]:v4855,["gate_bias"]:v4856,["table"]:v4857,["below"]:v4858,["above"]:v4859});if(v4843){v4841=v4840;v4842=true;}}
let v4860;if(v4863&&v4862){v4860=v4861;}else{
v4860=v4836;if(v4863){v4861=v4860;v4862=true;}}
let v4864;if(v4867&&v4866){v4864=v4865;}else{
v4864=__nfValue(v4837);if(v4867){v4865=v4864;v4866=true;}}
let v4868;if(v4871&&v4870){v4868=v4869;}else{
v4868=v4838;if(v4871){v4869=v4868;v4870=true;}}
let v4872;if(v4875&&v4874){v4872=v4873;}else{
v4872=__nfValue(v4839);if(v4875){v4873=v4872;v4874=true;}}
const v4876=v4840;
const v4877=v4876["kind"];
const v4878=v4840;
const v4879=v4878["binary"];
const v4880=v4840;
const v4881=v4880["unary"];
const v4882=v4840;
const v4883=v4882["a"];
const v4884=v4840;
const v4885=v4884["b"];
const v4886=v4840;
const v4887=v4886["c"];
const v4888=__nfValue(v4864);
const v4889=v4860;
const v4890=v4868;
const v4891=__nfValue(v4872);
const v4892=v4840;
const v4893=v4892["table"];
const v4894=v4840;
const v4895=v4894["below"];
const v4896=v4840;
const v4897=v4896["above"];
return ({["kind"]:v4877,["binary"]:v4879,["unary"]:v4881,["a"]:v4883,["b"]:v4885,["c"]:v4887,["value"]:v4888,["terms"]:v4889,["gates"]:v4890,["gate_bias"]:v4891,["table"]:v4893,["below"]:v4895,["above"]:v4897});};}
function __prepareFn29(fixed){const v4904=fixed[0]&&fixed[1];let v4903=false,v4902;
const v4924=fixed[2];let v4923=false,v4922;
return function(v4898,v4899,v4900){let v4901;if(v4904&&v4903){v4901=v4902;}else{
const v4905="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v4906=v4898;
const v4907=v4899;
const v4908=v4905;
const v4909="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4910="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4911=v4906;
const v4912=v4907;
const v4913=0;
const v4914=__nfFromBits(0);
const v4915=[];
const v4916=[];
const v4917=__nfFromBits(0);
const v4918=[];
const v4919=false;
const v4920=false;
v4901=({["kind"]:v4908,["binary"]:v4909,["unary"]:v4910,["a"]:v4911,["b"]:v4912,["c"]:v4913,["value"]:v4914,["terms"]:v4915,["gates"]:v4916,["gate_bias"]:v4917,["table"]:v4918,["below"]:v4919,["above"]:v4920});if(v4904){v4902=v4901;v4903=true;}}
let v4921;if(v4924&&v4923){v4921=v4922;}else{
v4921=v4900;if(v4924){v4922=v4921;v4923=true;}}
const v4925=v4901;
const v4926=v4925["kind"];
const v4927=v4901;
const v4928=v4927["binary"];
const v4929=v4901;
const v4930=v4929["unary"];
const v4931=v4901;
const v4932=v4931["a"];
const v4933=v4901;
const v4934=v4933["b"];
const v4935=v4921;
const v4936=v4901;
const v4937=__nfValue(v4936["value"]);
const v4938=v4901;
const v4939=v4938["terms"];
const v4940=v4901;
const v4941=v4940["gates"];
const v4942=v4901;
const v4943=__nfValue(v4942["gate_bias"]);
const v4944=v4901;
const v4945=v4944["table"];
const v4946=v4901;
const v4947=v4946["below"];
const v4948=v4901;
const v4949=v4948["above"];
return ({["kind"]:v4926,["binary"]:v4928,["unary"]:v4930,["a"]:v4932,["b"]:v4934,["c"]:v4935,["value"]:v4937,["terms"]:v4939,["gates"]:v4941,["gate_bias"]:v4943,["table"]:v4945,["below"]:v4947,["above"]:v4949});};}
function __prepareFn30(fixed){const v4957=fixed[0];let v4956=false,v4955;
const v4977=fixed[1];let v4976=false,v4975;
const v4981=fixed[2];let v4980=false,v4979;
const v4985=fixed[3];let v4984=false,v4983;
return function(v4950,v4951,v4952,v4953){let v4954;if(v4957&&v4956){v4954=v4955;}else{
const v4958="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v4959=v4950;
const v4960=0;
const v4961=v4958;
const v4962="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4963="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4964=v4959;
const v4965=v4960;
const v4966=0;
const v4967=__nfFromBits(0);
const v4968=[];
const v4969=[];
const v4970=__nfFromBits(0);
const v4971=[];
const v4972=false;
const v4973=false;
v4954=({["kind"]:v4961,["binary"]:v4962,["unary"]:v4963,["a"]:v4964,["b"]:v4965,["c"]:v4966,["value"]:v4967,["terms"]:v4968,["gates"]:v4969,["gate_bias"]:v4970,["table"]:v4971,["below"]:v4972,["above"]:v4973});if(v4957){v4955=v4954;v4956=true;}}
let v4974;if(v4977&&v4976){v4974=v4975;}else{
v4974=v4951;if(v4977){v4975=v4974;v4976=true;}}
let v4978;if(v4981&&v4980){v4978=v4979;}else{
v4978=v4952;if(v4981){v4979=v4978;v4980=true;}}
let v4982;if(v4985&&v4984){v4982=v4983;}else{
v4982=v4953;if(v4985){v4983=v4982;v4984=true;}}
const v4986=v4954;
const v4987=v4986["kind"];
const v4988=v4954;
const v4989=v4988["binary"];
const v4990=v4954;
const v4991=v4990["unary"];
const v4992=v4954;
const v4993=v4992["a"];
const v4994=v4954;
const v4995=v4994["b"];
const v4996=v4954;
const v4997=v4996["c"];
const v4998=v4954;
const v4999=__nfValue(v4998["value"]);
const v5000=v4954;
const v5001=v5000["terms"];
const v5002=v4954;
const v5003=v5002["gates"];
const v5004=v4954;
const v5005=__nfValue(v5004["gate_bias"]);
const v5006=v4974;
const v5007=v4978;
const v5008=v4982;
return ({["kind"]:v4987,["binary"]:v4989,["unary"]:v4991,["a"]:v4993,["b"]:v4995,["c"]:v4997,["value"]:v4999,["terms"]:v5001,["gates"]:v5003,["gate_bias"]:v5005,["table"]:v5006,["below"]:v5007,["above"]:v5008});};}
function __prepareFn34(fixed){const v5025=fixed[0];let v5024=false,v5023;
const v5030=fixed[0];let v5029=false,v5028;
const v5037=fixed[0];let v5036=false,v5035;
const v5048=fixed[0];let v5047=false,v5046;
const v5057=fixed[0];let v5056=false,v5055;
const v5071=fixed[0];let v5070=false,v5069;
const v5099=fixed[0];let v5098=false,v5097;
return function(v5021){let v5022;if(v5025&&v5024){v5022=v5023;}else{
const v5026=v5021;
v5022=v5026["kind"];if(v5025){v5023=v5022;v5024=true;}}
let v5027;if(v5030&&v5029){v5027=v5028;}else{
const v5031=v5022;
const v5032="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
v5027=(v5031===v5032);if(v5030){v5028=v5027;v5029=true;}}
let v5033;if(v5027){
v5033=[];}else{
let v5034;if(v5037&&v5036){v5034=v5035;}else{
const v5038=v5022;
const v5039="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
v5034=(v5038===v5039);if(v5037){v5035=v5034;v5036=true;}}
let v5040;if(v5034){
const v5041=v5021;
const v5042=v5041["a"];
const v5043=v5021;
const v5044=v5043["b"];
v5040=[v5042,v5044];}else{
let v5045;if(v5048&&v5047){v5045=v5046;}else{
const v5049=v5022;
const v5050="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
v5045=(v5049===v5050);if(v5048){v5046=v5045;v5047=true;}}
let v5051;if(v5045){
const v5052=v5021;
const v5053=v5052["a"];
v5051=[v5053];}else{
let v5054;if(v5057&&v5056){v5054=v5055;}else{
const v5058=v5022;
const v5059="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
v5054=(v5058===v5059);if(v5057){v5055=v5054;v5056=true;}}
let v5060;if(v5054){
const v5061=v5021;
const v5062=v5061["terms"];
const v5063=v5062.length;
const v5064=new Array(v5063);
for(let v5065=0;v5065<v5063;v5065++){
const v5066=v5062[v5065];
const v5067=v5066;
v5064[v5065]=v5067["wire"];
}
v5060=v5064;}else{
let v5068;if(v5071&&v5070){v5068=v5069;}else{
const v5072=v5022;
const v5073="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
v5068=(v5072===v5073);if(v5071){v5069=v5068;v5070=true;}}
let v5074;if(v5068){
const v5075=v5021;
const v5076=v5075["terms"];
const v5077=v5076.length;
const v5078=new Array(v5077);
for(let v5079=0;v5079<v5077;v5079++){
const v5080=v5076[v5079];
const v5081=v5080;
v5078[v5079]=v5081["wire"];
}
const v5082=v5078;
const v5083=v5021;
const v5084=v5083["gates"];
const v5085=v5084.length;
const v5086=new Array(v5085);
for(let v5087=0;v5087<v5085;v5087++){
const v5088=v5084[v5087];
const v5089=v5088;
v5086[v5087]=v5089["wire"];
}
const v5090=v5086;
const v5091=v5082.length;
const v5092=v5090.length;
const v5093=new Array(v5091+v5092);
for(let v5094=0;v5094<v5091;v5094++){v5093[v5094]=v5082[v5094];}
for(let v5095=0;v5095<v5092;v5095++){v5093[v5091+v5095]=v5090[v5095];}
v5074=v5093;}else{
let v5096;if(v5099&&v5098){v5096=v5097;}else{
const v5100=v5022;
const v5101="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
v5096=(v5100===v5101);if(v5099){v5097=v5096;v5098=true;}}
let v5102;if(v5096){
const v5103=v5021;
const v5104=v5103["a"];
const v5105=v5021;
const v5106=v5105["b"];
const v5107=v5021;
const v5108=v5107["c"];
v5102=[v5104,v5106,v5108];}else{
const v5109=v5021;
const v5110=v5109["a"];
const v5111=[v5110];
const v5112=v5021;
const v5113=v5112["table"];
const v5114=v5111.length;
const v5115=v5113.length;
const v5116=new Array(v5114+v5115);
for(let v5117=0;v5117<v5114;v5117++){v5116[v5117]=v5111[v5117];}
for(let v5118=0;v5118<v5115;v5118++){v5116[v5114+v5118]=v5113[v5118];}
v5102=v5116;}
v5074=v5102;}
v5060=v5074;}
v5051=v5060;}
v5040=v5051;}
v5033=v5040;}
return v5033;};}
function __prepareFn35(fixed){const v5124=fixed[0];let v5123=false,v5122;
const v5129=fixed[0];let v5128=false,v5127;
const v5136=fixed[0];let v5135=false,v5134;
const v5143=fixed[0]&&fixed[1];let v5142=false,v5141;
const v5151=fixed[0]&&fixed[1];let v5150=false,v5149;
const v5183=fixed[0];let v5182=false,v5181;
const v5190=fixed[0]&&fixed[1];let v5189=false,v5188;
const v5223=fixed[0];let v5222=false,v5221;
const v5230=fixed[0]&&fixed[1];let v5229=false,v5228;
const v5272=fixed[0];let v5271=false,v5270;
const v5279=fixed[0]&&fixed[1];let v5278=false,v5277;
const v5296=fixed[0]&&fixed[1];let v5295=false,v5294;
const v5337=fixed[0];let v5336=false,v5335;
const v5344=fixed[0]&&fixed[1];let v5343=false,v5342;
const v5352=fixed[0]&&fixed[1];let v5351=false,v5350;
const v5360=fixed[0]&&fixed[1];let v5359=false,v5358;
const v5391=fixed[0]&&fixed[1];let v5390=false,v5389;
const v5399=fixed[0]&&fixed[1];let v5398=false,v5397;
return function(v5119,v5120){let v5121;if(v5124&&v5123){v5121=v5122;}else{
const v5125=v5119;
v5121=v5125["kind"];if(v5124){v5122=v5121;v5123=true;}}
let v5126;if(v5129&&v5128){v5126=v5127;}else{
const v5130=v5121;
const v5131="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
v5126=(v5130===v5131);if(v5129){v5127=v5126;v5128=true;}}
let v5132;if(v5126){
v5132=v5119;}else{
let v5133;if(v5136&&v5135){v5133=v5134;}else{
const v5137=v5121;
const v5138="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
v5133=(v5137===v5138);if(v5136){v5134=v5133;v5135=true;}}
let v5139;if(v5133){
let v5140;if(v5143&&v5142){v5140=v5141;}else{
const v5144=v5120;
const v5145=v5119;
const v5146=v5145["a"];
let v5147;if(v5146<v5144.length){v5147=v5144[v5146];}else{
v5147=0;}
v5140=v5147;if(v5143){v5141=v5140;v5142=true;}}
let v5148;if(v5151&&v5150){v5148=v5149;}else{
const v5152=v5120;
const v5153=v5119;
const v5154=v5153["b"];
let v5155;if(v5154<v5152.length){v5155=v5152[v5154];}else{
v5155=0;}
v5148=v5155;if(v5151){v5149=v5148;v5150=true;}}
const v5156=v5119;
const v5157=v5156["kind"];
const v5158=v5119;
const v5159=v5158["binary"];
const v5160=v5119;
const v5161=v5160["unary"];
const v5162=v5140;
const v5163=v5148;
const v5164=v5119;
const v5165=v5164["c"];
const v5166=v5119;
const v5167=__nfValue(v5166["value"]);
const v5168=v5119;
const v5169=v5168["terms"];
const v5170=v5119;
const v5171=v5170["gates"];
const v5172=v5119;
const v5173=__nfValue(v5172["gate_bias"]);
const v5174=v5119;
const v5175=v5174["table"];
const v5176=v5119;
const v5177=v5176["below"];
const v5178=v5119;
const v5179=v5178["above"];
v5139=({["kind"]:v5157,["binary"]:v5159,["unary"]:v5161,["a"]:v5162,["b"]:v5163,["c"]:v5165,["value"]:v5167,["terms"]:v5169,["gates"]:v5171,["gate_bias"]:v5173,["table"]:v5175,["below"]:v5177,["above"]:v5179});}else{
let v5180;if(v5183&&v5182){v5180=v5181;}else{
const v5184=v5121;
const v5185="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
v5180=(v5184===v5185);if(v5183){v5181=v5180;v5182=true;}}
let v5186;if(v5180){
let v5187;if(v5190&&v5189){v5187=v5188;}else{
const v5191=v5120;
const v5192=v5119;
const v5193=v5192["a"];
let v5194;if(v5193<v5191.length){v5194=v5191[v5193];}else{
v5194=0;}
v5187=v5194;if(v5190){v5188=v5187;v5189=true;}}
const v5195=v5119;
const v5196=v5195["kind"];
const v5197=v5119;
const v5198=v5197["binary"];
const v5199=v5119;
const v5200=v5199["unary"];
const v5201=v5187;
const v5202=v5119;
const v5203=v5202["b"];
const v5204=v5119;
const v5205=v5204["c"];
const v5206=v5119;
const v5207=__nfValue(v5206["value"]);
const v5208=v5119;
const v5209=v5208["terms"];
const v5210=v5119;
const v5211=v5210["gates"];
const v5212=v5119;
const v5213=__nfValue(v5212["gate_bias"]);
const v5214=v5119;
const v5215=v5214["table"];
const v5216=v5119;
const v5217=v5216["below"];
const v5218=v5119;
const v5219=v5218["above"];
v5186=({["kind"]:v5196,["binary"]:v5198,["unary"]:v5200,["a"]:v5201,["b"]:v5203,["c"]:v5205,["value"]:v5207,["terms"]:v5209,["gates"]:v5211,["gate_bias"]:v5213,["table"]:v5215,["below"]:v5217,["above"]:v5219});}else{
let v5220;if(v5223&&v5222){v5220=v5221;}else{
const v5224=v5121;
const v5225="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
v5220=(v5224===v5225);if(v5223){v5221=v5220;v5222=true;}}
let v5226;if(v5220){
let v5227;if(v5230&&v5229){v5227=v5228;}else{
const v5231=v5119;
const v5232=v5231["terms"];
const v5233=v5232.length;
const v5234=new Array(v5233);
for(let v5235=0;v5235<v5233;v5235++){
const v5236=v5232[v5235];
const v5237=v5120;
const v5238=v5236;
const v5239=v5238["wire"];
let v5240;if(v5239<v5237.length){v5240=v5237[v5239];}else{
v5240=0;}
const v5241=v5240;
const v5242=v5236;
const v5243=__nfValue(v5242["coefficient"]);
v5234[v5235]=({["wire"]:v5241,["coefficient"]:v5243});
}
v5227=v5234;if(v5230){v5228=v5227;v5229=true;}}
const v5244=v5119;
const v5245=v5244["kind"];
const v5246=v5119;
const v5247=v5246["binary"];
const v5248=v5119;
const v5249=v5248["unary"];
const v5250=v5119;
const v5251=v5250["a"];
const v5252=v5119;
const v5253=v5252["b"];
const v5254=v5119;
const v5255=v5254["c"];
const v5256=v5119;
const v5257=__nfValue(v5256["value"]);
const v5258=v5227;
const v5259=v5119;
const v5260=v5259["gates"];
const v5261=v5119;
const v5262=__nfValue(v5261["gate_bias"]);
const v5263=v5119;
const v5264=v5263["table"];
const v5265=v5119;
const v5266=v5265["below"];
const v5267=v5119;
const v5268=v5267["above"];
v5226=({["kind"]:v5245,["binary"]:v5247,["unary"]:v5249,["a"]:v5251,["b"]:v5253,["c"]:v5255,["value"]:v5257,["terms"]:v5258,["gates"]:v5260,["gate_bias"]:v5262,["table"]:v5264,["below"]:v5266,["above"]:v5268});}else{
let v5269;if(v5272&&v5271){v5269=v5270;}else{
const v5273=v5121;
const v5274="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
v5269=(v5273===v5274);if(v5272){v5270=v5269;v5271=true;}}
let v5275;if(v5269){
let v5276;if(v5279&&v5278){v5276=v5277;}else{
const v5280=v5119;
const v5281=v5280["terms"];
const v5282=v5281.length;
const v5283=new Array(v5282);
for(let v5284=0;v5284<v5282;v5284++){
const v5285=v5281[v5284];
const v5286=v5120;
const v5287=v5285;
const v5288=v5287["wire"];
let v5289;if(v5288<v5286.length){v5289=v5286[v5288];}else{
v5289=0;}
const v5290=v5289;
const v5291=v5285;
const v5292=__nfValue(v5291["coefficient"]);
v5283[v5284]=({["wire"]:v5290,["coefficient"]:v5292});
}
v5276=v5283;if(v5279){v5277=v5276;v5278=true;}}
let v5293;if(v5296&&v5295){v5293=v5294;}else{
const v5297=v5119;
const v5298=v5297["gates"];
const v5299=v5298.length;
const v5300=new Array(v5299);
for(let v5301=0;v5301<v5299;v5301++){
const v5302=v5298[v5301];
const v5303=v5120;
const v5304=v5302;
const v5305=v5304["wire"];
let v5306;if(v5305<v5303.length){v5306=v5303[v5305];}else{
v5306=0;}
const v5307=v5306;
const v5308=v5302;
const v5309=__nfValue(v5308["coefficient"]);
v5300[v5301]=({["wire"]:v5307,["coefficient"]:v5309});
}
v5293=v5300;if(v5296){v5294=v5293;v5295=true;}}
const v5310=v5119;
const v5311=v5310["kind"];
const v5312=v5119;
const v5313=v5312["binary"];
const v5314=v5119;
const v5315=v5314["unary"];
const v5316=v5119;
const v5317=v5316["a"];
const v5318=v5119;
const v5319=v5318["b"];
const v5320=v5119;
const v5321=v5320["c"];
const v5322=v5119;
const v5323=__nfValue(v5322["value"]);
const v5324=v5276;
const v5325=v5293;
const v5326=v5119;
const v5327=__nfValue(v5326["gate_bias"]);
const v5328=v5119;
const v5329=v5328["table"];
const v5330=v5119;
const v5331=v5330["below"];
const v5332=v5119;
const v5333=v5332["above"];
v5275=({["kind"]:v5311,["binary"]:v5313,["unary"]:v5315,["a"]:v5317,["b"]:v5319,["c"]:v5321,["value"]:v5323,["terms"]:v5324,["gates"]:v5325,["gate_bias"]:v5327,["table"]:v5329,["below"]:v5331,["above"]:v5333});}else{
let v5334;if(v5337&&v5336){v5334=v5335;}else{
const v5338=v5121;
const v5339="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
v5334=(v5338===v5339);if(v5337){v5335=v5334;v5336=true;}}
let v5340;if(v5334){
let v5341;if(v5344&&v5343){v5341=v5342;}else{
const v5345=v5120;
const v5346=v5119;
const v5347=v5346["a"];
let v5348;if(v5347<v5345.length){v5348=v5345[v5347];}else{
v5348=0;}
v5341=v5348;if(v5344){v5342=v5341;v5343=true;}}
let v5349;if(v5352&&v5351){v5349=v5350;}else{
const v5353=v5120;
const v5354=v5119;
const v5355=v5354["b"];
let v5356;if(v5355<v5353.length){v5356=v5353[v5355];}else{
v5356=0;}
v5349=v5356;if(v5352){v5350=v5349;v5351=true;}}
let v5357;if(v5360&&v5359){v5357=v5358;}else{
const v5361=v5120;
const v5362=v5119;
const v5363=v5362["c"];
let v5364;if(v5363<v5361.length){v5364=v5361[v5363];}else{
v5364=0;}
v5357=v5364;if(v5360){v5358=v5357;v5359=true;}}
const v5365=v5119;
const v5366=v5365["kind"];
const v5367=v5119;
const v5368=v5367["binary"];
const v5369=v5119;
const v5370=v5369["unary"];
const v5371=v5341;
const v5372=v5349;
const v5373=v5357;
const v5374=v5119;
const v5375=__nfValue(v5374["value"]);
const v5376=v5119;
const v5377=v5376["terms"];
const v5378=v5119;
const v5379=v5378["gates"];
const v5380=v5119;
const v5381=__nfValue(v5380["gate_bias"]);
const v5382=v5119;
const v5383=v5382["table"];
const v5384=v5119;
const v5385=v5384["below"];
const v5386=v5119;
const v5387=v5386["above"];
v5340=({["kind"]:v5366,["binary"]:v5368,["unary"]:v5370,["a"]:v5371,["b"]:v5372,["c"]:v5373,["value"]:v5375,["terms"]:v5377,["gates"]:v5379,["gate_bias"]:v5381,["table"]:v5383,["below"]:v5385,["above"]:v5387});}else{
let v5388;if(v5391&&v5390){v5388=v5389;}else{
const v5392=v5120;
const v5393=v5119;
const v5394=v5393["a"];
let v5395;if(v5394<v5392.length){v5395=v5392[v5394];}else{
v5395=0;}
v5388=v5395;if(v5391){v5389=v5388;v5390=true;}}
let v5396;if(v5399&&v5398){v5396=v5397;}else{
const v5400=v5119;
const v5401=v5400["table"];
const v5402=v5401.length;
const v5403=new Array(v5402);
for(let v5404=0;v5404<v5402;v5404++){
const v5405=(v5401[v5404]>>>0);
const v5406=v5120;
const v5407=v5405;
let v5408;if(v5407<v5406.length){v5408=v5406[v5407];}else{
v5408=0;}
v5403[v5404]=v5408;
}
v5396=v5403;if(v5399){v5397=v5396;v5398=true;}}
const v5409=v5119;
const v5410=v5409["kind"];
const v5411=v5119;
const v5412=v5411["binary"];
const v5413=v5119;
const v5414=v5413["unary"];
const v5415=v5388;
const v5416=v5119;
const v5417=v5416["b"];
const v5418=v5119;
const v5419=v5418["c"];
const v5420=v5119;
const v5421=__nfValue(v5420["value"]);
const v5422=v5119;
const v5423=v5422["terms"];
const v5424=v5119;
const v5425=v5424["gates"];
const v5426=v5119;
const v5427=__nfValue(v5426["gate_bias"]);
const v5428=v5396;
const v5429=v5119;
const v5430=v5429["below"];
const v5431=v5119;
const v5432=v5431["above"];
v5340=({["kind"]:v5410,["binary"]:v5412,["unary"]:v5414,["a"]:v5415,["b"]:v5417,["c"]:v5419,["value"]:v5421,["terms"]:v5423,["gates"]:v5425,["gate_bias"]:v5427,["table"]:v5428,["below"]:v5430,["above"]:v5432});}
v5275=v5340;}
v5226=v5275;}
v5186=v5226;}
v5139=v5186;}
v5132=v5139;}
return v5132;};}
function __prepareFn37(fixed){const v5438=fixed[0];let v5437=false,v5436;
const v5443=fixed[0];let v5442=false,v5441;
const v5450=fixed[0];let v5449=false,v5448;
const v5465=fixed[0];let v5464=false,v5463;
const v5475=fixed[0];let v5474=false,v5473;
const v5492=fixed[0];let v5491=false,v5490;
const v5521=fixed[0];let v5520=false,v5519;
return function(v5433,v5434){let v5435;if(v5438&&v5437){v5435=v5436;}else{
const v5439=v5433;
v5435=v5439["kind"];if(v5438){v5436=v5435;v5437=true;}}
let v5440;if(v5443&&v5442){v5440=v5441;}else{
const v5444=v5435;
const v5445="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
v5440=(v5444===v5445);if(v5443){v5441=v5440;v5442=true;}}
let v5446;if(v5440){
v5446=true;}else{
let v5447;if(v5450&&v5449){v5447=v5448;}else{
const v5451=v5435;
const v5452="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
v5447=(v5451===v5452);if(v5450){v5448=v5447;v5449=true;}}
let v5453;if(v5447){
const v5454=v5433;
const v5455=v5454["a"];
const v5456=v5434;
const v5457=((v5455) < (v5456));
let v5458=v5457;if(v5458){
const v5459=v5433;
const v5460=v5459["b"];
const v5461=v5434;
v5458=((v5460) < (v5461));}
v5453=v5458;}else{
let v5462;if(v5465&&v5464){v5462=v5463;}else{
const v5466=v5435;
const v5467="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
v5462=(v5466===v5467);if(v5465){v5463=v5462;v5464=true;}}
let v5468;if(v5462){
const v5469=v5433;
const v5470=v5469["a"];
const v5471=v5434;
v5468=((v5470) < (v5471));}else{
let v5472;if(v5475&&v5474){v5472=v5473;}else{
const v5476=v5435;
const v5477="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
v5472=(v5476===v5477);if(v5475){v5473=v5472;v5474=true;}}
let v5478;if(v5472){
const v5479=v5433;
const v5480=v5479["terms"];
let v5481=true;
for(let v5482=0;v5482<v5480.length;v5482++){
const v5483=v5480[v5482];
const v5484=v5481;
let v5485=v5484;if(v5485){
const v5486=v5483;
const v5487=v5486["wire"];
const v5488=v5434;
v5485=((v5487) < (v5488));}
v5481=v5485;
}
v5478=v5481;}else{
let v5489;if(v5492&&v5491){v5489=v5490;}else{
const v5493=v5435;
const v5494="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
v5489=(v5493===v5494);if(v5492){v5490=v5489;v5491=true;}}
let v5495;if(v5489){
const v5496=v5433;
const v5497=v5496["terms"];
let v5498=true;
for(let v5499=0;v5499<v5497.length;v5499++){
const v5500=v5497[v5499];
const v5501=v5498;
let v5502=v5501;if(v5502){
const v5503=v5500;
const v5504=v5503["wire"];
const v5505=v5434;
v5502=((v5504) < (v5505));}
v5498=v5502;
}
const v5506=v5498;
let v5507=v5506;if(v5507){
const v5508=v5433;
const v5509=v5508["gates"];
let v5510=true;
for(let v5511=0;v5511<v5509.length;v5511++){
const v5512=v5509[v5511];
const v5513=v5510;
let v5514=v5513;if(v5514){
const v5515=v5512;
const v5516=v5515["wire"];
const v5517=v5434;
v5514=((v5516) < (v5517));}
v5510=v5514;
}
v5507=v5510;}
v5495=v5507;}else{
let v5518;if(v5521&&v5520){v5518=v5519;}else{
const v5522=v5435;
const v5523="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
v5518=(v5522===v5523);if(v5521){v5519=v5518;v5520=true;}}
let v5524;if(v5518){
const v5525=v5433;
const v5526=v5525["a"];
const v5527=v5434;
const v5528=((v5526) < (v5527));
let v5529=v5528;if(v5529){
const v5530=v5433;
const v5531=v5530["b"];
const v5532=v5434;
v5529=((v5531) < (v5532));}
const v5533=v5529;
let v5534=v5533;if(v5534){
const v5535=v5433;
const v5536=v5535["c"];
const v5537=v5434;
v5534=((v5536) < (v5537));}
v5524=v5534;}else{
const v5538=v5433;
const v5539=v5538["a"];
const v5540=v5434;
const v5541=((v5539) < (v5540));
let v5542=v5541;if(v5542){
const v5543=v5433;
const v5544=v5543["table"];
let v5545=true;
for(let v5546=0;v5546<v5544.length;v5546++){
const v5547=(v5544[v5546]>>>0);
const v5548=v5545;
let v5549=v5548;if(v5549){
const v5550=v5547;
const v5551=v5434;
v5549=((v5550) < (v5551));}
v5545=v5549;
}
v5542=v5545;}
v5524=v5542;}
v5495=v5524;}
v5478=v5495;}
v5468=v5478;}
v5453=v5468;}
v5446=v5453;}
return v5446;};}
function __prepareFn38(fixed){const v5558=fixed[0]&&fixed[1];let v5557=false,v5556;
const v5572=fixed[0]&&fixed[1];let v5571=false,v5570;
const v5578=fixed[0]&&fixed[1];let v5577=false,v5576;
return function(v5552,v5553,v5554){let v5555;if(v5558&&v5557){v5555=v5556;}else{
const v5559=v5553;
const v5560=v5559.length;
const v5561=4294967295;
const v5562=((v5560) > (v5561));
let v5563=v5562;if(!v5563){
const v5564=(v5553).length;
const v5565=4294967295;
const v5566=v5552;
const v5567=(((v5565) - (v5566)) >>> 0);
v5563=((v5564) > (v5567));}
v5555=v5563;if(v5558){v5556=v5555;v5557=true;}}
let v5568;if(v5555){
v5568=false;}else{
let v5569;if(v5572&&v5571){v5569=v5570;}else{
const v5573=v5552;
const v5574=(v5553).length;
v5569=(((v5573) + (v5574)) >>> 0);if(v5572){v5570=v5569;v5571=true;}}
let v5575;if(v5578&&v5577){v5575=v5576;}else{
const v5579=v5553;
const v5580=v5552;
const v5581=true;
let v5582=({["wire"]:v5580,["valid"]:v5581});
for(let v5583=0;v5583<v5579.length;v5583++){
const v5584=v5579[v5583];
const v5585=v5582;
const v5586=v5585["wire"];
const v5587=1;
const v5588=(((v5586) + (v5587)) >>> 0);
const v5589=v5582;
const v5590=v5589["valid"];
let v5591=v5590;if(v5591){
const v5592=v5584;
const v5593=v5582;
const v5594=v5593["wire"];
v5591=__fn37(v5592,v5594);}
const v5595=v5591;
v5582=({["wire"]:v5588,["valid"]:v5595});
}
v5575=v5582;if(v5578){v5576=v5575;v5577=true;}}
const v5596=v5575;
const v5597=v5596["valid"];
let v5598=v5597;if(v5598){
const v5599=v5554;
let v5600=true;
for(let v5601=0;v5601<v5599.length;v5601++){
const v5602=(v5599[v5601]>>>0);
const v5603=v5600;
let v5604=v5603;if(v5604){
const v5605=v5602;
const v5606=v5569;
v5604=((v5605) < (v5606));}
v5600=v5604;
}
v5598=v5600;}
v5568=v5598;}
return v5568;};}
function __prepareFn39(fixed){const v5614=fixed[0]&&fixed[1]&&fixed[3];let v5613=false,v5612;
const v5632=fixed[0]&&fixed[1]&&fixed[2];let v5631=false,v5630;
const v5642=fixed[0]&&fixed[1];let v5641=false,v5640;
const v5673=fixed[0]&&fixed[1]&&fixed[2];let v5672=false,v5671;
const v5688=fixed[0];let v5687=false,v5686;
const v5692=fixed[0];let v5691=false,v5690;
const v5732=fixed[0]&&fixed[1]&&fixed[2];let v5731=false,v5730;
const v5739=fixed[0]&&fixed[1]&&fixed[2];let v5738=false,v5737;
const v5744=fixed[0]&&fixed[1]&&fixed[2];let v5743=false,v5742;
const v5750=fixed[0];let v5749=false,v5748;
const v5786=fixed[0]&&fixed[1]&&fixed[2];let v5785=false,v5784;
return function(v5607,v5608,v5609,v5610){let v5611;if(v5614&&v5613){v5611=v5612;}else{
const v5615=v5608;
const v5616=v5615.length;
const v5617=4294967295;
const v5618=((v5616) > (v5617));
let v5619=v5618;if(!v5619){
const v5620=v5607;
const v5621=v5610;
v5619=((v5620) > (v5621));}
const v5622=v5619;
let v5623=v5622;if(!v5623){
const v5624=(v5608).length;
const v5625=v5610;
const v5626=v5607;
const v5627=(((v5625) - (v5626)) >>> 0);
v5623=((v5624) > (v5627));}
v5611=v5623;if(v5614){v5612=v5611;v5613=true;}}
let v5628;if(v5611){
v5628=({Err:"graph capacity"});}else{
let v5629;if(v5632&&v5631){v5629=v5630;}else{
const v5633=v5607;
const v5634=v5608;
const v5635=v5609;
const v5636=__fn38(v5633,v5634,v5635);
const v5637=false;
v5629=(v5636===v5637);if(v5632){v5630=v5629;v5631=true;}}
let v5638;if(v5629){
v5638=({Err:"graph is not topologically ordered"});}else{
let v5639;if(v5642&&v5641){v5639=v5640;}else{
const v5643=v5607;
const v5644=(v5608).length;
v5639=(((v5643) + (v5644)) >>> 0);if(v5642){v5640=v5639;v5641=true;}}
const v5645=__bufferFill(v5639,false);
const v5647=v5609;
const v5648=v5645;
let v5649=({["live"]:v5648});
for(let v5650=0;v5650<v5647.length;v5650++){
const v5651=(v5647[v5650]>>>0);
const v5652=v5649;
const v5653=v5652["live"];
const v5654=v5653;
const v5655=v5651;
const v5656=__tempSet(v5654,v5655,true,false);
const v5657=v5656;
v5649=({["live"]:v5657});
}
const v5646=v5649;
const v5659=v5646;
const v5658=v5659["live"];
const v5661=v5608;
const v5662=v5658;
const v5663=v5639;
let v5664=({["live"]:v5662,["wire"]:v5663});
for(let v5665=v5661.length-1;v5665>=0;v5665--){
const v5666=v5661[v5665];
const v5667=v5666;
const v5668=v5664;
const v5669=v5607;
v5664=__fn36(v5667,v5668,v5669);
}
const v5660=v5664;
let v5670;if(v5673&&v5672){v5670=v5671;}else{
const v5674=v5660;
const v5675=v5674["live"];
v5670=v5675.freeze();if(v5673){v5671=v5670;v5672=true;}}
const v5676=__bufferFill(v5639,0);
const v5678=v5607;
let v5679=v5676;
for(let v5680=0;v5680<v5678;v5680++){
if(false){break;}
const v5681=(v5680>>>0);
const v5682=v5679;
const v5683=v5681;
v5679=__tempSet(v5682,v5683,v5681,false);}
const v5677=v5679;
const v5684=v5677;
let v5685;if(v5688&&v5687){v5685=v5686;}else{
v5685=v5607;if(v5688){v5686=v5685;v5687=true;}}
let v5689;if(v5692&&v5691){v5689=v5690;}else{
v5689=v5607;if(v5692){v5690=v5689;v5691=true;}}
const v5694=v5608;
const v5695=v5689;
const v5696=v5684;
const v5697=v5685;
let v5698=({["next"]:v5695,["positions"]:v5696,["wire"]:v5697});
for(let v5699=0;v5699<v5694.length;v5699++){
const v5700=v5694[v5699];
const v5701=v5698;
const v5702=v5701["next"];
const v5703=v5698;
const v5704=v5703["positions"];
const v5705=v5698;
const v5706=v5705["wire"];
const v5707=v5670;
const v5708=v5706;
let v5709;if(v5708<v5707.length){v5709=v5707[v5708];}else{
v5709=false;}
let v5710;if(v5709){
const v5711=v5704;
const v5712=v5706;
const v5713=__tempSet(v5711,v5712,v5702,false);
const v5714=v5702;
const v5715=1;
const v5716=(((v5714) + (v5715)) >>> 0);
const v5717=v5706;
const v5718=1;
const v5719=(((v5717) + (v5718)) >>> 0);
const v5720=v5716;
const v5721=v5713;
const v5722=v5719;
v5710=({["next"]:v5720,["positions"]:v5721,["wire"]:v5722});}else{
const v5723=v5706;
const v5724=1;
const v5725=(((v5723) + (v5724)) >>> 0);
const v5726=v5702;
const v5727=v5704;
const v5728=v5725;
v5710=({["next"]:v5726,["positions"]:v5727,["wire"]:v5728});}
v5698=v5710;
}
const v5693=v5698;
let v5729;if(v5732&&v5731){v5729=v5730;}else{
const v5733=v5693;
v5729=v5733["next"];if(v5732){v5730=v5729;v5731=true;}}
const v5735=v5693;
const v5734=v5735["positions"];
let v5736;if(v5739&&v5738){v5736=v5737;}else{
const v5740=v5693;
v5736=v5740["wire"];if(v5739){v5737=v5736;v5738=true;}}
let v5741;if(v5744&&v5743){v5741=v5742;}else{
const v5745=v5734;
v5741=v5745.freeze();if(v5744){v5742=v5741;v5743=true;}}
const v5746=new __InkBuffer([]);
let v5747;if(v5750&&v5749){v5747=v5748;}else{
v5747=v5607;if(v5750){v5748=v5747;v5749=true;}}
const v5752=v5608;
const v5753=v5746;
const v5754=v5747;
let v5755=({["compact"]:v5753,["wire"]:v5754});
for(let v5756=0;v5756<v5752.length;v5756++){
const v5757=v5752[v5756];
const v5758=v5755;
const v5759=v5758["compact"];
const v5760=v5755;
const v5761=v5760["wire"];
const v5762=v5670;
const v5763=v5761;
let v5764;if(v5763<v5762.length){v5764=v5762[v5763];}else{
v5764=false;}
let v5765;if(v5764){
const v5766=v5759;
const v5767=v5757;
const v5768=v5741;
const v5769=__fn35(v5767,v5768);
const v5770=__tempEdit(v5766,"push",v5769);
const v5771=v5761;
const v5772=1;
const v5773=(((v5771) + (v5772)) >>> 0);
const v5774=v5770;
const v5775=v5773;
v5765=({["compact"]:v5774,["wire"]:v5775});}else{
const v5776=v5761;
const v5777=1;
const v5778=(((v5776) + (v5777)) >>> 0);
const v5779=v5759;
const v5780=v5778;
v5765=({["compact"]:v5779,["wire"]:v5780});}
v5755=v5765;
}
const v5751=v5755;
const v5782=v5751;
const v5781=v5782["compact"];
let v5783;if(v5786&&v5785){v5783=v5784;}else{
const v5787=v5751;
v5783=v5787["wire"];if(v5786){v5784=v5783;v5785=true;}}
const v5788=v5607;
const v5789=v5781;
const v5790=v5789.freeze();
const v5791=v5609;
const v5792=v5791.length;
const v5793=new Array(v5792);
for(let v5794=0;v5794<v5792;v5794++){
const v5795=(v5791[v5794]>>>0);
const v5796=v5741;
const v5797=v5795;
let v5798;if(v5797<v5796.length){v5798=v5796[v5797];}else{
v5798=0;}
v5793[v5794]=v5798;
}
const v5799=v5793;
v5638=({Ok:({["inputs"]:v5788,["nodes"]:v5790,["roots"]:v5799})});}
v5628=v5638;}
return v5628;};}
function __prepareFn43(fixed){const v5812=fixed[0];let v5811=false,v5810;
const v5816=fixed[0];let v5815=false,v5814;
const v5825=fixed[0];let v5824=false,v5823;
const v5834=fixed[0];let v5833=false,v5832;
return function(v5806,v5807,v5808){let v5809;if(v5812&&v5811){v5809=v5810;}else{
v5809=v5806;if(v5812){v5810=v5809;v5811=true;}}
let v5813;if(v5816&&v5815){v5813=v5814;}else{
const v5817=v5809;
const v5818="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
v5813=(v5817===v5818);if(v5816){v5814=v5813;v5815=true;}}
let v5819;if(v5813){
const v5820=__nfValue(v5807);
const v5821=__nfValue(v5808);
v5819=Math.fround(__nfNumber(v5820) + __nfNumber(v5821));}else{
let v5822;if(v5825&&v5824){v5822=v5823;}else{
const v5826=v5809;
const v5827="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
v5822=(v5826===v5827);if(v5825){v5823=v5822;v5824=true;}}
let v5828;if(v5822){
const v5829=__nfValue(v5807);
const v5830=__nfValue(v5808);
v5828=Math.fround(__nfNumber(v5829) - __nfNumber(v5830));}else{
let v5831;if(v5834&&v5833){v5831=v5832;}else{
const v5835=v5809;
const v5836="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
v5831=(v5835===v5836);if(v5834){v5832=v5831;v5833=true;}}
let v5837;if(v5831){
const v5838=__nfValue(v5807);
const v5839=__nfValue(v5808);
v5837=Math.fround(__nfNumber(v5838) * __nfNumber(v5839));}else{
v5837=Math.fround((__nfNumber(__nfValue(v5807)))/(__nfNumber(__nfValue(v5808))));}
v5828=v5837;}
v5819=v5828;}
return v5819;};}
function __prepareFn44(fixed){const v5844=fixed[0];let v5843=false,v5842;
const v5849=fixed[0];let v5848=false,v5847;
return function(v5840){let v5841;if(v5844&&v5843){v5841=v5842;}else{
v5841=Number.isNaN(__nfNumber(__nfValue(v5840)));if(v5844){v5842=v5841;v5843=true;}}
let v5845;if(v5841){
v5845=__nfFromBits(2143289344);}else{
let v5846;if(v5849&&v5848){v5846=v5847;}else{
const v5850=__nfValue(v5840);
const v5851=__nfFromBits(0);
v5846=((__nfNumber(v5850)) > (__nfNumber(v5851)));if(v5849){v5847=v5846;v5848=true;}}
let v5852;if(v5846){
v5852=__nfValue(v5840);}else{
v5852=__nfFromBits(0);}
v5845=v5852;}
return v5845;};}
function __prepareFn45(fixed){const v5858=fixed[0];let v5857=false,v5856;
const v5862=fixed[0];let v5861=false,v5860;
const v5869=fixed[0];let v5868=false,v5867;
const v5877=fixed[0];let v5876=false,v5875;
const v5885=fixed[1];let v5884=false,v5883;
const v5890=fixed[1];let v5889=false,v5888;
const v5897=fixed[1];let v5896=false,v5895;
return function(v5853,v5854){let v5855;if(v5858&&v5857){v5855=v5856;}else{
v5855=v5853;if(v5858){v5856=v5855;v5857=true;}}
let v5859;if(v5862&&v5861){v5859=v5860;}else{
const v5863=v5855;
const v5864="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
v5859=(v5863===v5864);if(v5862){v5860=v5859;v5861=true;}}
let v5865;if(v5859){
v5865=Math.fround(Math.sqrt(__nfNumber(__nfValue(v5854))));}else{
let v5866;if(v5869&&v5868){v5866=v5867;}else{
const v5870=v5855;
const v5871="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
v5866=(v5870===v5871);if(v5869){v5867=v5866;v5868=true;}}
let v5872;if(v5866){
const v5873=__nfValue(v5854);
v5872=__nfNeg(v5873);}else{
let v5874;if(v5877&&v5876){v5874=v5875;}else{
const v5878=v5855;
const v5879="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
v5874=(v5878===v5879);if(v5877){v5875=v5874;v5876=true;}}
let v5880;if(v5874){
const v5881=__nfValue(v5854);
let v5882;if(v5885&&v5884){v5882=v5883;}else{
v5882=Number.isNaN(__nfNumber(__nfValue(v5881)));if(v5885){v5883=v5882;v5884=true;}}
let v5886;if(v5882){
v5886=__nfFromBits(2143289344);}else{
let v5887;if(v5890&&v5889){v5887=v5888;}else{
const v5891=__nfValue(v5881);
const v5892=__nfFromBits(0);
v5887=((__nfNumber(v5891)) > (__nfNumber(v5892)));if(v5890){v5888=v5887;v5889=true;}}
let v5893;if(v5887){
v5893=__nfValue(v5881);}else{
v5893=__nfFromBits(0);}
v5886=v5893;}
v5880=v5886;}else{
let v5894;if(v5897&&v5896){v5894=v5895;}else{
const v5898=__nfValue(v5854);
const v5899=__nfFromBits(0);
v5894=((__nfNumber(v5898)) > (__nfNumber(v5899)));if(v5897){v5895=v5894;v5896=true;}}
let v5900;if(v5894){
v5900=__nfFromBits(1065353216);}else{
v5900=__nfFromBits(0);}
v5880=v5900;}
v5872=v5880;}
v5865=v5872;}
return v5865;};}
function __prepareFn49(fixed){const v5908=fixed[0]&&fixed[1];let v5907=false,v5906;
const v5919=fixed[0];let v5918=false,v5917;
const v5926=fixed[2];let v5925=false,v5924;
const v5931=fixed[0]&&fixed[1];let v5930=false,v5929;
const v5938=fixed[3];let v5937=false,v5936;
return function(v5901,v5902,v5903,v5904){let v5905;if(v5908&&v5907){v5905=v5906;}else{
const v5909=v5902;
const v5910=0;
const v5911=(v5909===v5910);
let v5912=v5911;if(!v5912){
const v5913=Number.isFinite(__nfNumber(__nfValue(v5901)));
const v5914=false;
v5912=(v5913===v5914);}
v5905=v5912;if(v5908){v5906=v5905;v5907=true;}}
let v5915;if(v5905){
v5915=({None:null});}else{
let v5916;if(v5919&&v5918){v5916=v5917;}else{
const v5920=__nfValue(v5901);
const v5921=__nfFromBits(0);
v5916=((__nfNumber(v5920)) < (__nfNumber(v5921)));if(v5919){v5917=v5916;v5918=true;}}
let v5922;if(v5916){
let v5923;if(v5926&&v5925){v5923=v5924;}else{
v5923=v5903;if(v5926){v5924=v5923;v5925=true;}}
let v5927;if(v5923){
v5927=({None:null});}else{
v5927=({Some:0});}
v5922=v5927;}else{
let v5928;if(v5931&&v5930){v5928=v5929;}else{
const v5932=__nfValue(v5901);
const v5933=Math.fround(v5902);
v5928=((__nfNumber(v5932)) >= (__nfNumber(v5933)));if(v5931){v5929=v5928;v5930=true;}}
let v5934;if(v5928){
let v5935;if(v5938&&v5937){v5935=v5936;}else{
v5935=v5904;if(v5938){v5936=v5935;v5937=true;}}
let v5939;if(v5935){
v5939=({None:null});}else{
const v5940=v5902;
const v5941=1;
v5939=({Some:(((v5940) - (v5941)) >>> 0)});}
v5934=v5939;}else{
v5934=__ink_from_float(__nfNumber(__nfValue(v5901)), "u32");}
v5922=v5934;}
v5915=v5922;}
return v5915;};}
function __prepareFn52(fixed){const v5947=fixed[0]&&fixed[1];let v5946=false,v5945;
const v5955=fixed[0];let v5954=false,v5953;
const v5978=fixed[0]&&fixed[1];let v5977=false,v5976;
const v5984=fixed[0]&&fixed[1];let v5983=false,v5982;
return function(v5942,v5943){let v5944;if(v5947&&v5946){v5944=v5945;}else{
const v5948=(v5943).length;
const v5949=v5942;
const v5950=v5949["inputs"];
v5944=!(v5948===v5950);if(v5947){v5945=v5944;v5946=true;}}
let v5951;if(v5944){
v5951=({Err:"graph input shape"});}else{
let v5952;if(v5955&&v5954){v5952=v5953;}else{
const v5956=v5942;
const v5957=v5956["inputs"];
const v5958=v5942;
const v5959=v5958["nodes"];
const v5960=v5942;
const v5961=v5960["roots"];
const v5962=__fn38(v5957,v5959,v5961);
const v5963=false;
v5952=(v5962===v5963);if(v5955){v5953=v5952;v5954=true;}}
let v5964;if(v5952){
v5964=({Err:"invalid prepared graph"});}else{
const v5966=v5942;
const v5967=v5966["nodes"];
const v5968=new __InkBuffer(Array.from(v5943));
const v5969=true;
let v5970=({["values"]:v5968,["finite_indices"]:v5969});
for(let v5971=0;v5971<v5967.length;v5971++){
const v5972=v5967[v5971];
const v5973=v5972;
const v5974=v5970;
v5970=__fn51(v5973,v5974);
}
const v5965=v5970;
let v5975;if(v5978&&v5977){v5975=v5976;}else{
const v5979=v5965;
const v5980=v5979["values"];
v5975=v5980.freeze();if(v5978){v5976=v5975;v5977=true;}}
let v5981;if(v5984&&v5983){v5981=v5982;}else{
const v5985=v5965;
const v5986=v5985["finite_indices"];
const v5987=false;
v5981=(v5986===v5987);if(v5984){v5982=v5981;v5983=true;}}
let v5988;if(v5981){
v5988=({Err:"nonfinite graph index"});}else{
const v5989=v5975;
const v5990=v5942;
const v5991=v5990["roots"];
const v5992=v5991.length;
const v5993=new Array(v5992);
for(let v5994=0;v5994<v5992;v5994++){
const v5995=(v5991[v5994]>>>0);
const v5996=v5975;
const v5997=v5995;
let v5998;if(v5997<v5996.length){v5998=v5996[v5997];}else{
v5998=__nfFromBits(0);}
v5993[v5994]=__nfValue(v5998);
}
const v5999=v5993;
v5988=({Ok:({["values"]:v5989,["outputs"]:v5999})});}
v5964=v5988;}
v5951=v5964;}
return v5951;};}
function __prepareFn53(fixed){const v6007=fixed[0]&&fixed[1];let v6006=false,v6005;
const v6015=fixed[0];let v6014=false,v6013;
const v6038=fixed[0]&&fixed[1];let v6037=false,v6036;
const v6044=fixed[0]&&fixed[1];let v6043=false,v6042;
return function(v6000,v6001){const v6002=v6000;
const v6003=v6001;
let v6004;if(v6007&&v6006){v6004=v6005;}else{
const v6008=(v6003).length;
const v6009=v6002;
const v6010=v6009["inputs"];
v6004=!(v6008===v6010);if(v6007){v6005=v6004;v6006=true;}}
let v6011;if(v6004){
v6011=({Err:"graph input shape"});}else{
let v6012;if(v6015&&v6014){v6012=v6013;}else{
const v6016=v6002;
const v6017=v6016["inputs"];
const v6018=v6002;
const v6019=v6018["nodes"];
const v6020=v6002;
const v6021=v6020["roots"];
const v6022=__fn38(v6017,v6019,v6021);
const v6023=false;
v6012=(v6022===v6023);if(v6015){v6013=v6012;v6014=true;}}
let v6024;if(v6012){
v6024=({Err:"invalid prepared graph"});}else{
const v6026=v6002;
const v6027=v6026["nodes"];
const v6028=new __InkBuffer(Array.from(v6003));
const v6029=true;
let v6030=({["values"]:v6028,["finite_indices"]:v6029});
for(let v6031=0;v6031<v6027.length;v6031++){
const v6032=v6027[v6031];
const v6033=v6032;
const v6034=v6030;
v6030=__fn51(v6033,v6034);
}
const v6025=v6030;
let v6035;if(v6038&&v6037){v6035=v6036;}else{
const v6039=v6025;
const v6040=v6039["values"];
v6035=v6040.freeze();if(v6038){v6036=v6035;v6037=true;}}
let v6041;if(v6044&&v6043){v6041=v6042;}else{
const v6045=v6025;
const v6046=v6045["finite_indices"];
const v6047=false;
v6041=(v6046===v6047);if(v6044){v6042=v6041;v6043=true;}}
let v6048;if(v6041){
v6048=({Err:"nonfinite graph index"});}else{
const v6049=v6035;
const v6050=v6002;
const v6051=v6050["roots"];
const v6052=v6051.length;
const v6053=new Array(v6052);
for(let v6054=0;v6054<v6052;v6054++){
const v6055=(v6051[v6054]>>>0);
const v6056=v6035;
const v6057=v6055;
let v6058;if(v6057<v6056.length){v6058=v6056[v6057];}else{
v6058=__nfFromBits(0);}
v6053[v6054]=__nfValue(v6058);
}
const v6059=v6053;
v6048=({Ok:({["values"]:v6049,["outputs"]:v6059})});}
v6024=v6048;}
v6011=v6024;}
const v6060=v6011;
const v6062=v6060;
let v6063;if(Object.hasOwn(v6062,"Ok")){
const v6064=v6062["Ok"];
const v6065=v6064;
v6063=({Ok:v6065["outputs"]});}else{v6063=({Err:v6062.Err});}
return v6063;};}
function __prepareFn56(fixed){const v6071=fixed[0];let v6070=false,v6069;
const v6075=fixed[0];let v6074=false,v6073;
const v6082=fixed[0];let v6081=false,v6080;
const v6089=fixed[0];let v6088=false,v6087;
return function(v6066,v6067){let v6068;if(v6071&&v6070){v6068=v6069;}else{
v6068=v6066;if(v6071){v6069=v6068;v6070=true;}}
let v6072;if(v6075&&v6074){v6072=v6073;}else{
const v6076=v6068;
const v6077="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
v6072=(v6076===v6077);if(v6075){v6073=v6072;v6074=true;}}
let v6078;if(v6072){
v6078=true;}else{
let v6079;if(v6082&&v6081){v6079=v6080;}else{
const v6083=v6068;
const v6084="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
v6079=(v6083===v6084);if(v6082){v6080=v6079;v6081=true;}}
let v6085;if(v6079){
v6085=true;}else{
let v6086;if(v6089&&v6088){v6086=v6087;}else{
const v6090=v6068;
const v6091="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
v6086=(v6090===v6091);if(v6089){v6087=v6086;v6088=true;}}
let v6092;if(v6086){
const v6093=v6067;
v6092=v6093["piecewise"];}else{
const v6094=v6067;
const v6095=v6094["boolean"];
const v6096="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v6092=!(v6095===v6096);}
v6085=v6092;}
v6078=v6085;}
return v6078;};}
function __prepareFn57(fixed){const v6102=fixed[0];let v6101=false,v6100;
const v6107=fixed[0];let v6106=false,v6105;
const v6114=fixed[0];let v6113=false,v6112;
const v6121=fixed[0];let v6120=false,v6119;
const v6131=fixed[0];let v6130=false,v6129;
const v6135=fixed[0];let v6134=false,v6133;
const v6142=fixed[0];let v6141=false,v6140;
const v6149=fixed[0];let v6148=false,v6147;
const v6160=fixed[0];let v6159=false,v6158;
const v6167=fixed[0];let v6166=false,v6165;
const v6175=fixed[0];let v6174=false,v6173;
return function(v6097,v6098){let v6099;if(v6102&&v6101){v6099=v6100;}else{
const v6103=v6097;
v6099=v6103["kind"];if(v6102){v6100=v6099;v6101=true;}}
let v6104;if(v6107&&v6106){v6104=v6105;}else{
const v6108=v6099;
const v6109="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
v6104=(v6108===v6109);if(v6107){v6105=v6104;v6106=true;}}
let v6110;if(v6104){
v6110=true;}else{
let v6111;if(v6114&&v6113){v6111=v6112;}else{
const v6115=v6099;
const v6116="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
v6111=(v6115===v6116);if(v6114){v6112=v6111;v6113=true;}}
let v6117;if(v6111){
v6117=true;}else{
let v6118;if(v6121&&v6120){v6118=v6119;}else{
const v6122=v6099;
const v6123="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
v6118=(v6122===v6123);if(v6121){v6119=v6118;v6120=true;}}
let v6124;if(v6118){
const v6125=v6097;
const v6126=v6125["unary"];
const v6127=v6098;
let v6128;if(v6131&&v6130){v6128=v6129;}else{
v6128=v6126;if(v6131){v6129=v6128;v6130=true;}}
let v6132;if(v6135&&v6134){v6132=v6133;}else{
const v6136=v6128;
const v6137="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
v6132=(v6136===v6137);if(v6135){v6133=v6132;v6134=true;}}
let v6138;if(v6132){
v6138=true;}else{
let v6139;if(v6142&&v6141){v6139=v6140;}else{
const v6143=v6128;
const v6144="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
v6139=(v6143===v6144);if(v6142){v6140=v6139;v6141=true;}}
let v6145;if(v6139){
v6145=true;}else{
let v6146;if(v6149&&v6148){v6146=v6147;}else{
const v6150=v6128;
const v6151="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
v6146=(v6150===v6151);if(v6149){v6147=v6146;v6148=true;}}
let v6152;if(v6146){
const v6153=v6127;
v6152=v6153["piecewise"];}else{
const v6154=v6127;
const v6155=v6154["boolean"];
const v6156="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v6152=!(v6155===v6156);}
v6145=v6152;}
v6138=v6145;}
v6124=v6138;}else{
let v6157;if(v6160&&v6159){v6157=v6158;}else{
const v6161=v6099;
const v6162="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
v6157=(v6161===v6162);if(v6160){v6158=v6157;v6159=true;}}
let v6163;if(v6157){
v6163=true;}else{
let v6164;if(v6167&&v6166){v6164=v6165;}else{
const v6168=v6099;
const v6169="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
v6164=(v6168===v6169);if(v6167){v6165=v6164;v6166=true;}}
let v6170;if(v6164){
const v6171=v6098;
v6170=v6171["piecewise"];}else{
let v6172;if(v6175&&v6174){v6172=v6173;}else{
const v6176=v6099;
const v6177="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
v6172=(v6176===v6177);if(v6175){v6173=v6172;v6174=true;}}
let v6178;if(v6172){
const v6179=v6098;
v6178=v6179["piecewise"];}else{
const v6180=v6098;
const v6181=v6180["index"];
const v6182="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v6178=!(v6181===v6182);}
v6170=v6178;}
v6163=v6170;}
v6124=v6163;}
v6117=v6124;}
v6110=v6117;}
return v6110;};}
function __prepareFn63(fixed){const v6190=fixed[0]&&fixed[1]&&fixed[2];let v6189=false,v6188;
const v6220=fixed[0]&&fixed[3];let v6219=false,v6218;
const v6233=fixed[0]&&fixed[3];let v6232=false,v6231;
const v6241=true;let v6240=false,v6239;
const v6271=fixed[0]&&fixed[1]&&fixed[2];let v6270=false,v6269;
return function(v6183,v6184,v6185,v6186){let v6187;if(v6190&&v6189){v6187=v6188;}else{
const v6191=(v6184).length;
const v6192=v6183;
const v6193=v6192["inputs"];
const v6194=v6183;
const v6195=(v6194["nodes"]).length;
const v6196=(((v6193) + (v6195)) >>> 0);
const v6197=!(v6191===v6196);
let v6198=v6197;if(!v6198){
const v6199=(v6185).length;
const v6200=v6183;
const v6201=(v6200["roots"]).length;
v6198=!(v6199===v6201);}
const v6202=v6198;
let v6203=v6202;if(!v6203){
const v6204=v6183;
const v6205=v6204["inputs"];
const v6206=v6183;
const v6207=v6206["nodes"];
const v6208=v6183;
const v6209=v6208["roots"];
const v6210=__fn38(v6205,v6207,v6209);
const v6211=false;
v6203=(v6210===v6211);}
v6187=v6203;if(v6190){v6188=v6187;v6189=true;}}
let v6212;if(v6187){
v6212=({Err:"cotangent shape"});}else{
const v6213=v6183;
const v6214=v6184;
const v6215=v6185;
const v6216=v6186;
let v6217;if(v6220&&v6219){v6217=v6218;}else{
const v6221=v6213;
const v6222=v6221["nodes"];
let v6223=true;
for(let v6224=0;v6224<v6222.length;v6224++){
const v6225=v6222[v6224];
const v6226=v6223;
let v6227=v6226;if(v6227){
const v6228=v6225;
const v6229=v6216;
v6227=__fn57(v6228,v6229);}
v6223=v6227;
}
v6217=v6223;if(v6220){v6218=v6217;v6219=true;}}
let v6230;if(v6233&&v6232){v6230=v6231;}else{
const v6234=v6217;
const v6235=false;
v6230=(v6234===v6235);if(v6233){v6231=v6230;v6232=true;}}
let v6236;if(v6230){
v6236=({Err:"explicit gradient policy required"});}else{
const v6237=__bufferFill((v6214).length,__nfFromBits(0));
let v6238;if(v6241&&v6240){v6238=v6239;}else{
v6238=0;if(v6241){v6239=v6238;v6240=true;}}
const v6243=v6215;
const v6244=v6237;
const v6245=v6238;
let v6246=({["g"]:v6244,["i"]:v6245});
for(let v6247=0;v6247<v6243.length;v6247++){
const v6248=v6243[v6247];
const v6249=v6246;
const v6250=v6249["g"];
const v6251=v6246;
const v6252=v6251["i"];
const v6253=v6250;
const v6254=v6213;
const v6255=v6254["roots"];
const v6256=v6252;
let v6257;if(v6256<v6255.length){v6257=v6255[v6256];}else{
v6257=0;}
const v6258=v6257;
const v6259=__nfValue(v6248);
const v6260=__fn54(v6253,v6258,v6259);
const v6261=v6252;
const v6262=1;
const v6263=(((v6261) + (v6262)) >>> 0);
const v6264=v6260;
const v6265=v6263;
v6246=({["g"]:v6264,["i"]:v6265});
}
const v6242=v6246;
const v6267=v6242;
const v6266=v6267["g"];
let v6268;if(v6271&&v6270){v6268=v6269;}else{
const v6272=v6242;
v6268=v6272["i"];if(v6271){v6269=v6268;v6270=true;}}
const v6274=v6213;
const v6275=v6274["nodes"];
const v6276=v6266;
const v6277=(v6214).length;
let v6278=({["gradient"]:v6276,["wire"]:v6277});
for(let v6279=v6275.length-1;v6279>=0;v6279--){
const v6280=v6275[v6279];
const v6281=v6280;
const v6282=v6278;
const v6283=v6214;
const v6284=v6216;
v6278=__fn62(v6281,v6282,v6283,v6284);
}
const v6273=v6278;
const v6285=v6273;
const v6286=v6285["gradient"];
const v6287=v6286.freeze();
const v6288=v6213;
v6236=({Ok:v6287.slice(0,v6288["inputs"])});}
v6212=v6236;}
return v6212;};}
function __prepareFn64(fixed){const v6296=fixed[0]&&fixed[3];let v6295=false,v6294;
const v6309=fixed[0]&&fixed[3];let v6308=false,v6307;
const v6317=true;let v6316=false,v6315;
const v6347=fixed[0]&&fixed[1]&&fixed[2];let v6346=false,v6345;
return function(v6289,v6290,v6291,v6292){let v6293;if(v6296&&v6295){v6293=v6294;}else{
const v6297=v6289;
const v6298=v6297["nodes"];
let v6299=true;
for(let v6300=0;v6300<v6298.length;v6300++){
const v6301=v6298[v6300];
const v6302=v6299;
let v6303=v6302;if(v6303){
const v6304=v6301;
const v6305=v6292;
v6303=__fn57(v6304,v6305);}
v6299=v6303;
}
v6293=v6299;if(v6296){v6294=v6293;v6295=true;}}
let v6306;if(v6309&&v6308){v6306=v6307;}else{
const v6310=v6293;
const v6311=false;
v6306=(v6310===v6311);if(v6309){v6307=v6306;v6308=true;}}
let v6312;if(v6306){
v6312=({Err:"explicit gradient policy required"});}else{
const v6313=__bufferFill((v6290).length,__nfFromBits(0));
let v6314;if(v6317&&v6316){v6314=v6315;}else{
v6314=0;if(v6317){v6315=v6314;v6316=true;}}
const v6319=v6291;
const v6320=v6313;
const v6321=v6314;
let v6322=({["g"]:v6320,["i"]:v6321});
for(let v6323=0;v6323<v6319.length;v6323++){
const v6324=v6319[v6323];
const v6325=v6322;
const v6326=v6325["g"];
const v6327=v6322;
const v6328=v6327["i"];
const v6329=v6326;
const v6330=v6289;
const v6331=v6330["roots"];
const v6332=v6328;
let v6333;if(v6332<v6331.length){v6333=v6331[v6332];}else{
v6333=0;}
const v6334=v6333;
const v6335=__nfValue(v6324);
const v6336=__fn54(v6329,v6334,v6335);
const v6337=v6328;
const v6338=1;
const v6339=(((v6337) + (v6338)) >>> 0);
const v6340=v6336;
const v6341=v6339;
v6322=({["g"]:v6340,["i"]:v6341});
}
const v6318=v6322;
const v6343=v6318;
const v6342=v6343["g"];
let v6344;if(v6347&&v6346){v6344=v6345;}else{
const v6348=v6318;
v6344=v6348["i"];if(v6347){v6345=v6344;v6346=true;}}
const v6350=v6289;
const v6351=v6350["nodes"];
const v6352=v6342;
const v6353=(v6290).length;
let v6354=({["gradient"]:v6352,["wire"]:v6353});
for(let v6355=v6351.length-1;v6355>=0;v6355--){
const v6356=v6351[v6355];
const v6357=v6356;
const v6358=v6354;
const v6359=v6290;
const v6360=v6292;
v6354=__fn62(v6357,v6358,v6359,v6360);
}
const v6349=v6354;
const v6361=v6349;
const v6362=v6361["gradient"];
const v6363=v6362.freeze();
const v6364=v6289;
v6312=({Ok:v6363.slice(0,v6364["inputs"])});}
return v6312;};}
function __prepareFn65(fixed){const v6372=fixed[0]&&fixed[2];let v6371=false,v6370;
const v6382=fixed[0]&&fixed[1];let v6381=false,v6380;
const v6390=fixed[0];let v6389=false,v6388;
const v6413=fixed[0]&&fixed[1];let v6412=false,v6411;
const v6419=fixed[0]&&fixed[1];let v6418=false,v6417;
return function(v6365,v6366,v6367,v6368){let v6369;if(v6372&&v6371){v6369=v6370;}else{
const v6373=(v6367).length;
const v6374=v6365;
const v6375=(v6374["roots"]).length;
v6369=!(v6373===v6375);if(v6372){v6370=v6369;v6371=true;}}
let v6376;if(v6369){
v6376=({Err:"cotangent shape"});}else{
const v6377=v6365;
const v6378=v6366;
let v6379;if(v6382&&v6381){v6379=v6380;}else{
const v6383=(v6378).length;
const v6384=v6377;
const v6385=v6384["inputs"];
v6379=!(v6383===v6385);if(v6382){v6380=v6379;v6381=true;}}
let v6386;if(v6379){
v6386=({Err:"graph input shape"});}else{
let v6387;if(v6390&&v6389){v6387=v6388;}else{
const v6391=v6377;
const v6392=v6391["inputs"];
const v6393=v6377;
const v6394=v6393["nodes"];
const v6395=v6377;
const v6396=v6395["roots"];
const v6397=__fn38(v6392,v6394,v6396);
const v6398=false;
v6387=(v6397===v6398);if(v6390){v6388=v6387;v6389=true;}}
let v6399;if(v6387){
v6399=({Err:"invalid prepared graph"});}else{
const v6401=v6377;
const v6402=v6401["nodes"];
const v6403=new __InkBuffer(Array.from(v6378));
const v6404=true;
let v6405=({["values"]:v6403,["finite_indices"]:v6404});
for(let v6406=0;v6406<v6402.length;v6406++){
const v6407=v6402[v6406];
const v6408=v6407;
const v6409=v6405;
v6405=__fn51(v6408,v6409);
}
const v6400=v6405;
let v6410;if(v6413&&v6412){v6410=v6411;}else{
const v6414=v6400;
const v6415=v6414["values"];
v6410=v6415.freeze();if(v6413){v6411=v6410;v6412=true;}}
let v6416;if(v6419&&v6418){v6416=v6417;}else{
const v6420=v6400;
const v6421=v6420["finite_indices"];
const v6422=false;
v6416=(v6421===v6422);if(v6419){v6417=v6416;v6418=true;}}
let v6423;if(v6416){
v6423=({Err:"nonfinite graph index"});}else{
const v6424=v6410;
const v6425=v6377;
const v6426=v6425["roots"];
const v6427=v6426.length;
const v6428=new Array(v6427);
for(let v6429=0;v6429<v6427;v6429++){
const v6430=(v6426[v6429]>>>0);
const v6431=v6410;
const v6432=v6430;
let v6433;if(v6432<v6431.length){v6433=v6431[v6432];}else{
v6433=__nfFromBits(0);}
v6428[v6429]=__nfValue(v6433);
}
const v6434=v6428;
v6423=({Ok:({["values"]:v6424,["outputs"]:v6434})});}
v6399=v6423;}
v6386=v6399;}
const v6435=v6386;
const v6437=v6435;
let v6438;if(Object.hasOwn(v6437,"Ok")){
const v6439=v6437["Ok"];
const v6440=v6439;
const v6441=v6365;
const v6442=v6440;
const v6443=v6442["values"];
const v6444=v6367;
const v6445=v6368;
const v6446=__fn64(v6441,v6443,v6444,v6445);
let v6447;if(Object.hasOwn(v6446,"Ok")){
const v6448=v6446["Ok"];
const v6449=v6448;
const v6450=v6440;
const v6451=v6450["outputs"];
const v6452=v6449;
v6447=({Ok:({["outputs"]:v6451,["gradient"]:v6452})});}else{
const v6453=v6446["Err"];
v6447=({Err:v6453});}
v6438=v6447;}else{
const v6454=v6437["Err"];
v6438=({Err:v6454});}
v6376=v6438;}
return v6376;};}
function __prepareFn66(fixed){const v6462=fixed[0]&&fixed[2];let v6461=false,v6460;
const v6476=fixed[0]&&fixed[1];let v6475=false,v6474;
const v6484=fixed[0];let v6483=false,v6482;
const v6507=fixed[0]&&fixed[1];let v6506=false,v6505;
const v6513=fixed[0]&&fixed[1];let v6512=false,v6511;
return function(v6455,v6456,v6457,v6458){let v6459;if(v6462&&v6461){v6459=v6460;}else{
const v6463=(v6457).length;
const v6464=0;
const v6465=(v6463===v6464);
let v6466=v6465;if(!v6466){
const v6467=(v6457).length;
const v6468=v6455;
const v6469=(v6468["roots"]).length;
v6466=!(v6467===v6469);}
v6459=v6466;if(v6462){v6460=v6459;v6461=true;}}
let v6470;if(v6459){
v6470=({Err:"target shape"});}else{
const v6471=v6455;
const v6472=v6456;
let v6473;if(v6476&&v6475){v6473=v6474;}else{
const v6477=(v6472).length;
const v6478=v6471;
const v6479=v6478["inputs"];
v6473=!(v6477===v6479);if(v6476){v6474=v6473;v6475=true;}}
let v6480;if(v6473){
v6480=({Err:"graph input shape"});}else{
let v6481;if(v6484&&v6483){v6481=v6482;}else{
const v6485=v6471;
const v6486=v6485["inputs"];
const v6487=v6471;
const v6488=v6487["nodes"];
const v6489=v6471;
const v6490=v6489["roots"];
const v6491=__fn38(v6486,v6488,v6490);
const v6492=false;
v6481=(v6491===v6492);if(v6484){v6482=v6481;v6483=true;}}
let v6493;if(v6481){
v6493=({Err:"invalid prepared graph"});}else{
const v6495=v6471;
const v6496=v6495["nodes"];
const v6497=new __InkBuffer(Array.from(v6472));
const v6498=true;
let v6499=({["values"]:v6497,["finite_indices"]:v6498});
for(let v6500=0;v6500<v6496.length;v6500++){
const v6501=v6496[v6500];
const v6502=v6501;
const v6503=v6499;
v6499=__fn51(v6502,v6503);
}
const v6494=v6499;
let v6504;if(v6507&&v6506){v6504=v6505;}else{
const v6508=v6494;
const v6509=v6508["values"];
v6504=v6509.freeze();if(v6507){v6505=v6504;v6506=true;}}
let v6510;if(v6513&&v6512){v6510=v6511;}else{
const v6514=v6494;
const v6515=v6514["finite_indices"];
const v6516=false;
v6510=(v6515===v6516);if(v6513){v6511=v6510;v6512=true;}}
let v6517;if(v6510){
v6517=({Err:"nonfinite graph index"});}else{
const v6518=v6504;
const v6519=v6471;
const v6520=v6519["roots"];
const v6521=v6520.length;
const v6522=new Array(v6521);
for(let v6523=0;v6523<v6521;v6523++){
const v6524=(v6520[v6523]>>>0);
const v6525=v6504;
const v6526=v6524;
let v6527;if(v6526<v6525.length){v6527=v6525[v6526];}else{
v6527=__nfFromBits(0);}
v6522[v6523]=__nfValue(v6527);
}
const v6528=v6522;
v6517=({Ok:({["values"]:v6518,["outputs"]:v6528})});}
v6493=v6517;}
v6480=v6493;}
const v6529=v6480;
const v6531=v6529;
let v6532;if(Object.hasOwn(v6531,"Ok")){
const v6533=v6531["Ok"];
const v6534=v6533;
const v6535=v6534;
const v6536=v6535["outputs"];
const v6537=v6457;
const v6538=Math.min(v6536.length,v6537.length);
const v6539=new Array(v6538);
for(let v6540=0;v6540<v6538;v6540++){
const v6541=v6536[v6540];
const v6542=v6537[v6540];
const v6543=__nfValue(v6541);
const v6544=__nfValue(v6542);
v6539[v6540]=Math.fround(__nfNumber(v6543) - __nfNumber(v6544));
}
const v6545=v6539;
const v6546=Math.fround((v6457).length);
const v6547=v6545;
const v6548=v6547.length;
const v6549=new Array(v6548);
for(let v6550=0;v6550<v6548;v6550++){
const v6551=v6547[v6550];
const v6552=__nfValue(v6551);
const v6553=__nfValue(v6551);
v6549[v6550]=Math.fround(__nfNumber(v6552) * __nfNumber(v6553));
}
const v6554=v6549;
let v6555=0;for(let v6556=0;v6556<v6554.length;v6556++){
const v6557=v6554[v6556];
v6555=Math.fround(__nfNumber(v6555) + __nfNumber(v6557));}
const v6558=Math.fround((__nfNumber(v6555))/(__nfNumber(__nfValue(v6546))));
const v6559=Number.isFinite(__nfNumber(v6558));
const v6560=false;
let v6561;if((v6559===v6560)){
v6561=({Err:"nonfinite loss"});}else{
const v6562=v6545;
const v6563=v6562.length;
const v6564=new Array(v6563);
for(let v6565=0;v6565<v6563;v6565++){
const v6566=v6562[v6565];
const v6567=__nfFromBits(1073741824);
const v6568=__nfValue(v6566);
v6564[v6565]=Math.fround((__nfNumber(Math.fround(v6567 * __nfNumber(v6568))))/(__nfNumber(__nfValue(v6546))));
}
const v6569=v6564;
const v6570=v6455;
const v6571=v6534;
const v6572=v6571["values"];
const v6573=v6569;
const v6574=v6458;
const v6575=__fn64(v6570,v6572,v6573,v6574);
let v6576;if(Object.hasOwn(v6575,"Ok")){
const v6577=v6575["Ok"];
const v6578=v6577;
const v6579=v6558;
const v6580=v6534;
const v6581=v6580["outputs"];
const v6582=v6578;
v6576=({Ok:({["loss"]:v6579,["outputs"]:v6581,["gradient"]:v6582})});}else{
const v6583=v6575["Err"];
v6576=({Err:v6583});}
v6561=v6576;}
v6532=v6561;}else{
const v6584=v6531["Err"];
v6532=({Err:v6584});}
v6470=v6532;}
return v6470;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[9,__prepareFn9],[13,__prepareFn13],[14,__prepareFn14],[16,__prepareFn16],[17,__prepareFn17],[18,__prepareFn18],[19,__prepareFn19],[20,__prepareFn20],[21,__prepareFn21],[22,__prepareFn22],[23,__prepareFn23],[24,__prepareFn24],[25,__prepareFn25],[26,__prepareFn26],[27,__prepareFn27],[28,__prepareFn28],[29,__prepareFn29],[30,__prepareFn30],[34,__prepareFn34],[35,__prepareFn35],[37,__prepareFn37],[38,__prepareFn38],[39,__prepareFn39],[43,__prepareFn43],[44,__prepareFn44],[45,__prepareFn45],[49,__prepareFn49],[52,__prepareFn52],[53,__prepareFn53],[56,__prepareFn56],[57,__prepareFn57],[63,__prepareFn63],[64,__prepareFn64],[65,__prepareFn65],[66,__prepareFn66]]);
const __namedTypes={"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v13","core_sha256":"9338413f78e17f718fac03914ac343c278c1d2d146b19e45df99472e95eb7a7a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"network","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":1,"internal":false,"name":"predict","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":2,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":3,"internal":false,"name":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"destination":null,"index":4,"internal":true,"name":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","parallel":false,"params":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"inputs","type":{"kind":"u32"}},{"name":"parameter","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"}},{"destination":null,"index":5,"internal":true,"name":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":6,"internal":true,"name":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":7,"internal":true,"name":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":8,"internal":true,"name":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":9,"internal":false,"name":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","parallel":false,"params":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":10,"internal":false,"name":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":11,"internal":false,"name":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":12,"internal":false,"name":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":13,"internal":false,"name":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":14,"internal":false,"name":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":15,"internal":false,"name":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":16,"internal":false,"name":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":17,"internal":false,"name":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":18,"internal":false,"name":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":19,"internal":false,"name":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":20,"internal":false,"name":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":21,"internal":false,"name":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":22,"internal":false,"name":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":23,"internal":false,"name":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":24,"internal":false,"name":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":25,"internal":false,"name":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":26,"internal":false,"name":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":27,"internal":false,"name":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":28,"internal":false,"name":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":29,"internal":false,"name":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","parallel":false,"params":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":30,"internal":false,"name":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","parallel":false,"params":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":31,"internal":false,"name":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":32,"internal":false,"name":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":33,"internal":false,"name":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":34,"internal":false,"name":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":35,"internal":false,"name":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":36,"internal":true,"name":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"name":"inputs","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"destination":null,"index":37,"internal":false,"name":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":38,"internal":false,"name":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":39,"internal":false,"name":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},{"destination":null,"index":40,"internal":false,"name":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":41,"internal":false,"name":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":42,"internal":false,"name":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":43,"internal":false,"name":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":44,"internal":false,"name":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":45,"internal":false,"name":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":46,"internal":true,"name":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":47,"internal":true,"name":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","parallel":false,"params":[{"name":"values","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":48,"internal":true,"name":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":49,"internal":false,"name":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","parallel":false,"params":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":50,"internal":true,"name":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":51,"internal":true,"name":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}},{"destination":null,"index":52,"internal":false,"name":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},{"destination":null,"index":53,"internal":false,"name":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":54,"internal":true,"name":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":55,"internal":true,"name":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":56,"internal":false,"name":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":57,"internal":false,"name":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":58,"internal":true,"name":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ts","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gs","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":59,"internal":true,"name":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":60,"internal":true,"name":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":61,"internal":true,"name":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"wire","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":62,"internal":true,"name":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"destination":null,"index":63,"internal":false,"name":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":64,"internal":false,"name":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":65,"internal":false,"name":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},{"destination":null,"index":66,"internal":false,"name":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}],"named_types":{"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":true,"function":"network","inlined_calls":3,"retained_bindings":33},{"factory":true,"function":"predict","inlined_calls":3,"retained_bindings":5},{"factory":true,"function":"derivatives","inlined_calls":3,"retained_bindings":6},{"factory":true,"function":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","inlined_calls":0,"retained_bindings":9},{"factory":false,"function":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","inlined_calls":2,"retained_bindings":33},{"factory":false,"function":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","inlined_calls":2,"retained_bindings":5},{"factory":true,"function":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","inlined_calls":2,"retained_bindings":6},{"factory":false,"function":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","inlined_calls":1,"retained_bindings":2},{"factory":true,"function":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","inlined_calls":1,"retained_bindings":2},{"factory":true,"function":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","inlined_calls":1,"retained_bindings":2},{"factory":true,"function":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","inlined_calls":2,"retained_bindings":2},{"factory":true,"function":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","inlined_calls":1,"retained_bindings":3},{"factory":true,"function":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","inlined_calls":1,"retained_bindings":5},{"factory":true,"function":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","inlined_calls":1,"retained_bindings":2},{"factory":true,"function":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","inlined_calls":1,"retained_bindings":4},{"factory":false,"function":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","inlined_calls":0,"retained_bindings":7},{"factory":true,"function":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","inlined_calls":0,"retained_bindings":18},{"factory":false,"function":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","inlined_calls":0,"retained_bindings":7},{"factory":true,"function":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","inlined_calls":0,"retained_bindings":3},{"factory":true,"function":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","inlined_calls":0,"retained_bindings":11},{"factory":false,"function":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","inlined_calls":0,"retained_bindings":4},{"factory":true,"function":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","inlined_calls":0,"retained_bindings":2},{"factory":true,"function":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","inlined_calls":1,"retained_bindings":7},{"factory":false,"function":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","inlined_calls":0,"retained_bindings":5},{"factory":false,"function":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","inlined_calls":0,"retained_bindings":4},{"factory":true,"function":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","inlined_calls":1,"retained_bindings":4},{"factory":false,"function":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","inlined_calls":0,"retained_bindings":4},{"factory":true,"function":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","inlined_calls":1,"retained_bindings":11},{"factory":false,"function":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","inlined_calls":1,"retained_bindings":5},{"factory":true,"function":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","inlined_calls":0,"retained_bindings":4},{"factory":true,"function":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","inlined_calls":1,"retained_bindings":5},{"factory":true,"function":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","inlined_calls":1,"retained_bindings":5}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"66b5345fc0cf9b6c2f592ee9b987411cbf17923f512aeb095f808cc9069307cb","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda":{"arguments":{"format":"ink-value-wire-v1","identity":"7254fbee57d42f736c0f825449a9b065c12198183b33b26d30428ff920a008ae","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b":{"arguments":{"format":"ink-value-wire-v1","identity":"555dc53c180f658bfeadabb7dc93faee3ecb050e4d361f2317d479a981d70366","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}}},"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef":{"arguments":{"format":"ink-value-wire-v1","identity":"28ef8297283ebede64ffe544630efa9356af29e3803672c36e707dc524c40af1","named":{},"root":{"fields":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}}},"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885":{"arguments":{"format":"ink-value-wire-v1","identity":"2e0e1dcbe39022ec0013995dcb0ad9599bb14f81894818dd7060c98db35e5d34","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54":{"arguments":{"format":"ink-value-wire-v1","identity":"2c9054b387b8572a66262afe8a2faee4b7a920b3a5bfb92db1126257747f1fd0","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37":{"arguments":{"format":"ink-value-wire-v1","identity":"d4cb0361a7a8833933106ca6dd70006e19100c770fe048f31d961bc14fa899fc","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926":{"arguments":{"format":"ink-value-wire-v1","identity":"b04b32203f8d88e2db519e2e81cbaa387f5a1fa076ea8a147c2b109278fe5299","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":{"unsupported":"unsupported wire descriptor"},"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b":{"arguments":{"format":"ink-value-wire-v1","identity":"17ee49e34ea5590c8aa89fbcc5cdde0b5e5b337ceaabb58d902e892e0b22008f","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":{"unsupported":"unsupported wire descriptor"},"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680":{"arguments":{"format":"ink-value-wire-v1","identity":"1a130fd0ae83873939c3a1dd7db0523d36e865b9102a6628c436dd1503402d53","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":{"unsupported":"unsupported wire descriptor"},"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3":{"arguments":{"format":"ink-value-wire-v1","identity":"f6ca75f73d60cd2314d69c64454363e593db695767e343195d3b23919755c574","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5":{"arguments":{"format":"ink-value-wire-v1","identity":"3061a46bc74994007e2c94750186c015993dcdb0b813ca54f2c8031fbae28ae1","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":{"unsupported":"unsupported wire descriptor"},"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30":{"arguments":{"format":"ink-value-wire-v1","identity":"c25723d7f2d5c86fdce912dff77de10ffff544058fed24a24e223b43ca727991","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}}},"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":{"unsupported":"unsupported wire descriptor"},"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465":{"arguments":{"format":"ink-value-wire-v1","identity":"857eb1fd05b55c610f44a62e8bf5909738cf119299eddaf110ddd150f5e6272d","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":{"unsupported":"unsupported wire descriptor"},"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e":{"arguments":{"format":"ink-value-wire-v1","identity":"ed136e460e172de1e9db88a4ce327b9fc66430265d41930c518abc13cfe2e33e","named":{},"root":{"fields":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870":{"arguments":{"format":"ink-value-wire-v1","identity":"1f67ce9481e7bf03a3ba8bccc64b89e5b1d9b8f8a998daa1446d82f94a820dea","named":{},"root":{"fields":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2":{"arguments":{"format":"ink-value-wire-v1","identity":"6d8292587d247aa2935d40c05b97e3e8ee25c23a651a20e8a39f9b9a91a4167f","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":{"unsupported":"unsupported wire descriptor"},"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":{"unsupported":"unsupported wire descriptor"},"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c":{"arguments":{"format":"ink-value-wire-v1","identity":"1f3d1f2e5000eabd3285bec367aea83311b89ab0ac1924cb638c4d675e087937","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc":{"arguments":{"format":"ink-value-wire-v1","identity":"607073caea048d19b6ff898d804ca7c0689e88386444b2d2fbfb06bd1c9a0b07","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":{"unsupported":"unsupported wire descriptor"},"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":{"unsupported":"unsupported wire descriptor"},"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e":{"arguments":{"format":"ink-value-wire-v1","identity":"7aa59bf208f3650543459db164197f9767215047ec4b0a391fd81b408a47694a","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":{"unsupported":"unsupported wire descriptor"},"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":{"unsupported":"unsupported wire descriptor"},"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0":{"arguments":{"format":"ink-value-wire-v1","identity":"fc196cc25690823dcbe69ce5b7beb1a54cfad2f6a3a27524d4fe309db03538c6","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096":{"arguments":{"format":"ink-value-wire-v1","identity":"bb4f6cbf585c1725e771d97023bb1e02f6c172cf56394954edf02c361e6ffc0e","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd":{"arguments":{"format":"ink-value-wire-v1","identity":"700a0161a0e4bb6ba9dbf453a8dfe5ea8476df708b4a84e6f0946c2a3667f241","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919":{"arguments":{"format":"ink-value-wire-v1","identity":"75df379d5249d5925250176c06044d8eed3cdd1bbcada81ac35d377b355cba75","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":{"unsupported":"unsupported wire descriptor"},"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c":{"arguments":{"format":"ink-value-wire-v1","identity":"3f17cb2fa22c2f1c799254580140d2b7d9f44d03f28a4e0c26daf7520e8fd345","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d":{"arguments":{"format":"ink-value-wire-v1","identity":"468c20c617405d169739cb1297bc13838a3c83cc05dec2f1e904ba16794225fd","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":{},"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}},"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":{"unsupported":"unsupported wire descriptor"},"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":{"unsupported":"unsupported wire descriptor"},"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":{"unsupported":"unsupported wire descriptor"},"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":{"unsupported":"unsupported wire descriptor"},"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":{"unsupported":"unsupported wire descriptor"},"network":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"predict":{"arguments":{"format":"ink-value-wire-v1","identity":"52008da29dbc58d254eca7d42a46144e532dd7f71050928ac698f667999edecd","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}}}}};
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
  if(p.kind==='u32'||p.kind==='i32'||p.kind==='u64'||p.kind==='f32')flags|=2;
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
  case 'f32':case 'u64':{const size=p.kind==='f32'?4:8;read=(r,end)=>{r.size(end,size);r.cursor=end;};break;}
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
   if(t.kind==='f32'){jsonFloatScratch.setFloat32(0,Number(v),true);if(!Number.isFinite(jsonFloatScratch.getFloat32(0,true)))throw Error('JSON f32 overflow');w.word(jsonFloatScratch.getUint32(0,true));}
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

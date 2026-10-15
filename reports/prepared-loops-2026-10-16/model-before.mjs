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
const __namedTypes={"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v13","core_sha256":"9338413f78e17f718fac03914ac343c278c1d2d146b19e45df99472e95eb7a7a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"network","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":1,"internal":false,"name":"predict","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":2,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":3,"internal":false,"name":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"destination":null,"index":4,"internal":true,"name":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","parallel":false,"params":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"inputs","type":{"kind":"u32"}},{"name":"parameter","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"}},{"destination":null,"index":5,"internal":true,"name":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":6,"internal":true,"name":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":7,"internal":true,"name":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":8,"internal":true,"name":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":9,"internal":false,"name":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","parallel":false,"params":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":10,"internal":false,"name":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":11,"internal":false,"name":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":12,"internal":false,"name":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":13,"internal":false,"name":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":14,"internal":false,"name":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":15,"internal":false,"name":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":16,"internal":false,"name":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":17,"internal":false,"name":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":18,"internal":false,"name":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":19,"internal":false,"name":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":20,"internal":false,"name":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":21,"internal":false,"name":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":22,"internal":false,"name":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":23,"internal":false,"name":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":24,"internal":false,"name":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":25,"internal":false,"name":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":26,"internal":false,"name":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":27,"internal":false,"name":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":28,"internal":false,"name":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":29,"internal":false,"name":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","parallel":false,"params":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":30,"internal":false,"name":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","parallel":false,"params":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":31,"internal":false,"name":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":32,"internal":false,"name":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":33,"internal":false,"name":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":34,"internal":false,"name":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":35,"internal":false,"name":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":36,"internal":true,"name":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"name":"inputs","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"destination":null,"index":37,"internal":false,"name":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":38,"internal":false,"name":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":39,"internal":false,"name":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},{"destination":null,"index":40,"internal":false,"name":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":41,"internal":false,"name":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":42,"internal":false,"name":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":43,"internal":false,"name":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":44,"internal":false,"name":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":45,"internal":false,"name":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":46,"internal":true,"name":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":47,"internal":true,"name":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","parallel":false,"params":[{"name":"values","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":48,"internal":true,"name":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":49,"internal":false,"name":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","parallel":false,"params":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":50,"internal":true,"name":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":51,"internal":true,"name":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}},{"destination":null,"index":52,"internal":false,"name":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},{"destination":null,"index":53,"internal":false,"name":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":54,"internal":true,"name":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":55,"internal":true,"name":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":56,"internal":false,"name":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":57,"internal":false,"name":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":58,"internal":true,"name":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ts","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gs","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":59,"internal":true,"name":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":60,"internal":true,"name":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":61,"internal":true,"name":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"wire","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":62,"internal":true,"name":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"destination":null,"index":63,"internal":false,"name":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":64,"internal":false,"name":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":65,"internal":false,"name":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},{"destination":null,"index":66,"internal":false,"name":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}],"named_types":{"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"delegated_calls":1,"factory":true,"function":"network","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"predict","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"derivatives","retained_bindings":0},{"delegated_calls":0,"factory":true,"function":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","retained_bindings":6},{"factory":false,"function":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":2,"factory":true,"function":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","retained_bindings":10},{"factory":false,"function":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","retained_bindings":0},{"factory":false,"function":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","retained_bindings":3},{"delegated_calls":1,"factory":true,"function":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","retained_bindings":5},{"delegated_calls":1,"factory":true,"function":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","retained_bindings":4},{"factory":false,"function":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","retained_bindings":12},{"factory":false,"function":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","retained_bindings":2},{"delegated_calls":0,"factory":true,"function":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","retained_bindings":10},{"factory":false,"function":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","retained_bindings":1},{"factory":false,"function":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","retained_bindings":1},{"factory":false,"function":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","retained_bindings":2},{"delegated_calls":1,"factory":true,"function":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","retained_bindings":0},{"factory":false,"function":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","retained_bindings":1},{"delegated_calls":1,"factory":true,"function":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","retained_bindings":1},{"factory":false,"function":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":1,"factory":true,"function":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","retained_bindings":3},{"delegated_calls":1,"factory":true,"function":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","retained_bindings":0}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"66b5345fc0cf9b6c2f592ee9b987411cbf17923f512aeb095f808cc9069307cb","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda":{"arguments":{"format":"ink-value-wire-v1","identity":"7254fbee57d42f736c0f825449a9b065c12198183b33b26d30428ff920a008ae","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b":{"arguments":{"format":"ink-value-wire-v1","identity":"555dc53c180f658bfeadabb7dc93faee3ecb050e4d361f2317d479a981d70366","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}}},"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef":{"arguments":{"format":"ink-value-wire-v1","identity":"28ef8297283ebede64ffe544630efa9356af29e3803672c36e707dc524c40af1","named":{},"root":{"fields":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}}},"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885":{"arguments":{"format":"ink-value-wire-v1","identity":"2e0e1dcbe39022ec0013995dcb0ad9599bb14f81894818dd7060c98db35e5d34","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54":{"arguments":{"format":"ink-value-wire-v1","identity":"2c9054b387b8572a66262afe8a2faee4b7a920b3a5bfb92db1126257747f1fd0","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37":{"arguments":{"format":"ink-value-wire-v1","identity":"d4cb0361a7a8833933106ca6dd70006e19100c770fe048f31d961bc14fa899fc","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926":{"arguments":{"format":"ink-value-wire-v1","identity":"b04b32203f8d88e2db519e2e81cbaa387f5a1fa076ea8a147c2b109278fe5299","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":{"unsupported":"unsupported wire descriptor"},"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b":{"arguments":{"format":"ink-value-wire-v1","identity":"17ee49e34ea5590c8aa89fbcc5cdde0b5e5b337ceaabb58d902e892e0b22008f","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":{"unsupported":"unsupported wire descriptor"},"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680":{"arguments":{"format":"ink-value-wire-v1","identity":"1a130fd0ae83873939c3a1dd7db0523d36e865b9102a6628c436dd1503402d53","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":{"unsupported":"unsupported wire descriptor"},"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3":{"arguments":{"format":"ink-value-wire-v1","identity":"f6ca75f73d60cd2314d69c64454363e593db695767e343195d3b23919755c574","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5":{"arguments":{"format":"ink-value-wire-v1","identity":"3061a46bc74994007e2c94750186c015993dcdb0b813ca54f2c8031fbae28ae1","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":{"unsupported":"unsupported wire descriptor"},"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30":{"arguments":{"format":"ink-value-wire-v1","identity":"c25723d7f2d5c86fdce912dff77de10ffff544058fed24a24e223b43ca727991","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}}},"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":{"unsupported":"unsupported wire descriptor"},"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465":{"arguments":{"format":"ink-value-wire-v1","identity":"857eb1fd05b55c610f44a62e8bf5909738cf119299eddaf110ddd150f5e6272d","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":{"unsupported":"unsupported wire descriptor"},"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e":{"arguments":{"format":"ink-value-wire-v1","identity":"ed136e460e172de1e9db88a4ce327b9fc66430265d41930c518abc13cfe2e33e","named":{},"root":{"fields":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870":{"arguments":{"format":"ink-value-wire-v1","identity":"1f67ce9481e7bf03a3ba8bccc64b89e5b1d9b8f8a998daa1446d82f94a820dea","named":{},"root":{"fields":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2":{"arguments":{"format":"ink-value-wire-v1","identity":"6d8292587d247aa2935d40c05b97e3e8ee25c23a651a20e8a39f9b9a91a4167f","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":{"unsupported":"unsupported wire descriptor"},"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":{"unsupported":"unsupported wire descriptor"},"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c":{"arguments":{"format":"ink-value-wire-v1","identity":"1f3d1f2e5000eabd3285bec367aea83311b89ab0ac1924cb638c4d675e087937","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc":{"arguments":{"format":"ink-value-wire-v1","identity":"607073caea048d19b6ff898d804ca7c0689e88386444b2d2fbfb06bd1c9a0b07","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":{"unsupported":"unsupported wire descriptor"},"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":{"unsupported":"unsupported wire descriptor"},"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e":{"arguments":{"format":"ink-value-wire-v1","identity":"7aa59bf208f3650543459db164197f9767215047ec4b0a391fd81b408a47694a","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":{"unsupported":"unsupported wire descriptor"},"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":{"unsupported":"unsupported wire descriptor"},"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0":{"arguments":{"format":"ink-value-wire-v1","identity":"fc196cc25690823dcbe69ce5b7beb1a54cfad2f6a3a27524d4fe309db03538c6","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096":{"arguments":{"format":"ink-value-wire-v1","identity":"bb4f6cbf585c1725e771d97023bb1e02f6c172cf56394954edf02c361e6ffc0e","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd":{"arguments":{"format":"ink-value-wire-v1","identity":"700a0161a0e4bb6ba9dbf453a8dfe5ea8476df708b4a84e6f0946c2a3667f241","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919":{"arguments":{"format":"ink-value-wire-v1","identity":"75df379d5249d5925250176c06044d8eed3cdd1bbcada81ac35d377b355cba75","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":{"unsupported":"unsupported wire descriptor"},"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c":{"arguments":{"format":"ink-value-wire-v1","identity":"3f17cb2fa22c2f1c799254580140d2b7d9f44d03f28a4e0c26daf7520e8fd345","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d":{"arguments":{"format":"ink-value-wire-v1","identity":"468c20c617405d169739cb1297bc13838a3c83cc05dec2f1e904ba16794225fd","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":{},"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}},"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":{"unsupported":"unsupported wire descriptor"},"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":{"unsupported":"unsupported wire descriptor"},"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":{"unsupported":"unsupported wire descriptor"},"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":{"unsupported":"unsupported wire descriptor"},"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":{"unsupported":"unsupported wire descriptor"},"network":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"predict":{"arguments":{"format":"ink-value-wire-v1","identity":"52008da29dbc58d254eca7d42a46144e532dd7f71050928ac698f667999edecd","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"context","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}}}}};
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
function __prepareFn0(fixed,depth=0){if(depth>=16)return __fn0;let v2545;
return function(){const v2539=10;
const v2540=6;
const v2541=6;
const v2542=[v2540,v2541];
const v2543=4;
const v2544=10000;
if(!v2545){const v2546=__preparedFactories.get(9);v2545=v2546?v2546([true,true,true,true],depth+1):__fn9;}
return v2545(v2539,v2542,v2543,v2544);};}
function __prepareFn1(fixed,depth=0){if(depth>=16)return __fn1;let v2553;
return function(v2547,v2548,v2549){const v2550=v2547;
const v2551=v2548;
const v2552=v2549;
if(!v2553){const v2554=__preparedFactories.get(13);v2553=v2554?v2554([fixed[0],fixed[1],fixed[2]],depth+1):__fn13;}
return v2553(v2550,v2551,v2552);};}
function __prepareFn2(fixed,depth=0){if(depth>=16)return __fn2;let v2563;
return function(v2555,v2556,v2557,v2558){const v2559=v2555;
const v2560=v2556;
const v2561=v2557;
const v2562=v2558;
if(!v2563){const v2564=__preparedFactories.get(14);v2563=v2564?v2564([fixed[0],fixed[1],fixed[2],fixed[3]],depth+1):__fn14;}
return v2563(v2559,v2560,v2561,v2562);};}
function __prepareFn3(fixed,depth=0){if(depth>=16)return __fn3;const v2596=true;let v2595=false,v2594;
const v2607=fixed[2];let v2606=false,v2605;
const v2613=fixed[0]&&fixed[2];let v2612=false,v2611;
const v2622=fixed[0]&&fixed[2];let v2621=false,v2620;
const v2631=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2630=false,v2629;
const v2673=true;let v2672=false,v2671;
return function(v2565,v2566,v2567,v2568){const v2569=v2565;
const v2570=v2569["valid"];
const v2571=false;
const v2572=(v2570===v2571);
let v2573=v2572;if(!v2573){
const v2574=v2565;
const v2575=v2574["parameters"];
const v2576=v2568;
v2573=((v2575) > (v2576));}
const v2577=v2573;
let v2578=v2577;if(!v2578){
const v2579=v2565;
const v2580=v2579["nodes"];
const v2581=v2568;
v2578=((v2580) > (v2581));}
const v2582=v2578;
let v2583=v2582;if(!v2583){
const v2584=v2565;
const v2585=v2584["width"];
const v2586=v2568;
v2583=((v2585) > (v2586));}
const v2587=v2583;
let v2588=v2587;if(!v2588){
const v2589=v2566;
const v2590=v2568;
v2588=((v2589) > (v2590));}
const v2591=v2588;
let v2592;if(v2591){
let v2593;if(v2596&&v2595){v2593=v2594;}else{
v2593=false;if(v2596){v2594=v2593;v2595=true;}}
const v2597=v2565;
const v2598=v2597["parameters"];
const v2599=v2565;
const v2600=v2599["nodes"];
const v2601=v2565;
const v2602=v2601["width"];
const v2603=v2593;
v2592=({["parameters"]:v2598,["nodes"]:v2600,["width"]:v2602,["valid"]:v2603});}else{
let v2604;if(v2607&&v2606){v2604=v2605;}else{
const v2608=v2567;
let v2609;if(v2608){
v2609=2;}else{
v2609=1;}
v2604=v2609;if(v2607){v2605=v2604;v2606=true;}}
let v2610;if(v2613&&v2612){v2610=v2611;}else{
const v2614=v2565;
const v2615=v2614["width"];
const v2616=1;
const v2617=(((v2615) + (v2616)) >>> 0);
const v2618=v2604;
v2610=(Math.imul(v2617,v2618) >>> 0);if(v2613){v2611=v2610;v2612=true;}}
let v2619;if(v2622&&v2621){v2619=v2620;}else{
const v2623=v2565;
const v2624=v2623["width"];
const v2625=v2604;
const v2626=(Math.imul(v2624,v2625) >>> 0);
const v2627=1;
v2619=(((v2626) + (v2627)) >>> 0);if(v2622){v2620=v2619;v2621=true;}}
let v2628;if(v2631&&v2630){v2628=v2629;}else{
const v2632=v2566;
const v2633=v2568;
const v2634=v2565;
const v2635=v2634["parameters"];
const v2636=(((v2633) - (v2635)) >>> 0);
const v2637=v2610;
let v2638;if(v2637===0 ){
v2638=0;}else{
v2638=(Math.trunc(v2636/v2637)+0);}
const v2639=v2638;
const v2640=((v2632) <= (v2639));
let v2641=v2640;if(v2641){
const v2642=v2619;
const v2643=0;
const v2644=(v2642===v2643);
let v2645=v2644;if(!v2645){
const v2646=v2566;
const v2647=v2568;
const v2648=v2565;
const v2649=v2648["nodes"];
const v2650=(((v2647) - (v2649)) >>> 0);
const v2651=v2619;
let v2652;if(v2651===0 ){
v2652=0;}else{
v2652=(Math.trunc(v2650/v2651)+0);}
const v2653=v2652;
v2645=((v2646) <= (v2653));}
v2641=v2645;}
v2628=v2641;if(v2631){v2629=v2628;v2630=true;}}
const v2654=v2628;
let v2655;if(v2654){
const v2656=v2565;
const v2657=v2656["parameters"];
const v2658=v2610;
const v2659=v2566;
const v2660=(Math.imul(v2658,v2659) >>> 0);
const v2661=(((v2657) + (v2660)) >>> 0);
const v2662=v2565;
const v2663=v2662["nodes"];
const v2664=v2619;
const v2665=v2566;
const v2666=(Math.imul(v2664,v2665) >>> 0);
const v2667=(((v2663) + (v2666)) >>> 0);
const v2668=v2566;
const v2669=true;
v2655=({["parameters"]:v2661,["nodes"]:v2667,["width"]:v2668,["valid"]:v2669});}else{
let v2670;if(v2673&&v2672){v2670=v2671;}else{
v2670=false;if(v2673){v2671=v2670;v2672=true;}}
const v2674=v2565;
const v2675=v2674["parameters"];
const v2676=v2565;
const v2677=v2676["nodes"];
const v2678=v2565;
const v2679=v2678["width"];
const v2680=v2670;
v2655=({["parameters"]:v2675,["nodes"]:v2677,["width"]:v2679,["valid"]:v2680});}
v2592=v2655;}
return v2592;};}
function __prepareFn9(fixed,depth=0){if(depth>=16)return __fn9;const v2696=fixed[0];let v2695=false,v2694;
const v2704=fixed[0]&&fixed[1]&&fixed[3];let v2703=false,v2702;
const v2721=fixed[0]&&fixed[1]&&fixed[3];let v2720=false,v2719;
const v2726=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2725=false,v2724;
let v2731;
const v2758=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2757=false,v2756;
const v2766=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2765=false,v2764;
const v2780=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2779=false,v2778;
const v2818=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2817=false,v2816;
const v2827=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2826=false,v2825;
const v2833=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2832=false,v2831;
let v2846;
return function(v2681,v2682,v2683,v2684){const v2685=v2684;
const v2686=1000000;
const v2687=((v2685) > (v2686));
let v2688=v2687;if(!v2688){
const v2689=v2681;
const v2690=v2684;
v2688=((v2689) > (v2690));}
const v2691=v2688;
let v2692;if(v2691){
v2692=({Err:"network capacity"});}else{
let v2693;if(v2696&&v2695){v2693=v2694;}else{
const v2697=0;
const v2698=0;
const v2699=v2681;
const v2700=true;
v2693=({["parameters"]:v2697,["nodes"]:v2698,["width"]:v2699,["valid"]:v2700});if(v2696){v2694=v2693;v2695=true;}}
let v2701;if(v2704&&v2703){v2701=v2702;}else{
const v2705=v2682;
const v2706=v2693;
let v2707=({["shape"]:v2706});
for(let v2708=0;v2708<v2705.length;v2708++){
const v2709=(v2705[v2708]>>>0);
const v2710=v2707;
const v2711=v2710["shape"];
const v2712=v2711;
const v2713=v2709;
const v2714=true;
const v2715=v2684;
const v2716=__fn3(v2712,v2713,v2714,v2715);
const v2717=v2716;
v2707=({["shape"]:v2717});
}
v2701=v2707;if(v2704){v2702=v2701;v2703=true;}}
let v2718;if(v2721&&v2720){v2718=v2719;}else{
const v2722=v2701;
v2718=v2722["shape"];if(v2721){v2719=v2718;v2720=true;}}
let v2723;if(v2726&&v2725){v2723=v2724;}else{
const v2727=v2718;
const v2728=v2683;
const v2729=false;
const v2730=v2684;
if(!v2731){const v2732=__preparedFactories.get(3);v2731=v2732?v2732([fixed[0]&&fixed[1]&&fixed[3],fixed[2],true,fixed[3]],depth+1):__fn3;}
v2723=v2731(v2727,v2728,v2729,v2730);if(v2726){v2724=v2723;v2725=true;}}
const v2733=v2723;
const v2734=v2733["valid"];
const v2735=false;
const v2736=(v2734===v2735);
let v2737=v2736;if(!v2737){
const v2738=v2681;
const v2739=v2684;
const v2740=v2723;
const v2741=v2740["parameters"];
const v2742=(((v2739) - (v2741)) >>> 0);
v2737=((v2738) > (v2742));}
const v2743=v2737;
let v2744=v2743;if(!v2744){
const v2745=v2723;
const v2746=v2745["nodes"];
const v2747=v2684;
const v2748=v2723;
const v2749=v2748["parameters"];
const v2750=(((v2747) - (v2749)) >>> 0);
const v2751=v2681;
const v2752=(((v2750) - (v2751)) >>> 0);
v2744=((v2746) > (v2752));}
const v2753=v2744;
let v2754;if(v2753){
v2754=({Err:"network capacity"});}else{
let v2755;if(v2758&&v2757){v2755=v2756;}else{
const v2759=v2723;
const v2760=v2759["parameters"];
const v2761=v2681;
v2755=(((v2760) + (v2761)) >>> 0);if(v2758){v2756=v2755;v2757=true;}}
const v2762=new __InkBuffer([]);
let v2763;if(v2766&&v2765){v2763=v2764;}else{
const v2767=v2681;
let v2768=v2762;
for(let v2769=0;v2769<v2767;v2769++){
if(false){break;}
const v2770=(v2769>>>0);
const v2771=v2768;
const v2772=v2723;
const v2773=v2772["parameters"];
const v2774=v2770;
const v2775=(((v2773) + (v2774)) >>> 0);
v2768=__tempEdit(v2771,"push",v2775);}
const v2776=v2768;
v2763=v2776.freeze();if(v2766){v2764=v2763;v2765=true;}}
let v2777;if(v2780&&v2779){v2777=v2778;}else{
v2777=v2763;if(v2780){v2778=v2777;v2779=true;}}
const v2782=new __InkBuffer([]);
const v2783=new __InkBuffer([]);
const v2784=0;
const v2785=v2755;
const v2781=({["nodes"]:v2782,["outputs"]:v2783,["parameter"]:v2784,["inputs"]:v2785});
const v2787=v2682;
const v2788=v2781;
const v2789=v2777;
let v2790=({["layer"]:v2788,["wires"]:v2789});
for(let v2791=0;v2791<v2787.length;v2791++){
const v2792=(v2787[v2791]>>>0);
const v2793=v2790;
const v2794=v2793["layer"];
const v2795=v2790;
const v2796=v2795["wires"];
const v2797=v2794;
const v2798=v2792;
const v2799=v2796;
const v2800=__fn7(v2797,v2798,v2799);
const v2801=v2800;
const v2802=v2801["outputs"];
const v2803=v2802.freeze();
const v2804=v2800;
const v2805=v2804["nodes"];
const v2806=new __InkBuffer([]);
const v2807=v2800;
const v2808=v2807["parameter"];
const v2809=v2755;
const v2810=({["nodes"]:v2805,["outputs"]:v2806,["parameter"]:v2808,["inputs"]:v2809});
const v2811=v2810;
const v2812=v2803;
v2790=({["layer"]:v2811,["wires"]:v2812});
}
const v2786=v2790;
const v2814=v2786;
const v2813=v2814["layer"];
let v2815;if(v2818&&v2817){v2815=v2816;}else{
const v2819=v2786;
v2815=v2819["wires"];if(v2818){v2816=v2815;v2817=true;}}
const v2821=v2813;
const v2822=v2683;
const v2823=v2815;
const v2820=__fn8(v2821,v2822,v2823);
let v2824;if(v2827&&v2826){v2824=v2825;}else{
const v2828=v2820;
const v2829=v2828["nodes"];
v2824=v2829.freeze();if(v2827){v2825=v2824;v2826=true;}}
let v2830;if(v2833&&v2832){v2830=v2831;}else{
const v2834=v2820;
const v2835=v2834["outputs"];
v2830=v2835.freeze();if(v2833){v2831=v2830;v2832=true;}}
const v2836=v2820;
const v2837=v2836["parameter"];
const v2838=v2723;
const v2839=v2838["parameters"];
const v2840=!(v2837===v2839);
let v2841;if(v2840){
v2841=({Err:"network parameter layout"});}else{
const v2842=v2755;
const v2843=v2824;
const v2844=v2830;
const v2845=v2684;
if(!v2846){const v2847=__preparedFactories.get(39);v2846=v2847?v2847([fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[0]&&fixed[1]&&fixed[2]&&fixed[3],fixed[3]],depth+1):__fn39;}
const v2848=v2846(v2842,v2843,v2844,v2845);
const v2850=v2848;
let v2851;if(Object.hasOwn(v2850,"Ok")){
const v2852=v2850["Ok"];
const v2853=v2852;
const v2854=v2853;
const v2855=v2723;
const v2856=v2855["parameters"];
const v2857=v2681;
const v2858=v2683;
v2851=({Ok:({["graph"]:v2854,["parameters"]:v2856,["features"]:v2857,["outputs"]:v2858})});}else{
const v2859=v2850["Err"];
v2851=({Err:v2859});}
v2841=v2851;}
v2754=v2841;}
v2692=v2754;}
return v2692;};}
function __prepareFn12(fixed,depth=0){if(depth>=16)return __fn12;let v2867;
return function(v2864){const v2865=v2864;
const v2866=v2865["graph"];
if(!v2867){const v2868=__preparedFactories.get(40);v2867=v2868?v2868([fixed[0]],depth+1):__fn40;}
return v2867(v2866);};}
function __prepareFn13(fixed,depth=0){if(depth>=16)return __fn13;let v2892;
return function(v2869,v2870,v2871){const v2872=(v2870).length;
const v2873=v2869;
const v2874=v2873["parameters"];
const v2875=!(v2872===v2874);
let v2876=v2875;if(!v2876){
const v2877=(v2871).length;
const v2878=v2869;
const v2879=v2878["features"];
v2876=!(v2877===v2879);}
const v2880=v2876;
let v2881;if(v2880){
v2881=({Err:"network input shape"});}else{
const v2882=v2869;
const v2883=v2882["graph"];
const v2884=v2870;
const v2885=v2871;
const v2886=v2884.length;
const v2887=v2885.length;
const v2888=new Array(v2886+v2887);
for(let v2889=0;v2889<v2886;v2889++){v2888[v2889]=v2884[v2889];}
for(let v2890=0;v2890<v2887;v2890++){v2888[v2886+v2890]=v2885[v2890];}
const v2891=v2888;
if(!v2892){const v2893=__preparedFactories.get(53);v2892=v2893?v2893([fixed[0],fixed[1]&&fixed[2]],depth+1):__fn53;}
v2881=v2892(v2883,v2891);}
return v2881;};}
function __prepareFn14(fixed,depth=0){if(depth>=16)return __fn14;let v2920;
return function(v2894,v2895,v2896,v2897){const v2898=(v2895).length;
const v2899=v2894;
const v2900=v2899["parameters"];
const v2901=!(v2898===v2900);
let v2902=v2901;if(!v2902){
const v2903=(v2896).length;
const v2904=v2894;
const v2905=v2904["features"];
v2902=!(v2903===v2905);}
const v2906=v2902;
let v2907;if(v2906){
v2907=({Err:"network input shape"});}else{
const v2908=v2894;
const v2909=v2908["graph"];
const v2910=v2895;
const v2911=v2896;
const v2912=v2910.length;
const v2913=v2911.length;
const v2914=new Array(v2912+v2913);
for(let v2915=0;v2915<v2912;v2915++){v2914[v2915]=v2910[v2915];}
for(let v2916=0;v2916<v2913;v2916++){v2914[v2912+v2916]=v2911[v2916];}
const v2917=v2914;
const v2918=v2897;
const v2919=__fn33();
if(!v2920){const v2921=__preparedFactories.get(66);v2920=v2921?v2921([fixed[0],fixed[1]&&fixed[2],fixed[3],true],depth+1):__fn66;}
const v2922=v2920(v2909,v2917,v2918,v2919);
const v2924=v2922;
let v2925;if(Object.hasOwn(v2924,"Ok")){
const v2926=v2924["Ok"];
const v2927=v2926;
const v2928=v2927;
const v2929=__nfValue(v2928["loss"]);
const v2930=v2927;
const v2931=v2930["outputs"];
const v2932=v2927;
const v2933=v2932["gradient"];
const v2934=v2894;
const v2935=v2933.slice(0,v2934["parameters"]);
v2925=({Ok:({["loss"]:v2929,["outputs"]:v2931,["gradient"]:v2935})});}else{
const v2936=v2924["Err"];
v2925=({Err:v2936});}
v2907=v2925;}
return v2907;};}
function __prepareFn16(fixed,depth=0){if(depth>=16)return __fn16;const v2957=true;let v2956=false,v2955;
let v2961;
const v2966=fixed[0];let v2965=false,v2964;
return function(v2953){let v2954;if(v2957&&v2956){v2954=v2955;}else{
const v2958="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v2959=0;
const v2960=0;
if(!v2961){const v2962=__preparedFactories.get(15);v2961=v2962?v2962([true,true,true],depth+1):__fn15;}
v2954=v2961(v2958,v2959,v2960);if(v2957){v2955=v2954;v2956=true;}}
let v2963;if(v2966&&v2965){v2963=v2964;}else{
v2963=__nfValue(v2953);if(v2966){v2964=v2963;v2965=true;}}
const v2967=v2954;
const v2968=v2967["kind"];
const v2969=v2954;
const v2970=v2969["binary"];
const v2971=v2954;
const v2972=v2971["unary"];
const v2973=v2954;
const v2974=v2973["a"];
const v2975=v2954;
const v2976=v2975["b"];
const v2977=v2954;
const v2978=v2977["c"];
const v2979=__nfValue(v2963);
const v2980=v2954;
const v2981=v2980["terms"];
const v2982=v2954;
const v2983=v2982["gates"];
const v2984=v2954;
const v2985=__nfValue(v2984["gate_bias"]);
const v2986=v2954;
const v2987=v2986["table"];
const v2988=v2954;
const v2989=v2988["below"];
const v2990=v2954;
const v2991=v2990["above"];
return ({["kind"]:v2968,["binary"]:v2970,["unary"]:v2972,["a"]:v2974,["b"]:v2976,["c"]:v2978,["value"]:v2979,["terms"]:v2981,["gates"]:v2983,["gate_bias"]:v2985,["table"]:v2987,["below"]:v2989,["above"]:v2991});};}
function __prepareFn17(fixed,depth=0){if(depth>=16)return __fn17;const v2998=fixed[1]&&fixed[2];let v2997=false,v2996;
let v3002;
const v3007=fixed[0];let v3006=false,v3005;
return function(v2992,v2993,v2994){let v2995;if(v2998&&v2997){v2995=v2996;}else{
const v2999="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3000=v2993;
const v3001=v2994;
if(!v3002){const v3003=__preparedFactories.get(15);v3002=v3003?v3003([true,fixed[1],fixed[2]],depth+1):__fn15;}
v2995=v3002(v2999,v3000,v3001);if(v2998){v2996=v2995;v2997=true;}}
let v3004;if(v3007&&v3006){v3004=v3005;}else{
v3004=v2992;if(v3007){v3005=v3004;v3006=true;}}
const v3008=v2995;
const v3009=v3008["kind"];
const v3010=v3004;
const v3011=v2995;
const v3012=v3011["unary"];
const v3013=v2995;
const v3014=v3013["a"];
const v3015=v2995;
const v3016=v3015["b"];
const v3017=v2995;
const v3018=v3017["c"];
const v3019=v2995;
const v3020=__nfValue(v3019["value"]);
const v3021=v2995;
const v3022=v3021["terms"];
const v3023=v2995;
const v3024=v3023["gates"];
const v3025=v2995;
const v3026=__nfValue(v3025["gate_bias"]);
const v3027=v2995;
const v3028=v3027["table"];
const v3029=v2995;
const v3030=v3029["below"];
const v3031=v2995;
const v3032=v3031["above"];
return ({["kind"]:v3009,["binary"]:v3010,["unary"]:v3012,["a"]:v3014,["b"]:v3016,["c"]:v3018,["value"]:v3020,["terms"]:v3022,["gates"]:v3024,["gate_bias"]:v3026,["table"]:v3028,["below"]:v3030,["above"]:v3032});};}
function __prepareFn18(fixed,depth=0){if(depth>=16)return __fn18;const v3038=fixed[1];let v3037=false,v3036;
let v3042;
const v3047=fixed[0];let v3046=false,v3045;
return function(v3033,v3034){let v3035;if(v3038&&v3037){v3035=v3036;}else{
const v3039="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3040=v3034;
const v3041=0;
if(!v3042){const v3043=__preparedFactories.get(15);v3042=v3043?v3043([true,fixed[1],true],depth+1):__fn15;}
v3035=v3042(v3039,v3040,v3041);if(v3038){v3036=v3035;v3037=true;}}
let v3044;if(v3047&&v3046){v3044=v3045;}else{
v3044=v3033;if(v3047){v3045=v3044;v3046=true;}}
const v3048=v3035;
const v3049=v3048["kind"];
const v3050=v3035;
const v3051=v3050["binary"];
const v3052=v3044;
const v3053=v3035;
const v3054=v3053["a"];
const v3055=v3035;
const v3056=v3055["b"];
const v3057=v3035;
const v3058=v3057["c"];
const v3059=v3035;
const v3060=__nfValue(v3059["value"]);
const v3061=v3035;
const v3062=v3061["terms"];
const v3063=v3035;
const v3064=v3063["gates"];
const v3065=v3035;
const v3066=__nfValue(v3065["gate_bias"]);
const v3067=v3035;
const v3068=v3067["table"];
const v3069=v3035;
const v3070=v3069["below"];
const v3071=v3035;
const v3072=v3071["above"];
return ({["kind"]:v3049,["binary"]:v3051,["unary"]:v3052,["a"]:v3054,["b"]:v3056,["c"]:v3058,["value"]:v3060,["terms"]:v3062,["gates"]:v3064,["gate_bias"]:v3066,["table"]:v3068,["below"]:v3070,["above"]:v3072});};}
function __prepareFn19(fixed,depth=0){if(depth>=16)return __fn19;let v3078;
return function(v3073,v3074){const v3075="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v3076=v3073;
const v3077=v3074;
if(!v3078){const v3079=__preparedFactories.get(17);v3078=v3079?v3079([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v3078(v3075,v3076,v3077);};}
function __prepareFn20(fixed,depth=0){if(depth>=16)return __fn20;let v3085;
return function(v3080,v3081){const v3082="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v3083=v3080;
const v3084=v3081;
if(!v3085){const v3086=__preparedFactories.get(17);v3085=v3086?v3086([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v3085(v3082,v3083,v3084);};}
function __prepareFn21(fixed,depth=0){if(depth>=16)return __fn21;let v3092;
return function(v3087,v3088){const v3089="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v3090=v3087;
const v3091=v3088;
if(!v3092){const v3093=__preparedFactories.get(17);v3092=v3093?v3093([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v3092(v3089,v3090,v3091);};}
function __prepareFn22(fixed,depth=0){if(depth>=16)return __fn22;let v3099;
return function(v3094,v3095){const v3096="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
const v3097=v3094;
const v3098=v3095;
if(!v3099){const v3100=__preparedFactories.get(17);v3099=v3100?v3100([true,fixed[0],fixed[1]],depth+1):__fn17;}
return v3099(v3096,v3097,v3098);};}
function __prepareFn23(fixed,depth=0){if(depth>=16)return __fn23;let v3104;
return function(v3101){const v3102="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v3103=v3101;
if(!v3104){const v3105=__preparedFactories.get(18);v3104=v3105?v3105([true,fixed[0]],depth+1):__fn18;}
return v3104(v3102,v3103);};}
function __prepareFn24(fixed,depth=0){if(depth>=16)return __fn24;let v3109;
return function(v3106){const v3107="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v3108=v3106;
if(!v3109){const v3110=__preparedFactories.get(18);v3109=v3110?v3110([true,fixed[0]],depth+1):__fn18;}
return v3109(v3107,v3108);};}
function __prepareFn25(fixed,depth=0){if(depth>=16)return __fn25;let v3114;
return function(v3111){const v3112="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v3113=v3111;
if(!v3114){const v3115=__preparedFactories.get(18);v3114=v3115?v3115([true,fixed[0]],depth+1):__fn18;}
return v3114(v3112,v3113);};}
function __prepareFn26(fixed,depth=0){if(depth>=16)return __fn26;let v3119;
return function(v3116){const v3117="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
const v3118=v3116;
if(!v3119){const v3120=__preparedFactories.get(18);v3119=v3120?v3120([true,fixed[0]],depth+1):__fn18;}
return v3119(v3117,v3118);};}
function __prepareFn27(fixed,depth=0){if(depth>=16)return __fn27;const v3126=true;let v3125=false,v3124;
let v3130;
const v3135=fixed[0];let v3134=false,v3133;
const v3139=fixed[1];let v3138=false,v3137;
return function(v3121,v3122){let v3123;if(v3126&&v3125){v3123=v3124;}else{
const v3127="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3128=0;
const v3129=0;
if(!v3130){const v3131=__preparedFactories.get(15);v3130=v3131?v3131([true,true,true],depth+1):__fn15;}
v3123=v3130(v3127,v3128,v3129);if(v3126){v3124=v3123;v3125=true;}}
let v3132;if(v3135&&v3134){v3132=v3133;}else{
v3132=v3121;if(v3135){v3133=v3132;v3134=true;}}
let v3136;if(v3139&&v3138){v3136=v3137;}else{
v3136=__nfValue(v3122);if(v3139){v3137=v3136;v3138=true;}}
const v3140=v3123;
const v3141=v3140["kind"];
const v3142=v3123;
const v3143=v3142["binary"];
const v3144=v3123;
const v3145=v3144["unary"];
const v3146=v3123;
const v3147=v3146["a"];
const v3148=v3123;
const v3149=v3148["b"];
const v3150=v3123;
const v3151=v3150["c"];
const v3152=__nfValue(v3136);
const v3153=v3132;
const v3154=v3123;
const v3155=v3154["gates"];
const v3156=v3123;
const v3157=__nfValue(v3156["gate_bias"]);
const v3158=v3123;
const v3159=v3158["table"];
const v3160=v3123;
const v3161=v3160["below"];
const v3162=v3123;
const v3163=v3162["above"];
return ({["kind"]:v3141,["binary"]:v3143,["unary"]:v3145,["a"]:v3147,["b"]:v3149,["c"]:v3151,["value"]:v3152,["terms"]:v3153,["gates"]:v3155,["gate_bias"]:v3157,["table"]:v3159,["below"]:v3161,["above"]:v3163});};}
function __prepareFn28(fixed,depth=0){if(depth>=16)return __fn28;const v3171=true;let v3170=false,v3169;
let v3175;
const v3180=fixed[0];let v3179=false,v3178;
const v3184=fixed[1];let v3183=false,v3182;
const v3188=fixed[2];let v3187=false,v3186;
const v3192=fixed[3];let v3191=false,v3190;
return function(v3164,v3165,v3166,v3167){let v3168;if(v3171&&v3170){v3168=v3169;}else{
const v3172="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3173=0;
const v3174=0;
if(!v3175){const v3176=__preparedFactories.get(15);v3175=v3176?v3176([true,true,true],depth+1):__fn15;}
v3168=v3175(v3172,v3173,v3174);if(v3171){v3169=v3168;v3170=true;}}
let v3177;if(v3180&&v3179){v3177=v3178;}else{
v3177=v3164;if(v3180){v3178=v3177;v3179=true;}}
let v3181;if(v3184&&v3183){v3181=v3182;}else{
v3181=__nfValue(v3165);if(v3184){v3182=v3181;v3183=true;}}
let v3185;if(v3188&&v3187){v3185=v3186;}else{
v3185=v3166;if(v3188){v3186=v3185;v3187=true;}}
let v3189;if(v3192&&v3191){v3189=v3190;}else{
v3189=__nfValue(v3167);if(v3192){v3190=v3189;v3191=true;}}
const v3193=v3168;
const v3194=v3193["kind"];
const v3195=v3168;
const v3196=v3195["binary"];
const v3197=v3168;
const v3198=v3197["unary"];
const v3199=v3168;
const v3200=v3199["a"];
const v3201=v3168;
const v3202=v3201["b"];
const v3203=v3168;
const v3204=v3203["c"];
const v3205=__nfValue(v3181);
const v3206=v3177;
const v3207=v3185;
const v3208=__nfValue(v3189);
const v3209=v3168;
const v3210=v3209["table"];
const v3211=v3168;
const v3212=v3211["below"];
const v3213=v3168;
const v3214=v3213["above"];
return ({["kind"]:v3194,["binary"]:v3196,["unary"]:v3198,["a"]:v3200,["b"]:v3202,["c"]:v3204,["value"]:v3205,["terms"]:v3206,["gates"]:v3207,["gate_bias"]:v3208,["table"]:v3210,["below"]:v3212,["above"]:v3214});};}
function __prepareFn29(fixed,depth=0){if(depth>=16)return __fn29;const v3221=fixed[0]&&fixed[1];let v3220=false,v3219;
let v3225;
const v3230=fixed[2];let v3229=false,v3228;
return function(v3215,v3216,v3217){let v3218;if(v3221&&v3220){v3218=v3219;}else{
const v3222="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3223=v3215;
const v3224=v3216;
if(!v3225){const v3226=__preparedFactories.get(15);v3225=v3226?v3226([true,fixed[0],fixed[1]],depth+1):__fn15;}
v3218=v3225(v3222,v3223,v3224);if(v3221){v3219=v3218;v3220=true;}}
let v3227;if(v3230&&v3229){v3227=v3228;}else{
v3227=v3217;if(v3230){v3228=v3227;v3229=true;}}
const v3231=v3218;
const v3232=v3231["kind"];
const v3233=v3218;
const v3234=v3233["binary"];
const v3235=v3218;
const v3236=v3235["unary"];
const v3237=v3218;
const v3238=v3237["a"];
const v3239=v3218;
const v3240=v3239["b"];
const v3241=v3227;
const v3242=v3218;
const v3243=__nfValue(v3242["value"]);
const v3244=v3218;
const v3245=v3244["terms"];
const v3246=v3218;
const v3247=v3246["gates"];
const v3248=v3218;
const v3249=__nfValue(v3248["gate_bias"]);
const v3250=v3218;
const v3251=v3250["table"];
const v3252=v3218;
const v3253=v3252["below"];
const v3254=v3218;
const v3255=v3254["above"];
return ({["kind"]:v3232,["binary"]:v3234,["unary"]:v3236,["a"]:v3238,["b"]:v3240,["c"]:v3241,["value"]:v3243,["terms"]:v3245,["gates"]:v3247,["gate_bias"]:v3249,["table"]:v3251,["below"]:v3253,["above"]:v3255});};}
function __prepareFn30(fixed,depth=0){if(depth>=16)return __fn30;const v3263=fixed[0];let v3262=false,v3261;
let v3267;
const v3272=fixed[1];let v3271=false,v3270;
const v3276=fixed[2];let v3275=false,v3274;
const v3280=fixed[3];let v3279=false,v3278;
return function(v3256,v3257,v3258,v3259){let v3260;if(v3263&&v3262){v3260=v3261;}else{
const v3264="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v3265=v3256;
const v3266=0;
if(!v3267){const v3268=__preparedFactories.get(15);v3267=v3268?v3268([true,fixed[0],true],depth+1):__fn15;}
v3260=v3267(v3264,v3265,v3266);if(v3263){v3261=v3260;v3262=true;}}
let v3269;if(v3272&&v3271){v3269=v3270;}else{
v3269=v3257;if(v3272){v3270=v3269;v3271=true;}}
let v3273;if(v3276&&v3275){v3273=v3274;}else{
v3273=v3258;if(v3276){v3274=v3273;v3275=true;}}
let v3277;if(v3280&&v3279){v3277=v3278;}else{
v3277=v3259;if(v3280){v3278=v3277;v3279=true;}}
const v3281=v3260;
const v3282=v3281["kind"];
const v3283=v3260;
const v3284=v3283["binary"];
const v3285=v3260;
const v3286=v3285["unary"];
const v3287=v3260;
const v3288=v3287["a"];
const v3289=v3260;
const v3290=v3289["b"];
const v3291=v3260;
const v3292=v3291["c"];
const v3293=v3260;
const v3294=__nfValue(v3293["value"]);
const v3295=v3260;
const v3296=v3295["terms"];
const v3297=v3260;
const v3298=v3297["gates"];
const v3299=v3260;
const v3300=__nfValue(v3299["gate_bias"]);
const v3301=v3269;
const v3302=v3273;
const v3303=v3277;
return ({["kind"]:v3282,["binary"]:v3284,["unary"]:v3286,["a"]:v3288,["b"]:v3290,["c"]:v3292,["value"]:v3294,["terms"]:v3296,["gates"]:v3298,["gate_bias"]:v3300,["table"]:v3301,["below"]:v3302,["above"]:v3303});};}
function __prepareFn34(fixed,depth=0){if(depth>=16)return __fn34;const v3320=fixed[0];let v3319=false,v3318;
return function(v3316){let v3317;if(v3320&&v3319){v3317=v3318;}else{
const v3321=v3316;
v3317=v3321["kind"];if(v3320){v3318=v3317;v3319=true;}}
const v3322=v3317;
const v3323="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3324=(v3322===v3323);
let v3325;if(v3324){
v3325=[];}else{
const v3326=v3317;
const v3327="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3328=(v3326===v3327);
let v3329;if(v3328){
const v3330=v3316;
const v3331=v3330["a"];
const v3332=v3316;
const v3333=v3332["b"];
v3329=[v3331,v3333];}else{
const v3334=v3317;
const v3335="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3336=(v3334===v3335);
let v3337;if(v3336){
const v3338=v3316;
const v3339=v3338["a"];
v3337=[v3339];}else{
const v3340=v3317;
const v3341="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3342=(v3340===v3341);
let v3343;if(v3342){
const v3344=v3316;
const v3345=v3344["terms"];
const v3346=v3345.length;
const v3347=new Array(v3346);
for(let v3348=0;v3348<v3346;v3348++){
const v3349=v3345[v3348];
const v3350=v3349;
v3347[v3348]=v3350["wire"];
}
v3343=v3347;}else{
const v3351=v3317;
const v3352="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3353=(v3351===v3352);
let v3354;if(v3353){
const v3355=v3316;
const v3356=v3355["terms"];
const v3357=v3356.length;
const v3358=new Array(v3357);
for(let v3359=0;v3359<v3357;v3359++){
const v3360=v3356[v3359];
const v3361=v3360;
v3358[v3359]=v3361["wire"];
}
const v3362=v3358;
const v3363=v3316;
const v3364=v3363["gates"];
const v3365=v3364.length;
const v3366=new Array(v3365);
for(let v3367=0;v3367<v3365;v3367++){
const v3368=v3364[v3367];
const v3369=v3368;
v3366[v3367]=v3369["wire"];
}
const v3370=v3366;
const v3371=v3362.length;
const v3372=v3370.length;
const v3373=new Array(v3371+v3372);
for(let v3374=0;v3374<v3371;v3374++){v3373[v3374]=v3362[v3374];}
for(let v3375=0;v3375<v3372;v3375++){v3373[v3371+v3375]=v3370[v3375];}
v3354=v3373;}else{
const v3376=v3317;
const v3377="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3378=(v3376===v3377);
let v3379;if(v3378){
const v3380=v3316;
const v3381=v3380["a"];
const v3382=v3316;
const v3383=v3382["b"];
const v3384=v3316;
const v3385=v3384["c"];
v3379=[v3381,v3383,v3385];}else{
const v3386=v3316;
const v3387=v3386["a"];
const v3388=[v3387];
const v3389=v3316;
const v3390=v3389["table"];
const v3391=v3388.length;
const v3392=v3390.length;
const v3393=new Array(v3391+v3392);
for(let v3394=0;v3394<v3391;v3394++){v3393[v3394]=v3388[v3394];}
for(let v3395=0;v3395<v3392;v3395++){v3393[v3391+v3395]=v3390[v3395];}
v3379=v3393;}
v3354=v3379;}
v3343=v3354;}
v3337=v3343;}
v3329=v3337;}
v3325=v3329;}
return v3325;};}
function __prepareFn35(fixed,depth=0){if(depth>=16)return __fn35;const v3401=fixed[0];let v3400=false,v3399;
const v3414=fixed[0]&&fixed[1];let v3413=false,v3412;
const v3422=fixed[0]&&fixed[1];let v3421=false,v3420;
const v3458=fixed[0]&&fixed[1];let v3457=false,v3456;
const v3495=fixed[0]&&fixed[1];let v3494=false,v3493;
const v3541=fixed[0]&&fixed[1];let v3540=false,v3539;
const v3558=fixed[0]&&fixed[1];let v3557=false,v3556;
const v3603=fixed[0]&&fixed[1];let v3602=false,v3601;
const v3611=fixed[0]&&fixed[1];let v3610=false,v3609;
const v3619=fixed[0]&&fixed[1];let v3618=false,v3617;
const v3650=fixed[0]&&fixed[1];let v3649=false,v3648;
const v3658=fixed[0]&&fixed[1];let v3657=false,v3656;
return function(v3396,v3397){let v3398;if(v3401&&v3400){v3398=v3399;}else{
const v3402=v3396;
v3398=v3402["kind"];if(v3401){v3399=v3398;v3400=true;}}
const v3403=v3398;
const v3404="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3405=(v3403===v3404);
let v3406;if(v3405){
v3406=v3396;}else{
const v3407=v3398;
const v3408="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3409=(v3407===v3408);
let v3410;if(v3409){
let v3411;if(v3414&&v3413){v3411=v3412;}else{
const v3415=v3397;
const v3416=v3396;
const v3417=v3416["a"];
let v3418;if(v3417<v3415.length){v3418=v3415[v3417];}else{
v3418=0;}
v3411=v3418;if(v3414){v3412=v3411;v3413=true;}}
let v3419;if(v3422&&v3421){v3419=v3420;}else{
const v3423=v3397;
const v3424=v3396;
const v3425=v3424["b"];
let v3426;if(v3425<v3423.length){v3426=v3423[v3425];}else{
v3426=0;}
v3419=v3426;if(v3422){v3420=v3419;v3421=true;}}
const v3427=v3396;
const v3428=v3427["kind"];
const v3429=v3396;
const v3430=v3429["binary"];
const v3431=v3396;
const v3432=v3431["unary"];
const v3433=v3411;
const v3434=v3419;
const v3435=v3396;
const v3436=v3435["c"];
const v3437=v3396;
const v3438=__nfValue(v3437["value"]);
const v3439=v3396;
const v3440=v3439["terms"];
const v3441=v3396;
const v3442=v3441["gates"];
const v3443=v3396;
const v3444=__nfValue(v3443["gate_bias"]);
const v3445=v3396;
const v3446=v3445["table"];
const v3447=v3396;
const v3448=v3447["below"];
const v3449=v3396;
const v3450=v3449["above"];
v3410=({["kind"]:v3428,["binary"]:v3430,["unary"]:v3432,["a"]:v3433,["b"]:v3434,["c"]:v3436,["value"]:v3438,["terms"]:v3440,["gates"]:v3442,["gate_bias"]:v3444,["table"]:v3446,["below"]:v3448,["above"]:v3450});}else{
const v3451=v3398;
const v3452="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3453=(v3451===v3452);
let v3454;if(v3453){
let v3455;if(v3458&&v3457){v3455=v3456;}else{
const v3459=v3397;
const v3460=v3396;
const v3461=v3460["a"];
let v3462;if(v3461<v3459.length){v3462=v3459[v3461];}else{
v3462=0;}
v3455=v3462;if(v3458){v3456=v3455;v3457=true;}}
const v3463=v3396;
const v3464=v3463["kind"];
const v3465=v3396;
const v3466=v3465["binary"];
const v3467=v3396;
const v3468=v3467["unary"];
const v3469=v3455;
const v3470=v3396;
const v3471=v3470["b"];
const v3472=v3396;
const v3473=v3472["c"];
const v3474=v3396;
const v3475=__nfValue(v3474["value"]);
const v3476=v3396;
const v3477=v3476["terms"];
const v3478=v3396;
const v3479=v3478["gates"];
const v3480=v3396;
const v3481=__nfValue(v3480["gate_bias"]);
const v3482=v3396;
const v3483=v3482["table"];
const v3484=v3396;
const v3485=v3484["below"];
const v3486=v3396;
const v3487=v3486["above"];
v3454=({["kind"]:v3464,["binary"]:v3466,["unary"]:v3468,["a"]:v3469,["b"]:v3471,["c"]:v3473,["value"]:v3475,["terms"]:v3477,["gates"]:v3479,["gate_bias"]:v3481,["table"]:v3483,["below"]:v3485,["above"]:v3487});}else{
const v3488=v3398;
const v3489="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3490=(v3488===v3489);
let v3491;if(v3490){
let v3492;if(v3495&&v3494){v3492=v3493;}else{
const v3496=v3396;
const v3497=v3496["terms"];
const v3498=v3497.length;
const v3499=new Array(v3498);
for(let v3500=0;v3500<v3498;v3500++){
const v3501=v3497[v3500];
const v3502=v3397;
const v3503=v3501;
const v3504=v3503["wire"];
let v3505;if(v3504<v3502.length){v3505=v3502[v3504];}else{
v3505=0;}
const v3506=v3505;
const v3507=v3501;
const v3508=__nfValue(v3507["coefficient"]);
v3499[v3500]=({["wire"]:v3506,["coefficient"]:v3508});
}
v3492=v3499;if(v3495){v3493=v3492;v3494=true;}}
const v3509=v3396;
const v3510=v3509["kind"];
const v3511=v3396;
const v3512=v3511["binary"];
const v3513=v3396;
const v3514=v3513["unary"];
const v3515=v3396;
const v3516=v3515["a"];
const v3517=v3396;
const v3518=v3517["b"];
const v3519=v3396;
const v3520=v3519["c"];
const v3521=v3396;
const v3522=__nfValue(v3521["value"]);
const v3523=v3492;
const v3524=v3396;
const v3525=v3524["gates"];
const v3526=v3396;
const v3527=__nfValue(v3526["gate_bias"]);
const v3528=v3396;
const v3529=v3528["table"];
const v3530=v3396;
const v3531=v3530["below"];
const v3532=v3396;
const v3533=v3532["above"];
v3491=({["kind"]:v3510,["binary"]:v3512,["unary"]:v3514,["a"]:v3516,["b"]:v3518,["c"]:v3520,["value"]:v3522,["terms"]:v3523,["gates"]:v3525,["gate_bias"]:v3527,["table"]:v3529,["below"]:v3531,["above"]:v3533});}else{
const v3534=v3398;
const v3535="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3536=(v3534===v3535);
let v3537;if(v3536){
let v3538;if(v3541&&v3540){v3538=v3539;}else{
const v3542=v3396;
const v3543=v3542["terms"];
const v3544=v3543.length;
const v3545=new Array(v3544);
for(let v3546=0;v3546<v3544;v3546++){
const v3547=v3543[v3546];
const v3548=v3397;
const v3549=v3547;
const v3550=v3549["wire"];
let v3551;if(v3550<v3548.length){v3551=v3548[v3550];}else{
v3551=0;}
const v3552=v3551;
const v3553=v3547;
const v3554=__nfValue(v3553["coefficient"]);
v3545[v3546]=({["wire"]:v3552,["coefficient"]:v3554});
}
v3538=v3545;if(v3541){v3539=v3538;v3540=true;}}
let v3555;if(v3558&&v3557){v3555=v3556;}else{
const v3559=v3396;
const v3560=v3559["gates"];
const v3561=v3560.length;
const v3562=new Array(v3561);
for(let v3563=0;v3563<v3561;v3563++){
const v3564=v3560[v3563];
const v3565=v3397;
const v3566=v3564;
const v3567=v3566["wire"];
let v3568;if(v3567<v3565.length){v3568=v3565[v3567];}else{
v3568=0;}
const v3569=v3568;
const v3570=v3564;
const v3571=__nfValue(v3570["coefficient"]);
v3562[v3563]=({["wire"]:v3569,["coefficient"]:v3571});
}
v3555=v3562;if(v3558){v3556=v3555;v3557=true;}}
const v3572=v3396;
const v3573=v3572["kind"];
const v3574=v3396;
const v3575=v3574["binary"];
const v3576=v3396;
const v3577=v3576["unary"];
const v3578=v3396;
const v3579=v3578["a"];
const v3580=v3396;
const v3581=v3580["b"];
const v3582=v3396;
const v3583=v3582["c"];
const v3584=v3396;
const v3585=__nfValue(v3584["value"]);
const v3586=v3538;
const v3587=v3555;
const v3588=v3396;
const v3589=__nfValue(v3588["gate_bias"]);
const v3590=v3396;
const v3591=v3590["table"];
const v3592=v3396;
const v3593=v3592["below"];
const v3594=v3396;
const v3595=v3594["above"];
v3537=({["kind"]:v3573,["binary"]:v3575,["unary"]:v3577,["a"]:v3579,["b"]:v3581,["c"]:v3583,["value"]:v3585,["terms"]:v3586,["gates"]:v3587,["gate_bias"]:v3589,["table"]:v3591,["below"]:v3593,["above"]:v3595});}else{
const v3596=v3398;
const v3597="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3598=(v3596===v3597);
let v3599;if(v3598){
let v3600;if(v3603&&v3602){v3600=v3601;}else{
const v3604=v3397;
const v3605=v3396;
const v3606=v3605["a"];
let v3607;if(v3606<v3604.length){v3607=v3604[v3606];}else{
v3607=0;}
v3600=v3607;if(v3603){v3601=v3600;v3602=true;}}
let v3608;if(v3611&&v3610){v3608=v3609;}else{
const v3612=v3397;
const v3613=v3396;
const v3614=v3613["b"];
let v3615;if(v3614<v3612.length){v3615=v3612[v3614];}else{
v3615=0;}
v3608=v3615;if(v3611){v3609=v3608;v3610=true;}}
let v3616;if(v3619&&v3618){v3616=v3617;}else{
const v3620=v3397;
const v3621=v3396;
const v3622=v3621["c"];
let v3623;if(v3622<v3620.length){v3623=v3620[v3622];}else{
v3623=0;}
v3616=v3623;if(v3619){v3617=v3616;v3618=true;}}
const v3624=v3396;
const v3625=v3624["kind"];
const v3626=v3396;
const v3627=v3626["binary"];
const v3628=v3396;
const v3629=v3628["unary"];
const v3630=v3600;
const v3631=v3608;
const v3632=v3616;
const v3633=v3396;
const v3634=__nfValue(v3633["value"]);
const v3635=v3396;
const v3636=v3635["terms"];
const v3637=v3396;
const v3638=v3637["gates"];
const v3639=v3396;
const v3640=__nfValue(v3639["gate_bias"]);
const v3641=v3396;
const v3642=v3641["table"];
const v3643=v3396;
const v3644=v3643["below"];
const v3645=v3396;
const v3646=v3645["above"];
v3599=({["kind"]:v3625,["binary"]:v3627,["unary"]:v3629,["a"]:v3630,["b"]:v3631,["c"]:v3632,["value"]:v3634,["terms"]:v3636,["gates"]:v3638,["gate_bias"]:v3640,["table"]:v3642,["below"]:v3644,["above"]:v3646});}else{
let v3647;if(v3650&&v3649){v3647=v3648;}else{
const v3651=v3397;
const v3652=v3396;
const v3653=v3652["a"];
let v3654;if(v3653<v3651.length){v3654=v3651[v3653];}else{
v3654=0;}
v3647=v3654;if(v3650){v3648=v3647;v3649=true;}}
let v3655;if(v3658&&v3657){v3655=v3656;}else{
const v3659=v3396;
const v3660=v3659["table"];
const v3661=v3660.length;
const v3662=new Array(v3661);
for(let v3663=0;v3663<v3661;v3663++){
const v3664=(v3660[v3663]>>>0);
const v3665=v3397;
const v3666=v3664;
let v3667;if(v3666<v3665.length){v3667=v3665[v3666];}else{
v3667=0;}
v3662[v3663]=v3667;
}
v3655=v3662;if(v3658){v3656=v3655;v3657=true;}}
const v3668=v3396;
const v3669=v3668["kind"];
const v3670=v3396;
const v3671=v3670["binary"];
const v3672=v3396;
const v3673=v3672["unary"];
const v3674=v3647;
const v3675=v3396;
const v3676=v3675["b"];
const v3677=v3396;
const v3678=v3677["c"];
const v3679=v3396;
const v3680=__nfValue(v3679["value"]);
const v3681=v3396;
const v3682=v3681["terms"];
const v3683=v3396;
const v3684=v3683["gates"];
const v3685=v3396;
const v3686=__nfValue(v3685["gate_bias"]);
const v3687=v3655;
const v3688=v3396;
const v3689=v3688["below"];
const v3690=v3396;
const v3691=v3690["above"];
v3599=({["kind"]:v3669,["binary"]:v3671,["unary"]:v3673,["a"]:v3674,["b"]:v3676,["c"]:v3678,["value"]:v3680,["terms"]:v3682,["gates"]:v3684,["gate_bias"]:v3686,["table"]:v3687,["below"]:v3689,["above"]:v3691});}
v3537=v3599;}
v3491=v3537;}
v3454=v3491;}
v3410=v3454;}
v3406=v3410;}
return v3406;};}
function __prepareFn37(fixed,depth=0){if(depth>=16)return __fn37;const v3697=fixed[0];let v3696=false,v3695;
return function(v3692,v3693){let v3694;if(v3697&&v3696){v3694=v3695;}else{
const v3698=v3692;
v3694=v3698["kind"];if(v3697){v3695=v3694;v3696=true;}}
const v3699=v3694;
const v3700="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3701=(v3699===v3700);
let v3702;if(v3701){
v3702=true;}else{
const v3703=v3694;
const v3704="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3705=(v3703===v3704);
let v3706;if(v3705){
const v3707=v3692;
const v3708=v3707["a"];
const v3709=v3693;
const v3710=((v3708) < (v3709));
let v3711=v3710;if(v3711){
const v3712=v3692;
const v3713=v3712["b"];
const v3714=v3693;
v3711=((v3713) < (v3714));}
v3706=v3711;}else{
const v3715=v3694;
const v3716="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3717=(v3715===v3716);
let v3718;if(v3717){
const v3719=v3692;
const v3720=v3719["a"];
const v3721=v3693;
v3718=((v3720) < (v3721));}else{
const v3722=v3694;
const v3723="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3724=(v3722===v3723);
let v3725;if(v3724){
const v3726=v3692;
const v3727=v3726["terms"];
let v3728=true;
for(let v3729=0;v3729<v3727.length;v3729++){
const v3730=v3727[v3729];
const v3731=v3728;
let v3732=v3731;if(v3732){
const v3733=v3730;
const v3734=v3733["wire"];
const v3735=v3693;
v3732=((v3734) < (v3735));}
v3728=v3732;
}
v3725=v3728;}else{
const v3736=v3694;
const v3737="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3738=(v3736===v3737);
let v3739;if(v3738){
const v3740=v3692;
const v3741=v3740["terms"];
let v3742=true;
for(let v3743=0;v3743<v3741.length;v3743++){
const v3744=v3741[v3743];
const v3745=v3742;
let v3746=v3745;if(v3746){
const v3747=v3744;
const v3748=v3747["wire"];
const v3749=v3693;
v3746=((v3748) < (v3749));}
v3742=v3746;
}
const v3750=v3742;
let v3751=v3750;if(v3751){
const v3752=v3692;
const v3753=v3752["gates"];
let v3754=true;
for(let v3755=0;v3755<v3753.length;v3755++){
const v3756=v3753[v3755];
const v3757=v3754;
let v3758=v3757;if(v3758){
const v3759=v3756;
const v3760=v3759["wire"];
const v3761=v3693;
v3758=((v3760) < (v3761));}
v3754=v3758;
}
v3751=v3754;}
v3739=v3751;}else{
const v3762=v3694;
const v3763="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3764=(v3762===v3763);
let v3765;if(v3764){
const v3766=v3692;
const v3767=v3766["a"];
const v3768=v3693;
const v3769=((v3767) < (v3768));
let v3770=v3769;if(v3770){
const v3771=v3692;
const v3772=v3771["b"];
const v3773=v3693;
v3770=((v3772) < (v3773));}
const v3774=v3770;
let v3775=v3774;if(v3775){
const v3776=v3692;
const v3777=v3776["c"];
const v3778=v3693;
v3775=((v3777) < (v3778));}
v3765=v3775;}else{
const v3779=v3692;
const v3780=v3779["a"];
const v3781=v3693;
const v3782=((v3780) < (v3781));
let v3783=v3782;if(v3783){
const v3784=v3692;
const v3785=v3784["table"];
let v3786=true;
for(let v3787=0;v3787<v3785.length;v3787++){
const v3788=(v3785[v3787]>>>0);
const v3789=v3786;
let v3790=v3789;if(v3790){
const v3791=v3788;
const v3792=v3693;
v3790=((v3791) < (v3792));}
v3786=v3790;
}
v3783=v3786;}
v3765=v3783;}
v3739=v3765;}
v3725=v3739;}
v3718=v3725;}
v3706=v3718;}
v3702=v3706;}
return v3702;};}
function __prepareFn38(fixed,depth=0){if(depth>=16)return __fn38;const v3810=fixed[0]&&fixed[1];let v3809=false,v3808;
const v3816=fixed[0]&&fixed[1];let v3815=false,v3814;
return function(v3793,v3794,v3795){const v3796=v3794;
const v3797=v3796.length;
const v3798=4294967295;
const v3799=((v3797) > (v3798));
let v3800=v3799;if(!v3800){
const v3801=(v3794).length;
const v3802=4294967295;
const v3803=v3793;
const v3804=(((v3802) - (v3803)) >>> 0);
v3800=((v3801) > (v3804));}
const v3805=v3800;
let v3806;if(v3805){
v3806=false;}else{
let v3807;if(v3810&&v3809){v3807=v3808;}else{
const v3811=v3793;
const v3812=(v3794).length;
v3807=(((v3811) + (v3812)) >>> 0);if(v3810){v3808=v3807;v3809=true;}}
let v3813;if(v3816&&v3815){v3813=v3814;}else{
const v3817=v3794;
const v3818=v3793;
const v3819=true;
let v3820=({["wire"]:v3818,["valid"]:v3819});
for(let v3821=0;v3821<v3817.length;v3821++){
const v3822=v3817[v3821];
const v3823=v3820;
const v3824=v3823["wire"];
const v3825=1;
const v3826=(((v3824) + (v3825)) >>> 0);
const v3827=v3820;
const v3828=v3827["valid"];
let v3829=v3828;if(v3829){
const v3830=v3822;
const v3831=v3820;
const v3832=v3831["wire"];
v3829=__fn37(v3830,v3832);}
const v3833=v3829;
v3820=({["wire"]:v3826,["valid"]:v3833});
}
v3813=v3820;if(v3816){v3814=v3813;v3815=true;}}
const v3834=v3813;
const v3835=v3834["valid"];
let v3836=v3835;if(v3836){
const v3837=v3795;
let v3838=true;
for(let v3839=0;v3839<v3837.length;v3839++){
const v3840=(v3837[v3839]>>>0);
const v3841=v3838;
let v3842=v3841;if(v3842){
const v3843=v3840;
const v3844=v3807;
v3842=((v3843) < (v3844));}
v3838=v3842;
}
v3836=v3838;}
v3806=v3836;}
return v3806;};}
function __prepareFn39(fixed,depth=0){if(depth>=16)return __fn39;const v3867=fixed[0]&&fixed[1]&&fixed[2];let v3866=false,v3865;
const v3877=fixed[0]&&fixed[1];let v3876=false,v3875;
const v3908=fixed[0]&&fixed[1]&&fixed[2];let v3907=false,v3906;
const v3923=fixed[0];let v3922=false,v3921;
const v3927=fixed[0];let v3926=false,v3925;
const v3967=fixed[0]&&fixed[1]&&fixed[2];let v3966=false,v3965;
const v3974=fixed[0]&&fixed[1]&&fixed[2];let v3973=false,v3972;
const v3979=fixed[0]&&fixed[1]&&fixed[2];let v3978=false,v3977;
const v3985=fixed[0];let v3984=false,v3983;
const v4021=fixed[0]&&fixed[1]&&fixed[2];let v4020=false,v4019;
return function(v3845,v3846,v3847,v3848){const v3849=v3846;
const v3850=v3849.length;
const v3851=4294967295;
const v3852=((v3850) > (v3851));
let v3853=v3852;if(!v3853){
const v3854=v3845;
const v3855=v3848;
v3853=((v3854) > (v3855));}
const v3856=v3853;
let v3857=v3856;if(!v3857){
const v3858=(v3846).length;
const v3859=v3848;
const v3860=v3845;
const v3861=(((v3859) - (v3860)) >>> 0);
v3857=((v3858) > (v3861));}
const v3862=v3857;
let v3863;if(v3862){
v3863=({Err:"graph capacity"});}else{
let v3864;if(v3867&&v3866){v3864=v3865;}else{
const v3868=v3845;
const v3869=v3846;
const v3870=v3847;
const v3871=__fn38(v3868,v3869,v3870);
const v3872=false;
v3864=(v3871===v3872);if(v3867){v3865=v3864;v3866=true;}}
let v3873;if(v3864){
v3873=({Err:"graph is not topologically ordered"});}else{
let v3874;if(v3877&&v3876){v3874=v3875;}else{
const v3878=v3845;
const v3879=(v3846).length;
v3874=(((v3878) + (v3879)) >>> 0);if(v3877){v3875=v3874;v3876=true;}}
const v3880=__bufferFill(v3874,false);
const v3882=v3847;
const v3883=v3880;
let v3884=({["live"]:v3883});
for(let v3885=0;v3885<v3882.length;v3885++){
const v3886=(v3882[v3885]>>>0);
const v3887=v3884;
const v3888=v3887["live"];
const v3889=v3888;
const v3890=v3886;
const v3891=__tempSet(v3889,v3890,true,false);
const v3892=v3891;
v3884=({["live"]:v3892});
}
const v3881=v3884;
const v3894=v3881;
const v3893=v3894["live"];
const v3896=v3846;
const v3897=v3893;
const v3898=v3874;
let v3899=({["live"]:v3897,["wire"]:v3898});
for(let v3900=v3896.length-1;v3900>=0;v3900--){
const v3901=v3896[v3900];
const v3902=v3901;
const v3903=v3899;
const v3904=v3845;
v3899=__fn36(v3902,v3903,v3904);
}
const v3895=v3899;
let v3905;if(v3908&&v3907){v3905=v3906;}else{
const v3909=v3895;
const v3910=v3909["live"];
v3905=v3910.freeze();if(v3908){v3906=v3905;v3907=true;}}
const v3911=__bufferFill(v3874,0);
const v3913=v3845;
let v3914=v3911;
for(let v3915=0;v3915<v3913;v3915++){
if(false){break;}
const v3916=(v3915>>>0);
const v3917=v3914;
const v3918=v3916;
v3914=__tempSet(v3917,v3918,v3916,false);}
const v3912=v3914;
const v3919=v3912;
let v3920;if(v3923&&v3922){v3920=v3921;}else{
v3920=v3845;if(v3923){v3921=v3920;v3922=true;}}
let v3924;if(v3927&&v3926){v3924=v3925;}else{
v3924=v3845;if(v3927){v3925=v3924;v3926=true;}}
const v3929=v3846;
const v3930=v3924;
const v3931=v3919;
const v3932=v3920;
let v3933=({["next"]:v3930,["positions"]:v3931,["wire"]:v3932});
for(let v3934=0;v3934<v3929.length;v3934++){
const v3935=v3929[v3934];
const v3936=v3933;
const v3937=v3936["next"];
const v3938=v3933;
const v3939=v3938["positions"];
const v3940=v3933;
const v3941=v3940["wire"];
const v3942=v3905;
const v3943=v3941;
let v3944;if(v3943<v3942.length){v3944=v3942[v3943];}else{
v3944=false;}
let v3945;if(v3944){
const v3946=v3939;
const v3947=v3941;
const v3948=__tempSet(v3946,v3947,v3937,false);
const v3949=v3937;
const v3950=1;
const v3951=(((v3949) + (v3950)) >>> 0);
const v3952=v3941;
const v3953=1;
const v3954=(((v3952) + (v3953)) >>> 0);
const v3955=v3951;
const v3956=v3948;
const v3957=v3954;
v3945=({["next"]:v3955,["positions"]:v3956,["wire"]:v3957});}else{
const v3958=v3941;
const v3959=1;
const v3960=(((v3958) + (v3959)) >>> 0);
const v3961=v3937;
const v3962=v3939;
const v3963=v3960;
v3945=({["next"]:v3961,["positions"]:v3962,["wire"]:v3963});}
v3933=v3945;
}
const v3928=v3933;
let v3964;if(v3967&&v3966){v3964=v3965;}else{
const v3968=v3928;
v3964=v3968["next"];if(v3967){v3965=v3964;v3966=true;}}
const v3970=v3928;
const v3969=v3970["positions"];
let v3971;if(v3974&&v3973){v3971=v3972;}else{
const v3975=v3928;
v3971=v3975["wire"];if(v3974){v3972=v3971;v3973=true;}}
let v3976;if(v3979&&v3978){v3976=v3977;}else{
const v3980=v3969;
v3976=v3980.freeze();if(v3979){v3977=v3976;v3978=true;}}
const v3981=new __InkBuffer([]);
let v3982;if(v3985&&v3984){v3982=v3983;}else{
v3982=v3845;if(v3985){v3983=v3982;v3984=true;}}
const v3987=v3846;
const v3988=v3981;
const v3989=v3982;
let v3990=({["compact"]:v3988,["wire"]:v3989});
for(let v3991=0;v3991<v3987.length;v3991++){
const v3992=v3987[v3991];
const v3993=v3990;
const v3994=v3993["compact"];
const v3995=v3990;
const v3996=v3995["wire"];
const v3997=v3905;
const v3998=v3996;
let v3999;if(v3998<v3997.length){v3999=v3997[v3998];}else{
v3999=false;}
let v4000;if(v3999){
const v4001=v3994;
const v4002=v3992;
const v4003=v3976;
const v4004=__fn35(v4002,v4003);
const v4005=__tempEdit(v4001,"push",v4004);
const v4006=v3996;
const v4007=1;
const v4008=(((v4006) + (v4007)) >>> 0);
const v4009=v4005;
const v4010=v4008;
v4000=({["compact"]:v4009,["wire"]:v4010});}else{
const v4011=v3996;
const v4012=1;
const v4013=(((v4011) + (v4012)) >>> 0);
const v4014=v3994;
const v4015=v4013;
v4000=({["compact"]:v4014,["wire"]:v4015});}
v3990=v4000;
}
const v3986=v3990;
const v4017=v3986;
const v4016=v4017["compact"];
let v4018;if(v4021&&v4020){v4018=v4019;}else{
const v4022=v3986;
v4018=v4022["wire"];if(v4021){v4019=v4018;v4020=true;}}
const v4023=v3845;
const v4024=v4016;
const v4025=v4024.freeze();
const v4026=v3847;
const v4027=v4026.length;
const v4028=new Array(v4027);
for(let v4029=0;v4029<v4027;v4029++){
const v4030=(v4026[v4029]>>>0);
const v4031=v3976;
const v4032=v4030;
let v4033;if(v4032<v4031.length){v4033=v4031[v4032];}else{
v4033=0;}
v4028[v4029]=v4033;
}
const v4034=v4028;
v3873=({Ok:({["inputs"]:v4023,["nodes"]:v4025,["roots"]:v4034})});}
v3863=v3873;}
return v3863;};}
function __prepareFn43(fixed,depth=0){if(depth>=16)return __fn43;const v4047=fixed[0];let v4046=false,v4045;
return function(v4041,v4042,v4043){let v4044;if(v4047&&v4046){v4044=v4045;}else{
v4044=v4041;if(v4047){v4045=v4044;v4046=true;}}
const v4048=v4044;
const v4049="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4050=(v4048===v4049);
let v4051;if(v4050){
const v4052=__nfValue(v4042);
const v4053=__nfValue(v4043);
v4051=Math.fround(__nfNumber(v4052) + __nfNumber(v4053));}else{
const v4054=v4044;
const v4055="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v4056=(v4054===v4055);
let v4057;if(v4056){
const v4058=__nfValue(v4042);
const v4059=__nfValue(v4043);
v4057=Math.fround(__nfNumber(v4058) - __nfNumber(v4059));}else{
const v4060=v4044;
const v4061="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v4062=(v4060===v4061);
let v4063;if(v4062){
const v4064=__nfValue(v4042);
const v4065=__nfValue(v4043);
v4063=Math.fround(__nfNumber(v4064) * __nfNumber(v4065));}else{
v4063=Math.fround((__nfNumber(__nfValue(v4042)))/(__nfNumber(__nfValue(v4043))));}
v4057=v4063;}
v4051=v4057;}
return v4051;};}
function __prepareFn45(fixed,depth=0){if(depth>=16)return __fn45;const v4078=fixed[0];let v4077=false,v4076;
let v4093;
return function(v4073,v4074){let v4075;if(v4078&&v4077){v4075=v4076;}else{
v4075=v4073;if(v4078){v4076=v4075;v4077=true;}}
const v4079=v4075;
const v4080="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4081=(v4079===v4080);
let v4082;if(v4081){
v4082=Math.fround(Math.sqrt(__nfNumber(__nfValue(v4074))));}else{
const v4083=v4075;
const v4084="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v4085=(v4083===v4084);
let v4086;if(v4085){
const v4087=__nfValue(v4074);
v4086=__nfNeg(v4087);}else{
const v4088=v4075;
const v4089="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v4090=(v4088===v4089);
let v4091;if(v4090){
const v4092=__nfValue(v4074);
if(!v4093){const v4094=__preparedFactories.get(44);v4093=v4094?v4094([fixed[1]],depth+1):__fn44;}
v4091=v4093(v4092);}else{
const v4095=__nfValue(v4074);
const v4096=__nfFromBits(0);
const v4097=((__nfNumber(v4095)) > (__nfNumber(v4096)));
let v4098;if(v4097){
v4098=__nfFromBits(1065353216);}else{
v4098=__nfFromBits(0);}
v4091=v4098;}
v4086=v4091;}
v4082=v4086;}
return v4082;};}
function __prepareFn52(fixed,depth=0){if(depth>=16)return __fn52;const v4135=fixed[0];let v4134=false,v4133;
const v4158=fixed[0]&&fixed[1];let v4157=false,v4156;
return function(v4125,v4126){const v4127=(v4126).length;
const v4128=v4125;
const v4129=v4128["inputs"];
const v4130=!(v4127===v4129);
let v4131;if(v4130){
v4131=({Err:"graph input shape"});}else{
let v4132;if(v4135&&v4134){v4132=v4133;}else{
const v4136=v4125;
const v4137=v4136["inputs"];
const v4138=v4125;
const v4139=v4138["nodes"];
const v4140=v4125;
const v4141=v4140["roots"];
const v4142=__fn38(v4137,v4139,v4141);
const v4143=false;
v4132=(v4142===v4143);if(v4135){v4133=v4132;v4134=true;}}
let v4144;if(v4132){
v4144=({Err:"invalid prepared graph"});}else{
const v4146=v4125;
const v4147=v4146["nodes"];
const v4148=new __InkBuffer(Array.from(v4126));
const v4149=true;
let v4150=({["values"]:v4148,["finite_indices"]:v4149});
for(let v4151=0;v4151<v4147.length;v4151++){
const v4152=v4147[v4151];
const v4153=v4152;
const v4154=v4150;
v4150=__fn51(v4153,v4154);
}
const v4145=v4150;
let v4155;if(v4158&&v4157){v4155=v4156;}else{
const v4159=v4145;
const v4160=v4159["values"];
v4155=v4160.freeze();if(v4158){v4156=v4155;v4157=true;}}
const v4161=v4145;
const v4162=v4161["finite_indices"];
const v4163=false;
const v4164=(v4162===v4163);
let v4165;if(v4164){
v4165=({Err:"nonfinite graph index"});}else{
const v4166=v4155;
const v4167=v4125;
const v4168=v4167["roots"];
const v4169=v4168.length;
const v4170=new Array(v4169);
for(let v4171=0;v4171<v4169;v4171++){
const v4172=(v4168[v4171]>>>0);
const v4173=v4155;
const v4174=v4172;
let v4175;if(v4174<v4173.length){v4175=v4173[v4174];}else{
v4175=__nfFromBits(0);}
v4170[v4171]=__nfValue(v4175);
}
const v4176=v4170;
v4165=({Ok:({["values"]:v4166,["outputs"]:v4176})});}
v4144=v4165;}
v4131=v4144;}
return v4131;};}
function __prepareFn53(fixed,depth=0){if(depth>=16)return __fn53;let v4181;
return function(v4177,v4178){const v4179=v4177;
const v4180=v4178;
if(!v4181){const v4182=__preparedFactories.get(52);v4181=v4182?v4182([fixed[0],fixed[1]],depth+1):__fn52;}
const v4183=v4181(v4179,v4180);
const v4185=v4183;
let v4186;if(Object.hasOwn(v4185,"Ok")){
const v4187=v4185["Ok"];
const v4188=v4187;
v4186=({Ok:v4188["outputs"]});}else{v4186=({Err:v4185.Err});}
return v4186;};}
function __prepareFn56(fixed,depth=0){if(depth>=16)return __fn56;const v4194=fixed[0];let v4193=false,v4192;
return function(v4189,v4190){let v4191;if(v4194&&v4193){v4191=v4192;}else{
v4191=v4189;if(v4194){v4192=v4191;v4193=true;}}
const v4195=v4191;
const v4196="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4197=(v4195===v4196);
let v4198;if(v4197){
v4198=true;}else{
const v4199=v4191;
const v4200="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v4201=(v4199===v4200);
let v4202;if(v4201){
v4202=true;}else{
const v4203=v4191;
const v4204="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v4205=(v4203===v4204);
let v4206;if(v4205){
const v4207=v4190;
v4206=v4207["piecewise"];}else{
const v4208=v4190;
const v4209=v4208["boolean"];
const v4210="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v4206=!(v4209===v4210);}
v4202=v4206;}
v4198=v4202;}
return v4198;};}
function __prepareFn57(fixed,depth=0){if(depth>=16)return __fn57;const v4216=fixed[0];let v4215=false,v4214;
let v4233;
return function(v4211,v4212){let v4213;if(v4216&&v4215){v4213=v4214;}else{
const v4217=v4211;
v4213=v4217["kind"];if(v4216){v4214=v4213;v4215=true;}}
const v4218=v4213;
const v4219="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v4220=(v4218===v4219);
let v4221;if(v4220){
v4221=true;}else{
const v4222=v4213;
const v4223="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4224=(v4222===v4223);
let v4225;if(v4224){
v4225=true;}else{
const v4226=v4213;
const v4227="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4228=(v4226===v4227);
let v4229;if(v4228){
const v4230=v4211;
const v4231=v4230["unary"];
const v4232=v4212;
if(!v4233){const v4234=__preparedFactories.get(56);v4233=v4234?v4234([fixed[0],fixed[1]],depth+1):__fn56;}
v4229=v4233(v4231,v4232);}else{
const v4235=v4213;
const v4236="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v4237=(v4235===v4236);
let v4238;if(v4237){
v4238=true;}else{
const v4239=v4213;
const v4240="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v4241=(v4239===v4240);
let v4242;if(v4241){
const v4243=v4212;
v4242=v4243["piecewise"];}else{
const v4244=v4213;
const v4245="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v4246=(v4244===v4245);
let v4247;if(v4246){
const v4248=v4212;
v4247=v4248["piecewise"];}else{
const v4249=v4212;
const v4250=v4249["index"];
const v4251="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v4247=!(v4250===v4251);}
v4242=v4247;}
v4238=v4242;}
v4229=v4238;}
v4225=v4229;}
v4221=v4225;}
return v4221;};}
function __prepareFn63(fixed,depth=0){if(depth>=16)return __fn63;const v4259=fixed[0]&&fixed[1]&&fixed[2];let v4258=false,v4257;
let v4286;
return function(v4252,v4253,v4254,v4255){let v4256;if(v4259&&v4258){v4256=v4257;}else{
const v4260=(v4253).length;
const v4261=v4252;
const v4262=v4261["inputs"];
const v4263=v4252;
const v4264=(v4263["nodes"]).length;
const v4265=(((v4262) + (v4264)) >>> 0);
const v4266=!(v4260===v4265);
let v4267=v4266;if(!v4267){
const v4268=(v4254).length;
const v4269=v4252;
const v4270=(v4269["roots"]).length;
v4267=!(v4268===v4270);}
const v4271=v4267;
let v4272=v4271;if(!v4272){
const v4273=v4252;
const v4274=v4273["inputs"];
const v4275=v4252;
const v4276=v4275["nodes"];
const v4277=v4252;
const v4278=v4277["roots"];
const v4279=__fn38(v4274,v4276,v4278);
const v4280=false;
v4272=(v4279===v4280);}
v4256=v4272;if(v4259){v4257=v4256;v4258=true;}}
let v4281;if(v4256){
v4281=({Err:"cotangent shape"});}else{
const v4282=v4252;
const v4283=v4253;
const v4284=v4254;
const v4285=v4255;
if(!v4286){const v4287=__preparedFactories.get(64);v4286=v4287?v4287([fixed[0],fixed[1],fixed[2],fixed[3]],depth+1):__fn64;}
v4281=v4286(v4282,v4283,v4284,v4285);}
return v4281;};}
function __prepareFn64(fixed,depth=0){if(depth>=16)return __fn64;const v4295=fixed[0]&&fixed[3];let v4294=false,v4293;
const v4313=true;let v4312=false,v4311;
const v4343=fixed[0]&&fixed[1]&&fixed[2];let v4342=false,v4341;
return function(v4288,v4289,v4290,v4291){let v4292;if(v4295&&v4294){v4292=v4293;}else{
const v4296=v4288;
const v4297=v4296["nodes"];
let v4298=true;
for(let v4299=0;v4299<v4297.length;v4299++){
const v4300=v4297[v4299];
const v4301=v4298;
let v4302=v4301;if(v4302){
const v4303=v4300;
const v4304=v4291;
v4302=__fn57(v4303,v4304);}
v4298=v4302;
}
v4292=v4298;if(v4295){v4293=v4292;v4294=true;}}
const v4305=v4292;
const v4306=false;
const v4307=(v4305===v4306);
let v4308;if(v4307){
v4308=({Err:"explicit gradient policy required"});}else{
const v4309=__bufferFill((v4289).length,__nfFromBits(0));
let v4310;if(v4313&&v4312){v4310=v4311;}else{
v4310=0;if(v4313){v4311=v4310;v4312=true;}}
const v4315=v4290;
const v4316=v4309;
const v4317=v4310;
let v4318=({["g"]:v4316,["i"]:v4317});
for(let v4319=0;v4319<v4315.length;v4319++){
const v4320=v4315[v4319];
const v4321=v4318;
const v4322=v4321["g"];
const v4323=v4318;
const v4324=v4323["i"];
const v4325=v4322;
const v4326=v4288;
const v4327=v4326["roots"];
const v4328=v4324;
let v4329;if(v4328<v4327.length){v4329=v4327[v4328];}else{
v4329=0;}
const v4330=v4329;
const v4331=__nfValue(v4320);
const v4332=__fn54(v4325,v4330,v4331);
const v4333=v4324;
const v4334=1;
const v4335=(((v4333) + (v4334)) >>> 0);
const v4336=v4332;
const v4337=v4335;
v4318=({["g"]:v4336,["i"]:v4337});
}
const v4314=v4318;
const v4339=v4314;
const v4338=v4339["g"];
let v4340;if(v4343&&v4342){v4340=v4341;}else{
const v4344=v4314;
v4340=v4344["i"];if(v4343){v4341=v4340;v4342=true;}}
const v4346=v4288;
const v4347=v4346["nodes"];
const v4348=v4338;
const v4349=(v4289).length;
let v4350=({["gradient"]:v4348,["wire"]:v4349});
for(let v4351=v4347.length-1;v4351>=0;v4351--){
const v4352=v4347[v4351];
const v4353=v4352;
const v4354=v4350;
const v4355=v4289;
const v4356=v4291;
v4350=__fn62(v4353,v4354,v4355,v4356);
}
const v4345=v4350;
const v4357=v4345;
const v4358=v4357["gradient"];
const v4359=v4358.freeze();
const v4360=v4288;
v4308=({Ok:v4359.slice(0,v4360["inputs"])});}
return v4308;};}
function __prepareFn65(fixed,depth=0){if(depth>=16)return __fn65;let v4372;
return function(v4361,v4362,v4363,v4364){const v4365=(v4363).length;
const v4366=v4361;
const v4367=(v4366["roots"]).length;
const v4368=!(v4365===v4367);
let v4369;if(v4368){
v4369=({Err:"cotangent shape"});}else{
const v4370=v4361;
const v4371=v4362;
if(!v4372){const v4373=__preparedFactories.get(52);v4372=v4373?v4373([fixed[0],fixed[1]],depth+1):__fn52;}
const v4374=v4372(v4370,v4371);
const v4376=v4374;
let v4377;if(Object.hasOwn(v4376,"Ok")){
const v4378=v4376["Ok"];
const v4379=v4378;
const v4380=v4361;
const v4381=v4379;
const v4382=v4381["values"];
const v4383=v4363;
const v4384=v4364;
const v4385=__fn64(v4380,v4382,v4383,v4384);
let v4386;if(Object.hasOwn(v4385,"Ok")){
const v4387=v4385["Ok"];
const v4388=v4387;
const v4389=v4379;
const v4390=v4389["outputs"];
const v4391=v4388;
v4386=({Ok:({["outputs"]:v4390,["gradient"]:v4391})});}else{
const v4392=v4385["Err"];
v4386=({Err:v4392});}
v4377=v4386;}else{
const v4393=v4376["Err"];
v4377=({Err:v4393});}
v4369=v4377;}
return v4369;};}
function __prepareFn66(fixed,depth=0){if(depth>=16)return __fn66;let v4409;
return function(v4394,v4395,v4396,v4397){const v4398=(v4396).length;
const v4399=0;
const v4400=(v4398===v4399);
let v4401=v4400;if(!v4401){
const v4402=(v4396).length;
const v4403=v4394;
const v4404=(v4403["roots"]).length;
v4401=!(v4402===v4404);}
const v4405=v4401;
let v4406;if(v4405){
v4406=({Err:"target shape"});}else{
const v4407=v4394;
const v4408=v4395;
if(!v4409){const v4410=__preparedFactories.get(52);v4409=v4410?v4410([fixed[0],fixed[1]],depth+1):__fn52;}
const v4411=v4409(v4407,v4408);
const v4413=v4411;
let v4414;if(Object.hasOwn(v4413,"Ok")){
const v4415=v4413["Ok"];
const v4416=v4415;
const v4417=v4416;
const v4418=v4417["outputs"];
const v4419=v4396;
const v4420=Math.min(v4418.length,v4419.length);
const v4421=new Array(v4420);
for(let v4422=0;v4422<v4420;v4422++){
const v4423=v4418[v4422];
const v4424=v4419[v4422];
const v4425=__nfValue(v4423);
const v4426=__nfValue(v4424);
v4421[v4422]=Math.fround(__nfNumber(v4425) - __nfNumber(v4426));
}
const v4427=v4421;
const v4428=Math.fround((v4396).length);
const v4429=v4427;
const v4430=v4429.length;
const v4431=new Array(v4430);
for(let v4432=0;v4432<v4430;v4432++){
const v4433=v4429[v4432];
const v4434=__nfValue(v4433);
const v4435=__nfValue(v4433);
v4431[v4432]=Math.fround(__nfNumber(v4434) * __nfNumber(v4435));
}
const v4436=v4431;
let v4437=0;for(let v4438=0;v4438<v4436.length;v4438++){
const v4439=v4436[v4438];
v4437=Math.fround(__nfNumber(v4437) + __nfNumber(v4439));}
const v4440=Math.fround((__nfNumber(v4437))/(__nfNumber(__nfValue(v4428))));
const v4441=Number.isFinite(__nfNumber(v4440));
const v4442=false;
let v4443;if((v4441===v4442)){
v4443=({Err:"nonfinite loss"});}else{
const v4444=v4427;
const v4445=v4444.length;
const v4446=new Array(v4445);
for(let v4447=0;v4447<v4445;v4447++){
const v4448=v4444[v4447];
const v4449=__nfFromBits(1073741824);
const v4450=__nfValue(v4448);
v4446[v4447]=Math.fround((__nfNumber(Math.fround(v4449 * __nfNumber(v4450))))/(__nfNumber(__nfValue(v4428))));
}
const v4451=v4446;
const v4452=v4394;
const v4453=v4416;
const v4454=v4453["values"];
const v4455=v4451;
const v4456=v4397;
const v4457=__fn64(v4452,v4454,v4455,v4456);
let v4458;if(Object.hasOwn(v4457,"Ok")){
const v4459=v4457["Ok"];
const v4460=v4459;
const v4461=v4440;
const v4462=v4416;
const v4463=v4462["outputs"];
const v4464=v4460;
v4458=({Ok:({["loss"]:v4461,["outputs"]:v4463,["gradient"]:v4464})});}else{
const v4465=v4457["Err"];
v4458=({Err:v4465});}
v4443=v4458;}
v4414=v4443;}else{
const v4466=v4413["Err"];
v4414=({Err:v4466});}
v4406=v4414;}
return v4406;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[9,__prepareFn9],[12,__prepareFn12],[13,__prepareFn13],[14,__prepareFn14],[16,__prepareFn16],[17,__prepareFn17],[18,__prepareFn18],[19,__prepareFn19],[20,__prepareFn20],[21,__prepareFn21],[22,__prepareFn22],[23,__prepareFn23],[24,__prepareFn24],[25,__prepareFn25],[26,__prepareFn26],[27,__prepareFn27],[28,__prepareFn28],[29,__prepareFn29],[30,__prepareFn30],[34,__prepareFn34],[35,__prepareFn35],[37,__prepareFn37],[38,__prepareFn38],[39,__prepareFn39],[43,__prepareFn43],[45,__prepareFn45],[52,__prepareFn52],[53,__prepareFn53],[56,__prepareFn56],[57,__prepareFn57],[63,__prepareFn63],[64,__prepareFn64],[65,__prepareFn65],[66,__prepareFn66]]);

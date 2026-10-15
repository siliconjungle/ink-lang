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
return __fn11(v0,v3,v4,v5);}
function __fn1(){
const v6=__fn0();
let v7;if(Object.hasOwn(v6,"Ok")){
const v8=v6["Ok"];
const v9=v8;
const v10=v9;
v7=({Ok:__fn12(v10)});}else{
const v11=v6["Err"];
v7=({Err:v11});}
return v7;}
function __fn2(v12,v13,v14){
const v15=__fn0();
let v16;if(Object.hasOwn(v15,"Ok")){
const v17=v15["Ok"];
const v18=v17;
const v19=v18;
const v20=v12;
const v21=v13;
const v22=v14;
v16=__fn16(v19,v20,v21,v22);}else{
const v23=v15["Err"];
v16=({Err:v23});}
return v16;}
function __fn3(v24,v25,v26,v27){
const v28=v24;
const v29=v25;
const v30=v26;
const v31=v27;
return __fn16(v28,v29,v30,v31);}
function __fn4(v32,v33,v34){
const v35=v32;
const v36=v33;
const v37=v34;
return __fn15(v35,v36,v37);}
function __fn5(v38,v39,v40,v41){
const v42=v38;
const v43=v42["valid"];
const v44=false;
const v45=(v43===v44);
let v46=v45;if(!v46){
const v47=v38;
const v48=v47["parameters"];
const v49=v41;
v46=((v48) > (v49));}
const v50=v46;
let v51=v50;if(!v51){
const v52=v38;
const v53=v52["nodes"];
const v54=v41;
v51=((v53) > (v54));}
const v55=v51;
let v56=v55;if(!v56){
const v57=v38;
const v58=v57["width"];
const v59=v41;
v56=((v58) > (v59));}
const v60=v56;
let v61=v60;if(!v61){
const v62=v39;
const v63=v41;
v61=((v62) > (v63));}
let v64;if(v61){
const v65=false;
const v66=v38;
const v67=v66["parameters"];
const v68=v38;
const v69=v68["nodes"];
const v70=v38;
const v71=v70["width"];
const v72=v65;
v64=({["parameters"]:v67,["nodes"]:v69,["width"]:v71,["valid"]:v72});}else{
let v73;if(v40){
v73=2;}else{
v73=1;}
const v74=v73;
const v75=v38;
const v76=v75["width"];
const v77=1;
const v78=(((v76) + (v77)) >>> 0);
const v79=v74;
const v80=(Math.imul(v78,v79) >>> 0);
const v81=v38;
const v82=v81["width"];
const v83=v74;
const v84=(Math.imul(v82,v83) >>> 0);
const v85=1;
const v86=(((v84) + (v85)) >>> 0);
const v87=v39;
const v88=v41;
const v89=v38;
const v90=v89["parameters"];
const v91=(((v88) - (v90)) >>> 0);
const v92=v80;
let v93;if(v92===0 ){
v93=0;}else{
v93=(Math.trunc(v91/v92)+0);}
const v94=v93;
const v95=((v87) <= (v94));
let v96=v95;if(v96){
const v97=v86;
const v98=0;
const v99=(v97===v98);
let v100=v99;if(!v100){
const v101=v39;
const v102=v41;
const v103=v38;
const v104=v103["nodes"];
const v105=(((v102) - (v104)) >>> 0);
const v106=v86;
let v107;if(v106===0 ){
v107=0;}else{
v107=(Math.trunc(v105/v106)+0);}
const v108=v107;
v100=((v101) <= (v108));}
v96=v100;}
const v109=v96;
let v110;if(v109){
const v111=v38;
const v112=v111["parameters"];
const v113=v80;
const v114=v39;
const v115=(Math.imul(v113,v114) >>> 0);
const v116=(((v112) + (v115)) >>> 0);
const v117=v38;
const v118=v117["nodes"];
const v119=v86;
const v120=v39;
const v121=(Math.imul(v119,v120) >>> 0);
const v122=(((v118) + (v121)) >>> 0);
const v123=v39;
const v124=true;
v110=({["parameters"]:v116,["nodes"]:v122,["width"]:v123,["valid"]:v124});}else{
const v125=false;
const v126=v38;
const v127=v126["parameters"];
const v128=v38;
const v129=v128["nodes"];
const v130=v38;
const v131=v130["width"];
const v132=v125;
v110=({["parameters"]:v127,["nodes"]:v129,["width"]:v131,["valid"]:v132});}
v64=v110;}
return v64;}
function __fn6(v133,v134,v135,v136){
const v137=v136;
const v138=(v134).length;
const v139=(((v137) + (v138)) >>> 0);
const v140=v133;
const v141=v139;
const v142=__nfFromBits(1065353216);
const v143=({["wire"]:v141,["coefficient"]:v142});
const v144=new __InkBuffer(Array.from([v143]));
const v145=v136;
const v146=v134;
const v147=v140;
const v148=v145;
const v149=v144;
let v150=({["nodes"]:v147,["parameter"]:v148,["terms"]:v149});
for(let v151=0;v151<v146.length;v151++){
const v152=(v146[v151]>>>0);
const v153=v150;
const v154=v153["nodes"];
const v155=v150;
const v156=v155["parameter"];
const v157=v150;
const v158=v157["terms"];
const v159=v135;
const v160=v154;
const v161=(v160).length;
const v162=(((v159) + (v161)) >>> 0);
const v163=v154;
const v164=v156;
const v165=v152;
const v166=__fn23(v164,v165);
const v167=__tempEdit(v163,"push",v166);
const v168=v158;
const v169=v162;
const v170=__nfFromBits(1065353216);
const v171=({["wire"]:v169,["coefficient"]:v170});
const v172=__tempEdit(v168,"push",v171);
const v173=v156;
const v174=1;
const v175=(((v173) + (v174)) >>> 0);
const v176=v167;
const v177=v175;
const v178=v172;
v150=({["nodes"]:v176,["parameter"]:v177,["terms"]:v178});
}
const v179=v150;
const v180=v179;
const v181=v180["nodes"];
const v182=v179;
const v183=v182["parameter"];
const v184=v179;
const v185=v184["terms"];
const v186=v181;
const v187=v185;
const v188=v187.freeze();
const v189=v139;
const v190=1;
const v191=(((v189) + (v190)) >>> 0);
return ({["nodes"]:v186,["terms"]:v188,["parameter"]:v191});}
function __fn7(v192,v193){
const v194=v192;
const v195=v194["nodes"];
const v196=v193;
const v197=v192;
const v198=v197["inputs"];
const v199=v192;
const v200=v199["parameter"];
const v201=__fn6(v195,v196,v198,v200);
const v202=v201;
const v203=v202["nodes"];
const v204=v193;
const v205=v192;
const v206=v205["inputs"];
const v207=v201;
const v208=v207["parameter"];
const v209=__fn6(v203,v204,v206,v208);
const v210=v192;
const v211=v210["inputs"];
const v212=v209;
const v213=v212["nodes"];
const v214=(v213).length;
const v215=(((v211) + (v214)) >>> 0);
const v216=v209;
const v217=v216["nodes"];
const v218=v201;
const v219=v218["terms"];
const v220=__nfFromBits(0);
const v221=v209;
const v222=v221["terms"];
const v223=__nfFromBits(0);
const v224=__fn30(v219,v220,v222,v223);
const v225=__tempEdit(v217,"push",v224);
const v226=v225;
const v227=v192;
const v228=v227["outputs"];
const v229=v215;
const v230=__tempEdit(v228,"push",v229);
const v231=v209;
const v232=v231["parameter"];
const v233=v192;
const v234=v233["inputs"];
return ({["nodes"]:v226,["outputs"]:v230,["parameter"]:v232,["inputs"]:v234});}
function __fn8(v235,v236){
const v237=v235;
const v238=v237["nodes"];
const v239=v236;
const v240=v235;
const v241=v240["inputs"];
const v242=v235;
const v243=v242["parameter"];
const v244=__fn6(v238,v239,v241,v243);
const v245=v235;
const v246=v245["inputs"];
const v247=v244;
const v248=v247["nodes"];
const v249=(v248).length;
const v250=(((v246) + (v249)) >>> 0);
const v251=v244;
const v252=v251["nodes"];
const v253=v244;
const v254=v253["terms"];
const v255=__nfFromBits(0);
const v256=__fn29(v254,v255);
const v257=__tempEdit(v252,"push",v256);
const v258=v257;
const v259=v235;
const v260=v259["outputs"];
const v261=v250;
const v262=__tempEdit(v260,"push",v261);
const v263=v244;
const v264=v263["parameter"];
const v265=v235;
const v266=v265["inputs"];
return ({["nodes"]:v258,["outputs"]:v262,["parameter"]:v264,["inputs"]:v266});}
function __fn9(v267,v268,v269){
const v270=v268;
let v271=v267;
for(let v272=0;v272<v270;v272++){
if(false){break;}
const v273=(v272>>>0);
const v274=v271;
const v275=v269;
v271=__fn7(v274,v275);}
return v271;}
function __fn10(v276,v277,v278){
const v279=v277;
let v280=v276;
for(let v281=0;v281<v279;v281++){
if(false){break;}
const v282=(v281>>>0);
const v283=v280;
const v284=v278;
v280=__fn8(v283,v284);}
return v280;}
function __fn11(v285,v286,v287,v288){
const v289=v288;
const v290=1000000;
const v291=((v289) > (v290));
let v292=v291;if(!v292){
const v293=v285;
const v294=v288;
v292=((v293) > (v294));}
let v295;if(v292){
v295=({Err:"network capacity"});}else{
const v296=0;
const v297=0;
const v298=v285;
const v299=true;
const v301=v286;
const v302=({["parameters"]:v296,["nodes"]:v297,["width"]:v298,["valid"]:v299});
let v303=({["shape"]:v302});
for(let v304=0;v304<v301.length;v304++){
const v305=(v301[v304]>>>0);
const v306=v303;
const v307=v306["shape"];
const v308=v307;
const v309=v305;
const v310=true;
const v311=v288;
const v312=__fn5(v308,v309,v310,v311);
const v313=v312;
v303=({["shape"]:v313});
}
const v314=v303;
const v315=v314;
const v316=v315["shape"];
const v317=v316;
const v318=v287;
const v319=false;
const v320=v288;
const v321=__fn5(v317,v318,v319,v320);
const v322=v321;
const v323=v322["valid"];
const v324=false;
const v325=(v323===v324);
let v326=v325;if(!v326){
const v327=v285;
const v328=v288;
const v329=v321;
const v330=v329["parameters"];
const v331=(((v328) - (v330)) >>> 0);
v326=((v327) > (v331));}
const v332=v326;
let v333=v332;if(!v333){
const v334=v321;
const v335=v334["nodes"];
const v336=v288;
const v337=v321;
const v338=v337["parameters"];
const v339=(((v336) - (v338)) >>> 0);
const v340=v285;
const v341=(((v339) - (v340)) >>> 0);
v333=((v335) > (v341));}
let v342;if(v333){
v342=({Err:"network capacity"});}else{
const v343=v321;
const v344=v343["parameters"];
const v345=v285;
const v346=(((v344) + (v345)) >>> 0);
const v347=new __InkBuffer([]);
const v348=v285;
let v349=v347;
for(let v350=0;v350<v348;v350++){
if(false){break;}
const v351=(v350>>>0);
const v352=v349;
const v353=v321;
const v354=v353["parameters"];
const v355=v351;
const v356=(((v354) + (v355)) >>> 0);
v349=__tempEdit(v352,"push",v356);}
const v357=v349;
const v358=v357.freeze();
const v359=v358;
const v360=new __InkBuffer([]);
const v361=new __InkBuffer([]);
const v362=0;
const v363=v346;
const v364=({["nodes"]:v360,["outputs"]:v361,["parameter"]:v362,["inputs"]:v363});
const v365=v286;
const v366=v364;
const v367=v359;
let v368=({["layer"]:v366,["wires"]:v367});
for(let v369=0;v369<v365.length;v369++){
const v370=(v365[v369]>>>0);
const v371=v368;
const v372=v371["layer"];
const v373=v368;
const v374=v373["wires"];
const v375=v372;
const v376=v370;
const v377=v374;
const v378=__fn9(v375,v376,v377);
const v379=v378;
const v380=v379["outputs"];
const v381=v380.freeze();
const v382=v378;
const v383=v382["nodes"];
const v384=new __InkBuffer([]);
const v385=v378;
const v386=v385["parameter"];
const v387=v346;
const v388=({["nodes"]:v383,["outputs"]:v384,["parameter"]:v386,["inputs"]:v387});
const v389=v388;
const v390=v381;
v368=({["layer"]:v389,["wires"]:v390});
}
const v391=v368;
const v392=v391;
const v393=v392["layer"];
const v394=v391;
const v395=v394["wires"];
const v396=v393;
const v397=v287;
const v398=v395;
const v399=__fn10(v396,v397,v398);
const v400=v399;
const v401=v400["nodes"];
const v402=v401.freeze();
const v403=v399;
const v404=v403["outputs"];
const v405=v404.freeze();
const v406=v399;
const v407=v406["parameter"];
const v408=v321;
const v409=v408["parameters"];
let v410;if(!(v407===v409)){
v410=({Err:"network parameter layout"});}else{
const v411=v346;
const v412=v402;
const v413=v405;
const v414=v288;
const v415=__fn41(v411,v412,v413,v414);
let v416;if(Object.hasOwn(v415,"Ok")){
const v417=v415["Ok"];
const v418=v417;
const v419=v418;
const v420=v321;
const v421=v420["parameters"];
const v422=v285;
const v423=v287;
v416=({Ok:({["graph"]:v419,["parameters"]:v421,["features"]:v422,["outputs"]:v423})});}else{
const v424=v415["Err"];
v416=({Err:v424});}
v410=v416;}
v342=v410;}
v295=v342;}
return v295;}
function __fn12(v425){
const v426=v425;
return v426["parameters"];}
function __fn13(v427){
const v428=v427;
return v428["features"];}
function __fn14(v429){
const v430=v429;
const v431=v430["graph"];
return __fn42(v431);}
function __fn15(v432,v433,v434){
const v435=(v433).length;
const v436=v432;
const v437=v436["parameters"];
const v438=!(v435===v437);
let v439=v438;if(!v439){
const v440=(v434).length;
const v441=v432;
const v442=v441["features"];
v439=!(v440===v442);}
let v443;if(v439){
v443=({Err:"network input shape"});}else{
const v444=v432;
const v445=v444["graph"];
const v446=v433;
const v447=v434;
const v448=v446.length;
const v449=v447.length;
const v450=new Array(v448+v449);
for(let v451=0;v451<v448;v451++){v450[v451]=v446[v451];}
for(let v452=0;v452<v449;v452++){v450[v448+v452]=v447[v452];}
const v453=v450;
v443=__fn55(v445,v453);}
return v443;}
function __fn16(v454,v455,v456,v457){
const v458=(v455).length;
const v459=v454;
const v460=v459["parameters"];
const v461=!(v458===v460);
let v462=v461;if(!v462){
const v463=(v456).length;
const v464=v454;
const v465=v464["features"];
v462=!(v463===v465);}
let v466;if(v462){
v466=({Err:"network input shape"});}else{
const v467=v454;
const v468=v467["graph"];
const v469=v455;
const v470=v456;
const v471=v469.length;
const v472=v470.length;
const v473=new Array(v471+v472);
for(let v474=0;v474<v471;v474++){v473[v474]=v469[v474];}
for(let v475=0;v475<v472;v475++){v473[v471+v475]=v470[v475];}
const v476=v473;
const v477=v457;
const v478=__fn35();
const v479=__fn68(v468,v476,v477,v478);
let v480;if(Object.hasOwn(v479,"Ok")){
const v481=v479["Ok"];
const v482=v481;
const v483=v482;
const v484=__nfValue(v483["loss"]);
const v485=v482;
const v486=v485["outputs"];
const v487=v482;
const v488=v487["gradient"];
const v489=v454;
const v490=v488.slice(0,v489["parameters"]);
v480=({Ok:({["loss"]:v484,["outputs"]:v486,["gradient"]:v490})});}else{
const v491=v479["Err"];
v480=({Err:v491});}
v466=v480;}
return v466;}
function __fn17(v492,v493,v494){
const v495=v492;
const v496="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v497="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v498=v493;
const v499=v494;
const v500=0;
const v501=__nfFromBits(0);
const v502=[];
const v503=[];
const v504=__nfFromBits(0);
const v505=[];
const v506=false;
const v507=false;
return ({["kind"]:v495,["binary"]:v496,["unary"]:v497,["a"]:v498,["b"]:v499,["c"]:v500,["value"]:v501,["terms"]:v502,["gates"]:v503,["gate_bias"]:v504,["table"]:v505,["below"]:v506,["above"]:v507});}
function __fn18(v508){
const v509="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v510=0;
const v511=0;
const v512=__fn17(v509,v510,v511);
const v513=__nfValue(v508);
const v514=v512;
const v515=v514["kind"];
const v516=v512;
const v517=v516["binary"];
const v518=v512;
const v519=v518["unary"];
const v520=v512;
const v521=v520["a"];
const v522=v512;
const v523=v522["b"];
const v524=v512;
const v525=v524["c"];
const v526=__nfValue(v513);
const v527=v512;
const v528=v527["terms"];
const v529=v512;
const v530=v529["gates"];
const v531=v512;
const v532=__nfValue(v531["gate_bias"]);
const v533=v512;
const v534=v533["table"];
const v535=v512;
const v536=v535["below"];
const v537=v512;
const v538=v537["above"];
return ({["kind"]:v515,["binary"]:v517,["unary"]:v519,["a"]:v521,["b"]:v523,["c"]:v525,["value"]:v526,["terms"]:v528,["gates"]:v530,["gate_bias"]:v532,["table"]:v534,["below"]:v536,["above"]:v538});}
function __fn19(v539,v540,v541){
const v542="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v543=v540;
const v544=v541;
const v545=__fn17(v542,v543,v544);
const v546=v539;
const v547=v545;
const v548=v547["kind"];
const v549=v546;
const v550=v545;
const v551=v550["unary"];
const v552=v545;
const v553=v552["a"];
const v554=v545;
const v555=v554["b"];
const v556=v545;
const v557=v556["c"];
const v558=v545;
const v559=__nfValue(v558["value"]);
const v560=v545;
const v561=v560["terms"];
const v562=v545;
const v563=v562["gates"];
const v564=v545;
const v565=__nfValue(v564["gate_bias"]);
const v566=v545;
const v567=v566["table"];
const v568=v545;
const v569=v568["below"];
const v570=v545;
const v571=v570["above"];
return ({["kind"]:v548,["binary"]:v549,["unary"]:v551,["a"]:v553,["b"]:v555,["c"]:v557,["value"]:v559,["terms"]:v561,["gates"]:v563,["gate_bias"]:v565,["table"]:v567,["below"]:v569,["above"]:v571});}
function __fn20(v572,v573){
const v574="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v575=v573;
const v576=0;
const v577=__fn17(v574,v575,v576);
const v578=v572;
const v579=v577;
const v580=v579["kind"];
const v581=v577;
const v582=v581["binary"];
const v583=v578;
const v584=v577;
const v585=v584["a"];
const v586=v577;
const v587=v586["b"];
const v588=v577;
const v589=v588["c"];
const v590=v577;
const v591=__nfValue(v590["value"]);
const v592=v577;
const v593=v592["terms"];
const v594=v577;
const v595=v594["gates"];
const v596=v577;
const v597=__nfValue(v596["gate_bias"]);
const v598=v577;
const v599=v598["table"];
const v600=v577;
const v601=v600["below"];
const v602=v577;
const v603=v602["above"];
return ({["kind"]:v580,["binary"]:v582,["unary"]:v583,["a"]:v585,["b"]:v587,["c"]:v589,["value"]:v591,["terms"]:v593,["gates"]:v595,["gate_bias"]:v597,["table"]:v599,["below"]:v601,["above"]:v603});}
function __fn21(v604,v605){
const v606="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v607=v604;
const v608=v605;
return __fn19(v606,v607,v608);}
function __fn22(v609,v610){
const v611="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v612=v609;
const v613=v610;
return __fn19(v611,v612,v613);}
function __fn23(v614,v615){
const v616="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v617=v614;
const v618=v615;
return __fn19(v616,v617,v618);}
function __fn24(v619,v620){
const v621="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide";
const v622=v619;
const v623=v620;
return __fn19(v621,v622,v623);}
function __fn25(v624){
const v625="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v626=v624;
return __fn20(v625,v626);}
function __fn26(v627){
const v628="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v629=v627;
return __fn20(v628,v629);}
function __fn27(v630){
const v631="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v632=v630;
return __fn20(v631,v632);}
function __fn28(v633){
const v634="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step";
const v635=v633;
return __fn20(v634,v635);}
function __fn29(v636,v637){
const v638="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v639=0;
const v640=0;
const v641=__fn17(v638,v639,v640);
const v642=v636;
const v643=__nfValue(v637);
const v644=v641;
const v645=v644["kind"];
const v646=v641;
const v647=v646["binary"];
const v648=v641;
const v649=v648["unary"];
const v650=v641;
const v651=v650["a"];
const v652=v641;
const v653=v652["b"];
const v654=v641;
const v655=v654["c"];
const v656=__nfValue(v643);
const v657=v642;
const v658=v641;
const v659=v658["gates"];
const v660=v641;
const v661=__nfValue(v660["gate_bias"]);
const v662=v641;
const v663=v662["table"];
const v664=v641;
const v665=v664["below"];
const v666=v641;
const v667=v666["above"];
return ({["kind"]:v645,["binary"]:v647,["unary"]:v649,["a"]:v651,["b"]:v653,["c"]:v655,["value"]:v656,["terms"]:v657,["gates"]:v659,["gate_bias"]:v661,["table"]:v663,["below"]:v665,["above"]:v667});}
function __fn30(v668,v669,v670,v671){
const v672="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v673=0;
const v674=0;
const v675=__fn17(v672,v673,v674);
const v676=v668;
const v677=__nfValue(v669);
const v678=v670;
const v679=__nfValue(v671);
const v680=v675;
const v681=v680["kind"];
const v682=v675;
const v683=v682["binary"];
const v684=v675;
const v685=v684["unary"];
const v686=v675;
const v687=v686["a"];
const v688=v675;
const v689=v688["b"];
const v690=v675;
const v691=v690["c"];
const v692=__nfValue(v677);
const v693=v676;
const v694=v678;
const v695=__nfValue(v679);
const v696=v675;
const v697=v696["table"];
const v698=v675;
const v699=v698["below"];
const v700=v675;
const v701=v700["above"];
return ({["kind"]:v681,["binary"]:v683,["unary"]:v685,["a"]:v687,["b"]:v689,["c"]:v691,["value"]:v692,["terms"]:v693,["gates"]:v694,["gate_bias"]:v695,["table"]:v697,["below"]:v699,["above"]:v701});}
function __fn31(v702,v703,v704){
const v705="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v706=v702;
const v707=v703;
const v708=__fn17(v705,v706,v707);
const v709=v704;
const v710=v708;
const v711=v710["kind"];
const v712=v708;
const v713=v712["binary"];
const v714=v708;
const v715=v714["unary"];
const v716=v708;
const v717=v716["a"];
const v718=v708;
const v719=v718["b"];
const v720=v709;
const v721=v708;
const v722=__nfValue(v721["value"]);
const v723=v708;
const v724=v723["terms"];
const v725=v708;
const v726=v725["gates"];
const v727=v708;
const v728=__nfValue(v727["gate_bias"]);
const v729=v708;
const v730=v729["table"];
const v731=v708;
const v732=v731["below"];
const v733=v708;
const v734=v733["above"];
return ({["kind"]:v711,["binary"]:v713,["unary"]:v715,["a"]:v717,["b"]:v719,["c"]:v720,["value"]:v722,["terms"]:v724,["gates"]:v726,["gate_bias"]:v728,["table"]:v730,["below"]:v732,["above"]:v734});}
function __fn32(v735,v736,v737,v738){
const v739="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v740=v735;
const v741=0;
const v742=__fn17(v739,v740,v741);
const v743=v736;
const v744=v737;
const v745=v738;
const v746=v742;
const v747=v746["kind"];
const v748=v742;
const v749=v748["binary"];
const v750=v742;
const v751=v750["unary"];
const v752=v742;
const v753=v752["a"];
const v754=v742;
const v755=v754["b"];
const v756=v742;
const v757=v756["c"];
const v758=v742;
const v759=__nfValue(v758["value"]);
const v760=v742;
const v761=v760["terms"];
const v762=v742;
const v763=v762["gates"];
const v764=v742;
const v765=__nfValue(v764["gate_bias"]);
const v766=v743;
const v767=v744;
const v768=v745;
return ({["kind"]:v747,["binary"]:v749,["unary"]:v751,["a"]:v753,["b"]:v755,["c"]:v757,["value"]:v759,["terms"]:v761,["gates"]:v763,["gate_bias"]:v765,["table"]:v766,["below"]:v767,["above"]:v768});}
function __fn33(){
const v769=false;
const v770="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
const v771="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
const v772="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v769,["boolean"]:v770,["index"]:v771,["zero"]:v772});}
function __fn34(){
const v773=true;
const v774="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v775="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v776="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate";
return ({["piecewise"]:v773,["boolean"]:v774,["index"]:v775,["zero"]:v776});}
function __fn35(){
const v777=true;
const v778="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero";
const v779="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero";
const v780="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
return ({["piecewise"]:v777,["boolean"]:v778,["index"]:v779,["zero"]:v780});}
function __fn36(v781){
const v782=v781;
const v783=v782["kind"];
const v784=v783;
const v785="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v786;if((v784===v785)){
v786=[];}else{
const v787=v783;
const v788="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v789;if((v787===v788)){
const v790=v781;
const v791=v790["a"];
const v792=v781;
const v793=v792["b"];
v789=[v791,v793];}else{
const v794=v783;
const v795="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v796;if((v794===v795)){
const v797=v781;
const v798=v797["a"];
v796=[v798];}else{
const v799=v783;
const v800="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v801;if((v799===v800)){
const v802=v781;
const v803=v802["terms"];
const v804=v803.length;
const v805=new Array(v804);
for(let v806=0;v806<v804;v806++){
const v807=v803[v806];
const v808=v807;
v805[v806]=v808["wire"];
}
v801=v805;}else{
const v809=v783;
const v810="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v811;if((v809===v810)){
const v812=v781;
const v813=v812["terms"];
const v814=v813.length;
const v815=new Array(v814);
for(let v816=0;v816<v814;v816++){
const v817=v813[v816];
const v818=v817;
v815[v816]=v818["wire"];
}
const v819=v815;
const v820=v781;
const v821=v820["gates"];
const v822=v821.length;
const v823=new Array(v822);
for(let v824=0;v824<v822;v824++){
const v825=v821[v824];
const v826=v825;
v823[v824]=v826["wire"];
}
const v827=v823;
const v828=v819.length;
const v829=v827.length;
const v830=new Array(v828+v829);
for(let v831=0;v831<v828;v831++){v830[v831]=v819[v831];}
for(let v832=0;v832<v829;v832++){v830[v828+v832]=v827[v832];}
v811=v830;}else{
const v833=v783;
const v834="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v835;if((v833===v834)){
const v836=v781;
const v837=v836["a"];
const v838=v781;
const v839=v838["b"];
const v840=v781;
const v841=v840["c"];
v835=[v837,v839,v841];}else{
const v842=v781;
const v843=v842["a"];
const v844=[v843];
const v845=v781;
const v846=v845["table"];
const v847=v844.length;
const v848=v846.length;
const v849=new Array(v847+v848);
for(let v850=0;v850<v847;v850++){v849[v850]=v844[v850];}
for(let v851=0;v851<v848;v851++){v849[v847+v851]=v846[v851];}
v835=v849;}
v811=v835;}
v801=v811;}
v796=v801;}
v789=v796;}
v786=v789;}
return v786;}
function __fn37(v852,v853){
const v854=v852;
const v855=v854["kind"];
const v856=v855;
const v857="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v858;if((v856===v857)){
v858=v852;}else{
const v859=v855;
const v860="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v861;if((v859===v860)){
const v862=v853;
const v863=v852;
const v864=v863["a"];
let v865;if(v864<v862.length){v865=v862[v864];}else{
v865=0;}
const v866=v865;
const v867=v853;
const v868=v852;
const v869=v868["b"];
let v870;if(v869<v867.length){v870=v867[v869];}else{
v870=0;}
const v871=v870;
const v872=v852;
const v873=v872["kind"];
const v874=v852;
const v875=v874["binary"];
const v876=v852;
const v877=v876["unary"];
const v878=v866;
const v879=v871;
const v880=v852;
const v881=v880["c"];
const v882=v852;
const v883=__nfValue(v882["value"]);
const v884=v852;
const v885=v884["terms"];
const v886=v852;
const v887=v886["gates"];
const v888=v852;
const v889=__nfValue(v888["gate_bias"]);
const v890=v852;
const v891=v890["table"];
const v892=v852;
const v893=v892["below"];
const v894=v852;
const v895=v894["above"];
v861=({["kind"]:v873,["binary"]:v875,["unary"]:v877,["a"]:v878,["b"]:v879,["c"]:v881,["value"]:v883,["terms"]:v885,["gates"]:v887,["gate_bias"]:v889,["table"]:v891,["below"]:v893,["above"]:v895});}else{
const v896=v855;
const v897="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v898;if((v896===v897)){
const v899=v853;
const v900=v852;
const v901=v900["a"];
let v902;if(v901<v899.length){v902=v899[v901];}else{
v902=0;}
const v903=v902;
const v904=v852;
const v905=v904["kind"];
const v906=v852;
const v907=v906["binary"];
const v908=v852;
const v909=v908["unary"];
const v910=v903;
const v911=v852;
const v912=v911["b"];
const v913=v852;
const v914=v913["c"];
const v915=v852;
const v916=__nfValue(v915["value"]);
const v917=v852;
const v918=v917["terms"];
const v919=v852;
const v920=v919["gates"];
const v921=v852;
const v922=__nfValue(v921["gate_bias"]);
const v923=v852;
const v924=v923["table"];
const v925=v852;
const v926=v925["below"];
const v927=v852;
const v928=v927["above"];
v898=({["kind"]:v905,["binary"]:v907,["unary"]:v909,["a"]:v910,["b"]:v912,["c"]:v914,["value"]:v916,["terms"]:v918,["gates"]:v920,["gate_bias"]:v922,["table"]:v924,["below"]:v926,["above"]:v928});}else{
const v929=v855;
const v930="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v931;if((v929===v930)){
const v932=v852;
const v933=v932["terms"];
const v934=v933.length;
const v935=new Array(v934);
for(let v936=0;v936<v934;v936++){
const v937=v933[v936];
const v938=v853;
const v939=v937;
const v940=v939["wire"];
let v941;if(v940<v938.length){v941=v938[v940];}else{
v941=0;}
const v942=v941;
const v943=v937;
const v944=__nfValue(v943["coefficient"]);
v935[v936]=({["wire"]:v942,["coefficient"]:v944});
}
const v945=v935;
const v946=v852;
const v947=v946["kind"];
const v948=v852;
const v949=v948["binary"];
const v950=v852;
const v951=v950["unary"];
const v952=v852;
const v953=v952["a"];
const v954=v852;
const v955=v954["b"];
const v956=v852;
const v957=v956["c"];
const v958=v852;
const v959=__nfValue(v958["value"]);
const v960=v945;
const v961=v852;
const v962=v961["gates"];
const v963=v852;
const v964=__nfValue(v963["gate_bias"]);
const v965=v852;
const v966=v965["table"];
const v967=v852;
const v968=v967["below"];
const v969=v852;
const v970=v969["above"];
v931=({["kind"]:v947,["binary"]:v949,["unary"]:v951,["a"]:v953,["b"]:v955,["c"]:v957,["value"]:v959,["terms"]:v960,["gates"]:v962,["gate_bias"]:v964,["table"]:v966,["below"]:v968,["above"]:v970});}else{
const v971=v855;
const v972="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v973;if((v971===v972)){
const v974=v852;
const v975=v974["terms"];
const v976=v975.length;
const v977=new Array(v976);
for(let v978=0;v978<v976;v978++){
const v979=v975[v978];
const v980=v853;
const v981=v979;
const v982=v981["wire"];
let v983;if(v982<v980.length){v983=v980[v982];}else{
v983=0;}
const v984=v983;
const v985=v979;
const v986=__nfValue(v985["coefficient"]);
v977[v978]=({["wire"]:v984,["coefficient"]:v986});
}
const v987=v977;
const v988=v852;
const v989=v988["gates"];
const v990=v989.length;
const v991=new Array(v990);
for(let v992=0;v992<v990;v992++){
const v993=v989[v992];
const v994=v853;
const v995=v993;
const v996=v995["wire"];
let v997;if(v996<v994.length){v997=v994[v996];}else{
v997=0;}
const v998=v997;
const v999=v993;
const v1000=__nfValue(v999["coefficient"]);
v991[v992]=({["wire"]:v998,["coefficient"]:v1000});
}
const v1001=v991;
const v1002=v852;
const v1003=v1002["kind"];
const v1004=v852;
const v1005=v1004["binary"];
const v1006=v852;
const v1007=v1006["unary"];
const v1008=v852;
const v1009=v1008["a"];
const v1010=v852;
const v1011=v1010["b"];
const v1012=v852;
const v1013=v1012["c"];
const v1014=v852;
const v1015=__nfValue(v1014["value"]);
const v1016=v987;
const v1017=v1001;
const v1018=v852;
const v1019=__nfValue(v1018["gate_bias"]);
const v1020=v852;
const v1021=v1020["table"];
const v1022=v852;
const v1023=v1022["below"];
const v1024=v852;
const v1025=v1024["above"];
v973=({["kind"]:v1003,["binary"]:v1005,["unary"]:v1007,["a"]:v1009,["b"]:v1011,["c"]:v1013,["value"]:v1015,["terms"]:v1016,["gates"]:v1017,["gate_bias"]:v1019,["table"]:v1021,["below"]:v1023,["above"]:v1025});}else{
const v1026=v855;
const v1027="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1028;if((v1026===v1027)){
const v1029=v853;
const v1030=v852;
const v1031=v1030["a"];
let v1032;if(v1031<v1029.length){v1032=v1029[v1031];}else{
v1032=0;}
const v1033=v1032;
const v1034=v853;
const v1035=v852;
const v1036=v1035["b"];
let v1037;if(v1036<v1034.length){v1037=v1034[v1036];}else{
v1037=0;}
const v1038=v1037;
const v1039=v853;
const v1040=v852;
const v1041=v1040["c"];
let v1042;if(v1041<v1039.length){v1042=v1039[v1041];}else{
v1042=0;}
const v1043=v1042;
const v1044=v852;
const v1045=v1044["kind"];
const v1046=v852;
const v1047=v1046["binary"];
const v1048=v852;
const v1049=v1048["unary"];
const v1050=v1033;
const v1051=v1038;
const v1052=v1043;
const v1053=v852;
const v1054=__nfValue(v1053["value"]);
const v1055=v852;
const v1056=v1055["terms"];
const v1057=v852;
const v1058=v1057["gates"];
const v1059=v852;
const v1060=__nfValue(v1059["gate_bias"]);
const v1061=v852;
const v1062=v1061["table"];
const v1063=v852;
const v1064=v1063["below"];
const v1065=v852;
const v1066=v1065["above"];
v1028=({["kind"]:v1045,["binary"]:v1047,["unary"]:v1049,["a"]:v1050,["b"]:v1051,["c"]:v1052,["value"]:v1054,["terms"]:v1056,["gates"]:v1058,["gate_bias"]:v1060,["table"]:v1062,["below"]:v1064,["above"]:v1066});}else{
const v1067=v853;
const v1068=v852;
const v1069=v1068["a"];
let v1070;if(v1069<v1067.length){v1070=v1067[v1069];}else{
v1070=0;}
const v1071=v1070;
const v1072=v852;
const v1073=v1072["table"];
const v1074=v1073.length;
const v1075=new Array(v1074);
for(let v1076=0;v1076<v1074;v1076++){
const v1077=(v1073[v1076]>>>0);
const v1078=v853;
const v1079=v1077;
let v1080;if(v1079<v1078.length){v1080=v1078[v1079];}else{
v1080=0;}
v1075[v1076]=v1080;
}
const v1081=v1075;
const v1082=v852;
const v1083=v1082["kind"];
const v1084=v852;
const v1085=v1084["binary"];
const v1086=v852;
const v1087=v1086["unary"];
const v1088=v1071;
const v1089=v852;
const v1090=v1089["b"];
const v1091=v852;
const v1092=v1091["c"];
const v1093=v852;
const v1094=__nfValue(v1093["value"]);
const v1095=v852;
const v1096=v1095["terms"];
const v1097=v852;
const v1098=v1097["gates"];
const v1099=v852;
const v1100=__nfValue(v1099["gate_bias"]);
const v1101=v1081;
const v1102=v852;
const v1103=v1102["below"];
const v1104=v852;
const v1105=v1104["above"];
v1028=({["kind"]:v1083,["binary"]:v1085,["unary"]:v1087,["a"]:v1088,["b"]:v1090,["c"]:v1092,["value"]:v1094,["terms"]:v1096,["gates"]:v1098,["gate_bias"]:v1100,["table"]:v1101,["below"]:v1103,["above"]:v1105});}
v973=v1028;}
v931=v973;}
v898=v931;}
v861=v898;}
v858=v861;}
return v858;}
function __fn38(v1106,v1107,v1108){
const v1109=v1107;
const v1110=v1109["wire"];
const v1111=1;
const v1112=(((v1110) - (v1111)) >>> 0);
const v1113=v1107;
const v1114=v1113["live"];
const v1115=v1114;
const v1116=v1112;
let v1117;if(v1116<v1115.length){v1117=v1115.item(v1116);}else{
v1117=false;}
let v1118;if(v1117){
const v1119=v1106;
const v1120=__fn36(v1119);
const v1121=v1114;
let v1122=({["live"]:v1121});
for(let v1123=0;v1123<v1120.length;v1123++){
const v1124=(v1120[v1123]>>>0);
const v1125=v1122;
const v1126=v1125["live"];
const v1127=v1126;
const v1128=v1124;
const v1129=__tempSet(v1127,v1128,true,false);
const v1130=v1129;
v1122=({["live"]:v1130});
}
const v1131=v1122;
const v1132=v1131;
const v1133=v1132["live"];
const v1134=v1133;
const v1135=v1112;
v1118=({["live"]:v1134,["wire"]:v1135});}else{
const v1136=v1114;
const v1137=v1112;
v1118=({["live"]:v1136,["wire"]:v1137});}
return v1118;}
function __fn39(v1138,v1139){
const v1140=v1138;
const v1141=v1140["kind"];
const v1142=v1141;
const v1143="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1144;if((v1142===v1143)){
v1144=true;}else{
const v1145=v1141;
const v1146="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1147;if((v1145===v1146)){
const v1148=v1138;
const v1149=v1148["a"];
const v1150=v1139;
const v1151=((v1149) < (v1150));
let v1152=v1151;if(v1152){
const v1153=v1138;
const v1154=v1153["b"];
const v1155=v1139;
v1152=((v1154) < (v1155));}
v1147=v1152;}else{
const v1156=v1141;
const v1157="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1158;if((v1156===v1157)){
const v1159=v1138;
const v1160=v1159["a"];
const v1161=v1139;
v1158=((v1160) < (v1161));}else{
const v1162=v1141;
const v1163="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1164;if((v1162===v1163)){
const v1165=v1138;
const v1166=v1165["terms"];
let v1167=true;
for(let v1168=0;v1168<v1166.length;v1168++){
const v1169=v1166[v1168];
const v1170=v1167;
let v1171=v1170;if(v1171){
const v1172=v1169;
const v1173=v1172["wire"];
const v1174=v1139;
v1171=((v1173) < (v1174));}
v1167=v1171;
}
v1164=v1167;}else{
const v1175=v1141;
const v1176="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1177;if((v1175===v1176)){
const v1178=v1138;
const v1179=v1178["terms"];
let v1180=true;
for(let v1181=0;v1181<v1179.length;v1181++){
const v1182=v1179[v1181];
const v1183=v1180;
let v1184=v1183;if(v1184){
const v1185=v1182;
const v1186=v1185["wire"];
const v1187=v1139;
v1184=((v1186) < (v1187));}
v1180=v1184;
}
const v1188=v1180;
let v1189=v1188;if(v1189){
const v1190=v1138;
const v1191=v1190["gates"];
let v1192=true;
for(let v1193=0;v1193<v1191.length;v1193++){
const v1194=v1191[v1193];
const v1195=v1192;
let v1196=v1195;if(v1196){
const v1197=v1194;
const v1198=v1197["wire"];
const v1199=v1139;
v1196=((v1198) < (v1199));}
v1192=v1196;
}
v1189=v1192;}
v1177=v1189;}else{
const v1200=v1141;
const v1201="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1202;if((v1200===v1201)){
const v1203=v1138;
const v1204=v1203["a"];
const v1205=v1139;
const v1206=((v1204) < (v1205));
let v1207=v1206;if(v1207){
const v1208=v1138;
const v1209=v1208["b"];
const v1210=v1139;
v1207=((v1209) < (v1210));}
const v1211=v1207;
let v1212=v1211;if(v1212){
const v1213=v1138;
const v1214=v1213["c"];
const v1215=v1139;
v1212=((v1214) < (v1215));}
v1202=v1212;}else{
const v1216=v1138;
const v1217=v1216["a"];
const v1218=v1139;
const v1219=((v1217) < (v1218));
let v1220=v1219;if(v1220){
const v1221=v1138;
const v1222=v1221["table"];
let v1223=true;
for(let v1224=0;v1224<v1222.length;v1224++){
const v1225=(v1222[v1224]>>>0);
const v1226=v1223;
let v1227=v1226;if(v1227){
const v1228=v1225;
const v1229=v1139;
v1227=((v1228) < (v1229));}
v1223=v1227;
}
v1220=v1223;}
v1202=v1220;}
v1177=v1202;}
v1164=v1177;}
v1158=v1164;}
v1147=v1158;}
v1144=v1147;}
return v1144;}
function __fn40(v1230,v1231,v1232){
const v1233=v1231;
const v1234=v1233.length;
const v1235=4294967295;
const v1236=((v1234) > (v1235));
let v1237=v1236;if(!v1237){
const v1238=(v1231).length;
const v1239=4294967295;
const v1240=v1230;
const v1241=(((v1239) - (v1240)) >>> 0);
v1237=((v1238) > (v1241));}
let v1242;if(v1237){
v1242=false;}else{
const v1243=v1230;
const v1244=(v1231).length;
const v1245=(((v1243) + (v1244)) >>> 0);
const v1246=v1231;
const v1247=v1230;
const v1248=true;
let v1249=({["wire"]:v1247,["valid"]:v1248});
for(let v1250=0;v1250<v1246.length;v1250++){
const v1251=v1246[v1250];
const v1252=v1249;
const v1253=v1252["wire"];
const v1254=1;
const v1255=(((v1253) + (v1254)) >>> 0);
const v1256=v1249;
const v1257=v1256["valid"];
let v1258=v1257;if(v1258){
const v1259=v1251;
const v1260=v1249;
const v1261=v1260["wire"];
v1258=__fn39(v1259,v1261);}
const v1262=v1258;
v1249=({["wire"]:v1255,["valid"]:v1262});
}
const v1263=v1249;
const v1264=v1263;
const v1265=v1264["valid"];
let v1266=v1265;if(v1266){
const v1267=v1232;
let v1268=true;
for(let v1269=0;v1269<v1267.length;v1269++){
const v1270=(v1267[v1269]>>>0);
const v1271=v1268;
let v1272=v1271;if(v1272){
const v1273=v1270;
const v1274=v1245;
v1272=((v1273) < (v1274));}
v1268=v1272;
}
v1266=v1268;}
v1242=v1266;}
return v1242;}
function __fn41(v1275,v1276,v1277,v1278){
const v1279=v1276;
const v1280=v1279.length;
const v1281=4294967295;
const v1282=((v1280) > (v1281));
let v1283=v1282;if(!v1283){
const v1284=v1275;
const v1285=v1278;
v1283=((v1284) > (v1285));}
const v1286=v1283;
let v1287=v1286;if(!v1287){
const v1288=(v1276).length;
const v1289=v1278;
const v1290=v1275;
const v1291=(((v1289) - (v1290)) >>> 0);
v1287=((v1288) > (v1291));}
let v1292;if(v1287){
v1292=({Err:"graph capacity"});}else{
const v1293=v1275;
const v1294=v1276;
const v1295=v1277;
const v1296=__fn40(v1293,v1294,v1295);
const v1297=false;
let v1298;if((v1296===v1297)){
v1298=({Err:"graph is not topologically ordered"});}else{
const v1299=v1275;
const v1300=(v1276).length;
const v1301=(((v1299) + (v1300)) >>> 0);
const v1302=__bufferFill(v1301,false);
const v1303=v1277;
const v1304=v1302;
let v1305=({["live"]:v1304});
for(let v1306=0;v1306<v1303.length;v1306++){
const v1307=(v1303[v1306]>>>0);
const v1308=v1305;
const v1309=v1308["live"];
const v1310=v1309;
const v1311=v1307;
const v1312=__tempSet(v1310,v1311,true,false);
const v1313=v1312;
v1305=({["live"]:v1313});
}
const v1314=v1305;
const v1315=v1314;
const v1316=v1315["live"];
const v1317=v1276;
const v1318=v1316;
const v1319=v1301;
let v1320=({["live"]:v1318,["wire"]:v1319});
for(let v1321=v1317.length-1;v1321>=0;v1321--){
const v1322=v1317[v1321];
const v1323=v1322;
const v1324=v1320;
const v1325=v1275;
v1320=__fn38(v1323,v1324,v1325);
}
const v1326=v1320;
const v1327=v1326;
const v1328=v1327["live"];
const v1329=v1328.freeze();
const v1330=__bufferFill(v1301,0);
const v1331=v1275;
let v1332=v1330;
for(let v1333=0;v1333<v1331;v1333++){
if(false){break;}
const v1334=(v1333>>>0);
const v1335=v1332;
const v1336=v1334;
v1332=__tempSet(v1335,v1336,v1334,false);}
const v1337=v1332;
const v1338=v1337;
const v1339=v1275;
const v1340=v1275;
const v1341=v1276;
const v1342=v1340;
const v1343=v1338;
const v1344=v1339;
let v1345=({["next"]:v1342,["positions"]:v1343,["wire"]:v1344});
for(let v1346=0;v1346<v1341.length;v1346++){
const v1347=v1341[v1346];
const v1348=v1345;
const v1349=v1348["next"];
const v1350=v1345;
const v1351=v1350["positions"];
const v1352=v1345;
const v1353=v1352["wire"];
const v1354=v1329;
const v1355=v1353;
let v1356;if(v1355<v1354.length){v1356=v1354[v1355];}else{
v1356=false;}
let v1357;if(v1356){
const v1358=v1351;
const v1359=v1353;
const v1360=__tempSet(v1358,v1359,v1349,false);
const v1361=v1349;
const v1362=1;
const v1363=(((v1361) + (v1362)) >>> 0);
const v1364=v1353;
const v1365=1;
const v1366=(((v1364) + (v1365)) >>> 0);
const v1367=v1363;
const v1368=v1360;
const v1369=v1366;
v1357=({["next"]:v1367,["positions"]:v1368,["wire"]:v1369});}else{
const v1370=v1353;
const v1371=1;
const v1372=(((v1370) + (v1371)) >>> 0);
const v1373=v1349;
const v1374=v1351;
const v1375=v1372;
v1357=({["next"]:v1373,["positions"]:v1374,["wire"]:v1375});}
v1345=v1357;
}
const v1376=v1345;
const v1377=v1376;
const v1378=v1377["next"];
const v1379=v1376;
const v1380=v1379["positions"];
const v1381=v1376;
const v1382=v1381["wire"];
const v1383=v1380;
const v1384=v1383.freeze();
const v1385=new __InkBuffer([]);
const v1386=v1275;
const v1387=v1276;
const v1388=v1385;
const v1389=v1386;
let v1390=({["compact"]:v1388,["wire"]:v1389});
for(let v1391=0;v1391<v1387.length;v1391++){
const v1392=v1387[v1391];
const v1393=v1390;
const v1394=v1393["compact"];
const v1395=v1390;
const v1396=v1395["wire"];
const v1397=v1329;
const v1398=v1396;
let v1399;if(v1398<v1397.length){v1399=v1397[v1398];}else{
v1399=false;}
let v1400;if(v1399){
const v1401=v1394;
const v1402=v1392;
const v1403=v1384;
const v1404=__fn37(v1402,v1403);
const v1405=__tempEdit(v1401,"push",v1404);
const v1406=v1396;
const v1407=1;
const v1408=(((v1406) + (v1407)) >>> 0);
const v1409=v1405;
const v1410=v1408;
v1400=({["compact"]:v1409,["wire"]:v1410});}else{
const v1411=v1396;
const v1412=1;
const v1413=(((v1411) + (v1412)) >>> 0);
const v1414=v1394;
const v1415=v1413;
v1400=({["compact"]:v1414,["wire"]:v1415});}
v1390=v1400;
}
const v1416=v1390;
const v1417=v1416;
const v1418=v1417["compact"];
const v1419=v1416;
const v1420=v1419["wire"];
const v1421=v1275;
const v1422=v1418;
const v1423=v1422.freeze();
const v1424=v1277;
const v1425=v1424.length;
const v1426=new Array(v1425);
for(let v1427=0;v1427<v1425;v1427++){
const v1428=(v1424[v1427]>>>0);
const v1429=v1384;
const v1430=v1428;
let v1431;if(v1430<v1429.length){v1431=v1429[v1430];}else{
v1431=0;}
v1426[v1427]=v1431;
}
const v1432=v1426;
v1298=({Ok:({["inputs"]:v1421,["nodes"]:v1423,["roots"]:v1432})});}
v1292=v1298;}
return v1292;}
function __fn42(v1433){
const v1434=v1433;
return (v1434["nodes"]).length;}
function __fn43(v1435){
const v1436=v1435;
return v1436["inputs"];}
function __fn44(v1437){
const v1438=v1437;
return (v1438["roots"]).length;}
function __fn45(v1439,v1440,v1441){
const v1442=v1439;
const v1443=v1442;
const v1444="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v1445;if((v1443===v1444)){
const v1446=__nfValue(v1440);
const v1447=__nfValue(v1441);
v1445=Math.fround(__nfNumber(v1446) + __nfNumber(v1447));}else{
const v1448=v1442;
const v1449="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v1450;if((v1448===v1449)){
const v1451=__nfValue(v1440);
const v1452=__nfValue(v1441);
v1450=Math.fround(__nfNumber(v1451) - __nfNumber(v1452));}else{
const v1453=v1442;
const v1454="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v1455;if((v1453===v1454)){
const v1456=__nfValue(v1440);
const v1457=__nfValue(v1441);
v1455=Math.fround(__nfNumber(v1456) * __nfNumber(v1457));}else{
v1455=Math.fround((__nfNumber(__nfValue(v1440)))/(__nfNumber(__nfValue(v1441))));}
v1450=v1455;}
v1445=v1450;}
return v1445;}
function __fn46(v1458){
let v1459;if(Number.isNaN(__nfNumber(__nfValue(v1458)))){
v1459=__nfFromBits(2143289344);}else{
const v1460=__nfValue(v1458);
const v1461=__nfFromBits(0);
let v1462;if(((__nfNumber(v1460)) > (__nfNumber(v1461)))){
v1462=__nfValue(v1458);}else{
v1462=__nfFromBits(0);}
v1459=v1462;}
return v1459;}
function __fn47(v1463,v1464){
const v1465=v1463;
const v1466=v1465;
const v1467="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1468;if((v1466===v1467)){
v1468=Math.fround(Math.sqrt(__nfNumber(__nfValue(v1464))));}else{
const v1469=v1465;
const v1470="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1471;if((v1469===v1470)){
const v1472=__nfValue(v1464);
v1471=__nfNeg(v1472);}else{
const v1473=v1465;
const v1474="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1475;if((v1473===v1474)){
const v1476=__nfValue(v1464);
v1475=__fn46(v1476);}else{
const v1477=__nfValue(v1464);
const v1478=__nfFromBits(0);
let v1479;if(((__nfNumber(v1477)) > (__nfNumber(v1478)))){
v1479=__nfFromBits(1065353216);}else{
v1479=__nfFromBits(0);}
v1475=v1479;}
v1471=v1475;}
v1468=v1471;}
return v1468;}
function __fn48(v1480,v1481){
const v1482=v1480;
const v1483=v1482["kind"];
const v1484=v1483;
const v1485="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1486;if((v1484===v1485)){
const v1487=v1480;
v1486=__nfValue(v1487["value"]);}else{
const v1488=v1483;
const v1489="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1490;if((v1488===v1489)){
const v1491=v1480;
const v1492=v1491["binary"];
const v1493=v1481;
const v1494=v1480;
const v1495=v1494["a"];
let v1496;if(v1495<v1493.length){v1496=v1493.item(v1495);}else{
v1496=__nfFromBits(0);}
const v1497=__nfValue(v1496);
const v1498=v1481;
const v1499=v1480;
const v1500=v1499["b"];
let v1501;if(v1500<v1498.length){v1501=v1498.item(v1500);}else{
v1501=__nfFromBits(0);}
const v1502=__nfValue(v1501);
v1490=__fn45(v1492,v1497,v1502);}else{
const v1503=v1483;
const v1504="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1505;if((v1503===v1504)){
const v1506=v1480;
const v1507=v1506["unary"];
const v1508=v1481;
const v1509=v1480;
const v1510=v1509["a"];
let v1511;if(v1510<v1508.length){v1511=v1508.item(v1510);}else{
v1511=__nfFromBits(0);}
const v1512=__nfValue(v1511);
v1505=__fn47(v1507,v1512);}else{
const v1513=v1483;
const v1514="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1515;if((v1513===v1514)){
v1515=__nfFromBits(0);}else{
const v1516=v1483;
const v1517="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1518;if((v1516===v1517)){
v1518=__nfFromBits(0);}else{
const v1519=v1483;
const v1520="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1521;if((v1519===v1520)){
const v1522=v1481;
const v1523=v1480;
const v1524=v1523["a"];
let v1525;if(v1524<v1522.length){v1525=v1522.item(v1524);}else{
v1525=__nfFromBits(0);}
const v1526=__nfValue(v1525);
const v1527=__nfFromBits(0);
let v1528;if(((__nfNumber(v1526)) > (__nfNumber(v1527)))){
const v1529=v1481;
const v1530=v1480;
const v1531=v1530["c"];
let v1532;if(v1531<v1529.length){v1532=v1529.item(v1531);}else{
v1532=__nfFromBits(0);}
v1528=__nfValue(v1532);}else{
const v1533=v1481;
const v1534=v1480;
const v1535=v1534["b"];
let v1536;if(v1535<v1533.length){v1536=v1533.item(v1535);}else{
v1536=__nfFromBits(0);}
v1528=__nfValue(v1536);}
v1521=v1528;}else{
v1521=__nfFromBits(0);}
v1518=v1521;}
v1515=v1518;}
v1505=v1515;}
v1490=v1505;}
v1486=v1490;}
const v1537=v1486;
const v1538=v1481;
const v1539=__nfValue(v1537);
return ({["values"]:v1538,["value"]:v1539});}
function __fn49(v1540,v1541,v1542){
const v1543=v1540;
const v1544=0;
const v1545=v1540;
const v1546=(v1545).length;
const v1547=v1543.range(v1544,v1546);
const v1548=v1541;
let v1549=__nfValue(v1542);
for(let v1550=0;v1550<v1548.length;v1550++){
const v1551=v1548[v1550];
const v1552=__nfValue(v1549);
const v1553=v1551;
const v1554=__nfValue(v1553["coefficient"]);
const v1555=v1547;
const v1556=v1551;
const v1557=v1556["wire"];
let v1558;if(v1557<v1555.length){v1558=v1555.item(v1557);}else{
v1558=__nfFromBits(0);}
const v1559=__nfValue(v1558);
const v1560=Math.fround(__nfNumber(v1554) * __nfNumber(v1559));
v1549=Math.fround(__nfNumber(v1552) + v1560);
}
const v1561=__nfValue(v1549);
const v1562=v1540;
const v1563=__nfValue(v1561);
return ({["values"]:v1562,["value"]:v1563});}
function __fn50(v1564,v1565){
const v1566=v1565;
const v1567=v1564;
const v1568=v1567["terms"];
const v1569=v1564;
const v1570=__nfValue(v1569["value"]);
const v1571=__fn49(v1566,v1568,v1570);
const v1572=v1571;
const v1573=v1572["values"];
const v1574=v1564;
const v1575=v1574["gates"];
const v1576=v1564;
const v1577=__nfValue(v1576["gate_bias"]);
const v1578=__fn49(v1573,v1575,v1577);
const v1579=v1578;
const v1580=v1579["values"];
const v1581=v1571;
const v1582=__nfValue(v1581["value"]);
const v1583=v1578;
const v1584=__nfValue(v1583["value"]);
const v1585=__fn46(v1584);
const v1586=Math.fround(__nfNumber(v1582) * __nfNumber(v1585));
return ({["values"]:v1580,["value"]:v1586});}
function __fn51(v1587,v1588,v1589,v1590){
const v1591=v1588;
const v1592=0;
const v1593=(v1591===v1592);
let v1594=v1593;if(!v1594){
const v1595=Number.isFinite(__nfNumber(__nfValue(v1587)));
const v1596=false;
v1594=(v1595===v1596);}
let v1597;if(v1594){
v1597=({None:null});}else{
const v1598=__nfValue(v1587);
const v1599=__nfFromBits(0);
let v1600;if(((__nfNumber(v1598)) < (__nfNumber(v1599)))){
let v1601;if(v1589){
v1601=({None:null});}else{
v1601=({Some:0});}
v1600=v1601;}else{
const v1602=__nfValue(v1587);
const v1603=Math.fround(v1588);
let v1604;if(((__nfNumber(v1602)) >= (__nfNumber(v1603)))){
let v1605;if(v1590){
v1605=({None:null});}else{
const v1606=v1588;
const v1607=1;
v1605=({Some:(((v1606) - (v1607)) >>> 0)});}
v1604=v1605;}else{
v1604=__ink_from_float(__nfNumber(__nfValue(v1587)), "u32");}
v1600=v1604;}
v1597=v1600;}
return v1597;}
function __fn52(v1608,v1609){
const v1610=v1609;
const v1611=v1608;
const v1612=v1611["a"];
let v1613;if(v1612<v1610.length){v1613=v1610.item(v1612);}else{
v1613=__nfFromBits(0);}
const v1614=__nfValue(v1613);
const v1615=v1608;
const v1616=(v1615["table"]).length;
const v1617=v1608;
const v1618=v1617["below"];
const v1619=v1608;
const v1620=v1619["above"];
const v1621=__fn51(v1614,v1616,v1618,v1620);
const v1622=v1621;
let v1623;if(Object.hasOwn(v1622,"Some")){
const v1624=v1622["Some"];
const v1625=v1609;
const v1626=v1608;
const v1627=v1626["table"];
const v1628=v1624;
let v1629;if(v1628<v1627.length){v1629=v1627[v1628];}else{
v1629=0;}
const v1630=v1629;
let v1631;if(v1630<v1625.length){v1631=v1625.item(v1630);}else{
v1631=__nfFromBits(0);}
v1623=__nfValue(v1631);}else{
const v1632=null;
v1623=__nfFromBits(0);}
const v1633=__nfValue(v1623);
const v1634=v1609;
const v1635=__nfValue(v1633);
return ({["values"]:v1634,["value"]:v1635});}
function __fn53(v1636,v1637){
const v1638=v1637;
const v1639=v1638["values"];
const v1640=v1637;
const v1641=v1640["finite_indices"];
let v1642=v1641;if(v1642){
const v1643=v1636;
const v1644=v1643["kind"];
const v1645="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v1646=!(v1644===v1645);
let v1647=v1646;if(!v1647){
const v1648=v1639;
const v1649=v1636;
const v1650=v1649["a"];
let v1651;if(v1650<v1648.length){v1651=v1648.item(v1650);}else{
v1651=__nfFromBits(0);}
v1647=Number.isFinite(__nfNumber(__nfValue(v1651)));}
v1642=v1647;}
const v1652=v1642;
const v1653=v1636;
const v1654=v1653["kind"];
const v1655=v1654;
const v1656="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1657;if((v1655===v1656)){
const v1658=v1636;
const v1659=v1639;
v1657=__fn48(v1658,v1659);}else{
const v1660=v1654;
const v1661="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1662;if((v1660===v1661)){
const v1663=v1636;
const v1664=v1639;
v1662=__fn48(v1663,v1664);}else{
const v1665=v1654;
const v1666="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1667;if((v1665===v1666)){
const v1668=v1636;
const v1669=v1639;
v1667=__fn48(v1668,v1669);}else{
const v1670=v1654;
const v1671="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1672;if((v1670===v1671)){
const v1673=v1639;
const v1674=v1636;
const v1675=v1674["terms"];
const v1676=v1636;
const v1677=__nfValue(v1676["value"]);
v1672=__fn49(v1673,v1675,v1677);}else{
const v1678=v1654;
const v1679="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1680;if((v1678===v1679)){
const v1681=v1636;
const v1682=v1639;
v1680=__fn50(v1681,v1682);}else{
const v1683=v1654;
const v1684="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1685;if((v1683===v1684)){
const v1686=v1636;
const v1687=v1639;
v1685=__fn48(v1686,v1687);}else{
const v1688=v1636;
const v1689=v1639;
v1685=__fn52(v1688,v1689);}
v1680=v1685;}
v1672=v1680;}
v1667=v1672;}
v1662=v1667;}
v1657=v1662;}
const v1690=v1657;
const v1691=v1690;
const v1692=v1691["values"];
const v1693=v1690;
const v1694=__nfValue(v1693["value"]);
const v1695=__tempEdit(v1692,"push",v1694);
const v1696=v1652;
return ({["values"]:v1695,["finite_indices"]:v1696});}
function __fn54(v1697,v1698){
const v1699=(v1698).length;
const v1700=v1697;
const v1701=v1700["inputs"];
let v1702;if(!(v1699===v1701)){
v1702=({Err:"graph input shape"});}else{
const v1703=v1697;
const v1704=v1703["inputs"];
const v1705=v1697;
const v1706=v1705["nodes"];
const v1707=v1697;
const v1708=v1707["roots"];
const v1709=__fn40(v1704,v1706,v1708);
const v1710=false;
let v1711;if((v1709===v1710)){
v1711=({Err:"invalid prepared graph"});}else{
const v1712=v1697;
const v1713=v1712["nodes"];
const v1714=new __InkBuffer(Array.from(v1698));
const v1715=true;
let v1716=({["values"]:v1714,["finite_indices"]:v1715});
for(let v1717=0;v1717<v1713.length;v1717++){
const v1718=v1713[v1717];
const v1719=v1718;
const v1720=v1716;
v1716=__fn53(v1719,v1720);
}
const v1721=v1716;
const v1722=v1721;
const v1723=v1722["values"];
const v1724=v1723.freeze();
const v1725=v1721;
const v1726=v1725["finite_indices"];
const v1727=false;
let v1728;if((v1726===v1727)){
v1728=({Err:"nonfinite graph index"});}else{
const v1729=v1724;
const v1730=v1697;
const v1731=v1730["roots"];
const v1732=v1731.length;
const v1733=new Array(v1732);
for(let v1734=0;v1734<v1732;v1734++){
const v1735=(v1731[v1734]>>>0);
const v1736=v1724;
const v1737=v1735;
let v1738;if(v1737<v1736.length){v1738=v1736[v1737];}else{
v1738=__nfFromBits(0);}
v1733[v1734]=__nfValue(v1738);
}
const v1739=v1733;
v1728=({Ok:({["values"]:v1729,["outputs"]:v1739})});}
v1711=v1728;}
v1702=v1711;}
return v1702;}
function __fn55(v1740,v1741){
const v1742=v1740;
const v1743=v1741;
const v1744=__fn54(v1742,v1743);
let v1745;if(Object.hasOwn(v1744,"Ok")){
const v1746=v1744["Ok"];
const v1747=v1746;
v1745=({Ok:v1747["outputs"]});}else{v1745=({Err:v1744.Err});}
return v1745;}
function __fn56(v1748,v1749,v1750){
const v1751=v1748;
const v1752=v1749;
let v1753;if(v1752<v1751.length){v1753=v1751.item(v1752);}else{
v1753=__nfFromBits(0);}
const v1754=__nfValue(v1753);
const v1755=v1748;
const v1756=v1749;
const v1757=__nfValue(v1754);
const v1758=__nfValue(v1750);
return __tempSet(v1755,v1756,Math.fround(__nfNumber(v1757) + __nfNumber(v1758)),false);}
function __fn57(v1759,v1760,v1761){
const v1762=v1759;
const v1763=v1760;
const v1764=v1762;
let v1765=({["g"]:v1764});
for(let v1766=0;v1766<v1763.length;v1766++){
const v1767=v1763[v1766];
const v1768=v1765;
const v1769=v1768["g"];
const v1770=v1769;
const v1771=v1767;
const v1772=v1771["wire"];
const v1773=__nfValue(v1761);
const v1774=v1767;
const v1775=__nfValue(v1774["coefficient"]);
const v1776=Math.fround(__nfNumber(v1773) * __nfNumber(v1775));
const v1777=__fn56(v1770,v1772,v1776);
const v1778=v1777;
v1765=({["g"]:v1778});
}
const v1779=v1765;
const v1780=v1779;
const v1781=v1780["g"];
return v1781;}
function __fn58(v1782,v1783){
const v1784=v1782;
const v1785=v1784;
const v1786="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v1787;if((v1785===v1786)){
v1787=true;}else{
const v1788=v1784;
const v1789="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v1790;if((v1788===v1789)){
v1790=true;}else{
const v1791=v1784;
const v1792="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v1793;if((v1791===v1792)){
const v1794=v1783;
v1793=v1794["piecewise"];}else{
const v1795=v1783;
const v1796=v1795["boolean"];
const v1797="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v1793=!(v1796===v1797);}
v1790=v1793;}
v1787=v1790;}
return v1787;}
function __fn59(v1798,v1799){
const v1800=v1798;
const v1801=v1800["kind"];
const v1802=v1801;
const v1803="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v1804;if((v1802===v1803)){
v1804=true;}else{
const v1805=v1801;
const v1806="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v1807;if((v1805===v1806)){
v1807=true;}else{
const v1808=v1801;
const v1809="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v1810;if((v1808===v1809)){
const v1811=v1798;
const v1812=v1811["unary"];
const v1813=v1799;
v1810=__fn58(v1812,v1813);}else{
const v1814=v1801;
const v1815="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v1816;if((v1814===v1815)){
v1816=true;}else{
const v1817=v1801;
const v1818="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v1819;if((v1817===v1818)){
const v1820=v1799;
v1819=v1820["piecewise"];}else{
const v1821=v1801;
const v1822="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v1823;if((v1821===v1822)){
const v1824=v1799;
v1823=v1824["piecewise"];}else{
const v1825=v1799;
const v1826=v1825["index"];
const v1827="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v1823=!(v1826===v1827);}
v1819=v1823;}
v1816=v1819;}
v1810=v1816;}
v1807=v1810;}
v1804=v1807;}
return v1804;}
function __fn60(v1828,v1829,v1830,v1831,v1832,v1833,v1834){
const v1835=v1830;
const v1836=__nfValue(v1831);
const v1837=v1835;
let v1838=__nfValue(v1836);
for(let v1839=0;v1839<v1837.length;v1839++){
const v1840=v1837[v1839];
const v1841=__nfValue(v1838);
const v1842=v1840;
const v1843=__nfValue(v1842["coefficient"]);
const v1844=v1840;
const v1845=v1844["wire"];
const v1846=v1845;
const v1847=v1829;
const v1848=v1846;
let v1849;if(v1848<v1847.length){v1849=v1847[v1848];}else{
v1849=__nfFromBits(0);}
const v1850=__nfValue(v1849);
const v1851=__nfValue(v1850);
const v1852=Math.fround(__nfNumber(v1843) * __nfNumber(v1851));
v1838=Math.fround(__nfNumber(v1841) + v1852);
}
const v1853=v1838;
const v1854=__nfValue(v1853);
const v1855=v1832;
const v1856=__nfValue(v1833);
const v1857=v1855;
let v1858=__nfValue(v1856);
for(let v1859=0;v1859<v1857.length;v1859++){
const v1860=v1857[v1859];
const v1861=__nfValue(v1858);
const v1862=v1860;
const v1863=__nfValue(v1862["coefficient"]);
const v1864=v1860;
const v1865=v1864["wire"];
const v1866=v1865;
const v1867=v1829;
const v1868=v1866;
let v1869;if(v1868<v1867.length){v1869=v1867[v1868];}else{
v1869=__nfFromBits(0);}
const v1870=__nfValue(v1869);
const v1871=__nfValue(v1870);
const v1872=Math.fround(__nfNumber(v1863) * __nfNumber(v1871));
v1858=Math.fround(__nfNumber(v1861) + v1872);
}
const v1873=v1858;
const v1874=__nfValue(v1873);
const v1875=v1828;
const v1876=v1830;
const v1877=__nfValue(v1834);
const v1878=__nfValue(v1874);
const v1879=__fn46(v1878);
const v1880=Math.fround(__nfNumber(v1877) * __nfNumber(v1879));
const v1881=__fn57(v1875,v1876,v1880);
const v1882=__nfValue(v1874);
const v1883=__nfFromBits(0);
let v1884;if(((__nfNumber(v1882)) > (__nfNumber(v1883)))){
const v1885=v1881;
const v1886=v1832;
const v1887=__nfValue(v1834);
const v1888=__nfValue(v1854);
const v1889=Math.fround(__nfNumber(v1887) * __nfNumber(v1888));
v1884=__fn57(v1885,v1886,v1889);}else{
v1884=v1881;}
return v1884;}
function __fn61(v1890,v1891,v1892,v1893,v1894,v1895,v1896,v1897){
const v1898=v1891;
const v1899=v1892;
let v1900;if(v1899<v1898.length){v1900=v1898[v1899];}else{
v1900=__nfFromBits(0);}
const v1901=__nfValue(v1900);
const v1902=(v1893).length;
const v1903=v1902;
const v1904=0;
const v1905=((v1903) > (v1904));
let v1906=v1905;if(v1906){
const v1907=__nfValue(v1901);
const v1908=__nfFromBits(0);
const v1909=((__nfNumber(v1907)) < (__nfNumber(v1908)));
let v1910=v1909;if(v1910){
v1910=v1894;}
const v1911=v1910;
const v1912=false;
v1906=(v1911===v1912);}
const v1913=v1906;
let v1914=v1913;if(v1914){
const v1915=__nfValue(v1901);
const v1916=Math.fround(v1902);
const v1917=((__nfNumber(v1915)) >= (__nfNumber(v1916)));
let v1918=v1917;if(v1918){
v1918=v1895;}
const v1919=v1918;
const v1920=false;
v1914=(v1919===v1920);}
const v1921=v1914;
const v1922=__nfValue(v1901);
const v1923=__nfFromBits(0);
let v1924;if(((__nfNumber(v1922)) < (__nfNumber(v1923)))){
v1924=0;}else{
const v1925=__nfValue(v1901);
const v1926=Math.fround(v1902);
let v1927;if(((__nfNumber(v1925)) >= (__nfNumber(v1926)))){
const v1928=v1902;
const v1929=1;
v1927=(((v1928) - (v1929)) >>> 0);}else{
const v1930=__ink_from_float(__nfNumber(__nfValue(v1901)), "u32");
let v1931;if(Object.hasOwn(v1930,"Some")){
const v1932=v1930["Some"];
v1931=v1932;}else{
const v1933=null;
v1931=0;}
v1927=v1931;}
v1924=v1927;}
const v1934=v1924;
let v1935;if(v1921){
const v1936=v1890;
const v1937=v1893;
const v1938=v1934;
let v1939;if(v1938<v1937.length){v1939=v1937[v1938];}else{
v1939=0;}
const v1940=v1939;
const v1941=__nfValue(v1896);
v1935=__fn56(v1936,v1940,v1941);}else{
v1935=v1890;}
const v1942=v1935;
const v1943=v1893;
const v1944=Math.fround(Math.floor(__nfNumber(__nfValue(v1901))));
const v1945=v1894;
const v1946=v1895;
const v1947=(v1943).length;
const v1948=0;
let v1949;if((v1947===v1948)){
v1949=__nfFromBits(0);}else{
const v1950=__nfValue(v1944);
const v1951=__nfFromBits(0);
let v1952;if(((__nfNumber(v1950)) < (__nfNumber(v1951)))){
let v1953;if(v1945){
v1953=__nfFromBits(0);}else{
const v1954=v1943;
const v1955=0;
let v1956;if(v1955<v1954.length){v1956=v1954[v1955];}else{
v1956=0;}
const v1957=v1956;
const v1958=v1957;
const v1959=v1891;
const v1960=v1958;
let v1961;if(v1960<v1959.length){v1961=v1959[v1960];}else{
v1961=__nfFromBits(0);}
const v1962=__nfValue(v1961);
v1953=__nfValue(v1962);}
v1952=v1953;}else{
const v1963=__nfValue(v1944);
const v1964=Math.fround((v1943).length);
let v1965;if(((__nfNumber(v1963)) >= (__nfNumber(v1964)))){
let v1966;if(v1946){
v1966=__nfFromBits(0);}else{
const v1967=v1943;
const v1968=(v1943).length;
const v1969=1;
const v1970=(((v1968) - (v1969)) >>> 0);
let v1971;if(v1970<v1967.length){v1971=v1967[v1970];}else{
v1971=0;}
const v1972=v1971;
const v1973=v1972;
const v1974=v1891;
const v1975=v1973;
let v1976;if(v1975<v1974.length){v1976=v1974[v1975];}else{
v1976=__nfFromBits(0);}
const v1977=__nfValue(v1976);
v1966=__nfValue(v1977);}
v1965=v1966;}else{
const v1978=__ink_from_float(__nfNumber(__nfValue(v1944)), "u32");
let v1979;if(Object.hasOwn(v1978,"Some")){
const v1980=v1978["Some"];
v1979=v1980;}else{
const v1981=null;
v1979=0;}
const v1982=v1979;
const v1983=v1943;
const v1984=v1982;
let v1985;if(v1984<v1983.length){v1985=v1983[v1984];}else{
v1985=0;}
const v1986=v1985;
const v1987=v1986;
const v1988=v1891;
const v1989=v1987;
let v1990;if(v1989<v1988.length){v1990=v1988[v1989];}else{
v1990=__nfFromBits(0);}
const v1991=__nfValue(v1990);
v1965=__nfValue(v1991);}
v1952=v1965;}
v1949=v1952;}
const v1992=v1949;
const v1993=__nfValue(v1992);
const v1994=v1893;
const v1995=Math.fround(Math.floor(__nfNumber(__nfValue(v1901))));
const v1996=__nfFromBits(1065353216);
const v1997=Math.fround(__nfNumber(v1995) - v1996);
const v1998=v1894;
const v1999=v1895;
const v2000=(v1994).length;
const v2001=0;
let v2002;if((v2000===v2001)){
v2002=__nfFromBits(0);}else{
const v2003=v1997;
const v2004=__nfFromBits(0);
let v2005;if(((__nfNumber(v2003)) < (__nfNumber(v2004)))){
let v2006;if(v1998){
v2006=__nfFromBits(0);}else{
const v2007=v1994;
const v2008=0;
let v2009;if(v2008<v2007.length){v2009=v2007[v2008];}else{
v2009=0;}
const v2010=v2009;
const v2011=v2010;
const v2012=v1891;
const v2013=v2011;
let v2014;if(v2013<v2012.length){v2014=v2012[v2013];}else{
v2014=__nfFromBits(0);}
const v2015=__nfValue(v2014);
v2006=__nfValue(v2015);}
v2005=v2006;}else{
const v2016=v1997;
const v2017=Math.fround((v1994).length);
let v2018;if(((__nfNumber(v2016)) >= (__nfNumber(v2017)))){
let v2019;if(v1999){
v2019=__nfFromBits(0);}else{
const v2020=v1994;
const v2021=(v1994).length;
const v2022=1;
const v2023=(((v2021) - (v2022)) >>> 0);
let v2024;if(v2023<v2020.length){v2024=v2020[v2023];}else{
v2024=0;}
const v2025=v2024;
const v2026=v2025;
const v2027=v1891;
const v2028=v2026;
let v2029;if(v2028<v2027.length){v2029=v2027[v2028];}else{
v2029=__nfFromBits(0);}
const v2030=__nfValue(v2029);
v2019=__nfValue(v2030);}
v2018=v2019;}else{
const v2031=__ink_from_float(__nfNumber(v1997), "u32");
let v2032;if(Object.hasOwn(v2031,"Some")){
const v2033=v2031["Some"];
v2032=v2033;}else{
const v2034=null;
v2032=0;}
const v2035=v2032;
const v2036=v1994;
const v2037=v2035;
let v2038;if(v2037<v2036.length){v2038=v2036[v2037];}else{
v2038=0;}
const v2039=v2038;
const v2040=v2039;
const v2041=v1891;
const v2042=v2040;
let v2043;if(v2042<v2041.length){v2043=v2041[v2042];}else{
v2043=__nfFromBits(0);}
const v2044=__nfValue(v2043);
v2018=__nfValue(v2044);}
v2005=v2018;}
v2002=v2005;}
const v2045=v2002;
const v2046=__nfValue(v2045);
const v2047=Math.fround(__nfNumber(v1993) - __nfNumber(v2046));
const v2048=v1897;
const v2049=v2048["index"];
const v2050="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference";
let v2051;if((v2049===v2050)){
const v2052=v1942;
const v2053=v1892;
const v2054=__nfValue(v1896);
const v2055=v2047;
const v2056=Math.fround(__nfNumber(v2054) * v2055);
v2051=__fn56(v2052,v2053,v2056);}else{
v2051=v1942;}
return v2051;}
function __fn62(v2057,v2058,v2059,v2060,v2061,v2062){
const v2063=v2057;
const v2064=v2063;
const v2065="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
let v2066;if((v2064===v2065)){
const v2067=v2058;
const v2068=v2060;
const v2069=__nfValue(v2062);
const v2070=__fn56(v2067,v2068,v2069);
const v2071=v2061;
const v2072=__nfValue(v2062);
v2066=__fn56(v2070,v2071,v2072);}else{
const v2073=v2063;
const v2074="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
let v2075;if((v2073===v2074)){
const v2076=v2058;
const v2077=v2060;
const v2078=__nfValue(v2062);
const v2079=__fn56(v2076,v2077,v2078);
const v2080=v2061;
const v2081=__nfValue(v2062);
const v2082=__nfNeg(v2081);
v2075=__fn56(v2079,v2080,v2082);}else{
const v2083=v2063;
const v2084="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
let v2085;if((v2083===v2084)){
const v2086=v2058;
const v2087=v2060;
const v2088=__nfValue(v2062);
const v2089=v2059;
const v2090=v2061;
let v2091;if(v2090<v2089.length){v2091=v2089[v2090];}else{
v2091=__nfFromBits(0);}
const v2092=__nfValue(v2091);
const v2093=Math.fround(__nfNumber(v2088) * __nfNumber(v2092));
const v2094=__fn56(v2086,v2087,v2093);
const v2095=v2061;
const v2096=__nfValue(v2062);
const v2097=v2059;
const v2098=v2060;
let v2099;if(v2098<v2097.length){v2099=v2097[v2098];}else{
v2099=__nfFromBits(0);}
const v2100=__nfValue(v2099);
const v2101=Math.fround(__nfNumber(v2096) * __nfNumber(v2100));
v2085=__fn56(v2094,v2095,v2101);}else{
const v2102=v2058;
const v2103=v2060;
const v2104=v2059;
const v2105=v2061;
let v2106;if(v2105<v2104.length){v2106=v2104[v2105];}else{
v2106=__nfFromBits(0);}
const v2107=Math.fround((__nfNumber(__nfValue(v2062)))/(__nfNumber(__nfValue(v2106))));
const v2108=__fn56(v2102,v2103,v2107);
const v2109=v2061;
const v2110=__nfValue(v2062);
const v2111=v2059;
const v2112=v2060;
let v2113;if(v2112<v2111.length){v2113=v2111[v2112];}else{
v2113=__nfFromBits(0);}
const v2114=__nfValue(v2113);
const v2115=v2059;
const v2116=v2061;
let v2117;if(v2116<v2115.length){v2117=v2115[v2116];}else{
v2117=__nfFromBits(0);}
const v2118=__nfValue(v2117);
const v2119=v2059;
const v2120=v2061;
let v2121;if(v2120<v2119.length){v2121=v2119[v2120];}else{
v2121=__nfFromBits(0);}
const v2122=__nfValue(v2121);
const v2123=Math.fround((__nfNumber(Math.fround(__nfNumber(v2110) * __nfNumber(v2114))))/(__nfNumber(Math.fround(__nfNumber(v2118) * __nfNumber(v2122)))));
const v2124=__nfNeg(v2123);
v2085=__fn56(v2108,v2109,v2124);}
v2075=v2085;}
v2066=v2075;}
return v2066;}
function __fn63(v2125,v2126,v2127,v2128,v2129,v2130,v2131){
const v2132=v2125;
const v2133=v2132;
const v2134="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
let v2135;if((v2133===v2134)){
const v2136=v2126;
const v2137=v2128;
const v2138=__nfFromBits(1073741824);
const v2139=v2127;
const v2140=v2129;
let v2141;if(v2140<v2139.length){v2141=v2139[v2140];}else{
v2141=__nfFromBits(0);}
const v2142=__nfValue(v2141);
const v2143=Math.fround((__nfNumber(__nfValue(v2130)))/(__nfNumber(Math.fround(v2138 * __nfNumber(v2142)))));
v2135=__fn56(v2136,v2137,v2143);}else{
const v2144=v2132;
const v2145="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
let v2146;if((v2144===v2145)){
const v2147=v2126;
const v2148=v2128;
const v2149=__nfValue(v2130);
const v2150=__nfNeg(v2149);
v2146=__fn56(v2147,v2148,v2150);}else{
const v2151=v2132;
const v2152="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
let v2153;if((v2151===v2152)){
const v2154=v2127;
const v2155=v2128;
let v2156;if(v2155<v2154.length){v2156=v2154[v2155];}else{
v2156=__nfFromBits(0);}
let v2157;if(Number.isNaN(__nfNumber(__nfValue(v2156)))){
const v2158=v2126;
const v2159=v2128;
const v2160=__nfFromBits(2143289344);
v2157=__fn56(v2158,v2159,v2160);}else{
const v2161=v2127;
const v2162=v2128;
let v2163;if(v2162<v2161.length){v2163=v2161[v2162];}else{
v2163=__nfFromBits(0);}
const v2164=__nfValue(v2163);
const v2165=__nfFromBits(0);
let v2166;if(((__nfNumber(v2164)) > (__nfNumber(v2165)))){
const v2167=v2126;
const v2168=v2128;
const v2169=__nfValue(v2130);
v2166=__fn56(v2167,v2168,v2169);}else{
v2166=v2126;}
v2157=v2166;}
v2153=v2157;}else{
const v2170=v2131;
const v2171=v2170["boolean"];
const v2172="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough";
let v2173;if((v2171===v2172)){
const v2174=v2126;
const v2175=v2128;
const v2176=__nfValue(v2130);
v2173=__fn56(v2174,v2175,v2176);}else{
v2173=v2126;}
v2153=v2173;}
v2146=v2153;}
v2135=v2146;}
return v2135;}
function __fn64(v2177,v2178,v2179,v2180){
const v2181=v2178;
const v2182=v2181["wire"];
const v2183=1;
const v2184=(((v2182) - (v2183)) >>> 0);
const v2185=v2178;
const v2186=v2185["gradient"];
const v2187=v2186;
const v2188=v2184;
let v2189;if(v2188<v2187.length){v2189=v2187.item(v2188);}else{
v2189=__nfFromBits(0);}
const v2190=__nfValue(v2189);
const v2191=v2180;
const v2192=v2191["zero"];
const v2193="ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop";
const v2194=(v2192===v2193);
let v2195=v2194;if(v2195){
const v2196=__nfValue(v2190);
const v2197=__nfFromBits(0);
v2195=((__nfNumber(v2196)) === (__nfNumber(v2197)));}
let v2198;if(v2195){
const v2199=v2186;
const v2200=v2184;
v2198=({["gradient"]:v2199,["wire"]:v2200});}else{
const v2201=v2177;
const v2202=v2201["kind"];
const v2203=v2202;
const v2204="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v2205;if((v2203===v2204)){
v2205=v2186;}else{
const v2206=v2202;
const v2207="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v2208;if((v2206===v2207)){
const v2209=v2177;
const v2210=v2209["binary"];
const v2211=v2186;
const v2212=v2179;
const v2213=v2177;
const v2214=v2213["a"];
const v2215=v2177;
const v2216=v2215["b"];
const v2217=__nfValue(v2190);
v2208=__fn62(v2210,v2211,v2212,v2214,v2216,v2217);}else{
const v2218=v2202;
const v2219="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v2220;if((v2218===v2219)){
const v2221=v2177;
const v2222=v2221["unary"];
const v2223=v2186;
const v2224=v2179;
const v2225=v2177;
const v2226=v2225["a"];
const v2227=v2184;
const v2228=__nfValue(v2190);
const v2229=v2180;
v2220=__fn63(v2222,v2223,v2224,v2226,v2227,v2228,v2229);}else{
const v2230=v2202;
const v2231="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v2232;if((v2230===v2231)){
const v2233=v2186;
const v2234=v2177;
const v2235=v2234["terms"];
const v2236=__nfValue(v2190);
v2232=__fn57(v2233,v2235,v2236);}else{
const v2237=v2202;
const v2238="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v2239;if((v2237===v2238)){
const v2240=v2186;
const v2241=v2179;
const v2242=v2177;
const v2243=v2242["terms"];
const v2244=v2177;
const v2245=__nfValue(v2244["value"]);
const v2246=v2177;
const v2247=v2246["gates"];
const v2248=v2177;
const v2249=__nfValue(v2248["gate_bias"]);
const v2250=__nfValue(v2190);
v2239=__fn60(v2240,v2241,v2243,v2245,v2247,v2249,v2250);}else{
const v2251=v2202;
const v2252="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v2253;if((v2251===v2252)){
const v2254=v2179;
const v2255=v2177;
const v2256=v2255["a"];
let v2257;if(v2256<v2254.length){v2257=v2254[v2256];}else{
v2257=__nfFromBits(0);}
const v2258=__nfValue(v2257);
const v2259=__nfFromBits(0);
let v2260;if(((__nfNumber(v2258)) > (__nfNumber(v2259)))){
const v2261=v2186;
const v2262=v2177;
const v2263=v2262["c"];
const v2264=__nfValue(v2190);
v2260=__fn56(v2261,v2263,v2264);}else{
const v2265=v2186;
const v2266=v2177;
const v2267=v2266["b"];
const v2268=__nfValue(v2190);
v2260=__fn56(v2265,v2267,v2268);}
v2253=v2260;}else{
const v2269=v2186;
const v2270=v2179;
const v2271=v2177;
const v2272=v2271["a"];
const v2273=v2177;
const v2274=v2273["table"];
const v2275=v2177;
const v2276=v2275["below"];
const v2277=v2177;
const v2278=v2277["above"];
const v2279=__nfValue(v2190);
const v2280=v2180;
v2253=__fn61(v2269,v2270,v2272,v2274,v2276,v2278,v2279,v2280);}
v2239=v2253;}
v2232=v2239;}
v2220=v2232;}
v2208=v2220;}
v2205=v2208;}
const v2281=v2205;
const v2282=v2281;
const v2283=v2184;
v2198=({["gradient"]:v2282,["wire"]:v2283});}
return v2198;}
function __fn65(v2284,v2285,v2286,v2287){
const v2288=(v2285).length;
const v2289=v2284;
const v2290=v2289["inputs"];
const v2291=v2284;
const v2292=(v2291["nodes"]).length;
const v2293=(((v2290) + (v2292)) >>> 0);
const v2294=!(v2288===v2293);
let v2295=v2294;if(!v2295){
const v2296=(v2286).length;
const v2297=v2284;
const v2298=(v2297["roots"]).length;
v2295=!(v2296===v2298);}
const v2299=v2295;
let v2300=v2299;if(!v2300){
const v2301=v2284;
const v2302=v2301["inputs"];
const v2303=v2284;
const v2304=v2303["nodes"];
const v2305=v2284;
const v2306=v2305["roots"];
const v2307=__fn40(v2302,v2304,v2306);
const v2308=false;
v2300=(v2307===v2308);}
let v2309;if(v2300){
v2309=({Err:"cotangent shape"});}else{
const v2310=v2284;
const v2311=v2285;
const v2312=v2286;
const v2313=v2287;
v2309=__fn66(v2310,v2311,v2312,v2313);}
return v2309;}
function __fn66(v2314,v2315,v2316,v2317){
const v2318=v2314;
const v2319=v2318["nodes"];
let v2320=true;
for(let v2321=0;v2321<v2319.length;v2321++){
const v2322=v2319[v2321];
const v2323=v2320;
let v2324=v2323;if(v2324){
const v2325=v2322;
const v2326=v2317;
v2324=__fn59(v2325,v2326);}
v2320=v2324;
}
const v2327=v2320;
const v2328=v2327;
const v2329=false;
let v2330;if((v2328===v2329)){
v2330=({Err:"explicit gradient policy required"});}else{
const v2331=__bufferFill((v2315).length,__nfFromBits(0));
const v2332=0;
const v2333=v2316;
const v2334=v2331;
const v2335=v2332;
let v2336=({["g"]:v2334,["i"]:v2335});
for(let v2337=0;v2337<v2333.length;v2337++){
const v2338=v2333[v2337];
const v2339=v2336;
const v2340=v2339["g"];
const v2341=v2336;
const v2342=v2341["i"];
const v2343=v2340;
const v2344=v2314;
const v2345=v2344["roots"];
const v2346=v2342;
let v2347;if(v2346<v2345.length){v2347=v2345[v2346];}else{
v2347=0;}
const v2348=v2347;
const v2349=__nfValue(v2338);
const v2350=__fn56(v2343,v2348,v2349);
const v2351=v2342;
const v2352=1;
const v2353=(((v2351) + (v2352)) >>> 0);
const v2354=v2350;
const v2355=v2353;
v2336=({["g"]:v2354,["i"]:v2355});
}
const v2356=v2336;
const v2357=v2356;
const v2358=v2357["g"];
const v2359=v2356;
const v2360=v2359["i"];
const v2361=v2314;
const v2362=v2361["nodes"];
const v2363=v2358;
const v2364=(v2315).length;
let v2365=({["gradient"]:v2363,["wire"]:v2364});
for(let v2366=v2362.length-1;v2366>=0;v2366--){
const v2367=v2362[v2366];
const v2368=v2367;
const v2369=v2365;
const v2370=v2315;
const v2371=v2317;
v2365=__fn64(v2368,v2369,v2370,v2371);
}
const v2372=v2365;
const v2373=v2372;
const v2374=v2373["gradient"];
const v2375=v2374.freeze();
const v2376=v2314;
v2330=({Ok:v2375.slice(0,v2376["inputs"])});}
return v2330;}
function __fn67(v2377,v2378,v2379,v2380){
const v2381=(v2379).length;
const v2382=v2377;
const v2383=(v2382["roots"]).length;
let v2384;if(!(v2381===v2383)){
v2384=({Err:"cotangent shape"});}else{
const v2385=v2377;
const v2386=v2378;
const v2387=__fn54(v2385,v2386);
let v2388;if(Object.hasOwn(v2387,"Ok")){
const v2389=v2387["Ok"];
const v2390=v2389;
const v2391=v2377;
const v2392=v2390;
const v2393=v2392["values"];
const v2394=v2379;
const v2395=v2380;
const v2396=__fn66(v2391,v2393,v2394,v2395);
let v2397;if(Object.hasOwn(v2396,"Ok")){
const v2398=v2396["Ok"];
const v2399=v2398;
const v2400=v2390;
const v2401=v2400["outputs"];
const v2402=v2399;
v2397=({Ok:({["outputs"]:v2401,["gradient"]:v2402})});}else{
const v2403=v2396["Err"];
v2397=({Err:v2403});}
v2388=v2397;}else{
const v2404=v2387["Err"];
v2388=({Err:v2404});}
v2384=v2388;}
return v2384;}
function __fn68(v2405,v2406,v2407,v2408){
const v2409=(v2407).length;
const v2410=0;
const v2411=(v2409===v2410);
let v2412=v2411;if(!v2412){
const v2413=(v2407).length;
const v2414=v2405;
const v2415=(v2414["roots"]).length;
v2412=!(v2413===v2415);}
let v2416;if(v2412){
v2416=({Err:"target shape"});}else{
const v2417=v2405;
const v2418=v2406;
const v2419=__fn54(v2417,v2418);
let v2420;if(Object.hasOwn(v2419,"Ok")){
const v2421=v2419["Ok"];
const v2422=v2421;
const v2423=v2422;
const v2424=v2423["outputs"];
const v2425=v2407;
const v2426=Math.min(v2424.length,v2425.length);
const v2427=new Array(v2426);
for(let v2428=0;v2428<v2426;v2428++){
const v2429=v2424[v2428];
const v2430=v2425[v2428];
const v2431=__nfValue(v2429);
const v2432=__nfValue(v2430);
v2427[v2428]=Math.fround(__nfNumber(v2431) - __nfNumber(v2432));
}
const v2433=v2427;
const v2434=Math.fround((v2407).length);
const v2435=v2433;
const v2436=v2435.length;
const v2437=new Array(v2436);
for(let v2438=0;v2438<v2436;v2438++){
const v2439=v2435[v2438];
const v2440=__nfValue(v2439);
const v2441=__nfValue(v2439);
v2437[v2438]=Math.fround(__nfNumber(v2440) * __nfNumber(v2441));
}
const v2442=v2437;
let v2443=0;for(let v2444=0;v2444<v2442.length;v2444++){
const v2445=v2442[v2444];
v2443=Math.fround(__nfNumber(v2443) + __nfNumber(v2445));}
const v2446=Math.fround((__nfNumber(v2443))/(__nfNumber(__nfValue(v2434))));
const v2447=Number.isFinite(__nfNumber(v2446));
const v2448=false;
let v2449;if((v2447===v2448)){
v2449=({Err:"nonfinite loss"});}else{
const v2450=v2433;
const v2451=v2450.length;
const v2452=new Array(v2451);
for(let v2453=0;v2453<v2451;v2453++){
const v2454=v2450[v2453];
const v2455=__nfFromBits(1073741824);
const v2456=__nfValue(v2454);
v2452[v2453]=Math.fround((__nfNumber(Math.fround(v2455 * __nfNumber(v2456))))/(__nfNumber(__nfValue(v2434))));
}
const v2457=v2452;
const v2458=v2405;
const v2459=v2422;
const v2460=v2459["values"];
const v2461=v2457;
const v2462=v2408;
const v2463=__fn66(v2458,v2460,v2461,v2462);
let v2464;if(Object.hasOwn(v2463,"Ok")){
const v2465=v2463["Ok"];
const v2466=v2465;
const v2467=v2446;
const v2468=v2422;
const v2469=v2468["outputs"];
const v2470=v2466;
v2464=({Ok:({["loss"]:v2467,["outputs"]:v2469,["gradient"]:v2470})});}else{
const v2471=v2463["Err"];
v2464=({Err:v2471});}
v2449=v2464;}
v2420=v2449;}else{
const v2472=v2419["Err"];
v2420=({Err:v2472});}
v2416=v2420;}
return v2416;}
function __fn69(v2473){
const v2474=__nfValue(v2473);
const v2475=__nfFromBits(1063675494);
const v2476=__nfFromBits(1065336439);
const v2477=__nfFromBits(841731191);
const v2478=__nfFromBits(0);
const v2479=__nfFromBits(1065353216);
return ({["rate"]:v2474,["first_decay"]:v2475,["second_decay"]:v2476,["epsilon"]:v2477,["weight_decay"]:v2478,["norm_limit"]:v2479});}
function __fn70(v2480){
const v2481=v2480;
let v2482=true;
for(let v2483=0;v2483<v2481.length;v2483++){
const v2484=v2481[v2483];
const v2485=v2482;
let v2486=v2485;if(v2486){
v2486=Number.isFinite(__nfNumber(__nfValue(v2484)));}
v2482=v2486;
}
return v2482;}
function __fn71(v2487){
const v2488=v2487;
const v2489=(v2488["weights"]).length;
const v2490=v2487;
const v2491=(v2490["first"]).length;
const v2492=(v2489===v2491);
let v2493=v2492;if(v2493){
const v2494=v2487;
const v2495=(v2494["weights"]).length;
const v2496=v2487;
const v2497=(v2496["second"]).length;
v2493=(v2495===v2497);}
const v2498=v2493;
let v2499=v2498;if(v2499){
const v2500=v2487;
const v2501=v2500["weights"];
v2499=__fn70(v2501);}
const v2502=v2499;
let v2503=v2502;if(v2503){
const v2504=v2487;
const v2505=v2504["first"];
v2503=__fn70(v2505);}
const v2506=v2503;
let v2507=v2506;if(v2507){
const v2508=v2487;
const v2509=v2508["second"];
v2507=__fn70(v2509);}
const v2510=v2507;
let v2511=v2510;if(v2511){
const v2512=v2487;
const v2513=v2512["second"];
let v2514=true;
for(let v2515=0;v2515<v2513.length;v2515++){
const v2516=v2513[v2515];
const v2517=v2514;
let v2518=v2517;if(v2518){
const v2519=__nfValue(v2516);
const v2520=__nfFromBits(0);
v2518=((__nfNumber(v2519)) >= (__nfNumber(v2520)));}
v2514=v2518;
}
v2511=v2514;}
const v2521=v2511;
let v2522=v2521;if(v2522){
const v2523=v2487;
const v2524=__nfValue(v2523["first_power"]);
const v2525=__nfFromBits(0);
v2522=((__nfNumber(v2524)) >= (__nfNumber(v2525)));}
const v2526=v2522;
let v2527=v2526;if(v2527){
const v2528=v2487;
const v2529=__nfValue(v2528["first_power"]);
const v2530=__nfFromBits(1065353216);
v2527=((__nfNumber(v2529)) <= (__nfNumber(v2530)));}
const v2531=v2527;
let v2532=v2531;if(v2532){
const v2533=v2487;
const v2534=__nfValue(v2533["second_power"]);
const v2535=__nfFromBits(0);
v2532=((__nfNumber(v2534)) >= (__nfNumber(v2535)));}
const v2536=v2532;
let v2537=v2536;if(v2537){
const v2538=v2487;
const v2539=__nfValue(v2538["second_power"]);
const v2540=__nfFromBits(1065353216);
v2537=((__nfNumber(v2539)) <= (__nfNumber(v2540)));}
return v2537;}
function __fn72(v2541){
const v2542=v2541;
const v2543=__fn70(v2542);
const v2544=false;
let v2545;if((v2543===v2544)){
v2545=({Err:"nonfinite weights"});}else{
const v2546=v2541;
const v2547=v2546.length;
const v2548=new Array(v2547);
for(let v2549=0;v2549<v2547;v2549++){
const v2550=v2546[v2549];
v2548[v2549]=__nfFromBits(0);
}
const v2551=v2548;
const v2552=v2541;
const v2553=v2551;
const v2554=v2551;
const v2555=0;
const v2556=__nfFromBits(1065353216);
const v2557=__nfFromBits(1065353216);
v2545=({Ok:({["weights"]:v2552,["first"]:v2553,["second"]:v2554,["steps"]:v2555,["first_power"]:v2556,["second_power"]:v2557})});}
return v2545;}
function __fn73(v2558){
const v2559=v2558;
const v2560=Number.isFinite(__nfNumber(__nfValue(v2559["rate"])));
let v2561=v2560;if(v2561){
const v2562=v2558;
const v2563=__nfValue(v2562["rate"]);
const v2564=__nfFromBits(0);
v2561=((__nfNumber(v2563)) > (__nfNumber(v2564)));}
const v2565=v2561;
let v2566=v2565;if(v2566){
const v2567=v2558;
const v2568=__nfValue(v2567["first_decay"]);
const v2569=__nfFromBits(0);
v2566=((__nfNumber(v2568)) >= (__nfNumber(v2569)));}
const v2570=v2566;
let v2571=v2570;if(v2571){
const v2572=v2558;
const v2573=__nfValue(v2572["first_decay"]);
const v2574=__nfFromBits(1065353216);
v2571=((__nfNumber(v2573)) < (__nfNumber(v2574)));}
const v2575=v2571;
let v2576=v2575;if(v2576){
const v2577=v2558;
const v2578=__nfValue(v2577["second_decay"]);
const v2579=__nfFromBits(0);
v2576=((__nfNumber(v2578)) >= (__nfNumber(v2579)));}
const v2580=v2576;
let v2581=v2580;if(v2581){
const v2582=v2558;
const v2583=__nfValue(v2582["second_decay"]);
const v2584=__nfFromBits(1065353216);
v2581=((__nfNumber(v2583)) < (__nfNumber(v2584)));}
const v2585=v2581;
let v2586=v2585;if(v2586){
const v2587=v2558;
v2586=Number.isFinite(__nfNumber(__nfValue(v2587["epsilon"])));}
const v2588=v2586;
let v2589=v2588;if(v2589){
const v2590=v2558;
const v2591=__nfValue(v2590["epsilon"]);
const v2592=__nfFromBits(0);
v2589=((__nfNumber(v2591)) > (__nfNumber(v2592)));}
const v2593=v2589;
let v2594=v2593;if(v2594){
const v2595=v2558;
v2594=Number.isFinite(__nfNumber(__nfValue(v2595["weight_decay"])));}
const v2596=v2594;
let v2597=v2596;if(v2597){
const v2598=v2558;
const v2599=__nfValue(v2598["weight_decay"]);
const v2600=__nfFromBits(0);
v2597=((__nfNumber(v2599)) >= (__nfNumber(v2600)));}
const v2601=v2597;
let v2602=v2601;if(v2602){
const v2603=v2558;
v2602=Number.isFinite(__nfNumber(__nfValue(v2603["norm_limit"])));}
const v2604=v2602;
let v2605=v2604;if(v2605){
const v2606=v2558;
const v2607=__nfValue(v2606["norm_limit"]);
const v2608=__nfFromBits(0);
v2605=((__nfNumber(v2607)) >= (__nfNumber(v2608)));}
return v2605;}
function __fn74(v2609){
const v2610=__nfValue(v2609);
const v2611=__nfFromBits(0);
let v2612;if(((__nfNumber(v2610)) < (__nfNumber(v2611)))){
const v2613=__nfValue(v2609);
v2612=__nfNeg(v2613);}else{
v2612=__nfValue(v2609);}
return v2612;}
function __fn75(v2614,v2615){
const v2616=__nfValue(v2615);
const v2617=__nfFromBits(0);
let v2618;if(((__nfNumber(v2616)) === (__nfNumber(v2617)))){
v2618=__nfFromBits(1065353216);}else{
const v2619=v2614;
let v2620=__nfFromBits(0);
for(let v2621=0;v2621<v2619.length;v2621++){
const v2622=v2619[v2621];
const v2623=__nfValue(v2622);
const v2624=__fn74(v2623);
const v2625=__nfValue(v2620);
let v2626;if(((__nfNumber(v2624)) > (__nfNumber(v2625)))){
const v2627=__nfValue(v2622);
v2626=__fn74(v2627);}else{
v2626=__nfValue(v2620);}
v2620=v2626;
}
const v2628=v2620;
const v2629=__nfValue(v2628);
const v2630=__nfFromBits(0);
let v2631;if(((__nfNumber(v2629)) === (__nfNumber(v2630)))){
v2631=__nfFromBits(1065353216);}else{
const v2632=v2614;
let v2633=__nfFromBits(0);
for(let v2634=0;v2634<v2632.length;v2634++){
const v2635=v2632[v2634];
const v2636=__nfValue(v2633);
const v2637=Math.fround((__nfNumber(__nfValue(v2635)))/(__nfNumber(__nfValue(v2628))));
const v2638=Math.fround((__nfNumber(__nfValue(v2635)))/(__nfNumber(__nfValue(v2628))));
const v2639=Math.fround(v2637 * v2638);
v2633=Math.fround(__nfNumber(v2636) + v2639);
}
const v2640=v2633;
const v2641=Math.fround((__nfNumber(Math.fround((__nfNumber(__nfValue(v2615)))/(__nfNumber(__nfValue(v2628))))))/(__nfNumber(Math.fround(Math.sqrt(__nfNumber(__nfValue(v2640)))))));
const v2642=v2641;
const v2643=__nfFromBits(1065353216);
let v2644;if(((__nfNumber(v2642)) < (__nfNumber(v2643)))){
v2644=v2641;}else{
v2644=__nfFromBits(1065353216);}
v2631=v2644;}
v2618=v2631;}
return v2618;}
function __fn76(v2645,v2646,v2647,v2648,v2649,v2650){
const v2651=__nfValue(v2645);
const v2652=v2650;
const v2653=__nfValue(v2652["rate"]);
const v2654=__nfFromBits(1065353216);
const v2655=__nfValue(v2648);
const v2656=Math.fround((__nfNumber(__nfValue(v2646)))/(__nfNumber(Math.fround(v2654 - __nfNumber(v2655)))));
const v2657=__nfFromBits(1065353216);
const v2658=__nfValue(v2649);
const v2659=Math.fround(Math.sqrt(__nfNumber(Math.fround((__nfNumber(__nfValue(v2647)))/(__nfNumber(Math.fround(v2657 - __nfNumber(v2658))))))));
const v2660=v2650;
const v2661=__nfValue(v2660["epsilon"]);
const v2662=Math.fround((__nfNumber(Math.fround(__nfNumber(v2653) * v2656)))/(__nfNumber(Math.fround(v2659 + __nfNumber(v2661)))));
return Math.fround(__nfNumber(v2651) - v2662);}
function __fn77(v2663,v2664,v2665){
const v2666=v2663;
const v2667=__fn71(v2666);
const v2668=false;
const v2669=(v2667===v2668);
let v2670=v2669;if(!v2670){
const v2671=v2665;
const v2672=__fn73(v2671);
const v2673=false;
v2670=(v2672===v2673);}
const v2674=v2670;
let v2675=v2674;if(!v2675){
const v2676=(v2664).length;
const v2677=v2663;
const v2678=(v2677["weights"]).length;
v2675=!(v2676===v2678);}
const v2679=v2675;
let v2680=v2679;if(!v2680){
const v2681=v2664;
const v2682=__fn70(v2681);
const v2683=false;
v2680=(v2682===v2683);}
const v2684=v2680;
let v2685=v2684;if(!v2685){
const v2686=v2663;
const v2687=v2686["steps"];
const v2688=4294967295;
v2685=(v2687===v2688);}
let v2689;if(v2685){
v2689=({Err:"optimizer domain"});}else{
const v2690=new __InkBuffer([]);
const v2691=0;
const v2692=v2664;
const v2693=v2690;
const v2694=v2691;
let v2695=({["adjusted"]:v2693,["i"]:v2694});
for(let v2696=0;v2696<v2692.length;v2696++){
const v2697=v2692[v2696];
const v2698=v2695;
const v2699=v2698["adjusted"];
const v2700=v2695;
const v2701=v2700["i"];
const v2702=v2699;
const v2703=__nfValue(v2697);
const v2704=v2665;
const v2705=__nfValue(v2704["weight_decay"]);
const v2706=v2663;
const v2707=v2706["weights"];
const v2708=v2701;
let v2709;if(v2708<v2707.length){v2709=v2707[v2708];}else{
v2709=__nfFromBits(0);}
const v2710=__nfValue(v2709);
const v2711=Math.fround(__nfNumber(v2705) * __nfNumber(v2710));
const v2712=Math.fround(__nfNumber(v2703) + v2711);
const v2713=__tempEdit(v2702,"push",v2712);
const v2714=v2701;
const v2715=1;
const v2716=(((v2714) + (v2715)) >>> 0);
const v2717=v2713;
const v2718=v2716;
v2695=({["adjusted"]:v2717,["i"]:v2718});
}
const v2719=v2695;
const v2720=v2719;
const v2721=v2720["adjusted"];
const v2722=v2719;
const v2723=v2722["i"];
const v2724=v2721;
const v2725=v2724.freeze();
const v2726=v2725;
const v2727=__fn70(v2726);
const v2728=false;
let v2729;if((v2727===v2728)){
v2729=({Err:"nonfinite gradient"});}else{
const v2730=v2725;
const v2731=v2665;
const v2732=__nfValue(v2731["norm_limit"]);
const v2733=__fn75(v2730,v2732);
const v2734=v2663;
const v2735=__nfValue(v2734["first_power"]);
const v2736=v2665;
const v2737=__nfValue(v2736["first_decay"]);
const v2738=Math.fround(__nfNumber(v2735) * __nfNumber(v2737));
const v2739=v2663;
const v2740=__nfValue(v2739["second_power"]);
const v2741=v2665;
const v2742=__nfValue(v2741["second_decay"]);
const v2743=Math.fround(__nfNumber(v2740) * __nfNumber(v2742));
const v2744=new __InkBuffer([]);
const v2745=new __InkBuffer([]);
const v2746=new __InkBuffer([]);
const v2747=0;
const v2748=v2725;
const v2749=v2745;
const v2750=v2747;
const v2751=v2746;
const v2752=v2744;
let v2753=({["first"]:v2749,["i"]:v2750,["second"]:v2751,["weights"]:v2752});
for(let v2754=0;v2754<v2748.length;v2754++){
const v2755=v2748[v2754];
const v2756=v2753;
const v2757=v2756["first"];
const v2758=v2753;
const v2759=v2758["i"];
const v2760=v2753;
const v2761=v2760["second"];
const v2762=v2753;
const v2763=v2762["weights"];
const v2764=__nfValue(v2755);
const v2765=__nfValue(v2733);
const v2766=Math.fround(__nfNumber(v2764) * __nfNumber(v2765));
const v2767=v2665;
const v2768=__nfValue(v2767["first_decay"]);
const v2769=v2663;
const v2770=v2769["first"];
const v2771=v2759;
let v2772;if(v2771<v2770.length){v2772=v2770[v2771];}else{
v2772=__nfFromBits(0);}
const v2773=__nfValue(v2772);
const v2774=Math.fround(__nfNumber(v2768) * __nfNumber(v2773));
const v2775=__nfFromBits(1065353216);
const v2776=v2665;
const v2777=__nfValue(v2776["first_decay"]);
const v2778=Math.fround(v2775 - __nfNumber(v2777));
const v2779=v2766;
const v2780=Math.fround(v2778 * v2779);
const v2781=Math.fround(v2774 + v2780);
const v2782=v2665;
const v2783=__nfValue(v2782["second_decay"]);
const v2784=v2663;
const v2785=v2784["second"];
const v2786=v2759;
let v2787;if(v2786<v2785.length){v2787=v2785[v2786];}else{
v2787=__nfFromBits(0);}
const v2788=__nfValue(v2787);
const v2789=Math.fround(__nfNumber(v2783) * __nfNumber(v2788));
const v2790=__nfFromBits(1065353216);
const v2791=v2665;
const v2792=__nfValue(v2791["second_decay"]);
const v2793=Math.fround(v2790 - __nfNumber(v2792));
const v2794=v2766;
const v2795=Math.fround(v2793 * v2794);
const v2796=v2766;
const v2797=Math.fround(v2795 * v2796);
const v2798=Math.fround(v2789 + v2797);
const v2799=v2663;
const v2800=v2799["weights"];
const v2801=v2759;
let v2802;if(v2801<v2800.length){v2802=v2800[v2801];}else{
v2802=__nfFromBits(0);}
const v2803=__nfValue(v2802);
const v2804=v2781;
const v2805=v2798;
const v2806=v2738;
const v2807=v2743;
const v2808=v2665;
const v2809=__fn76(v2803,v2804,v2805,v2806,v2807,v2808);
const v2810=v2763;
const v2811=__nfValue(v2809);
const v2812=__tempEdit(v2810,"push",v2811);
const v2813=v2757;
const v2814=v2781;
const v2815=__tempEdit(v2813,"push",v2814);
const v2816=v2761;
const v2817=v2798;
const v2818=__tempEdit(v2816,"push",v2817);
const v2819=v2759;
const v2820=1;
const v2821=(((v2819) + (v2820)) >>> 0);
const v2822=v2815;
const v2823=v2821;
const v2824=v2818;
const v2825=v2812;
v2753=({["first"]:v2822,["i"]:v2823,["second"]:v2824,["weights"]:v2825});
}
const v2826=v2753;
const v2827=v2826;
const v2828=v2827["first"];
const v2829=v2826;
const v2830=v2829["i"];
const v2831=v2826;
const v2832=v2831["second"];
const v2833=v2826;
const v2834=v2833["weights"];
const v2835=v2834;
const v2836=v2835.freeze();
const v2837=v2828;
const v2838=v2837.freeze();
const v2839=v2832;
const v2840=v2839.freeze();
const v2841=v2663;
const v2842=v2841["steps"];
const v2843=1;
const v2844=(((v2842) + (v2843)) >>> 0);
const v2845=v2738;
const v2846=v2743;
const v2847=({["weights"]:v2836,["first"]:v2838,["second"]:v2840,["steps"]:v2844,["first_power"]:v2845,["second_power"]:v2846});
const v2848=v2847;
const v2849=__fn71(v2848);
const v2850=false;
let v2851;if((v2849===v2850)){
v2851=({Err:"nonfinite optimizer update"});}else{
v2851=({Ok:v2847});}
v2729=v2851;}
v2689=v2729;}
return v2689;}
function __into36(v2852,v2853){
const v2854=v2852;
const v2855=v2854["kind"];
const v2856=v2855;
const v2857="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
let v2858;if((v2856===v2857)){
const v2859=[];
const v2860=v2859.length;
for(let v2861=0;v2861<v2860;v2861++){
v2853[v2861]=v2859[v2861];
}
v2858=v2860;}else{
const v2862=v2855;
const v2863="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
let v2864;if((v2862===v2863)){
const v2865=v2852;
const v2866=v2865["a"];
const v2867=v2852;
const v2868=v2867["b"];
const v2869=[v2866,v2868];
const v2870=v2869.length;
for(let v2871=0;v2871<v2870;v2871++){
v2853[v2871]=v2869[v2871];
}
v2864=v2870;}else{
const v2872=v2855;
const v2873="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
let v2874;if((v2872===v2873)){
const v2875=v2852;
const v2876=v2875["a"];
const v2877=[v2876];
const v2878=v2877.length;
for(let v2879=0;v2879<v2878;v2879++){
v2853[v2879]=v2877[v2879];
}
v2874=v2878;}else{
const v2880=v2855;
const v2881="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
let v2882;if((v2880===v2881)){
const v2883=v2852;
const v2884=v2883["terms"];
const v2885=v2884.length;
for(let v2887=0;v2887<v2885;v2887++){
const v2888=v2884[v2887];
const v2889=v2888;
v2853[v2887]=v2889["wire"];
}
v2882=v2885;}else{
const v2890=v2855;
const v2891="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
let v2892;if((v2890===v2891)){
const v2893=v2852;
const v2894=v2893["terms"];
const v2895=v2894.length;
const v2896=new Array(v2895);
for(let v2897=0;v2897<v2895;v2897++){
const v2898=v2894[v2897];
const v2899=v2898;
v2896[v2897]=v2899["wire"];
}
const v2900=v2896;
const v2901=v2852;
const v2902=v2901["gates"];
const v2903=v2902.length;
const v2904=new Array(v2903);
for(let v2905=0;v2905<v2903;v2905++){
const v2906=v2902[v2905];
const v2907=v2906;
v2904[v2905]=v2907["wire"];
}
const v2908=v2904;
const v2909=v2900.length;
const v2910=v2908.length;
for(let v2911=0;v2911<v2909;v2911++){
v2853[0+v2911]=v2900[v2911];
}
for(let v2912=0;v2912<v2910;v2912++){
v2853[v2909+v2912]=v2908[v2912];
}
const v2913=v2909+v2910;
v2892=v2913;}else{
const v2914=v2855;
const v2915="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
let v2916;if((v2914===v2915)){
const v2917=v2852;
const v2918=v2917["a"];
const v2919=v2852;
const v2920=v2919["b"];
const v2921=v2852;
const v2922=v2921["c"];
const v2923=[v2918,v2920,v2922];
const v2924=v2923.length;
for(let v2925=0;v2925<v2924;v2925++){
v2853[v2925]=v2923[v2925];
}
v2916=v2924;}else{
const v2926=v2852;
const v2927=v2926["a"];
const v2928=[v2927];
const v2929=v2852;
const v2930=v2929["table"];
const v2931=v2928.length;
const v2932=v2930.length;
for(let v2933=0;v2933<v2931;v2933++){
v2853[0+v2933]=v2928[v2933];
}
for(let v2934=0;v2934<v2932;v2934++){
v2853[v2931+v2934]=v2930[v2934];
}
const v2935=v2931+v2932;
v2916=v2935;}
v2892=v2916;}
v2882=v2892;}
v2874=v2882;}
v2864=v2874;}
v2858=v2864;}
return v2858;}
function __prepareFn5(fixed){const v3005=true;let v3004=false,v3003;
const v3016=fixed[2];let v3015=false,v3014;
const v3021=fixed[0]&&fixed[2];let v3020=false,v3019;
const v3030=fixed[0]&&fixed[2];let v3029=false,v3028;
const v3039=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3038=false,v3037;
const v3081=true;let v3080=false,v3079;
return function(v2974,v2975,v2976,v2977){const v2978=v2974;
const v2979=v2978["valid"];
const v2980=false;
const v2981=(v2979===v2980);
let v2982=v2981;if(!v2982){
const v2983=v2974;
const v2984=v2983["parameters"];
const v2985=v2977;
v2982=((v2984) > (v2985));}
const v2986=v2982;
let v2987=v2986;if(!v2987){
const v2988=v2974;
const v2989=v2988["nodes"];
const v2990=v2977;
v2987=((v2989) > (v2990));}
const v2991=v2987;
let v2992=v2991;if(!v2992){
const v2993=v2974;
const v2994=v2993["width"];
const v2995=v2977;
v2992=((v2994) > (v2995));}
const v2996=v2992;
let v2997=v2996;if(!v2997){
const v2998=v2975;
const v2999=v2977;
v2997=((v2998) > (v2999));}
const v3000=v2997;
let v3001;if(v3000){
let v3002;if(v3005&&v3004){v3002=v3003;}else{
v3002=false;if(v3005){v3003=v3002;v3004=true;}}
const v3006=v2974;
const v3007=v3006["parameters"];
const v3008=v2974;
const v3009=v3008["nodes"];
const v3010=v2974;
const v3011=v3010["width"];
const v3012=v3002;
v3001=({["parameters"]:v3007,["nodes"]:v3009,["width"]:v3011,["valid"]:v3012});}else{
let v3013;if(v3016&&v3015){v3013=v3014;}else{
let v3017;if(v2976){
v3017=2;}else{
v3017=1;}
v3013=v3017;if(v3016){v3014=v3013;v3015=true;}}
let v3018;if(v3021&&v3020){v3018=v3019;}else{
const v3022=v2974;
const v3023=v3022["width"];
const v3024=1;
const v3025=(((v3023) + (v3024)) >>> 0);
const v3026=v3013;
v3018=(Math.imul(v3025,v3026) >>> 0);if(v3021){v3019=v3018;v3020=true;}}
let v3027;if(v3030&&v3029){v3027=v3028;}else{
const v3031=v2974;
const v3032=v3031["width"];
const v3033=v3013;
const v3034=(Math.imul(v3032,v3033) >>> 0);
const v3035=1;
v3027=(((v3034) + (v3035)) >>> 0);if(v3030){v3028=v3027;v3029=true;}}
let v3036;if(v3039&&v3038){v3036=v3037;}else{
const v3040=v2975;
const v3041=v2977;
const v3042=v2974;
const v3043=v3042["parameters"];
const v3044=(((v3041) - (v3043)) >>> 0);
const v3045=v3018;
let v3046;if(v3045===0 ){
v3046=0;}else{
v3046=(Math.trunc(v3044/v3045)+0);}
const v3047=v3046;
const v3048=((v3040) <= (v3047));
let v3049=v3048;if(v3049){
const v3050=v3027;
const v3051=0;
const v3052=(v3050===v3051);
let v3053=v3052;if(!v3053){
const v3054=v2975;
const v3055=v2977;
const v3056=v2974;
const v3057=v3056["nodes"];
const v3058=(((v3055) - (v3057)) >>> 0);
const v3059=v3027;
let v3060;if(v3059===0 ){
v3060=0;}else{
v3060=(Math.trunc(v3058/v3059)+0);}
const v3061=v3060;
v3053=((v3054) <= (v3061));}
v3049=v3053;}
v3036=v3049;if(v3039){v3037=v3036;v3038=true;}}
const v3062=v3036;
let v3063;if(v3062){
const v3064=v2974;
const v3065=v3064["parameters"];
const v3066=v3018;
const v3067=v2975;
const v3068=(Math.imul(v3066,v3067) >>> 0);
const v3069=(((v3065) + (v3068)) >>> 0);
const v3070=v2974;
const v3071=v3070["nodes"];
const v3072=v3027;
const v3073=v2975;
const v3074=(Math.imul(v3072,v3073) >>> 0);
const v3075=(((v3071) + (v3074)) >>> 0);
const v3076=v2975;
const v3077=true;
v3063=({["parameters"]:v3069,["nodes"]:v3075,["width"]:v3076,["valid"]:v3077});}else{
let v3078;if(v3081&&v3080){v3078=v3079;}else{
v3078=false;if(v3081){v3079=v3078;v3080=true;}}
const v3082=v2974;
const v3083=v3082["parameters"];
const v3084=v2974;
const v3085=v3084["nodes"];
const v3086=v2974;
const v3087=v3086["width"];
const v3088=v3078;
v3063=({["parameters"]:v3083,["nodes"]:v3085,["width"]:v3087,["valid"]:v3088});}
v3001=v3063;}
return v3001;};}
function __prepareFn11(fixed){const v3104=fixed[0];let v3103=false,v3102;
const v3112=fixed[0]&&fixed[1]&&fixed[3];let v3111=false,v3110;
const v3129=fixed[0]&&fixed[1]&&fixed[3];let v3128=false,v3127;
const v3134=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3133=false,v3132;
const v3164=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3163=false,v3162;
const v3172=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3171=false,v3170;
const v3186=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3185=false,v3184;
const v3224=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3223=false,v3222;
const v3233=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3232=false,v3231;
const v3239=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v3238=false,v3237;
return function(v3089,v3090,v3091,v3092){const v3093=v3092;
const v3094=1000000;
const v3095=((v3093) > (v3094));
let v3096=v3095;if(!v3096){
const v3097=v3089;
const v3098=v3092;
v3096=((v3097) > (v3098));}
const v3099=v3096;
let v3100;if(v3099){
v3100=({Err:"network capacity"});}else{
let v3101;if(v3104&&v3103){v3101=v3102;}else{
const v3105=0;
const v3106=0;
const v3107=v3089;
const v3108=true;
v3101=({["parameters"]:v3105,["nodes"]:v3106,["width"]:v3107,["valid"]:v3108});if(v3104){v3102=v3101;v3103=true;}}
let v3109;if(v3112&&v3111){v3109=v3110;}else{
const v3113=v3090;
const v3114=v3101;
let v3115=({["shape"]:v3114});
for(let v3116=0;v3116<v3113.length;v3116++){
const v3117=(v3113[v3116]>>>0);
const v3118=v3115;
const v3119=v3118["shape"];
const v3120=v3119;
const v3121=v3117;
const v3122=true;
const v3123=v3092;
const v3124=__fn5(v3120,v3121,v3122,v3123);
const v3125=v3124;
v3115=({["shape"]:v3125});
}
v3109=v3115;if(v3112){v3110=v3109;v3111=true;}}
let v3126;if(v3129&&v3128){v3126=v3127;}else{
const v3130=v3109;
v3126=v3130["shape"];if(v3129){v3127=v3126;v3128=true;}}
let v3131;if(v3134&&v3133){v3131=v3132;}else{
const v3135=v3126;
const v3136=v3091;
const v3137=false;
const v3138=v3092;
v3131=__fn5(v3135,v3136,v3137,v3138);if(v3134){v3132=v3131;v3133=true;}}
const v3139=v3131;
const v3140=v3139["valid"];
const v3141=false;
const v3142=(v3140===v3141);
let v3143=v3142;if(!v3143){
const v3144=v3089;
const v3145=v3092;
const v3146=v3131;
const v3147=v3146["parameters"];
const v3148=(((v3145) - (v3147)) >>> 0);
v3143=((v3144) > (v3148));}
const v3149=v3143;
let v3150=v3149;if(!v3150){
const v3151=v3131;
const v3152=v3151["nodes"];
const v3153=v3092;
const v3154=v3131;
const v3155=v3154["parameters"];
const v3156=(((v3153) - (v3155)) >>> 0);
const v3157=v3089;
const v3158=(((v3156) - (v3157)) >>> 0);
v3150=((v3152) > (v3158));}
const v3159=v3150;
let v3160;if(v3159){
v3160=({Err:"network capacity"});}else{
let v3161;if(v3164&&v3163){v3161=v3162;}else{
const v3165=v3131;
const v3166=v3165["parameters"];
const v3167=v3089;
v3161=(((v3166) + (v3167)) >>> 0);if(v3164){v3162=v3161;v3163=true;}}
const v3168=new __InkBuffer([]);
let v3169;if(v3172&&v3171){v3169=v3170;}else{
const v3173=v3089;
let v3174=v3168;
for(let v3175=0;v3175<v3173;v3175++){
if(false){break;}
const v3176=(v3175>>>0);
const v3177=v3174;
const v3178=v3131;
const v3179=v3178["parameters"];
const v3180=v3176;
const v3181=(((v3179) + (v3180)) >>> 0);
v3174=__tempEdit(v3177,"push",v3181);}
const v3182=v3174;
v3169=v3182.freeze();if(v3172){v3170=v3169;v3171=true;}}
let v3183;if(v3186&&v3185){v3183=v3184;}else{
v3183=v3169;if(v3186){v3184=v3183;v3185=true;}}
const v3188=new __InkBuffer([]);
const v3189=new __InkBuffer([]);
const v3190=0;
const v3191=v3161;
const v3187=({["nodes"]:v3188,["outputs"]:v3189,["parameter"]:v3190,["inputs"]:v3191});
const v3193=v3090;
const v3194=v3187;
const v3195=v3183;
let v3196=({["layer"]:v3194,["wires"]:v3195});
for(let v3197=0;v3197<v3193.length;v3197++){
const v3198=(v3193[v3197]>>>0);
const v3199=v3196;
const v3200=v3199["layer"];
const v3201=v3196;
const v3202=v3201["wires"];
const v3203=v3200;
const v3204=v3198;
const v3205=v3202;
const v3206=__fn9(v3203,v3204,v3205);
const v3207=v3206;
const v3208=v3207["outputs"];
const v3209=v3208.freeze();
const v3210=v3206;
const v3211=v3210["nodes"];
const v3212=new __InkBuffer([]);
const v3213=v3206;
const v3214=v3213["parameter"];
const v3215=v3161;
const v3216=({["nodes"]:v3211,["outputs"]:v3212,["parameter"]:v3214,["inputs"]:v3215});
const v3217=v3216;
const v3218=v3209;
v3196=({["layer"]:v3217,["wires"]:v3218});
}
const v3192=v3196;
const v3220=v3192;
const v3219=v3220["layer"];
let v3221;if(v3224&&v3223){v3221=v3222;}else{
const v3225=v3192;
v3221=v3225["wires"];if(v3224){v3222=v3221;v3223=true;}}
const v3227=v3219;
const v3228=v3091;
const v3229=v3221;
const v3226=__fn10(v3227,v3228,v3229);
let v3230;if(v3233&&v3232){v3230=v3231;}else{
const v3234=v3226;
const v3235=v3234["nodes"];
v3230=v3235.freeze();if(v3233){v3231=v3230;v3232=true;}}
let v3236;if(v3239&&v3238){v3236=v3237;}else{
const v3240=v3226;
const v3241=v3240["outputs"];
v3236=v3241.freeze();if(v3239){v3237=v3236;v3238=true;}}
const v3242=v3226;
const v3243=v3242["parameter"];
const v3244=v3131;
const v3245=v3244["parameters"];
const v3246=!(v3243===v3245);
let v3247;if(v3246){
v3247=({Err:"network parameter layout"});}else{
const v3248=v3161;
const v3249=v3230;
const v3250=v3236;
const v3251=v3092;
const v3252=__fn41(v3248,v3249,v3250,v3251);
let v3253;if(Object.hasOwn(v3252,"Ok")){
const v3254=v3252["Ok"];
const v3255=v3254;
const v3256=v3255;
const v3257=v3131;
const v3258=v3257["parameters"];
const v3259=v3089;
const v3260=v3091;
v3253=({Ok:({["graph"]:v3256,["parameters"]:v3258,["features"]:v3259,["outputs"]:v3260})});}else{
const v3261=v3252["Err"];
v3253=({Err:v3261});}
v3247=v3253;}
v3160=v3247;}
v3100=v3160;}
return v3100;};}
function __prepareFn18(fixed){const v3351=true;let v3350=false,v3349;
const v3358=fixed[0];let v3357=false,v3356;
return function(v3347){let v3348;if(v3351&&v3350){v3348=v3349;}else{
const v3352="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3353=0;
const v3354=0;
v3348=__fn17(v3352,v3353,v3354);if(v3351){v3349=v3348;v3350=true;}}
let v3355;if(v3358&&v3357){v3355=v3356;}else{
v3355=__nfValue(v3347);if(v3358){v3356=v3355;v3357=true;}}
const v3359=v3348;
const v3360=v3359["kind"];
const v3361=v3348;
const v3362=v3361["binary"];
const v3363=v3348;
const v3364=v3363["unary"];
const v3365=v3348;
const v3366=v3365["a"];
const v3367=v3348;
const v3368=v3367["b"];
const v3369=v3348;
const v3370=v3369["c"];
const v3371=__nfValue(v3355);
const v3372=v3348;
const v3373=v3372["terms"];
const v3374=v3348;
const v3375=v3374["gates"];
const v3376=v3348;
const v3377=__nfValue(v3376["gate_bias"]);
const v3378=v3348;
const v3379=v3378["table"];
const v3380=v3348;
const v3381=v3380["below"];
const v3382=v3348;
const v3383=v3382["above"];
return ({["kind"]:v3360,["binary"]:v3362,["unary"]:v3364,["a"]:v3366,["b"]:v3368,["c"]:v3370,["value"]:v3371,["terms"]:v3373,["gates"]:v3375,["gate_bias"]:v3377,["table"]:v3379,["below"]:v3381,["above"]:v3383});};}
function __prepareFn19(fixed){const v3390=fixed[1]&&fixed[2];let v3389=false,v3388;
const v3397=fixed[0];let v3396=false,v3395;
return function(v3384,v3385,v3386){let v3387;if(v3390&&v3389){v3387=v3388;}else{
const v3391="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3392=v3385;
const v3393=v3386;
v3387=__fn17(v3391,v3392,v3393);if(v3390){v3388=v3387;v3389=true;}}
let v3394;if(v3397&&v3396){v3394=v3395;}else{
v3394=v3384;if(v3397){v3395=v3394;v3396=true;}}
const v3398=v3387;
const v3399=v3398["kind"];
const v3400=v3394;
const v3401=v3387;
const v3402=v3401["unary"];
const v3403=v3387;
const v3404=v3403["a"];
const v3405=v3387;
const v3406=v3405["b"];
const v3407=v3387;
const v3408=v3407["c"];
const v3409=v3387;
const v3410=__nfValue(v3409["value"]);
const v3411=v3387;
const v3412=v3411["terms"];
const v3413=v3387;
const v3414=v3413["gates"];
const v3415=v3387;
const v3416=__nfValue(v3415["gate_bias"]);
const v3417=v3387;
const v3418=v3417["table"];
const v3419=v3387;
const v3420=v3419["below"];
const v3421=v3387;
const v3422=v3421["above"];
return ({["kind"]:v3399,["binary"]:v3400,["unary"]:v3402,["a"]:v3404,["b"]:v3406,["c"]:v3408,["value"]:v3410,["terms"]:v3412,["gates"]:v3414,["gate_bias"]:v3416,["table"]:v3418,["below"]:v3420,["above"]:v3422});};}
function __prepareFn20(fixed){const v3428=fixed[1];let v3427=false,v3426;
const v3435=fixed[0];let v3434=false,v3433;
return function(v3423,v3424){let v3425;if(v3428&&v3427){v3425=v3426;}else{
const v3429="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3430=v3424;
const v3431=0;
v3425=__fn17(v3429,v3430,v3431);if(v3428){v3426=v3425;v3427=true;}}
let v3432;if(v3435&&v3434){v3432=v3433;}else{
v3432=v3423;if(v3435){v3433=v3432;v3434=true;}}
const v3436=v3425;
const v3437=v3436["kind"];
const v3438=v3425;
const v3439=v3438["binary"];
const v3440=v3432;
const v3441=v3425;
const v3442=v3441["a"];
const v3443=v3425;
const v3444=v3443["b"];
const v3445=v3425;
const v3446=v3445["c"];
const v3447=v3425;
const v3448=__nfValue(v3447["value"]);
const v3449=v3425;
const v3450=v3449["terms"];
const v3451=v3425;
const v3452=v3451["gates"];
const v3453=v3425;
const v3454=__nfValue(v3453["gate_bias"]);
const v3455=v3425;
const v3456=v3455["table"];
const v3457=v3425;
const v3458=v3457["below"];
const v3459=v3425;
const v3460=v3459["above"];
return ({["kind"]:v3437,["binary"]:v3439,["unary"]:v3440,["a"]:v3442,["b"]:v3444,["c"]:v3446,["value"]:v3448,["terms"]:v3450,["gates"]:v3452,["gate_bias"]:v3454,["table"]:v3456,["below"]:v3458,["above"]:v3460});};}
function __prepareFn29(fixed){const v3498=true;let v3497=false,v3496;
const v3505=fixed[0];let v3504=false,v3503;
const v3509=fixed[1];let v3508=false,v3507;
return function(v3493,v3494){let v3495;if(v3498&&v3497){v3495=v3496;}else{
const v3499="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3500=0;
const v3501=0;
v3495=__fn17(v3499,v3500,v3501);if(v3498){v3496=v3495;v3497=true;}}
let v3502;if(v3505&&v3504){v3502=v3503;}else{
v3502=v3493;if(v3505){v3503=v3502;v3504=true;}}
let v3506;if(v3509&&v3508){v3506=v3507;}else{
v3506=__nfValue(v3494);if(v3509){v3507=v3506;v3508=true;}}
const v3510=v3495;
const v3511=v3510["kind"];
const v3512=v3495;
const v3513=v3512["binary"];
const v3514=v3495;
const v3515=v3514["unary"];
const v3516=v3495;
const v3517=v3516["a"];
const v3518=v3495;
const v3519=v3518["b"];
const v3520=v3495;
const v3521=v3520["c"];
const v3522=__nfValue(v3506);
const v3523=v3502;
const v3524=v3495;
const v3525=v3524["gates"];
const v3526=v3495;
const v3527=__nfValue(v3526["gate_bias"]);
const v3528=v3495;
const v3529=v3528["table"];
const v3530=v3495;
const v3531=v3530["below"];
const v3532=v3495;
const v3533=v3532["above"];
return ({["kind"]:v3511,["binary"]:v3513,["unary"]:v3515,["a"]:v3517,["b"]:v3519,["c"]:v3521,["value"]:v3522,["terms"]:v3523,["gates"]:v3525,["gate_bias"]:v3527,["table"]:v3529,["below"]:v3531,["above"]:v3533});};}
function __prepareFn30(fixed){const v3541=true;let v3540=false,v3539;
const v3548=fixed[0];let v3547=false,v3546;
const v3552=fixed[1];let v3551=false,v3550;
const v3556=fixed[2];let v3555=false,v3554;
const v3560=fixed[3];let v3559=false,v3558;
return function(v3534,v3535,v3536,v3537){let v3538;if(v3541&&v3540){v3538=v3539;}else{
const v3542="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3543=0;
const v3544=0;
v3538=__fn17(v3542,v3543,v3544);if(v3541){v3539=v3538;v3540=true;}}
let v3545;if(v3548&&v3547){v3545=v3546;}else{
v3545=v3534;if(v3548){v3546=v3545;v3547=true;}}
let v3549;if(v3552&&v3551){v3549=v3550;}else{
v3549=__nfValue(v3535);if(v3552){v3550=v3549;v3551=true;}}
let v3553;if(v3556&&v3555){v3553=v3554;}else{
v3553=v3536;if(v3556){v3554=v3553;v3555=true;}}
let v3557;if(v3560&&v3559){v3557=v3558;}else{
v3557=__nfValue(v3537);if(v3560){v3558=v3557;v3559=true;}}
const v3561=v3538;
const v3562=v3561["kind"];
const v3563=v3538;
const v3564=v3563["binary"];
const v3565=v3538;
const v3566=v3565["unary"];
const v3567=v3538;
const v3568=v3567["a"];
const v3569=v3538;
const v3570=v3569["b"];
const v3571=v3538;
const v3572=v3571["c"];
const v3573=__nfValue(v3549);
const v3574=v3545;
const v3575=v3553;
const v3576=__nfValue(v3557);
const v3577=v3538;
const v3578=v3577["table"];
const v3579=v3538;
const v3580=v3579["below"];
const v3581=v3538;
const v3582=v3581["above"];
return ({["kind"]:v3562,["binary"]:v3564,["unary"]:v3566,["a"]:v3568,["b"]:v3570,["c"]:v3572,["value"]:v3573,["terms"]:v3574,["gates"]:v3575,["gate_bias"]:v3576,["table"]:v3578,["below"]:v3580,["above"]:v3582});};}
function __prepareFn31(fixed){const v3589=fixed[0]&&fixed[1];let v3588=false,v3587;
const v3596=fixed[2];let v3595=false,v3594;
return function(v3583,v3584,v3585){let v3586;if(v3589&&v3588){v3586=v3587;}else{
const v3590="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3591=v3583;
const v3592=v3584;
v3586=__fn17(v3590,v3591,v3592);if(v3589){v3587=v3586;v3588=true;}}
let v3593;if(v3596&&v3595){v3593=v3594;}else{
v3593=v3585;if(v3596){v3594=v3593;v3595=true;}}
const v3597=v3586;
const v3598=v3597["kind"];
const v3599=v3586;
const v3600=v3599["binary"];
const v3601=v3586;
const v3602=v3601["unary"];
const v3603=v3586;
const v3604=v3603["a"];
const v3605=v3586;
const v3606=v3605["b"];
const v3607=v3593;
const v3608=v3586;
const v3609=__nfValue(v3608["value"]);
const v3610=v3586;
const v3611=v3610["terms"];
const v3612=v3586;
const v3613=v3612["gates"];
const v3614=v3586;
const v3615=__nfValue(v3614["gate_bias"]);
const v3616=v3586;
const v3617=v3616["table"];
const v3618=v3586;
const v3619=v3618["below"];
const v3620=v3586;
const v3621=v3620["above"];
return ({["kind"]:v3598,["binary"]:v3600,["unary"]:v3602,["a"]:v3604,["b"]:v3606,["c"]:v3607,["value"]:v3609,["terms"]:v3611,["gates"]:v3613,["gate_bias"]:v3615,["table"]:v3617,["below"]:v3619,["above"]:v3621});};}
function __prepareFn32(fixed){const v3629=fixed[0];let v3628=false,v3627;
const v3636=fixed[1];let v3635=false,v3634;
const v3640=fixed[2];let v3639=false,v3638;
const v3644=fixed[3];let v3643=false,v3642;
return function(v3622,v3623,v3624,v3625){let v3626;if(v3629&&v3628){v3626=v3627;}else{
const v3630="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index";
const v3631=v3622;
const v3632=0;
v3626=__fn17(v3630,v3631,v3632);if(v3629){v3627=v3626;v3628=true;}}
let v3633;if(v3636&&v3635){v3633=v3634;}else{
v3633=v3623;if(v3636){v3634=v3633;v3635=true;}}
let v3637;if(v3640&&v3639){v3637=v3638;}else{
v3637=v3624;if(v3640){v3638=v3637;v3639=true;}}
let v3641;if(v3644&&v3643){v3641=v3642;}else{
v3641=v3625;if(v3644){v3642=v3641;v3643=true;}}
const v3645=v3626;
const v3646=v3645["kind"];
const v3647=v3626;
const v3648=v3647["binary"];
const v3649=v3626;
const v3650=v3649["unary"];
const v3651=v3626;
const v3652=v3651["a"];
const v3653=v3626;
const v3654=v3653["b"];
const v3655=v3626;
const v3656=v3655["c"];
const v3657=v3626;
const v3658=__nfValue(v3657["value"]);
const v3659=v3626;
const v3660=v3659["terms"];
const v3661=v3626;
const v3662=v3661["gates"];
const v3663=v3626;
const v3664=__nfValue(v3663["gate_bias"]);
const v3665=v3633;
const v3666=v3637;
const v3667=v3641;
return ({["kind"]:v3646,["binary"]:v3648,["unary"]:v3650,["a"]:v3652,["b"]:v3654,["c"]:v3656,["value"]:v3658,["terms"]:v3660,["gates"]:v3662,["gate_bias"]:v3664,["table"]:v3665,["below"]:v3666,["above"]:v3667});};}
function __prepareFn36(fixed){const v3684=fixed[0];let v3683=false,v3682;
return function(v3680){let v3681;if(v3684&&v3683){v3681=v3682;}else{
const v3685=v3680;
v3681=v3685["kind"];if(v3684){v3682=v3681;v3683=true;}}
const v3686=v3681;
const v3687="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3688=(v3686===v3687);
let v3689;if(v3688){
v3689=[];}else{
const v3690=v3681;
const v3691="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3692=(v3690===v3691);
let v3693;if(v3692){
const v3694=v3680;
const v3695=v3694["a"];
const v3696=v3680;
const v3697=v3696["b"];
v3693=[v3695,v3697];}else{
const v3698=v3681;
const v3699="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3700=(v3698===v3699);
let v3701;if(v3700){
const v3702=v3680;
const v3703=v3702["a"];
v3701=[v3703];}else{
const v3704=v3681;
const v3705="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3706=(v3704===v3705);
let v3707;if(v3706){
const v3708=v3680;
const v3709=v3708["terms"];
const v3710=v3709.length;
const v3711=new Array(v3710);
for(let v3712=0;v3712<v3710;v3712++){
const v3713=v3709[v3712];
const v3714=v3713;
v3711[v3712]=v3714["wire"];
}
v3707=v3711;}else{
const v3715=v3681;
const v3716="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3717=(v3715===v3716);
let v3718;if(v3717){
const v3719=v3680;
const v3720=v3719["terms"];
const v3721=v3720.length;
const v3722=new Array(v3721);
for(let v3723=0;v3723<v3721;v3723++){
const v3724=v3720[v3723];
const v3725=v3724;
v3722[v3723]=v3725["wire"];
}
const v3726=v3722;
const v3727=v3680;
const v3728=v3727["gates"];
const v3729=v3728.length;
const v3730=new Array(v3729);
for(let v3731=0;v3731<v3729;v3731++){
const v3732=v3728[v3731];
const v3733=v3732;
v3730[v3731]=v3733["wire"];
}
const v3734=v3730;
const v3735=v3726.length;
const v3736=v3734.length;
const v3737=new Array(v3735+v3736);
for(let v3738=0;v3738<v3735;v3738++){v3737[v3738]=v3726[v3738];}
for(let v3739=0;v3739<v3736;v3739++){v3737[v3735+v3739]=v3734[v3739];}
v3718=v3737;}else{
const v3740=v3681;
const v3741="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3742=(v3740===v3741);
let v3743;if(v3742){
const v3744=v3680;
const v3745=v3744["a"];
const v3746=v3680;
const v3747=v3746["b"];
const v3748=v3680;
const v3749=v3748["c"];
v3743=[v3745,v3747,v3749];}else{
const v3750=v3680;
const v3751=v3750["a"];
const v3752=[v3751];
const v3753=v3680;
const v3754=v3753["table"];
const v3755=v3752.length;
const v3756=v3754.length;
const v3757=new Array(v3755+v3756);
for(let v3758=0;v3758<v3755;v3758++){v3757[v3758]=v3752[v3758];}
for(let v3759=0;v3759<v3756;v3759++){v3757[v3755+v3759]=v3754[v3759];}
v3743=v3757;}
v3718=v3743;}
v3707=v3718;}
v3701=v3707;}
v3693=v3701;}
v3689=v3693;}
return v3689;};}
function __prepareFn37(fixed){const v3765=fixed[0];let v3764=false,v3763;
const v3778=fixed[0]&&fixed[1];let v3777=false,v3776;
const v3786=fixed[0]&&fixed[1];let v3785=false,v3784;
const v3822=fixed[0]&&fixed[1];let v3821=false,v3820;
const v3859=fixed[0]&&fixed[1];let v3858=false,v3857;
const v3905=fixed[0]&&fixed[1];let v3904=false,v3903;
const v3922=fixed[0]&&fixed[1];let v3921=false,v3920;
const v3967=fixed[0]&&fixed[1];let v3966=false,v3965;
const v3975=fixed[0]&&fixed[1];let v3974=false,v3973;
const v3983=fixed[0]&&fixed[1];let v3982=false,v3981;
const v4014=fixed[0]&&fixed[1];let v4013=false,v4012;
const v4022=fixed[0]&&fixed[1];let v4021=false,v4020;
return function(v3760,v3761){let v3762;if(v3765&&v3764){v3762=v3763;}else{
const v3766=v3760;
v3762=v3766["kind"];if(v3765){v3763=v3762;v3764=true;}}
const v3767=v3762;
const v3768="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v3769=(v3767===v3768);
let v3770;if(v3769){
v3770=v3760;}else{
const v3771=v3762;
const v3772="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v3773=(v3771===v3772);
let v3774;if(v3773){
let v3775;if(v3778&&v3777){v3775=v3776;}else{
const v3779=v3761;
const v3780=v3760;
const v3781=v3780["a"];
let v3782;if(v3781<v3779.length){v3782=v3779[v3781];}else{
v3782=0;}
v3775=v3782;if(v3778){v3776=v3775;v3777=true;}}
let v3783;if(v3786&&v3785){v3783=v3784;}else{
const v3787=v3761;
const v3788=v3760;
const v3789=v3788["b"];
let v3790;if(v3789<v3787.length){v3790=v3787[v3789];}else{
v3790=0;}
v3783=v3790;if(v3786){v3784=v3783;v3785=true;}}
const v3791=v3760;
const v3792=v3791["kind"];
const v3793=v3760;
const v3794=v3793["binary"];
const v3795=v3760;
const v3796=v3795["unary"];
const v3797=v3775;
const v3798=v3783;
const v3799=v3760;
const v3800=v3799["c"];
const v3801=v3760;
const v3802=__nfValue(v3801["value"]);
const v3803=v3760;
const v3804=v3803["terms"];
const v3805=v3760;
const v3806=v3805["gates"];
const v3807=v3760;
const v3808=__nfValue(v3807["gate_bias"]);
const v3809=v3760;
const v3810=v3809["table"];
const v3811=v3760;
const v3812=v3811["below"];
const v3813=v3760;
const v3814=v3813["above"];
v3774=({["kind"]:v3792,["binary"]:v3794,["unary"]:v3796,["a"]:v3797,["b"]:v3798,["c"]:v3800,["value"]:v3802,["terms"]:v3804,["gates"]:v3806,["gate_bias"]:v3808,["table"]:v3810,["below"]:v3812,["above"]:v3814});}else{
const v3815=v3762;
const v3816="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v3817=(v3815===v3816);
let v3818;if(v3817){
let v3819;if(v3822&&v3821){v3819=v3820;}else{
const v3823=v3761;
const v3824=v3760;
const v3825=v3824["a"];
let v3826;if(v3825<v3823.length){v3826=v3823[v3825];}else{
v3826=0;}
v3819=v3826;if(v3822){v3820=v3819;v3821=true;}}
const v3827=v3760;
const v3828=v3827["kind"];
const v3829=v3760;
const v3830=v3829["binary"];
const v3831=v3760;
const v3832=v3831["unary"];
const v3833=v3819;
const v3834=v3760;
const v3835=v3834["b"];
const v3836=v3760;
const v3837=v3836["c"];
const v3838=v3760;
const v3839=__nfValue(v3838["value"]);
const v3840=v3760;
const v3841=v3840["terms"];
const v3842=v3760;
const v3843=v3842["gates"];
const v3844=v3760;
const v3845=__nfValue(v3844["gate_bias"]);
const v3846=v3760;
const v3847=v3846["table"];
const v3848=v3760;
const v3849=v3848["below"];
const v3850=v3760;
const v3851=v3850["above"];
v3818=({["kind"]:v3828,["binary"]:v3830,["unary"]:v3832,["a"]:v3833,["b"]:v3835,["c"]:v3837,["value"]:v3839,["terms"]:v3841,["gates"]:v3843,["gate_bias"]:v3845,["table"]:v3847,["below"]:v3849,["above"]:v3851});}else{
const v3852=v3762;
const v3853="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v3854=(v3852===v3853);
let v3855;if(v3854){
let v3856;if(v3859&&v3858){v3856=v3857;}else{
const v3860=v3760;
const v3861=v3860["terms"];
const v3862=v3861.length;
const v3863=new Array(v3862);
for(let v3864=0;v3864<v3862;v3864++){
const v3865=v3861[v3864];
const v3866=v3761;
const v3867=v3865;
const v3868=v3867["wire"];
let v3869;if(v3868<v3866.length){v3869=v3866[v3868];}else{
v3869=0;}
const v3870=v3869;
const v3871=v3865;
const v3872=__nfValue(v3871["coefficient"]);
v3863[v3864]=({["wire"]:v3870,["coefficient"]:v3872});
}
v3856=v3863;if(v3859){v3857=v3856;v3858=true;}}
const v3873=v3760;
const v3874=v3873["kind"];
const v3875=v3760;
const v3876=v3875["binary"];
const v3877=v3760;
const v3878=v3877["unary"];
const v3879=v3760;
const v3880=v3879["a"];
const v3881=v3760;
const v3882=v3881["b"];
const v3883=v3760;
const v3884=v3883["c"];
const v3885=v3760;
const v3886=__nfValue(v3885["value"]);
const v3887=v3856;
const v3888=v3760;
const v3889=v3888["gates"];
const v3890=v3760;
const v3891=__nfValue(v3890["gate_bias"]);
const v3892=v3760;
const v3893=v3892["table"];
const v3894=v3760;
const v3895=v3894["below"];
const v3896=v3760;
const v3897=v3896["above"];
v3855=({["kind"]:v3874,["binary"]:v3876,["unary"]:v3878,["a"]:v3880,["b"]:v3882,["c"]:v3884,["value"]:v3886,["terms"]:v3887,["gates"]:v3889,["gate_bias"]:v3891,["table"]:v3893,["below"]:v3895,["above"]:v3897});}else{
const v3898=v3762;
const v3899="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v3900=(v3898===v3899);
let v3901;if(v3900){
let v3902;if(v3905&&v3904){v3902=v3903;}else{
const v3906=v3760;
const v3907=v3906["terms"];
const v3908=v3907.length;
const v3909=new Array(v3908);
for(let v3910=0;v3910<v3908;v3910++){
const v3911=v3907[v3910];
const v3912=v3761;
const v3913=v3911;
const v3914=v3913["wire"];
let v3915;if(v3914<v3912.length){v3915=v3912[v3914];}else{
v3915=0;}
const v3916=v3915;
const v3917=v3911;
const v3918=__nfValue(v3917["coefficient"]);
v3909[v3910]=({["wire"]:v3916,["coefficient"]:v3918});
}
v3902=v3909;if(v3905){v3903=v3902;v3904=true;}}
let v3919;if(v3922&&v3921){v3919=v3920;}else{
const v3923=v3760;
const v3924=v3923["gates"];
const v3925=v3924.length;
const v3926=new Array(v3925);
for(let v3927=0;v3927<v3925;v3927++){
const v3928=v3924[v3927];
const v3929=v3761;
const v3930=v3928;
const v3931=v3930["wire"];
let v3932;if(v3931<v3929.length){v3932=v3929[v3931];}else{
v3932=0;}
const v3933=v3932;
const v3934=v3928;
const v3935=__nfValue(v3934["coefficient"]);
v3926[v3927]=({["wire"]:v3933,["coefficient"]:v3935});
}
v3919=v3926;if(v3922){v3920=v3919;v3921=true;}}
const v3936=v3760;
const v3937=v3936["kind"];
const v3938=v3760;
const v3939=v3938["binary"];
const v3940=v3760;
const v3941=v3940["unary"];
const v3942=v3760;
const v3943=v3942["a"];
const v3944=v3760;
const v3945=v3944["b"];
const v3946=v3760;
const v3947=v3946["c"];
const v3948=v3760;
const v3949=__nfValue(v3948["value"]);
const v3950=v3902;
const v3951=v3919;
const v3952=v3760;
const v3953=__nfValue(v3952["gate_bias"]);
const v3954=v3760;
const v3955=v3954["table"];
const v3956=v3760;
const v3957=v3956["below"];
const v3958=v3760;
const v3959=v3958["above"];
v3901=({["kind"]:v3937,["binary"]:v3939,["unary"]:v3941,["a"]:v3943,["b"]:v3945,["c"]:v3947,["value"]:v3949,["terms"]:v3950,["gates"]:v3951,["gate_bias"]:v3953,["table"]:v3955,["below"]:v3957,["above"]:v3959});}else{
const v3960=v3762;
const v3961="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v3962=(v3960===v3961);
let v3963;if(v3962){
let v3964;if(v3967&&v3966){v3964=v3965;}else{
const v3968=v3761;
const v3969=v3760;
const v3970=v3969["a"];
let v3971;if(v3970<v3968.length){v3971=v3968[v3970];}else{
v3971=0;}
v3964=v3971;if(v3967){v3965=v3964;v3966=true;}}
let v3972;if(v3975&&v3974){v3972=v3973;}else{
const v3976=v3761;
const v3977=v3760;
const v3978=v3977["b"];
let v3979;if(v3978<v3976.length){v3979=v3976[v3978];}else{
v3979=0;}
v3972=v3979;if(v3975){v3973=v3972;v3974=true;}}
let v3980;if(v3983&&v3982){v3980=v3981;}else{
const v3984=v3761;
const v3985=v3760;
const v3986=v3985["c"];
let v3987;if(v3986<v3984.length){v3987=v3984[v3986];}else{
v3987=0;}
v3980=v3987;if(v3983){v3981=v3980;v3982=true;}}
const v3988=v3760;
const v3989=v3988["kind"];
const v3990=v3760;
const v3991=v3990["binary"];
const v3992=v3760;
const v3993=v3992["unary"];
const v3994=v3964;
const v3995=v3972;
const v3996=v3980;
const v3997=v3760;
const v3998=__nfValue(v3997["value"]);
const v3999=v3760;
const v4000=v3999["terms"];
const v4001=v3760;
const v4002=v4001["gates"];
const v4003=v3760;
const v4004=__nfValue(v4003["gate_bias"]);
const v4005=v3760;
const v4006=v4005["table"];
const v4007=v3760;
const v4008=v4007["below"];
const v4009=v3760;
const v4010=v4009["above"];
v3963=({["kind"]:v3989,["binary"]:v3991,["unary"]:v3993,["a"]:v3994,["b"]:v3995,["c"]:v3996,["value"]:v3998,["terms"]:v4000,["gates"]:v4002,["gate_bias"]:v4004,["table"]:v4006,["below"]:v4008,["above"]:v4010});}else{
let v4011;if(v4014&&v4013){v4011=v4012;}else{
const v4015=v3761;
const v4016=v3760;
const v4017=v4016["a"];
let v4018;if(v4017<v4015.length){v4018=v4015[v4017];}else{
v4018=0;}
v4011=v4018;if(v4014){v4012=v4011;v4013=true;}}
let v4019;if(v4022&&v4021){v4019=v4020;}else{
const v4023=v3760;
const v4024=v4023["table"];
const v4025=v4024.length;
const v4026=new Array(v4025);
for(let v4027=0;v4027<v4025;v4027++){
const v4028=(v4024[v4027]>>>0);
const v4029=v3761;
const v4030=v4028;
let v4031;if(v4030<v4029.length){v4031=v4029[v4030];}else{
v4031=0;}
v4026[v4027]=v4031;
}
v4019=v4026;if(v4022){v4020=v4019;v4021=true;}}
const v4032=v3760;
const v4033=v4032["kind"];
const v4034=v3760;
const v4035=v4034["binary"];
const v4036=v3760;
const v4037=v4036["unary"];
const v4038=v4011;
const v4039=v3760;
const v4040=v4039["b"];
const v4041=v3760;
const v4042=v4041["c"];
const v4043=v3760;
const v4044=__nfValue(v4043["value"]);
const v4045=v3760;
const v4046=v4045["terms"];
const v4047=v3760;
const v4048=v4047["gates"];
const v4049=v3760;
const v4050=__nfValue(v4049["gate_bias"]);
const v4051=v4019;
const v4052=v3760;
const v4053=v4052["below"];
const v4054=v3760;
const v4055=v4054["above"];
v3963=({["kind"]:v4033,["binary"]:v4035,["unary"]:v4037,["a"]:v4038,["b"]:v4040,["c"]:v4042,["value"]:v4044,["terms"]:v4046,["gates"]:v4048,["gate_bias"]:v4050,["table"]:v4051,["below"]:v4053,["above"]:v4055});}
v3901=v3963;}
v3855=v3901;}
v3818=v3855;}
v3774=v3818;}
v3770=v3774;}
return v3770;};}
function __prepareFn39(fixed){const v4061=fixed[0];let v4060=false,v4059;
return function(v4056,v4057){let v4058;if(v4061&&v4060){v4058=v4059;}else{
const v4062=v4056;
v4058=v4062["kind"];if(v4061){v4059=v4058;v4060=true;}}
const v4063=v4058;
const v4064="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v4065=(v4063===v4064);
let v4066;if(v4065){
v4066=true;}else{
const v4067=v4058;
const v4068="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4069=(v4067===v4068);
let v4070;if(v4069){
const v4071=v4056;
const v4072=v4071["a"];
const v4073=v4057;
const v4074=((v4072) < (v4073));
let v4075=v4074;if(v4075){
const v4076=v4056;
const v4077=v4076["b"];
const v4078=v4057;
v4075=((v4077) < (v4078));}
v4070=v4075;}else{
const v4079=v4058;
const v4080="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4081=(v4079===v4080);
let v4082;if(v4081){
const v4083=v4056;
const v4084=v4083["a"];
const v4085=v4057;
v4082=((v4084) < (v4085));}else{
const v4086=v4058;
const v4087="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v4088=(v4086===v4087);
let v4089;if(v4088){
const v4090=v4056;
const v4091=v4090["terms"];
let v4092=true;
for(let v4093=0;v4093<v4091.length;v4093++){
const v4094=v4091[v4093];
const v4095=v4092;
let v4096=v4095;if(v4096){
const v4097=v4094;
const v4098=v4097["wire"];
const v4099=v4057;
v4096=((v4098) < (v4099));}
v4092=v4096;
}
v4089=v4092;}else{
const v4100=v4058;
const v4101="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v4102=(v4100===v4101);
let v4103;if(v4102){
const v4104=v4056;
const v4105=v4104["terms"];
let v4106=true;
for(let v4107=0;v4107<v4105.length;v4107++){
const v4108=v4105[v4107];
const v4109=v4106;
let v4110=v4109;if(v4110){
const v4111=v4108;
const v4112=v4111["wire"];
const v4113=v4057;
v4110=((v4112) < (v4113));}
v4106=v4110;
}
const v4114=v4106;
let v4115=v4114;if(v4115){
const v4116=v4056;
const v4117=v4116["gates"];
let v4118=true;
for(let v4119=0;v4119<v4117.length;v4119++){
const v4120=v4117[v4119];
const v4121=v4118;
let v4122=v4121;if(v4122){
const v4123=v4120;
const v4124=v4123["wire"];
const v4125=v4057;
v4122=((v4124) < (v4125));}
v4118=v4122;
}
v4115=v4118;}
v4103=v4115;}else{
const v4126=v4058;
const v4127="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v4128=(v4126===v4127);
let v4129;if(v4128){
const v4130=v4056;
const v4131=v4130["a"];
const v4132=v4057;
const v4133=((v4131) < (v4132));
let v4134=v4133;if(v4134){
const v4135=v4056;
const v4136=v4135["b"];
const v4137=v4057;
v4134=((v4136) < (v4137));}
const v4138=v4134;
let v4139=v4138;if(v4139){
const v4140=v4056;
const v4141=v4140["c"];
const v4142=v4057;
v4139=((v4141) < (v4142));}
v4129=v4139;}else{
const v4143=v4056;
const v4144=v4143["a"];
const v4145=v4057;
const v4146=((v4144) < (v4145));
let v4147=v4146;if(v4147){
const v4148=v4056;
const v4149=v4148["table"];
let v4150=true;
for(let v4151=0;v4151<v4149.length;v4151++){
const v4152=(v4149[v4151]>>>0);
const v4153=v4150;
let v4154=v4153;if(v4154){
const v4155=v4152;
const v4156=v4057;
v4154=((v4155) < (v4156));}
v4150=v4154;
}
v4147=v4150;}
v4129=v4147;}
v4103=v4129;}
v4089=v4103;}
v4082=v4089;}
v4070=v4082;}
v4066=v4070;}
return v4066;};}
function __prepareFn40(fixed){const v4174=fixed[0]&&fixed[1];let v4173=false,v4172;
const v4180=fixed[0]&&fixed[1];let v4179=false,v4178;
return function(v4157,v4158,v4159){const v4160=v4158;
const v4161=v4160.length;
const v4162=4294967295;
const v4163=((v4161) > (v4162));
let v4164=v4163;if(!v4164){
const v4165=(v4158).length;
const v4166=4294967295;
const v4167=v4157;
const v4168=(((v4166) - (v4167)) >>> 0);
v4164=((v4165) > (v4168));}
const v4169=v4164;
let v4170;if(v4169){
v4170=false;}else{
let v4171;if(v4174&&v4173){v4171=v4172;}else{
const v4175=v4157;
const v4176=(v4158).length;
v4171=(((v4175) + (v4176)) >>> 0);if(v4174){v4172=v4171;v4173=true;}}
let v4177;if(v4180&&v4179){v4177=v4178;}else{
const v4181=v4158;
const v4182=v4157;
const v4183=true;
let v4184=({["wire"]:v4182,["valid"]:v4183});
for(let v4185=0;v4185<v4181.length;v4185++){
const v4186=v4181[v4185];
const v4187=v4184;
const v4188=v4187["wire"];
const v4189=1;
const v4190=(((v4188) + (v4189)) >>> 0);
const v4191=v4184;
const v4192=v4191["valid"];
let v4193=v4192;if(v4193){
const v4194=v4186;
const v4195=v4184;
const v4196=v4195["wire"];
v4193=__fn39(v4194,v4196);}
const v4197=v4193;
v4184=({["wire"]:v4190,["valid"]:v4197});
}
v4177=v4184;if(v4180){v4178=v4177;v4179=true;}}
const v4198=v4177;
const v4199=v4198["valid"];
let v4200=v4199;if(v4200){
const v4201=v4159;
let v4202=true;
for(let v4203=0;v4203<v4201.length;v4203++){
const v4204=(v4201[v4203]>>>0);
const v4205=v4202;
let v4206=v4205;if(v4206){
const v4207=v4204;
const v4208=v4171;
v4206=((v4207) < (v4208));}
v4202=v4206;
}
v4200=v4202;}
v4170=v4200;}
return v4170;};}
function __prepareFn41(fixed){const v4238=fixed[0]&&fixed[1];let v4237=false,v4236;
const v4269=fixed[0]&&fixed[1]&&fixed[2];let v4268=false,v4267;
const v4284=fixed[0];let v4283=false,v4282;
const v4288=fixed[0];let v4287=false,v4286;
const v4328=fixed[0]&&fixed[1]&&fixed[2];let v4327=false,v4326;
const v4335=fixed[0]&&fixed[1]&&fixed[2];let v4334=false,v4333;
const v4340=fixed[0]&&fixed[1]&&fixed[2];let v4339=false,v4338;
const v4346=fixed[0];let v4345=false,v4344;
const v4382=fixed[0]&&fixed[1]&&fixed[2];let v4381=false,v4380;
return function(v4209,v4210,v4211,v4212){const v4213=v4210;
const v4214=v4213.length;
const v4215=4294967295;
const v4216=((v4214) > (v4215));
let v4217=v4216;if(!v4217){
const v4218=v4209;
const v4219=v4212;
v4217=((v4218) > (v4219));}
const v4220=v4217;
let v4221=v4220;if(!v4221){
const v4222=(v4210).length;
const v4223=v4212;
const v4224=v4209;
const v4225=(((v4223) - (v4224)) >>> 0);
v4221=((v4222) > (v4225));}
const v4226=v4221;
let v4227;if(v4226){
v4227=({Err:"graph capacity"});}else{
const v4228=v4209;
const v4229=v4210;
const v4230=v4211;
const v4231=__fn40(v4228,v4229,v4230);
const v4232=false;
const v4233=(v4231===v4232);
let v4234;if(v4233){
v4234=({Err:"graph is not topologically ordered"});}else{
let v4235;if(v4238&&v4237){v4235=v4236;}else{
const v4239=v4209;
const v4240=(v4210).length;
v4235=(((v4239) + (v4240)) >>> 0);if(v4238){v4236=v4235;v4237=true;}}
const v4241=__bufferFill(v4235,false);
const v4243=v4211;
const v4244=v4241;
let v4245=({["live"]:v4244});
for(let v4246=0;v4246<v4243.length;v4246++){
const v4247=(v4243[v4246]>>>0);
const v4248=v4245;
const v4249=v4248["live"];
const v4250=v4249;
const v4251=v4247;
const v4252=__tempSet(v4250,v4251,true,false);
const v4253=v4252;
v4245=({["live"]:v4253});
}
const v4242=v4245;
const v4255=v4242;
const v4254=v4255["live"];
const v4257=v4210;
const v4258=v4254;
const v4259=v4235;
let v4260=({["live"]:v4258,["wire"]:v4259});
for(let v4261=v4257.length-1;v4261>=0;v4261--){
const v4262=v4257[v4261];
const v4263=v4262;
const v4264=v4260;
const v4265=v4209;
v4260=__fn38(v4263,v4264,v4265);
}
const v4256=v4260;
let v4266;if(v4269&&v4268){v4266=v4267;}else{
const v4270=v4256;
const v4271=v4270["live"];
v4266=v4271.freeze();if(v4269){v4267=v4266;v4268=true;}}
const v4272=__bufferFill(v4235,0);
const v4274=v4209;
let v4275=v4272;
for(let v4276=0;v4276<v4274;v4276++){
if(false){break;}
const v4277=(v4276>>>0);
const v4278=v4275;
const v4279=v4277;
v4275=__tempSet(v4278,v4279,v4277,false);}
const v4273=v4275;
const v4280=v4273;
let v4281;if(v4284&&v4283){v4281=v4282;}else{
v4281=v4209;if(v4284){v4282=v4281;v4283=true;}}
let v4285;if(v4288&&v4287){v4285=v4286;}else{
v4285=v4209;if(v4288){v4286=v4285;v4287=true;}}
const v4290=v4210;
const v4291=v4285;
const v4292=v4280;
const v4293=v4281;
let v4294=({["next"]:v4291,["positions"]:v4292,["wire"]:v4293});
for(let v4295=0;v4295<v4290.length;v4295++){
const v4296=v4290[v4295];
const v4297=v4294;
const v4298=v4297["next"];
const v4299=v4294;
const v4300=v4299["positions"];
const v4301=v4294;
const v4302=v4301["wire"];
const v4303=v4266;
const v4304=v4302;
let v4305;if(v4304<v4303.length){v4305=v4303[v4304];}else{
v4305=false;}
let v4306;if(v4305){
const v4307=v4300;
const v4308=v4302;
const v4309=__tempSet(v4307,v4308,v4298,false);
const v4310=v4298;
const v4311=1;
const v4312=(((v4310) + (v4311)) >>> 0);
const v4313=v4302;
const v4314=1;
const v4315=(((v4313) + (v4314)) >>> 0);
const v4316=v4312;
const v4317=v4309;
const v4318=v4315;
v4306=({["next"]:v4316,["positions"]:v4317,["wire"]:v4318});}else{
const v4319=v4302;
const v4320=1;
const v4321=(((v4319) + (v4320)) >>> 0);
const v4322=v4298;
const v4323=v4300;
const v4324=v4321;
v4306=({["next"]:v4322,["positions"]:v4323,["wire"]:v4324});}
v4294=v4306;
}
const v4289=v4294;
let v4325;if(v4328&&v4327){v4325=v4326;}else{
const v4329=v4289;
v4325=v4329["next"];if(v4328){v4326=v4325;v4327=true;}}
const v4331=v4289;
const v4330=v4331["positions"];
let v4332;if(v4335&&v4334){v4332=v4333;}else{
const v4336=v4289;
v4332=v4336["wire"];if(v4335){v4333=v4332;v4334=true;}}
let v4337;if(v4340&&v4339){v4337=v4338;}else{
const v4341=v4330;
v4337=v4341.freeze();if(v4340){v4338=v4337;v4339=true;}}
const v4342=new __InkBuffer([]);
let v4343;if(v4346&&v4345){v4343=v4344;}else{
v4343=v4209;if(v4346){v4344=v4343;v4345=true;}}
const v4348=v4210;
const v4349=v4342;
const v4350=v4343;
let v4351=({["compact"]:v4349,["wire"]:v4350});
for(let v4352=0;v4352<v4348.length;v4352++){
const v4353=v4348[v4352];
const v4354=v4351;
const v4355=v4354["compact"];
const v4356=v4351;
const v4357=v4356["wire"];
const v4358=v4266;
const v4359=v4357;
let v4360;if(v4359<v4358.length){v4360=v4358[v4359];}else{
v4360=false;}
let v4361;if(v4360){
const v4362=v4355;
const v4363=v4353;
const v4364=v4337;
const v4365=__fn37(v4363,v4364);
const v4366=__tempEdit(v4362,"push",v4365);
const v4367=v4357;
const v4368=1;
const v4369=(((v4367) + (v4368)) >>> 0);
const v4370=v4366;
const v4371=v4369;
v4361=({["compact"]:v4370,["wire"]:v4371});}else{
const v4372=v4357;
const v4373=1;
const v4374=(((v4372) + (v4373)) >>> 0);
const v4375=v4355;
const v4376=v4374;
v4361=({["compact"]:v4375,["wire"]:v4376});}
v4351=v4361;
}
const v4347=v4351;
const v4378=v4347;
const v4377=v4378["compact"];
let v4379;if(v4382&&v4381){v4379=v4380;}else{
const v4383=v4347;
v4379=v4383["wire"];if(v4382){v4380=v4379;v4381=true;}}
const v4384=v4209;
const v4385=v4377;
const v4386=v4385.freeze();
const v4387=v4211;
const v4388=v4387.length;
const v4389=new Array(v4388);
for(let v4390=0;v4390<v4388;v4390++){
const v4391=(v4387[v4390]>>>0);
const v4392=v4337;
const v4393=v4391;
let v4394;if(v4393<v4392.length){v4394=v4392[v4393];}else{
v4394=0;}
v4389[v4390]=v4394;
}
const v4395=v4389;
v4234=({Ok:({["inputs"]:v4384,["nodes"]:v4386,["roots"]:v4395})});}
v4227=v4234;}
return v4227;};}
function __prepareFn45(fixed){const v4408=fixed[0];let v4407=false,v4406;
return function(v4402,v4403,v4404){let v4405;if(v4408&&v4407){v4405=v4406;}else{
v4405=v4402;if(v4408){v4406=v4405;v4407=true;}}
const v4409=v4405;
const v4410="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add";
const v4411=(v4409===v4410);
let v4412;if(v4411){
const v4413=__nfValue(v4403);
const v4414=__nfValue(v4404);
v4412=Math.fround(__nfNumber(v4413) + __nfNumber(v4414));}else{
const v4415=v4405;
const v4416="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract";
const v4417=(v4415===v4416);
let v4418;if(v4417){
const v4419=__nfValue(v4403);
const v4420=__nfValue(v4404);
v4418=Math.fround(__nfNumber(v4419) - __nfNumber(v4420));}else{
const v4421=v4405;
const v4422="ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply";
const v4423=(v4421===v4422);
let v4424;if(v4423){
const v4425=__nfValue(v4403);
const v4426=__nfValue(v4404);
v4424=Math.fround(__nfNumber(v4425) * __nfNumber(v4426));}else{
v4424=Math.fround((__nfNumber(__nfValue(v4403)))/(__nfNumber(__nfValue(v4404))));}
v4418=v4424;}
v4412=v4418;}
return v4412;};}
function __prepareFn47(fixed){const v4439=fixed[0];let v4438=false,v4437;
return function(v4434,v4435){let v4436;if(v4439&&v4438){v4436=v4437;}else{
v4436=v4434;if(v4439){v4437=v4436;v4438=true;}}
const v4440=v4436;
const v4441="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4442=(v4440===v4441);
let v4443;if(v4442){
v4443=Math.fround(Math.sqrt(__nfNumber(__nfValue(v4435))));}else{
const v4444=v4436;
const v4445="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v4446=(v4444===v4445);
let v4447;if(v4446){
const v4448=__nfValue(v4435);
v4447=__nfNeg(v4448);}else{
const v4449=v4436;
const v4450="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v4451=(v4449===v4450);
let v4452;if(v4451){
const v4453=__nfValue(v4435);
v4452=__fn46(v4453);}else{
const v4454=__nfValue(v4435);
const v4455=__nfFromBits(0);
const v4456=((__nfNumber(v4454)) > (__nfNumber(v4455)));
let v4457;if(v4456){
v4457=__nfFromBits(1065353216);}else{
v4457=__nfFromBits(0);}
v4452=v4457;}
v4447=v4452;}
v4443=v4447;}
return v4443;};}
function __prepareFn54(fixed){const v4514=fixed[0]&&fixed[1];let v4513=false,v4512;
return function(v4484,v4485){const v4486=(v4485).length;
const v4487=v4484;
const v4488=v4487["inputs"];
const v4489=!(v4486===v4488);
let v4490;if(v4489){
v4490=({Err:"graph input shape"});}else{
const v4491=v4484;
const v4492=v4491["inputs"];
const v4493=v4484;
const v4494=v4493["nodes"];
const v4495=v4484;
const v4496=v4495["roots"];
const v4497=__fn40(v4492,v4494,v4496);
const v4498=false;
const v4499=(v4497===v4498);
let v4500;if(v4499){
v4500=({Err:"invalid prepared graph"});}else{
const v4502=v4484;
const v4503=v4502["nodes"];
const v4504=new __InkBuffer(Array.from(v4485));
const v4505=true;
let v4506=({["values"]:v4504,["finite_indices"]:v4505});
for(let v4507=0;v4507<v4503.length;v4507++){
const v4508=v4503[v4507];
const v4509=v4508;
const v4510=v4506;
v4506=__fn53(v4509,v4510);
}
const v4501=v4506;
let v4511;if(v4514&&v4513){v4511=v4512;}else{
const v4515=v4501;
const v4516=v4515["values"];
v4511=v4516.freeze();if(v4514){v4512=v4511;v4513=true;}}
const v4517=v4501;
const v4518=v4517["finite_indices"];
const v4519=false;
const v4520=(v4518===v4519);
let v4521;if(v4520){
v4521=({Err:"nonfinite graph index"});}else{
const v4522=v4511;
const v4523=v4484;
const v4524=v4523["roots"];
const v4525=v4524.length;
const v4526=new Array(v4525);
for(let v4527=0;v4527<v4525;v4527++){
const v4528=(v4524[v4527]>>>0);
const v4529=v4511;
const v4530=v4528;
let v4531;if(v4530<v4529.length){v4531=v4529[v4530];}else{
v4531=__nfFromBits(0);}
v4526[v4527]=__nfValue(v4531);
}
const v4532=v4526;
v4521=({Ok:({["values"]:v4522,["outputs"]:v4532})});}
v4500=v4521;}
v4490=v4500;}
return v4490;};}
function __prepareFn58(fixed){const v4546=fixed[0];let v4545=false,v4544;
return function(v4541,v4542){let v4543;if(v4546&&v4545){v4543=v4544;}else{
v4543=v4541;if(v4546){v4544=v4543;v4545=true;}}
const v4547=v4543;
const v4548="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt";
const v4549=(v4547===v4548);
let v4550;if(v4549){
v4550=true;}else{
const v4551=v4543;
const v4552="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate";
const v4553=(v4551===v4552);
let v4554;if(v4553){
v4554=true;}else{
const v4555=v4543;
const v4556="ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu";
const v4557=(v4555===v4556);
let v4558;if(v4557){
const v4559=v4542;
v4558=v4559["piecewise"];}else{
const v4560=v4542;
const v4561=v4560["boolean"];
const v4562="ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject";
v4558=!(v4561===v4562);}
v4554=v4558;}
v4550=v4554;}
return v4550;};}
function __prepareFn59(fixed){const v4568=fixed[0];let v4567=false,v4566;
return function(v4563,v4564){let v4565;if(v4568&&v4567){v4565=v4566;}else{
const v4569=v4563;
v4565=v4569["kind"];if(v4568){v4566=v4565;v4567=true;}}
const v4570=v4565;
const v4571="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant";
const v4572=(v4570===v4571);
let v4573;if(v4572){
v4573=true;}else{
const v4574=v4565;
const v4575="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary";
const v4576=(v4574===v4575);
let v4577;if(v4576){
v4577=true;}else{
const v4578=v4565;
const v4579="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary";
const v4580=(v4578===v4579);
let v4581;if(v4580){
const v4582=v4563;
const v4583=v4582["unary"];
const v4584=v4564;
v4581=__fn58(v4583,v4584);}else{
const v4585=v4565;
const v4586="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine";
const v4587=(v4585===v4586);
let v4588;if(v4587){
v4588=true;}else{
const v4589=v4565;
const v4590="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu";
const v4591=(v4589===v4590);
let v4592;if(v4591){
const v4593=v4564;
v4592=v4593["piecewise"];}else{
const v4594=v4565;
const v4595="ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select";
const v4596=(v4594===v4595);
let v4597;if(v4596){
const v4598=v4564;
v4597=v4598["piecewise"];}else{
const v4599=v4564;
const v4600=v4599["index"];
const v4601="ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject";
v4597=!(v4600===v4601);}
v4592=v4597;}
v4588=v4592;}
v4581=v4588;}
v4577=v4581;}
v4573=v4577;}
return v4573;};}
function __prepareFn66(fixed){const v4640=fixed[0]&&fixed[3];let v4639=false,v4638;
const v4658=true;let v4657=false,v4656;
const v4688=fixed[0]&&fixed[1]&&fixed[2];let v4687=false,v4686;
return function(v4633,v4634,v4635,v4636){let v4637;if(v4640&&v4639){v4637=v4638;}else{
const v4641=v4633;
const v4642=v4641["nodes"];
let v4643=true;
for(let v4644=0;v4644<v4642.length;v4644++){
const v4645=v4642[v4644];
const v4646=v4643;
let v4647=v4646;if(v4647){
const v4648=v4645;
const v4649=v4636;
v4647=__fn59(v4648,v4649);}
v4643=v4647;
}
v4637=v4643;if(v4640){v4638=v4637;v4639=true;}}
const v4650=v4637;
const v4651=false;
const v4652=(v4650===v4651);
let v4653;if(v4652){
v4653=({Err:"explicit gradient policy required"});}else{
const v4654=__bufferFill((v4634).length,__nfFromBits(0));
let v4655;if(v4658&&v4657){v4655=v4656;}else{
v4655=0;if(v4658){v4656=v4655;v4657=true;}}
const v4660=v4635;
const v4661=v4654;
const v4662=v4655;
let v4663=({["g"]:v4661,["i"]:v4662});
for(let v4664=0;v4664<v4660.length;v4664++){
const v4665=v4660[v4664];
const v4666=v4663;
const v4667=v4666["g"];
const v4668=v4663;
const v4669=v4668["i"];
const v4670=v4667;
const v4671=v4633;
const v4672=v4671["roots"];
const v4673=v4669;
let v4674;if(v4673<v4672.length){v4674=v4672[v4673];}else{
v4674=0;}
const v4675=v4674;
const v4676=__nfValue(v4665);
const v4677=__fn56(v4670,v4675,v4676);
const v4678=v4669;
const v4679=1;
const v4680=(((v4678) + (v4679)) >>> 0);
const v4681=v4677;
const v4682=v4680;
v4663=({["g"]:v4681,["i"]:v4682});
}
const v4659=v4663;
const v4684=v4659;
const v4683=v4684["g"];
let v4685;if(v4688&&v4687){v4685=v4686;}else{
const v4689=v4659;
v4685=v4689["i"];if(v4688){v4686=v4685;v4687=true;}}
const v4691=v4633;
const v4692=v4691["nodes"];
const v4693=v4683;
const v4694=(v4634).length;
let v4695=({["gradient"]:v4693,["wire"]:v4694});
for(let v4696=v4692.length-1;v4696>=0;v4696--){
const v4697=v4692[v4696];
const v4698=v4697;
const v4699=v4695;
const v4700=v4634;
const v4701=v4636;
v4695=__fn64(v4698,v4699,v4700,v4701);
}
const v4690=v4695;
const v4702=v4690;
const v4703=v4702["gradient"];
const v4704=v4703.freeze();
const v4705=v4633;
v4653=({Ok:v4704.slice(0,v4705["inputs"])});}
return v4653;};}
function __prepareFn72(fixed){const v4881=fixed[0];let v4880=false,v4879;
return function(v4872){const v4873=v4872;
const v4874=__fn70(v4873);
const v4875=false;
const v4876=(v4874===v4875);
let v4877;if(v4876){
v4877=({Err:"nonfinite weights"});}else{
let v4878;if(v4881&&v4880){v4878=v4879;}else{
const v4882=v4872;
const v4883=v4882.length;
const v4884=new Array(v4883);
for(let v4885=0;v4885<v4883;v4885++){
const v4886=v4882[v4885];
v4884[v4885]=__nfFromBits(0);
}
v4878=v4884;if(v4881){v4879=v4878;v4880=true;}}
const v4887=v4872;
const v4888=v4878;
const v4889=v4878;
const v4890=0;
const v4891=__nfFromBits(1065353216);
const v4892=__nfFromBits(1065353216);
v4877=({Ok:({["weights"]:v4887,["first"]:v4888,["second"]:v4889,["steps"]:v4890,["first_power"]:v4891,["second_power"]:v4892})});}
return v4877;};}
function __prepareFn75(fixed){const v4959=fixed[0];let v4958=false,v4957;
const v4976=fixed[0];let v4975=false,v4974;
const v4988=fixed[0]&&fixed[1];let v4987=false,v4986;
return function(v4950,v4951){const v4952=__nfValue(v4951);
const v4953=__nfFromBits(0);
const v4954=((__nfNumber(v4952)) === (__nfNumber(v4953)));
let v4955;if(v4954){
v4955=__nfFromBits(1065353216);}else{
let v4956;if(v4959&&v4958){v4956=v4957;}else{
const v4960=v4950;
let v4961=__nfFromBits(0);
for(let v4962=0;v4962<v4960.length;v4962++){
const v4963=v4960[v4962];
const v4964=__nfValue(v4963);
const v4965=__fn74(v4964);
const v4966=__nfValue(v4961);
let v4967;if(((__nfNumber(v4965)) > (__nfNumber(v4966)))){
const v4968=__nfValue(v4963);
v4967=__fn74(v4968);}else{
v4967=__nfValue(v4961);}
v4961=v4967;
}
v4956=v4961;if(v4959){v4957=v4956;v4958=true;}}
const v4969=__nfValue(v4956);
const v4970=__nfFromBits(0);
const v4971=((__nfNumber(v4969)) === (__nfNumber(v4970)));
let v4972;if(v4971){
v4972=__nfFromBits(1065353216);}else{
let v4973;if(v4976&&v4975){v4973=v4974;}else{
const v4977=v4950;
let v4978=__nfFromBits(0);
for(let v4979=0;v4979<v4977.length;v4979++){
const v4980=v4977[v4979];
const v4981=__nfValue(v4978);
const v4982=Math.fround((__nfNumber(__nfValue(v4980)))/(__nfNumber(__nfValue(v4956))));
const v4983=Math.fround((__nfNumber(__nfValue(v4980)))/(__nfNumber(__nfValue(v4956))));
const v4984=Math.fround(v4982 * v4983);
v4978=Math.fround(__nfNumber(v4981) + v4984);
}
v4973=v4978;if(v4976){v4974=v4973;v4975=true;}}
let v4985;if(v4988&&v4987){v4985=v4986;}else{
v4985=Math.fround((__nfNumber(Math.fround((__nfNumber(__nfValue(v4951)))/(__nfNumber(__nfValue(v4956))))))/(__nfNumber(Math.fround(Math.sqrt(__nfNumber(__nfValue(v4973)))))));if(v4988){v4986=v4985;v4987=true;}}
const v4989=__nfValue(v4985);
const v4990=__nfFromBits(1065353216);
const v4991=((__nfNumber(v4989)) < (__nfNumber(v4990)));
let v4992;if(v4991){
v4992=__nfValue(v4985);}else{
v4992=__nfFromBits(1065353216);}
v4972=v4992;}
v4955=v4972;}
return v4955;};}
function __prepareFn77(fixed){const v5043=true;let v5042=false,v5041;
const v5077=fixed[0]&&fixed[1]&&fixed[2];let v5076=false,v5075;
const v5082=fixed[0]&&fixed[1]&&fixed[2];let v5081=false,v5080;
const v5092=fixed[0]&&fixed[1]&&fixed[2];let v5091=false,v5090;
const v5099=fixed[0]&&fixed[2];let v5098=false,v5097;
const v5107=fixed[0]&&fixed[2];let v5106=false,v5105;
const v5118=true;let v5117=false,v5116;
const v5203=fixed[0]&&fixed[1]&&fixed[2];let v5202=false,v5201;
const v5212=fixed[0]&&fixed[1]&&fixed[2];let v5211=false,v5210;
return function(v5011,v5012,v5013){const v5014=v5011;
const v5015=__fn71(v5014);
const v5016=false;
const v5017=(v5015===v5016);
let v5018=v5017;if(!v5018){
const v5019=v5013;
const v5020=__fn73(v5019);
const v5021=false;
v5018=(v5020===v5021);}
const v5022=v5018;
let v5023=v5022;if(!v5023){
const v5024=(v5012).length;
const v5025=v5011;
const v5026=(v5025["weights"]).length;
v5023=!(v5024===v5026);}
const v5027=v5023;
let v5028=v5027;if(!v5028){
const v5029=v5012;
const v5030=__fn70(v5029);
const v5031=false;
v5028=(v5030===v5031);}
const v5032=v5028;
let v5033=v5032;if(!v5033){
const v5034=v5011;
const v5035=v5034["steps"];
const v5036=4294967295;
v5033=(v5035===v5036);}
const v5037=v5033;
let v5038;if(v5037){
v5038=({Err:"optimizer domain"});}else{
const v5039=new __InkBuffer([]);
let v5040;if(v5043&&v5042){v5040=v5041;}else{
v5040=0;if(v5043){v5041=v5040;v5042=true;}}
const v5045=v5012;
const v5046=v5039;
const v5047=v5040;
let v5048=({["adjusted"]:v5046,["i"]:v5047});
for(let v5049=0;v5049<v5045.length;v5049++){
const v5050=v5045[v5049];
const v5051=v5048;
const v5052=v5051["adjusted"];
const v5053=v5048;
const v5054=v5053["i"];
const v5055=v5052;
const v5056=__nfValue(v5050);
const v5057=v5013;
const v5058=__nfValue(v5057["weight_decay"]);
const v5059=v5011;
const v5060=v5059["weights"];
const v5061=v5054;
let v5062;if(v5061<v5060.length){v5062=v5060[v5061];}else{
v5062=__nfFromBits(0);}
const v5063=__nfValue(v5062);
const v5064=Math.fround(__nfNumber(v5058) * __nfNumber(v5063));
const v5065=Math.fround(__nfNumber(v5056) + v5064);
const v5066=__tempEdit(v5055,"push",v5065);
const v5067=v5054;
const v5068=1;
const v5069=(((v5067) + (v5068)) >>> 0);
const v5070=v5066;
const v5071=v5069;
v5048=({["adjusted"]:v5070,["i"]:v5071});
}
const v5044=v5048;
const v5073=v5044;
const v5072=v5073["adjusted"];
let v5074;if(v5077&&v5076){v5074=v5075;}else{
const v5078=v5044;
v5074=v5078["i"];if(v5077){v5075=v5074;v5076=true;}}
let v5079;if(v5082&&v5081){v5079=v5080;}else{
const v5083=v5072;
v5079=v5083.freeze();if(v5082){v5080=v5079;v5081=true;}}
const v5084=v5079;
const v5085=__fn70(v5084);
const v5086=false;
const v5087=(v5085===v5086);
let v5088;if(v5087){
v5088=({Err:"nonfinite gradient"});}else{
let v5089;if(v5092&&v5091){v5089=v5090;}else{
const v5093=v5079;
const v5094=v5013;
const v5095=__nfValue(v5094["norm_limit"]);
v5089=__fn75(v5093,v5095);if(v5092){v5090=v5089;v5091=true;}}
let v5096;if(v5099&&v5098){v5096=v5097;}else{
const v5100=v5011;
const v5101=__nfValue(v5100["first_power"]);
const v5102=v5013;
const v5103=__nfValue(v5102["first_decay"]);
v5096=Math.fround(__nfNumber(v5101) * __nfNumber(v5103));if(v5099){v5097=v5096;v5098=true;}}
let v5104;if(v5107&&v5106){v5104=v5105;}else{
const v5108=v5011;
const v5109=__nfValue(v5108["second_power"]);
const v5110=v5013;
const v5111=__nfValue(v5110["second_decay"]);
v5104=Math.fround(__nfNumber(v5109) * __nfNumber(v5111));if(v5107){v5105=v5104;v5106=true;}}
const v5112=new __InkBuffer([]);
const v5113=new __InkBuffer([]);
const v5114=new __InkBuffer([]);
let v5115;if(v5118&&v5117){v5115=v5116;}else{
v5115=0;if(v5118){v5116=v5115;v5117=true;}}
const v5120=v5079;
const v5121=v5113;
const v5122=v5115;
const v5123=v5114;
const v5124=v5112;
let v5125=({["first"]:v5121,["i"]:v5122,["second"]:v5123,["weights"]:v5124});
for(let v5126=0;v5126<v5120.length;v5126++){
const v5127=v5120[v5126];
const v5128=v5125;
const v5129=v5128["first"];
const v5130=v5125;
const v5131=v5130["i"];
const v5132=v5125;
const v5133=v5132["second"];
const v5134=v5125;
const v5135=v5134["weights"];
const v5136=__nfValue(v5127);
const v5137=__nfValue(v5089);
const v5138=Math.fround(__nfNumber(v5136) * __nfNumber(v5137));
const v5139=v5013;
const v5140=__nfValue(v5139["first_decay"]);
const v5141=v5011;
const v5142=v5141["first"];
const v5143=v5131;
let v5144;if(v5143<v5142.length){v5144=v5142[v5143];}else{
v5144=__nfFromBits(0);}
const v5145=__nfValue(v5144);
const v5146=Math.fround(__nfNumber(v5140) * __nfNumber(v5145));
const v5147=__nfFromBits(1065353216);
const v5148=v5013;
const v5149=__nfValue(v5148["first_decay"]);
const v5150=Math.fround(v5147 - __nfNumber(v5149));
const v5151=v5138;
const v5152=Math.fround(v5150 * v5151);
const v5153=Math.fround(v5146 + v5152);
const v5154=v5013;
const v5155=__nfValue(v5154["second_decay"]);
const v5156=v5011;
const v5157=v5156["second"];
const v5158=v5131;
let v5159;if(v5158<v5157.length){v5159=v5157[v5158];}else{
v5159=__nfFromBits(0);}
const v5160=__nfValue(v5159);
const v5161=Math.fround(__nfNumber(v5155) * __nfNumber(v5160));
const v5162=__nfFromBits(1065353216);
const v5163=v5013;
const v5164=__nfValue(v5163["second_decay"]);
const v5165=Math.fround(v5162 - __nfNumber(v5164));
const v5166=v5138;
const v5167=Math.fround(v5165 * v5166);
const v5168=v5138;
const v5169=Math.fround(v5167 * v5168);
const v5170=Math.fround(v5161 + v5169);
const v5171=v5011;
const v5172=v5171["weights"];
const v5173=v5131;
let v5174;if(v5173<v5172.length){v5174=v5172[v5173];}else{
v5174=__nfFromBits(0);}
const v5175=__nfValue(v5174);
const v5176=v5153;
const v5177=v5170;
const v5178=__nfValue(v5096);
const v5179=__nfValue(v5104);
const v5180=v5013;
const v5181=__fn76(v5175,v5176,v5177,v5178,v5179,v5180);
const v5182=v5135;
const v5183=__nfValue(v5181);
const v5184=__tempEdit(v5182,"push",v5183);
const v5185=v5129;
const v5186=v5153;
const v5187=__tempEdit(v5185,"push",v5186);
const v5188=v5133;
const v5189=v5170;
const v5190=__tempEdit(v5188,"push",v5189);
const v5191=v5131;
const v5192=1;
const v5193=(((v5191) + (v5192)) >>> 0);
const v5194=v5187;
const v5195=v5193;
const v5196=v5190;
const v5197=v5184;
v5125=({["first"]:v5194,["i"]:v5195,["second"]:v5196,["weights"]:v5197});
}
const v5119=v5125;
const v5199=v5119;
const v5198=v5199["first"];
let v5200;if(v5203&&v5202){v5200=v5201;}else{
const v5204=v5119;
v5200=v5204["i"];if(v5203){v5201=v5200;v5202=true;}}
const v5206=v5119;
const v5205=v5206["second"];
const v5208=v5119;
const v5207=v5208["weights"];
let v5209;if(v5212&&v5211){v5209=v5210;}else{
const v5213=v5207;
const v5214=v5213.freeze();
const v5215=v5198;
const v5216=v5215.freeze();
const v5217=v5205;
const v5218=v5217.freeze();
const v5219=v5011;
const v5220=v5219["steps"];
const v5221=1;
const v5222=(((v5220) + (v5221)) >>> 0);
const v5223=__nfValue(v5096);
const v5224=__nfValue(v5104);
v5209=({["weights"]:v5214,["first"]:v5216,["second"]:v5218,["steps"]:v5222,["first_power"]:v5223,["second_power"]:v5224});if(v5212){v5210=v5209;v5211=true;}}
const v5225=v5209;
const v5226=__fn71(v5225);
const v5227=false;
const v5228=(v5226===v5227);
let v5229;if(v5228){
v5229=({Err:"nonfinite optimizer update"});}else{
v5229=({Ok:v5209});}
v5088=v5229;}
v5038=v5088;}
return v5038;};}
const __preparedFactories=new Map([[5,__prepareFn5],[11,__prepareFn11],[18,__prepareFn18],[19,__prepareFn19],[20,__prepareFn20],[29,__prepareFn29],[30,__prepareFn30],[31,__prepareFn31],[32,__prepareFn32],[36,__prepareFn36],[37,__prepareFn37],[39,__prepareFn39],[40,__prepareFn40],[41,__prepareFn41],[45,__prepareFn45],[47,__prepareFn47],[54,__prepareFn54],[58,__prepareFn58],[59,__prepareFn59],[66,__prepareFn66],[72,__prepareFn72],[75,__prepareFn75],[77,__prepareFn77]]);
const __namedTypes={"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v13","core_sha256":"bc6091bf8add2f954ce12b87a97f042dcc49e288c70ead67c6b670d4f75b9bfc","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"architecture","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":1,"internal":false,"name":"dimensions","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":null,"index":2,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":3,"internal":false,"name":"prepared","parallel":false,"params":[{"name":"net","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":4,"internal":false,"name":"prediction","parallel":false,"params":[{"name":"net","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":5,"internal":false,"name":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"destination":null,"index":6,"internal":true,"name":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","parallel":false,"params":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"inputs","type":{"kind":"u32"}},{"name":"parameter","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"}},{"destination":null,"index":7,"internal":true,"name":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":8,"internal":true,"name":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":9,"internal":true,"name":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":10,"internal":true,"name":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","parallel":false,"params":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"width","type":{"kind":"u32"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"destination":null,"index":11,"internal":false,"name":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","parallel":false,"params":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},{"destination":null,"index":12,"internal":false,"name":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":13,"internal":false,"name":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":14,"internal":false,"name":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":15,"internal":false,"name":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":16,"internal":false,"name":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","parallel":false,"params":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":17,"internal":false,"name":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":18,"internal":false,"name":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","parallel":false,"params":[{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":19,"internal":false,"name":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":20,"internal":false,"name":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":21,"internal":false,"name":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":22,"internal":false,"name":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":23,"internal":false,"name":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":24,"internal":false,"name":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":25,"internal":false,"name":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":26,"internal":false,"name":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":27,"internal":false,"name":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":28,"internal":false,"name":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","parallel":false,"params":[{"name":"a","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":29,"internal":false,"name":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":30,"internal":false,"name":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","parallel":false,"params":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":31,"internal":false,"name":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","parallel":false,"params":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":32,"internal":false,"name":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","parallel":false,"params":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":33,"internal":false,"name":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":34,"internal":false,"name":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":null,"index":35,"internal":false,"name":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":36,"internal":false,"name":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":37,"internal":false,"name":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"destination":null,"index":38,"internal":true,"name":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"name":"inputs","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"}},{"destination":null,"index":39,"internal":false,"name":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":40,"internal":false,"name":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":41,"internal":false,"name":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","parallel":false,"params":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},{"destination":null,"index":42,"internal":false,"name":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":43,"internal":false,"name":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":44,"internal":false,"name":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":45,"internal":false,"name":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":46,"internal":false,"name":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","parallel":false,"params":[{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":47,"internal":false,"name":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":48,"internal":true,"name":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":49,"internal":true,"name":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","parallel":false,"params":[{"name":"values","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":50,"internal":true,"name":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":51,"internal":false,"name":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","parallel":false,"params":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":52,"internal":true,"name":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"values","type":{"kind":"temporary"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"}},{"destination":null,"index":53,"internal":true,"name":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}}],"precondition":null,"result":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}},{"destination":null,"index":54,"internal":false,"name":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},{"destination":null,"index":55,"internal":false,"name":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":56,"internal":true,"name":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":57,"internal":true,"name":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":58,"internal":false,"name":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":59,"internal":false,"name":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":60,"internal":true,"name":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ts","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gs","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":61,"internal":true,"name":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","parallel":false,"params":[{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":62,"internal":true,"name":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":63,"internal":true,"name":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","parallel":false,"params":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"g","type":{"kind":"temporary"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"a","type":{"kind":"u32"}},{"name":"wire","type":{"kind":"u32"}},{"name":"amount","type":{"kind":"f32"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"kind":"temporary"}},{"destination":null,"index":64,"internal":true,"name":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","parallel":false,"params":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"work","type":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"}},{"destination":null,"index":65,"internal":false,"name":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":66,"internal":false,"name":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":67,"internal":false,"name":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},{"destination":null,"index":68,"internal":false,"name":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","parallel":false,"params":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},{"destination":null,"index":69,"internal":false,"name":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","parallel":false,"params":[{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},{"destination":null,"index":70,"internal":false,"name":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":71,"internal":false,"name":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":72,"internal":false,"name":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","parallel":false,"params":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},{"destination":null,"index":73,"internal":false,"name":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","parallel":false,"params":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":74,"internal":false,"name":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":75,"internal":false,"name":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":76,"internal":false,"name":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","parallel":false,"params":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":77,"internal":false,"name":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}],"named_types":{"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_16"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28":{"fields":[{"name":"next","type":{"kind":"u32"}},{"name":"positions","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_28"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42":{"fields":[{"name":"compact","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_42"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5":{"fields":[{"name":"live","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_5"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58":{"fields":[{"name":"g","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_58"},"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73":{"fields":[{"name":"g","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_4252f67caefa6bed4320d43b73fd6e166aec15ba4532eaf6bf60b93f2cb4b2a8_73"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18":{"fields":[{"name":"shape","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_18"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29":{"fields":[{"name":"layer","type":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"}},{"name":"wires","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_29"},"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"terms","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_497279c9dc1b447037a0398c7d2a909ff76fd54c677732e11dce0d29f85bcb46_8"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506":{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20e83c8e0d62610ffd82412b6d826af33136856c78333225e90f13c47b2ea03a"},"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d":{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"},"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"},"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m92fbe146abefa8135b409230555fa0d4a1ebe86f4c2c2485cc60280101a0a86c"},"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26":{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"},"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"},"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d":{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"parameter","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdf765d3fa1ec6a40fb38e65481d9287be3754e6a5ec6f32200ce8233c2b8454d"},"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":false,"function":"architecture","reason":"no reusable lexical bindings"},{"factory":false,"function":"dimensions","reason":"no reusable lexical bindings"},{"factory":false,"function":"derivatives","reason":"no reusable lexical bindings"},{"factory":false,"function":"prepared","reason":"no reusable lexical bindings"},{"factory":false,"function":"prediction","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d","retained_bindings":6},{"factory":false,"function":"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef","retained_bindings":10},{"factory":false,"function":"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37","retained_bindings":2},{"factory":true,"function":"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc","retained_bindings":2},{"factory":true,"function":"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5","retained_bindings":2},{"factory":false,"function":"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465","retained_bindings":3},{"factory":true,"function":"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda","retained_bindings":5},{"factory":true,"function":"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e","retained_bindings":2},{"factory":true,"function":"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b","retained_bindings":4},{"factory":false,"function":"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2","retained_bindings":1},{"factory":true,"function":"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919","retained_bindings":12},{"factory":false,"function":"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680","retained_bindings":1},{"factory":true,"function":"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096","retained_bindings":2},{"factory":true,"function":"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b","retained_bindings":9},{"factory":false,"function":"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c","retained_bindings":1},{"factory":false,"function":"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885","retained_bindings":1},{"factory":false,"function":"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf","retained_bindings":1},{"factory":false,"function":"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131","reason":"prepared residual requires a bounded pure value entry"},{"factory":true,"function":"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54","retained_bindings":1},{"factory":true,"function":"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd","retained_bindings":1},{"factory":false,"function":"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6","reason":"prepared residual requires a bounded pure value entry"},{"factory":false,"function":"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04","retained_bindings":3},{"factory":false,"function":"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","retained_bindings":1},{"factory":false,"function":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","retained_bindings":3},{"factory":false,"function":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","retained_bindings":9}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"architecture":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"b1901874bbf29870222bc15474e17de25e488ef782b6683c07f079bc4cc67c2f","named":{},"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"dimensions":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab":{"arguments":{"format":"ink-value-wire-v1","identity":"a9d67b7a474f78841986a2160f6d9330ec73efe55bb06560a35a27a22ad078b5","named":{},"root":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda":{"arguments":{"format":"ink-value-wire-v1","identity":"7254fbee57d42f736c0f825449a9b065c12198183b33b26d30428ff920a008ae","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b":{"arguments":{"format":"ink-value-wire-v1","identity":"555dc53c180f658bfeadabb7dc93faee3ecb050e4d361f2317d479a981d70366","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}}},"ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef":{"arguments":{"format":"ink-value-wire-v1","identity":"28ef8297283ebede64ffe544630efa9356af29e3803672c36e707dc524c40af1","named":{},"root":{"fields":[{"name":"features","type":{"kind":"u32"}},{"name":"hidden","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"outputs","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}}},"ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232":{"arguments":{"format":"ink-value-wire-v1","identity":"cf1df8922a11693c743c600a41f4b601fb318573502b1969dd80e8f8e61ce323","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}}},"ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885":{"arguments":{"format":"ink-value-wire-v1","identity":"2e0e1dcbe39022ec0013995dcb0ad9599bb14f81894818dd7060c98db35e5d34","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54":{"arguments":{"format":"ink-value-wire-v1","identity":"2c9054b387b8572a66262afe8a2faee4b7a920b3a5bfb92db1126257747f1fd0","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37":{"arguments":{"format":"ink-value-wire-v1","identity":"d4cb0361a7a8833933106ca6dd70006e19100c770fe048f31d961bc14fa899fc","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926":{"arguments":{"format":"ink-value-wire-v1","identity":"b04b32203f8d88e2db519e2e81cbaa387f5a1fa076ea8a147c2b109278fe5299","named":{},"root":{"fields":[{"name":"a","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":{"unsupported":"unsupported wire descriptor"},"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be":{"arguments":{"format":"ink-value-wire-v1","identity":"e0ef5b019bff93f73efd86b897d6f35ea8eb8b607d972cd47729126beaf5fafa","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b":{"arguments":{"format":"ink-value-wire-v1","identity":"17ee49e34ea5590c8aa89fbcc5cdde0b5e5b337ceaabb58d902e892e0b22008f","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":{"unsupported":"unsupported wire descriptor"},"ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680":{"arguments":{"format":"ink-value-wire-v1","identity":"1a130fd0ae83873939c3a1dd7db0523d36e865b9102a6628c436dd1503402d53","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":{"unsupported":"unsupported wire descriptor"},"ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3":{"arguments":{"format":"ink-value-wire-v1","identity":"f6ca75f73d60cd2314d69c64454363e593db695767e343195d3b23919755c574","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5":{"arguments":{"format":"ink-value-wire-v1","identity":"3061a46bc74994007e2c94750186c015993dcdb0b813ca54f2c8031fbae28ae1","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":{"unsupported":"unsupported wire descriptor"},"ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35":{"arguments":{"format":"ink-value-wire-v1","identity":"d7bb8db3ffe558eca9f4f6716e44807734e18db170e874ada1038fb500fa33ad","named":{},"root":{"fields":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30":{"arguments":{"format":"ink-value-wire-v1","identity":"c25723d7f2d5c86fdce912dff77de10ffff544058fed24a24e223b43ca727991","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}}},"ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":{"unsupported":"unsupported wire descriptor"},"ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465":{"arguments":{"format":"ink-value-wire-v1","identity":"857eb1fd05b55c610f44a62e8bf5909738cf119299eddaf110ddd150f5e6272d","named":{},"root":{"fields":[{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"bias","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":{"unsupported":"unsupported wire descriptor"},"ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e":{"arguments":{"format":"ink-value-wire-v1","identity":"ed136e460e172de1e9db88a4ce327b9fc66430265d41930c518abc13cfe2e33e","named":{},"root":{"fields":[{"name":"gate","type":{"kind":"u32"}},{"name":"off","type":{"kind":"u32"}},{"name":"on","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870":{"arguments":{"format":"ink-value-wire-v1","identity":"1f67ce9481e7bf03a3ba8bccc64b89e5b1d9b8f8a998daa1446d82f94a820dea","named":{},"root":{"fields":[{"name":"index","type":{"kind":"f32"}},{"name":"n","type":{"kind":"u32"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6":{"arguments":{"format":"ink-value-wire-v1","identity":"e51b1ecf962bb0543c48fc745ad9362d4c69875b16b51ec10c397849490db9cc","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2":{"arguments":{"format":"ink-value-wire-v1","identity":"6d8292587d247aa2935d40c05b97e3e8ee25c23a651a20e8a39f9b9a91a4167f","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":{"unsupported":"unsupported wire descriptor"},"ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":{"unsupported":"unsupported wire descriptor"},"ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c":{"arguments":{"format":"ink-value-wire-v1","identity":"1f3d1f2e5000eabd3285bec367aea83311b89ab0ac1924cb638c4d675e087937","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db":{"arguments":{"format":"ink-value-wire-v1","identity":"95732fc2e08ae05f4d215e9e358781620c82dea66fab6ca4ada670422dd62463","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5":{"arguments":{"format":"ink-value-wire-v1","identity":"a7c17d063bba03b64d18b54cb89be038b3c836fdbf7ee6cc9644e5db742a8d67","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":{},"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}},"ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc":{"arguments":{"format":"ink-value-wire-v1","identity":"607073caea048d19b6ff898d804ca7c0689e88386444b2d2fbfb06bd1c9a0b07","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":{"unsupported":"unsupported wire descriptor"},"ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":{"unsupported":"unsupported wire descriptor"},"ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e":{"arguments":{"format":"ink-value-wire-v1","identity":"7aa59bf208f3650543459db164197f9767215047ec4b0a391fd81b408a47694a","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a":{"arguments":{"format":"ink-value-wire-v1","identity":"a7e48a9b65cef422fe6358d16d631967501adc8236adc79f07a4a40b209962ac","named":{},"root":{"fields":[{"name":"network","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":{"unsupported":"unsupported wire descriptor"},"ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":{"unsupported":"unsupported wire descriptor"},"ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0":{"arguments":{"format":"ink-value-wire-v1","identity":"fc196cc25690823dcbe69ce5b7beb1a54cfad2f6a3a27524d4fe309db03538c6","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096":{"arguments":{"format":"ink-value-wire-v1","identity":"bb4f6cbf585c1725e771d97023bb1e02f6c172cf56394954edf02c361e6ffc0e","named":{},"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd":{"arguments":{"format":"ink-value-wire-v1","identity":"700a0161a0e4bb6ba9dbf453a8dfe5ea8476df708b4a84e6f0946c2a3667f241","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919":{"arguments":{"format":"ink-value-wire-v1","identity":"75df379d5249d5925250176c06044d8eed3cdd1bbcada81ac35d377b355cba75","named":{},"root":{"fields":[{"name":"node","type":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},{"name":"positions","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":{"unsupported":"unsupported wire descriptor"},"ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c":{"arguments":{"format":"ink-value-wire-v1","identity":"3f17cb2fa22c2f1c799254580140d2b7d9f44d03f28a4e0c26daf7520e8fd345","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"input","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}},"ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d":{"arguments":{"format":"ink-value-wire-v1","identity":"468c20c617405d169739cb1297bc13838a3c83cc05dec2f1e904ba16794225fd","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},{"name":"width","type":{"kind":"u32"}},{"name":"gated","type":{"kind":"bool"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":{},"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}}},"ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":{"unsupported":"unsupported wire descriptor"},"ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":{"unsupported":"unsupported wire descriptor"},"ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4":{"arguments":{"format":"ink-value-wire-v1","identity":"257076359fcaa3cfec2f57c2561bb8c1c823dde6d68a4fa0f2568fe5c857ac9c","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seeds","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"policy","type":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":{"unsupported":"unsupported wire descriptor"},"ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a":{"arguments":{"format":"ink-value-wire-v1","identity":"d737900963d56d97014342bc9f3108cd70129bb46da430410930635a058f4c34","named":{},"root":{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}}},"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7":{"arguments":{"format":"ink-value-wire-v1","identity":"fb0d53fcc5118c446d80e19c4ffd8b95f7979f94f7fb23149d3518375b621a75","named":{},"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":{"unsupported":"unsupported wire descriptor"},"ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73":{"arguments":{"format":"ink-value-wire-v1","identity":"868c559171d48b629b55cd1f8be389205c45219105b4c5ad74035a6263edb6cf","named":{},"root":{"fields":[{"name":"plan","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d":{"arguments":{"format":"ink-value-wire-v1","identity":"4748bdf2b6e86fd410744d69adce4514614c078ede8a1a3a86a717f27b6f4802","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}},"ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":{"unsupported":"unsupported wire descriptor"},"prediction":{"arguments":{"format":"ink-value-wire-v1","identity":"a263fd82ea8182677e325b373c4a2a71b975e9eb94bfe1b4fe9a09d10f9257b4","named":{},"root":{"fields":[{"name":"net","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"prepared":{"arguments":{"format":"ink-value-wire-v1","identity":"24fa55a5553d0b5fb9ee15e06118f2ce8dc501bc35c517e3a5cc470e5c5d5f25","named":{},"root":{"fields":[{"name":"net","type":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"target","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18,__fn19,__fn20,__fn21,__fn22,__fn23,__fn24,__fn25,__fn26,__fn27,__fn28,__fn29,__fn30,__fn31,__fn32,__fn33,__fn34,__fn35,__fn36,__fn37,__fn38,__fn39,__fn40,__fn41,__fn42,__fn43,__fn44,__fn45,__fn46,__fn47,__fn48,__fn49,__fn50,__fn51,__fn52,__fn53,__fn54,__fn55,__fn56,__fn57,__fn58,__fn59,__fn60,__fn61,__fn62,__fn63,__fn64,__fn65,__fn66,__fn67,__fn68,__fn69,__fn70,__fn71,__fn72,__fn73,__fn74,__fn75,__fn76,__fn77];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[],"types":[]},{"capture":[],"types":[]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"},{"kind":"u32"},{"kind":"bool"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"kind":"temporary"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[false,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"nodes","type":{"kind":"temporary"}},{"name":"outputs","type":{"kind":"temporary"}},{"name":"parameter","type":{"kind":"u32"}},{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m1815bc8bb250699dcce030e877ae946d8058b171d102ac4fee7b4b6a556015b8"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false],"types":[{"fields":[{"name":"parameters","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false],"types":[{"fields":[{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true],"types":[{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true,true],"types":[{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true,true],"types":[{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"kind":"u32"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"bool"},{"kind":"bool"}]},{"capture":[],"types":[]},{"capture":[],"types":[]},{"capture":[],"types":[]},{"capture":[false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}]},{"capture":[true,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[false,false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"live","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_m0171091113066078477ab603004c5067f09a8b58b3d467bf614c5552479c1506"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"u32"}]},{"capture":[true,false,true],"types":[{"kind":"u32"},{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true,true],"types":[{"kind":"u32"},{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"}]},{"capture":[false],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[false],"types":[{"fields":[{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}]},{"capture":[true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[true,false,true],"types":[{"kind":"temporary"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[true,true,true,true],"types":[{"kind":"f32"},{"kind":"u32"},{"kind":"bool"},{"kind":"bool"}]},{"capture":[false,true],"types":[{"fields":[{"name":"a","type":{"kind":"u32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"kind":"temporary"}]},{"capture":[false,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"values","type":{"kind":"temporary"}},{"name":"finite_indices","type":{"kind":"bool"}}],"kind":"record","name":"ink_m5b657cee52db161852bf75de16d034317c72e51712ae01c19905b3a65c68f36d"}]},{"capture":[false,true],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,true],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"kind":"temporary"},{"kind":"u32"},{"kind":"f32"}]},{"capture":[true,false,true],"types":[{"kind":"temporary"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,false],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[true,true,false,true,false,true,true],"types":[{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,true,true,false],"types":[{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"bool"},{"kind":"bool"},{"kind":"f32"},{"fields":[{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[true,true,true,true,true,true],"types":[{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]},{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,true,false],"types":[{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]},{"kind":"temporary"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"u32"},{"kind":"u32"},{"kind":"f32"},{"fields":[{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,false,true,false],"types":[{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},{"fields":[{"name":"gradient","type":{"kind":"temporary"}},{"name":"wire","type":{"kind":"u32"}}],"kind":"record","name":"ink_ma7a6f3504b625ce5e90fa21dfbb2b560db4734bfcf020eb235e1acac45112a26"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,false],"types":[{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]}];

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
function __ownedValue18(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue9(value[i],budget,depth+1);return out;}
function __ownedValue12(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue3(value[i],budget,depth+1);return out;}
function __ownedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue3(value.Some,budget,depth+1)};}
function __ownedValue19(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue18(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue1(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue25(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue2(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue17(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue29(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue30(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue27(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue28(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue32(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue33(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue15(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue3(value.Ok,budget,depth+1)}:{Err:__ownedValue14(value.Err,budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["graph"]:__ownedValue2(value["graph"],budget,depth+1),["parameters"]:__ownedValue3(value["parameters"],budget,depth+1),["features"]:__ownedValue3(value["features"],budget,depth+1),["outputs"]:__ownedValue3(value["outputs"],budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["inputs"]:__ownedValue3(value["inputs"],budget,depth+1),["nodes"]:__ownedValue4(value["nodes"],budget,depth+1),["roots"]:__ownedValue12(value["roots"],budget,depth+1)};}
function __ownedValue5(value,budget,depth){budget.enter(depth,4);return {["kind"]:__ownedValue6(value["kind"],budget,depth+1),["binary"]:__ownedValue7(value["binary"],budget,depth+1),["unary"]:__ownedValue8(value["unary"],budget,depth+1),["a"]:__ownedValue3(value["a"],budget,depth+1),["b"]:__ownedValue3(value["b"],budget,depth+1),["c"]:__ownedValue3(value["c"],budget,depth+1),["value"]:__ownedValue9(value["value"],budget,depth+1),["terms"]:__ownedValue10(value["terms"],budget,depth+1),["gates"]:__ownedValue10(value["gates"],budget,depth+1),["gate_bias"]:__ownedValue9(value["gate_bias"],budget,depth+1),["table"]:__ownedValue12(value["table"],budget,depth+1),["below"]:__ownedValue13(value["below"],budget,depth+1),["above"]:__ownedValue13(value["above"],budget,depth+1)};}
function __ownedValue17(value,budget,depth){budget.enter(depth,4);return {["loss"]:__ownedValue9(value["loss"],budget,depth+1),["outputs"]:__ownedValue18(value["outputs"],budget,depth+1),["gradient"]:__ownedValue18(value["gradient"],budget,depth+1)};}
function __ownedValue30(value,budget,depth){budget.enter(depth,4);return {["outputs"]:__ownedValue18(value["outputs"],budget,depth+1),["gradient"]:__ownedValue18(value["gradient"],budget,depth+1)};}
function __ownedValue20(value,budget,depth){budget.enter(depth,4);return {["parameters"]:__ownedValue3(value["parameters"],budget,depth+1),["nodes"]:__ownedValue3(value["nodes"],budget,depth+1),["width"]:__ownedValue3(value["width"],budget,depth+1),["valid"]:__ownedValue13(value["valid"],budget,depth+1)};}
function __ownedValue21(value,budget,depth){budget.enter(depth,4);return {["piecewise"]:__ownedValue13(value["piecewise"],budget,depth+1),["boolean"]:__ownedValue22(value["boolean"],budget,depth+1),["index"]:__ownedValue23(value["index"],budget,depth+1),["zero"]:__ownedValue24(value["zero"],budget,depth+1)};}
function __ownedValue31(value,budget,depth){budget.enter(depth,4);return {["rate"]:__ownedValue9(value["rate"],budget,depth+1),["first_decay"]:__ownedValue9(value["first_decay"],budget,depth+1),["second_decay"]:__ownedValue9(value["second_decay"],budget,depth+1),["epsilon"]:__ownedValue9(value["epsilon"],budget,depth+1),["weight_decay"]:__ownedValue9(value["weight_decay"],budget,depth+1),["norm_limit"]:__ownedValue9(value["norm_limit"],budget,depth+1)};}
function __ownedValue28(value,budget,depth){budget.enter(depth,4);return {["values"]:__ownedValue18(value["values"],budget,depth+1),["outputs"]:__ownedValue18(value["outputs"],budget,depth+1)};}
function __ownedValue33(value,budget,depth){budget.enter(depth,4);return {["weights"]:__ownedValue18(value["weights"],budget,depth+1),["first"]:__ownedValue18(value["first"],budget,depth+1),["second"]:__ownedValue18(value["second"],budget,depth+1),["steps"]:__ownedValue3(value["steps"],budget,depth+1),["first_power"]:__ownedValue9(value["first_power"],budget,depth+1),["second_power"]:__ownedValue9(value["second_power"],budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,4);return {["wire"]:__ownedValue3(value["wire"],budget,depth+1),["coefficient"]:__ownedValue9(value["coefficient"],budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue23(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue24(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue7(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue22(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue9(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __ownedValue14(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["architecture",__ownedValue0],["dimensions",__ownedValue15],["derivatives",__ownedValue16],["prepared",__ownedValue16],["prediction",__ownedValue19],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",__ownedValue20],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",__ownedValue0],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",__ownedValue3],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",__ownedValue3],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",__ownedValue3],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",__ownedValue19],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",__ownedValue16],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",__ownedValue5],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",__ownedValue5],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",__ownedValue5],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",__ownedValue5],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",__ownedValue5],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",__ownedValue5],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",__ownedValue5],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",__ownedValue5],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",__ownedValue5],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",__ownedValue5],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",__ownedValue5],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",__ownedValue5],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",__ownedValue5],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",__ownedValue5],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",__ownedValue5],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",__ownedValue5],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",__ownedValue21],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",__ownedValue21],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",__ownedValue21],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",__ownedValue12],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",__ownedValue5],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",__ownedValue13],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",__ownedValue13],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",__ownedValue25],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",__ownedValue3],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",__ownedValue3],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",__ownedValue3],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",__ownedValue9],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",__ownedValue9],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",__ownedValue9],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",__ownedValue26],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",__ownedValue27],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",__ownedValue19],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",__ownedValue13],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",__ownedValue13],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",__ownedValue19],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",__ownedValue19],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",__ownedValue29],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",__ownedValue16],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",__ownedValue31],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",__ownedValue13],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",__ownedValue13],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",__ownedValue32],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",__ownedValue13],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",__ownedValue9],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",__ownedValue9],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",__ownedValue9],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",__ownedValue32]]));
function __wireValue5(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue6(reader);reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue12(reader);reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue10(reader);reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue4(reader);reader.finish(end);return value;}
function __wireValue55(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue4(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue56(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue19(reader)};reader.finish(end);return value;}
function __wireValue50(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue51(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue30(reader)};reader.finish(end);return value;}
function __wireValue42(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue41(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __wireValue39(reader){const end=reader.frame();const value={["a"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue62(reader){const end=reader.frame();const value={["a"]:__wireValue4(reader),["b"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["a"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue48(reader){const end=reader.frame();const value={["c"]:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value={["features"]:__wireValue4(reader),["hidden"]:__wireValue13(reader),["outputs"]:__wireValue4(reader),["maximum"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue53(reader){const end=reader.frame();const value={["gate"]:__wireValue4(reader),["off"]:__wireValue4(reader),["on"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={["graph"]:__wireValue3(reader),["parameters"]:__wireValue4(reader),["features"]:__wireValue4(reader),["outputs"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue54(reader){const end=reader.frame();const value={["index"]:__wireValue10(reader),["n"]:__wireValue4(reader),["below"]:__wireValue14(reader),["above"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue44(reader){const end=reader.frame();const value={["index"]:__wireValue4(reader),["table"]:__wireValue13(reader),["below"]:__wireValue14(reader),["above"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value={["inputs"]:__wireValue4(reader),["nodes"]:__wireValue5(reader),["roots"]:__wireValue13(reader),["maximum"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue67(reader){const end=reader.frame();const value={["inputs"]:__wireValue4(reader),["nodes"]:__wireValue5(reader),["roots"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={["inputs"]:__wireValue4(reader),["nodes"]:__wireValue5(reader),["roots"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue31(reader){const end=reader.frame();const value={["kind"]:__wireValue9(reader),["a"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue47(reader){const end=reader.frame();const value={["kind"]:__wireValue9(reader),["a"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue32(reader){const end=reader.frame();const value={["kind"]:__wireValue9(reader),["policy"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue65(reader){const end=reader.frame();const value={["kind"]:__wireValue7(reader),["a"]:__wireValue4(reader),["b"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value={["kind"]:__wireValue7(reader),["binary"]:__wireValue8(reader),["unary"]:__wireValue9(reader),["a"]:__wireValue4(reader),["b"]:__wireValue4(reader),["c"]:__wireValue4(reader),["value"]:__wireValue10(reader),["terms"]:__wireValue11(reader),["gates"]:__wireValue11(reader),["gate_bias"]:__wireValue10(reader),["table"]:__wireValue13(reader),["below"]:__wireValue14(reader),["above"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue58(reader){const end=reader.frame();const value={["kind"]:__wireValue8(reader),["a"]:__wireValue10(reader),["b"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue61(reader){const end=reader.frame();const value={["kind"]:__wireValue8(reader),["a"]:__wireValue4(reader),["b"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["loss"]:__wireValue10(reader),["outputs"]:__wireValue17(reader),["gradient"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue77(reader){const end=reader.frame();const value={["net"]:__wireValue2(reader),["weights"]:__wireValue17(reader),["features"]:__wireValue17(reader),["target"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue76(reader){const end=reader.frame();const value={["net"]:__wireValue2(reader),["weights"]:__wireValue17(reader),["features"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue46(reader){const end=reader.frame();const value={["network"]:__wireValue2(reader),["weights"]:__wireValue17(reader),["features"]:__wireValue17(reader),["target"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue64(reader){const end=reader.frame();const value={["network"]:__wireValue2(reader),["weights"]:__wireValue17(reader),["features"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue43(reader){const end=reader.frame();const value={["network"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue68(reader){const end=reader.frame();const value={["node"]:__wireValue6(reader),["policy"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue69(reader){const end=reader.frame();const value={["node"]:__wireValue6(reader),["positions"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue45(reader){const end=reader.frame();const value={["node"]:__wireValue6(reader),["wire"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue57(reader){const end=reader.frame();const value={["node"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue51(reader){const end=reader.frame();const value={["outputs"]:__wireValue17(reader),["gradient"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue72(reader){const end=reader.frame();const value={["parameters"]:__wireValue4(reader),["nodes"]:__wireValue4(reader),["width"]:__wireValue4(reader),["valid"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const value={["piecewise"]:__wireValue14(reader),["boolean"]:__wireValue34(reader),["index"]:__wireValue35(reader),["zero"]:__wireValue36(reader)};reader.finish(end);return value;}
function __wireValue49(reader){const end=reader.frame();const value={["plan"]:__wireValue3(reader),["input"]:__wireValue17(reader),["seeds"]:__wireValue17(reader),["policy"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue70(reader){const end=reader.frame();const value={["plan"]:__wireValue3(reader),["input"]:__wireValue17(reader),["target"]:__wireValue17(reader),["policy"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["plan"]:__wireValue3(reader),["input"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue73(reader){const end=reader.frame();const value={["plan"]:__wireValue3(reader),["values"]:__wireValue17(reader),["seeds"]:__wireValue17(reader),["policy"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue38(reader){const end=reader.frame();const value={["plan"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value={["rate"]:__wireValue10(reader),["first_decay"]:__wireValue10(reader),["second_decay"]:__wireValue10(reader),["epsilon"]:__wireValue10(reader),["weight_decay"]:__wireValue10(reader),["norm_limit"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue75(reader){const end=reader.frame();const value={["rate"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue71(reader){const end=reader.frame();const value={["s"]:__wireValue72(reader),["width"]:__wireValue4(reader),["gated"]:__wireValue14(reader),["maximum"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue40(reader){const end=reader.frame();const value={["state"]:__wireValue41(reader),["gradient"]:__wireValue17(reader),["c"]:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue59(reader){const end=reader.frame();const value={["state"]:__wireValue41(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["terms"]:__wireValue11(reader),["bias"]:__wireValue10(reader),["gates"]:__wireValue11(reader),["gate_bias"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue52(reader){const end=reader.frame();const value={["terms"]:__wireValue11(reader),["bias"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue37(reader){const end=reader.frame();const value={["value"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value={["values"]:__wireValue17(reader),["outputs"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={["weight"]:__wireValue10(reader),["first"]:__wireValue10(reader),["second"]:__wireValue10(reader),["first_power"]:__wireValue10(reader),["second_power"]:__wireValue10(reader),["c"]:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value={["weights"]:__wireValue17(reader),["features"]:__wireValue17(reader),["target"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue41(reader){const end=reader.frame();const value={["weights"]:__wireValue17(reader),["first"]:__wireValue17(reader),["second"]:__wireValue17(reader),["steps"]:__wireValue4(reader),["first_power"]:__wireValue10(reader),["second_power"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue74(reader){const end=reader.frame();const value={["weights"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value={["wire"]:__wireValue4(reader),["coefficient"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue63(reader){const end=reader.frame();const value={["x"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue60(reader){const end=reader.frame();const value={["xs"]:__wireValue17(reader),["limit"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue66(reader){const end=reader.frame();const value={["xs"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __wireValue9Variants=Object.freeze(["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]);
function __wireValue9(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue9Variants);reader.finish(end);return value;}
const __wireValue35Variants=Object.freeze(["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]);
function __wireValue35(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue35Variants);reader.finish(end);return value;}
const __wireValue7Variants=Object.freeze(["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]);
function __wireValue7(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue7Variants);reader.finish(end);return value;}
const __wireValue36Variants=Object.freeze(["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]);
function __wireValue36(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue36Variants);reader.finish(end);return value;}
const __wireValue8Variants=Object.freeze(["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]);
function __wireValue8(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue8Variants);reader.finish(end);return value;}
const __wireValue34Variants=Object.freeze(["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]);
function __wireValue34(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue34Variants);reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["architecture",[__wireValue0,__wireValue1]],["derivatives",[__wireValue16,__wireValue18]],["dimensions",[__wireValue0,__wireValue20]],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",[__wireValue21,__wireValue10]],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",[__wireValue23,__wireValue6]],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",[__wireValue24,__wireValue6]],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",[__wireValue25,__wireValue26]],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",[__wireValue24,__wireValue6]],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",[__wireValue24,__wireValue6]],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",[__wireValue27,__wireValue1]],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",[__wireValue24,__wireValue6]],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",[__wireValue28,__wireValue29]],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",[__wireValue31,__wireValue10]],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",[__wireValue32,__wireValue14]],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",[__wireValue37,__wireValue6]],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",[__wireValue38,__wireValue4]],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",[__wireValue39,__wireValue10]],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",[__wireValue0,__wireValue33]],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",[__wireValue40,__wireValue42]],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",[__wireValue43,__wireValue4]],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",[__wireValue44,__wireValue6]],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",[__wireValue45,__wireValue14]],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",[__wireValue0,__wireValue33]],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",[__wireValue46,__wireValue18]],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",[__wireValue47,__wireValue6]],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",[__wireValue38,__wireValue4]],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",[__wireValue48,__wireValue14]],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",[__wireValue49,__wireValue50]],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",[__wireValue52,__wireValue6]],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",[__wireValue53,__wireValue6]],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",[__wireValue54,__wireValue55]],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",[__wireValue28,__wireValue56]],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",[__wireValue43,__wireValue4]],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",[__wireValue57,__wireValue13]],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",[__wireValue58,__wireValue10]],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",[__wireValue59,__wireValue14]],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",[__wireValue60,__wireValue10]],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",[__wireValue0,__wireValue33]],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",[__wireValue61,__wireValue6]],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",[__wireValue62,__wireValue6]],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",[__wireValue63,__wireValue10]],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",[__wireValue64,__wireValue56]],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",[__wireValue43,__wireValue4]],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",[__wireValue65,__wireValue6]],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",[__wireValue66,__wireValue14]],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",[__wireValue67,__wireValue14]],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",[__wireValue68,__wireValue14]],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",[__wireValue69,__wireValue6]],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",[__wireValue70,__wireValue18]],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",[__wireValue71,__wireValue72]],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",[__wireValue73,__wireValue56]],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",[__wireValue62,__wireValue6]],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",[__wireValue73,__wireValue56]],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",[__wireValue62,__wireValue6]],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",[__wireValue62,__wireValue6]],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",[__wireValue74,__wireValue42]],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",[__wireValue38,__wireValue4]],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",[__wireValue75,__wireValue22]],["prediction",[__wireValue76,__wireValue56]],["prepared",[__wireValue77,__wireValue18]]]));

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
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture9(value[i],budget,depth+1);return out;}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture3(value[i],budget,depth+1);return out;}
function __privateCapture26(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture3(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture19(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture16(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture1(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture25(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture2(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture17(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture18(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture29(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture30(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture27(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture28(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture33(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture32(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture3(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture14(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"graph")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"parameters")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"features")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}return {["graph"]:__privateCapture2(value["graph"],budget,depth+1),["parameters"]:__privateCapture3(value["parameters"],budget,depth+1),["features"]:__privateCapture3(value["features"],budget,depth+1),["outputs"]:__privateCapture3(value["outputs"],budget,depth+1)};}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"inputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"nodes")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"roots")){throw Error('invalid value for wire schema');}return {["inputs"]:__privateCapture3(value["inputs"],budget,depth+1),["nodes"]:__privateCapture4(value["nodes"],budget,depth+1),["roots"]:__privateCapture12(value["roots"],budget,depth+1)};}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==13){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"kind")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"binary")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"unary")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"a")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"c")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"terms")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gates")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gate_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"table")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"below")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"above")){throw Error('invalid value for wire schema');}return {["kind"]:__privateCapture6(value["kind"],budget,depth+1),["binary"]:__privateCapture7(value["binary"],budget,depth+1),["unary"]:__privateCapture8(value["unary"],budget,depth+1),["a"]:__privateCapture3(value["a"],budget,depth+1),["b"]:__privateCapture3(value["b"],budget,depth+1),["c"]:__privateCapture3(value["c"],budget,depth+1),["value"]:__privateCapture9(value["value"],budget,depth+1),["terms"]:__privateCapture10(value["terms"],budget,depth+1),["gates"]:__privateCapture10(value["gates"],budget,depth+1),["gate_bias"]:__privateCapture9(value["gate_bias"],budget,depth+1),["table"]:__privateCapture12(value["table"],budget,depth+1),["below"]:__privateCapture13(value["below"],budget,depth+1),["above"]:__privateCapture13(value["above"],budget,depth+1)};}
function __privateCapture18(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"loss")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gradient")){throw Error('invalid value for wire schema');}return {["loss"]:__privateCapture9(value["loss"],budget,depth+1),["outputs"]:__privateCapture16(value["outputs"],budget,depth+1),["gradient"]:__privateCapture16(value["gradient"],budget,depth+1)};}
function __privateCapture30(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"gradient")){throw Error('invalid value for wire schema');}return {["outputs"]:__privateCapture16(value["outputs"],budget,depth+1),["gradient"]:__privateCapture16(value["gradient"],budget,depth+1)};}
function __privateCapture20(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"parameters")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"nodes")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"valid")){throw Error('invalid value for wire schema');}return {["parameters"]:__privateCapture3(value["parameters"],budget,depth+1),["nodes"]:__privateCapture3(value["nodes"],budget,depth+1),["width"]:__privateCapture3(value["width"],budget,depth+1),["valid"]:__privateCapture13(value["valid"],budget,depth+1)};}
function __privateCapture21(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"piecewise")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"boolean")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"zero")){throw Error('invalid value for wire schema');}return {["piecewise"]:__privateCapture13(value["piecewise"],budget,depth+1),["boolean"]:__privateCapture22(value["boolean"],budget,depth+1),["index"]:__privateCapture23(value["index"],budget,depth+1),["zero"]:__privateCapture24(value["zero"],budget,depth+1)};}
function __privateCapture31(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"rate")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"epsilon")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weight_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"norm_limit")){throw Error('invalid value for wire schema');}return {["rate"]:__privateCapture9(value["rate"],budget,depth+1),["first_decay"]:__privateCapture9(value["first_decay"],budget,depth+1),["second_decay"]:__privateCapture9(value["second_decay"],budget,depth+1),["epsilon"]:__privateCapture9(value["epsilon"],budget,depth+1),["weight_decay"]:__privateCapture9(value["weight_decay"],budget,depth+1),["norm_limit"]:__privateCapture9(value["norm_limit"],budget,depth+1)};}
function __privateCapture28(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"values")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"outputs")){throw Error('invalid value for wire schema');}return {["values"]:__privateCapture16(value["values"],budget,depth+1),["outputs"]:__privateCapture16(value["outputs"],budget,depth+1)};}
function __privateCapture32(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weights")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"steps")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_power")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_power")){throw Error('invalid value for wire schema');}return {["weights"]:__privateCapture16(value["weights"],budget,depth+1),["first"]:__privateCapture16(value["first"],budget,depth+1),["second"]:__privateCapture16(value["second"],budget,depth+1),["steps"]:__privateCapture3(value["steps"],budget,depth+1),["first_power"]:__privateCapture9(value["first_power"],budget,depth+1),["second_power"]:__privateCapture9(value["second_power"],budget,depth+1)};}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"wire")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"coefficient")){throw Error('invalid value for wire schema');}return {["wire"]:__privateCapture3(value["wire"],budget,depth+1),["coefficient"]:__privateCapture9(value["coefficient"],budget,depth+1)};}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture23(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture24(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture22(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return __nfFromBits(bits);}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue5(reader);reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue11(reader);reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue9(reader);reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue3(reader);reader.finish(end);return value;}
function __privateWireValue54(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue3(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue48(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue19(reader)};reader.finish(end);return value;}
function __privateWireValue62(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue63(reader)};reader.finish(end);return value;}
function __privateWireValue56(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue57(reader)};reader.finish(end);return value;}
function __privateWireValue71(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue69(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue14(reader)}:{Ok:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __privateWireValue52(reader){const end=reader.frame();const value={["a"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue34(reader){const end=reader.frame();const value={["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue35(reader){const end=reader.frame();const value={["a"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue73(reader){const end=reader.frame();const value={["c"]:__privateWireValue66(reader)};reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value={["features"]:__privateWireValue3(reader),["hidden"]:__privateWireValue12(reader),["outputs"]:__privateWireValue3(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue38(reader){const end=reader.frame();const value={["gate"]:__privateWireValue3(reader),["off"]:__privateWireValue3(reader),["on"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value={["graph"]:__privateWireValue2(reader),["parameters"]:__privateWireValue3(reader),["features"]:__privateWireValue3(reader),["outputs"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue55(reader){const end=reader.frame();const value={["index"]:__privateWireValue9(reader),["n"]:__privateWireValue3(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue39(reader){const end=reader.frame();const value={["index"]:__privateWireValue3(reader),["table"]:__privateWireValue12(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue49(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue47(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["inputs"]:__privateWireValue3(reader),["nodes"]:__privateWireValue4(reader),["roots"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue53(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["a"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue33(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["a"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue59(reader){const end=reader.frame();const value={["kind"]:__privateWireValue8(reader),["policy"]:__privateWireValue40(reader)};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value={["kind"]:__privateWireValue6(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value={["kind"]:__privateWireValue6(reader),["binary"]:__privateWireValue7(reader),["unary"]:__privateWireValue8(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader),["c"]:__privateWireValue3(reader),["value"]:__privateWireValue9(reader),["terms"]:__privateWireValue10(reader),["gates"]:__privateWireValue10(reader),["gate_bias"]:__privateWireValue9(reader),["table"]:__privateWireValue12(reader),["below"]:__privateWireValue13(reader),["above"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue51(reader){const end=reader.frame();const value={["kind"]:__privateWireValue7(reader),["a"]:__privateWireValue9(reader),["b"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue32(reader){const end=reader.frame();const value={["kind"]:__privateWireValue7(reader),["a"]:__privateWireValue3(reader),["b"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value={["loss"]:__privateWireValue9(reader),["outputs"]:__privateWireValue17(reader),["gradient"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["net"]:__privateWireValue1(reader),["weights"]:__privateWireValue17(reader),["features"]:__privateWireValue17(reader),["target"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue23(reader){const end=reader.frame();const value={["net"]:__privateWireValue1(reader),["weights"]:__privateWireValue17(reader),["features"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue17(reader),["features"]:__privateWireValue17(reader),["target"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader),["weights"]:__privateWireValue17(reader),["features"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const value={["network"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue60(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["policy"]:__privateWireValue40(reader)};reader.finish(end);return value;}
function __privateWireValue45(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["positions"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue46(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader),["wire"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue44(reader){const end=reader.frame();const value={["node"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue63(reader){const end=reader.frame();const value={["outputs"]:__privateWireValue17(reader),["gradient"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const value={["parameters"]:__privateWireValue3(reader),["nodes"]:__privateWireValue3(reader),["width"]:__privateWireValue3(reader),["valid"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue40(reader){const end=reader.frame();const value={["piecewise"]:__privateWireValue13(reader),["boolean"]:__privateWireValue41(reader),["index"]:__privateWireValue42(reader),["zero"]:__privateWireValue43(reader)};reader.finish(end);return value;}
function __privateWireValue64(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue17(reader),["seeds"]:__privateWireValue17(reader),["policy"]:__privateWireValue40(reader)};reader.finish(end);return value;}
function __privateWireValue65(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue17(reader),["target"]:__privateWireValue17(reader),["policy"]:__privateWireValue40(reader)};reader.finish(end);return value;}
function __privateWireValue58(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["input"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue61(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader),["values"]:__privateWireValue17(reader),["seeds"]:__privateWireValue17(reader),["policy"]:__privateWireValue40(reader)};reader.finish(end);return value;}
function __privateWireValue50(reader){const end=reader.frame();const value={["plan"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue66(reader){const end=reader.frame();const value={["rate"]:__privateWireValue9(reader),["first_decay"]:__privateWireValue9(reader),["second_decay"]:__privateWireValue9(reader),["epsilon"]:__privateWireValue9(reader),["weight_decay"]:__privateWireValue9(reader),["norm_limit"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue67(reader){const end=reader.frame();const value={["rate"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["s"]:__privateWireValue24(reader),["width"]:__privateWireValue3(reader),["gated"]:__privateWireValue13(reader),["maximum"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue77(reader){const end=reader.frame();const value={["state"]:__privateWireValue69(reader),["gradient"]:__privateWireValue17(reader),["c"]:__privateWireValue66(reader)};reader.finish(end);return value;}
function __privateWireValue70(reader){const end=reader.frame();const value={["state"]:__privateWireValue69(reader)};reader.finish(end);return value;}
function __privateWireValue37(reader){const end=reader.frame();const value={["terms"]:__privateWireValue10(reader),["bias"]:__privateWireValue9(reader),["gates"]:__privateWireValue10(reader),["gate_bias"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue36(reader){const end=reader.frame();const value={["terms"]:__privateWireValue10(reader),["bias"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue31(reader){const end=reader.frame();const value={["value"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue57(reader){const end=reader.frame();const value={["values"]:__privateWireValue17(reader),["outputs"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue76(reader){const end=reader.frame();const value={["weight"]:__privateWireValue9(reader),["first"]:__privateWireValue9(reader),["second"]:__privateWireValue9(reader),["first_power"]:__privateWireValue9(reader),["second_power"]:__privateWireValue9(reader),["c"]:__privateWireValue66(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value={["weights"]:__privateWireValue17(reader),["features"]:__privateWireValue17(reader),["target"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue69(reader){const end=reader.frame();const value={["weights"]:__privateWireValue17(reader),["first"]:__privateWireValue17(reader),["second"]:__privateWireValue17(reader),["steps"]:__privateWireValue3(reader),["first_power"]:__privateWireValue9(reader),["second_power"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue72(reader){const end=reader.frame();const value={["weights"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={["wire"]:__privateWireValue3(reader),["coefficient"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue74(reader){const end=reader.frame();const value={["x"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue75(reader){const end=reader.frame();const value={["xs"]:__privateWireValue17(reader),["limit"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue68(reader){const end=reader.frame();const value={["xs"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __privateWireValue8Variants=Object.freeze(["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]);
function __privateWireValue8(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue8Variants);reader.finish(end);return value;}
const __privateWireValue42Variants=Object.freeze(["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]);
function __privateWireValue42(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue42Variants);reader.finish(end);return value;}
const __privateWireValue6Variants=Object.freeze(["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]);
function __privateWireValue6(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue6Variants);reader.finish(end);return value;}
const __privateWireValue43Variants=Object.freeze(["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]);
function __privateWireValue43(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue43Variants);reader.finish(end);return value;}
const __privateWireValue7Variants=Object.freeze(["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]);
function __privateWireValue7(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue7Variants);reader.finish(end);return value;}
const __privateWireValue41Variants=Object.freeze(["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]);
function __privateWireValue41(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue41Variants);reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value=__nfFromBits(reader.word());reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue5(value[i],budget,depth+1);return out;}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue11(value[i],budget,depth+1);return out;}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue9(value[i],budget,depth+1);return out;}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue3(value[i],budget,depth+1);return out;}
function __compiledOwnedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue3(value.Some,budget,depth+1)};}
function __compiledOwnedValue19(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue16(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue1(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue25(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue2(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue17(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue18(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue29(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue30(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue27(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue28(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue33(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue32(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue3(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue14(value.Err,budget,depth+1)};}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,4);return {["graph"]:__compiledOwnedValue2(value["graph"],budget,depth+1),["parameters"]:__compiledOwnedValue3(value["parameters"],budget,depth+1),["features"]:__compiledOwnedValue3(value["features"],budget,depth+1),["outputs"]:__compiledOwnedValue3(value["outputs"],budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,4);return {["inputs"]:__compiledOwnedValue3(value["inputs"],budget,depth+1),["nodes"]:__compiledOwnedValue4(value["nodes"],budget,depth+1),["roots"]:__compiledOwnedValue12(value["roots"],budget,depth+1)};}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,4);return {["kind"]:__compiledOwnedValue6(value["kind"],budget,depth+1),["binary"]:__compiledOwnedValue7(value["binary"],budget,depth+1),["unary"]:__compiledOwnedValue8(value["unary"],budget,depth+1),["a"]:__compiledOwnedValue3(value["a"],budget,depth+1),["b"]:__compiledOwnedValue3(value["b"],budget,depth+1),["c"]:__compiledOwnedValue3(value["c"],budget,depth+1),["value"]:__compiledOwnedValue9(value["value"],budget,depth+1),["terms"]:__compiledOwnedValue10(value["terms"],budget,depth+1),["gates"]:__compiledOwnedValue10(value["gates"],budget,depth+1),["gate_bias"]:__compiledOwnedValue9(value["gate_bias"],budget,depth+1),["table"]:__compiledOwnedValue12(value["table"],budget,depth+1),["below"]:__compiledOwnedValue13(value["below"],budget,depth+1),["above"]:__compiledOwnedValue13(value["above"],budget,depth+1)};}
function __compiledOwnedValue18(value,budget,depth){budget.enter(depth,4);return {["loss"]:__compiledOwnedValue9(value["loss"],budget,depth+1),["outputs"]:__compiledOwnedValue16(value["outputs"],budget,depth+1),["gradient"]:__compiledOwnedValue16(value["gradient"],budget,depth+1)};}
function __compiledOwnedValue30(value,budget,depth){budget.enter(depth,4);return {["outputs"]:__compiledOwnedValue16(value["outputs"],budget,depth+1),["gradient"]:__compiledOwnedValue16(value["gradient"],budget,depth+1)};}
function __compiledOwnedValue20(value,budget,depth){budget.enter(depth,4);return {["parameters"]:__compiledOwnedValue3(value["parameters"],budget,depth+1),["nodes"]:__compiledOwnedValue3(value["nodes"],budget,depth+1),["width"]:__compiledOwnedValue3(value["width"],budget,depth+1),["valid"]:__compiledOwnedValue13(value["valid"],budget,depth+1)};}
function __compiledOwnedValue21(value,budget,depth){budget.enter(depth,4);return {["piecewise"]:__compiledOwnedValue13(value["piecewise"],budget,depth+1),["boolean"]:__compiledOwnedValue22(value["boolean"],budget,depth+1),["index"]:__compiledOwnedValue23(value["index"],budget,depth+1),["zero"]:__compiledOwnedValue24(value["zero"],budget,depth+1)};}
function __compiledOwnedValue31(value,budget,depth){budget.enter(depth,4);return {["rate"]:__compiledOwnedValue9(value["rate"],budget,depth+1),["first_decay"]:__compiledOwnedValue9(value["first_decay"],budget,depth+1),["second_decay"]:__compiledOwnedValue9(value["second_decay"],budget,depth+1),["epsilon"]:__compiledOwnedValue9(value["epsilon"],budget,depth+1),["weight_decay"]:__compiledOwnedValue9(value["weight_decay"],budget,depth+1),["norm_limit"]:__compiledOwnedValue9(value["norm_limit"],budget,depth+1)};}
function __compiledOwnedValue28(value,budget,depth){budget.enter(depth,4);return {["values"]:__compiledOwnedValue16(value["values"],budget,depth+1),["outputs"]:__compiledOwnedValue16(value["outputs"],budget,depth+1)};}
function __compiledOwnedValue32(value,budget,depth){budget.enter(depth,4);return {["weights"]:__compiledOwnedValue16(value["weights"],budget,depth+1),["first"]:__compiledOwnedValue16(value["first"],budget,depth+1),["second"]:__compiledOwnedValue16(value["second"],budget,depth+1),["steps"]:__compiledOwnedValue3(value["steps"],budget,depth+1),["first_power"]:__compiledOwnedValue9(value["first_power"],budget,depth+1),["second_power"]:__compiledOwnedValue9(value["second_power"],budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,4);return {["wire"]:__compiledOwnedValue3(value["wire"],budget,depth+1),["coefficient"]:__compiledOwnedValue9(value["coefficient"],budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue23(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue24(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue22(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite5(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite11(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite9(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite3(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite26(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite3(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite19(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite16(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite1(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite25(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite2(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite17(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite18(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite29(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite30(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite27(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite28(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite33(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite32(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite3(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite14(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["graph"],compact);__privateWireWrite3(writer,value["parameters"],compact);__privateWireWrite3(writer,value["features"],compact);__privateWireWrite3(writer,value["outputs"],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["inputs"],compact);__privateWireWrite4(writer,value["nodes"],compact);__privateWireWrite12(writer,value["roots"],compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();__privateWireWrite6(writer,value["kind"],compact);__privateWireWrite7(writer,value["binary"],compact);__privateWireWrite8(writer,value["unary"],compact);__privateWireWrite3(writer,value["a"],compact);__privateWireWrite3(writer,value["b"],compact);__privateWireWrite3(writer,value["c"],compact);__privateWireWrite9(writer,value["value"],compact);__privateWireWrite10(writer,value["terms"],compact);__privateWireWrite10(writer,value["gates"],compact);__privateWireWrite9(writer,value["gate_bias"],compact);__privateWireWrite12(writer,value["table"],compact);__privateWireWrite13(writer,value["below"],compact);__privateWireWrite13(writer,value["above"],compact);writer.closeFrame(frame);}
function __privateWireWrite18(writer,value,compact){const frame=writer.openFrame();__privateWireWrite9(writer,value["loss"],compact);__privateWireWrite16(writer,value["outputs"],compact);__privateWireWrite16(writer,value["gradient"],compact);writer.closeFrame(frame);}
function __privateWireWrite30(writer,value,compact){const frame=writer.openFrame();__privateWireWrite16(writer,value["outputs"],compact);__privateWireWrite16(writer,value["gradient"],compact);writer.closeFrame(frame);}
function __privateWireWrite20(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["parameters"],compact);__privateWireWrite3(writer,value["nodes"],compact);__privateWireWrite3(writer,value["width"],compact);__privateWireWrite13(writer,value["valid"],compact);writer.closeFrame(frame);}
function __privateWireWrite21(writer,value,compact){const frame=writer.openFrame();__privateWireWrite13(writer,value["piecewise"],compact);__privateWireWrite22(writer,value["boolean"],compact);__privateWireWrite23(writer,value["index"],compact);__privateWireWrite24(writer,value["zero"],compact);writer.closeFrame(frame);}
function __privateWireWrite31(writer,value,compact){const frame=writer.openFrame();__privateWireWrite9(writer,value["rate"],compact);__privateWireWrite9(writer,value["first_decay"],compact);__privateWireWrite9(writer,value["second_decay"],compact);__privateWireWrite9(writer,value["epsilon"],compact);__privateWireWrite9(writer,value["weight_decay"],compact);__privateWireWrite9(writer,value["norm_limit"],compact);writer.closeFrame(frame);}
function __privateWireWrite28(writer,value,compact){const frame=writer.openFrame();__privateWireWrite16(writer,value["values"],compact);__privateWireWrite16(writer,value["outputs"],compact);writer.closeFrame(frame);}
function __privateWireWrite32(writer,value,compact){const frame=writer.openFrame();__privateWireWrite16(writer,value["weights"],compact);__privateWireWrite16(writer,value["first"],compact);__privateWireWrite16(writer,value["second"],compact);__privateWireWrite3(writer,value["steps"],compact);__privateWireWrite9(writer,value["first_power"],compact);__privateWireWrite9(writer,value["second_power"],compact);writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["wire"],compact);__privateWireWrite9(writer,value["coefficient"],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite23(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite24(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite22(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[1],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["graph","parameters","features","outputs"],patterns:[{bytes:4,label:"record",children:[2,3,3,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["graph"]:values[0],["parameters"]:values[1],["features"]:values[2],["outputs"]:values[3]})}]},{kind:'record',fields:["inputs","nodes","roots"],patterns:[{bytes:4,label:"record",children:[3,4,12],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["inputs"]:values[0],["nodes"]:values[1],["roots"]:values[2]})}]},{kind:"u32",scalar:__privateCapture3},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[5],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["kind","binary","unary","a","b","c","value","terms","gates","gate_bias","table","below","above"],patterns:[{bytes:4,label:"record",children:[6,7,8,3,3,3,9,10,10,9,12,13,13],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["kind"]:values[0],["binary"]:values[1],["unary"]:values[2],["a"]:values[3],["b"]:values[4],["c"]:values[5],["value"]:values[6],["terms"]:values[7],["gates"]:values[8],["gate_bias"]:values[9],["table"]:values[10],["below"]:values[11],["above"]:values[12]})}]},{kind:"enum",scalar:__privateCapture6},{kind:"enum",scalar:__privateCapture7},{kind:"enum",scalar:__privateCapture8},{kind:"f32",scalar:__privateCapture9},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[11],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["wire","coefficient"],patterns:[{bytes:4,label:"record",children:[3,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["wire"]:values[0],["coefficient"]:values[1]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[3],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"bool",scalar:__privateCapture13},{kind:"string",scalar:__privateCapture14},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[3],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[9],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[18],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["loss","outputs","gradient"],patterns:[{bytes:4,label:"record",children:[9,16,16],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["loss"]:values[0],["outputs"]:values[1],["gradient"]:values[2]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[16],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["parameters","nodes","width","valid"],patterns:[{bytes:4,label:"record",children:[3,3,3,13],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["parameters"]:values[0],["nodes"]:values[1],["width"]:values[2],["valid"]:values[3]})}]},{kind:'record',fields:["piecewise","boolean","index","zero"],patterns:[{bytes:4,label:"record",children:[13,22,23,24],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["piecewise"]:values[0],["boolean"]:values[1],["index"]:values[2],["zero"]:values[3]})}]},{kind:"enum",scalar:__privateCapture22},{kind:"enum",scalar:__privateCapture23},{kind:"enum",scalar:__privateCapture24},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[2],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[28],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["values","outputs"],patterns:[{bytes:4,label:"record",children:[16,16],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["values"]:values[0],["outputs"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[30],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["outputs","gradient"],patterns:[{bytes:4,label:"record",children:[16,16],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["outputs"]:values[0],["gradient"]:values[1]})}]},{kind:'record',fields:["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"],patterns:[{bytes:4,label:"record",children:[9,9,9,9,9,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["rate"]:values[0],["first_decay"]:values[1],["second_decay"]:values[2],["epsilon"]:values[3],["weight_decay"]:values[4],["norm_limit"]:values[5]})}]},{kind:'record',fields:["weights","first","second","steps","first_power","second_power"],patterns:[{bytes:4,label:"record",children:[16,16,16,3,9,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["weights"]:values[0],["first"]:values[1],["second"]:values[2],["steps"]:values[3],["first_power"]:values[4],["second_power"]:values[5]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[32],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[14],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]}];}
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
function __reduceValue15(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[15](0,__reduceValue3(value.Ok,r,b,d+1,c),c):r[15](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[16];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue9(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue17(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[17](0,__reduceValue18(value.Ok,r,b,d+1,c),c):r[17](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue18(value,r,b,d,c){b.enter(d,4);return r[18](__reduceValue9(value["loss"],r,b,d+1,c),__reduceValue16(value["outputs"],r,b,d+1,c),__reduceValue16(value["gradient"],r,b,d+1,c),c);}
function __reduceValue19(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[19](0,__reduceValue16(value.Ok,r,b,d+1,c),c):r[19](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue20(value,r,b,d,c){b.enter(d,4);return r[20](__reduceValue3(value["parameters"],r,b,d+1,c),__reduceValue3(value["nodes"],r,b,d+1,c),__reduceValue3(value["width"],r,b,d+1,c),__reduceValue13(value["valid"],r,b,d+1,c),c);}
function __reduceValue21(value,r,b,d,c){b.enter(d,4);return r[21](__reduceValue13(value["piecewise"],r,b,d+1,c),__reduceValue22(value["boolean"],r,b,d+1,c),__reduceValue23(value["index"],r,b,d+1,c),__reduceValue24(value["zero"],r,b,d+1,c),c);}
function __reduceValue22(value,r,b,d,c){b.enter(d,4);b.text(value);return r[22](value,c);}
function __reduceValue23(value,r,b,d,c){b.enter(d,4);b.text(value);return r[23](value,c);}
function __reduceValue24(value,r,b,d,c){b.enter(d,4);b.text(value);return r[24](value,c);}
function __reduceValue25(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[25](0,__reduceValue2(value.Ok,r,b,d+1,c),c):r[25](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue26(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[26](0,null,c):r[26](1,__reduceValue3(value.Some,r,b,d+1,c),c);}
function __reduceValue27(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[27](0,__reduceValue28(value.Ok,r,b,d+1,c),c):r[27](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue28(value,r,b,d,c){b.enter(d,4);return r[28](__reduceValue16(value["values"],r,b,d+1,c),__reduceValue16(value["outputs"],r,b,d+1,c),c);}
function __reduceValue29(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[29](0,__reduceValue30(value.Ok,r,b,d+1,c),c):r[29](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
function __reduceValue30(value,r,b,d,c){b.enter(d,4);return r[30](__reduceValue16(value["outputs"],r,b,d+1,c),__reduceValue16(value["gradient"],r,b,d+1,c),c);}
function __reduceValue31(value,r,b,d,c){b.enter(d,4);return r[31](__reduceValue9(value["rate"],r,b,d+1,c),__reduceValue9(value["first_decay"],r,b,d+1,c),__reduceValue9(value["second_decay"],r,b,d+1,c),__reduceValue9(value["epsilon"],r,b,d+1,c),__reduceValue9(value["weight_decay"],r,b,d+1,c),__reduceValue9(value["norm_limit"],r,b,d+1,c),c);}
function __reduceValue32(value,r,b,d,c){b.enter(d,4);return r[32](__reduceValue16(value["weights"],r,b,d+1,c),__reduceValue16(value["first"],r,b,d+1,c),__reduceValue16(value["second"],r,b,d+1,c),__reduceValue3(value["steps"],r,b,d+1,c),__reduceValue9(value["first_power"],r,b,d+1,c),__reduceValue9(value["second_power"],r,b,d+1,c),c);}
function __reduceValue33(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[33](0,__reduceValue32(value.Ok,r,b,d+1,c),c):r[33](1,__reduceValue14(value.Err,r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([2,3,3,3]),"fields":Object.freeze(["graph","parameters","features","outputs"]),"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}),Object.freeze({"children":Object.freeze([3,4,12]),"fields":Object.freeze(["inputs","nodes","roots"]),"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([5]),"kind":"list"}),Object.freeze({"children":Object.freeze([6,7,8,3,3,3,9,10,10,9,12,13,13]),"fields":Object.freeze(["kind","binary","unary","a","b","c","value","terms","gates","gate_bias","table","below","above"]),"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([11]),"kind":"list"}),Object.freeze({"children":Object.freeze([3,9]),"fields":Object.freeze(["wire","coefficient"]),"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"}),Object.freeze({"children":Object.freeze([3]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([3,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([9]),"kind":"list"}),Object.freeze({"children":Object.freeze([18,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([9,16,16]),"fields":Object.freeze(["loss","outputs","gradient"]),"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}),Object.freeze({"children":Object.freeze([16,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([3,3,3,13]),"fields":Object.freeze(["parameters","nodes","width","valid"]),"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}),Object.freeze({"children":Object.freeze([13,22,23,24]),"fields":Object.freeze(["piecewise","boolean","index","zero"]),"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8"}),Object.freeze({"children":Object.freeze([2,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([3]),"kind":"option"}),Object.freeze({"children":Object.freeze([28,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([16,16]),"fields":Object.freeze(["values","outputs"]),"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}),Object.freeze({"children":Object.freeze([30,14]),"kind":"result"}),Object.freeze({"children":Object.freeze([16,16]),"fields":Object.freeze(["outputs","gradient"]),"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}),Object.freeze({"children":Object.freeze([9,9,9,9,9,9]),"fields":Object.freeze(["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"]),"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}),Object.freeze({"children":Object.freeze([16,16,16,3,9,9]),"fields":Object.freeze(["weights","first","second","steps","first_power","second_power"]),"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}),Object.freeze({"children":Object.freeze([32,14]),"kind":"result"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"052063f791617fd7e306247295768a44a6ea5cefc3e5aa8cca39b2cfc366444e","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},__privateCapture15,__privateWireValue16,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture16,__privateWireValue17,__privateWireWrite16,__compiledOwnedValue16,16,16,__reduceValue16,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ad0fd8af84dd1bc806949fad7f7e180fcf9e7fcde64c4a0ac3959968c26406d3","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"loss","type":{"kind":"f32"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m69b71f9cafbe01f7a28152d37926e422b8ec8534bfad11f104d0c9358b68fd03"}}},__privateCapture17,__privateWireValue18,__privateWireWrite17,__compiledOwnedValue17,17,17,__reduceValue17,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"c29995596451ae7a21400d17e81d4f2ca8be614ad563bd5faf845f101abbabb7","named":__compiledNamed0(),"root":{"fields":[{"name":"graph","type":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},{"name":"parameters","type":{"kind":"u32"}},{"name":"features","type":{"kind":"u32"}},{"name":"outputs","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2e073fa8f2c4d1133c481e65e199889624fa7a8442f74259ff26ecaaab5fb236"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},__privateCapture19,__privateWireValue22,__privateWireWrite19,__compiledOwnedValue19,19,19,__reduceValue19,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ac41b87618cf0ad81348253498bc64aaf593a252a918e07abe4b4eeb7b74ae13","named":__compiledNamed0(),"root":{"fields":[{"name":"parameters","type":{"kind":"u32"}},{"name":"nodes","type":{"kind":"u32"}},{"name":"width","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_m76e8e711802df7fdc02528f570467f247e31d57557ae95856d9a5c21d3b74407"}},__privateCapture20,__privateWireValue24,__privateWireWrite20,__compiledOwnedValue20,20,20,__reduceValue20,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture3,__privateWireValue3,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture13,__privateWireValue13,__privateWireWrite13,__compiledOwnedValue13,13,13,__reduceValue13,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"list"}},__privateCapture12,__privateWireValue12,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ad51270866d4f33efec0e7cf448c799ff1f9d4eb38a15700830bfcd18d0842d2","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},__privateCapture6,__privateWireValue6,__privateWireWrite6,__compiledOwnedValue6,6,6,__reduceValue6,false,false);}
let __compiledCodec11Value;function __compiledCodec11(){return __compiledCodec11Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"58dade78f8a50f2de6c373a2adfd73584f95c69cdae0756454ac46d35439dc9e","named":__compiledNamed0(),"root":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"}},__privateCapture5,__privateWireValue5,__privateWireWrite5,__compiledOwnedValue5,5,5,__reduceValue5,false,false);}
let __compiledCodec12Value;function __compiledCodec12(){return __compiledCodec12Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture9,__privateWireValue9,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec13Value;function __compiledCodec13(){return __compiledCodec13Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"5e9d2560d1631617c5b6fbd31eb44e6a78a53596609e3288344ef50f0a623193","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},__privateCapture7,__privateWireValue7,__privateWireWrite7,__compiledOwnedValue7,7,7,__reduceValue7,false,false);}
let __compiledCodec14Value;function __compiledCodec14(){return __compiledCodec14Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"11e308754fe5a47839d506acbdbac68914598d732c9b50d164b272fcfb111857","named":__compiledNamed0(),"root":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},__privateCapture8,__privateWireValue8,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec15Value;function __compiledCodec15(){return __compiledCodec15Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"94820bbba8093c293ec1b0b07bf5edd0c6fc268622d768485889779720c698e3","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},__privateCapture10,__privateWireValue10,__privateWireWrite10,__compiledOwnedValue10,10,10,__reduceValue10,false,false);}
let __compiledCodec16Value;function __compiledCodec16(){return __compiledCodec16Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b22548ea7952cb0942c8f4b40019aa39fa3a4723d7676727d2da2222498ddad4","named":__compiledNamed0(),"root":{"fields":[{"name":"piecewise","type":{"kind":"bool"}},{"name":"boolean","type":{"kind":"enum","name":"ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad","variants":["ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Reject","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.Zero","ink_me332721db50ffcb71c68f4986efa7b81604cb9b84ea069ed83ee4612575cd4ad.StraightThrough"]}},{"name":"index","type":{"kind":"enum","name":"ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22","variants":["ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Reject","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.Zero","ink_m359bab673d49092ee866c01d982072282563cb146c62060390021e7756451d22.BackwardDifference"]}},{"name":"zero","type":{"kind":"enum","name":"ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8","variants":["ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Propagate","ink_m9bf13918c06335cbb7dc989350638b55b638952e197f276fdf52bce2c0bfada8.Stop"]}}],"kind":"record","name":"ink_m9529441a56e6eb80808777fe7a2d661e11e36853bc67c1595b6d7c86b1eaed1d"}},__privateCapture21,__privateWireValue40,__privateWireWrite21,__compiledOwnedValue21,21,21,__reduceValue21,false,false);}
let __compiledCodec17Value;function __compiledCodec17(){return __compiledCodec17Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"15bad3ed40eda25cff4964be36be0712e1169f8eaaafd6fd9744a93d1fca16ab","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},__privateCapture4,__privateWireValue4,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec18Value;function __compiledCodec18(){return __compiledCodec18Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"5e3bce6e30a6cf566aaa61bf87c5df4029e888c131b3a22f9c23e57ec7b98604","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}}},__privateCapture25,__privateWireValue48,__privateWireWrite25,__compiledOwnedValue25,25,25,__reduceValue25,false,false);}
let __compiledCodec19Value;function __compiledCodec19(){return __compiledCodec19Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b64cdc960194d6c2917b734c4b84079c0947d2ac89b217e7a2c033e7ce62b73d","named":__compiledNamed0(),"root":{"fields":[{"name":"inputs","type":{"kind":"u32"}},{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"enum","name":"ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea","variants":["ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Constant","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Binary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Unary","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Affine","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Reglu","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Select","ink_m692dfa7e5d98203a31e13de38b5b5caf26247108f00a7c9390ef855f4f39c0ea.Index"]}},{"name":"binary","type":{"kind":"enum","name":"ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f","variants":["ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Add","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Subtract","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Multiply","ink_mbd9635ed5954486b066d932497655521aa096e0acfeca1d7810ce89a11787d8f.Divide"]}},{"name":"unary","type":{"kind":"enum","name":"ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88","variants":["ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Sqrt","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Negate","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Relu","ink_m1dd495f71f1921331176c4b3bb960a4c3a51fab8f85a71f3018c8d08d6ec9b88.Step"]}},{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"c","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}},{"name":"terms","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gates","type":{"element":{"fields":[{"name":"wire","type":{"kind":"u32"}},{"name":"coefficient","type":{"kind":"f32"}}],"kind":"record","name":"ink_m20886debc50d2d84e050d4eeaed251eca4f1daa54675230a40a0ef8ee0885bb9"},"kind":"list"}},{"name":"gate_bias","type":{"kind":"f32"}},{"name":"table","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"below","type":{"kind":"bool"}},{"name":"above","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2ba4324029c78617644f1d663c8858eecff40029ece43cc41b2135dbc231dee7"},"kind":"list"}},{"name":"roots","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_mc0d3b8caa26d06dcc7d28369a23ac5b3461247aad0e3cbcee6f3f2b47ab2e01b"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec20Value;function __compiledCodec20(){return __compiledCodec20Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"option"}},__privateCapture26,__privateWireValue54,__privateWireWrite26,__compiledOwnedValue26,26,26,__reduceValue26,false,false);}
let __compiledCodec21Value;function __compiledCodec21(){return __compiledCodec21Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"cf53921502520b58149406af67009264d6f5bcd65ad7d4c294d7b3cffc473fdd","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_mf6f15ec2f265a6d370c6eb33a22a631c9d6ca730d6f71e046211c60845e435ca"}}},__privateCapture27,__privateWireValue56,__privateWireWrite27,__compiledOwnedValue27,27,27,__reduceValue27,false,false);}
let __compiledCodec22Value;function __compiledCodec22(){return __compiledCodec22Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"46a8862bb3a4ca14585404ebb0205c5513e43e51b84388b835fd0c141523978e","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"outputs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_md3d50994e56105c79e7db1fc37cd3a1a8cca9c58e68f182193e92940fadd8fd9"}}},__privateCapture29,__privateWireValue62,__privateWireWrite29,__compiledOwnedValue29,29,29,__reduceValue29,false,false);}
let __compiledCodec23Value;function __compiledCodec23(){return __compiledCodec23Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":__compiledNamed0(),"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},__privateCapture31,__privateWireValue66,__privateWireWrite31,__compiledOwnedValue31,31,31,__reduceValue31,false,false);}
let __compiledCodec24Value;function __compiledCodec24(){return __compiledCodec24Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fb51f6ef47ef23bec5fa30a1bf44674eef7e617546994700a49bccfb4c1baba3","named":__compiledNamed0(),"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},__privateCapture32,__privateWireValue69,__privateWireWrite32,__compiledOwnedValue32,32,32,__reduceValue32,false,false);}
let __compiledCodec25Value;function __compiledCodec25(){return __compiledCodec25Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},__privateCapture33,__privateWireValue71,__privateWireWrite33,__compiledOwnedValue33,33,33,__reduceValue33,false,false);}
const __compiledEntries=new Map([["architecture",{index:0,params:[],result:__compiledCodec0,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["dimensions",{index:1,params:[],result:__compiledCodec1,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["derivatives",{index:2,params:[__compiledCodec2,__compiledCodec2,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["prepared",{index:3,params:[__compiledCodec4,__compiledCodec2,__compiledCodec2,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue21,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["prediction",{index:4,params:[__compiledCodec4,__compiledCodec2,__compiledCodec2],result:__compiledCodec5,arguments:__privateWireValue23,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_mc3721b44a78712c618dfdb05780bd8269d8562d04fc8618c38a7708810c93a2d",{index:5,params:[__compiledCodec6,__compiledCodec7,__compiledCodec8,__compiledCodec7],result:__compiledCodec6,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m11199d904b2aab789a59dc74d5103f6d26cb92258fe569f2f7938cc0e90b27ef",{index:11,params:[__compiledCodec7,__compiledCodec9,__compiledCodec7,__compiledCodec7],result:__compiledCodec0,arguments:__privateWireValue26,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m9c1ce35a368f4170678304e80fcb3e48a3a3983f806b2fcc878ec7fb0279b27a",{index:12,params:[__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m6c7bdf4afacbec161a1e8a24e46ef4b6ae04352d3935d6cf564eeb8ef755f2f0",{index:13,params:[__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m2d5f6c728735b8bb87d2ef5549195f976fa688fa8d03257dac2400004a0a5ea1",{index:14,params:[__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m92cb5799eb671cc2ce8ab35b4c29142dada1bf20f8c0f0d4009e5420430b533e",{index:15,params:[__compiledCodec4,__compiledCodec2,__compiledCodec2],result:__compiledCodec5,arguments:__privateWireValue28,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m40c2256b28e7463d4494ae38eb03ed26160b2b911edbd4092c3e8601c08840a3",{index:16,params:[__compiledCodec4,__compiledCodec2,__compiledCodec2,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_ma6d51f1ad154b9ea598346b52c834ae6e2bbebce143739881fd166def5e0c5a0",{index:17,params:[__compiledCodec10,__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue30,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m1cf7d11aa9eb4f20c9bff71379a4f58b6458cc4ac04eddf9aed10fe155046b37",{index:18,params:[__compiledCodec12],result:__compiledCodec11,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m88c1514dcf57358e59996c43b94dec1740438d5111b0c3dc07a6ee490cd336dc",{index:19,params:[__compiledCodec13,__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m435cca1a2ee8dcd05fd331b39d840e87d725e272d92c265809d8ec9434df4fe5",{index:20,params:[__compiledCodec14,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md981adb0d1e14329b3734a65d8ad32e17770b999b7acb5c65ebfba7fa330231a",{index:21,params:[__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md64f9bb1e947177e158533c201981b995c0d474a1d91c368694a6ecf816aed00",{index:22,params:[__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m8a372ac0debfcc9712830d4a33ed62933fcd376c326327f7a7254c3641c6a9dc",{index:23,params:[__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mceb51f934b47e7811cbe4876b442e0e3f2171874b9337e100d9363924aa252b5",{index:24,params:[__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m107be39b7e85c8792b0cdc065a0795007703970bb9b0b9f8a6c8d61fc2201e22",{index:25,params:[__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m11bf2db343490357bba956f8d065bdc0ba8e022e316bb7160ca1b8c823cf7232",{index:26,params:[__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m06ac7d23aeeaa07a7e57192dd98c59cb9b7fa13761283315e652a21309892c2f",{index:27,params:[__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m0a63dbd392dd251208406c890a590565f7360ef5a4f29af83fb4073332a3adbf",{index:28,params:[__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m587f115e1a1cc1a5cf16bf84a000598c6122f7c8c9b6ade0e3f824642ba60465",{index:29,params:[__compiledCodec15,__compiledCodec12],result:__compiledCodec11,arguments:__privateWireValue36,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m03fc32ab8edcb008a36df2ccfc79c3dbc8c8f3659c4e5b030109201cd23f0fda",{index:30,params:[__compiledCodec15,__compiledCodec12,__compiledCodec15,__compiledCodec12],result:__compiledCodec11,arguments:__privateWireValue37,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m5d90a4f142456c29ddec11658610c1711d8b5ee243b72b6cb7d6e2afee87105e",{index:31,params:[__compiledCodec7,__compiledCodec7,__compiledCodec7],result:__compiledCodec11,arguments:__privateWireValue38,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m2db66c60f27b622a3dbc754908319305e4590dd27ce18f40a269b4e2f8d4ff0b",{index:32,params:[__compiledCodec7,__compiledCodec9,__compiledCodec8,__compiledCodec8],result:__compiledCodec11,arguments:__privateWireValue39,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m23cf827d21806eb9e1fcfe5e1f678d8077452f579c7a879dd2d950ba1b009586",{index:33,params:[],result:__compiledCodec16,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m8043ff947ad131f8677b838dd78e296d186dee94af5141b3921b37c7f0e5b7f2",{index:34,params:[],result:__compiledCodec16,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m3f9fca08a4ed85ef5ca48abbb41dfb0a74711be57d057115d5683ab7db7c06d2",{index:35,params:[],result:__compiledCodec16,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["ink_m6d0deb3521125de6dd1f21d637c9be5cc3d8e563387359ebed668696c73045c2",{index:36,params:[__compiledCodec11],result:__compiledCodec9,arguments:__privateWireValue44,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mb6a19adb5ef9adfd5b11fb165ed1b8e496ad01739715cd3a0913157e84672919",{index:37,params:[__compiledCodec11,__compiledCodec9],result:__compiledCodec11,arguments:__privateWireValue45,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m3edb830f6deb668a27045ea572cbf1f49353130c1948e4cd02df53d6a2d61680",{index:39,params:[__compiledCodec11,__compiledCodec7],result:__compiledCodec8,arguments:__privateWireValue46,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mb15da66d6a8703e88d77328963d83b4e7cbbf44a6c8651a880cd3cd824b92096",{index:40,params:[__compiledCodec7,__compiledCodec17,__compiledCodec9],result:__compiledCodec8,arguments:__privateWireValue47,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m0783d189be43d715cd3c9013f46a0603d1732252e697033c9b97df631f93308b",{index:41,params:[__compiledCodec7,__compiledCodec17,__compiledCodec9,__compiledCodec7],result:__compiledCodec18,arguments:__privateWireValue49,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m4cb5d6bdd89445aee486dfd38a698feb015e9fe4e82ac91e52ccc62b43d9a03f",{index:42,params:[__compiledCodec19],result:__compiledCodec7,arguments:__privateWireValue50,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_me7f72c9ba4f194f592b38fd7f36bc6c5ed9883b0750b9aeb423b9c7c68cdfb73",{index:43,params:[__compiledCodec19],result:__compiledCodec7,arguments:__privateWireValue50,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m20889d8fb4d64d417f2675859a394484074c6a1e9f4a6db6973d815d65dab841",{index:44,params:[__compiledCodec19],result:__compiledCodec7,arguments:__privateWireValue50,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m728cb3102dcc02050a83a18bfcc60497ab23cb750e5a9561a68fe028d2ffc01c",{index:45,params:[__compiledCodec13,__compiledCodec12,__compiledCodec12],result:__compiledCodec12,arguments:__privateWireValue51,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m2270aa17991a58c281ba9e6506e1c175e85cbf9215087c2ead07c533c2dc8926",{index:46,params:[__compiledCodec12],result:__compiledCodec12,arguments:__privateWireValue52,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m18c2a935d54c69a12490837c292afb4e38c6c92a0e35ac60798de4367a331885",{index:47,params:[__compiledCodec14,__compiledCodec12],result:__compiledCodec12,arguments:__privateWireValue53,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m6442219d6926ac1a6407dc81f2a879bba7f5cb8176fe7d77680d3466ac2a9870",{index:51,params:[__compiledCodec12,__compiledCodec7,__compiledCodec8,__compiledCodec8],result:__compiledCodec20,arguments:__privateWireValue55,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m1420a049e518d85b2f6569d3eb1841b17928a2632b55e736601ec7e33ba2b8cf",{index:54,params:[__compiledCodec19,__compiledCodec2],result:__compiledCodec21,arguments:__privateWireValue58,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m68796e4fd1974725595bbd914cc828b89df572b9dbbcc3f86c969931135948e6",{index:55,params:[__compiledCodec19,__compiledCodec2],result:__compiledCodec5,arguments:__privateWireValue58,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1c1fc344d6c0a9b6cd2af6ae2a9f6903480fbf3fa2cc4749a32ce0e1cc2c4d54",{index:58,params:[__compiledCodec14,__compiledCodec16],result:__compiledCodec8,arguments:__privateWireValue59,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mb31b58a1291bfe36790a0745eabacc90907bd94dde703e5a8bd9431f3ef829bd",{index:59,params:[__compiledCodec11,__compiledCodec16],result:__compiledCodec8,arguments:__privateWireValue60,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_md2b0fba66b883c531ba5c2db1f464a1666a89089c6aa1f660b025308b24861a4",{index:65,params:[__compiledCodec19,__compiledCodec2,__compiledCodec2,__compiledCodec16],result:__compiledCodec5,arguments:__privateWireValue61,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mca4e9d90d1cbe437b24067aef6814ef5812251970f17d0af15845e0b88c3aa04",{index:66,params:[__compiledCodec19,__compiledCodec2,__compiledCodec2,__compiledCodec16],result:__compiledCodec5,arguments:__privateWireValue61,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m533ecdd2b70d0a50383cd0cfc17d887028db585286479698556445de5b02bb30",{index:67,params:[__compiledCodec19,__compiledCodec2,__compiledCodec2,__compiledCodec16],result:__compiledCodec22,arguments:__privateWireValue64,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mc0b07190e7a0ed8f0a36cc3c97a6e425e2dcbf24fb472828a66f94a4c31f053c",{index:68,params:[__compiledCodec19,__compiledCodec2,__compiledCodec2,__compiledCodec16],result:__compiledCodec3,arguments:__privateWireValue65,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",{index:69,params:[__compiledCodec12],result:__compiledCodec23,arguments:__privateWireValue67,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",{index:70,params:[__compiledCodec2],result:__compiledCodec8,arguments:__privateWireValue68,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",{index:71,params:[__compiledCodec24],result:__compiledCodec8,arguments:__privateWireValue70,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",{index:72,params:[__compiledCodec2],result:__compiledCodec25,arguments:__privateWireValue72,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",{index:73,params:[__compiledCodec23],result:__compiledCodec8,arguments:__privateWireValue73,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",{index:74,params:[__compiledCodec12],result:__compiledCodec12,arguments:__privateWireValue74,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",{index:75,params:[__compiledCodec2,__compiledCodec12],result:__compiledCodec12,arguments:__privateWireValue75,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",{index:76,params:[__compiledCodec12,__compiledCodec12,__compiledCodec12,__compiledCodec12,__compiledCodec12,__compiledCodec23],result:__compiledCodec12,arguments:__privateWireValue76,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false,false,false],precondition:null}],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",{index:77,params:[__compiledCodec24,__compiledCodec2,__compiledCodec23],result:__compiledCodec25,arguments:__privateWireValue77,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}]]);

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
const __intoImplementations=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,__into36,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){switch(name){case "ink_m9e1a3871982c9bdfb3d225b89cb5cec90f92763251bd730fb7336d78d7b09775":case "ink_me2582f6cba6727a0847a371b9b02101f1735c85fb98a91b7aa7f6dcbbd08f7c4":case "ink_m71fb361ea8cd1bece07f8bb1866abdbcf0adaa37de6001c5e7961648d45ed8b1":case "ink_mf53023a27daefe28bad6b7b57c00a5e7b18e1d2494954e84d47fbc3446f3c441":case "ink_m6ecab4eaecf06aec2bafca856fae657ef1b83b193f0a081d5e142d0d6416c54c":case "ink_m4a032da6d354720e9cda49e95c91b0a03f8d2170d3b755bf7aaaf77aeee6913b":case "ink_m30daa83ad6269f1b0f03e6086618b084a5588b128313292419c1b9138570afe0":case "ink_ma4bba3a550ce782c63c3394c4274c5e15799d218aab1c95279903f999ef228c5":case "ink_m2a10ec39aec329e766ab59eae769be9990f75a665491efe0b0f91bdbf616299c":case "ink_mcc3b84907aa0f2bea8c2fc8e8e50508f113d2d2366b4626e9e503020d4d5a453":case "ink_m91c9087cad8057db3742fe39aa1df4dfbc6f0fd3ef485d79ff5d6ae97d6412f4":case "ink_m572fcbef845fa983ef5d60b0e620efb71dd138167b53a8fbe4e1a8c441ef8ae8":case "ink_m8af5f984b4d4fb49dbdddce3979b1c81b5f41f35bcb2a47c73547fcb1f805131":case "ink_mbbd6b8cfd7bfbfcf5bd6e75dd067c04d46a9dac709ba28d7a71908143ef535b9":case "ink_m3ee0f32af14288379fddc7d8a1a539de1b6beec48ae598cc71725cb80ebacef0":case "ink_mc48f680b2129a43a38a968251a461c0a1f6adffdc437647f529fdc33cb0ca6c6":case "ink_m58cdb73f07492f7789119f112d232cd784f3e95b4032a8e03a7c12aa8f92bab5":case "ink_md3222f4c5fa5541f2845d9bf9ecf979a5b4f3a7ae8778a0b0166286f33330ed6":throw new Error('temporary storage is internal to a pure invocation');}return functionsInto[name](...args,destination);}

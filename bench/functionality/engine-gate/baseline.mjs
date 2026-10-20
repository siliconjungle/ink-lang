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
function __fn0(v0,v1){
v1=__nfValue(v1);
const v2=v0["p"];
const v3=__nfValue(v2["a"]);
const v4=Math.fround(__nfNumber(v3) - __nfNumber(v1));
const v5=v0["p"];
const v6=__nfValue(v5["b"]);
const v7=Math.fround(__nfNumber(v6) + __nfNumber(v1));
const v8=v0["q"];
const v9=__nfValue(v8["a"]);
const v10=Math.fround(__nfNumber(v9) - __nfNumber(v1));
const v11=v0["q"];
const v12=__nfValue(v11["b"]);
const v13=Math.fround(__nfNumber(v12) + __nfNumber(v1));
const v14=v0["r"];
const v15=__nfValue(v14["a"]);
const v16=Math.fround(__nfNumber(v15) - __nfNumber(v1));
const v17=v0["r"];
const v18=__nfValue(v17["b"]);
const v19=Math.fround(__nfNumber(v18) + __nfNumber(v1));
const v20=v0["s"];
const v21=__nfValue(v20["a"]);
const v22=Math.fround(__nfNumber(v21) - __nfNumber(v1));
const v23=v0["s"];
const v24=__nfValue(v23["b"]);
const v25=Math.fround(__nfNumber(v24) + __nfNumber(v1));
const v26=v0["t"];
const v27=__nfValue(v26["a"]);
const v28=Math.fround(__nfNumber(v27) - __nfNumber(v1));
const v29=v0["t"];
const v30=__nfValue(v29["b"]);
const v31=Math.fround(__nfNumber(v30) + __nfNumber(v1));
const v32=v0["u"];
const v33=__nfValue(v32["a"]);
const v34=Math.fround(__nfNumber(v33) - __nfNumber(v1));
const v35=v0["u"];
const v36=__nfValue(v35["b"]);
const v37=Math.fround(__nfNumber(v36) + __nfNumber(v1));
const v38=Math.fround(v4 * v4);
const v39=Math.fround(v7 * v7);
const v40=Math.fround(v38 + v39);
const v41=Math.fround(v10 * v10);
const v42=Math.fround(v40 + v41);
const v43=Math.fround(v13 * v13);
const v44=Math.fround(v42 + v43);
const v45=Math.fround(v16 * v16);
const v46=Math.fround(v44 + v45);
const v47=Math.fround(v19 * v19);
const v48=Math.fround(v46 + v47);
const v49=Math.fround(v22 * v22);
const v50=Math.fround(v48 + v49);
const v51=Math.fround(v25 * v25);
const v52=Math.fround(v50 + v51);
const v53=Math.fround(v28 * v28);
const v54=Math.fround(v52 + v53);
const v55=Math.fround(v31 * v31);
const v56=Math.fround(v54 + v55);
const v57=Math.fround(v34 * v34);
const v58=Math.fround(v56 + v57);
const v59=Math.fround(v37 * v37);
return Math.fround(v58 + v59);}
function __fn1(v60,v61){
v61=__nfValue(v61);
return __fn5(v60,v61);}
function __fn2(v62,v63,v64){
v63=__nfValue(v63);
v64=__nfValue(v64);
const v65=__fn1(v62,v63);
const v66=v62["p"];
const v67=__nfValue(v66["a"]);
const v68=v65["p"];
const v69=__nfValue(v68["a"]);
const v70=Math.fround(__nfNumber(v64) * __nfNumber(v69));
const v71=Math.fround(__nfNumber(v67) - v70);
const v72=v62["p"];
const v73=__nfValue(v72["b"]);
const v74=v65["p"];
const v75=__nfValue(v74["b"]);
const v76=Math.fround(__nfNumber(v64) * __nfNumber(v75));
const v77=Math.fround(__nfNumber(v73) - v76);
const v79=v62["q"];
const v80=__nfValue(v79["a"]);
const v81=v65["q"];
const v82=__nfValue(v81["a"]);
const v83=Math.fround(__nfNumber(v64) * __nfNumber(v82));
const v84=Math.fround(__nfNumber(v80) - v83);
const v85=v62["q"];
const v86=__nfValue(v85["b"]);
const v87=v65["q"];
const v88=__nfValue(v87["b"]);
const v89=Math.fround(__nfNumber(v64) * __nfNumber(v88));
const v90=Math.fround(__nfNumber(v86) - v89);
const v92=v62["r"];
const v93=__nfValue(v92["a"]);
const v94=v65["r"];
const v95=__nfValue(v94["a"]);
const v96=Math.fround(__nfNumber(v64) * __nfNumber(v95));
const v97=Math.fround(__nfNumber(v93) - v96);
const v98=v62["r"];
const v99=__nfValue(v98["b"]);
const v100=v65["r"];
const v101=__nfValue(v100["b"]);
const v102=Math.fround(__nfNumber(v64) * __nfNumber(v101));
const v103=Math.fround(__nfNumber(v99) - v102);
const v105=v62["s"];
const v106=__nfValue(v105["a"]);
const v107=v65["s"];
const v108=__nfValue(v107["a"]);
const v109=Math.fround(__nfNumber(v64) * __nfNumber(v108));
const v110=Math.fround(__nfNumber(v106) - v109);
const v111=v62["s"];
const v112=__nfValue(v111["b"]);
const v113=v65["s"];
const v114=__nfValue(v113["b"]);
const v115=Math.fround(__nfNumber(v64) * __nfNumber(v114));
const v116=Math.fround(__nfNumber(v112) - v115);
const v118=v62["t"];
const v119=__nfValue(v118["a"]);
const v120=v65["t"];
const v121=__nfValue(v120["a"]);
const v122=Math.fround(__nfNumber(v64) * __nfNumber(v121));
const v123=Math.fround(__nfNumber(v119) - v122);
const v124=v62["t"];
const v125=__nfValue(v124["b"]);
const v126=v65["t"];
const v127=__nfValue(v126["b"]);
const v128=Math.fround(__nfNumber(v64) * __nfNumber(v127));
const v129=Math.fround(__nfNumber(v125) - v128);
const v131=v62["u"];
const v132=__nfValue(v131["a"]);
const v133=v65["u"];
const v134=__nfValue(v133["a"]);
const v135=Math.fround(__nfNumber(v64) * __nfNumber(v134));
const v136=Math.fround(__nfNumber(v132) - v135);
const v137=v62["u"];
const v138=__nfValue(v137["b"]);
const v139=v65["u"];
const v140=__nfValue(v139["b"]);
const v141=Math.fround(__nfNumber(v64) * __nfNumber(v140));
const v142=Math.fround(__nfNumber(v138) - v141);
return ({["p"]:({["a"]:v71,["b"]:v77}),["q"]:({["a"]:v84,["b"]:v90}),["r"]:({["a"]:v97,["b"]:v103}),["s"]:({["a"]:v110,["b"]:v116}),["t"]:({["a"]:v123,["b"]:v129}),["u"]:({["a"]:v136,["b"]:v142})});}
function __fn3(v144,v145){
const v146=v145.length;
const v147=new Array(v146);
for(let v148=0;v148<v146;v148++){
const v149=v145[v148];
const v150=__nfValue(v149);
v147[v148]=__fn0(v144,v150);
}
return v147;}
function __fn4(v151,v152){
const v153=v151["p"];
const v154=v153["a"];
const v155=__nfValue(v154["value"]);
const v156=__nfValue(v152["value"]);
const v157=Math.fround(__nfNumber(v155) - __nfNumber(v156));
const v158=__nfValue(v154["tangent_0"]);
const v159=__nfValue(v152["tangent_0"]);
const v160=Math.fround(__nfNumber(v158) - __nfNumber(v159));
const v161=__nfValue(v154["tangent_1"]);
const v162=__nfValue(v152["tangent_1"]);
const v163=Math.fround(__nfNumber(v161) - __nfNumber(v162));
const v164=__nfValue(v154["tangent_2"]);
const v165=__nfValue(v152["tangent_2"]);
const v166=Math.fround(__nfNumber(v164) - __nfNumber(v165));
const v167=__nfValue(v154["tangent_3"]);
const v168=__nfValue(v152["tangent_3"]);
const v169=Math.fround(__nfNumber(v167) - __nfNumber(v168));
const v170=__nfValue(v154["tangent_4"]);
const v171=__nfValue(v152["tangent_4"]);
const v172=Math.fround(__nfNumber(v170) - __nfNumber(v171));
const v173=__nfValue(v154["tangent_5"]);
const v174=__nfValue(v152["tangent_5"]);
const v175=Math.fround(__nfNumber(v173) - __nfNumber(v174));
const v176=__nfValue(v154["tangent_6"]);
const v177=__nfValue(v152["tangent_6"]);
const v178=Math.fround(__nfNumber(v176) - __nfNumber(v177));
const v179=__nfValue(v154["tangent_7"]);
const v180=__nfValue(v152["tangent_7"]);
const v181=Math.fround(__nfNumber(v179) - __nfNumber(v180));
const v182=__nfValue(v154["tangent_8"]);
const v183=__nfValue(v152["tangent_8"]);
const v184=Math.fround(__nfNumber(v182) - __nfNumber(v183));
const v185=__nfValue(v154["tangent_9"]);
const v186=__nfValue(v152["tangent_9"]);
const v187=Math.fround(__nfNumber(v185) - __nfNumber(v186));
const v188=__nfValue(v154["tangent_10"]);
const v189=__nfValue(v152["tangent_10"]);
const v190=Math.fround(__nfNumber(v188) - __nfNumber(v189));
const v191=__nfValue(v154["tangent_11"]);
const v192=__nfValue(v152["tangent_11"]);
const v193=Math.fround(__nfNumber(v191) - __nfNumber(v192));
const v195=v151["p"];
const v196=v195["b"];
const v197=__nfValue(v196["value"]);
const v198=__nfValue(v152["value"]);
const v199=Math.fround(__nfNumber(v197) + __nfNumber(v198));
const v200=__nfValue(v196["tangent_0"]);
const v201=__nfValue(v152["tangent_0"]);
const v202=Math.fround(__nfNumber(v200) + __nfNumber(v201));
const v203=__nfValue(v196["tangent_1"]);
const v204=__nfValue(v152["tangent_1"]);
const v205=Math.fround(__nfNumber(v203) + __nfNumber(v204));
const v206=__nfValue(v196["tangent_2"]);
const v207=__nfValue(v152["tangent_2"]);
const v208=Math.fround(__nfNumber(v206) + __nfNumber(v207));
const v209=__nfValue(v196["tangent_3"]);
const v210=__nfValue(v152["tangent_3"]);
const v211=Math.fround(__nfNumber(v209) + __nfNumber(v210));
const v212=__nfValue(v196["tangent_4"]);
const v213=__nfValue(v152["tangent_4"]);
const v214=Math.fround(__nfNumber(v212) + __nfNumber(v213));
const v215=__nfValue(v196["tangent_5"]);
const v216=__nfValue(v152["tangent_5"]);
const v217=Math.fround(__nfNumber(v215) + __nfNumber(v216));
const v218=__nfValue(v196["tangent_6"]);
const v219=__nfValue(v152["tangent_6"]);
const v220=Math.fround(__nfNumber(v218) + __nfNumber(v219));
const v221=__nfValue(v196["tangent_7"]);
const v222=__nfValue(v152["tangent_7"]);
const v223=Math.fround(__nfNumber(v221) + __nfNumber(v222));
const v224=__nfValue(v196["tangent_8"]);
const v225=__nfValue(v152["tangent_8"]);
const v226=Math.fround(__nfNumber(v224) + __nfNumber(v225));
const v227=__nfValue(v196["tangent_9"]);
const v228=__nfValue(v152["tangent_9"]);
const v229=Math.fround(__nfNumber(v227) + __nfNumber(v228));
const v230=__nfValue(v196["tangent_10"]);
const v231=__nfValue(v152["tangent_10"]);
const v232=Math.fround(__nfNumber(v230) + __nfNumber(v231));
const v233=__nfValue(v196["tangent_11"]);
const v234=__nfValue(v152["tangent_11"]);
const v235=Math.fround(__nfNumber(v233) + __nfNumber(v234));
const v237=v151["q"];
const v238=v237["a"];
const v239=__nfValue(v238["value"]);
const v240=__nfValue(v152["value"]);
const v241=Math.fround(__nfNumber(v239) - __nfNumber(v240));
const v242=__nfValue(v238["tangent_0"]);
const v243=__nfValue(v152["tangent_0"]);
const v244=Math.fround(__nfNumber(v242) - __nfNumber(v243));
const v245=__nfValue(v238["tangent_1"]);
const v246=__nfValue(v152["tangent_1"]);
const v247=Math.fround(__nfNumber(v245) - __nfNumber(v246));
const v248=__nfValue(v238["tangent_2"]);
const v249=__nfValue(v152["tangent_2"]);
const v250=Math.fround(__nfNumber(v248) - __nfNumber(v249));
const v251=__nfValue(v238["tangent_3"]);
const v252=__nfValue(v152["tangent_3"]);
const v253=Math.fround(__nfNumber(v251) - __nfNumber(v252));
const v254=__nfValue(v238["tangent_4"]);
const v255=__nfValue(v152["tangent_4"]);
const v256=Math.fround(__nfNumber(v254) - __nfNumber(v255));
const v257=__nfValue(v238["tangent_5"]);
const v258=__nfValue(v152["tangent_5"]);
const v259=Math.fround(__nfNumber(v257) - __nfNumber(v258));
const v260=__nfValue(v238["tangent_6"]);
const v261=__nfValue(v152["tangent_6"]);
const v262=Math.fround(__nfNumber(v260) - __nfNumber(v261));
const v263=__nfValue(v238["tangent_7"]);
const v264=__nfValue(v152["tangent_7"]);
const v265=Math.fround(__nfNumber(v263) - __nfNumber(v264));
const v266=__nfValue(v238["tangent_8"]);
const v267=__nfValue(v152["tangent_8"]);
const v268=Math.fround(__nfNumber(v266) - __nfNumber(v267));
const v269=__nfValue(v238["tangent_9"]);
const v270=__nfValue(v152["tangent_9"]);
const v271=Math.fround(__nfNumber(v269) - __nfNumber(v270));
const v272=__nfValue(v238["tangent_10"]);
const v273=__nfValue(v152["tangent_10"]);
const v274=Math.fround(__nfNumber(v272) - __nfNumber(v273));
const v275=__nfValue(v238["tangent_11"]);
const v276=__nfValue(v152["tangent_11"]);
const v277=Math.fround(__nfNumber(v275) - __nfNumber(v276));
const v279=v151["q"];
const v280=v279["b"];
const v281=__nfValue(v280["value"]);
const v282=__nfValue(v152["value"]);
const v283=Math.fround(__nfNumber(v281) + __nfNumber(v282));
const v284=__nfValue(v280["tangent_0"]);
const v285=__nfValue(v152["tangent_0"]);
const v286=Math.fround(__nfNumber(v284) + __nfNumber(v285));
const v287=__nfValue(v280["tangent_1"]);
const v288=__nfValue(v152["tangent_1"]);
const v289=Math.fround(__nfNumber(v287) + __nfNumber(v288));
const v290=__nfValue(v280["tangent_2"]);
const v291=__nfValue(v152["tangent_2"]);
const v292=Math.fround(__nfNumber(v290) + __nfNumber(v291));
const v293=__nfValue(v280["tangent_3"]);
const v294=__nfValue(v152["tangent_3"]);
const v295=Math.fround(__nfNumber(v293) + __nfNumber(v294));
const v296=__nfValue(v280["tangent_4"]);
const v297=__nfValue(v152["tangent_4"]);
const v298=Math.fround(__nfNumber(v296) + __nfNumber(v297));
const v299=__nfValue(v280["tangent_5"]);
const v300=__nfValue(v152["tangent_5"]);
const v301=Math.fround(__nfNumber(v299) + __nfNumber(v300));
const v302=__nfValue(v280["tangent_6"]);
const v303=__nfValue(v152["tangent_6"]);
const v304=Math.fround(__nfNumber(v302) + __nfNumber(v303));
const v305=__nfValue(v280["tangent_7"]);
const v306=__nfValue(v152["tangent_7"]);
const v307=Math.fround(__nfNumber(v305) + __nfNumber(v306));
const v308=__nfValue(v280["tangent_8"]);
const v309=__nfValue(v152["tangent_8"]);
const v310=Math.fround(__nfNumber(v308) + __nfNumber(v309));
const v311=__nfValue(v280["tangent_9"]);
const v312=__nfValue(v152["tangent_9"]);
const v313=Math.fround(__nfNumber(v311) + __nfNumber(v312));
const v314=__nfValue(v280["tangent_10"]);
const v315=__nfValue(v152["tangent_10"]);
const v316=Math.fround(__nfNumber(v314) + __nfNumber(v315));
const v317=__nfValue(v280["tangent_11"]);
const v318=__nfValue(v152["tangent_11"]);
const v319=Math.fround(__nfNumber(v317) + __nfNumber(v318));
const v321=v151["r"];
const v322=v321["a"];
const v323=__nfValue(v322["value"]);
const v324=__nfValue(v152["value"]);
const v325=Math.fround(__nfNumber(v323) - __nfNumber(v324));
const v326=__nfValue(v322["tangent_0"]);
const v327=__nfValue(v152["tangent_0"]);
const v328=Math.fround(__nfNumber(v326) - __nfNumber(v327));
const v329=__nfValue(v322["tangent_1"]);
const v330=__nfValue(v152["tangent_1"]);
const v331=Math.fround(__nfNumber(v329) - __nfNumber(v330));
const v332=__nfValue(v322["tangent_2"]);
const v333=__nfValue(v152["tangent_2"]);
const v334=Math.fround(__nfNumber(v332) - __nfNumber(v333));
const v335=__nfValue(v322["tangent_3"]);
const v336=__nfValue(v152["tangent_3"]);
const v337=Math.fround(__nfNumber(v335) - __nfNumber(v336));
const v338=__nfValue(v322["tangent_4"]);
const v339=__nfValue(v152["tangent_4"]);
const v340=Math.fround(__nfNumber(v338) - __nfNumber(v339));
const v341=__nfValue(v322["tangent_5"]);
const v342=__nfValue(v152["tangent_5"]);
const v343=Math.fround(__nfNumber(v341) - __nfNumber(v342));
const v344=__nfValue(v322["tangent_6"]);
const v345=__nfValue(v152["tangent_6"]);
const v346=Math.fround(__nfNumber(v344) - __nfNumber(v345));
const v347=__nfValue(v322["tangent_7"]);
const v348=__nfValue(v152["tangent_7"]);
const v349=Math.fround(__nfNumber(v347) - __nfNumber(v348));
const v350=__nfValue(v322["tangent_8"]);
const v351=__nfValue(v152["tangent_8"]);
const v352=Math.fround(__nfNumber(v350) - __nfNumber(v351));
const v353=__nfValue(v322["tangent_9"]);
const v354=__nfValue(v152["tangent_9"]);
const v355=Math.fround(__nfNumber(v353) - __nfNumber(v354));
const v356=__nfValue(v322["tangent_10"]);
const v357=__nfValue(v152["tangent_10"]);
const v358=Math.fround(__nfNumber(v356) - __nfNumber(v357));
const v359=__nfValue(v322["tangent_11"]);
const v360=__nfValue(v152["tangent_11"]);
const v361=Math.fround(__nfNumber(v359) - __nfNumber(v360));
const v363=v151["r"];
const v364=v363["b"];
const v365=__nfValue(v364["value"]);
const v366=__nfValue(v152["value"]);
const v367=Math.fround(__nfNumber(v365) + __nfNumber(v366));
const v368=__nfValue(v364["tangent_0"]);
const v369=__nfValue(v152["tangent_0"]);
const v370=Math.fround(__nfNumber(v368) + __nfNumber(v369));
const v371=__nfValue(v364["tangent_1"]);
const v372=__nfValue(v152["tangent_1"]);
const v373=Math.fround(__nfNumber(v371) + __nfNumber(v372));
const v374=__nfValue(v364["tangent_2"]);
const v375=__nfValue(v152["tangent_2"]);
const v376=Math.fround(__nfNumber(v374) + __nfNumber(v375));
const v377=__nfValue(v364["tangent_3"]);
const v378=__nfValue(v152["tangent_3"]);
const v379=Math.fround(__nfNumber(v377) + __nfNumber(v378));
const v380=__nfValue(v364["tangent_4"]);
const v381=__nfValue(v152["tangent_4"]);
const v382=Math.fround(__nfNumber(v380) + __nfNumber(v381));
const v383=__nfValue(v364["tangent_5"]);
const v384=__nfValue(v152["tangent_5"]);
const v385=Math.fround(__nfNumber(v383) + __nfNumber(v384));
const v386=__nfValue(v364["tangent_6"]);
const v387=__nfValue(v152["tangent_6"]);
const v388=Math.fround(__nfNumber(v386) + __nfNumber(v387));
const v389=__nfValue(v364["tangent_7"]);
const v390=__nfValue(v152["tangent_7"]);
const v391=Math.fround(__nfNumber(v389) + __nfNumber(v390));
const v392=__nfValue(v364["tangent_8"]);
const v393=__nfValue(v152["tangent_8"]);
const v394=Math.fround(__nfNumber(v392) + __nfNumber(v393));
const v395=__nfValue(v364["tangent_9"]);
const v396=__nfValue(v152["tangent_9"]);
const v397=Math.fround(__nfNumber(v395) + __nfNumber(v396));
const v398=__nfValue(v364["tangent_10"]);
const v399=__nfValue(v152["tangent_10"]);
const v400=Math.fround(__nfNumber(v398) + __nfNumber(v399));
const v401=__nfValue(v364["tangent_11"]);
const v402=__nfValue(v152["tangent_11"]);
const v403=Math.fround(__nfNumber(v401) + __nfNumber(v402));
const v405=v151["s"];
const v406=v405["a"];
const v407=__nfValue(v406["value"]);
const v408=__nfValue(v152["value"]);
const v409=Math.fround(__nfNumber(v407) - __nfNumber(v408));
const v410=__nfValue(v406["tangent_0"]);
const v411=__nfValue(v152["tangent_0"]);
const v412=Math.fround(__nfNumber(v410) - __nfNumber(v411));
const v413=__nfValue(v406["tangent_1"]);
const v414=__nfValue(v152["tangent_1"]);
const v415=Math.fround(__nfNumber(v413) - __nfNumber(v414));
const v416=__nfValue(v406["tangent_2"]);
const v417=__nfValue(v152["tangent_2"]);
const v418=Math.fround(__nfNumber(v416) - __nfNumber(v417));
const v419=__nfValue(v406["tangent_3"]);
const v420=__nfValue(v152["tangent_3"]);
const v421=Math.fround(__nfNumber(v419) - __nfNumber(v420));
const v422=__nfValue(v406["tangent_4"]);
const v423=__nfValue(v152["tangent_4"]);
const v424=Math.fround(__nfNumber(v422) - __nfNumber(v423));
const v425=__nfValue(v406["tangent_5"]);
const v426=__nfValue(v152["tangent_5"]);
const v427=Math.fround(__nfNumber(v425) - __nfNumber(v426));
const v428=__nfValue(v406["tangent_6"]);
const v429=__nfValue(v152["tangent_6"]);
const v430=Math.fround(__nfNumber(v428) - __nfNumber(v429));
const v431=__nfValue(v406["tangent_7"]);
const v432=__nfValue(v152["tangent_7"]);
const v433=Math.fround(__nfNumber(v431) - __nfNumber(v432));
const v434=__nfValue(v406["tangent_8"]);
const v435=__nfValue(v152["tangent_8"]);
const v436=Math.fround(__nfNumber(v434) - __nfNumber(v435));
const v437=__nfValue(v406["tangent_9"]);
const v438=__nfValue(v152["tangent_9"]);
const v439=Math.fround(__nfNumber(v437) - __nfNumber(v438));
const v440=__nfValue(v406["tangent_10"]);
const v441=__nfValue(v152["tangent_10"]);
const v442=Math.fround(__nfNumber(v440) - __nfNumber(v441));
const v443=__nfValue(v406["tangent_11"]);
const v444=__nfValue(v152["tangent_11"]);
const v445=Math.fround(__nfNumber(v443) - __nfNumber(v444));
const v447=v151["s"];
const v448=v447["b"];
const v449=__nfValue(v448["value"]);
const v450=__nfValue(v152["value"]);
const v451=Math.fround(__nfNumber(v449) + __nfNumber(v450));
const v452=__nfValue(v448["tangent_0"]);
const v453=__nfValue(v152["tangent_0"]);
const v454=Math.fround(__nfNumber(v452) + __nfNumber(v453));
const v455=__nfValue(v448["tangent_1"]);
const v456=__nfValue(v152["tangent_1"]);
const v457=Math.fround(__nfNumber(v455) + __nfNumber(v456));
const v458=__nfValue(v448["tangent_2"]);
const v459=__nfValue(v152["tangent_2"]);
const v460=Math.fround(__nfNumber(v458) + __nfNumber(v459));
const v461=__nfValue(v448["tangent_3"]);
const v462=__nfValue(v152["tangent_3"]);
const v463=Math.fround(__nfNumber(v461) + __nfNumber(v462));
const v464=__nfValue(v448["tangent_4"]);
const v465=__nfValue(v152["tangent_4"]);
const v466=Math.fround(__nfNumber(v464) + __nfNumber(v465));
const v467=__nfValue(v448["tangent_5"]);
const v468=__nfValue(v152["tangent_5"]);
const v469=Math.fround(__nfNumber(v467) + __nfNumber(v468));
const v470=__nfValue(v448["tangent_6"]);
const v471=__nfValue(v152["tangent_6"]);
const v472=Math.fround(__nfNumber(v470) + __nfNumber(v471));
const v473=__nfValue(v448["tangent_7"]);
const v474=__nfValue(v152["tangent_7"]);
const v475=Math.fround(__nfNumber(v473) + __nfNumber(v474));
const v476=__nfValue(v448["tangent_8"]);
const v477=__nfValue(v152["tangent_8"]);
const v478=Math.fround(__nfNumber(v476) + __nfNumber(v477));
const v479=__nfValue(v448["tangent_9"]);
const v480=__nfValue(v152["tangent_9"]);
const v481=Math.fround(__nfNumber(v479) + __nfNumber(v480));
const v482=__nfValue(v448["tangent_10"]);
const v483=__nfValue(v152["tangent_10"]);
const v484=Math.fround(__nfNumber(v482) + __nfNumber(v483));
const v485=__nfValue(v448["tangent_11"]);
const v486=__nfValue(v152["tangent_11"]);
const v487=Math.fround(__nfNumber(v485) + __nfNumber(v486));
const v489=v151["t"];
const v490=v489["a"];
const v491=__nfValue(v490["value"]);
const v492=__nfValue(v152["value"]);
const v493=Math.fround(__nfNumber(v491) - __nfNumber(v492));
const v494=__nfValue(v490["tangent_0"]);
const v495=__nfValue(v152["tangent_0"]);
const v496=Math.fround(__nfNumber(v494) - __nfNumber(v495));
const v497=__nfValue(v490["tangent_1"]);
const v498=__nfValue(v152["tangent_1"]);
const v499=Math.fround(__nfNumber(v497) - __nfNumber(v498));
const v500=__nfValue(v490["tangent_2"]);
const v501=__nfValue(v152["tangent_2"]);
const v502=Math.fround(__nfNumber(v500) - __nfNumber(v501));
const v503=__nfValue(v490["tangent_3"]);
const v504=__nfValue(v152["tangent_3"]);
const v505=Math.fround(__nfNumber(v503) - __nfNumber(v504));
const v506=__nfValue(v490["tangent_4"]);
const v507=__nfValue(v152["tangent_4"]);
const v508=Math.fround(__nfNumber(v506) - __nfNumber(v507));
const v509=__nfValue(v490["tangent_5"]);
const v510=__nfValue(v152["tangent_5"]);
const v511=Math.fround(__nfNumber(v509) - __nfNumber(v510));
const v512=__nfValue(v490["tangent_6"]);
const v513=__nfValue(v152["tangent_6"]);
const v514=Math.fround(__nfNumber(v512) - __nfNumber(v513));
const v515=__nfValue(v490["tangent_7"]);
const v516=__nfValue(v152["tangent_7"]);
const v517=Math.fround(__nfNumber(v515) - __nfNumber(v516));
const v518=__nfValue(v490["tangent_8"]);
const v519=__nfValue(v152["tangent_8"]);
const v520=Math.fround(__nfNumber(v518) - __nfNumber(v519));
const v521=__nfValue(v490["tangent_9"]);
const v522=__nfValue(v152["tangent_9"]);
const v523=Math.fround(__nfNumber(v521) - __nfNumber(v522));
const v524=__nfValue(v490["tangent_10"]);
const v525=__nfValue(v152["tangent_10"]);
const v526=Math.fround(__nfNumber(v524) - __nfNumber(v525));
const v527=__nfValue(v490["tangent_11"]);
const v528=__nfValue(v152["tangent_11"]);
const v529=Math.fround(__nfNumber(v527) - __nfNumber(v528));
const v531=v151["t"];
const v532=v531["b"];
const v533=__nfValue(v532["value"]);
const v534=__nfValue(v152["value"]);
const v535=Math.fround(__nfNumber(v533) + __nfNumber(v534));
const v536=__nfValue(v532["tangent_0"]);
const v537=__nfValue(v152["tangent_0"]);
const v538=Math.fround(__nfNumber(v536) + __nfNumber(v537));
const v539=__nfValue(v532["tangent_1"]);
const v540=__nfValue(v152["tangent_1"]);
const v541=Math.fround(__nfNumber(v539) + __nfNumber(v540));
const v542=__nfValue(v532["tangent_2"]);
const v543=__nfValue(v152["tangent_2"]);
const v544=Math.fround(__nfNumber(v542) + __nfNumber(v543));
const v545=__nfValue(v532["tangent_3"]);
const v546=__nfValue(v152["tangent_3"]);
const v547=Math.fround(__nfNumber(v545) + __nfNumber(v546));
const v548=__nfValue(v532["tangent_4"]);
const v549=__nfValue(v152["tangent_4"]);
const v550=Math.fround(__nfNumber(v548) + __nfNumber(v549));
const v551=__nfValue(v532["tangent_5"]);
const v552=__nfValue(v152["tangent_5"]);
const v553=Math.fround(__nfNumber(v551) + __nfNumber(v552));
const v554=__nfValue(v532["tangent_6"]);
const v555=__nfValue(v152["tangent_6"]);
const v556=Math.fround(__nfNumber(v554) + __nfNumber(v555));
const v557=__nfValue(v532["tangent_7"]);
const v558=__nfValue(v152["tangent_7"]);
const v559=Math.fround(__nfNumber(v557) + __nfNumber(v558));
const v560=__nfValue(v532["tangent_8"]);
const v561=__nfValue(v152["tangent_8"]);
const v562=Math.fround(__nfNumber(v560) + __nfNumber(v561));
const v563=__nfValue(v532["tangent_9"]);
const v564=__nfValue(v152["tangent_9"]);
const v565=Math.fround(__nfNumber(v563) + __nfNumber(v564));
const v566=__nfValue(v532["tangent_10"]);
const v567=__nfValue(v152["tangent_10"]);
const v568=Math.fround(__nfNumber(v566) + __nfNumber(v567));
const v569=__nfValue(v532["tangent_11"]);
const v570=__nfValue(v152["tangent_11"]);
const v571=Math.fround(__nfNumber(v569) + __nfNumber(v570));
const v573=v151["u"];
const v574=v573["a"];
const v575=__nfValue(v574["value"]);
const v576=__nfValue(v152["value"]);
const v577=Math.fround(__nfNumber(v575) - __nfNumber(v576));
const v578=__nfValue(v574["tangent_0"]);
const v579=__nfValue(v152["tangent_0"]);
const v580=Math.fround(__nfNumber(v578) - __nfNumber(v579));
const v581=__nfValue(v574["tangent_1"]);
const v582=__nfValue(v152["tangent_1"]);
const v583=Math.fround(__nfNumber(v581) - __nfNumber(v582));
const v584=__nfValue(v574["tangent_2"]);
const v585=__nfValue(v152["tangent_2"]);
const v586=Math.fround(__nfNumber(v584) - __nfNumber(v585));
const v587=__nfValue(v574["tangent_3"]);
const v588=__nfValue(v152["tangent_3"]);
const v589=Math.fround(__nfNumber(v587) - __nfNumber(v588));
const v590=__nfValue(v574["tangent_4"]);
const v591=__nfValue(v152["tangent_4"]);
const v592=Math.fround(__nfNumber(v590) - __nfNumber(v591));
const v593=__nfValue(v574["tangent_5"]);
const v594=__nfValue(v152["tangent_5"]);
const v595=Math.fround(__nfNumber(v593) - __nfNumber(v594));
const v596=__nfValue(v574["tangent_6"]);
const v597=__nfValue(v152["tangent_6"]);
const v598=Math.fround(__nfNumber(v596) - __nfNumber(v597));
const v599=__nfValue(v574["tangent_7"]);
const v600=__nfValue(v152["tangent_7"]);
const v601=Math.fround(__nfNumber(v599) - __nfNumber(v600));
const v602=__nfValue(v574["tangent_8"]);
const v603=__nfValue(v152["tangent_8"]);
const v604=Math.fround(__nfNumber(v602) - __nfNumber(v603));
const v605=__nfValue(v574["tangent_9"]);
const v606=__nfValue(v152["tangent_9"]);
const v607=Math.fround(__nfNumber(v605) - __nfNumber(v606));
const v608=__nfValue(v574["tangent_10"]);
const v609=__nfValue(v152["tangent_10"]);
const v610=Math.fround(__nfNumber(v608) - __nfNumber(v609));
const v611=__nfValue(v574["tangent_11"]);
const v612=__nfValue(v152["tangent_11"]);
const v613=Math.fround(__nfNumber(v611) - __nfNumber(v612));
const v615=v151["u"];
const v616=v615["b"];
const v617=__nfValue(v616["value"]);
const v618=__nfValue(v152["value"]);
const v619=Math.fround(__nfNumber(v617) + __nfNumber(v618));
const v620=__nfValue(v616["tangent_0"]);
const v621=__nfValue(v152["tangent_0"]);
const v622=Math.fround(__nfNumber(v620) + __nfNumber(v621));
const v623=__nfValue(v616["tangent_1"]);
const v624=__nfValue(v152["tangent_1"]);
const v625=Math.fround(__nfNumber(v623) + __nfNumber(v624));
const v626=__nfValue(v616["tangent_2"]);
const v627=__nfValue(v152["tangent_2"]);
const v628=Math.fround(__nfNumber(v626) + __nfNumber(v627));
const v629=__nfValue(v616["tangent_3"]);
const v630=__nfValue(v152["tangent_3"]);
const v631=Math.fround(__nfNumber(v629) + __nfNumber(v630));
const v632=__nfValue(v616["tangent_4"]);
const v633=__nfValue(v152["tangent_4"]);
const v634=Math.fround(__nfNumber(v632) + __nfNumber(v633));
const v635=__nfValue(v616["tangent_5"]);
const v636=__nfValue(v152["tangent_5"]);
const v637=Math.fround(__nfNumber(v635) + __nfNumber(v636));
const v638=__nfValue(v616["tangent_6"]);
const v639=__nfValue(v152["tangent_6"]);
const v640=Math.fround(__nfNumber(v638) + __nfNumber(v639));
const v641=__nfValue(v616["tangent_7"]);
const v642=__nfValue(v152["tangent_7"]);
const v643=Math.fround(__nfNumber(v641) + __nfNumber(v642));
const v644=__nfValue(v616["tangent_8"]);
const v645=__nfValue(v152["tangent_8"]);
const v646=Math.fround(__nfNumber(v644) + __nfNumber(v645));
const v647=__nfValue(v616["tangent_9"]);
const v648=__nfValue(v152["tangent_9"]);
const v649=Math.fround(__nfNumber(v647) + __nfNumber(v648));
const v650=__nfValue(v616["tangent_10"]);
const v651=__nfValue(v152["tangent_10"]);
const v652=Math.fround(__nfNumber(v650) + __nfNumber(v651));
const v653=__nfValue(v616["tangent_11"]);
const v654=__nfValue(v152["tangent_11"]);
const v655=Math.fround(__nfNumber(v653) + __nfNumber(v654));
const v657=Math.fround(v157 * v157);
const v658=Math.fround(v160 * v157);
const v659=Math.fround(v157 * v160);
const v660=Math.fround(v658 + v659);
const v661=Math.fround(v163 * v157);
const v662=Math.fround(v157 * v163);
const v663=Math.fround(v661 + v662);
const v664=Math.fround(v166 * v157);
const v665=Math.fround(v157 * v166);
const v666=Math.fround(v664 + v665);
const v667=Math.fround(v169 * v157);
const v668=Math.fround(v157 * v169);
const v669=Math.fround(v667 + v668);
const v670=Math.fround(v172 * v157);
const v671=Math.fround(v157 * v172);
const v672=Math.fround(v670 + v671);
const v673=Math.fround(v175 * v157);
const v674=Math.fround(v157 * v175);
const v675=Math.fround(v673 + v674);
const v676=Math.fround(v178 * v157);
const v677=Math.fround(v157 * v178);
const v678=Math.fround(v676 + v677);
const v679=Math.fround(v181 * v157);
const v680=Math.fround(v157 * v181);
const v681=Math.fround(v679 + v680);
const v682=Math.fround(v184 * v157);
const v683=Math.fround(v157 * v184);
const v684=Math.fround(v682 + v683);
const v685=Math.fround(v187 * v157);
const v686=Math.fround(v157 * v187);
const v687=Math.fround(v685 + v686);
const v688=Math.fround(v190 * v157);
const v689=Math.fround(v157 * v190);
const v690=Math.fround(v688 + v689);
const v691=Math.fround(v193 * v157);
const v692=Math.fround(v157 * v193);
const v693=Math.fround(v691 + v692);
const v695=Math.fround(v199 * v199);
const v696=Math.fround(v202 * v199);
const v697=Math.fround(v199 * v202);
const v698=Math.fround(v696 + v697);
const v699=Math.fround(v205 * v199);
const v700=Math.fround(v199 * v205);
const v701=Math.fround(v699 + v700);
const v702=Math.fround(v208 * v199);
const v703=Math.fround(v199 * v208);
const v704=Math.fround(v702 + v703);
const v705=Math.fround(v211 * v199);
const v706=Math.fround(v199 * v211);
const v707=Math.fround(v705 + v706);
const v708=Math.fround(v214 * v199);
const v709=Math.fround(v199 * v214);
const v710=Math.fround(v708 + v709);
const v711=Math.fround(v217 * v199);
const v712=Math.fround(v199 * v217);
const v713=Math.fround(v711 + v712);
const v714=Math.fround(v220 * v199);
const v715=Math.fround(v199 * v220);
const v716=Math.fround(v714 + v715);
const v717=Math.fround(v223 * v199);
const v718=Math.fround(v199 * v223);
const v719=Math.fround(v717 + v718);
const v720=Math.fround(v226 * v199);
const v721=Math.fround(v199 * v226);
const v722=Math.fround(v720 + v721);
const v723=Math.fround(v229 * v199);
const v724=Math.fround(v199 * v229);
const v725=Math.fround(v723 + v724);
const v726=Math.fround(v232 * v199);
const v727=Math.fround(v199 * v232);
const v728=Math.fround(v726 + v727);
const v729=Math.fround(v235 * v199);
const v730=Math.fround(v199 * v235);
const v731=Math.fround(v729 + v730);
const v733=Math.fround(v657 + v695);
const v734=Math.fround(v660 + v698);
const v735=Math.fround(v663 + v701);
const v736=Math.fround(v666 + v704);
const v737=Math.fround(v669 + v707);
const v738=Math.fround(v672 + v710);
const v739=Math.fround(v675 + v713);
const v740=Math.fround(v678 + v716);
const v741=Math.fround(v681 + v719);
const v742=Math.fround(v684 + v722);
const v743=Math.fround(v687 + v725);
const v744=Math.fround(v690 + v728);
const v745=Math.fround(v693 + v731);
const v747=Math.fround(v241 * v241);
const v748=Math.fround(v244 * v241);
const v749=Math.fround(v241 * v244);
const v750=Math.fround(v748 + v749);
const v751=Math.fround(v247 * v241);
const v752=Math.fround(v241 * v247);
const v753=Math.fround(v751 + v752);
const v754=Math.fround(v250 * v241);
const v755=Math.fround(v241 * v250);
const v756=Math.fround(v754 + v755);
const v757=Math.fround(v253 * v241);
const v758=Math.fround(v241 * v253);
const v759=Math.fround(v757 + v758);
const v760=Math.fround(v256 * v241);
const v761=Math.fround(v241 * v256);
const v762=Math.fround(v760 + v761);
const v763=Math.fround(v259 * v241);
const v764=Math.fround(v241 * v259);
const v765=Math.fround(v763 + v764);
const v766=Math.fround(v262 * v241);
const v767=Math.fround(v241 * v262);
const v768=Math.fround(v766 + v767);
const v769=Math.fround(v265 * v241);
const v770=Math.fround(v241 * v265);
const v771=Math.fround(v769 + v770);
const v772=Math.fround(v268 * v241);
const v773=Math.fround(v241 * v268);
const v774=Math.fround(v772 + v773);
const v775=Math.fround(v271 * v241);
const v776=Math.fround(v241 * v271);
const v777=Math.fround(v775 + v776);
const v778=Math.fround(v274 * v241);
const v779=Math.fround(v241 * v274);
const v780=Math.fround(v778 + v779);
const v781=Math.fround(v277 * v241);
const v782=Math.fround(v241 * v277);
const v783=Math.fround(v781 + v782);
const v785=Math.fround(v733 + v747);
const v786=Math.fround(v734 + v750);
const v787=Math.fround(v735 + v753);
const v788=Math.fround(v736 + v756);
const v789=Math.fround(v737 + v759);
const v790=Math.fround(v738 + v762);
const v791=Math.fround(v739 + v765);
const v792=Math.fround(v740 + v768);
const v793=Math.fround(v741 + v771);
const v794=Math.fround(v742 + v774);
const v795=Math.fround(v743 + v777);
const v796=Math.fround(v744 + v780);
const v797=Math.fround(v745 + v783);
const v799=Math.fround(v283 * v283);
const v800=Math.fround(v286 * v283);
const v801=Math.fround(v283 * v286);
const v802=Math.fround(v800 + v801);
const v803=Math.fround(v289 * v283);
const v804=Math.fround(v283 * v289);
const v805=Math.fround(v803 + v804);
const v806=Math.fround(v292 * v283);
const v807=Math.fround(v283 * v292);
const v808=Math.fround(v806 + v807);
const v809=Math.fround(v295 * v283);
const v810=Math.fround(v283 * v295);
const v811=Math.fround(v809 + v810);
const v812=Math.fround(v298 * v283);
const v813=Math.fround(v283 * v298);
const v814=Math.fround(v812 + v813);
const v815=Math.fround(v301 * v283);
const v816=Math.fround(v283 * v301);
const v817=Math.fround(v815 + v816);
const v818=Math.fround(v304 * v283);
const v819=Math.fround(v283 * v304);
const v820=Math.fround(v818 + v819);
const v821=Math.fround(v307 * v283);
const v822=Math.fround(v283 * v307);
const v823=Math.fround(v821 + v822);
const v824=Math.fround(v310 * v283);
const v825=Math.fround(v283 * v310);
const v826=Math.fround(v824 + v825);
const v827=Math.fround(v313 * v283);
const v828=Math.fround(v283 * v313);
const v829=Math.fround(v827 + v828);
const v830=Math.fround(v316 * v283);
const v831=Math.fround(v283 * v316);
const v832=Math.fround(v830 + v831);
const v833=Math.fround(v319 * v283);
const v834=Math.fround(v283 * v319);
const v835=Math.fround(v833 + v834);
const v837=Math.fround(v785 + v799);
const v838=Math.fround(v786 + v802);
const v839=Math.fround(v787 + v805);
const v840=Math.fround(v788 + v808);
const v841=Math.fround(v789 + v811);
const v842=Math.fround(v790 + v814);
const v843=Math.fround(v791 + v817);
const v844=Math.fround(v792 + v820);
const v845=Math.fround(v793 + v823);
const v846=Math.fround(v794 + v826);
const v847=Math.fround(v795 + v829);
const v848=Math.fround(v796 + v832);
const v849=Math.fround(v797 + v835);
const v851=Math.fround(v325 * v325);
const v852=Math.fround(v328 * v325);
const v853=Math.fround(v325 * v328);
const v854=Math.fround(v852 + v853);
const v855=Math.fround(v331 * v325);
const v856=Math.fround(v325 * v331);
const v857=Math.fround(v855 + v856);
const v858=Math.fround(v334 * v325);
const v859=Math.fround(v325 * v334);
const v860=Math.fround(v858 + v859);
const v861=Math.fround(v337 * v325);
const v862=Math.fround(v325 * v337);
const v863=Math.fround(v861 + v862);
const v864=Math.fround(v340 * v325);
const v865=Math.fround(v325 * v340);
const v866=Math.fround(v864 + v865);
const v867=Math.fround(v343 * v325);
const v868=Math.fround(v325 * v343);
const v869=Math.fround(v867 + v868);
const v870=Math.fround(v346 * v325);
const v871=Math.fround(v325 * v346);
const v872=Math.fround(v870 + v871);
const v873=Math.fround(v349 * v325);
const v874=Math.fround(v325 * v349);
const v875=Math.fround(v873 + v874);
const v876=Math.fround(v352 * v325);
const v877=Math.fround(v325 * v352);
const v878=Math.fround(v876 + v877);
const v879=Math.fround(v355 * v325);
const v880=Math.fround(v325 * v355);
const v881=Math.fround(v879 + v880);
const v882=Math.fround(v358 * v325);
const v883=Math.fround(v325 * v358);
const v884=Math.fround(v882 + v883);
const v885=Math.fround(v361 * v325);
const v886=Math.fround(v325 * v361);
const v887=Math.fround(v885 + v886);
const v889=Math.fround(v837 + v851);
const v890=Math.fround(v838 + v854);
const v891=Math.fround(v839 + v857);
const v892=Math.fround(v840 + v860);
const v893=Math.fround(v841 + v863);
const v894=Math.fround(v842 + v866);
const v895=Math.fround(v843 + v869);
const v896=Math.fround(v844 + v872);
const v897=Math.fround(v845 + v875);
const v898=Math.fround(v846 + v878);
const v899=Math.fround(v847 + v881);
const v900=Math.fround(v848 + v884);
const v901=Math.fround(v849 + v887);
const v903=Math.fround(v367 * v367);
const v904=Math.fround(v370 * v367);
const v905=Math.fround(v367 * v370);
const v906=Math.fround(v904 + v905);
const v907=Math.fround(v373 * v367);
const v908=Math.fround(v367 * v373);
const v909=Math.fround(v907 + v908);
const v910=Math.fround(v376 * v367);
const v911=Math.fround(v367 * v376);
const v912=Math.fround(v910 + v911);
const v913=Math.fround(v379 * v367);
const v914=Math.fround(v367 * v379);
const v915=Math.fround(v913 + v914);
const v916=Math.fround(v382 * v367);
const v917=Math.fround(v367 * v382);
const v918=Math.fround(v916 + v917);
const v919=Math.fround(v385 * v367);
const v920=Math.fround(v367 * v385);
const v921=Math.fround(v919 + v920);
const v922=Math.fround(v388 * v367);
const v923=Math.fround(v367 * v388);
const v924=Math.fround(v922 + v923);
const v925=Math.fround(v391 * v367);
const v926=Math.fround(v367 * v391);
const v927=Math.fround(v925 + v926);
const v928=Math.fround(v394 * v367);
const v929=Math.fround(v367 * v394);
const v930=Math.fround(v928 + v929);
const v931=Math.fround(v397 * v367);
const v932=Math.fround(v367 * v397);
const v933=Math.fround(v931 + v932);
const v934=Math.fround(v400 * v367);
const v935=Math.fround(v367 * v400);
const v936=Math.fround(v934 + v935);
const v937=Math.fround(v403 * v367);
const v938=Math.fround(v367 * v403);
const v939=Math.fround(v937 + v938);
const v941=Math.fround(v889 + v903);
const v942=Math.fround(v890 + v906);
const v943=Math.fround(v891 + v909);
const v944=Math.fround(v892 + v912);
const v945=Math.fround(v893 + v915);
const v946=Math.fround(v894 + v918);
const v947=Math.fround(v895 + v921);
const v948=Math.fround(v896 + v924);
const v949=Math.fround(v897 + v927);
const v950=Math.fround(v898 + v930);
const v951=Math.fround(v899 + v933);
const v952=Math.fround(v900 + v936);
const v953=Math.fround(v901 + v939);
const v955=Math.fround(v409 * v409);
const v956=Math.fround(v412 * v409);
const v957=Math.fround(v409 * v412);
const v958=Math.fround(v956 + v957);
const v959=Math.fround(v415 * v409);
const v960=Math.fround(v409 * v415);
const v961=Math.fround(v959 + v960);
const v962=Math.fround(v418 * v409);
const v963=Math.fround(v409 * v418);
const v964=Math.fround(v962 + v963);
const v965=Math.fround(v421 * v409);
const v966=Math.fround(v409 * v421);
const v967=Math.fround(v965 + v966);
const v968=Math.fround(v424 * v409);
const v969=Math.fround(v409 * v424);
const v970=Math.fround(v968 + v969);
const v971=Math.fround(v427 * v409);
const v972=Math.fround(v409 * v427);
const v973=Math.fround(v971 + v972);
const v974=Math.fround(v430 * v409);
const v975=Math.fround(v409 * v430);
const v976=Math.fround(v974 + v975);
const v977=Math.fround(v433 * v409);
const v978=Math.fround(v409 * v433);
const v979=Math.fround(v977 + v978);
const v980=Math.fround(v436 * v409);
const v981=Math.fround(v409 * v436);
const v982=Math.fround(v980 + v981);
const v983=Math.fround(v439 * v409);
const v984=Math.fround(v409 * v439);
const v985=Math.fround(v983 + v984);
const v986=Math.fround(v442 * v409);
const v987=Math.fround(v409 * v442);
const v988=Math.fround(v986 + v987);
const v989=Math.fround(v445 * v409);
const v990=Math.fround(v409 * v445);
const v991=Math.fround(v989 + v990);
const v993=Math.fround(v941 + v955);
const v994=Math.fround(v942 + v958);
const v995=Math.fround(v943 + v961);
const v996=Math.fround(v944 + v964);
const v997=Math.fround(v945 + v967);
const v998=Math.fround(v946 + v970);
const v999=Math.fround(v947 + v973);
const v1000=Math.fround(v948 + v976);
const v1001=Math.fround(v949 + v979);
const v1002=Math.fround(v950 + v982);
const v1003=Math.fround(v951 + v985);
const v1004=Math.fround(v952 + v988);
const v1005=Math.fround(v953 + v991);
const v1007=Math.fround(v451 * v451);
const v1008=Math.fround(v454 * v451);
const v1009=Math.fround(v451 * v454);
const v1010=Math.fround(v1008 + v1009);
const v1011=Math.fround(v457 * v451);
const v1012=Math.fround(v451 * v457);
const v1013=Math.fround(v1011 + v1012);
const v1014=Math.fround(v460 * v451);
const v1015=Math.fround(v451 * v460);
const v1016=Math.fround(v1014 + v1015);
const v1017=Math.fround(v463 * v451);
const v1018=Math.fround(v451 * v463);
const v1019=Math.fround(v1017 + v1018);
const v1020=Math.fround(v466 * v451);
const v1021=Math.fround(v451 * v466);
const v1022=Math.fround(v1020 + v1021);
const v1023=Math.fround(v469 * v451);
const v1024=Math.fround(v451 * v469);
const v1025=Math.fround(v1023 + v1024);
const v1026=Math.fround(v472 * v451);
const v1027=Math.fround(v451 * v472);
const v1028=Math.fround(v1026 + v1027);
const v1029=Math.fround(v475 * v451);
const v1030=Math.fround(v451 * v475);
const v1031=Math.fround(v1029 + v1030);
const v1032=Math.fround(v478 * v451);
const v1033=Math.fround(v451 * v478);
const v1034=Math.fround(v1032 + v1033);
const v1035=Math.fround(v481 * v451);
const v1036=Math.fround(v451 * v481);
const v1037=Math.fround(v1035 + v1036);
const v1038=Math.fround(v484 * v451);
const v1039=Math.fround(v451 * v484);
const v1040=Math.fround(v1038 + v1039);
const v1041=Math.fround(v487 * v451);
const v1042=Math.fround(v451 * v487);
const v1043=Math.fround(v1041 + v1042);
const v1045=Math.fround(v993 + v1007);
const v1046=Math.fround(v994 + v1010);
const v1047=Math.fround(v995 + v1013);
const v1048=Math.fround(v996 + v1016);
const v1049=Math.fround(v997 + v1019);
const v1050=Math.fround(v998 + v1022);
const v1051=Math.fround(v999 + v1025);
const v1052=Math.fround(v1000 + v1028);
const v1053=Math.fround(v1001 + v1031);
const v1054=Math.fround(v1002 + v1034);
const v1055=Math.fround(v1003 + v1037);
const v1056=Math.fround(v1004 + v1040);
const v1057=Math.fround(v1005 + v1043);
const v1059=Math.fround(v493 * v493);
const v1060=Math.fround(v496 * v493);
const v1061=Math.fround(v493 * v496);
const v1062=Math.fround(v1060 + v1061);
const v1063=Math.fround(v499 * v493);
const v1064=Math.fround(v493 * v499);
const v1065=Math.fround(v1063 + v1064);
const v1066=Math.fround(v502 * v493);
const v1067=Math.fround(v493 * v502);
const v1068=Math.fround(v1066 + v1067);
const v1069=Math.fround(v505 * v493);
const v1070=Math.fround(v493 * v505);
const v1071=Math.fround(v1069 + v1070);
const v1072=Math.fround(v508 * v493);
const v1073=Math.fround(v493 * v508);
const v1074=Math.fround(v1072 + v1073);
const v1075=Math.fround(v511 * v493);
const v1076=Math.fround(v493 * v511);
const v1077=Math.fround(v1075 + v1076);
const v1078=Math.fround(v514 * v493);
const v1079=Math.fround(v493 * v514);
const v1080=Math.fround(v1078 + v1079);
const v1081=Math.fround(v517 * v493);
const v1082=Math.fround(v493 * v517);
const v1083=Math.fround(v1081 + v1082);
const v1084=Math.fround(v520 * v493);
const v1085=Math.fround(v493 * v520);
const v1086=Math.fround(v1084 + v1085);
const v1087=Math.fround(v523 * v493);
const v1088=Math.fround(v493 * v523);
const v1089=Math.fround(v1087 + v1088);
const v1090=Math.fround(v526 * v493);
const v1091=Math.fround(v493 * v526);
const v1092=Math.fround(v1090 + v1091);
const v1093=Math.fround(v529 * v493);
const v1094=Math.fround(v493 * v529);
const v1095=Math.fround(v1093 + v1094);
const v1097=Math.fround(v1045 + v1059);
const v1098=Math.fround(v1046 + v1062);
const v1099=Math.fround(v1047 + v1065);
const v1100=Math.fround(v1048 + v1068);
const v1101=Math.fround(v1049 + v1071);
const v1102=Math.fround(v1050 + v1074);
const v1103=Math.fround(v1051 + v1077);
const v1104=Math.fround(v1052 + v1080);
const v1105=Math.fround(v1053 + v1083);
const v1106=Math.fround(v1054 + v1086);
const v1107=Math.fround(v1055 + v1089);
const v1108=Math.fround(v1056 + v1092);
const v1109=Math.fround(v1057 + v1095);
const v1111=Math.fround(v535 * v535);
const v1112=Math.fround(v538 * v535);
const v1113=Math.fround(v535 * v538);
const v1114=Math.fround(v1112 + v1113);
const v1115=Math.fround(v541 * v535);
const v1116=Math.fround(v535 * v541);
const v1117=Math.fround(v1115 + v1116);
const v1118=Math.fround(v544 * v535);
const v1119=Math.fround(v535 * v544);
const v1120=Math.fround(v1118 + v1119);
const v1121=Math.fround(v547 * v535);
const v1122=Math.fround(v535 * v547);
const v1123=Math.fround(v1121 + v1122);
const v1124=Math.fround(v550 * v535);
const v1125=Math.fround(v535 * v550);
const v1126=Math.fround(v1124 + v1125);
const v1127=Math.fround(v553 * v535);
const v1128=Math.fround(v535 * v553);
const v1129=Math.fround(v1127 + v1128);
const v1130=Math.fround(v556 * v535);
const v1131=Math.fround(v535 * v556);
const v1132=Math.fround(v1130 + v1131);
const v1133=Math.fround(v559 * v535);
const v1134=Math.fround(v535 * v559);
const v1135=Math.fround(v1133 + v1134);
const v1136=Math.fround(v562 * v535);
const v1137=Math.fround(v535 * v562);
const v1138=Math.fround(v1136 + v1137);
const v1139=Math.fround(v565 * v535);
const v1140=Math.fround(v535 * v565);
const v1141=Math.fround(v1139 + v1140);
const v1142=Math.fround(v568 * v535);
const v1143=Math.fround(v535 * v568);
const v1144=Math.fround(v1142 + v1143);
const v1145=Math.fround(v571 * v535);
const v1146=Math.fround(v535 * v571);
const v1147=Math.fround(v1145 + v1146);
const v1149=Math.fround(v1097 + v1111);
const v1150=Math.fround(v1098 + v1114);
const v1151=Math.fround(v1099 + v1117);
const v1152=Math.fround(v1100 + v1120);
const v1153=Math.fround(v1101 + v1123);
const v1154=Math.fround(v1102 + v1126);
const v1155=Math.fround(v1103 + v1129);
const v1156=Math.fround(v1104 + v1132);
const v1157=Math.fround(v1105 + v1135);
const v1158=Math.fround(v1106 + v1138);
const v1159=Math.fround(v1107 + v1141);
const v1160=Math.fround(v1108 + v1144);
const v1161=Math.fround(v1109 + v1147);
const v1163=Math.fround(v577 * v577);
const v1164=Math.fround(v580 * v577);
const v1165=Math.fround(v577 * v580);
const v1166=Math.fround(v1164 + v1165);
const v1167=Math.fround(v583 * v577);
const v1168=Math.fround(v577 * v583);
const v1169=Math.fround(v1167 + v1168);
const v1170=Math.fround(v586 * v577);
const v1171=Math.fround(v577 * v586);
const v1172=Math.fround(v1170 + v1171);
const v1173=Math.fround(v589 * v577);
const v1174=Math.fround(v577 * v589);
const v1175=Math.fround(v1173 + v1174);
const v1176=Math.fround(v592 * v577);
const v1177=Math.fround(v577 * v592);
const v1178=Math.fround(v1176 + v1177);
const v1179=Math.fround(v595 * v577);
const v1180=Math.fround(v577 * v595);
const v1181=Math.fround(v1179 + v1180);
const v1182=Math.fround(v598 * v577);
const v1183=Math.fround(v577 * v598);
const v1184=Math.fround(v1182 + v1183);
const v1185=Math.fround(v601 * v577);
const v1186=Math.fround(v577 * v601);
const v1187=Math.fround(v1185 + v1186);
const v1188=Math.fround(v604 * v577);
const v1189=Math.fround(v577 * v604);
const v1190=Math.fround(v1188 + v1189);
const v1191=Math.fround(v607 * v577);
const v1192=Math.fround(v577 * v607);
const v1193=Math.fround(v1191 + v1192);
const v1194=Math.fround(v610 * v577);
const v1195=Math.fround(v577 * v610);
const v1196=Math.fround(v1194 + v1195);
const v1197=Math.fround(v613 * v577);
const v1198=Math.fround(v577 * v613);
const v1199=Math.fround(v1197 + v1198);
const v1201=Math.fround(v1149 + v1163);
const v1202=Math.fround(v1150 + v1166);
const v1203=Math.fround(v1151 + v1169);
const v1204=Math.fround(v1152 + v1172);
const v1205=Math.fround(v1153 + v1175);
const v1206=Math.fround(v1154 + v1178);
const v1207=Math.fround(v1155 + v1181);
const v1208=Math.fround(v1156 + v1184);
const v1209=Math.fround(v1157 + v1187);
const v1210=Math.fround(v1158 + v1190);
const v1211=Math.fround(v1159 + v1193);
const v1212=Math.fround(v1160 + v1196);
const v1213=Math.fround(v1161 + v1199);
const v1215=Math.fround(v619 * v619);
const v1216=Math.fround(v622 * v619);
const v1217=Math.fround(v619 * v622);
const v1218=Math.fround(v1216 + v1217);
const v1219=Math.fround(v625 * v619);
const v1220=Math.fround(v619 * v625);
const v1221=Math.fround(v1219 + v1220);
const v1222=Math.fround(v628 * v619);
const v1223=Math.fround(v619 * v628);
const v1224=Math.fround(v1222 + v1223);
const v1225=Math.fround(v631 * v619);
const v1226=Math.fround(v619 * v631);
const v1227=Math.fround(v1225 + v1226);
const v1228=Math.fround(v634 * v619);
const v1229=Math.fround(v619 * v634);
const v1230=Math.fround(v1228 + v1229);
const v1231=Math.fround(v637 * v619);
const v1232=Math.fround(v619 * v637);
const v1233=Math.fround(v1231 + v1232);
const v1234=Math.fround(v640 * v619);
const v1235=Math.fround(v619 * v640);
const v1236=Math.fround(v1234 + v1235);
const v1237=Math.fround(v643 * v619);
const v1238=Math.fround(v619 * v643);
const v1239=Math.fround(v1237 + v1238);
const v1240=Math.fround(v646 * v619);
const v1241=Math.fround(v619 * v646);
const v1242=Math.fround(v1240 + v1241);
const v1243=Math.fround(v649 * v619);
const v1244=Math.fround(v619 * v649);
const v1245=Math.fround(v1243 + v1244);
const v1246=Math.fround(v652 * v619);
const v1247=Math.fround(v619 * v652);
const v1248=Math.fround(v1246 + v1247);
const v1249=Math.fround(v655 * v619);
const v1250=Math.fround(v619 * v655);
const v1251=Math.fround(v1249 + v1250);
const v1253=Math.fround(v1201 + v1215);
const v1254=Math.fround(v1202 + v1218);
const v1255=Math.fround(v1203 + v1221);
const v1256=Math.fround(v1204 + v1224);
const v1257=Math.fround(v1205 + v1227);
const v1258=Math.fround(v1206 + v1230);
const v1259=Math.fround(v1207 + v1233);
const v1260=Math.fround(v1208 + v1236);
const v1261=Math.fround(v1209 + v1239);
const v1262=Math.fround(v1210 + v1242);
const v1263=Math.fround(v1211 + v1245);
const v1264=Math.fround(v1212 + v1248);
const v1265=Math.fround(v1213 + v1251);
return ({["value"]:v1253,["tangent_0"]:v1254,["tangent_1"]:v1255,["tangent_2"]:v1256,["tangent_3"]:v1257,["tangent_4"]:v1258,["tangent_5"]:v1259,["tangent_6"]:v1260,["tangent_7"]:v1261,["tangent_8"]:v1262,["tangent_9"]:v1263,["tangent_10"]:v1264,["tangent_11"]:v1265});}
function __fn5(v1266,v1267){
v1267=__nfValue(v1267);
const v1268=v1266["p"];
const v1269=__nfValue(v1268["a"]);
const v1270=1.0;
const v1271=0.0;
const v1273=v1266["p"];
const v1274=__nfValue(v1273["b"]);
const v1277=v1266["q"];
const v1278=__nfValue(v1277["a"]);
const v1280=v1266["q"];
const v1281=__nfValue(v1280["b"]);
const v1284=v1266["r"];
const v1285=__nfValue(v1284["a"]);
const v1287=v1266["r"];
const v1288=__nfValue(v1287["b"]);
const v1291=v1266["s"];
const v1292=__nfValue(v1291["a"]);
const v1294=v1266["s"];
const v1295=__nfValue(v1294["b"]);
const v1298=v1266["t"];
const v1299=__nfValue(v1298["a"]);
const v1301=v1266["t"];
const v1302=__nfValue(v1301["b"]);
const v1305=v1266["u"];
const v1306=__nfValue(v1305["a"]);
const v1308=v1266["u"];
const v1309=__nfValue(v1308["b"]);
const v1314=__record0(v1269,v1274,v1278,v1281,v1285,v1288,v1292,v1295,v1299,v1302,v1306,v1309,v1267);
const v1315=__nfValue(v1314["tangent_0"]);
const v1316=__nfValue(v1314["tangent_1"]);
const v1318=__nfValue(v1314["tangent_2"]);
const v1319=__nfValue(v1314["tangent_3"]);
const v1321=__nfValue(v1314["tangent_4"]);
const v1322=__nfValue(v1314["tangent_5"]);
const v1324=__nfValue(v1314["tangent_6"]);
const v1325=__nfValue(v1314["tangent_7"]);
const v1327=__nfValue(v1314["tangent_8"]);
const v1328=__nfValue(v1314["tangent_9"]);
const v1330=__nfValue(v1314["tangent_10"]);
const v1331=__nfValue(v1314["tangent_11"]);
return ({["p"]:({["a"]:v1315,["b"]:v1316}),["q"]:({["a"]:v1318,["b"]:v1319}),["r"]:({["a"]:v1321,["b"]:v1322}),["s"]:({["a"]:v1324,["b"]:v1325}),["t"]:({["a"]:v1327,["b"]:v1328}),["u"]:({["a"]:v1330,["b"]:v1331})});}
function __into3(v1333,v1334,v1335){
const v1336=v1334.length;
for(let v1338=0;v1338<v1336;v1338++){
const v1339=v1334[v1338];
const v1340=__nfValue(v1339);
v1335[v1338]=__intoOutput3(__fn0(v1333,v1340));
}
return v1336;}
function __record0(v2771,v2772,v2773,v2774,v2775,v2776,v2777,v2778,v2779,v2780,v2781,v2782,v2783){
const v2784=1.0;
const v2785=0.0;
const v2807=Math.fround(__nfNumber(v2771) - __nfNumber(v2783));
const v2808=Math.fround(v2784 - v2785);
const v2809=Math.fround(v2785 - v2785);
const v2812=Math.fround(__nfNumber(v2772) + __nfNumber(v2783));
const v2813=Math.fround(v2785 + v2785);
const v2814=Math.fround(v2784 + v2785);
const v2817=Math.fround(__nfNumber(v2773) - __nfNumber(v2783));
const v2820=Math.fround(__nfNumber(v2774) + __nfNumber(v2783));
const v2823=Math.fround(__nfNumber(v2775) - __nfNumber(v2783));
const v2826=Math.fround(__nfNumber(v2776) + __nfNumber(v2783));
const v2829=Math.fround(__nfNumber(v2777) - __nfNumber(v2783));
const v2832=Math.fround(__nfNumber(v2778) + __nfNumber(v2783));
const v2835=Math.fround(__nfNumber(v2779) - __nfNumber(v2783));
const v2838=Math.fround(__nfNumber(v2780) + __nfNumber(v2783));
const v2841=Math.fround(__nfNumber(v2781) - __nfNumber(v2783));
const v2844=Math.fround(__nfNumber(v2782) + __nfNumber(v2783));
const v2846=Math.fround(v2807 * v2807);
const v2847=Math.fround(v2808 * v2807);
const v2848=Math.fround(v2807 * v2808);
const v2849=Math.fround(v2847 + v2848);
const v2850=Math.fround(v2809 * v2807);
const v2851=Math.fround(v2807 * v2809);
const v2852=Math.fround(v2850 + v2851);
const v2854=Math.fround(v2812 * v2812);
const v2855=Math.fround(v2813 * v2812);
const v2856=Math.fround(v2812 * v2813);
const v2857=Math.fround(v2855 + v2856);
const v2858=Math.fround(v2814 * v2812);
const v2859=Math.fround(v2812 * v2814);
const v2860=Math.fround(v2858 + v2859);
const v2862=Math.fround(v2846 + v2854);
const v2863=Math.fround(v2849 + v2857);
const v2864=Math.fround(v2852 + v2860);
const v2865=Math.fround(v2852 + v2857);
const v2867=Math.fround(v2817 * v2817);
const v2868=Math.fround(v2809 * v2817);
const v2869=Math.fround(v2817 * v2809);
const v2870=Math.fround(v2868 + v2869);
const v2871=Math.fround(v2808 * v2817);
const v2872=Math.fround(v2817 * v2808);
const v2873=Math.fround(v2871 + v2872);
const v2875=Math.fround(v2862 + v2867);
const v2876=Math.fround(v2863 + v2870);
const v2877=Math.fround(v2864 + v2870);
const v2878=Math.fround(v2865 + v2873);
const v2879=Math.fround(v2865 + v2870);
const v2881=Math.fround(v2820 * v2820);
const v2882=Math.fround(v2813 * v2820);
const v2883=Math.fround(v2820 * v2813);
const v2884=Math.fround(v2882 + v2883);
const v2885=Math.fround(v2814 * v2820);
const v2886=Math.fround(v2820 * v2814);
const v2887=Math.fround(v2885 + v2886);
const v2889=Math.fround(v2875 + v2881);
const v2890=Math.fround(v2876 + v2884);
const v2891=Math.fround(v2877 + v2884);
const v2892=Math.fround(v2878 + v2884);
const v2893=Math.fround(v2879 + v2887);
const v2894=Math.fround(v2879 + v2884);
const v2896=Math.fround(v2823 * v2823);
const v2897=Math.fround(v2809 * v2823);
const v2898=Math.fround(v2823 * v2809);
const v2899=Math.fround(v2897 + v2898);
const v2900=Math.fround(v2808 * v2823);
const v2901=Math.fround(v2823 * v2808);
const v2902=Math.fround(v2900 + v2901);
const v2904=Math.fround(v2889 + v2896);
const v2905=Math.fround(v2890 + v2899);
const v2906=Math.fround(v2891 + v2899);
const v2907=Math.fround(v2892 + v2899);
const v2908=Math.fround(v2893 + v2899);
const v2909=Math.fround(v2894 + v2902);
const v2910=Math.fround(v2894 + v2899);
const v2912=Math.fround(v2826 * v2826);
const v2913=Math.fround(v2813 * v2826);
const v2914=Math.fround(v2826 * v2813);
const v2915=Math.fround(v2913 + v2914);
const v2916=Math.fround(v2814 * v2826);
const v2917=Math.fround(v2826 * v2814);
const v2918=Math.fround(v2916 + v2917);
const v2920=Math.fround(v2904 + v2912);
const v2921=Math.fround(v2905 + v2915);
const v2922=Math.fround(v2906 + v2915);
const v2923=Math.fround(v2907 + v2915);
const v2924=Math.fround(v2908 + v2915);
const v2925=Math.fround(v2909 + v2915);
const v2926=Math.fround(v2910 + v2918);
const v2927=Math.fround(v2910 + v2915);
const v2929=Math.fround(v2829 * v2829);
const v2930=Math.fround(v2809 * v2829);
const v2931=Math.fround(v2829 * v2809);
const v2932=Math.fround(v2930 + v2931);
const v2933=Math.fround(v2808 * v2829);
const v2934=Math.fround(v2829 * v2808);
const v2935=Math.fround(v2933 + v2934);
const v2937=Math.fround(v2920 + v2929);
const v2938=Math.fround(v2921 + v2932);
const v2939=Math.fround(v2922 + v2932);
const v2940=Math.fround(v2923 + v2932);
const v2941=Math.fround(v2924 + v2932);
const v2942=Math.fround(v2925 + v2932);
const v2943=Math.fround(v2926 + v2932);
const v2944=Math.fround(v2927 + v2935);
const v2945=Math.fround(v2927 + v2932);
const v2947=Math.fround(v2832 * v2832);
const v2948=Math.fround(v2813 * v2832);
const v2949=Math.fround(v2832 * v2813);
const v2950=Math.fround(v2948 + v2949);
const v2951=Math.fround(v2814 * v2832);
const v2952=Math.fround(v2832 * v2814);
const v2953=Math.fround(v2951 + v2952);
const v2955=Math.fround(v2937 + v2947);
const v2956=Math.fround(v2938 + v2950);
const v2957=Math.fround(v2939 + v2950);
const v2958=Math.fround(v2940 + v2950);
const v2959=Math.fround(v2941 + v2950);
const v2960=Math.fround(v2942 + v2950);
const v2961=Math.fround(v2943 + v2950);
const v2962=Math.fround(v2944 + v2950);
const v2963=Math.fround(v2945 + v2953);
const v2964=Math.fround(v2945 + v2950);
const v2966=Math.fround(v2835 * v2835);
const v2967=Math.fround(v2809 * v2835);
const v2968=Math.fround(v2835 * v2809);
const v2969=Math.fround(v2967 + v2968);
const v2970=Math.fround(v2808 * v2835);
const v2971=Math.fround(v2835 * v2808);
const v2972=Math.fround(v2970 + v2971);
const v2974=Math.fround(v2955 + v2966);
const v2975=Math.fround(v2956 + v2969);
const v2976=Math.fround(v2957 + v2969);
const v2977=Math.fround(v2958 + v2969);
const v2978=Math.fround(v2959 + v2969);
const v2979=Math.fround(v2960 + v2969);
const v2980=Math.fround(v2961 + v2969);
const v2981=Math.fround(v2962 + v2969);
const v2982=Math.fround(v2963 + v2969);
const v2983=Math.fround(v2964 + v2972);
const v2984=Math.fround(v2964 + v2969);
const v2986=Math.fround(v2838 * v2838);
const v2987=Math.fround(v2813 * v2838);
const v2988=Math.fround(v2838 * v2813);
const v2989=Math.fround(v2987 + v2988);
const v2990=Math.fround(v2814 * v2838);
const v2991=Math.fround(v2838 * v2814);
const v2992=Math.fround(v2990 + v2991);
const v2994=Math.fround(v2974 + v2986);
const v2995=Math.fround(v2975 + v2989);
const v2996=Math.fround(v2976 + v2989);
const v2997=Math.fround(v2977 + v2989);
const v2998=Math.fround(v2978 + v2989);
const v2999=Math.fround(v2979 + v2989);
const v3000=Math.fround(v2980 + v2989);
const v3001=Math.fround(v2981 + v2989);
const v3002=Math.fround(v2982 + v2989);
const v3003=Math.fround(v2983 + v2989);
const v3004=Math.fround(v2984 + v2992);
const v3005=Math.fround(v2984 + v2989);
const v3007=Math.fround(v2841 * v2841);
const v3008=Math.fround(v2809 * v2841);
const v3009=Math.fround(v2841 * v2809);
const v3010=Math.fround(v3008 + v3009);
const v3011=Math.fround(v2808 * v2841);
const v3012=Math.fround(v2841 * v2808);
const v3013=Math.fround(v3011 + v3012);
const v3015=Math.fround(v2994 + v3007);
const v3016=Math.fround(v2995 + v3010);
const v3017=Math.fround(v2996 + v3010);
const v3018=Math.fround(v2997 + v3010);
const v3019=Math.fround(v2998 + v3010);
const v3020=Math.fround(v2999 + v3010);
const v3021=Math.fround(v3000 + v3010);
const v3022=Math.fround(v3001 + v3010);
const v3023=Math.fround(v3002 + v3010);
const v3024=Math.fround(v3003 + v3010);
const v3025=Math.fround(v3004 + v3010);
const v3026=Math.fround(v3005 + v3013);
const v3027=Math.fround(v3005 + v3010);
const v3029=Math.fround(v2844 * v2844);
const v3030=Math.fround(v2813 * v2844);
const v3031=Math.fround(v2844 * v2813);
const v3032=Math.fround(v3030 + v3031);
const v3033=Math.fround(v2814 * v2844);
const v3034=Math.fround(v2844 * v2814);
const v3035=Math.fround(v3033 + v3034);
const v3037=Math.fround(v3015 + v3029);
const v3038=Math.fround(v3016 + v3032);
const v3039=Math.fround(v3017 + v3032);
const v3040=Math.fround(v3018 + v3032);
const v3041=Math.fround(v3019 + v3032);
const v3042=Math.fround(v3020 + v3032);
const v3043=Math.fround(v3021 + v3032);
const v3044=Math.fround(v3022 + v3032);
const v3045=Math.fround(v3023 + v3032);
const v3046=Math.fround(v3024 + v3032);
const v3047=Math.fround(v3025 + v3032);
const v3048=Math.fround(v3026 + v3032);
const v3049=Math.fround(v3027 + v3035);
return ({["value"]:v3037,["tangent_0"]:v3038,["tangent_1"]:v3039,["tangent_2"]:v3040,["tangent_3"]:v3041,["tangent_4"]:v3042,["tangent_5"]:v3043,["tangent_6"]:v3044,["tangent_7"]:v3045,["tangent_8"]:v3046,["tangent_9"]:v3047,["tangent_10"]:v3048,["tangent_11"]:v3049});}
const __namedTypes={"Pair":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"},"Weights":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},"__ink_differential_0":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_0"},"__ink_differential_2":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"},"__ink_differential_4":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"},"__ink_differential_5":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v7","core_sha256":"99ee1994f13808edc49ccc7a4e7d63df92b359e3af1848ed2a9c8961bb26f45d","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_computation":"native-number-with-exact-nonfinite-tags","f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":null,"index":0,"internal":false,"name":"energy","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":1,"internal":false,"name":"derivatives","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"destination":null,"index":2,"internal":false,"name":"step","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":3,"internal":false,"name":"forecast","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":4,"internal":false,"name":"__ink_differential_3","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"}},{"name":"x","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"destination":null,"index":5,"internal":false,"name":"__ink_differential_1","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}}],"named_types":{"Pair":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"},"Weights":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},"__ink_differential_0":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_0"},"__ink_differential_2":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"},"__ink_differential_4":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"},"__ink_differential_5":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":false,"function":"energy","reason":"no reusable captured work"},{"delegated_calls":1,"factory":true,"function":"derivatives","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"step","retained_bindings":1},{"factory":false,"function":"forecast","reason":"no reusable captured work"},{"factory":false,"function":"__ink_differential_3","reason":"prepared residual binding budget"},{"delegated_calls":1,"factory":true,"function":"__ink_differential_1","retained_bindings":1}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"__ink_differential_1":{"arguments":{"format":"ink-value-wire-v1","identity":"6969e5ae336b006bfc4a29f0f48bf7830f070c29889b0da15bd9b60387bc0034","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"280e6fcea2453cac70c48cbcf7a1ed3b96dcb3450cf04b0e766d6d8d9ca52c7d","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}}},"__ink_differential_3":{"arguments":{"format":"ink-value-wire-v1","identity":"1d368d11ae3fd3df968cc51472c46914649ff205acd33e8d0894f38dfbe17c52","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"}},{"name":"x","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"bb2b2f3efce5ad7f78fd263ef8cf59e1adcabaeb4e987b0d193c2a16c631b760","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}},"derivatives":{"arguments":{"format":"ink-value-wire-v1","identity":"6969e5ae336b006bfc4a29f0f48bf7830f070c29889b0da15bd9b60387bc0034","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"280e6fcea2453cac70c48cbcf7a1ed3b96dcb3450cf04b0e766d6d8d9ca52c7d","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}}},"energy":{"arguments":{"format":"ink-value-wire-v1","identity":"6969e5ae336b006bfc4a29f0f48bf7830f070c29889b0da15bd9b60387bc0034","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"forecast":{"arguments":{"format":"ink-value-wire-v1","identity":"33938c34b37e15e4deb349dda0067bf7dd947fbd77ee32156e59320334018ec1","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"step":{"arguments":{"format":"ink-value-wire-v1","identity":"334b5ab90edd28f32246bed495f9d9abb48fdd92b2062193a91691974b2c1054","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},{"name":"x","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"280e6fcea2453cac70c48cbcf7a1ed3b96dcb3450cf04b0e766d6d8d9ca52c7d","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[false,true],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},{"kind":"f32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,false],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"},{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}]},{"capture":[false,true],"types":[{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"},{"kind":"f32"}]}];

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
function __ownedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue0(value[i],budget,depth+1);return out;}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["a"]:__ownedValue0(value["a"],budget,depth+1),["b"]:__ownedValue0(value["b"],budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["p"]:__ownedValue2(value["p"],budget,depth+1),["q"]:__ownedValue2(value["q"],budget,depth+1),["r"]:__ownedValue2(value["r"],budget,depth+1),["s"]:__ownedValue2(value["s"],budget,depth+1),["t"]:__ownedValue2(value["t"],budget,depth+1),["u"]:__ownedValue2(value["u"],budget,depth+1)};}
function __ownedValue4(value,budget,depth){budget.enter(depth,4);return {["value"]:__ownedValue0(value["value"],budget,depth+1),["tangent_0"]:__ownedValue0(value["tangent_0"],budget,depth+1),["tangent_1"]:__ownedValue0(value["tangent_1"],budget,depth+1),["tangent_2"]:__ownedValue0(value["tangent_2"],budget,depth+1),["tangent_3"]:__ownedValue0(value["tangent_3"],budget,depth+1),["tangent_4"]:__ownedValue0(value["tangent_4"],budget,depth+1),["tangent_5"]:__ownedValue0(value["tangent_5"],budget,depth+1),["tangent_6"]:__ownedValue0(value["tangent_6"],budget,depth+1),["tangent_7"]:__ownedValue0(value["tangent_7"],budget,depth+1),["tangent_8"]:__ownedValue0(value["tangent_8"],budget,depth+1),["tangent_9"]:__ownedValue0(value["tangent_9"],budget,depth+1),["tangent_10"]:__ownedValue0(value["tangent_10"],budget,depth+1),["tangent_11"]:__ownedValue0(value["tangent_11"],budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
const __ownedFunctions=Object.freeze(Object.fromEntries([["energy",__ownedValue0],["derivatives",__ownedValue1],["step",__ownedValue1],["forecast",__ownedValue3],["__ink_differential_3",__ownedValue4],["__ink_differential_1",__ownedValue1]]));
function __wireValue9(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue3(reader);reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value={["a"]:__wireValue7(reader),["b"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={["a"]:__wireValue3(reader),["b"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["p"]:__wireValue6(reader),["q"]:__wireValue6(reader),["r"]:__wireValue6(reader),["s"]:__wireValue6(reader),["t"]:__wireValue6(reader),["u"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["p"]:__wireValue2(reader),["q"]:__wireValue2(reader),["r"]:__wireValue2(reader),["s"]:__wireValue2(reader),["t"]:__wireValue2(reader),["u"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const value={["value"]:__wireValue3(reader),["tangent_0"]:__wireValue3(reader),["tangent_1"]:__wireValue3(reader),["tangent_2"]:__wireValue3(reader),["tangent_3"]:__wireValue3(reader),["tangent_4"]:__wireValue3(reader),["tangent_5"]:__wireValue3(reader),["tangent_6"]:__wireValue3(reader),["tangent_7"]:__wireValue3(reader),["tangent_8"]:__wireValue3(reader),["tangent_9"]:__wireValue3(reader),["tangent_10"]:__wireValue3(reader),["tangent_11"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value={["w"]:__wireValue5(reader),["x"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={["w"]:__wireValue1(reader),["x"]:__wireValue3(reader),["rate"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["w"]:__wireValue1(reader),["x"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={["w"]:__wireValue1(reader),["xs"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["__ink_differential_1",[__wireValue0,__wireValue1]],["__ink_differential_3",[__wireValue4,__wireValue7]],["derivatives",[__wireValue0,__wireValue1]],["energy",[__wireValue0,__wireValue3]],["forecast",[__wireValue8,__wireValue9]],["step",[__wireValue10,__wireValue1]]]));

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
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture2(value[i],budget,depth+1);return out;}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"a")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b")){throw Error('invalid value for wire schema');}return {["a"]:__privateCapture6(value["a"],budget,depth+1),["b"]:__privateCapture6(value["b"],budget,depth+1)};}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"a")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"b")){throw Error('invalid value for wire schema');}return {["a"]:__privateCapture2(value["a"],budget,depth+1),["b"]:__privateCapture2(value["b"],budget,depth+1)};}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"p")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"q")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"r")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"s")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"t")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"u")){throw Error('invalid value for wire schema');}return {["p"]:__privateCapture5(value["p"],budget,depth+1),["q"]:__privateCapture5(value["q"],budget,depth+1),["r"]:__privateCapture5(value["r"],budget,depth+1),["s"]:__privateCapture5(value["s"],budget,depth+1),["t"]:__privateCapture5(value["t"],budget,depth+1),["u"]:__privateCapture5(value["u"],budget,depth+1)};}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"p")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"q")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"r")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"s")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"t")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"u")){throw Error('invalid value for wire schema');}return {["p"]:__privateCapture1(value["p"],budget,depth+1),["q"]:__privateCapture1(value["q"],budget,depth+1),["r"]:__privateCapture1(value["r"],budget,depth+1),["s"]:__privateCapture1(value["s"],budget,depth+1),["t"]:__privateCapture1(value["t"],budget,depth+1),["u"]:__privateCapture1(value["u"],budget,depth+1)};}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==13){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_0")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_1")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_2")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_3")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_4")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_5")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_6")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_7")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_8")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_9")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_10")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_11")){throw Error('invalid value for wire schema');}return {["value"]:__privateCapture2(value["value"],budget,depth+1),["tangent_0"]:__privateCapture2(value["tangent_0"],budget,depth+1),["tangent_1"]:__privateCapture2(value["tangent_1"],budget,depth+1),["tangent_2"]:__privateCapture2(value["tangent_2"],budget,depth+1),["tangent_3"]:__privateCapture2(value["tangent_3"],budget,depth+1),["tangent_4"]:__privateCapture2(value["tangent_4"],budget,depth+1),["tangent_5"]:__privateCapture2(value["tangent_5"],budget,depth+1),["tangent_6"]:__privateCapture2(value["tangent_6"],budget,depth+1),["tangent_7"]:__privateCapture2(value["tangent_7"],budget,depth+1),["tangent_8"]:__privateCapture2(value["tangent_8"],budget,depth+1),["tangent_9"]:__privateCapture2(value["tangent_9"],budget,depth+1),["tangent_10"]:__privateCapture2(value["tangent_10"],budget,depth+1),["tangent_11"]:__privateCapture2(value["tangent_11"],budget,depth+1)};}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return __nfFromBits(bits);}
function __privateWireValue5(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue2(reader);reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value={["a"]:__privateWireValue9(reader),["b"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value={["a"]:__privateWireValue2(reader),["b"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const value={["p"]:__privateWireValue8(reader),["q"]:__privateWireValue8(reader),["r"]:__privateWireValue8(reader),["s"]:__privateWireValue8(reader),["t"]:__privateWireValue8(reader),["u"]:__privateWireValue8(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value={["p"]:__privateWireValue1(reader),["q"]:__privateWireValue1(reader),["r"]:__privateWireValue1(reader),["s"]:__privateWireValue1(reader),["t"]:__privateWireValue1(reader),["u"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["value"]:__privateWireValue2(reader),["tangent_0"]:__privateWireValue2(reader),["tangent_1"]:__privateWireValue2(reader),["tangent_2"]:__privateWireValue2(reader),["tangent_3"]:__privateWireValue2(reader),["tangent_4"]:__privateWireValue2(reader),["tangent_5"]:__privateWireValue2(reader),["tangent_6"]:__privateWireValue2(reader),["tangent_7"]:__privateWireValue2(reader),["tangent_8"]:__privateWireValue2(reader),["tangent_9"]:__privateWireValue2(reader),["tangent_10"]:__privateWireValue2(reader),["tangent_11"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value={["w"]:__privateWireValue7(reader),["x"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value={["w"]:__privateWireValue0(reader),["x"]:__privateWireValue2(reader),["rate"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value={["w"]:__privateWireValue0(reader),["x"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value={["w"]:__privateWireValue0(reader),["xs"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value=__nfFromBits(reader.word());reader.finish(end);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue2(value[i],budget,depth+1);return out;}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,4);return {["a"]:__compiledOwnedValue6(value["a"],budget,depth+1),["b"]:__compiledOwnedValue6(value["b"],budget,depth+1)};}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,4);return {["a"]:__compiledOwnedValue2(value["a"],budget,depth+1),["b"]:__compiledOwnedValue2(value["b"],budget,depth+1)};}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,4);return {["p"]:__compiledOwnedValue5(value["p"],budget,depth+1),["q"]:__compiledOwnedValue5(value["q"],budget,depth+1),["r"]:__compiledOwnedValue5(value["r"],budget,depth+1),["s"]:__compiledOwnedValue5(value["s"],budget,depth+1),["t"]:__compiledOwnedValue5(value["t"],budget,depth+1),["u"]:__compiledOwnedValue5(value["u"],budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,4);return {["p"]:__compiledOwnedValue1(value["p"],budget,depth+1),["q"]:__compiledOwnedValue1(value["q"],budget,depth+1),["r"]:__compiledOwnedValue1(value["r"],budget,depth+1),["s"]:__compiledOwnedValue1(value["s"],budget,depth+1),["t"]:__compiledOwnedValue1(value["t"],budget,depth+1),["u"]:__compiledOwnedValue1(value["u"],budget,depth+1)};}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);return {["value"]:__compiledOwnedValue2(value["value"],budget,depth+1),["tangent_0"]:__compiledOwnedValue2(value["tangent_0"],budget,depth+1),["tangent_1"]:__compiledOwnedValue2(value["tangent_1"],budget,depth+1),["tangent_2"]:__compiledOwnedValue2(value["tangent_2"],budget,depth+1),["tangent_3"]:__compiledOwnedValue2(value["tangent_3"],budget,depth+1),["tangent_4"]:__compiledOwnedValue2(value["tangent_4"],budget,depth+1),["tangent_5"]:__compiledOwnedValue2(value["tangent_5"],budget,depth+1),["tangent_6"]:__compiledOwnedValue2(value["tangent_6"],budget,depth+1),["tangent_7"]:__compiledOwnedValue2(value["tangent_7"],budget,depth+1),["tangent_8"]:__compiledOwnedValue2(value["tangent_8"],budget,depth+1),["tangent_9"]:__compiledOwnedValue2(value["tangent_9"],budget,depth+1),["tangent_10"]:__compiledOwnedValue2(value["tangent_10"],budget,depth+1),["tangent_11"]:__compiledOwnedValue2(value["tangent_11"],budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite2(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();__privateWireWrite6(writer,value["a"],compact);__privateWireWrite6(writer,value["b"],compact);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["a"],compact);__privateWireWrite2(writer,value["b"],compact);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();__privateWireWrite5(writer,value["p"],compact);__privateWireWrite5(writer,value["q"],compact);__privateWireWrite5(writer,value["r"],compact);__privateWireWrite5(writer,value["s"],compact);__privateWireWrite5(writer,value["t"],compact);__privateWireWrite5(writer,value["u"],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["p"],compact);__privateWireWrite1(writer,value["q"],compact);__privateWireWrite1(writer,value["r"],compact);__privateWireWrite1(writer,value["s"],compact);__privateWireWrite1(writer,value["t"],compact);__privateWireWrite1(writer,value["u"],compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["value"],compact);__privateWireWrite2(writer,value["tangent_0"],compact);__privateWireWrite2(writer,value["tangent_1"],compact);__privateWireWrite2(writer,value["tangent_2"],compact);__privateWireWrite2(writer,value["tangent_3"],compact);__privateWireWrite2(writer,value["tangent_4"],compact);__privateWireWrite2(writer,value["tangent_5"],compact);__privateWireWrite2(writer,value["tangent_6"],compact);__privateWireWrite2(writer,value["tangent_7"],compact);__privateWireWrite2(writer,value["tangent_8"],compact);__privateWireWrite2(writer,value["tangent_9"],compact);__privateWireWrite2(writer,value["tangent_10"],compact);__privateWireWrite2(writer,value["tangent_11"],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();writer.word(__nfBits(value));writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'record',fields:["p","q","r","s","t","u"],patterns:[{bytes:4,label:"record",children:[1,1,1,1,1,1],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["p"]:values[0],["q"]:values[1],["r"]:values[2],["s"]:values[3],["t"]:values[4],["u"]:values[5]})}]},{kind:'record',fields:["a","b"],patterns:[{bytes:4,label:"record",children:[2,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["a"]:values[0],["b"]:values[1]})}]},{kind:"f32",scalar:__privateCapture2},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[2],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["p","q","r","s","t","u"],patterns:[{bytes:4,label:"record",children:[5,5,5,5,5,5],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["p"]:values[0],["q"]:values[1],["r"]:values[2],["s"]:values[3],["t"]:values[4],["u"]:values[5]})}]},{kind:'record',fields:["a","b"],patterns:[{bytes:4,label:"record",children:[6,6],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["a"]:values[0],["b"]:values[1]})}]},{kind:'record',fields:["value","tangent_0","tangent_1","tangent_2","tangent_3","tangent_4","tangent_5","tangent_6","tangent_7","tangent_8","tangent_9","tangent_10","tangent_11"],patterns:[{bytes:4,label:"record",children:[2,2,2,2,2,2,2,2,2,2,2,2,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["value"]:values[0],["tangent_0"]:values[1],["tangent_1"]:values[2],["tangent_2"]:values[3],["tangent_3"]:values[4],["tangent_4"]:values[5],["tangent_5"]:values[6],["tangent_6"]:values[7],["tangent_7"]:values[8],["tangent_8"]:values[9],["tangent_9"]:values[10],["tangent_10"]:values[11],["tangent_11"]:values[12]})}]}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,4);return r[0](__reduceValue1(value["p"],r,b,d+1,c),__reduceValue1(value["q"],r,b,d+1,c),__reduceValue1(value["r"],r,b,d+1,c),__reduceValue1(value["s"],r,b,d+1,c),__reduceValue1(value["t"],r,b,d+1,c),__reduceValue1(value["u"],r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,4);return r[1](__reduceValue2(value["a"],r,b,d+1,c),__reduceValue2(value["b"],r,b,d+1,c),c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,8);return r[2]({F32Bits:__nfBits(value)},c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[3];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue2(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,4);return r[4](__reduceValue5(value["p"],r,b,d+1,c),__reduceValue5(value["q"],r,b,d+1,c),__reduceValue5(value["r"],r,b,d+1,c),__reduceValue5(value["s"],r,b,d+1,c),__reduceValue5(value["t"],r,b,d+1,c),__reduceValue5(value["u"],r,b,d+1,c),c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,4);return r[5](__reduceValue6(value["a"],r,b,d+1,c),__reduceValue6(value["b"],r,b,d+1,c),c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,4);return r[6](__reduceValue2(value["value"],r,b,d+1,c),__reduceValue2(value["tangent_0"],r,b,d+1,c),__reduceValue2(value["tangent_1"],r,b,d+1,c),__reduceValue2(value["tangent_2"],r,b,d+1,c),__reduceValue2(value["tangent_3"],r,b,d+1,c),__reduceValue2(value["tangent_4"],r,b,d+1,c),__reduceValue2(value["tangent_5"],r,b,d+1,c),__reduceValue2(value["tangent_6"],r,b,d+1,c),__reduceValue2(value["tangent_7"],r,b,d+1,c),__reduceValue2(value["tangent_8"],r,b,d+1,c),__reduceValue2(value["tangent_9"],r,b,d+1,c),__reduceValue2(value["tangent_10"],r,b,d+1,c),__reduceValue2(value["tangent_11"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,1,1,1,1,1]),"fields":Object.freeze(["p","q","r","s","t","u"]),"kind":"record","name":"Weights"}),Object.freeze({"children":Object.freeze([2,2]),"fields":Object.freeze(["a","b"]),"kind":"record","name":"Pair"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([2]),"kind":"list"}),Object.freeze({"children":Object.freeze([5,5,5,5,5,5]),"fields":Object.freeze(["p","q","r","s","t","u"]),"kind":"record","name":"__ink_differential_4"}),Object.freeze({"children":Object.freeze([6,6]),"fields":Object.freeze(["a","b"]),"kind":"record","name":"__ink_differential_5"}),Object.freeze({"children":Object.freeze([2,2,2,2,2,2,2,2,2,2,2,2,2]),"fields":Object.freeze(["value","tangent_0","tangent_1","tangent_2","tangent_3","tangent_4","tangent_5","tangent_6","tangent_7","tangent_8","tangent_9","tangent_10","tangent_11"]),"kind":"record","name":"__ink_differential_2"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"280e6fcea2453cac70c48cbcf7a1ed3b96dcb3450cf04b0e766d6d8d9ca52c7d","named":__compiledNamed0(),"root":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"q","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"r","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"s","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"t","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}},{"name":"u","type":{"fields":[{"name":"a","type":{"kind":"f32"}},{"name":"b","type":{"kind":"f32"}}],"kind":"record","name":"Pair"}}],"kind":"record","name":"Weights"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture3,__privateWireValue5,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"1ed4df67eec523fb721f2ffb2ccd09b8aa81b446e7cf8b212dcb0624fdc7c7ae","named":__compiledNamed0(),"root":{"fields":[{"name":"p","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"q","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"r","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"s","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"t","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}},{"name":"u","type":{"fields":[{"name":"a","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"b","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"__ink_differential_4"}},__privateCapture4,__privateWireValue7,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"bb2b2f3efce5ad7f78fd263ef8cf59e1adcabaeb4e987b0d193c2a16c631b760","named":__compiledNamed0(),"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}},{"name":"tangent_4","type":{"kind":"f32"}},{"name":"tangent_5","type":{"kind":"f32"}},{"name":"tangent_6","type":{"kind":"f32"}},{"name":"tangent_7","type":{"kind":"f32"}},{"name":"tangent_8","type":{"kind":"f32"}},{"name":"tangent_9","type":{"kind":"f32"}},{"name":"tangent_10","type":{"kind":"f32"}},{"name":"tangent_11","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},__privateCapture6,__privateWireValue9,__privateWireWrite6,__compiledOwnedValue6,6,6,__reduceValue6,false,false);}
const __compiledEntries=new Map([["energy",{index:0,params:[__compiledCodec0,__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["derivatives",{index:1,params:[__compiledCodec0,__compiledCodec1],result:__compiledCodec0,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["step",{index:2,params:[__compiledCodec0,__compiledCodec1,__compiledCodec1],result:__compiledCodec0,arguments:__privateWireValue4,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["forecast",{index:3,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec2,arguments:__privateWireValue6,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["__ink_differential_3",{index:4,params:[__compiledCodec3,__compiledCodec4],result:__compiledCodec4,arguments:__privateWireValue10,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["__ink_differential_1",{index:5,params:[__compiledCodec0,__compiledCodec1],result:__compiledCodec0,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}]]);

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
const __intoOutput3=__representation(metadata.functions[3].result.element,true);
const __intoImplementations=[null,null,null,__into3,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

function __preparedPart(mask,path){
 for(const field of path){
  if(mask===true)return true;
  if(!mask || typeof mask!=="object")return false;
  mask=Object.hasOwn(mask.fields,field)?mask.fields[field]:false;
 }
 return mask;
}
function __preparedStable(mask,path){const part=__preparedPart(mask,path);return part===true || (!!part && part.all===true);}
function __prepareFn1(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[]))))return __fn1;const v1347=depth<15&&__preparedFactories.has(5)&&((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[])));
let v1345;
return function(v1343,v1344){v1344=__nfValue(v1344);
let v1348;if(v1347){if(!v1345){const v1346=__preparedFactories.get(5);v1345=v1346([fixed[0],fixed[1]],depth+1);}v1348=v1345(v1343,v1344);}else{v1348=__fn5(v1343,v1344);}
return v1348;};}
function __prepareFn2(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[]))))return __fn2;const v1355=__preparedStable(fixed[0],[])&&__preparedStable(fixed[1],[]);
let v1354=false,v1353;
const v1358=depth<15&&__preparedFactories.has(1)&&((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[])));
let v1356;
return function(v1349,v1350,v1351){v1350=__nfValue(v1350);
v1351=__nfValue(v1351);
let v1352;if(v1355&&v1354){v1352=v1353;}else{
let v1359;if(v1358){if(!v1356){const v1357=__preparedFactories.get(1);v1356=v1357([fixed[0],fixed[1]],depth+1);}v1359=v1356(v1349,v1350);}else{v1359=__fn1(v1349,v1350);}
v1352=v1359;if(v1355){v1353=v1352;v1354=true;}}
const v1360=v1349["p"];
const v1361=__nfValue(v1360["a"]);
const v1362=v1352;
const v1363=v1362["p"];
const v1364=__nfValue(v1363["a"]);
const v1365=Math.fround(__nfNumber(v1351) * __nfNumber(v1364));
const v1366=Math.fround(__nfNumber(v1361) - v1365);
const v1367=v1349["p"];
const v1368=__nfValue(v1367["b"]);
const v1369=v1352;
const v1370=v1369["p"];
const v1371=__nfValue(v1370["b"]);
const v1372=Math.fround(__nfNumber(v1351) * __nfNumber(v1371));
const v1373=Math.fround(__nfNumber(v1368) - v1372);
const v1375=v1349["q"];
const v1376=__nfValue(v1375["a"]);
const v1377=v1352;
const v1378=v1377["q"];
const v1379=__nfValue(v1378["a"]);
const v1380=Math.fround(__nfNumber(v1351) * __nfNumber(v1379));
const v1381=Math.fround(__nfNumber(v1376) - v1380);
const v1382=v1349["q"];
const v1383=__nfValue(v1382["b"]);
const v1384=v1352;
const v1385=v1384["q"];
const v1386=__nfValue(v1385["b"]);
const v1387=Math.fround(__nfNumber(v1351) * __nfNumber(v1386));
const v1388=Math.fround(__nfNumber(v1383) - v1387);
const v1390=v1349["r"];
const v1391=__nfValue(v1390["a"]);
const v1392=v1352;
const v1393=v1392["r"];
const v1394=__nfValue(v1393["a"]);
const v1395=Math.fround(__nfNumber(v1351) * __nfNumber(v1394));
const v1396=Math.fround(__nfNumber(v1391) - v1395);
const v1397=v1349["r"];
const v1398=__nfValue(v1397["b"]);
const v1399=v1352;
const v1400=v1399["r"];
const v1401=__nfValue(v1400["b"]);
const v1402=Math.fround(__nfNumber(v1351) * __nfNumber(v1401));
const v1403=Math.fround(__nfNumber(v1398) - v1402);
const v1405=v1349["s"];
const v1406=__nfValue(v1405["a"]);
const v1407=v1352;
const v1408=v1407["s"];
const v1409=__nfValue(v1408["a"]);
const v1410=Math.fround(__nfNumber(v1351) * __nfNumber(v1409));
const v1411=Math.fround(__nfNumber(v1406) - v1410);
const v1412=v1349["s"];
const v1413=__nfValue(v1412["b"]);
const v1414=v1352;
const v1415=v1414["s"];
const v1416=__nfValue(v1415["b"]);
const v1417=Math.fround(__nfNumber(v1351) * __nfNumber(v1416));
const v1418=Math.fround(__nfNumber(v1413) - v1417);
const v1420=v1349["t"];
const v1421=__nfValue(v1420["a"]);
const v1422=v1352;
const v1423=v1422["t"];
const v1424=__nfValue(v1423["a"]);
const v1425=Math.fround(__nfNumber(v1351) * __nfNumber(v1424));
const v1426=Math.fround(__nfNumber(v1421) - v1425);
const v1427=v1349["t"];
const v1428=__nfValue(v1427["b"]);
const v1429=v1352;
const v1430=v1429["t"];
const v1431=__nfValue(v1430["b"]);
const v1432=Math.fround(__nfNumber(v1351) * __nfNumber(v1431));
const v1433=Math.fround(__nfNumber(v1428) - v1432);
const v1435=v1349["u"];
const v1436=__nfValue(v1435["a"]);
const v1437=v1352;
const v1438=v1437["u"];
const v1439=__nfValue(v1438["a"]);
const v1440=Math.fround(__nfNumber(v1351) * __nfNumber(v1439));
const v1441=Math.fround(__nfNumber(v1436) - v1440);
const v1442=v1349["u"];
const v1443=__nfValue(v1442["b"]);
const v1444=v1352;
const v1445=v1444["u"];
const v1446=__nfValue(v1445["b"]);
const v1447=Math.fround(__nfNumber(v1351) * __nfNumber(v1446));
const v1448=Math.fround(__nfNumber(v1443) - v1447);
return ({["p"]:({["a"]:v1366,["b"]:v1373}),["q"]:({["a"]:v1381,["b"]:v1388}),["r"]:({["a"]:v1396,["b"]:v1403}),["s"]:({["a"]:v1411,["b"]:v1418}),["t"]:({["a"]:v1426,["b"]:v1433}),["u"]:({["a"]:v1441,["b"]:v1448})});};}
function __prepareFn5(fixed,depth=0){if(depth>=16||!((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[]))))return __fn5;const v2504=__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[]);
let v2503=false,v2502;
const v2692=__preparedPart(fixed[0],["p","a"]);
const v2693={all:__preparedStable(fixed[0],["p","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2692}};
const v2694=__preparedPart(fixed[0],["p","b"]);
const v2695={all:__preparedStable(fixed[0],["p","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2694}};
const v2696={all:__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"]),fields:{["a"]:v2693,["b"]:v2695}};
const v2697=__preparedPart(fixed[0],["q","a"]);
const v2698={all:__preparedStable(fixed[0],["q","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2697}};
const v2699=__preparedPart(fixed[0],["q","b"]);
const v2700={all:__preparedStable(fixed[0],["q","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2699}};
const v2701={all:__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"]),fields:{["a"]:v2698,["b"]:v2700}};
const v2702=__preparedPart(fixed[0],["r","a"]);
const v2703={all:__preparedStable(fixed[0],["r","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2702}};
const v2704=__preparedPart(fixed[0],["r","b"]);
const v2705={all:__preparedStable(fixed[0],["r","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2704}};
const v2706={all:__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"]),fields:{["a"]:v2703,["b"]:v2705}};
const v2707=__preparedPart(fixed[0],["s","a"]);
const v2708={all:__preparedStable(fixed[0],["s","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2707}};
const v2709=__preparedPart(fixed[0],["s","b"]);
const v2710={all:__preparedStable(fixed[0],["s","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2709}};
const v2711={all:__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"]),fields:{["a"]:v2708,["b"]:v2710}};
const v2712=__preparedPart(fixed[0],["t","a"]);
const v2713={all:__preparedStable(fixed[0],["t","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2712}};
const v2714=__preparedPart(fixed[0],["t","b"]);
const v2715={all:__preparedStable(fixed[0],["t","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2714}};
const v2716={all:__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"]),fields:{["a"]:v2713,["b"]:v2715}};
const v2717=__preparedPart(fixed[0],["u","a"]);
const v2718={all:__preparedStable(fixed[0],["u","a"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2717}};
const v2719=__preparedPart(fixed[0],["u","b"]);
const v2720={all:__preparedStable(fixed[0],["u","b"]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:v2719}};
const v2721={all:__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"]),fields:{["a"]:v2718,["b"]:v2720}};
const v2722={all:__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"]),fields:{["p"]:v2696,["q"]:v2701,["r"]:v2706,["s"]:v2711,["t"]:v2716,["u"]:v2721}};
const v2736={all:__preparedStable(fixed[1],[]),fields:{["tangent_0"]:true,["tangent_1"]:true,["tangent_10"]:true,["tangent_11"]:true,["tangent_2"]:true,["tangent_3"]:true,["tangent_4"]:true,["tangent_5"]:true,["tangent_6"]:true,["tangent_7"]:true,["tangent_8"]:true,["tangent_9"]:true,["value"]:fixed[1]}};
const v2739=depth<15&&__preparedFactories.has(4)&&((__preparedStable(fixed[0],["p","a"])&&__preparedStable(fixed[0],["p","b"])&&__preparedStable(fixed[0],["q","a"])&&__preparedStable(fixed[0],["q","b"])&&__preparedStable(fixed[0],["r","a"])&&__preparedStable(fixed[0],["r","b"])&&__preparedStable(fixed[0],["s","a"])&&__preparedStable(fixed[0],["s","b"])&&__preparedStable(fixed[0],["t","a"])&&__preparedStable(fixed[0],["t","b"])&&__preparedStable(fixed[0],["u","a"])&&__preparedStable(fixed[0],["u","b"])&&__preparedStable(fixed[1],[])));
let v2737;
return function(v2499,v2500){v2500=__nfValue(v2500);
let v2501;if(v2504&&v2503){v2501=v2502;}else{
const v2505=v2499["p"];
const v2506=__nfValue(v2505["a"]);
const v2507=1.0;
const v2508=0.0;
const v2509=0.0;
const v2510=0.0;
const v2511=0.0;
const v2512=0.0;
const v2513=0.0;
const v2514=0.0;
const v2515=0.0;
const v2516=0.0;
const v2517=0.0;
const v2518=0.0;
const v2520=v2499["p"];
const v2521=__nfValue(v2520["b"]);
const v2522=0.0;
const v2523=1.0;
const v2524=0.0;
const v2525=0.0;
const v2526=0.0;
const v2527=0.0;
const v2528=0.0;
const v2529=0.0;
const v2530=0.0;
const v2531=0.0;
const v2532=0.0;
const v2533=0.0;
const v2536=v2499["q"];
const v2537=__nfValue(v2536["a"]);
const v2538=0.0;
const v2539=0.0;
const v2540=1.0;
const v2541=0.0;
const v2542=0.0;
const v2543=0.0;
const v2544=0.0;
const v2545=0.0;
const v2546=0.0;
const v2547=0.0;
const v2548=0.0;
const v2549=0.0;
const v2551=v2499["q"];
const v2552=__nfValue(v2551["b"]);
const v2553=0.0;
const v2554=0.0;
const v2555=0.0;
const v2556=1.0;
const v2557=0.0;
const v2558=0.0;
const v2559=0.0;
const v2560=0.0;
const v2561=0.0;
const v2562=0.0;
const v2563=0.0;
const v2564=0.0;
const v2567=v2499["r"];
const v2568=__nfValue(v2567["a"]);
const v2569=0.0;
const v2570=0.0;
const v2571=0.0;
const v2572=0.0;
const v2573=1.0;
const v2574=0.0;
const v2575=0.0;
const v2576=0.0;
const v2577=0.0;
const v2578=0.0;
const v2579=0.0;
const v2580=0.0;
const v2582=v2499["r"];
const v2583=__nfValue(v2582["b"]);
const v2584=0.0;
const v2585=0.0;
const v2586=0.0;
const v2587=0.0;
const v2588=0.0;
const v2589=1.0;
const v2590=0.0;
const v2591=0.0;
const v2592=0.0;
const v2593=0.0;
const v2594=0.0;
const v2595=0.0;
const v2598=v2499["s"];
const v2599=__nfValue(v2598["a"]);
const v2600=0.0;
const v2601=0.0;
const v2602=0.0;
const v2603=0.0;
const v2604=0.0;
const v2605=0.0;
const v2606=1.0;
const v2607=0.0;
const v2608=0.0;
const v2609=0.0;
const v2610=0.0;
const v2611=0.0;
const v2613=v2499["s"];
const v2614=__nfValue(v2613["b"]);
const v2615=0.0;
const v2616=0.0;
const v2617=0.0;
const v2618=0.0;
const v2619=0.0;
const v2620=0.0;
const v2621=0.0;
const v2622=1.0;
const v2623=0.0;
const v2624=0.0;
const v2625=0.0;
const v2626=0.0;
const v2629=v2499["t"];
const v2630=__nfValue(v2629["a"]);
const v2631=0.0;
const v2632=0.0;
const v2633=0.0;
const v2634=0.0;
const v2635=0.0;
const v2636=0.0;
const v2637=0.0;
const v2638=0.0;
const v2639=1.0;
const v2640=0.0;
const v2641=0.0;
const v2642=0.0;
const v2644=v2499["t"];
const v2645=__nfValue(v2644["b"]);
const v2646=0.0;
const v2647=0.0;
const v2648=0.0;
const v2649=0.0;
const v2650=0.0;
const v2651=0.0;
const v2652=0.0;
const v2653=0.0;
const v2654=0.0;
const v2655=1.0;
const v2656=0.0;
const v2657=0.0;
const v2660=v2499["u"];
const v2661=__nfValue(v2660["a"]);
const v2662=0.0;
const v2663=0.0;
const v2664=0.0;
const v2665=0.0;
const v2666=0.0;
const v2667=0.0;
const v2668=0.0;
const v2669=0.0;
const v2670=0.0;
const v2671=0.0;
const v2672=1.0;
const v2673=0.0;
const v2675=v2499["u"];
const v2676=__nfValue(v2675["b"]);
const v2677=0.0;
const v2678=0.0;
const v2679=0.0;
const v2680=0.0;
const v2681=0.0;
const v2682=0.0;
const v2683=0.0;
const v2684=0.0;
const v2685=0.0;
const v2686=0.0;
const v2687=0.0;
const v2688=1.0;
const v2691=({["p"]:({["a"]:({["value"]:v2506,["tangent_0"]:v2507,["tangent_1"]:v2508,["tangent_2"]:v2509,["tangent_3"]:v2510,["tangent_4"]:v2511,["tangent_5"]:v2512,["tangent_6"]:v2513,["tangent_7"]:v2514,["tangent_8"]:v2515,["tangent_9"]:v2516,["tangent_10"]:v2517,["tangent_11"]:v2518}),["b"]:({["value"]:v2521,["tangent_0"]:v2522,["tangent_1"]:v2523,["tangent_2"]:v2524,["tangent_3"]:v2525,["tangent_4"]:v2526,["tangent_5"]:v2527,["tangent_6"]:v2528,["tangent_7"]:v2529,["tangent_8"]:v2530,["tangent_9"]:v2531,["tangent_10"]:v2532,["tangent_11"]:v2533})}),["q"]:({["a"]:({["value"]:v2537,["tangent_0"]:v2538,["tangent_1"]:v2539,["tangent_2"]:v2540,["tangent_3"]:v2541,["tangent_4"]:v2542,["tangent_5"]:v2543,["tangent_6"]:v2544,["tangent_7"]:v2545,["tangent_8"]:v2546,["tangent_9"]:v2547,["tangent_10"]:v2548,["tangent_11"]:v2549}),["b"]:({["value"]:v2552,["tangent_0"]:v2553,["tangent_1"]:v2554,["tangent_2"]:v2555,["tangent_3"]:v2556,["tangent_4"]:v2557,["tangent_5"]:v2558,["tangent_6"]:v2559,["tangent_7"]:v2560,["tangent_8"]:v2561,["tangent_9"]:v2562,["tangent_10"]:v2563,["tangent_11"]:v2564})}),["r"]:({["a"]:({["value"]:v2568,["tangent_0"]:v2569,["tangent_1"]:v2570,["tangent_2"]:v2571,["tangent_3"]:v2572,["tangent_4"]:v2573,["tangent_5"]:v2574,["tangent_6"]:v2575,["tangent_7"]:v2576,["tangent_8"]:v2577,["tangent_9"]:v2578,["tangent_10"]:v2579,["tangent_11"]:v2580}),["b"]:({["value"]:v2583,["tangent_0"]:v2584,["tangent_1"]:v2585,["tangent_2"]:v2586,["tangent_3"]:v2587,["tangent_4"]:v2588,["tangent_5"]:v2589,["tangent_6"]:v2590,["tangent_7"]:v2591,["tangent_8"]:v2592,["tangent_9"]:v2593,["tangent_10"]:v2594,["tangent_11"]:v2595})}),["s"]:({["a"]:({["value"]:v2599,["tangent_0"]:v2600,["tangent_1"]:v2601,["tangent_2"]:v2602,["tangent_3"]:v2603,["tangent_4"]:v2604,["tangent_5"]:v2605,["tangent_6"]:v2606,["tangent_7"]:v2607,["tangent_8"]:v2608,["tangent_9"]:v2609,["tangent_10"]:v2610,["tangent_11"]:v2611}),["b"]:({["value"]:v2614,["tangent_0"]:v2615,["tangent_1"]:v2616,["tangent_2"]:v2617,["tangent_3"]:v2618,["tangent_4"]:v2619,["tangent_5"]:v2620,["tangent_6"]:v2621,["tangent_7"]:v2622,["tangent_8"]:v2623,["tangent_9"]:v2624,["tangent_10"]:v2625,["tangent_11"]:v2626})}),["t"]:({["a"]:({["value"]:v2630,["tangent_0"]:v2631,["tangent_1"]:v2632,["tangent_2"]:v2633,["tangent_3"]:v2634,["tangent_4"]:v2635,["tangent_5"]:v2636,["tangent_6"]:v2637,["tangent_7"]:v2638,["tangent_8"]:v2639,["tangent_9"]:v2640,["tangent_10"]:v2641,["tangent_11"]:v2642}),["b"]:({["value"]:v2645,["tangent_0"]:v2646,["tangent_1"]:v2647,["tangent_2"]:v2648,["tangent_3"]:v2649,["tangent_4"]:v2650,["tangent_5"]:v2651,["tangent_6"]:v2652,["tangent_7"]:v2653,["tangent_8"]:v2654,["tangent_9"]:v2655,["tangent_10"]:v2656,["tangent_11"]:v2657})}),["u"]:({["a"]:({["value"]:v2661,["tangent_0"]:v2662,["tangent_1"]:v2663,["tangent_2"]:v2664,["tangent_3"]:v2665,["tangent_4"]:v2666,["tangent_5"]:v2667,["tangent_6"]:v2668,["tangent_7"]:v2669,["tangent_8"]:v2670,["tangent_9"]:v2671,["tangent_10"]:v2672,["tangent_11"]:v2673}),["b"]:({["value"]:v2676,["tangent_0"]:v2677,["tangent_1"]:v2678,["tangent_2"]:v2679,["tangent_3"]:v2680,["tangent_4"]:v2681,["tangent_5"]:v2682,["tangent_6"]:v2683,["tangent_7"]:v2684,["tangent_8"]:v2685,["tangent_9"]:v2686,["tangent_10"]:v2687,["tangent_11"]:v2688})})});
const v2723=0.0;
const v2724=0.0;
const v2725=0.0;
const v2726=0.0;
const v2727=0.0;
const v2728=0.0;
const v2729=0.0;
const v2730=0.0;
const v2731=0.0;
const v2732=0.0;
const v2733=0.0;
const v2734=0.0;
const v2735=({["value"]:v2500,["tangent_0"]:v2723,["tangent_1"]:v2724,["tangent_2"]:v2725,["tangent_3"]:v2726,["tangent_4"]:v2727,["tangent_5"]:v2728,["tangent_6"]:v2729,["tangent_7"]:v2730,["tangent_8"]:v2731,["tangent_9"]:v2732,["tangent_10"]:v2733,["tangent_11"]:v2734});
let v2740;if(v2739){if(!v2737){const v2738=__preparedFactories.get(4);v2737=v2738([v2722,v2736],depth+1);}v2740=v2737(v2691,v2735);}else{v2740=__fn4(v2691,v2735);}
v2501=v2740;if(v2504){v2502=v2501;v2503=true;}}
const v2741=v2501;
const v2742=__nfValue(v2741["tangent_0"]);
const v2743=v2501;
const v2744=__nfValue(v2743["tangent_1"]);
const v2746=v2501;
const v2747=__nfValue(v2746["tangent_2"]);
const v2748=v2501;
const v2749=__nfValue(v2748["tangent_3"]);
const v2751=v2501;
const v2752=__nfValue(v2751["tangent_4"]);
const v2753=v2501;
const v2754=__nfValue(v2753["tangent_5"]);
const v2756=v2501;
const v2757=__nfValue(v2756["tangent_6"]);
const v2758=v2501;
const v2759=__nfValue(v2758["tangent_7"]);
const v2761=v2501;
const v2762=__nfValue(v2761["tangent_8"]);
const v2763=v2501;
const v2764=__nfValue(v2763["tangent_9"]);
const v2766=v2501;
const v2767=__nfValue(v2766["tangent_10"]);
const v2768=v2501;
const v2769=__nfValue(v2768["tangent_11"]);
return ({["p"]:({["a"]:v2742,["b"]:v2744}),["q"]:({["a"]:v2747,["b"]:v2749}),["r"]:({["a"]:v2752,["b"]:v2754}),["s"]:({["a"]:v2757,["b"]:v2759}),["t"]:({["a"]:v2762,["b"]:v2764}),["u"]:({["a"]:v2767,["b"]:v2769})});};}
const __preparedFactories=new Map([[1,__prepareFn1],[2,__prepareFn2],[5,__prepareFn5]]);

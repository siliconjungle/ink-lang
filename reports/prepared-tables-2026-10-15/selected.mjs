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
const __u64 = n => BigInt.asUintN(64, n);
function __fn0(v0,v1){
const v2=v0;
const v3=v2.length;
const v4=0;
let v5;if(((v3) !== (v4))){
const v6=v1;
let v7=0;
for(let v8=0;v8<v6.length;v8++){
const v9=(v6[v8]>>>0);
const v10=v7;
const v11=v9;
v7=(((v10) + (v11)) >>> 0);
}
const v12=v7;
const v13=v0;
const v14=v13.length;
const v15=new Array(v14);
for(let v16=0;v16<v14;v16++){
const v17=(v13[v16]>>>0);
const v18=v12;
const v19=v17;
v15[v16]=(((v18) + (v19)) >>> 0);
}
v5=v15;}else{
const v20=v0;
const v21=v20.length;
const v22=new Array(v21);
for(let v23=0;v23<v21;v23++){
const v24=(v20[v23]>>>0);
const v25=v1;
let v26=0;
for(let v27=0;v27<v25.length;v27++){
const v28=(v25[v27]>>>0);
const v29=v26;
const v30=v28;
v26=(((v29) + (v30)) >>> 0);
}
const v31=v26;
const v32=v24;
v22[v23]=(((v31) + (v32)) >>> 0);
}
v5=v22;}
return v5;}
function __fn1(v33,v34){
const v35=v33;
const v36=v35.length;
const v37=0;
let v38;if(((v36) !== (v37))){
const v39=v34;
let v40=0;
for(let v41=0;v41<v39.length;v41++){
const v42=(v39[v41]>>>0);
const v43=v40;
const v44=v42;
v40=(((v43) + (v44)) >>> 0);
}
const v45=v40;
const v46=v33;
const v47=v46.length;
const v48=[];
for(let v49=0;v49<v47;v49++){
const v50=(v46[v49]>>>0);
const v51=v50;
const v52=v45;
if(((v51) > (v52))){v48.push(v50);}
}
v38=v48;}else{
const v53=v33;
const v54=v53.length;
const v55=[];
for(let v56=0;v56<v54;v56++){
const v57=(v53[v56]>>>0);
const v58=v57;
const v59=v34;
let v60=0;
for(let v61=0;v61<v59.length;v61++){
const v62=(v59[v61]>>>0);
const v63=v60;
const v64=v62;
v60=(((v63) + (v64)) >>> 0);
}
const v65=v60;
if(((v58) > (v65))){v55.push(v57);}
}
v38=v55;}
return v38;}
function __fn2(v66,v67,v68){
const v69=v66;
const v70=v69.length;
const v71=0;
let v72;if(((v70) !== (v71))){
const v73=v67;
let v74=0;
for(let v75=0;v75<v73.length;v75++){
const v76=(v73[v75]>>>0);
const v77=v74;
const v78=v76;
v74=(((v77) + (v78)) >>> 0);
}
const v79=v74;
const v80=v66;
let v81=v68;
for(let v82=0;v82<v80.length;v82++){
const v83=(v80[v82]>>>0);
const v84=v81;
const v85=v83;
const v86=v79;
const v87=(Math.imul(v85,v86) >>> 0);
v81=(((v84) + (v87)) >>> 0);
}
v72=v81;}else{
const v88=v66;
let v89=v68;
for(let v90=0;v90<v88.length;v90++){
const v91=(v88[v90]>>>0);
const v92=v89;
const v93=v91;
const v94=v67;
let v95=0;
for(let v96=0;v96<v94.length;v96++){
const v97=(v94[v96]>>>0);
const v98=v95;
const v99=v97;
v95=(((v98) + (v99)) >>> 0);
}
const v100=v95;
const v101=(Math.imul(v93,v100) >>> 0);
v89=(((v92) + (v101)) >>> 0);
}
v72=v89;}
return v72;}
function __fn3(v102,v103,v104){
const v105=v102;
const v106=v105.length;
const v107=0;
let v108;if(((v106) !== (v107))){
const v109=v103;
let v110=0;
for(let v111=0;v111<v109.length;v111++){
const v112=(v109[v111]>>>0);
const v113=v110;
const v114=v112;
v110=(((v113) + (v114)) >>> 0);
}
const v115=v110;
const v116=v102;
let v117=v104;
for(let v118=v116.length-1;v118>=0;v118--){
const v119=(v116[v118]>>>0);
const v120=v117;
const v121=v119;
const v122=v115;
const v123=(Math.imul(v121,v122) >>> 0);
v117=(((v120) - (v123)) >>> 0);
}
v108=v117;}else{
const v124=v102;
let v125=v104;
for(let v126=v124.length-1;v126>=0;v126--){
const v127=(v124[v126]>>>0);
const v128=v125;
const v129=v127;
const v130=v103;
let v131=0;
for(let v132=0;v132<v130.length;v132++){
const v133=(v130[v132]>>>0);
const v134=v131;
const v135=v133;
v131=(((v134) + (v135)) >>> 0);
}
const v136=v131;
const v137=(Math.imul(v129,v136) >>> 0);
v125=(((v128) - (v137)) >>> 0);
}
v108=v125;}
return v108;}
function __fn4(v138,v139,v140){
const v141=v138;
const v142=v141.length;
const v143=0;
let v144;if(((v142) !== (v143))){
const v145=v139;
let v146=0;
for(let v147=0;v147<v145.length;v147++){
const v148=(v145[v147]>>>0);
const v149=v146;
const v150=v139;
let v151=v140;
for(let v152=0;v152<v150.length;v152++){
const v153=(v150[v152]>>>0);
const v154=v151;
const v155=v153;
v151=(((v154) + (v155)) >>> 0);
}
const v156=v151;
const v157=(((v149) + (v156)) >>> 0);
const v158=v148;
v146=(((v157) + (v158)) >>> 0);
}
const v159=v146;
const v160=v138;
const v161=v160.length;
const v162=new Array(v161);
for(let v163=0;v163<v161;v163++){
const v164=(v160[v163]>>>0);
const v165=v159;
const v166=v164;
v162[v163]=(((v165) + (v166)) >>> 0);
}
v144=v162;}else{
const v167=v138;
const v168=v167.length;
const v169=new Array(v168);
for(let v170=0;v170<v168;v170++){
const v171=(v167[v170]>>>0);
const v172=v139;
let v173=0;
for(let v174=0;v174<v172.length;v174++){
const v175=(v172[v174]>>>0);
const v176=v173;
const v177=v139;
let v178=v140;
for(let v179=0;v179<v177.length;v179++){
const v180=(v177[v179]>>>0);
const v181=v178;
const v182=v180;
v178=(((v181) + (v182)) >>> 0);
}
const v183=v178;
const v184=(((v176) + (v183)) >>> 0);
const v185=v175;
v173=(((v184) + (v185)) >>> 0);
}
const v186=v173;
const v187=v171;
v169[v170]=(((v186) + (v187)) >>> 0);
}
v144=v169;}
return v144;}
function __fn5(v188,v189,v190){
const v191=v188;
const v192=v191.length;
const v193=0;
let v194;if(((v192) !== (v193))){
const v195=v189;
let v196=__nfValue(v190);
for(let v197=0;v197<v195.length;v197++){
const v198=v195[v197];
const v199=__nfValue(v196);
const v200=__nfValue(v198);
v196=Math.fround(__nfNumber(v199) + __nfNumber(v200));
}
const v201=v196;
const v202=v188;
const v203=v202.length;
const v204=new Array(v203);
for(let v205=0;v205<v203;v205++){
const v206=v202[v205];
const v207=__nfValue(v201);
const v208=__nfValue(v206);
v204[v205]=Math.fround(__nfNumber(v207) + __nfNumber(v208));
}
v194=v204;}else{
const v209=v188;
const v210=v209.length;
const v211=new Array(v210);
for(let v212=0;v212<v210;v212++){
const v213=v209[v212];
const v214=v189;
let v215=__nfValue(v190);
for(let v216=0;v216<v214.length;v216++){
const v217=v214[v216];
const v218=__nfValue(v215);
const v219=__nfValue(v217);
v215=Math.fround(__nfNumber(v218) + __nfNumber(v219));
}
const v220=v215;
const v221=__nfValue(v213);
v211[v212]=Math.fround(__nfNumber(v220) + __nfNumber(v221));
}
v194=v211;}
return v194;}
function __fn6(v222,v223){
const v224=v222;
const v225=v224.length;
const v226=0;
let v227;if(((v225) !== (v226))){
const v228=v223;
let v229=0n;
for(let v230=0;v230<v228.length;v230++){
const v231=v228[v230];
const v232=v229;
const v233=v231;
v229=__u64((v232) + (v233));
}
const v234=v229;
const v235=v222;
const v236=v235.length;
const v237=new Array(v236);
for(let v238=0;v238<v236;v238++){
const v239=v235[v238];
const v240=v234;
const v241=v239;
v237[v238]=__u64((v240) + (v241));
}
v227=v237;}else{
const v242=v222;
const v243=v242.length;
const v244=new Array(v243);
for(let v245=0;v245<v243;v245++){
const v246=v242[v245];
const v247=v223;
let v248=0n;
for(let v249=0;v249<v247.length;v249++){
const v250=v247[v249];
const v251=v248;
const v252=v250;
v248=__u64((v251) + (v252));
}
const v253=v248;
const v254=v246;
v244[v245]=__u64((v253) + (v254));
}
v227=v244;}
return v227;}
function __fn7(v255,v256){
const v257=v255;
const v258=v257.length;
const v259=0;
let v260;if(((v258) !== (v259))){
const v261=v256;
let v262=0;
for(let v263=0;v263<v261.length;v263++){
const v264=(v261[v263]|0);
const v265=v262;
const v266=v264;
v262=(((v265) + (v266)) | 0);
}
const v267=v262;
const v268=v255;
const v269=v268.length;
const v270=new Array(v269);
for(let v271=0;v271<v269;v271++){
const v272=(v268[v271]|0);
const v273=v267;
const v274=v272;
v270[v271]=(((v273) + (v274)) | 0);
}
v260=v270;}else{
const v275=v255;
const v276=v275.length;
const v277=new Array(v276);
for(let v278=0;v278<v276;v278++){
const v279=(v275[v278]|0);
const v280=v256;
let v281=0;
for(let v282=0;v282<v280.length;v282++){
const v283=(v280[v282]|0);
const v284=v281;
const v285=v283;
v281=(((v284) + (v285)) | 0);
}
const v286=v281;
const v287=v279;
v277[v278]=(((v286) + (v287)) | 0);
}
v260=v277;}
return v260;}
function __fn8(v288,v289){
const v290=v288;
const v291=v290.length;
const v292=0;
let v293;if(((v291) !== (v292))){
const v294=v289;
const v295=v294.length;
const v296=[];
for(let v297=0;v297<v295;v297++){
const v298=(v294[v297]>>>0);
const v299=v298;
const v300=1;
if(((v299) > (v300))){v296.push(v298);}
}
const v301=v296;
const v302=v301.length;
const v303=0;
const v304=((v302) > (v303));
const v305=v288;
const v306=v305.length;
const v307=new Array(v306);
for(let v308=0;v308<v306;v308++){
const v309=(v305[v308]>>>0);
const v310=v304;
const v311=v309;
const v312=0;
const v313=((v311) > (v312));
v307[v308]=(v310===v313);
}
v293=v307;}else{
const v314=v288;
const v315=v314.length;
const v316=new Array(v315);
for(let v317=0;v317<v315;v317++){
const v318=(v314[v317]>>>0);
const v319=v289;
const v320=v319.length;
const v321=[];
for(let v322=0;v322<v320;v322++){
const v323=(v319[v322]>>>0);
const v324=v323;
const v325=1;
if(((v324) > (v325))){v321.push(v323);}
}
const v326=v321;
const v327=v326.length;
const v328=0;
const v329=((v327) > (v328));
const v330=v318;
const v331=0;
const v332=((v330) > (v331));
v316[v317]=(v329===v332);
}
v293=v316;}
return v293;}
function __fn9(v333,v334){
const v335=v333;
const v336=v335.length;
const v337=new Array(v336);
for(let v338=0;v338<v336;v338++){
const v339=(v335[v338]>>>0);
const v340=v334;
const v341=v340.length;
const v342=0;
let v343;if(((v341) !== (v342))){
const v344=v333;
let v345=v339;
for(let v346=0;v346<v344.length;v346++){
const v347=(v344[v346]>>>0);
const v348=v345;
const v349=v347;
v345=(((v348) + (v349)) >>> 0);
}
const v350=v345;
const v351=v334;
let v352=0;
for(let v353=0;v353<v351.length;v353++){
const v354=(v351[v353]>>>0);
const v355=v352;
const v356=v350;
const v357=(((v355) + (v356)) >>> 0);
const v358=v354;
v352=(((v357) + (v358)) >>> 0);
}
v343=v352;}else{
const v359=v334;
let v360=0;
for(let v361=0;v361<v359.length;v361++){
const v362=(v359[v361]>>>0);
const v363=v360;
const v364=v333;
let v365=v339;
for(let v366=0;v366<v364.length;v366++){
const v367=(v364[v366]>>>0);
const v368=v365;
const v369=v367;
v365=(((v368) + (v369)) >>> 0);
}
const v370=v365;
const v371=(((v363) + (v370)) >>> 0);
const v372=v362;
v360=(((v371) + (v372)) >>> 0);
}
v343=v360;}
v337[v338]=v343;
}
return v337;}
function __fn10(v373,v374,v375){
const v376=v373;
const v377=v376.length;
const v378=0;
let v379;if(((v377) !== (v378))){
let v380;if(v375){
const v381=v374;
let v382=0;
for(let v383=0;v383<v381.length;v383++){
const v384=(v381[v383]>>>0);
const v385=v382;
const v386=v384;
v382=(((v385) + (v386)) >>> 0);
}
v380=v382;}else{
v380=0;}
const v387=v380;
const v388=v373;
const v389=v388.length;
const v390=new Array(v389);
for(let v391=0;v391<v389;v391++){
const v392=(v388[v391]>>>0);
const v393=v387;
const v394=v392;
v390[v391]=(((v393) + (v394)) >>> 0);
}
v379=v390;}else{
const v395=v373;
const v396=v395.length;
const v397=new Array(v396);
for(let v398=0;v398<v396;v398++){
const v399=(v395[v398]>>>0);
let v400;if(v375){
const v401=v374;
let v402=0;
for(let v403=0;v403<v401.length;v403++){
const v404=(v401[v403]>>>0);
const v405=v402;
const v406=v404;
v402=(((v405) + (v406)) >>> 0);
}
v400=v402;}else{
v400=0;}
const v407=v400;
const v408=v399;
v397[v398]=(((v407) + (v408)) >>> 0);
}
v379=v397;}
return v379;}
function __fn11(v409){
const v410=v409;
const v411=v410.length;
const v412=new Array(v411);
for(let v413=0;v413<v411;v413++){
const v414=(v410[v413]>>>0);
const v415=v409;
let v416=v414;
for(let v417=0;v417<v415.length;v417++){
const v418=(v415[v417]>>>0);
const v419=v416;
const v420=v414;
const v421=v418;
const v422=(Math.imul(v420,v421) >>> 0);
v416=(((v419) + (v422)) >>> 0);
}
v412[v413]=v416;
}
return v412;}
function __fn12(v423,v424){
const v425=v423;
const v426=v425.length;
const v427=new Array(v426);
for(let v428=0;v428<v426;v428++){
const v429=(v425[v428]>>>0);
const v430=v429;
const v431=0;
let v432;if(((v430) > (v431))){
const v433=v424;
let v434=0;
for(let v435=0;v435<v433.length;v435++){
const v436=(v433[v435]>>>0);
const v437=v434;
const v438=v436;
v434=(((v437) + (v438)) >>> 0);
}
v432=v434;}else{
v432=0;}
v427[v428]=v432;
}
return v427;}
function __fn13(v439,v440){
const v441=v439;
let v442=0;
for(let v443=0;v443<v441.length;v443++){
const v444=(v441[v443]>>>0);
const v445=v442;
const v446=5;
const v447=((v445) > (v446));
const v448=v442;
const v449=v444;
const v450=(((v448) + (v449)) >>> 0);
const v451=v440;
let v452=0;
for(let v453=0;v453<v451.length;v453++){
const v454=(v451[v453]>>>0);
const v455=v452;
const v456=v454;
v452=(((v455) + (v456)) >>> 0);
}
const v457=v452;
v442=(((v450) + (v457)) >>> 0);
if(v447)break;
}
return v442;}
function __fn14(v458,v459){
const v460=v458;
const v461=v460.length;
const v462=0;
let v463;if(((v461) !== (v462))){
const v464=v459;
const v465=v464.length;
const v466=new Array(v465);
for(let v467=0;v467<v465;v467++){
const v468=(v464[v467]>>>0);
const v469=v468;
const v470=3;
const v471=(Math.imul(v469,v470) >>> 0);
const v472=7;
const v473=(((v471) + (v472)) >>> 0);
const v474=5;
v466[v467]=(Math.imul(v473,v474) >>> 0);
}
const v475=v466;
const v476=v458;
const v477=v476.length;
const v478=new Array(v477);
for(let v479=0;v479<v477;v479++){
const v480=(v476[v479]>>>0);
const v481=v475;
const v482=v480;
let v483;if(v482<v481.length){v483=v481[v482];}else{
v483=999;}
v478[v479]=v483;
}
v463=v478;}else{
const v484=v458;
const v485=v484.length;
const v486=new Array(v485);
for(let v487=0;v487<v485;v487++){
const v488=(v484[v487]>>>0);
const v489=v459;
const v490=v489.length;
const v491=new Array(v490);
for(let v492=0;v492<v490;v492++){
const v493=(v489[v492]>>>0);
const v494=v493;
const v495=3;
const v496=(Math.imul(v494,v495) >>> 0);
const v497=7;
const v498=(((v496) + (v497)) >>> 0);
const v499=5;
v491[v492]=(Math.imul(v498,v499) >>> 0);
}
const v500=v491;
const v501=v488;
let v502;if(v501<v500.length){v502=v500[v501];}else{
v502=999;}
v486[v487]=v502;
}
v463=v486;}
return v463;}
function __fn15(v503,v504){
const v505=v503;
const v506=v505.length;
const v507=0;
let v508;if(((v506) !== (v507))){
const v509=v504;
const v510=v509.length;
const v511=new Array(v510);
for(let v512=0;v512<v510;v512++){
const v513=v509[v512];
const v514=__nfValue(v513);
const v515=__nfFromBits(1073741824);
const v516=Math.fround(__nfNumber(v514) * __nfNumber(v515));
const v517=__nfFromBits(1065353216);
const v518=Math.fround(__nfNumber(v516) + __nfNumber(v517));
const v519=__nfFromBits(1077936128);
v511[v512]=Math.fround(__nfNumber(v518) * __nfNumber(v519));
}
const v520=v511;
const v521=v503;
const v522=v521.length;
const v523=new Array(v522);
for(let v524=0;v524<v522;v524++){
const v525=(v521[v524]>>>0);
const v526=v520;
const v527=v525;
let v528;if(v527<v526.length){v528=v526[v527];}else{
v528=__nfFromBits(0);}
v523[v524]=__nfValue(v528);
}
v508=v523;}else{
const v529=v503;
const v530=v529.length;
const v531=new Array(v530);
for(let v532=0;v532<v530;v532++){
const v533=(v529[v532]>>>0);
const v534=v504;
const v535=v534.length;
const v536=new Array(v535);
for(let v537=0;v537<v535;v537++){
const v538=v534[v537];
const v539=__nfValue(v538);
const v540=__nfFromBits(1073741824);
const v541=Math.fround(__nfNumber(v539) * __nfNumber(v540));
const v542=__nfFromBits(1065353216);
const v543=Math.fround(__nfNumber(v541) + __nfNumber(v542));
const v544=__nfFromBits(1077936128);
v536[v537]=Math.fround(__nfNumber(v543) * __nfNumber(v544));
}
const v545=v536;
const v546=v533;
let v547;if(v546<v545.length){v547=v545[v546];}else{
v547=__nfFromBits(0);}
v531[v532]=__nfValue(v547);
}
v508=v531;}
return v508;}
function __fn16(v548,v549){
const v550=v548;
const v551=v550.length;
const v552=new Array(v551);
for(let v553=0;v553<v551;v553++){
const v554=(v550[v553]>>>0);
const v555=v549;
const v556=v555.length;
const v557=new Array(v556);
for(let v558=0;v558<v556;v558++){
const v559=(v555[v558]>>>0);
const v560=v559;
const v561=v554;
const v562=(((v560) + (v561)) >>> 0);
const v563=3;
const v564=(Math.imul(v562,v563) >>> 0);
const v565=7;
v557[v558]=(((v564) + (v565)) >>> 0);
}
const v566=v557;
const v567=v554;
let v568;if(v567<v566.length){v568=v566[v567];}else{
v568=999;}
v552[v553]=v568;
}
return v552;}
function __into0(v569,v570,v571){
const v572=v569;
const v573=v572.length;
const v574=0;
let v575;if(((v573) !== (v574))){
const v576=v570;
let v577=0;
for(let v578=0;v578<v576.length;v578++){
const v579=(v576[v578]>>>0);
const v580=v577;
const v581=v579;
v577=(((v580) + (v581)) >>> 0);
}
const v582=v577;
const v583=v569;
const v584=v583.length;
for(let v586=0;v586<v584;v586++){
const v587=(v583[v586]>>>0);
const v588=v582;
const v589=v587;
v571[v586]=(((v588) + (v589)) >>> 0);
}
v575=v584;}else{
const v590=v569;
const v591=v590.length;
for(let v593=0;v593<v591;v593++){
const v594=(v590[v593]>>>0);
const v595=v570;
let v596=0;
for(let v597=0;v597<v595.length;v597++){
const v598=(v595[v597]>>>0);
const v599=v596;
const v600=v598;
v596=(((v599) + (v600)) >>> 0);
}
const v601=v596;
const v602=v594;
v571[v593]=(((v601) + (v602)) >>> 0);
}
v575=v591;}
return v575;}
function __into1(v603,v604,v605){
const v606=v603;
const v607=v606.length;
const v608=0;
let v609;if(((v607) !== (v608))){
const v610=v604;
let v611=0;
for(let v612=0;v612<v610.length;v612++){
const v613=(v610[v612]>>>0);
const v614=v611;
const v615=v613;
v611=(((v614) + (v615)) >>> 0);
}
const v616=v611;
const v617=v603;
const v618=v617.length;
let v619=0;
for(let v620=0;v620<v618;v620++){
const v621=(v617[v620]>>>0);
const v622=v621;
const v623=v616;
if(((v622) > (v623))){
v605[v619++]=v621;
}
}
v609=v619;}else{
const v624=v603;
const v625=v624.length;
let v626=0;
for(let v627=0;v627<v625;v627++){
const v628=(v624[v627]>>>0);
const v629=v628;
const v630=v604;
let v631=0;
for(let v632=0;v632<v630.length;v632++){
const v633=(v630[v632]>>>0);
const v634=v631;
const v635=v633;
v631=(((v634) + (v635)) >>> 0);
}
const v636=v631;
if(((v629) > (v636))){
v605[v626++]=v628;
}
}
v609=v626;}
return v609;}
function __into4(v637,v638,v639,v640){
const v641=v637;
const v642=v641.length;
const v643=0;
let v644;if(((v642) !== (v643))){
const v645=v638;
let v646=0;
for(let v647=0;v647<v645.length;v647++){
const v648=(v645[v647]>>>0);
const v649=v646;
const v650=v638;
let v651=v639;
for(let v652=0;v652<v650.length;v652++){
const v653=(v650[v652]>>>0);
const v654=v651;
const v655=v653;
v651=(((v654) + (v655)) >>> 0);
}
const v656=v651;
const v657=(((v649) + (v656)) >>> 0);
const v658=v648;
v646=(((v657) + (v658)) >>> 0);
}
const v659=v646;
const v660=v637;
const v661=v660.length;
for(let v663=0;v663<v661;v663++){
const v664=(v660[v663]>>>0);
const v665=v659;
const v666=v664;
v640[v663]=(((v665) + (v666)) >>> 0);
}
v644=v661;}else{
const v667=v637;
const v668=v667.length;
for(let v670=0;v670<v668;v670++){
const v671=(v667[v670]>>>0);
const v672=v638;
let v673=0;
for(let v674=0;v674<v672.length;v674++){
const v675=(v672[v674]>>>0);
const v676=v673;
const v677=v638;
let v678=v639;
for(let v679=0;v679<v677.length;v679++){
const v680=(v677[v679]>>>0);
const v681=v678;
const v682=v680;
v678=(((v681) + (v682)) >>> 0);
}
const v683=v678;
const v684=(((v676) + (v683)) >>> 0);
const v685=v675;
v673=(((v684) + (v685)) >>> 0);
}
const v686=v673;
const v687=v671;
v640[v670]=(((v686) + (v687)) >>> 0);
}
v644=v668;}
return v644;}
function __into5(v688,v689,v690,v691){
const v692=v688;
const v693=v692.length;
const v694=0;
let v695;if(((v693) !== (v694))){
const v696=v689;
let v697=__nfValue(v690);
for(let v698=0;v698<v696.length;v698++){
const v699=v696[v698];
const v700=__nfValue(v697);
const v701=__nfValue(v699);
v697=Math.fround(__nfNumber(v700) + __nfNumber(v701));
}
const v702=v697;
const v703=v688;
const v704=v703.length;
for(let v706=0;v706<v704;v706++){
const v707=v703[v706];
const v708=__nfValue(v702);
const v709=__nfValue(v707);
v691[v706]=__intoOutput5(Math.fround(__nfNumber(v708) + __nfNumber(v709)));
}
v695=v704;}else{
const v710=v688;
const v711=v710.length;
for(let v713=0;v713<v711;v713++){
const v714=v710[v713];
const v715=v689;
let v716=__nfValue(v690);
for(let v717=0;v717<v715.length;v717++){
const v718=v715[v717];
const v719=__nfValue(v716);
const v720=__nfValue(v718);
v716=Math.fround(__nfNumber(v719) + __nfNumber(v720));
}
const v721=v716;
const v722=__nfValue(v714);
v691[v713]=__intoOutput5(Math.fround(__nfNumber(v721) + __nfNumber(v722)));
}
v695=v711;}
return v695;}
function __into6(v723,v724,v725){
const v726=v723;
const v727=v726.length;
const v728=0;
let v729;if(((v727) !== (v728))){
const v730=v724;
let v731=0n;
for(let v732=0;v732<v730.length;v732++){
const v733=v730[v732];
const v734=v731;
const v735=v733;
v731=__u64((v734) + (v735));
}
const v736=v731;
const v737=v723;
const v738=v737.length;
for(let v740=0;v740<v738;v740++){
const v741=v737[v740];
const v742=v736;
const v743=v741;
v725[v740]=__u64((v742) + (v743));
}
v729=v738;}else{
const v744=v723;
const v745=v744.length;
for(let v747=0;v747<v745;v747++){
const v748=v744[v747];
const v749=v724;
let v750=0n;
for(let v751=0;v751<v749.length;v751++){
const v752=v749[v751];
const v753=v750;
const v754=v752;
v750=__u64((v753) + (v754));
}
const v755=v750;
const v756=v748;
v725[v747]=__u64((v755) + (v756));
}
v729=v745;}
return v729;}
function __into7(v757,v758,v759){
const v760=v757;
const v761=v760.length;
const v762=0;
let v763;if(((v761) !== (v762))){
const v764=v758;
let v765=0;
for(let v766=0;v766<v764.length;v766++){
const v767=(v764[v766]|0);
const v768=v765;
const v769=v767;
v765=(((v768) + (v769)) | 0);
}
const v770=v765;
const v771=v757;
const v772=v771.length;
for(let v774=0;v774<v772;v774++){
const v775=(v771[v774]|0);
const v776=v770;
const v777=v775;
v759[v774]=(((v776) + (v777)) | 0);
}
v763=v772;}else{
const v778=v757;
const v779=v778.length;
for(let v781=0;v781<v779;v781++){
const v782=(v778[v781]|0);
const v783=v758;
let v784=0;
for(let v785=0;v785<v783.length;v785++){
const v786=(v783[v785]|0);
const v787=v784;
const v788=v786;
v784=(((v787) + (v788)) | 0);
}
const v789=v784;
const v790=v782;
v759[v781]=(((v789) + (v790)) | 0);
}
v763=v779;}
return v763;}
function __into8(v791,v792,v793){
const v794=v791;
const v795=v794.length;
const v796=0;
let v797;if(((v795) !== (v796))){
const v798=v792;
const v799=v798.length;
const v800=[];
for(let v801=0;v801<v799;v801++){
const v802=(v798[v801]>>>0);
const v803=v802;
const v804=1;
if(((v803) > (v804))){v800.push(v802);}
}
const v805=v800;
const v806=v805.length;
const v807=0;
const v808=((v806) > (v807));
const v809=v791;
const v810=v809.length;
for(let v812=0;v812<v810;v812++){
const v813=(v809[v812]>>>0);
const v814=v808;
const v815=v813;
const v816=0;
const v817=((v815) > (v816));
v793[v812]=(v814===v817);
}
v797=v810;}else{
const v818=v791;
const v819=v818.length;
for(let v821=0;v821<v819;v821++){
const v822=(v818[v821]>>>0);
const v823=v792;
const v824=v823.length;
const v825=[];
for(let v826=0;v826<v824;v826++){
const v827=(v823[v826]>>>0);
const v828=v827;
const v829=1;
if(((v828) > (v829))){v825.push(v827);}
}
const v830=v825;
const v831=v830.length;
const v832=0;
const v833=((v831) > (v832));
const v834=v822;
const v835=0;
const v836=((v834) > (v835));
v793[v821]=(v833===v836);
}
v797=v819;}
return v797;}
function __into9(v837,v838,v839){
const v840=v837;
const v841=v840.length;
for(let v843=0;v843<v841;v843++){
const v844=(v840[v843]>>>0);
const v845=v838;
const v846=v845.length;
const v847=0;
let v848;if(((v846) !== (v847))){
const v849=v837;
let v850=v844;
for(let v851=0;v851<v849.length;v851++){
const v852=(v849[v851]>>>0);
const v853=v850;
const v854=v852;
v850=(((v853) + (v854)) >>> 0);
}
const v855=v850;
const v856=v838;
let v857=0;
for(let v858=0;v858<v856.length;v858++){
const v859=(v856[v858]>>>0);
const v860=v857;
const v861=v855;
const v862=(((v860) + (v861)) >>> 0);
const v863=v859;
v857=(((v862) + (v863)) >>> 0);
}
v848=v857;}else{
const v864=v838;
let v865=0;
for(let v866=0;v866<v864.length;v866++){
const v867=(v864[v866]>>>0);
const v868=v865;
const v869=v837;
let v870=v844;
for(let v871=0;v871<v869.length;v871++){
const v872=(v869[v871]>>>0);
const v873=v870;
const v874=v872;
v870=(((v873) + (v874)) >>> 0);
}
const v875=v870;
const v876=(((v868) + (v875)) >>> 0);
const v877=v867;
v865=(((v876) + (v877)) >>> 0);
}
v848=v865;}
v839[v843]=v848;
}
return v841;}
function __into10(v878,v879,v880,v881){
const v882=v878;
const v883=v882.length;
const v884=0;
let v885;if(((v883) !== (v884))){
let v886;if(v880){
const v887=v879;
let v888=0;
for(let v889=0;v889<v887.length;v889++){
const v890=(v887[v889]>>>0);
const v891=v888;
const v892=v890;
v888=(((v891) + (v892)) >>> 0);
}
v886=v888;}else{
v886=0;}
const v893=v886;
const v894=v878;
const v895=v894.length;
for(let v897=0;v897<v895;v897++){
const v898=(v894[v897]>>>0);
const v899=v893;
const v900=v898;
v881[v897]=(((v899) + (v900)) >>> 0);
}
v885=v895;}else{
const v901=v878;
const v902=v901.length;
for(let v904=0;v904<v902;v904++){
const v905=(v901[v904]>>>0);
let v906;if(v880){
const v907=v879;
let v908=0;
for(let v909=0;v909<v907.length;v909++){
const v910=(v907[v909]>>>0);
const v911=v908;
const v912=v910;
v908=(((v911) + (v912)) >>> 0);
}
v906=v908;}else{
v906=0;}
const v913=v906;
const v914=v905;
v881[v904]=(((v913) + (v914)) >>> 0);
}
v885=v902;}
return v885;}
function __into11(v915,v916){
const v917=v915;
const v918=v917.length;
for(let v920=0;v920<v918;v920++){
const v921=(v917[v920]>>>0);
const v922=v915;
let v923=v921;
for(let v924=0;v924<v922.length;v924++){
const v925=(v922[v924]>>>0);
const v926=v923;
const v927=v921;
const v928=v925;
const v929=(Math.imul(v927,v928) >>> 0);
v923=(((v926) + (v929)) >>> 0);
}
v916[v920]=v923;
}
return v918;}
function __into12(v930,v931,v932){
const v933=v930;
const v934=v933.length;
for(let v936=0;v936<v934;v936++){
const v937=(v933[v936]>>>0);
const v938=v937;
const v939=0;
let v940;if(((v938) > (v939))){
const v941=v931;
let v942=0;
for(let v943=0;v943<v941.length;v943++){
const v944=(v941[v943]>>>0);
const v945=v942;
const v946=v944;
v942=(((v945) + (v946)) >>> 0);
}
v940=v942;}else{
v940=0;}
v932[v936]=v940;
}
return v934;}
function __into14(v947,v948,v949){
const v950=v947;
const v951=v950.length;
const v952=0;
let v953;if(((v951) !== (v952))){
const v954=v948;
const v955=v954.length;
const v956=new Array(v955);
for(let v957=0;v957<v955;v957++){
const v958=(v954[v957]>>>0);
const v959=v958;
const v960=3;
const v961=(Math.imul(v959,v960) >>> 0);
const v962=7;
const v963=(((v961) + (v962)) >>> 0);
const v964=5;
v956[v957]=(Math.imul(v963,v964) >>> 0);
}
const v965=v956;
const v966=v947;
const v967=v966.length;
for(let v969=0;v969<v967;v969++){
const v970=(v966[v969]>>>0);
const v971=v965;
const v972=v970;
let v973;if(v972<v971.length){v973=v971[v972];}else{
v973=999;}
v949[v969]=v973;
}
v953=v967;}else{
const v974=v947;
const v975=v974.length;
for(let v977=0;v977<v975;v977++){
const v978=(v974[v977]>>>0);
const v979=v948;
const v980=v979.length;
const v981=new Array(v980);
for(let v982=0;v982<v980;v982++){
const v983=(v979[v982]>>>0);
const v984=v983;
const v985=3;
const v986=(Math.imul(v984,v985) >>> 0);
const v987=7;
const v988=(((v986) + (v987)) >>> 0);
const v989=5;
v981[v982]=(Math.imul(v988,v989) >>> 0);
}
const v990=v981;
const v991=v978;
let v992;if(v991<v990.length){v992=v990[v991];}else{
v992=999;}
v949[v977]=v992;
}
v953=v975;}
return v953;}
function __into15(v993,v994,v995){
const v996=v993;
const v997=v996.length;
const v998=0;
let v999;if(((v997) !== (v998))){
const v1000=v994;
const v1001=v1000.length;
const v1002=new Array(v1001);
for(let v1003=0;v1003<v1001;v1003++){
const v1004=v1000[v1003];
const v1005=__nfValue(v1004);
const v1006=__nfFromBits(1073741824);
const v1007=Math.fround(__nfNumber(v1005) * __nfNumber(v1006));
const v1008=__nfFromBits(1065353216);
const v1009=Math.fround(__nfNumber(v1007) + __nfNumber(v1008));
const v1010=__nfFromBits(1077936128);
v1002[v1003]=Math.fround(__nfNumber(v1009) * __nfNumber(v1010));
}
const v1011=v1002;
const v1012=v993;
const v1013=v1012.length;
for(let v1015=0;v1015<v1013;v1015++){
const v1016=(v1012[v1015]>>>0);
const v1017=v1011;
const v1018=v1016;
let v1019;if(v1018<v1017.length){v1019=v1017[v1018];}else{
v1019=__nfFromBits(0);}
v995[v1015]=__intoOutput15(__nfValue(v1019));
}
v999=v1013;}else{
const v1020=v993;
const v1021=v1020.length;
for(let v1023=0;v1023<v1021;v1023++){
const v1024=(v1020[v1023]>>>0);
const v1025=v994;
const v1026=v1025.length;
const v1027=new Array(v1026);
for(let v1028=0;v1028<v1026;v1028++){
const v1029=v1025[v1028];
const v1030=__nfValue(v1029);
const v1031=__nfFromBits(1073741824);
const v1032=Math.fround(__nfNumber(v1030) * __nfNumber(v1031));
const v1033=__nfFromBits(1065353216);
const v1034=Math.fround(__nfNumber(v1032) + __nfNumber(v1033));
const v1035=__nfFromBits(1077936128);
v1027[v1028]=Math.fround(__nfNumber(v1034) * __nfNumber(v1035));
}
const v1036=v1027;
const v1037=v1024;
let v1038;if(v1037<v1036.length){v1038=v1036[v1037];}else{
v1038=__nfFromBits(0);}
v995[v1023]=__intoOutput15(__nfValue(v1038));
}
v999=v1021;}
return v999;}
function __into16(v1039,v1040,v1041){
const v1042=v1039;
const v1043=v1042.length;
for(let v1045=0;v1045<v1043;v1045++){
const v1046=(v1042[v1045]>>>0);
const v1047=v1040;
const v1048=v1047.length;
const v1049=new Array(v1048);
for(let v1050=0;v1050<v1048;v1050++){
const v1051=(v1047[v1050]>>>0);
const v1052=v1051;
const v1053=v1046;
const v1054=(((v1052) + (v1053)) >>> 0);
const v1055=3;
const v1056=(Math.imul(v1054,v1055) >>> 0);
const v1057=7;
v1049[v1050]=(((v1056) + (v1057)) >>> 0);
}
const v1058=v1049;
const v1059=v1046;
let v1060;if(v1059<v1058.length){v1060=v1058[v1059];}else{
v1060=999;}
v1041[v1045]=v1060;
}
return v1043;}
function __prepareFn0(fixed){const v1071=fixed[1];let v1070=false,v1069;
return function(v1061,v1062){const v1063=v1061;
const v1064=v1063.length;
const v1065=0;
const v1066=((v1064) !== (v1065));
let v1067;if(v1066){
let v1068;if(v1071&&v1070){v1068=v1069;}else{
const v1072=v1062;
let v1073=0;
for(let v1074=0;v1074<v1072.length;v1074++){
const v1075=(v1072[v1074]>>>0);
const v1076=v1073;
const v1077=v1075;
v1073=(((v1076) + (v1077)) >>> 0);
}
v1068=v1073;if(v1071){v1069=v1068;v1070=true;}}
const v1078=v1061;
const v1079=v1078.length;
const v1080=new Array(v1079);
for(let v1081=0;v1081<v1079;v1081++){
const v1082=(v1078[v1081]>>>0);
const v1083=v1068;
const v1084=v1082;
v1080[v1081]=(((v1083) + (v1084)) >>> 0);
}
v1067=v1080;}else{
const v1085=v1061;
const v1086=v1085.length;
const v1087=new Array(v1086);
for(let v1088=0;v1088<v1086;v1088++){
const v1089=(v1085[v1088]>>>0);
const v1090=v1062;
let v1091=0;
for(let v1092=0;v1092<v1090.length;v1092++){
const v1093=(v1090[v1092]>>>0);
const v1094=v1091;
const v1095=v1093;
v1091=(((v1094) + (v1095)) >>> 0);
}
const v1096=v1091;
const v1097=v1089;
v1087[v1088]=(((v1096) + (v1097)) >>> 0);
}
v1067=v1087;}
return v1067;};}
function __prepareFn1(fixed){const v1108=fixed[1];let v1107=false,v1106;
return function(v1098,v1099){const v1100=v1098;
const v1101=v1100.length;
const v1102=0;
const v1103=((v1101) !== (v1102));
let v1104;if(v1103){
let v1105;if(v1108&&v1107){v1105=v1106;}else{
const v1109=v1099;
let v1110=0;
for(let v1111=0;v1111<v1109.length;v1111++){
const v1112=(v1109[v1111]>>>0);
const v1113=v1110;
const v1114=v1112;
v1110=(((v1113) + (v1114)) >>> 0);
}
v1105=v1110;if(v1108){v1106=v1105;v1107=true;}}
const v1115=v1098;
const v1116=v1115.length;
const v1117=[];
for(let v1118=0;v1118<v1116;v1118++){
const v1119=(v1115[v1118]>>>0);
const v1120=v1119;
const v1121=v1105;
if(((v1120) > (v1121))){v1117.push(v1119);}
}
v1104=v1117;}else{
const v1122=v1098;
const v1123=v1122.length;
const v1124=[];
for(let v1125=0;v1125<v1123;v1125++){
const v1126=(v1122[v1125]>>>0);
const v1127=v1126;
const v1128=v1099;
let v1129=0;
for(let v1130=0;v1130<v1128.length;v1130++){
const v1131=(v1128[v1130]>>>0);
const v1132=v1129;
const v1133=v1131;
v1129=(((v1132) + (v1133)) >>> 0);
}
const v1134=v1129;
if(((v1127) > (v1134))){v1124.push(v1126);}
}
v1104=v1124;}
return v1104;};}
function __prepareFn2(fixed){const v1146=fixed[1];let v1145=false,v1144;
return function(v1135,v1136,v1137){const v1138=v1135;
const v1139=v1138.length;
const v1140=0;
const v1141=((v1139) !== (v1140));
let v1142;if(v1141){
let v1143;if(v1146&&v1145){v1143=v1144;}else{
const v1147=v1136;
let v1148=0;
for(let v1149=0;v1149<v1147.length;v1149++){
const v1150=(v1147[v1149]>>>0);
const v1151=v1148;
const v1152=v1150;
v1148=(((v1151) + (v1152)) >>> 0);
}
v1143=v1148;if(v1146){v1144=v1143;v1145=true;}}
const v1153=v1135;
let v1154=v1137;
for(let v1155=0;v1155<v1153.length;v1155++){
const v1156=(v1153[v1155]>>>0);
const v1157=v1154;
const v1158=v1156;
const v1159=v1143;
const v1160=(Math.imul(v1158,v1159) >>> 0);
v1154=(((v1157) + (v1160)) >>> 0);
}
v1142=v1154;}else{
const v1161=v1135;
let v1162=v1137;
for(let v1163=0;v1163<v1161.length;v1163++){
const v1164=(v1161[v1163]>>>0);
const v1165=v1162;
const v1166=v1164;
const v1167=v1136;
let v1168=0;
for(let v1169=0;v1169<v1167.length;v1169++){
const v1170=(v1167[v1169]>>>0);
const v1171=v1168;
const v1172=v1170;
v1168=(((v1171) + (v1172)) >>> 0);
}
const v1173=v1168;
const v1174=(Math.imul(v1166,v1173) >>> 0);
v1162=(((v1165) + (v1174)) >>> 0);
}
v1142=v1162;}
return v1142;};}
function __prepareFn3(fixed){const v1186=fixed[1];let v1185=false,v1184;
return function(v1175,v1176,v1177){const v1178=v1175;
const v1179=v1178.length;
const v1180=0;
const v1181=((v1179) !== (v1180));
let v1182;if(v1181){
let v1183;if(v1186&&v1185){v1183=v1184;}else{
const v1187=v1176;
let v1188=0;
for(let v1189=0;v1189<v1187.length;v1189++){
const v1190=(v1187[v1189]>>>0);
const v1191=v1188;
const v1192=v1190;
v1188=(((v1191) + (v1192)) >>> 0);
}
v1183=v1188;if(v1186){v1184=v1183;v1185=true;}}
const v1193=v1175;
let v1194=v1177;
for(let v1195=v1193.length-1;v1195>=0;v1195--){
const v1196=(v1193[v1195]>>>0);
const v1197=v1194;
const v1198=v1196;
const v1199=v1183;
const v1200=(Math.imul(v1198,v1199) >>> 0);
v1194=(((v1197) - (v1200)) >>> 0);
}
v1182=v1194;}else{
const v1201=v1175;
let v1202=v1177;
for(let v1203=v1201.length-1;v1203>=0;v1203--){
const v1204=(v1201[v1203]>>>0);
const v1205=v1202;
const v1206=v1204;
const v1207=v1176;
let v1208=0;
for(let v1209=0;v1209<v1207.length;v1209++){
const v1210=(v1207[v1209]>>>0);
const v1211=v1208;
const v1212=v1210;
v1208=(((v1211) + (v1212)) >>> 0);
}
const v1213=v1208;
const v1214=(Math.imul(v1206,v1213) >>> 0);
v1202=(((v1205) - (v1214)) >>> 0);
}
v1182=v1202;}
return v1182;};}
function __prepareFn4(fixed){const v1226=fixed[1]&&fixed[2];let v1225=false,v1224;
return function(v1215,v1216,v1217){const v1218=v1215;
const v1219=v1218.length;
const v1220=0;
const v1221=((v1219) !== (v1220));
let v1222;if(v1221){
let v1223;if(v1226&&v1225){v1223=v1224;}else{
const v1227=v1216;
let v1228=0;
for(let v1229=0;v1229<v1227.length;v1229++){
const v1230=(v1227[v1229]>>>0);
const v1231=v1228;
const v1232=v1216;
let v1233=v1217;
for(let v1234=0;v1234<v1232.length;v1234++){
const v1235=(v1232[v1234]>>>0);
const v1236=v1233;
const v1237=v1235;
v1233=(((v1236) + (v1237)) >>> 0);
}
const v1238=v1233;
const v1239=(((v1231) + (v1238)) >>> 0);
const v1240=v1230;
v1228=(((v1239) + (v1240)) >>> 0);
}
v1223=v1228;if(v1226){v1224=v1223;v1225=true;}}
const v1241=v1215;
const v1242=v1241.length;
const v1243=new Array(v1242);
for(let v1244=0;v1244<v1242;v1244++){
const v1245=(v1241[v1244]>>>0);
const v1246=v1223;
const v1247=v1245;
v1243[v1244]=(((v1246) + (v1247)) >>> 0);
}
v1222=v1243;}else{
const v1248=v1215;
const v1249=v1248.length;
const v1250=new Array(v1249);
for(let v1251=0;v1251<v1249;v1251++){
const v1252=(v1248[v1251]>>>0);
const v1253=v1216;
let v1254=0;
for(let v1255=0;v1255<v1253.length;v1255++){
const v1256=(v1253[v1255]>>>0);
const v1257=v1254;
const v1258=v1216;
let v1259=v1217;
for(let v1260=0;v1260<v1258.length;v1260++){
const v1261=(v1258[v1260]>>>0);
const v1262=v1259;
const v1263=v1261;
v1259=(((v1262) + (v1263)) >>> 0);
}
const v1264=v1259;
const v1265=(((v1257) + (v1264)) >>> 0);
const v1266=v1256;
v1254=(((v1265) + (v1266)) >>> 0);
}
const v1267=v1254;
const v1268=v1252;
v1250[v1251]=(((v1267) + (v1268)) >>> 0);
}
v1222=v1250;}
return v1222;};}
function __prepareFn5(fixed){const v1280=fixed[1]&&fixed[2];let v1279=false,v1278;
return function(v1269,v1270,v1271){const v1272=v1269;
const v1273=v1272.length;
const v1274=0;
const v1275=((v1273) !== (v1274));
let v1276;if(v1275){
let v1277;if(v1280&&v1279){v1277=v1278;}else{
const v1281=v1270;
let v1282=__nfValue(v1271);
for(let v1283=0;v1283<v1281.length;v1283++){
const v1284=v1281[v1283];
const v1285=__nfValue(v1282);
const v1286=__nfValue(v1284);
v1282=Math.fround(__nfNumber(v1285) + __nfNumber(v1286));
}
v1277=v1282;if(v1280){v1278=v1277;v1279=true;}}
const v1287=v1269;
const v1288=v1287.length;
const v1289=new Array(v1288);
for(let v1290=0;v1290<v1288;v1290++){
const v1291=v1287[v1290];
const v1292=__nfValue(v1277);
const v1293=__nfValue(v1291);
v1289[v1290]=Math.fround(__nfNumber(v1292) + __nfNumber(v1293));
}
v1276=v1289;}else{
const v1294=v1269;
const v1295=v1294.length;
const v1296=new Array(v1295);
for(let v1297=0;v1297<v1295;v1297++){
const v1298=v1294[v1297];
const v1299=v1270;
let v1300=__nfValue(v1271);
for(let v1301=0;v1301<v1299.length;v1301++){
const v1302=v1299[v1301];
const v1303=__nfValue(v1300);
const v1304=__nfValue(v1302);
v1300=Math.fround(__nfNumber(v1303) + __nfNumber(v1304));
}
const v1305=v1300;
const v1306=__nfValue(v1298);
v1296[v1297]=Math.fround(__nfNumber(v1305) + __nfNumber(v1306));
}
v1276=v1296;}
return v1276;};}
function __prepareFn6(fixed){const v1317=fixed[1];let v1316=false,v1315;
return function(v1307,v1308){const v1309=v1307;
const v1310=v1309.length;
const v1311=0;
const v1312=((v1310) !== (v1311));
let v1313;if(v1312){
let v1314;if(v1317&&v1316){v1314=v1315;}else{
const v1318=v1308;
let v1319=0n;
for(let v1320=0;v1320<v1318.length;v1320++){
const v1321=v1318[v1320];
const v1322=v1319;
const v1323=v1321;
v1319=__u64((v1322) + (v1323));
}
v1314=v1319;if(v1317){v1315=v1314;v1316=true;}}
const v1324=v1307;
const v1325=v1324.length;
const v1326=new Array(v1325);
for(let v1327=0;v1327<v1325;v1327++){
const v1328=v1324[v1327];
const v1329=v1314;
const v1330=v1328;
v1326[v1327]=__u64((v1329) + (v1330));
}
v1313=v1326;}else{
const v1331=v1307;
const v1332=v1331.length;
const v1333=new Array(v1332);
for(let v1334=0;v1334<v1332;v1334++){
const v1335=v1331[v1334];
const v1336=v1308;
let v1337=0n;
for(let v1338=0;v1338<v1336.length;v1338++){
const v1339=v1336[v1338];
const v1340=v1337;
const v1341=v1339;
v1337=__u64((v1340) + (v1341));
}
const v1342=v1337;
const v1343=v1335;
v1333[v1334]=__u64((v1342) + (v1343));
}
v1313=v1333;}
return v1313;};}
function __prepareFn7(fixed){const v1354=fixed[1];let v1353=false,v1352;
return function(v1344,v1345){const v1346=v1344;
const v1347=v1346.length;
const v1348=0;
const v1349=((v1347) !== (v1348));
let v1350;if(v1349){
let v1351;if(v1354&&v1353){v1351=v1352;}else{
const v1355=v1345;
let v1356=0;
for(let v1357=0;v1357<v1355.length;v1357++){
const v1358=(v1355[v1357]|0);
const v1359=v1356;
const v1360=v1358;
v1356=(((v1359) + (v1360)) | 0);
}
v1351=v1356;if(v1354){v1352=v1351;v1353=true;}}
const v1361=v1344;
const v1362=v1361.length;
const v1363=new Array(v1362);
for(let v1364=0;v1364<v1362;v1364++){
const v1365=(v1361[v1364]|0);
const v1366=v1351;
const v1367=v1365;
v1363[v1364]=(((v1366) + (v1367)) | 0);
}
v1350=v1363;}else{
const v1368=v1344;
const v1369=v1368.length;
const v1370=new Array(v1369);
for(let v1371=0;v1371<v1369;v1371++){
const v1372=(v1368[v1371]|0);
const v1373=v1345;
let v1374=0;
for(let v1375=0;v1375<v1373.length;v1375++){
const v1376=(v1373[v1375]|0);
const v1377=v1374;
const v1378=v1376;
v1374=(((v1377) + (v1378)) | 0);
}
const v1379=v1374;
const v1380=v1372;
v1370[v1371]=(((v1379) + (v1380)) | 0);
}
v1350=v1370;}
return v1350;};}
function __prepareFn8(fixed){const v1391=fixed[1];let v1390=false,v1389;
return function(v1381,v1382){const v1383=v1381;
const v1384=v1383.length;
const v1385=0;
const v1386=((v1384) !== (v1385));
let v1387;if(v1386){
let v1388;if(v1391&&v1390){v1388=v1389;}else{
const v1392=v1382;
const v1393=v1392.length;
const v1394=[];
for(let v1395=0;v1395<v1393;v1395++){
const v1396=(v1392[v1395]>>>0);
const v1397=v1396;
const v1398=1;
if(((v1397) > (v1398))){v1394.push(v1396);}
}
const v1399=v1394;
const v1400=v1399.length;
const v1401=0;
v1388=((v1400) > (v1401));if(v1391){v1389=v1388;v1390=true;}}
const v1402=v1381;
const v1403=v1402.length;
const v1404=new Array(v1403);
for(let v1405=0;v1405<v1403;v1405++){
const v1406=(v1402[v1405]>>>0);
const v1407=v1388;
const v1408=v1406;
const v1409=0;
const v1410=((v1408) > (v1409));
v1404[v1405]=(v1407===v1410);
}
v1387=v1404;}else{
const v1411=v1381;
const v1412=v1411.length;
const v1413=new Array(v1412);
for(let v1414=0;v1414<v1412;v1414++){
const v1415=(v1411[v1414]>>>0);
const v1416=v1382;
const v1417=v1416.length;
const v1418=[];
for(let v1419=0;v1419<v1417;v1419++){
const v1420=(v1416[v1419]>>>0);
const v1421=v1420;
const v1422=1;
if(((v1421) > (v1422))){v1418.push(v1420);}
}
const v1423=v1418;
const v1424=v1423.length;
const v1425=0;
const v1426=((v1424) > (v1425));
const v1427=v1415;
const v1428=0;
const v1429=((v1427) > (v1428));
v1413[v1414]=(v1426===v1429);
}
v1387=v1413;}
return v1387;};}
function __prepareFn10(fixed){const v1481=fixed[1]&&fixed[2];let v1480=false,v1479;
return function(v1470,v1471,v1472){const v1473=v1470;
const v1474=v1473.length;
const v1475=0;
const v1476=((v1474) !== (v1475));
let v1477;if(v1476){
let v1478;if(v1481&&v1480){v1478=v1479;}else{
let v1482;if(v1472){
const v1483=v1471;
let v1484=0;
for(let v1485=0;v1485<v1483.length;v1485++){
const v1486=(v1483[v1485]>>>0);
const v1487=v1484;
const v1488=v1486;
v1484=(((v1487) + (v1488)) >>> 0);
}
v1482=v1484;}else{
v1482=0;}
v1478=v1482;if(v1481){v1479=v1478;v1480=true;}}
const v1489=v1470;
const v1490=v1489.length;
const v1491=new Array(v1490);
for(let v1492=0;v1492<v1490;v1492++){
const v1493=(v1489[v1492]>>>0);
const v1494=v1478;
const v1495=v1493;
v1491[v1492]=(((v1494) + (v1495)) >>> 0);
}
v1477=v1491;}else{
const v1496=v1470;
const v1497=v1496.length;
const v1498=new Array(v1497);
for(let v1499=0;v1499<v1497;v1499++){
const v1500=(v1496[v1499]>>>0);
let v1501;if(v1472){
const v1502=v1471;
let v1503=0;
for(let v1504=0;v1504<v1502.length;v1504++){
const v1505=(v1502[v1504]>>>0);
const v1506=v1503;
const v1507=v1505;
v1503=(((v1506) + (v1507)) >>> 0);
}
v1501=v1503;}else{
v1501=0;}
const v1508=v1501;
const v1509=v1500;
v1498[v1499]=(((v1508) + (v1509)) >>> 0);
}
v1477=v1498;}
return v1477;};}
function __prepareFn14(fixed){const v1569=fixed[1];let v1568=false,v1567;
return function(v1559,v1560){const v1561=v1559;
const v1562=v1561.length;
const v1563=0;
const v1564=((v1562) !== (v1563));
let v1565;if(v1564){
let v1566;if(v1569&&v1568){v1566=v1567;}else{
const v1570=v1560;
const v1571=v1570.length;
const v1572=new Array(v1571);
for(let v1573=0;v1573<v1571;v1573++){
const v1574=(v1570[v1573]>>>0);
const v1575=v1574;
const v1576=3;
const v1577=(Math.imul(v1575,v1576) >>> 0);
const v1578=7;
const v1579=(((v1577) + (v1578)) >>> 0);
const v1580=5;
v1572[v1573]=(Math.imul(v1579,v1580) >>> 0);
}
v1566=v1572;if(v1569){v1567=v1566;v1568=true;}}
const v1581=v1559;
const v1582=v1581.length;
const v1583=new Array(v1582);
for(let v1584=0;v1584<v1582;v1584++){
const v1585=(v1581[v1584]>>>0);
const v1586=v1566;
const v1587=v1585;
let v1588;if(v1587<v1586.length){v1588=v1586[v1587];}else{
v1588=999;}
v1583[v1584]=v1588;
}
v1565=v1583;}else{
const v1589=v1559;
const v1590=v1589.length;
const v1591=new Array(v1590);
for(let v1592=0;v1592<v1590;v1592++){
const v1593=(v1589[v1592]>>>0);
const v1594=v1560;
const v1595=v1594.length;
const v1596=new Array(v1595);
for(let v1597=0;v1597<v1595;v1597++){
const v1598=(v1594[v1597]>>>0);
const v1599=v1598;
const v1600=3;
const v1601=(Math.imul(v1599,v1600) >>> 0);
const v1602=7;
const v1603=(((v1601) + (v1602)) >>> 0);
const v1604=5;
v1596[v1597]=(Math.imul(v1603,v1604) >>> 0);
}
const v1605=v1596;
const v1606=v1593;
let v1607;if(v1606<v1605.length){v1607=v1605[v1606];}else{
v1607=999;}
v1591[v1592]=v1607;
}
v1565=v1591;}
return v1565;};}
function __prepareFn15(fixed){const v1618=fixed[1];let v1617=false,v1616;
return function(v1608,v1609){const v1610=v1608;
const v1611=v1610.length;
const v1612=0;
const v1613=((v1611) !== (v1612));
let v1614;if(v1613){
let v1615;if(v1618&&v1617){v1615=v1616;}else{
const v1619=v1609;
const v1620=v1619.length;
const v1621=new Array(v1620);
for(let v1622=0;v1622<v1620;v1622++){
const v1623=v1619[v1622];
const v1624=__nfValue(v1623);
const v1625=__nfFromBits(1073741824);
const v1626=Math.fround(__nfNumber(v1624) * __nfNumber(v1625));
const v1627=__nfFromBits(1065353216);
const v1628=Math.fround(__nfNumber(v1626) + __nfNumber(v1627));
const v1629=__nfFromBits(1077936128);
v1621[v1622]=Math.fround(__nfNumber(v1628) * __nfNumber(v1629));
}
v1615=v1621;if(v1618){v1616=v1615;v1617=true;}}
const v1630=v1608;
const v1631=v1630.length;
const v1632=new Array(v1631);
for(let v1633=0;v1633<v1631;v1633++){
const v1634=(v1630[v1633]>>>0);
const v1635=v1615;
const v1636=v1634;
let v1637;if(v1636<v1635.length){v1637=v1635[v1636];}else{
v1637=__nfFromBits(0);}
v1632[v1633]=__nfValue(v1637);
}
v1614=v1632;}else{
const v1638=v1608;
const v1639=v1638.length;
const v1640=new Array(v1639);
for(let v1641=0;v1641<v1639;v1641++){
const v1642=(v1638[v1641]>>>0);
const v1643=v1609;
const v1644=v1643.length;
const v1645=new Array(v1644);
for(let v1646=0;v1646<v1644;v1646++){
const v1647=v1643[v1646];
const v1648=__nfValue(v1647);
const v1649=__nfFromBits(1073741824);
const v1650=Math.fround(__nfNumber(v1648) * __nfNumber(v1649));
const v1651=__nfFromBits(1065353216);
const v1652=Math.fround(__nfNumber(v1650) + __nfNumber(v1651));
const v1653=__nfFromBits(1077936128);
v1645[v1646]=Math.fround(__nfNumber(v1652) * __nfNumber(v1653));
}
const v1654=v1645;
const v1655=v1642;
let v1656;if(v1655<v1654.length){v1656=v1654[v1655];}else{
v1656=__nfFromBits(0);}
v1640[v1641]=__nfValue(v1656);
}
v1614=v1640;}
return v1614;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[4,__prepareFn4],[5,__prepareFn5],[6,__prepareFn6],[7,__prepareFn7],[8,__prepareFn8],[10,__prepareFn10],[14,__prepareFn14],[15,__prepareFn15]]);
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"5322f7c4951017054018fbc2de081075f299a7e3cf541710b30b092752dc0693","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"mapped","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":1,"internal":false,"name":"filtered","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":2,"internal":false,"name":"folded","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":4,"internal":false,"name":"nested","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":5,"internal":false,"name":"floats","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seed","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":6,"internal":false,"name":"wide","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u64"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u64"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":7,"internal":false,"name":"signed","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"i32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"i32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"i32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":8,"internal":false,"name":"booleans","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"bool"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":9,"internal":false,"name":"captured","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":10,"internal":false,"name":"whole_choice","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"c","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":11,"internal":false,"name":"dependent","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":12,"internal":false,"name":"conditional","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":13,"internal":false,"name":"stopping","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":14,"internal":false,"name":"prepared","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":15,"internal":false,"name":"prepared_float","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":16,"internal":false,"name":"prepared_dependent","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":true,"function":"mapped","retained_bindings":1},{"factory":true,"function":"filtered","retained_bindings":1},{"factory":true,"function":"folded","retained_bindings":1},{"factory":true,"function":"right","retained_bindings":1},{"factory":true,"function":"nested","retained_bindings":1},{"factory":true,"function":"floats","retained_bindings":1},{"factory":true,"function":"wide","retained_bindings":1},{"factory":true,"function":"signed","retained_bindings":1},{"factory":true,"function":"booleans","retained_bindings":1},{"factory":false,"function":"captured","reason":"no reusable lexical bindings"},{"factory":true,"function":"whole_choice","retained_bindings":1},{"factory":false,"function":"dependent","reason":"no reusable lexical bindings"},{"factory":false,"function":"conditional","reason":"no reusable lexical bindings"},{"factory":false,"function":"stopping","reason":"no reusable lexical bindings"},{"factory":true,"function":"prepared","retained_bindings":1},{"factory":true,"function":"prepared_float","retained_bindings":1},{"factory":false,"function":"prepared_dependent","reason":"no reusable lexical bindings"}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"booleans":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e068b4428ffb87ff21e134eb8b1d7aa7d64685b0c2940afaabbaf063feec0fe2","named":{},"root":{"element":{"kind":"bool"},"kind":"list"}}},"captured":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"conditional":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"dependent":{"arguments":{"format":"ink-value-wire-v1","identity":"40c474b26407b61251cf7479f9144e6f4df9a1f1b14620d3209a5615b8fa85a4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"filtered":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"floats":{"arguments":{"format":"ink-value-wire-v1","identity":"818a0c297d8990ad68d56dbe989c3a837fd28fd4c04fac35f0b5d904b6327a7b","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"seed","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"folded":{"arguments":{"format":"ink-value-wire-v1","identity":"d40a421ed98197b090ee46a3d10a8324dfd92aad2ac19cffb090b7d9a686c83c","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"mapped":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"nested":{"arguments":{"format":"ink-value-wire-v1","identity":"d40a421ed98197b090ee46a3d10a8324dfd92aad2ac19cffb090b7d9a686c83c","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"prepared":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"prepared_dependent":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"prepared_float":{"arguments":{"format":"ink-value-wire-v1","identity":"a6393bddae33ff5223198d00b1db267d912dbd9829def2e291ff4061ba66fefe","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"right":{"arguments":{"format":"ink-value-wire-v1","identity":"d40a421ed98197b090ee46a3d10a8324dfd92aad2ac19cffb090b7d9a686c83c","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"signed":{"arguments":{"format":"ink-value-wire-v1","identity":"498f5dddac7c97bb1863e46f5477d2284471ad0ab0feecd42a630d9075fbc191","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"i32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"i32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"3f39441e7db6c42c9243663e5d429f089a5532fabf971f849e466410ae5a5c8f","named":{},"root":{"element":{"kind":"i32"},"kind":"list"}}},"stopping":{"arguments":{"format":"ink-value-wire-v1","identity":"b78038f243fbc111dbc01de3b38790e3d50c6bba53ccf920253bad272ecb83c1","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"whole_choice":{"arguments":{"format":"ink-value-wire-v1","identity":"51a80d8d77a7eba6f055fed95fdc921601b71ccea6d440d7cd71f0cbec864e0f","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"c","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":{},"root":{"element":{"kind":"u32"},"kind":"list"}}},"wide":{"arguments":{"format":"ink-value-wire-v1","identity":"061a465d8d1fde61e1c9b6e120c7619d9716781a8d6b69a77dda117f794b85e5","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u64"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u64"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"da5e3e5dcc7a0c92bb66ca9e3365cee597037ddc7b474654d11c585e4ff622af","named":{},"root":{"element":{"kind":"u64"},"kind":"list"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true],"types":[{"element":{"kind":"u64"},"kind":"list"},{"element":{"kind":"u64"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"i32"},"kind":"list"},{"element":{"kind":"i32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"},{"kind":"bool"}]},{"capture":[true],"types":[{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"u32"},"kind":"list"},{"element":{"kind":"u32"},"kind":"list"}]}];

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
function __ownedValue8(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue9(value[i],budget,depth+1);return out;}
function __ownedValue2(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue3(value[i],budget,depth+1);return out;}
function __ownedValue6(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue7(value[i],budget,depth+1);return out;}
function __ownedValue0(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue1(value[i],budget,depth+1);return out;}
function __ownedValue4(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue5(value[i],budget,depth+1);return out;}
function __ownedValue9(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __ownedValue7(value,budget,depth){budget.enter(depth,8);return value|0;}
function __ownedValue1(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __ownedValue5(value,budget,depth){budget.enter(depth,12);return BigInt(value);}
const __ownedFunctions=Object.freeze(Object.fromEntries([["mapped",__ownedValue0],["filtered",__ownedValue0],["folded",__ownedValue1],["right",__ownedValue1],["nested",__ownedValue0],["floats",__ownedValue2],["wide",__ownedValue4],["signed",__ownedValue6],["booleans",__ownedValue8],["captured",__ownedValue0],["whole_choice",__ownedValue0],["dependent",__ownedValue0],["conditional",__ownedValue0],["stopping",__ownedValue1],["prepared",__ownedValue0],["prepared_float",__ownedValue2],["prepared_dependent",__ownedValue0]]));
function __wireValue3(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue4(reader);reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue8(reader);reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue13(reader);reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue2(reader);reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue17(reader);reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value={["xs"]:__wireValue7(reader),["ys"]:__wireValue7(reader),["seed"]:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["xs"]:__wireValue12(reader),["ys"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={["xs"]:__wireValue1(reader),["ys"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value={["xs"]:__wireValue1(reader),["ys"]:__wireValue1(reader),["c"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value={["xs"]:__wireValue1(reader),["ys"]:__wireValue1(reader),["seed"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["xs"]:__wireValue1(reader),["ys"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["xs"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value={["xs"]:__wireValue16(reader),["ys"]:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value=reader.signed();reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value=reader.wide();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["booleans",[__wireValue0,__wireValue3]],["captured",[__wireValue0,__wireValue1]],["conditional",[__wireValue0,__wireValue1]],["dependent",[__wireValue5,__wireValue1]],["filtered",[__wireValue0,__wireValue1]],["floats",[__wireValue6,__wireValue7]],["folded",[__wireValue9,__wireValue2]],["mapped",[__wireValue0,__wireValue1]],["nested",[__wireValue9,__wireValue1]],["prepared",[__wireValue0,__wireValue1]],["prepared_dependent",[__wireValue0,__wireValue1]],["prepared_float",[__wireValue10,__wireValue7]],["right",[__wireValue9,__wireValue2]],["signed",[__wireValue11,__wireValue12]],["stopping",[__wireValue0,__wireValue2]],["whole_choice",[__wireValue14,__wireValue1]],["wide",[__wireValue15,__wireValue16]]]));

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
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture9(value[i],budget,depth+1);return out;}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture3(value[i],budget,depth+1);return out;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture7(value[i],budget,depth+1);return out;}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture1(value[i],budget,depth+1);return out;}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture5(value[i],budget,depth+1);return out;}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return __nfFromBits(bits);}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<-2147483648||value>2147483647){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);const kind=typeof value;if(kind==='number'&&!Number.isSafeInteger(value)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&!/^(0|[1-9][0-9]*)$/.test(value)){throw Error('invalid value for wire schema');}const n=BigInt(value);if(n<0n||n>18446744073709551615n){throw Error('invalid value for wire schema');}budget.add(8);return n;}
function __privateWireValue13(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue14(reader);reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue5(reader);reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue11(reader);reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue1(reader);reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue8(reader);reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value={["xs"]:__privateWireValue4(reader),["ys"]:__privateWireValue4(reader),["seed"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const value={["xs"]:__privateWireValue10(reader),["ys"]:__privateWireValue10(reader)};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value={["xs"]:__privateWireValue0(reader),["ys"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value={["xs"]:__privateWireValue0(reader),["ys"]:__privateWireValue0(reader),["c"]:__privateWireValue14(reader)};reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value={["xs"]:__privateWireValue0(reader),["ys"]:__privateWireValue0(reader),["seed"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["xs"]:__privateWireValue0(reader),["ys"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["xs"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["xs"]:__privateWireValue7(reader),["ys"]:__privateWireValue7(reader)};reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value=__nfFromBits(reader.word());reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value=reader.signed();reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value=reader.wide();reader.finish(end);return value;}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue9(value[i],budget,depth+1);return out;}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue3(value[i],budget,depth+1);return out;}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue7(value[i],budget,depth+1);return out;}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue1(value[i],budget,depth+1);return out;}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue5(value[i],budget,depth+1);return out;}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,8);return value|0;}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,12);return BigInt(value);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite9(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite3(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite7(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite1(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite5(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.word(__nfBits(value));writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();writer.word(value>>>0);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();writer.wide(value);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:"list",patterns:[{bytes:8,label:"sequence",children:[1],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"u32",scalar:__privateCapture1},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[3],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"f32",scalar:__privateCapture3},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[5],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"u64",scalar:__privateCapture5},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[7],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"i32",scalar:__privateCapture7},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[9],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"bool",scalar:__privateCapture9}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[0];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue1(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,8);return r[1](value,c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[2];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue3(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);return r[3]({F32Bits:__nfBits(value)},c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[4];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue5(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,12);return r[5](value,c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[6];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue7(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,8);return r[7](value,c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[8];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue9(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,5);return r[9](value,c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([3]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([5]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"u64"}),Object.freeze({"children":Object.freeze([7]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"i32"}),Object.freeze({"children":Object.freeze([9]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"69ebf947aa59a2546656d1976b0baa6e56e7182d989425379b31e3bff74168ca","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"list"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture2,__privateWireValue4,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture3,__privateWireValue5,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"da5e3e5dcc7a0c92bb66ca9e3365cee597037ddc7b474654d11c585e4ff622af","named":__compiledNamed0(),"root":{"element":{"kind":"u64"},"kind":"list"}},__privateCapture4,__privateWireValue7,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"3f39441e7db6c42c9243663e5d429f089a5532fabf971f849e466410ae5a5c8f","named":__compiledNamed0(),"root":{"element":{"kind":"i32"},"kind":"list"}},__privateCapture6,__privateWireValue10,__privateWireWrite6,__compiledOwnedValue6,6,6,__reduceValue6,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"e068b4428ffb87ff21e134eb8b1d7aa7d64685b0c2940afaabbaf063feec0fe2","named":__compiledNamed0(),"root":{"element":{"kind":"bool"},"kind":"list"}},__privateCapture8,__privateWireValue13,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture9,__privateWireValue14,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
const __compiledEntries=new Map([["mapped",{index:0,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["filtered",{index:1,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["folded",{index:2,params:[__compiledCodec0,__compiledCodec0,__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["right",{index:3,params:[__compiledCodec0,__compiledCodec0,__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["nested",{index:4,params:[__compiledCodec0,__compiledCodec0,__compiledCodec1],result:__compiledCodec0,arguments:__privateWireValue3,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["floats",{index:5,params:[__compiledCodec2,__compiledCodec2,__compiledCodec3],result:__compiledCodec2,arguments:__privateWireValue6,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["wide",{index:6,params:[__compiledCodec4,__compiledCodec4],result:__compiledCodec4,arguments:__privateWireValue9,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["signed",{index:7,params:[__compiledCodec5,__compiledCodec5],result:__compiledCodec5,arguments:__privateWireValue12,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["booleans",{index:8,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec6,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["captured",{index:9,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["whole_choice",{index:10,params:[__compiledCodec0,__compiledCodec0,__compiledCodec7],result:__compiledCodec0,arguments:__privateWireValue15,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["dependent",{index:11,params:[__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue16,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["conditional",{index:12,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["stopping",{index:13,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec1,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["prepared",{index:14,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["prepared_float",{index:15,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec2,arguments:__privateWireValue17,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["prepared_dependent",{index:16,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec0,arguments:__privateWireValue2,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}]]);

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
const __intoOutput5=__representation(metadata.functions[5].result.element,true);
const __intoOutput15=__representation(metadata.functions[15].result.element,true);
const __intoImplementations=[__into0,__into1,null,null,__into4,__into5,__into6,__into7,__into8,__into9,__into10,__into11,__into12,null,__into14,__into15,__into16];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

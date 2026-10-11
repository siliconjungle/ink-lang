
const __ink_work_2402d4d4ed79cf0f_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":605,"offset_unit":"UTF16","source_sha256":"302c5233c1d0d0e1ec40cbcee93b352f391584062aa787d9f97a853be8472a0d"},{"id":2,"kind":"construction","start":688,"end":706,"offset_unit":"UTF16","source_sha256":"f47695afc0f7ab60b9ac37ef679aef79858682f830460ea1ef0b9abc389bfabb","constructor_capacity_only":false},{"id":3,"kind":"loop_iterations","start":708,"end":756,"offset_unit":"UTF16","source_sha256":"d700a4db8a985bb01c2293de2a3396783ca7fd6232ae4a7a4694252293cb0142"},{"id":4,"kind":"loop_iterations","start":757,"end":809,"offset_unit":"UTF16","source_sha256":"3e22ad5621800990636680f9b4b628c6945fe06527308caa983f613d5be961c6"},{"id":5,"kind":"construction","start":871,"end":885,"offset_unit":"UTF16","source_sha256":"79758918e72c5f7992ba3dd595c4884cae513c38ea07aaecc796609f95f447be","constructor_capacity_only":false},{"id":6,"kind":"loop_iterations","start":887,"end":1326,"offset_unit":"UTF16","source_sha256":"70ffd9b3f2a0a689cc8d9fa46620294a8537fc0144a6fcefca54625f5443fbfe"},{"id":7,"kind":"construction","start":1395,"end":1409,"offset_unit":"UTF16","source_sha256":"ccbaa57e352fdcd45cc91385890c01f4f8eb57fcad25c88b904416e242b90ac7","constructor_capacity_only":false},{"id":8,"kind":"loop_iterations","start":1411,"end":2026,"offset_unit":"UTF16","source_sha256":"be20f1c2835ae9c683439bfe3b67c22cc8cbdf4b84acd99429d21ca31a8eed94"},{"id":9,"kind":"construction","start":4523,"end":4538,"offset_unit":"UTF16","source_sha256":"f35da830a63f0a3a8acaf935591cbbea22b2f1449ac1147e9a7b2bffabd637a1","constructor_capacity_only":false},{"id":10,"kind":"loop_iterations","start":4540,"end":5132,"offset_unit":"UTF16","source_sha256":"ebf8d7e2bbcd08262ac98fc1cc5b6cec783b9b9148fc167ce926a96b05a4b0ea"},{"id":11,"kind":"construction","start":5226,"end":5246,"offset_unit":"UTF16","source_sha256":"adfc240d9586888add812fa4cdfa1e46030c7943d5648e49301a606f9535ac0e","constructor_capacity_only":false},{"id":12,"kind":"loop_iterations","start":5248,"end":5304,"offset_unit":"UTF16","source_sha256":"c6d1bfb965b247090c328517d9b6dc6e07df36ae374a38e9dfc2a65ab6d1c4a6"},{"id":13,"kind":"loop_iterations","start":5305,"end":5366,"offset_unit":"UTF16","source_sha256":"a79b3fe8400179f8faa187c9bab2d0033e355dd9765dd9c7dcd1c6d10844c953"},{"id":14,"kind":"construction","start":5436,"end":5451,"offset_unit":"UTF16","source_sha256":"28ef144107eb03204df559f62493e2d417c1051a9b665a694a53607e2e8998f7","constructor_capacity_only":false},{"id":15,"kind":"loop_iterations","start":5453,"end":5942,"offset_unit":"UTF16","source_sha256":"ccd1e31d5fa2f71f150e98de127fa4910e3d5466cefb38b715d693e2beb9982a"},{"id":16,"kind":"loop_iterations","start":6006,"end":6693,"offset_unit":"UTF16","source_sha256":"27b14f30503c71b428db7779837e1577259c0263cba7c1991aeb6e4d0e899bb4"},{"id":17,"kind":"allocation_events","start":9430,"end":9465,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":18,"kind":"allocation_events","start":9741,"end":9780,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_2402d4d4ed79cf0f_counts=[],__ink_work_2402d4d4ed79cf0f_unknown=[];
function __ink_work_2402d4d4ed79cf0f_hit(i){__ink_work_2402d4d4ed79cf0f_counts[i]=(__ink_work_2402d4d4ed79cf0f_counts[i]??0)+1;}
function __ink_work_2402d4d4ed79cf0f_allocate(i,x){__ink_work_2402d4d4ed79cf0f_hit(i);return x;}
function __ink_work_2402d4d4ed79cf0f_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_2402d4d4ed79cf0f_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_2402d4d4ed79cf0f_sites[i].constructor_capacity_only)__ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_2402d4d4ed79cf0f_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_2402d4d4ed79cf0f_hit(__ink_work_2402d4d4ed79cf0f_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_2402d4d4ed79cf0f_copy_bytes+=args[0].byteLength;
  else __ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_2402d4d4ed79cf0f_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_2402d4d4ed79cf0f_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_2402d4d4ed79cf0f_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_2402d4d4ed79cf0f_copy_bytes=0;
export function __ink_work_2402d4d4ed79cf0f_reset(){__ink_work_2402d4d4ed79cf0f_counts=[];__ink_work_2402d4d4ed79cf0f_unknown=[];__ink_work_2402d4d4ed79cf0f_copy_bytes=0;}
export function __ink_work_2402d4d4ed79cf0f_snapshot(){return {sites:__ink_work_2402d4d4ed79cf0f_counts.slice(),copy_bytes:__ink_work_2402d4d4ed79cf0f_copy_bytes,unknown:__ink_work_2402d4d4ed79cf0f_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_2402d4d4ed79cf0f_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_2402d4d4ed79cf0f_hit(1);
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v9;
const v11=v8;
const v12=v2;
const v13=v3;
/* inline left_word */
const v14=v10;
const v15=v11;
const v16=v12;
const v17=v13;
/* inline left_signal */
const v18=v15;
const v19=v17;
let v20;if(v19===0 ){
v20=0;}else{
v20=(Math.trunc(v18/v19)+0);}
const v21=v20;
const v22=v14;
const v23=v17;
let v24;if(v23===0 ){
v24=0;}else{
v24=((v22%v23)+0);}
const v25=v24;
const v26=(((v21) + (v25)) >>> 0);
const v27=v16;
v6[v7]=(((v26) + (v27)) >>> 0);
}
const v28=v6;
const v29=v1;
const v30=v28.length;
const v31=v29.length;
const v32=__ink_work_2402d4d4ed79cf0f_construct(2,new Array(v30+v31));
for(let v33=0;v33<v30;v33++){__ink_work_2402d4d4ed79cf0f_hit(3);v32[v33]=v28[v33];}
for(let v34=0;v34<v31;v34++){__ink_work_2402d4d4ed79cf0f_hit(4);v32[v30+v34]=v29[v34];}
const v35=v32;
const v36=v0;
const v37=v36.length;
const v38=__ink_work_2402d4d4ed79cf0f_construct(5,new Array(v37));
for(let v39=0;v39<v37;v39++){__ink_work_2402d4d4ed79cf0f_hit(6);
const v40=v36[v39];
const v41=(v39>>>0);
const v42=v41;
const v43=v40;
const v44=v2;
const v45=v3;
/* inline right_word */
const v46=v42;
const v47=v43;
const v48=v44;
const v49=v45;
/* inline right_signal */
const v50=v46;
const v51=v48;
let v52;if(((v50) < (v51))){
const v53=v47;
const v54=v49;
v52=(((v53) + (v54)) >>> 0);}else{
const v55=v47;
const v56=3;
v52=(Math.imul(v55,v56) >>> 0);}
v38[v39]=v52;
}
const v57=v38;
const v58=Math.min(v35.length,v57.length);
const v59=__ink_work_2402d4d4ed79cf0f_construct(7,new Array(v58));
for(let v60=0;v60<v58;v60++){__ink_work_2402d4d4ed79cf0f_hit(8);
const v61=v35[v60];
const v62=v57[v60];
const v63=v61;
const v64=v62;
const v65=v2;
const v66=v3;
/* inline pair_word */
const v67=v63;
const v68=v64;
const v69=v65;
const v70=v66;
/* inline pair_signal */
const v71=v67;
const v72=v68;
let v73;if(((v71) < (v72))){
const v74=v67;
const v75=v70;
let v76;if(v75===0 ){
v76=0;}else{
v76=(Math.trunc(v74/v75)+0);}
const v77=v76;
const v78=v68;
v73=(((v77) + (v78)) >>> 0);}else{
const v79=v68;
const v80=v70;
let v81;if(v80===0 ){
v81=0;}else{
v81=((v79%v80)+0);}
const v82=v81;
const v83=v67;
v73=(((v82) + (v83)) >>> 0);}
v59[v60]=v73;
}
return v59;}
function __fn1(v84,v85,v86,v87){
const v88=v84;
const v89=v85;
const v90=v86;
const v91=v87;
/* inline left_signal */
const v92=v89;
const v93=v91;
let v94;if(v93===0 ){
v94=0;}else{
v94=(Math.trunc(v92/v93)+0);}
const v95=v94;
const v96=v88;
const v97=v91;
let v98;if(v97===0 ){
v98=0;}else{
v98=((v96%v97)+0);}
const v99=v98;
const v100=(((v95) + (v99)) >>> 0);
const v101=v90;
return (((v100) + (v101)) >>> 0);}
function __fn2(v102,v103,v104,v105){
const v106=v103;
const v107=v105;
let v108;if(v107===0 ){
v108=0;}else{
v108=(Math.trunc(v106/v107)+0);}
const v109=v108;
const v110=v102;
const v111=v105;
let v112;if(v111===0 ){
v112=0;}else{
v112=((v110%v111)+0);}
const v113=v112;
const v114=(((v109) + (v113)) >>> 0);
const v115=v104;
return (((v114) + (v115)) >>> 0);}
function __fn3(v116,v117,v118,v119){
const v120=v116;
const v121=v117;
const v122=v118;
const v123=v119;
/* inline right_signal */
const v124=v120;
const v125=v122;
let v126;if(((v124) < (v125))){
const v127=v121;
const v128=v123;
v126=(((v127) + (v128)) >>> 0);}else{
const v129=v121;
const v130=3;
v126=(Math.imul(v129,v130) >>> 0);}
return v126;}
function __fn4(v131,v132,v133,v134){
const v135=v131;
const v136=v133;
let v137;if(((v135) < (v136))){
const v138=v132;
const v139=v134;
v137=(((v138) + (v139)) >>> 0);}else{
const v140=v132;
const v141=3;
v137=(Math.imul(v140,v141) >>> 0);}
return v137;}
function __fn5(v142,v143,v144,v145){
const v146=v142;
const v147=v143;
const v148=v144;
const v149=v145;
/* inline pair_signal */
const v150=v146;
const v151=v147;
let v152;if(((v150) < (v151))){
const v153=v146;
const v154=v149;
let v155;if(v154===0 ){
v155=0;}else{
v155=(Math.trunc(v153/v154)+0);}
const v156=v155;
const v157=v147;
v152=(((v156) + (v157)) >>> 0);}else{
const v158=v147;
const v159=v149;
let v160;if(v159===0 ){
v160=0;}else{
v160=((v158%v159)+0);}
const v161=v160;
const v162=v146;
v152=(((v161) + (v162)) >>> 0);}
return v152;}
function __fn6(v163,v164,v165,v166){
const v167=v163;
const v168=v164;
let v169;if(((v167) < (v168))){
const v170=v163;
const v171=v166;
let v172;if(v171===0 ){
v172=0;}else{
v172=(Math.trunc(v170/v171)+0);}
const v173=v172;
const v174=v164;
v169=(((v173) + (v174)) >>> 0);}else{
const v175=v164;
const v176=v166;
let v177;if(v176===0 ){
v177=0;}else{
v177=((v175%v176)+0);}
const v178=v177;
const v179=v163;
v169=(((v178) + (v179)) >>> 0);}
return v169;}
function __into0(v180,v181,v182,v183,v184){
const v185=v180;
const v186=v185.length;
const v187=__ink_work_2402d4d4ed79cf0f_construct(9,new Array(v186));
for(let v188=0;v188<v186;v188++){__ink_work_2402d4d4ed79cf0f_hit(10);
const v189=v185[v188];
const v190=(v188>>>0);
const v191=v190;
const v192=v189;
const v193=v182;
const v194=v183;
/* inline left_word */
const v195=v191;
const v196=v192;
const v197=v193;
const v198=v194;
/* inline left_signal */
const v199=v196;
const v200=v198;
let v201;if(v200===0 ){
v201=0;}else{
v201=(Math.trunc(v199/v200)+0);}
const v202=v201;
const v203=v195;
const v204=v198;
let v205;if(v204===0 ){
v205=0;}else{
v205=((v203%v204)+0);}
const v206=v205;
const v207=(((v202) + (v206)) >>> 0);
const v208=v197;
v187[v188]=(((v207) + (v208)) >>> 0);
}
const v209=v187;
const v210=v181;
const v211=v209.length;
const v212=v210.length;
const v213=__ink_work_2402d4d4ed79cf0f_construct(11,new Array(v211+v212));
for(let v214=0;v214<v211;v214++){__ink_work_2402d4d4ed79cf0f_hit(12);v213[v214]=v209[v214];}
for(let v215=0;v215<v212;v215++){__ink_work_2402d4d4ed79cf0f_hit(13);v213[v211+v215]=v210[v215];}
const v216=v213;
const v217=v180;
const v218=v217.length;
const v219=__ink_work_2402d4d4ed79cf0f_construct(14,new Array(v218));
for(let v220=0;v220<v218;v220++){__ink_work_2402d4d4ed79cf0f_hit(15);
const v221=v217[v220];
const v222=(v220>>>0);
const v223=v222;
const v224=v221;
const v225=v182;
const v226=v183;
/* inline right_word */
const v227=v223;
const v228=v224;
const v229=v225;
const v230=v226;
/* inline right_signal */
const v231=v227;
const v232=v229;
let v233;if(((v231) < (v232))){
const v234=v228;
const v235=v230;
v233=(((v234) + (v235)) >>> 0);}else{
const v236=v228;
const v237=3;
v233=(Math.imul(v236,v237) >>> 0);}
v219[v220]=v233;
}
const v238=v219;
const v239=Math.min(v216.length,v238.length);
for(let v241=0;v241<v239;v241++){__ink_work_2402d4d4ed79cf0f_hit(16);
const v242=v216[v241];
const v243=v238[v241];
const v244=v242;
const v245=v243;
const v246=v182;
const v247=v183;
/* inline pair_word */
const v248=v244;
const v249=v245;
const v250=v246;
const v251=v247;
/* inline pair_signal */
const v252=v248;
const v253=v249;
let v254;if(((v252) < (v253))){
const v255=v248;
const v256=v251;
let v257;if(v256===0 ){
v257=0;}else{
v257=(Math.trunc(v255/v256)+0);}
const v258=v257;
const v259=v249;
v254=(((v258) + (v259)) >>> 0);}else{
const v260=v249;
const v261=v251;
let v262;if(v261===0 ){
v262=0;}else{
v262=((v260%v261)+0);}
const v263=v262;
const v264=v248;
v254=(((v263) + (v264)) >>> 0);}
v184[v241]=v254;
}
return v239;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v4","core_sha256":"3d4aedfd3201eccac67b007d6b3a3449c7c894c87200b6f8602638941558f85f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline38_left_padded_zip_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"right_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"pair_word","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"pair_signal","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_2402d4d4ed79cf0f_allocate(17,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_2402d4d4ed79cf0f_allocate(18,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

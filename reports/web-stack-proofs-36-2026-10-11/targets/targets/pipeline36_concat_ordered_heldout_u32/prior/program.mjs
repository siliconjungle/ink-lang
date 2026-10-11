function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline left_word */
const v12=v9;
const v13=v11;
/* inline calibrate_left */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v10;
v6[v7]=(((v17) + (v18)) >>> 0);
}
const v19=v6;
const v20=v1;
const v21=v20.length;
const v22=new Array(v21);
for(let v23=0;v23<v21;v23++){
const v24=v20[v23];
const v25=v24;
const v26=v2;
const v27=v3;
/* inline right_word */
const v28=v25;
const v29=v27;
/* inline calibrate_right */
const v30=v28;
const v31=v29;
let v32;if(v31===0 ){
v32=0;}else{
v32=((v30%v31)+0);}
const v33=v32;
const v34=v27;
v22[v23]=(((v33) + (v34)) >>> 0);
}
const v35=v22;
let v36=v2;
for(let v37=v35.length-1;v37>=0;v37--){
const v38=v35[v37];
const v39=v38;
const v40=v36;
const v41=v2;
const v42=v3;
/* inline reduce_word */
const v43=v39;
const v44=v40;
const v45=v41;
const v46=v42;
/* inline mix_word */
const v47=v44;
const v48=v45;
let v49;if(((v47) < (v48))){
const v50=v43;
const v51=v44;
const v52=v46;
const v53=(Math.imul(v51,v52) >>> 0);
v49=(((v50) + (v53)) >>> 0);}else{
const v54=v43;
const v55=v44;
v49=(((v54) - (v55)) >>> 0);}
v36=v49;
}
let v56=v36;
for(let v57=v19.length-1;v57>=0;v57--){
const v58=v19[v57];
const v59=v58;
const v60=v56;
const v61=v2;
const v62=v3;
/* inline reduce_word */
const v63=v59;
const v64=v60;
const v65=v61;
const v66=v62;
/* inline mix_word */
const v67=v64;
const v68=v65;
let v69;if(((v67) < (v68))){
const v70=v63;
const v71=v64;
const v72=v66;
const v73=(Math.imul(v71,v72) >>> 0);
v69=(((v70) + (v73)) >>> 0);}else{
const v74=v63;
const v75=v64;
v69=(((v74) - (v75)) >>> 0);}
v56=v69;
}
return v56;}
function __fn1(v76,v77,v78){
const v79=v76;
const v80=v78;
/* inline calibrate_left */
const v81=v79;
const v82=v80;
let v83;if(v82===0 ){
v83=0;}else{
v83=(Math.trunc(v81/v82)+0);}
const v84=v83;
const v85=v77;
return (((v84) + (v85)) >>> 0);}
function __fn2(v86,v87){
const v88=v86;
const v89=v87;
let v90;if(v89===0 ){
v90=0;}else{
v90=(Math.trunc(v88/v89)+0);}
return v90;}
function __fn3(v91,v92,v93){
const v94=v91;
const v95=v93;
/* inline calibrate_right */
const v96=v94;
const v97=v95;
let v98;if(v97===0 ){
v98=0;}else{
v98=((v96%v97)+0);}
const v99=v98;
const v100=v93;
return (((v99) + (v100)) >>> 0);}
function __fn4(v101,v102){
const v103=v101;
const v104=v102;
let v105;if(v104===0 ){
v105=0;}else{
v105=((v103%v104)+0);}
return v105;}
function __fn5(v106,v107,v108,v109){
const v110=v106;
const v111=v107;
const v112=v108;
const v113=v109;
/* inline mix_word */
const v114=v111;
const v115=v112;
let v116;if(((v114) < (v115))){
const v117=v110;
const v118=v111;
const v119=v113;
const v120=(Math.imul(v118,v119) >>> 0);
v116=(((v117) + (v120)) >>> 0);}else{
const v121=v110;
const v122=v111;
v116=(((v121) - (v122)) >>> 0);}
return v116;}
function __fn6(v123,v124,v125,v126){
const v127=v124;
const v128=v125;
let v129;if(((v127) < (v128))){
const v130=v123;
const v131=v124;
const v132=v126;
const v133=(Math.imul(v131,v132) >>> 0);
v129=(((v130) + (v133)) >>> 0);}else{
const v134=v123;
const v135=v124;
v129=(((v134) - (v135)) >>> 0);}
return v129;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"0e5650f8eff65d96beab96ea86a6e3e745b343831574267352bd29052e410880","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_concat_ordered_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

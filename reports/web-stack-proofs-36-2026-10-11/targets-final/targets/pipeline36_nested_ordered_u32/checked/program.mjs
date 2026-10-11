function __fn0(v0,v1,v2,v3){
const v4=v0;
let v5=v2;
for(let v6=v4.length-1;v6>=0;v6--){
const v7=v4[v6];
const v8=v7;
const v9=v2;
const v10=v3;
/* inline left_word */
const v11=v8;
const v12=v10;
/* inline calibrate_left */
const v13=v11;
const v14=v12;
let v15;if(v14===0 ){
v15=0;}else{
v15=(Math.trunc(v13/v14)+0);}
const v16=v15;
const v17=v9;
const v18=(((v16) + (v17)) >>> 0);
const v19=v2;
const v20=v3;
/* inline post_word */
const v21=v18;
const v22=v19;
const v23=v20;
/* inline repair_word */
const v24=v21;
const v25=v22;
let v26;if(((v24) < (v25))){
const v27=v21;
const v28=v23;
v26=(((v27) + (v28)) >>> 0);}else{
const v29=v21;
const v30=v23;
v26=(((v29) - (v30)) >>> 0);}
const v31=v26;
const v32=v5;
const v33=v2;
const v34=v3;
/* inline reduce_word */
const v35=v31;
const v36=v32;
const v37=v33;
const v38=v34;
/* inline mix_word */
const v39=v36;
const v40=v37;
let v41;if(((v39) < (v40))){
const v42=v35;
const v43=v36;
const v44=v38;
const v45=(Math.imul(v43,v44) >>> 0);
v41=(((v42) + (v45)) >>> 0);}else{
const v46=v35;
const v47=v36;
v41=(((v46) - (v47)) >>> 0);}
v5=v41;
}
return v5;}
function __fn1(v48,v49,v50){
const v51=v48;
const v52=v50;
/* inline calibrate_left */
const v53=v51;
const v54=v52;
let v55;if(v54===0 ){
v55=0;}else{
v55=(Math.trunc(v53/v54)+0);}
const v56=v55;
const v57=v49;
return (((v56) + (v57)) >>> 0);}
function __fn2(v58,v59){
const v60=v58;
const v61=v59;
let v62;if(v61===0 ){
v62=0;}else{
v62=(Math.trunc(v60/v61)+0);}
return v62;}
function __fn3(v63,v64,v65){
const v66=v63;
const v67=v65;
/* inline calibrate_right */
const v68=v66;
const v69=v67;
let v70;if(v69===0 ){
v70=0;}else{
v70=((v68%v69)+0);}
const v71=v70;
const v72=v65;
return (((v71) + (v72)) >>> 0);}
function __fn4(v73,v74){
const v75=v73;
const v76=v74;
let v77;if(v76===0 ){
v77=0;}else{
v77=((v75%v76)+0);}
return v77;}
function __fn5(v78,v79,v80,v81){
const v82=v78;
const v83=v79;
const v84=v80;
const v85=v81;
/* inline mix_word */
const v86=v83;
const v87=v84;
let v88;if(((v86) < (v87))){
const v89=v82;
const v90=v83;
const v91=v85;
const v92=(Math.imul(v90,v91) >>> 0);
v88=(((v89) + (v92)) >>> 0);}else{
const v93=v82;
const v94=v83;
v88=(((v93) - (v94)) >>> 0);}
return v88;}
function __fn6(v95,v96,v97,v98){
const v99=v96;
const v100=v97;
let v101;if(((v99) < (v100))){
const v102=v95;
const v103=v96;
const v104=v98;
const v105=(Math.imul(v103,v104) >>> 0);
v101=(((v102) + (v105)) >>> 0);}else{
const v106=v95;
const v107=v96;
v101=(((v106) - (v107)) >>> 0);}
return v101;}
function __fn7(v108,v109,v110){
const v111=v108;
const v112=v109;
const v113=v110;
/* inline repair_word */
const v114=v111;
const v115=v112;
let v116;if(((v114) < (v115))){
const v117=v111;
const v118=v113;
v116=(((v117) + (v118)) >>> 0);}else{
const v119=v111;
const v120=v113;
v116=(((v119) - (v120)) >>> 0);}
return v116;}
function __fn8(v121,v122,v123){
const v124=v121;
const v125=v122;
let v126;if(((v124) < (v125))){
const v127=v121;
const v128=v123;
v126=(((v127) + (v128)) >>> 0);}else{
const v129=v121;
const v130=v123;
v126=(((v129) - (v130)) >>> 0);}
return v126;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"3faece8f747ad8c3a802f946346c2094e9755aba309d758e8eaee02914f17f12","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_nested_ordered_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"post_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":8,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

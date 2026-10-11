function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v2;
const v13=v3;
/* inline selected_word */
const v14=v11;
const v15=v12;
const v16=v13;
/* inline repair_word */
const v17=v14;
const v18=v15;
let v19;if(((v17) < (v18))){
const v20=v14;
const v21=v16;
let v22;if(v21===0 ){
v22=0;}else{
v22=(Math.trunc(v20/v21)+0);}
const v23=v22;
const v24=v15;
v19=(((v23) + (v24)) >>> 0);}else{
const v25=v14;
const v26=v16;
let v27;if(v26===0 ){
v27=0;}else{
v27=((v25%v26)+0);}
const v28=v27;
const v29=v16;
v19=(((v28) + (v29)) >>> 0);}
v7[v8]=v19;
}
return v7;}
function __fn1(v30,v31,v32,v33){
const v34=v30;
const v35=v31;
const v36=v32;
const v37=v33;
/* inline index_signal */
const v38=v35;
const v39=v37;
let v40;if(v39===0 ){
v40=0;}else{
v40=(Math.trunc(v38/v39)+0);}
const v41=v40;
const v42=v34;
const v43=v37;
let v44;if(v43===0 ){
v44=0;}else{
v44=((v42%v43)+0);}
const v45=v44;
const v46=(((v41) + (v45)) >>> 0);
const v47=v36;
return (((v46) + (v47)) >>> 0);}
function __fn2(v48,v49,v50,v51){
const v52=v49;
const v53=v51;
let v54;if(v53===0 ){
v54=0;}else{
v54=(Math.trunc(v52/v53)+0);}
const v55=v54;
const v56=v48;
const v57=v51;
let v58;if(v57===0 ){
v58=0;}else{
v58=((v56%v57)+0);}
const v59=v58;
const v60=(((v55) + (v59)) >>> 0);
const v61=v50;
return (((v60) + (v61)) >>> 0);}
function __fn3(v62,v63,v64){
const v65=v62;
const v66=v63;
const v67=v64;
/* inline repair_word */
const v68=v65;
const v69=v66;
let v70;if(((v68) < (v69))){
const v71=v65;
const v72=v67;
let v73;if(v72===0 ){
v73=0;}else{
v73=(Math.trunc(v71/v72)+0);}
const v74=v73;
const v75=v66;
v70=(((v74) + (v75)) >>> 0);}else{
const v76=v65;
const v77=v67;
let v78;if(v77===0 ){
v78=0;}else{
v78=((v76%v77)+0);}
const v79=v78;
const v80=v67;
v70=(((v79) + (v80)) >>> 0);}
return v70;}
function __fn4(v81,v82,v83){
const v84=v81;
const v85=v82;
let v86;if(((v84) < (v85))){
const v87=v81;
const v88=v83;
let v89;if(v88===0 ){
v89=0;}else{
v89=(Math.trunc(v87/v88)+0);}
const v90=v89;
const v91=v82;
v86=(((v90) + (v91)) >>> 0);}else{
const v92=v81;
const v93=v83;
let v94;if(v93===0 ){
v94=0;}else{
v94=((v92%v93)+0);}
const v95=v94;
const v96=v83;
v86=(((v95) + (v96)) >>> 0);}
return v86;}
function __into0(v97,v98,v99,v100,v101){
const v102=v97;
const v103=v98;
const v104=Math.min(v102.length,v103.length);
for(let v106=0;v106<v104;v106++){
const v107=v102[v106];
const v108=v103[v106];
const v109=v107;
const v110=v99;
const v111=v100;
/* inline selected_word */
const v112=v109;
const v113=v110;
const v114=v111;
/* inline repair_word */
const v115=v112;
const v116=v113;
let v117;if(((v115) < (v116))){
const v118=v112;
const v119=v114;
let v120;if(v119===0 ){
v120=0;}else{
v120=(Math.trunc(v118/v119)+0);}
const v121=v120;
const v122=v113;
v117=(((v121) + (v122)) >>> 0);}else{
const v123=v112;
const v124=v114;
let v125;if(v124===0 ){
v125=0;}else{
v125=((v123%v124)+0);}
const v126=v125;
const v127=v114;
v117=(((v126) + (v127)) >>> 0);}
v101[v106]=v117;
}
return v104;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"5dd08b71266a72d32561ce0b4bf37de3a88ad535ca9e14df9ac7430a364a826a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline37_right_projection_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_index","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"index_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"selected_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"repair_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

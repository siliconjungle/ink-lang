function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline discarded_word */
const v12=v9;
const v13=v11;
let v14;if(v13===0 ){
v14=0;}else{
v14=(Math.trunc(v12/v13)+0);}
const v15=v14;
const v16=v9;
const v17=v11;
let v18;if(v17===0 ){
v18=0;}else{
v18=((v16%v17)+0);}
const v19=v18;
const v20=(((v15) + (v19)) >>> 0);
const v21=v10;
v6[v7]=(((v20) + (v21)) >>> 0);
}
const v22=v6;
const v23=new Array(v22.length);
let v24=0;
for(let v25=0;v25<v22.length;v25++){
const v26=v22[v25];
v24=(((v24) + (v26)) >>> 0);v23[v25]=v24;}
const v27=v23;
const v28=new Array(v27.length);
let v29=0;
for(let v30=0;v30<v27.length;v30++){
const v31=v27[v30];
v29=(((v29) + (v31)) >>> 0);v28[v30]=v29;}
const v32=v28;
const v33=v1;
const v34=Math.min(v32.length,v33.length);
const v35=new Array(v34);
for(let v36=0;v36<v34;v36++){
const v37=v32[v36];
const v38=v33[v36];
const v39=v38;
const v40=v2;
const v41=v3;
/* inline selected_word */
const v42=v39;
const v43=v40;
let v44;if(((v42) < (v43))){
const v45=v39;
const v46=v41;
let v47;if(v46===0 ){
v47=0;}else{
v47=(Math.trunc(v45/v46)+0);}
const v48=v47;
const v49=v40;
v44=(((v48) + (v49)) >>> 0);}else{
const v50=v39;
const v51=v41;
let v52;if(v51===0 ){
v52=0;}else{
v52=((v50%v51)+0);}
const v53=v52;
const v54=v41;
v44=(((v53) + (v54)) >>> 0);}
v35[v36]=v44;
}
return v35;}
function __fn1(v55,v56,v57){
const v58=v55;
const v59=v56;
let v60;if(((v58) < (v59))){
const v61=v55;
const v62=v57;
let v63;if(v62===0 ){
v63=0;}else{
v63=(Math.trunc(v61/v62)+0);}
const v64=v63;
const v65=v56;
v60=(((v64) + (v65)) >>> 0);}else{
const v66=v55;
const v67=v57;
let v68;if(v67===0 ){
v68=0;}else{
v68=((v66%v67)+0);}
const v69=v68;
const v70=v57;
v60=(((v69) + (v70)) >>> 0);}
return v60;}
function __fn2(v71,v72,v73){
const v74=v71;
const v75=v73;
let v76;if(v75===0 ){
v76=0;}else{
v76=(Math.trunc(v74/v75)+0);}
const v77=v76;
const v78=v71;
const v79=v73;
let v80;if(v79===0 ){
v80=0;}else{
v80=((v78%v79)+0);}
const v81=v80;
const v82=(((v77) + (v81)) >>> 0);
const v83=v72;
return (((v82) + (v83)) >>> 0);}
function __into0(v84,v85,v86,v87,v88){
const v89=v84;
const v90=v89.length;
const v91=new Array(v90);
for(let v92=0;v92<v90;v92++){
const v93=v89[v92];
const v94=v93;
const v95=v86;
const v96=v87;
/* inline discarded_word */
const v97=v94;
const v98=v96;
let v99;if(v98===0 ){
v99=0;}else{
v99=(Math.trunc(v97/v98)+0);}
const v100=v99;
const v101=v94;
const v102=v96;
let v103;if(v102===0 ){
v103=0;}else{
v103=((v101%v102)+0);}
const v104=v103;
const v105=(((v100) + (v104)) >>> 0);
const v106=v95;
v91[v92]=(((v105) + (v106)) >>> 0);
}
const v107=v91;
const v108=new Array(v107.length);
let v109=0;
for(let v110=0;v110<v107.length;v110++){
const v111=v107[v110];
v109=(((v109) + (v111)) >>> 0);v108[v110]=v109;}
const v112=v108;
const v113=new Array(v112.length);
let v114=0;
for(let v115=0;v115<v112.length;v115++){
const v116=v112[v115];
v114=(((v114) + (v116)) >>> 0);v113[v115]=v114;}
const v117=v113;
const v118=v85;
const v119=Math.min(v117.length,v118.length);
for(let v121=0;v121<v119;v121++){
const v122=v117[v121];
const v123=v118[v121];
const v124=v123;
const v125=v86;
const v126=v87;
/* inline selected_word */
const v127=v124;
const v128=v125;
let v129;if(((v127) < (v128))){
const v130=v124;
const v131=v126;
let v132;if(v131===0 ){
v132=0;}else{
v132=(Math.trunc(v130/v131)+0);}
const v133=v132;
const v134=v125;
v129=(((v133) + (v134)) >>> 0);}else{
const v135=v124;
const v136=v126;
let v137;if(v136===0 ){
v137=0;}else{
v137=((v135%v136)+0);}
const v138=v137;
const v139=v126;
v129=(((v138) + (v139)) >>> 0);}
v88[v121]=v129;
}
return v119;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"caad42d6f303a22ba67b2193a289be38f87076e800c41d4c4b9fb6eccf6773cc","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_left_projection_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"discarded_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

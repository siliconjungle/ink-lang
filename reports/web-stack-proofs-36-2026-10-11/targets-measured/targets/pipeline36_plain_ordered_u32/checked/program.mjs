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
const v19=v5;
const v20=v2;
const v21=v3;
/* inline reduce_word */
const v22=v18;
const v23=v19;
const v24=v20;
const v25=v21;
/* inline mix_word */
const v26=v23;
const v27=v24;
let v28;if(((v26) < (v27))){
const v29=v22;
const v30=v23;
const v31=v25;
const v32=(Math.imul(v30,v31) >>> 0);
v28=(((v29) + (v32)) >>> 0);}else{
const v33=v22;
const v34=v23;
v28=(((v33) - (v34)) >>> 0);}
v5=v28;
}
return v5;}
function __fn1(v35,v36,v37){
const v38=v35;
const v39=v37;
/* inline calibrate_left */
const v40=v38;
const v41=v39;
let v42;if(v41===0 ){
v42=0;}else{
v42=(Math.trunc(v40/v41)+0);}
const v43=v42;
const v44=v36;
return (((v43) + (v44)) >>> 0);}
function __fn2(v45,v46){
const v47=v45;
const v48=v46;
let v49;if(v48===0 ){
v49=0;}else{
v49=(Math.trunc(v47/v48)+0);}
return v49;}
function __fn3(v50,v51,v52){
const v53=v50;
const v54=v52;
/* inline calibrate_right */
const v55=v53;
const v56=v54;
let v57;if(v56===0 ){
v57=0;}else{
v57=((v55%v56)+0);}
const v58=v57;
const v59=v52;
return (((v58) + (v59)) >>> 0);}
function __fn4(v60,v61){
const v62=v60;
const v63=v61;
let v64;if(v63===0 ){
v64=0;}else{
v64=((v62%v63)+0);}
return v64;}
function __fn5(v65,v66,v67,v68){
const v69=v65;
const v70=v66;
const v71=v67;
const v72=v68;
/* inline mix_word */
const v73=v70;
const v74=v71;
let v75;if(((v73) < (v74))){
const v76=v69;
const v77=v70;
const v78=v72;
const v79=(Math.imul(v77,v78) >>> 0);
v75=(((v76) + (v79)) >>> 0);}else{
const v80=v69;
const v81=v70;
v75=(((v80) - (v81)) >>> 0);}
return v75;}
function __fn6(v82,v83,v84,v85){
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
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"e56200087daf9a0d3f331e1eeab40aa10cada4c27106f428f2c8df0045dea0f0","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_plain_ordered_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

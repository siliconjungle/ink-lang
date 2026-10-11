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
let v16;if(((v14) < (v15))){
const v17=v11;
const v18=v13;
v16=(((v17) + (v18)) >>> 0);}else{
const v19=v11;
const v20=v13;
v16=(((v19) - (v20)) >>> 0);}
v7[v8]=v16;
}
return v7;}
function __fn1(v21,v22,v23){
const v24=v21;
const v25=v22;
let v26;if(((v24) < (v25))){
const v27=v21;
const v28=v23;
v26=(((v27) + (v28)) >>> 0);}else{
const v29=v21;
const v30=v23;
v26=(((v29) - (v30)) >>> 0);}
return v26;}
function __into0(v31,v32,v33,v34,v35){
const v36=v31;
const v37=v32;
const v38=Math.min(v36.length,v37.length);
for(let v40=0;v40<v38;v40++){
const v41=v36[v40];
const v42=v37[v40];
const v43=v41;
const v44=v33;
const v45=v34;
/* inline selected_word */
const v46=v43;
const v47=v44;
let v48;if(((v46) < (v47))){
const v49=v43;
const v50=v45;
v48=(((v49) + (v50)) >>> 0);}else{
const v51=v43;
const v52=v45;
v48=(((v51) - (v52)) >>> 0);}
v35[v40]=v48;
}
return v38;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"e8eca1035718991301710103cfc07dc936905ce0a2d034c6634f03464ead40f1","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

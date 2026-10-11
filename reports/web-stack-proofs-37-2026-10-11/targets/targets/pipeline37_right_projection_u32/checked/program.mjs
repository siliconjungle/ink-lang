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
function __fn1(v21,v22,v23,v24){
const v25=v21;
const v26=v23;
let v27;if(((v25) < (v26))){
const v28=v22;
const v29=v24;
const v30=(((v28) + (v29)) >>> 0);
const v31=v21;
v27=(((v30) + (v31)) >>> 0);}else{
const v32=v22;
const v33=v23;
v27=(((v32) - (v33)) >>> 0);}
return v27;}
function __fn2(v34,v35,v36){
const v37=v34;
const v38=v35;
let v39;if(((v37) < (v38))){
const v40=v34;
const v41=v36;
v39=(((v40) + (v41)) >>> 0);}else{
const v42=v34;
const v43=v36;
v39=(((v42) - (v43)) >>> 0);}
return v39;}
function __into0(v44,v45,v46,v47,v48){
const v49=v44;
const v50=v45;
const v51=Math.min(v49.length,v50.length);
for(let v53=0;v53<v51;v53++){
const v54=v49[v53];
const v55=v50[v53];
const v56=v54;
const v57=v46;
const v58=v47;
/* inline selected_word */
const v59=v56;
const v60=v57;
let v61;if(((v59) < (v60))){
const v62=v56;
const v63=v58;
v61=(((v62) + (v63)) >>> 0);}else{
const v64=v56;
const v65=v58;
v61=(((v64) - (v65)) >>> 0);}
v48[v53]=v61;
}
return v51;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"73b32fe58d4f7ee76737bb6d4cc7e90438933bcd4fdec9cb82e30047d864e3d3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline37_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_index","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"selected_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

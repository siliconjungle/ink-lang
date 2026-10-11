function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=new Array(v5.length);
let v7=0;
for(let v8=0;v8<v5.length;v8++){
const v9=v5[v8];
v7=(((v7) + (v9)) >>> 0);v6[v8]=v7;}
const v10=v6;
const v11=Math.min(v4.length,v10.length);
const v12=new Array(v11);
for(let v13=0;v13<v11;v13++){
const v14=v4[v13];
const v15=v10[v13];
const v16=v14;
const v17=v2;
const v18=v3;
/* inline selected_word */
const v19=v16;
const v20=v17;
let v21;if(((v19) < (v20))){
const v22=v16;
const v23=v18;
v21=(((v22) + (v23)) >>> 0);}else{
const v24=v16;
const v25=v18;
v21=(((v24) - (v25)) >>> 0);}
v12[v13]=v21;
}
return v12;}
function __fn1(v26,v27,v28){
const v29=v26;
const v30=v27;
let v31;if(((v29) < (v30))){
const v32=v26;
const v33=v28;
v31=(((v32) + (v33)) >>> 0);}else{
const v34=v26;
const v35=v28;
v31=(((v34) - (v35)) >>> 0);}
return v31;}
function __into0(v36,v37,v38,v39,v40){
const v41=v36;
const v42=v37;
const v43=new Array(v42.length);
let v44=0;
for(let v45=0;v45<v42.length;v45++){
const v46=v42[v45];
v44=(((v44) + (v46)) >>> 0);v43[v45]=v44;}
const v47=v43;
const v48=Math.min(v41.length,v47.length);
for(let v50=0;v50<v48;v50++){
const v51=v41[v50];
const v52=v47[v50];
const v53=v51;
const v54=v38;
const v55=v39;
/* inline selected_word */
const v56=v53;
const v57=v54;
let v58;if(((v56) < (v57))){
const v59=v53;
const v60=v55;
v58=(((v59) + (v60)) >>> 0);}else{
const v61=v53;
const v62=v55;
v58=(((v61) - (v62)) >>> 0);}
v40[v50]=v58;
}
return v48;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"971d742ea6a2ea9bc6f05b18fe980a2c8f67890be4eb31d18c3e1018c9f5156a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

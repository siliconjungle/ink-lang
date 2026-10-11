function __fn0(v0,v1,v2){
const v3=v0;
const v4=v3.length;
const v5=new Array(v4);
for(let v6=0;v6<v4;v6++){
const v7=v3[v6];
const v8=v7;
const v9=v1;
const v10=v2;
/* inline word */
const v11=v8;
const v12=v10;
let v13;if(v12===0 ){
v13=0;}else{
v13=(Math.trunc(v11/v12)+0);}
const v14=v13;
const v15=v9;
v5[v6]=(((v14) + (v15)) >>> 0);
}
const v16=v5;
let v17=v1;
for(let v18=v16.length-1;v18>=0;v18--){
const v19=v16[v18];
const v20=v19;
const v21=v17;
const v22=v1;
const v23=v2;
/* inline mix */
const v24=v21;
const v25=v22;
let v26;if(((v24) < (v25))){
const v27=v20;
const v28=v21;
const v29=v23;
const v30=(Math.imul(v28,v29) >>> 0);
v26=(((v27) + (v30)) >>> 0);}else{
const v31=v20;
const v32=v21;
v26=(((v31) - (v32)) >>> 0);}
v17=v26;
}
return v17;}
function __fn1(v33,v34,v35){
const v36=v33;
const v37=v35;
let v38;if(v37===0 ){
v38=0;}else{
v38=(Math.trunc(v36/v37)+0);}
const v39=v38;
const v40=v34;
return (((v39) + (v40)) >>> 0);}
function __fn2(v41,v42,v43,v44){
const v45=v42;
const v46=v43;
let v47;if(((v45) < (v46))){
const v48=v41;
const v49=v42;
const v50=v44;
const v51=(Math.imul(v49,v50) >>> 0);
v47=(((v48) + (v51)) >>> 0);}else{
const v52=v41;
const v53=v42;
v47=(((v52) - (v53)) >>> 0);}
return v47;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"63b59a851419d7e19c359dd2f01d2c1d306a2ed9780db6b1b37e163c9c6142b6","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_mapped_ordered_probe_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"mix","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

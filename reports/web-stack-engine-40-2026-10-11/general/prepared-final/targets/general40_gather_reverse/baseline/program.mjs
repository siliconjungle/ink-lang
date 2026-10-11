function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v1;
const v11=v2;
const v12=v9;
const v13=(((v11) - (v12)) >>> 0);
const v14=1;
const v15=(((v13) - (v14)) >>> 0);
let v16;if(v15<v10.length){v16=v10[v15];}else{
v16=v8;}
const v17=v16;
const v18=v8;
const v19=v3;
const v20=(Math.imul(v18,v19) >>> 0);
v6[v7]=(((v17) + (v20)) >>> 0);
}
return v6;}
function __into0(v21,v22,v23,v24,v25){
const v26=v21;
const v27=v26.length;
for(let v29=0;v29<v27;v29++){
const v30=v26[v29];
const v31=(v29>>>0);
const v32=v22;
const v33=v23;
const v34=v31;
const v35=(((v33) - (v34)) >>> 0);
const v36=1;
const v37=(((v35) - (v36)) >>> 0);
let v38;if(v37<v32.length){v38=v32[v37];}else{
v38=v30;}
const v39=v38;
const v40=v30;
const v41=v24;
const v42=(Math.imul(v40,v41) >>> 0);
v25[v29]=(((v39) + (v42)) >>> 0);
}
return v27;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"501591404c3811944c621f53987a51fec29d09b6e4ef7c89aca367f201acbe7f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_gather_reverse","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

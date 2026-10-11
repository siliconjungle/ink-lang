function __fn0(v0){
const v1=v0;
const v2=v1.length;
const v3=new Array(v2);
for(let v4=0;v4<v2;v4++){
const v5=v1[v4];
const v6=v5;
const v7=v6[0];
const v8=1;
const v9=(((v7) + (v8)) >>> 0);
const v10=v5;
const v11=v10[1];
const v12=3;
const v13=(Math.imul(v11,v12) >>> 0);
v3[v4]=[v9,v13];
}
const v14=v3;
const v15=v14.length;
const v16=v14;
let v17=0;
for(let v18=0;v18<v15;v18++){
const v19=v14[v18];
const v20=v19;
const v21=v20[0];
const v22=0;
if(((v21) > (v22))){v16[v17++]=v19;}
}
v16.length=v17;
return v16;}
function __into0(v23,v24){
const v25=v23;
const v26=v25.length;
const v27=new Array(v26);
for(let v28=0;v28<v26;v28++){
const v29=v25[v28];
const v30=v29;
const v31=v30[0];
const v32=1;
const v33=(((v31) + (v32)) >>> 0);
const v34=v29;
const v35=v34[1];
const v36=3;
const v37=(Math.imul(v35,v36) >>> 0);
v27[v28]=[v33,v37];
}
const v38=v27;
const v39=v38.length;
let v40=0;
for(let v41=0;v41<v39;v41++){
const v42=v38[v41];
const v43=v42;
const v44=v43[0];
const v45=0;
if(((v44) > (v45))){
v24[v40++]=v42;
}
}
return v40;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"d58ceb518b17ba8b92fa08e20a2d7528210780fd7a8c8657d137ea3f12eb8eab","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"vectors","params":[{"name":"xs","type":{"element":{"element":{"kind":"u32"},"kind":"vector","size":2},"kind":"list"}}],"result":{"element":{"element":{"kind":"u32"},"kind":"vector","size":2},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

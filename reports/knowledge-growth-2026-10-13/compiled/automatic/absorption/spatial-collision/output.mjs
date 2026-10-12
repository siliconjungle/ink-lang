function __fn0(v0,v1){
const v2=v0;
const v3=v2["minX"];
const v4=v1;
const v5=v4["maxX"];
const v6=((v3) <= (v5));
let v7=v6;if(v7){
const v8=v0;
const v9=v8["minY"];
const v10=v1;
const v11=v10["maxY"];
v7=((v9) <= (v11));}
const v12=v7;
let v13=v12;if(v13){
const v14=v0;
const v15=v14["maxX"];
const v16=v1;
const v17=v16["minX"];
v13=((v15) >= (v17));}
const v18=v13;
let v19=v18;if(v19){
const v20=v0;
const v21=v20["maxY"];
const v22=v1;
const v23=v22["minY"];
v19=((v21) >= (v23));}
return v19;}
function __fn1(v24,v25){
const v26=v24;
let v27=false;
for(let v28=0;v28<v26.length;v28++){
const v29=v26[v28];
const v30=v27;
let v31=v30;if(!v31){
const v32=v29;
const v33=v25;
v31=__fn0(v32,v33);}
v27=v31;
}
return v27;}
const __namedTypes={"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"d7ec714b376b0d6ef96de74d4c82a11f2e5fe1f69741e3a16c3769994167c14f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"intersects","parallel":false,"params":[{"name":"a","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},{"name":"b","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"},"kind":"list"}},{"name":"q","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}}],"named_types":{"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

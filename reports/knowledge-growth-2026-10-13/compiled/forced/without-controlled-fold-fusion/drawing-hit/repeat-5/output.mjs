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
const v27=v26.length;
const v28=[];
for(let v29=0;v29<v27;v29++){
const v30=v26[v29];
const v31=v30;
const v32=v31["minX"];
const v33=16;
if(((v32) >= (v33))){v28.push(v30);}
}
const v34=v28;
const v35=v34.length;
const v36=new Array(v35);
for(let v37=0;v37<v35;v37++){
const v38=v34[v37];
const v39=v38;
const v40=v25;
v36[v37]=__fn0(v39,v40);
}
const v41=v36;
let v42=false;
for(let v43=0;v43<v41.length;v43++){
const v44=v41[v43];
const v45=v42;
const v46=v42;
let v47=v46;if(!v47){
const v48=v44;
v47=v48;}
v42=v47;
if(v45)break;
}
return v42;}
const __namedTypes={"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v6","core_sha256":"3f6267daf1347b5345ad1a7dd30a825c8e9a157970d0b4fc1cfdfe023ac694a2","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"intersects","parallel":false,"params":[{"name":"a","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},{"name":"b","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"},"kind":"list"}},{"name":"q","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}}],"named_types":{"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

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
const v30=v29;
const v31=v30;
const v32=v31["minX"];
const v33=16;
const v34=((v32) >= (v33));
let v35=v34;if(v35){
const v36=v29;
const v37=v27;
const v38=v36;
const v39=v38;
const v40=v25;
const v41=__fn0(v39,v40);
const v42=v37;
v35=v42;}
const v43=v35;
const v44=v29;
const v45=v44;
const v46=v45["minX"];
const v47=16;
let v48;if(((v46) >= (v47))){
const v49=v29;
const v50=v27;
const v51=v49;
const v52=v51;
const v53=v25;
const v54=__fn0(v52,v53);
const v55=v50;
const v56=v55;
let v57=v56;if(!v57){
const v58=v54;
v57=v58;}
v48=v57;}else{
v48=v27;}
v27=v48;
if(v43)break;
}
return v27;}
const __namedTypes={"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v6","core_sha256":"6915353d70c542a26d25b9eb8bd18e16d16755f8bf3d31cdfb728f076e95141f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"intersects","parallel":false,"params":[{"name":"a","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},{"name":"b","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"},"kind":"list"}},{"name":"q","type":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}}],"precondition":null,"result":{"kind":"bool"}}],"named_types":{"Box":{"fields":[{"name":"minX","type":{"kind":"u32"}},{"name":"minY","type":{"kind":"u32"}},{"name":"maxX","type":{"kind":"u32"}},{"name":"maxY","type":{"kind":"u32"}}],"kind":"record","name":"Box"}},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

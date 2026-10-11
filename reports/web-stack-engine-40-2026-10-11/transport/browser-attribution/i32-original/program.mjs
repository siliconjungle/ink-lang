function __fn0(v0){
const v1=v0;
const v2=v1.length;
const v3=new Array(v2);
for(let v4=0;v4<v2;v4++){
const v5=v1[v4];
const v6=v5;
const v7=1;
v3[v4]=(((v6) + (v7)) | 0);
}
const v8=v3;
const v9=v8.length;
const v10=v8;
let v11=0;
for(let v12=0;v12<v9;v12++){
const v13=v8[v12];
const v14=v13;
const v15=0;
if(((v14) < (v15))){v10[v11++]=v13;}
}
v10.length=v11;
const v16=v10;
const v17=v16.length;
const v18=v16;
let v19=0;
for(let v20=0;v20<v17;v20++){
const v21=v16[v20];
v19=(((v19) + (v21)) | 0);v18[v20]=v19;}
return v18;}
function __into0(v22,v23){
const v24=v22;
const v25=v24.length;
const v26=new Array(v25);
for(let v27=0;v27<v25;v27++){
const v28=v24[v27];
const v29=v28;
const v30=1;
v26[v27]=(((v29) + (v30)) | 0);
}
const v31=v26;
const v32=v31.length;
let v33=0;
for(let v34=0;v34<v32;v34++){
const v35=v31[v34];
const v36=v35;
const v37=0;
if(((v36) < (v37))){
v23[v33++]=v35;
}
}
let v38=0;
for(let v39=0;v39<v33;v39++){
const v40=v23[v39];
v38=(((v38) + (v40)) | 0);
v23[v39]=v38;
}
return v33;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"dcd7e62d209c6eed0d7ba117a16c7271fec3528d2f64a7691bb4fa1a60a1f363","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"signed","params":[{"name":"xs","type":{"element":{"kind":"i32"},"kind":"list"}}],"result":{"element":{"kind":"i32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

function __fn0(v0,v1){
const v2=v0;
const v3=false;
const v4=0;
const v5=[];
let v6=({["seen"]:v3,["last"]:v4,["output"]:v5});
for(let v7=0;v7<v2.length;v7++){
const v8=v2[v7];
const v9=v6;
const v10=v9["seen"];
const v11=false;
const v12=(v10===v11);
let v13=v12;if(!v13){
const v14=v6;
const v15=v14["last"];
const v16=v8;
v13=!(v15===v16);}
let v17;if(v13){
const v18=true;
const v19=v8;
const v20=v6;
const v21=v20["output"];
const v22=v8;
const v23=[v22];
const v24=v21.length;
const v25=v23.length;
const v26=new Array(v24+v25);
for(let v27=0;v27<v24;v27++){v26[v27]=v21[v27];}
for(let v28=0;v28<v25;v28++){v26[v24+v28]=v23[v28];}
const v29=v26;
v17=({["seen"]:v18,["last"]:v19,["output"]:v29});}else{
v17=v6;}
v6=v17;
}
const v30=v6;
return v30["output"];}
function __into0(v31,v32,v33){
const v34=v31;
const v35=false;
const v36=0;
const v37=[];
let v38=({["seen"]:v35,["last"]:v36,["output"]:v37});
for(let v39=0;v39<v34.length;v39++){
const v40=v34[v39];
const v41=v38;
const v42=v41["seen"];
const v43=false;
const v44=(v42===v43);
let v45=v44;if(!v45){
const v46=v38;
const v47=v46["last"];
const v48=v40;
v45=!(v47===v48);}
let v49;if(v45){
const v50=true;
const v51=v40;
const v52=v38;
const v53=v52["output"];
const v54=v40;
const v55=[v54];
const v56=v53.length;
const v57=v55.length;
const v58=new Array(v56+v57);
for(let v59=0;v59<v56;v59++){v58[v59]=v53[v59];}
for(let v60=0;v60<v57;v60++){v58[v56+v60]=v55[v60];}
const v61=v58;
v49=({["seen"]:v50,["last"]:v51,["output"]:v61});}else{
v49=v38;}
v38=v49;
}
const v62=v38;
const v63=v62["output"];
const v64=v63.length;
for(let v65=0;v65<v64;v65++){
v33[v65]=v63[v65];
}
return v64;}
const __namedTypes={"DistinctState":{"fields":[{"name":"seen","type":{"kind":"bool"}},{"name":"last","type":{"kind":"u32"}},{"name":"output","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"DistinctState"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"57abb3fd09d2310f001759da691b0514a45611ddadc5c11d7a0f0f9094d2b29b","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"unused","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{"DistinctState":{"fields":[{"name":"seen","type":{"kind":"bool"}},{"name":"last","type":{"kind":"u32"}},{"name":"output","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"DistinctState"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

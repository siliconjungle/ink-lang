function __fn0(v0,v1){
const v2=v0;
let v3=false;
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
const v6=v3;
let v7=v6;if(!v7){
const v8=v5;
const v9=v1;
v7=(v8===v9);}
v3=v7;
}
return v3;}
function __fn1(v10,v11){
const v12=[];
const v13=v10;
const v14=v12;
let v15=({["out"]:v14});
for(let v16=0;v16<v13.length;v16++){
const v17=v13[v16];
const v18=v15;
const v19=v18["out"];
const v20=v19;
const v21=v17;
const v22=__fn0(v20,v21);
const v23=false;
let v24;if((v22===v23)){
const v25=v19;
const v26=v17;
const v27=[v26];
const v28=v25.length;
const v29=v27.length;
const v30=new Array(v28+v29);
for(let v31=0;v31<v28;v31++){v30[v31]=v25[v31];}
for(let v32=0;v32<v29;v32++){v30[v28+v32]=v27[v32];}
const v33=v30;
const v34=v33;
v24=({["out"]:v34});}else{
const v35=v19;
v24=({["out"]:v35});}
v15=v24;
}
const v36=v15;
const v37=v36;
const v38=v37["out"];
return v38;}
function __into1(v39,v40,v41){
const v42=[];
const v43=v39;
const v44=v42;
let v45=({["out"]:v44});
for(let v46=0;v46<v43.length;v46++){
const v47=v43[v46];
const v48=v45;
const v49=v48["out"];
const v50=v49;
const v51=v47;
const v52=__fn0(v50,v51);
const v53=false;
let v54;if((v52===v53)){
const v55=v49;
const v56=v47;
const v57=[v56];
const v58=v55.length;
const v59=v57.length;
const v60=new Array(v58+v59);
for(let v61=0;v61<v58;v61++){v60[v61]=v55[v61];}
for(let v62=0;v62<v59;v62++){v60[v58+v62]=v57[v62];}
const v63=v60;
const v64=v63;
v54=({["out"]:v64});}else{
const v65=v49;
v54=({["out"]:v65});}
v45=v54;
}
const v66=v45;
const v67=v66;
const v68=v67["out"];
const v69=v68.length;
for(let v70=0;v70<v69;v70++){
v41[v70]=v68[v70];
}
return v69;}
const __namedTypes={"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1":{"fields":[{"name":"out","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"609bcbbf83a55faace1c01c21c43ce2069ce14c4a247ef1dae29247d9401a4c0","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"contains","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"x","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"unused","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1":{"fields":[{"name":"out","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1"}},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,__into1];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

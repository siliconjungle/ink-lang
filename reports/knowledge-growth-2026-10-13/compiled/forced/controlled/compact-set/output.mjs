function __fn0(v0,v1){
const v2=v0;
let v3=false;
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
const v6=v3;
const v7=v3;
let v8=v7;if(!v8){
const v9=v5;
const v10=v9;
const v11=v1;
v8=(v10===v11);}
v3=v8;
if(v6)break;
}
return v3;}
function __fn1(v12,v13){
const v14=[];
const v15=v12;
const v16=v14;
let v17=({["out"]:v16});
for(let v18=0;v18<v15.length;v18++){
const v19=v15[v18];
const v20=v17;
const v21=v20["out"];
const v22=v21;
const v23=v19;
const v24=__fn0(v22,v23);
const v25=false;
let v26;if((v24===v25)){
const v27=v21;
const v28=v19;
const v29=[v28];
const v30=v27.length;
const v31=v29.length;
const v32=new Array(v30+v31);
for(let v33=0;v33<v30;v33++){v32[v33]=v27[v33];}
for(let v34=0;v34<v31;v34++){v32[v30+v34]=v29[v34];}
const v35=v32;
const v36=v35;
v26=({["out"]:v36});}else{
const v37=v21;
v26=({["out"]:v37});}
v17=v26;
}
const v38=v17;
const v39=v38;
const v40=v39["out"];
return v40;}
function __into1(v41,v42,v43){
const v44=[];
const v45=v41;
const v46=v44;
let v47=({["out"]:v46});
for(let v48=0;v48<v45.length;v48++){
const v49=v45[v48];
const v50=v47;
const v51=v50["out"];
const v52=v51;
const v53=v49;
const v54=__fn0(v52,v53);
const v55=false;
let v56;if((v54===v55)){
const v57=v51;
const v58=v49;
const v59=[v58];
const v60=v57.length;
const v61=v59.length;
const v62=new Array(v60+v61);
for(let v63=0;v63<v60;v63++){v62[v63]=v57[v63];}
for(let v64=0;v64<v61;v64++){v62[v60+v64]=v59[v64];}
const v65=v62;
const v66=v65;
v56=({["out"]:v66});}else{
const v67=v51;
v56=({["out"]:v67});}
v47=v56;
}
const v68=v47;
const v69=v68;
const v70=v69["out"];
const v71=v70.length;
for(let v72=0;v72<v71;v72++){
v43[v72]=v70[v72];
}
return v71;}
const __namedTypes={"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1":{"fields":[{"name":"out","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"a82dea1c9a525a28236e7bc6aad3bf3256bc9eb688f36663bbc8ded9fd322717","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"contains","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"x","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"unused","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1":{"fields":[{"name":"out","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_1"}},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,__into1];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

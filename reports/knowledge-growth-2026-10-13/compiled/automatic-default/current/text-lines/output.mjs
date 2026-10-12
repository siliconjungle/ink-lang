function __fn0(v0,v1){
const v2=v0;
const v3=0;
const v4=0;
let v5=({["count"]:v3,["previous"]:v4});
for(let v6=0;v6<v2.length;v6++){
const v7=v2[v6];
const v8=v5;
const v9=v8["count"];
const v10=v7;
const v11=13;
const v12=(v10===v11);
let v13=v12;if(!v13){
const v14=v7;
const v15=10;
const v16=(v14===v15);
let v17=v16;if(v17){
const v18=v5;
const v19=v18["previous"];
const v20=13;
v17=!(v19===v20);}
v13=v17;}
let v21;if(v13){
v21=1;}else{
v21=0;}
const v22=v21;
const v23=(((v9) + (v22)) >>> 0);
const v24=v7;
v5=({["count"]:v23,["previous"]:v24});
}
return v5;}
const __namedTypes={"TextState":{"fields":[{"name":"count","type":{"kind":"u32"}},{"name":"previous","type":{"kind":"u32"}}],"kind":"record","name":"TextState"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"0634958705c7abf328f46a587248b142ecc0b787c8f6adc86e7caaec25e98971","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"unused","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"count","type":{"kind":"u32"}},{"name":"previous","type":{"kind":"u32"}}],"kind":"record","name":"TextState"}}],"named_types":{"TextState":{"fields":[{"name":"count","type":{"kind":"u32"}},{"name":"previous","type":{"kind":"u32"}}],"kind":"record","name":"TextState"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

function __fn0(v0,v1,v2,v3){
const v4=v0;
let v5=v2;
for(let v6=v4.length-1;v6>=0;v6--){
const v7=v4[v6];
const v8=v5;
const v9=v2;
let v10;if(((v8) < (v9))){
const v11=v7;
const v12=v5;
const v13=v3;
const v14=(Math.imul(v12,v13) >>> 0);
v10=(((v11) + (v14)) >>> 0);}else{
const v15=v7;
const v16=v5;
v10=(((v15) - (v16)) >>> 0);}
v5=v10;
}
return v5;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v1","core_sha256":"46024840ef3e3db0e8f5503b1dd2c93cc2e200f26b0b026b435188e6a50598c0","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"general40_ordered","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

function __fn0(v0){
const v1=v0;
const v2=v1;
let v3=false;
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
const v6=v3;
const v7=v3;
let v8=v7;if(!v8){
const v9=v5;
const v10=v9;
const v11=v10;
const v12=v11["flag"];
v8=v12;}
v3=v8;
if(v6)break;
}
const v13=v3;
const v14=v13;
const v15=v0;
const v16=v15;
let v17=true;
for(let v18=0;v18<v16.length;v18++){
const v19=v16[v18];
const v20=v17;
const v21=false;
const v22=(v20===v21);
const v23=v17;
let v24=v23;if(v24){
const v25=v19;
const v26=v25;
const v27=v26;
const v28=v27["flag"];
v24=v28;}
v17=v24;
if(v22)break;
}
const v29=v17;
const v30=v29;
const v31=v0;
const v32=0;
const v33=v31;
let v34=v32;
for(let v35=0;v35<v33.length;v35++){
const v36=v33[v35];
const v37=v36;
const v38=v37;
const v39=v38;
const v40=v39["flag"];
const v41=v40;
let v42=v41;if(v42){
const v43=v36;
const v44=v34;
const v45=({["item"]:v43,["accumulated"]:v44});
const v46=v45;
const v47=v46;
const v48=v47["accumulated"];
const v49=64;
const v50=((v48) > (v49));
v42=v50;}
const v51=v42;
const v52=v36;
const v53=v52;
const v54=v53;
const v55=v54["flag"];
let v56;if(v55){
const v57=v36;
const v58=v34;
const v59=({["item"]:v57,["accumulated"]:v58});
const v60=v59;
const v61=v60;
const v62=v61["accumulated"];
const v63=v60;
const v64=v63["item"];
const v65=v64["value"];
const v66=(((v62) + (v65)) >>> 0);
v56=v66;}else{
v56=v34;}
v34=v56;
if(v51)break;
}
const v67=v34;
const v68=v67;
const v69=v0;
const v70=0;
const v71=v69;
let v72=v70;
for(let v73=0;v73<v71.length;v73++){
const v74=v71[v73];
const v75=v74;
const v76=v75;
const v77=v76;
const v78=v77["value"];
const v79=v78;
const v80=v72;
const v81=({["item"]:v79,["accumulated"]:v80});
const v82=v81;
const v83=v82;
const v84=v83["accumulated"];
const v85=64;
const v86=((v84) > (v85));
const v87=v86;
const v88=v74;
const v89=v88;
const v90=v89;
const v91=v90["value"];
const v92=v91;
const v93=v72;
const v94=({["item"]:v92,["accumulated"]:v93});
const v95=v94;
const v96=v95;
const v97=v96["accumulated"];
const v98=v95;
const v99=v98["item"];
const v100=(((v97) + (v99)) >>> 0);
v72=v100;
if(v87)break;
}
const v101=v72;
const v102=v101;
const v103=v0;
const v104=v103;
const v105=v104.length;
const v106=new Array(v105);
for(let v107=0;v107<v105;v107++){
const v108=v104[v107];
const v109=v108;
const v110=v108;
const v111=v110;
const v112=v111;
const v113=v112["flag"];
const v114=v113;
v106[v107]=({["value"]:v109,["eligible"]:v114});
}
const v115=v106;
const v116=v115;
const v117=0;
const v118=v116;
let v119=v117;
for(let v120=0;v120<v118.length;v120++){
const v121=v118[v120];
const v122=v121;
let v123;if(v122["eligible"]){
const v124=v121;
const v125=v124["value"];
const v126=v119;
const v127=({["item"]:v125,["accumulated"]:v126});
const v128=v127;
const v129=v128;
const v130=v129["item"];
const v131=v130["value"];
const v132=v128;
const v133=v132["accumulated"];
const v134=(((v131) - (v133)) >>> 0);
v123=v134;}else{
v123=v119;}
v119=v123;
}
const v135=v119;
const v136=v135;
const v137=v68;
const v138=v102;
const v139=(((v137) + (v138)) >>> 0);
const v140=v136;
const v141=(((v139) + (v140)) >>> 0);
let v142;if(v14){
v142=1;}else{
v142=0;}
const v143=v142;
const v144=(((v141) + (v143)) >>> 0);
let v145;if(v30){
v145=2;}else{
v145=0;}
const v146=v145;
return (((v144) + (v146)) >>> 0);}
const __namedTypes={"Item":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"},"__ink_instance_677b2b4592112ddb9d7d95a5106185ba2a96b841566f2a0c396368e965b9b367":{"fields":[{"name":"item","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"}},{"name":"accumulated","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_677b2b4592112ddb9d7d95a5106185ba2a96b841566f2a0c396368e965b9b367"},"__ink_instance_7d00b4032316f64c7273081c6aff42c064a282e8cd31620a1c288283db3ab391":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"}},{"name":"eligible","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_7d00b4032316f64c7273081c6aff42c064a282e8cd31620a1c288283db3ab391"},"__ink_instance_b67686b085e4f629ff25deac415fe8c6ceaaf32b0fe80c480a1ff57f4deed8d8":{"fields":[{"name":"item","type":{"kind":"u32"}},{"name":"accumulated","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_b67686b085e4f629ff25deac415fe8c6ceaaf32b0fe80c480a1ff57f4deed8d8"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"1370a4c65f4e96c646a414e4d2ee4840ed6b2eb90d6f6c96303f914571e1f38f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"},"kind":"list"}}],"precondition":null,"result":{"kind":"u32"}}],"named_types":{"Item":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"},"__ink_instance_677b2b4592112ddb9d7d95a5106185ba2a96b841566f2a0c396368e965b9b367":{"fields":[{"name":"item","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"}},{"name":"accumulated","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_677b2b4592112ddb9d7d95a5106185ba2a96b841566f2a0c396368e965b9b367"},"__ink_instance_7d00b4032316f64c7273081c6aff42c064a282e8cd31620a1c288283db3ab391":{"fields":[{"name":"value","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"flag","type":{"kind":"bool"}}],"kind":"record","name":"Item"}},{"name":"eligible","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_7d00b4032316f64c7273081c6aff42c064a282e8cd31620a1c288283db3ab391"},"__ink_instance_b67686b085e4f629ff25deac415fe8c6ceaaf32b0fe80c480a1ff57f4deed8d8":{"fields":[{"name":"item","type":{"kind":"u32"}},{"name":"accumulated","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_b67686b085e4f629ff25deac415fe8c6ceaaf32b0fe80c480a1ff57f4deed8d8"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

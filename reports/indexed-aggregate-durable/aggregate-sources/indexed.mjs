const __node=(c,a)=>Object.freeze({c,a:Object.freeze(a)});
function __run(call){const stack=[call];let result;while(stack.length){const frame=stack[stack.length-1],step=frame.next(result);if(step.done){result=step.value;stack.pop();}else{result=undefined;stack.push(step.value);}}return result;}
const __fpView=new DataView(new ArrayBuffer(4));
function __fpNumber(bits){__fpView.setUint32(0,Number(BigInt.asUintN(32,bits)),true);return __fpView.getFloat32(0,true);}
function __fpWord(op,a,b){
 if(op==='neg')return BigInt.asUintN(32,a)^2147483648n;
 const x=__fpNumber(a),y=__fpNumber(b);
 switch(op){case '==':return x===y;case '!=':return x!==y;case '<':return x<y;case '<=':return x<=y;case '>':return x>y;case '>=':return x>=y;}
 const value=op==='+'?x+y:op==='-'?x-y:op==='*'?x*y:undefined;
 if(value===undefined)throw Error('binary32 operator');if(Number.isNaN(value))return 2143289344n;__fpView.setFloat32(0,value,true);return BigInt(__fpView.getUint32(0,true));
}
function d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0){let v0;switch(a0.c){
case 0:{
const v2=0n;
v0=v2;break;}
case 1:{
const v3=1n;
v0=v3;break;}
case 2:{
v0=a0.a[6];break;}
default:throw Error('literal constructor projection');}
return v0;}
function d_08d94601ac1aa2ed93b41bdd0a8554f32110869bd547d78880f4da001de33883(a0){let v5;switch(a0.c){
case 0:{
const v12=__node(0,[]);
const v11=__node(0,[v12]);
const v7=__node(0,[a0.a[0],a0.a[1],a0.a[2],v11,a0.a[4]]);
v5=v7;break;}
case 1:{
const v18=__node(0,[]);
const v17=__node(0,[v18]);
const v14=__node(1,[a0.a[0],a0.a[1],v17]);
v5=v14;break;}
default:throw Error('literal constructor projection');}
return v5;}
function* d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1){const v24=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0);
const v26=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a1);
const v23=(v24)<(v26);
let v22;if(v23){
const v28=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0);
v22=v28;}else{
const v30=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a1);
v22=v30;}
const v34=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0);
const v36=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a1);
const v33=(v34)<(v36);
let v32;if(v33){
const v38=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a1);
v32=v38;}else{
const v40=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0);
v32=v40;}
const v43=yield d_475ab96fe2e02a28266b359a578407f229ddfb6abe1e42bd05f78d958d80aee1(a0);
const v45=yield d_475ab96fe2e02a28266b359a578407f229ddfb6abe1e42bd05f78d958d80aee1(a1);
const v42=BigInt.asUintN(64,(v43)+(v45));
const v48=yield d_bec00838bc86fe94b60646b673443ee2c95dab64d792591aa787130a07f48fa4(a0);
const v50=yield d_bec00838bc86fe94b60646b673443ee2c95dab64d792591aa787130a07f48fa4(a1);
const v47=BigInt.asUintN(64,(v48)+(v50));
const v55=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
const v57=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v54=(v55)<(v57);
let v53;if(v54){
const v59=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
v53=v59;}else{
const v61=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
v53=v61;}
const v63=1n;
const v52=BigInt.asUintN(64,(v53)+(v63));
const v19=__node(2,[a0,a1,v22,v32,v42,v47,v52]);
return v19;}
function* d_14b1c60245cb25b6473dae8947e9201876796fa199c6cdd20ee3a2661b7317b0(a0,a1,a2){const v66=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a2);
const v68=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v65=(v66)<(v68);
let v64;if(v65){
let v70;switch(a1.c){
case 0:{
const v73=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
const v72=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v73,a2);
v70=v72;break;}
case 1:{
const v78=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
const v77=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v78,a2);
v70=v77;break;}
case 2:{
const v83=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1.a[0]);
const v86=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a1.a[1],a2);
const v82=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v83,v86);
v70=v82;break;}
default:throw Error('literal constructor projection');}
v64=v70;}else{
const v90=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
const v89=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v90,a2);
v64=v89;}
return v64;}
function d_186b6350f974a9daf5c57b97446437bb2cabe2a9241d8e38d84e02980089fef8(a0){let v94;switch(a0.c){
case 0:{
v94=a0.a[3];break;}
case 1:{
v94=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v94;}
function* d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0){let v98;switch(a0.c){
case 0:{
const v100=__node(0,[]);
v98=v100;break;}
case 1:{
let v102;switch(a0.a[0].c){
case 0:{
v102=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v101;if(v102){
const v107=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0.a[1]);
const v105=__node(1,[a0.a[0],v107]);
v101=v105;}else{
const v109=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0.a[1]);
v101=v109;}
v98=v101;break;}
default:throw Error('literal constructor projection');}
return v98;}
function* d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(a0){let v111;switch(a0.c){
case 0:{
const v113=__node(0,[]);
v111=v113;break;}
case 1:{
let v117;switch(a0.a[0].c){
case 0:{
v117=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v120=0n;
const v116=BigInt.asUintN(64,(v117)*(v120));
const v121=1n;
const v115=BigInt.asUintN(64,(v116)+(v121));
const v122=yield d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(a0.a[1]);
const v114=__node(1,[v115,v122]);
v111=v114;break;}
default:throw Error('literal constructor projection');}
return v111;}
function* d_2227a6ba7041bd43fcef1b26000ccf84bfe9666af2f812e03de515c517d771d0(a0){let v124;switch(a0.c){
case 0:{
const v130=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[3]);
const v126=__node(0,[a0.a[0],a0.a[1],a0.a[2],v130,a0.a[4]]);
v124=v126;break;}
case 1:{
const v136=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[2]);
const v133=__node(1,[a0.a[0],a0.a[1],v136]);
v124=v133;break;}
default:throw Error('literal constructor projection');}
return v124;}
function* d_2937ee59437d4727fd243a664a281a6018453ca819aede4e91f0a7d9bda2ca12(a0){const v143=0n;
const v145=__node(0,[]);
const v142=__node(1,[v143,a0,v145]);
const v141=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(v142);
const v140=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(v141);
const v139=yield d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(v140);
const v138=yield d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(v139);
return v138;}
function* d_2a975b3a5fe826968db8619175ac9f0dfbf3be2c770a2eab7b9bb32e684cf01b(a0){const v151=0n;
const v153=__node(0,[]);
const v150=__node(1,[v151,a0,v153]);
const v149=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(v150);
const v148=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(v149);
const v147=yield d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(v148);
const v146=yield d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(v147);
return v146;}
function* d_2d15d039af07da09e966dbb56adcd73b313da516d054674d5f55c495085b08bd(a0){let v154;switch(a0.c){
case 0:{
const v160=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[3]);
const v156=__node(0,[a0.a[0],a0.a[1],a0.a[2],v160,a0.a[4]]);
v154=v156;break;}
case 1:{
const v166=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[2]);
const v163=__node(1,[a0.a[0],a0.a[1],v166]);
v154=v163;break;}
default:throw Error('literal constructor projection');}
return v154;}
function d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0){let v168;switch(a0.c){
case 0:{
const v170=0n;
v168=v170;break;}
case 1:{
v168=a0.a[0];break;}
case 2:{
v168=a0.a[3];break;}
default:throw Error('literal constructor projection');}
return v168;}
function* d_378fe8760941738df4a2ee37fb2ec528d1a07b3b9e12ffcf79558a65c32829f4(a0){let v173;switch(a0.c){
case 0:{
const v176=yield d_dffe3cbe17995837057b32aa776d32f23b98ea8678aef1774171ba497b8e970e(a0.a[0]);
const v175=__node(0,[v176]);
v173=v175;break;}
default:throw Error('literal constructor projection');}
return v173;}
function* d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(a0,a1){const v180=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
const v183=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v185=1n;
const v182=BigInt.asUintN(64,(v183)+(v185));
const v179=(v180)>(v182);
let v178;if(v179){
const v186=yield d_dd9122cd0ef5414b8f184fc5a412c2e0c7b9002cb5d701ef49dc7b9f5465679c(a0,a1);
v178=v186;}else{
const v189=yield d_5772432f10e31d0ddf159e9ab757ef7042f15ed47699a0c380e996b8cda2529c(a0,a1);
v178=v189;}
return v178;}
function* d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(a0){let v192;switch(a0.c){
case 0:{
const v194=__node(0,[]);
v192=v194;break;}
case 1:{
let v196;switch(a0.a[0].c){
case 0:{
v196=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v199=yield d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(a0.a[1]);
const v195=__node(1,[v196,v199]);
v192=v195;break;}
default:throw Error('literal constructor projection');}
return v192;}
function* d_3b0c0ccd4b91f303b3f560132298b6e179e2746933a6772c9665fa8cca34d037(a0,a1,a2,a3,a4,a5){let v201;switch(a0.c){
case 0:{
const v205=yield d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0.a[0],a2);
let v204;switch(v205.c){
case 0:{
const v208=false;
v204=v208;break;}
case 1:{
const v209=true;
v204=v209;break;}
default:throw Error('literal constructor projection');}
let v203;if(v204){
const v212=yield d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0.a[0],a2);
let v211;switch(v212.c){
case 0:{
const v215=false;
v211=v215;break;}
case 1:{
const v216=true;
v211=v216;break;}
default:throw Error('literal constructor projection');}
let v210;if(v211){
let v217;if(a5){
const v221=__node(0,[]);
const v220=__node(1,[v221]);
const v222=false;
const v224=__node(0,[a0.a[0]]);
const v226=__node(0,[]);
const v219=__node(0,[v220,v222,a1,v224,v226]);
v217=v219;}else{
const v230=18446744073709551615n;
const v228=(a1)===(v230);
let v227;if(v228){
const v232=1n;
const v234=__node(0,[a0.a[0]]);
const v231=__node(1,[v232,a1,v234]);
v227=v231;}else{
const v238=__node(0,[]);
const v237=__node(0,[v238]);
const v239=true;
const v242=1n;
const v240=BigInt.asUintN(64,(a1)+(v242));
const v247=__node(0,[a3,a4]);
const v244=yield d_cdac157f6e4978e9b319d23081095a8ba5b3a6ac6201346dc2b27a84b324bf4a(a0.a[0],a2,v247);
const v243=__node(0,[v244]);
const v251=__node(0,[a3]);
const v253=__node(0,[]);
const v250=__node(1,[v251,v253]);
const v236=__node(0,[v237,v239,v240,v243,v250]);
v227=v236;}
v217=v227;}
v210=v217;}else{
const v255=2n;
const v257=__node(0,[a0.a[0]]);
const v254=__node(1,[v255,a1,v257]);
v210=v254;}
v203=v210;}else{
const v261=yield d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0.a[0],a2);
let v260;switch(v261.c){
case 0:{
const v264=false;
v260=v264;break;}
case 1:{
const v265=true;
v260=v265;break;}
default:throw Error('literal constructor projection');}
let v259;if(v260){
const v267=2n;
const v269=__node(0,[a0.a[0]]);
const v266=__node(1,[v267,a1,v269]);
v259=v266;}else{
let v271;if(a5){
const v275=__node(0,[]);
const v274=__node(1,[v275]);
const v276=false;
const v278=__node(0,[a0.a[0]]);
const v280=__node(0,[]);
const v273=__node(0,[v274,v276,a1,v278,v280]);
v271=v273;}else{
const v284=18446744073709551615n;
const v282=(a1)===(v284);
let v281;if(v282){
const v286=1n;
const v288=__node(0,[a0.a[0]]);
const v285=__node(1,[v286,a1,v288]);
v281=v285;}else{
const v292=__node(0,[]);
const v291=__node(0,[v292]);
const v293=true;
const v296=1n;
const v294=BigInt.asUintN(64,(a1)+(v296));
const v301=__node(0,[a3,a4]);
const v298=yield d_f164be79137c4feecda8b0c95f9c4e6051393512cfb8310647e1e12726f07cc9(a0.a[0],a2,v301);
const v297=__node(0,[v298]);
const v305=__node(0,[a3]);
const v307=__node(0,[]);
const v304=__node(1,[v305,v307]);
const v290=__node(0,[v291,v293,v294,v297,v304]);
v281=v290;}
v271=v281;}
v259=v271;}
v203=v259;}
v201=v203;break;}
default:throw Error('literal constructor projection');}
return v201;}
function* d_474aca4c64ac507e51414e3ae5a86dd90b62e855a278e97c55f54a514b35a23f(a0){let v308;switch(a0.c){
case 0:{
const v310=__node(0,[]);
v308=v310;break;}
case 1:{
const v314=__node(0,[]);
const v311=__node(1,[a0.a[0],a0.a[1],v314]);
v308=v311;break;}
case 2:{
const v316=yield d_474aca4c64ac507e51414e3ae5a86dd90b62e855a278e97c55f54a514b35a23f(a0.a[0]);
const v318=yield d_474aca4c64ac507e51414e3ae5a86dd90b62e855a278e97c55f54a514b35a23f(a0.a[1]);
const v315=yield d_a02900963d57d97aa1fe55df523348d493b722a2443aac9e13c6f54caadaf9fc(v316,v318);
v308=v315;break;}
default:throw Error('literal constructor projection');}
return v308;}
function* d_475ab96fe2e02a28266b359a578407f229ddfb6abe1e42bd05f78d958d80aee1(a0){let v320;switch(a0.c){
case 0:{
const v322=0n;
v320=v322;break;}
case 1:{
const v323=yield d_2937ee59437d4727fd243a664a281a6018453ca819aede4e91f0a7d9bda2ca12(a0.a[1]);
v320=v323;break;}
case 2:{
v320=a0.a[4];break;}
default:throw Error('literal constructor projection');}
return v320;}
function d_4d9946ad9a037d55daebbf6b4f332ecf1e985eca512336e0f0bb06e1d923e74d(a0){let v326;switch(a0.c){
case 0:{
v326=a0.a[3];break;}
case 1:{
v326=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v326;}
function* d_5772432f10e31d0ddf159e9ab757ef7042f15ed47699a0c380e996b8cda2529c(a0,a1){const v332=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v335=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
const v337=1n;
const v334=BigInt.asUintN(64,(v335)+(v337));
const v331=(v332)>(v334);
let v330;if(v331){
let v338;switch(a1.c){
case 0:{
const v340=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v338=v340;break;}
case 1:{
const v343=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v338=v343;break;}
case 2:{
const v346=yield d_14b1c60245cb25b6473dae8947e9201876796fa199c6cdd20ee3a2661b7317b0(a0,a1.a[0],a1.a[1]);
v338=v346;break;}
default:throw Error('literal constructor projection');}
v330=v338;}else{
const v350=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v330=v350;}
return v330;}
function* d_69e8f0462123beaac5b725c965920b8c2340af30429b47d726fe1fc20b333fba(a0,a1){const v357=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0);
const v355=(a1)<(v357);
const v361=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0);
const v359=(a1)>(v361);
const v354=(v355)||(v359);
let v353;if(v354){
v353=a0;}else{
let v364;switch(a0.c){
case 0:{
const v366=__node(0,[]);
v364=v366;break;}
case 1:{
const v368=(a1)===(a0.a[0]);
let v367;if(v368){
const v371=__node(0,[]);
v367=v371;}else{
const v372=__node(1,[a0.a[0],a0.a[1]]);
v367=v372;}
v364=v367;break;}
case 2:{
const v376=yield d_69e8f0462123beaac5b725c965920b8c2340af30429b47d726fe1fc20b333fba(a0.a[0],a1);
const v379=yield d_69e8f0462123beaac5b725c965920b8c2340af30429b47d726fe1fc20b333fba(a0.a[1],a1);
const v375=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v376,v379);
v364=v375;break;}
default:throw Error('literal constructor projection');}
v353=v364;}
return v353;}
function* d_6f015cf95d2de57418f6ec4a135049e4c4efe16e1bd8e8e2d897be79d1b5cda2(a0,a1){let v382;switch(a0.c){
case 0:{
const v385=yield d_475ab96fe2e02a28266b359a578407f229ddfb6abe1e42bd05f78d958d80aee1(a0.a[0]);
const v387=false;
const v389=__node(0,[a0.a[0]]);
const v391=__node(0,[]);
const v384=__node(0,[v385,v387,a1,v389,v391]);
v382=v384;break;}
default:throw Error('literal constructor projection');}
return v382;}
function* d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0,a1){const v396=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0);
const v394=(a1)<(v396);
const v400=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0);
const v398=(a1)>(v400);
const v393=(v394)||(v398);
let v392;if(v393){
const v402=__node(0,[]);
v392=v402;}else{
let v403;switch(a0.c){
case 0:{
const v405=__node(0,[]);
v403=v405;break;}
case 1:{
const v407=(a1)===(a0.a[0]);
let v406;if(v407){
const v410=__node(1,[a0.a[1]]);
v406=v410;}else{
const v412=__node(0,[]);
v406=v412;}
v403=v406;break;}
case 2:{
const v414=yield d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0.a[0],a1);
const v417=yield d_6f9dd3a9a14f715f8376d62c865b2b45ae52dc57dd7fa8e525d1c86cbae25862(a0.a[1],a1);
const v413=d_b786cd3d542360e36d11a412339399f2084fa0e5a8bec5ab1461e548f657f81d(v414,v417);
v403=v413;break;}
default:throw Error('literal constructor projection');}
v392=v403;}
return v392;}
function* d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0){let v420;switch(a0.c){
case 0:{
const v422=__node(0,[]);
v420=v422;break;}
case 1:{
let v424;switch(a0.a[0].c){
case 0:{
v424=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v423;if(v424){
const v429=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0.a[1]);
const v427=__node(1,[a0.a[0],v429]);
v423=v427;}else{
const v431=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0.a[1]);
v423=v431;}
v420=v423;break;}
default:throw Error('literal constructor projection');}
return v420;}
function* d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(a0){let v433;switch(a0.c){
case 0:{
const v435=__node(0,[]);
v433=v435;break;}
case 1:{
const v438=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(a0.a[2]);
const v436=__node(1,[a0.a[1],v438]);
v433=v436;break;}
default:throw Error('literal constructor projection');}
return v433;}
function* d_a02900963d57d97aa1fe55df523348d493b722a2443aac9e13c6f54caadaf9fc(a0,a1){let v440;switch(a0.c){
case 0:{
v440=a1;break;}
case 1:{
const v446=yield d_a02900963d57d97aa1fe55df523348d493b722a2443aac9e13c6f54caadaf9fc(a0.a[2],a1);
const v443=__node(1,[a0.a[0],a0.a[1],v446]);
v440=v443;break;}
default:throw Error('literal constructor projection');}
return v440;}
function* d_a30c0ace3df642a1b8bb987b0b4d92e42f1f5989252275039eac2b19b8e2f8cf(a0,a1,a2,a3){let v449;switch(a0.c){
case 0:{
let v451;if(a3){
const v455=__node(0,[]);
const v454=__node(1,[v455]);
const v456=false;
const v458=__node(0,[a0.a[0]]);
const v460=__node(0,[]);
const v453=__node(0,[v454,v456,a1,v458,v460]);
v451=v453;}else{
const v464=18446744073709551615n;
const v462=(a1)===(v464);
let v461;if(v462){
const v466=1n;
const v468=__node(0,[a0.a[0]]);
const v465=__node(1,[v466,a1,v468]);
v461=v465;}else{
const v472=__node(0,[]);
const v471=__node(0,[v472]);
const v473=true;
const v476=1n;
const v474=BigInt.asUintN(64,(a1)+(v476));
const v478=yield d_69e8f0462123beaac5b725c965920b8c2340af30429b47d726fe1fc20b333fba(a0.a[0],a2);
const v477=__node(0,[v478]);
const v482=__node(0,[a2]);
const v484=__node(0,[]);
const v481=__node(1,[v482,v484]);
const v470=__node(0,[v471,v473,v474,v477,v481]);
v461=v470;}
v451=v461;}
v449=v451;break;}
default:throw Error('literal constructor projection');}
return v449;}
function* d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0){let v485;switch(a0.c){
case 0:{
const v488=yield d_474aca4c64ac507e51414e3ae5a86dd90b62e855a278e97c55f54a514b35a23f(a0.a[0]);
const v487=__node(0,[v488]);
v485=v487;break;}
default:throw Error('literal constructor projection');}
return v485;}
function d_b786cd3d542360e36d11a412339399f2084fa0e5a8bec5ab1461e548f657f81d(a0,a1){let v490;switch(a0.c){
case 0:{
v490=a1;break;}
case 1:{
const v493=__node(1,[a0.a[0]]);
v490=v493;break;}
default:throw Error('literal constructor projection');}
return v490;}
function* d_bec00838bc86fe94b60646b673443ee2c95dab64d792591aa787130a07f48fa4(a0){let v495;switch(a0.c){
case 0:{
const v497=0n;
v495=v497;break;}
case 1:{
const v498=yield d_2a975b3a5fe826968db8619175ac9f0dfbf3be2c770a2eab7b9bb32e684cf01b(a0.a[1]);
v495=v498;break;}
case 2:{
v495=a0.a[5];break;}
default:throw Error('literal constructor projection');}
return v495;}
function* d_c7ad7bdf333846cfdaf9c1cef5bcc98d8b1f5a0ca3c654237e21162cd70e16f6(a0,a1,a2){const v503=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
const v505=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v502=(v503)<(v505);
let v501;if(v502){
let v507;switch(a1.c){
case 0:{
const v511=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a1,a2);
const v509=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,v511);
v507=v509;break;}
case 1:{
const v516=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a1,a2);
const v514=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,v516);
v507=v514;break;}
case 2:{
const v520=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1.a[0]);
const v523=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a1.a[1],a2);
const v519=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v520,v523);
v507=v519;break;}
default:throw Error('literal constructor projection');}
v501=v507;}else{
const v528=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a1,a2);
const v526=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,v528);
v501=v526;}
return v501;}
function d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0){let v531;switch(a0.c){
case 0:{
const v533=18446744073709551615n;
v531=v533;break;}
case 1:{
v531=a0.a[0];break;}
case 2:{
v531=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v531;}
function* d_cdac157f6e4978e9b319d23081095a8ba5b3a6ac6201346dc2b27a84b324bf4a(a0,a1,a2){const v540=d_cbcba9e3f787a3b23562b0ef4be74ae4029b63401f57fe7d6d0c2b591d40de0d(a0);
const v538=(a1)<(v540);
const v544=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0);
const v542=(a1)>(v544);
const v537=(v538)||(v542);
let v536;if(v537){
v536=a0;}else{
let v547;switch(a0.c){
case 0:{
const v549=__node(0,[]);
v547=v549;break;}
case 1:{
const v551=(a1)===(a0.a[0]);
let v550;if(v551){
const v554=__node(1,[a0.a[0],a2]);
v550=v554;}else{
const v557=__node(1,[a0.a[0],a0.a[1]]);
v550=v557;}
v547=v550;break;}
case 2:{
const v561=yield d_cdac157f6e4978e9b319d23081095a8ba5b3a6ac6201346dc2b27a84b324bf4a(a0.a[0],a1,a2);
const v565=yield d_cdac157f6e4978e9b319d23081095a8ba5b3a6ac6201346dc2b27a84b324bf4a(a0.a[1],a1,a2);
const v560=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(v561,v565);
v547=v560;break;}
default:throw Error('literal constructor projection');}
v536=v547;}
return v536;}
function d_d0c069f5e4d74cddcd676b884d3c209df73106f994fb0b83d77481fc2dd559a0(a0){let v569;switch(a0.c){
case 0:{
const v576=__node(0,[]);
const v575=__node(0,[v576]);
const v571=__node(0,[a0.a[0],a0.a[1],a0.a[2],v575,a0.a[4]]);
v569=v571;break;}
case 1:{
const v582=__node(0,[]);
const v581=__node(0,[v582]);
const v578=__node(1,[a0.a[0],a0.a[1],v581]);
v569=v578;break;}
default:throw Error('literal constructor projection');}
return v569;}
function* d_d3554f5e38086e7c5371632665836436d78fdb52414f083de240f23c44048dd2(a0,a1,a2){let v583;switch(a0.c){
case 0:{
const v585=__node(1,[a1,a2]);
v583=v585;break;}
case 1:{
const v589=__node(1,[a1,a2]);
const v592=__node(1,[a0.a[0],a0.a[1]]);
const v588=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(v589,v592);
v583=v588;break;}
case 2:{
const v596=yield d_d3554f5e38086e7c5371632665836436d78fdb52414f083de240f23c44048dd2(a0.a[0],a1,a2);
const v595=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(v596,a0.a[1]);
v583=v595;break;}
default:throw Error('literal constructor projection');}
return v583;}
function* d_dd9122cd0ef5414b8f184fc5a412c2e0c7b9002cb5d701ef49dc7b9f5465679c(a0,a1){const v603=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a0);
const v606=d_066da9768e60dc3a4deef2f7ffa439f31ea6760f6843c76a54d8d01b3d158502(a1);
const v608=1n;
const v605=BigInt.asUintN(64,(v606)+(v608));
const v602=(v603)>(v605);
let v601;if(v602){
let v609;switch(a0.c){
case 0:{
const v611=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v609=v611;break;}
case 1:{
const v614=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v609=v614;break;}
case 2:{
const v617=yield d_c7ad7bdf333846cfdaf9c1cef5bcc98d8b1f5a0ca3c654237e21162cd70e16f6(a0.a[0],a0.a[1],a1);
v609=v617;break;}
default:throw Error('literal constructor projection');}
v601=v609;}else{
const v621=yield d_0b82c59bf15e551e176949b916544f67dde263a9f75f1ec465ac2b2dbfa26f9d(a0,a1);
v601=v621;}
return v601;}
function* d_dffe3cbe17995837057b32aa776d32f23b98ea8678aef1774171ba497b8e970e(a0){let v624;switch(a0.c){
case 0:{
const v626=__node(0,[]);
v624=v626;break;}
case 1:{
const v628=yield d_dffe3cbe17995837057b32aa776d32f23b98ea8678aef1774171ba497b8e970e(a0.a[2]);
const v627=yield d_d3554f5e38086e7c5371632665836436d78fdb52414f083de240f23c44048dd2(v628,a0.a[0],a0.a[1]);
v624=v627;break;}
default:throw Error('literal constructor projection');}
return v624;}
function* d_e20846c003a8b502d7ad895156c1789be9b8dd4e753f999358335a76133df97f(a0,a1){let v632;switch(a0.c){
case 0:{
const v635=yield d_bec00838bc86fe94b60646b673443ee2c95dab64d792591aa787130a07f48fa4(a0.a[0]);
const v637=false;
const v639=__node(0,[a0.a[0]]);
const v641=__node(0,[]);
const v634=__node(0,[v635,v637,a1,v639,v641]);
v632=v634;break;}
default:throw Error('literal constructor projection');}
return v632;}
function* d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(a0){let v642;switch(a0.c){
case 0:{
const v644=0n;
v642=v644;break;}
case 1:{
const v647=yield d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(a0.a[1]);
const v645=BigInt.asUintN(64,(a0.a[0])+(v647));
v642=v645;break;}
default:throw Error('literal constructor projection');}
return v642;}
function* d_e76afcdc421fd94b92ff9f51242ab3db38cff4e5f27b705ee3645613843bcfc2(a0){let v649;switch(a0.c){
case 0:{
const v655=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[3]);
const v651=__node(0,[a0.a[0],a0.a[1],a0.a[2],v655,a0.a[4]]);
v649=v651;break;}
case 1:{
const v661=yield d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0.a[2]);
const v658=__node(1,[a0.a[0],a0.a[1],v661]);
v649=v658;break;}
default:throw Error('literal constructor projection');}
return v649;}
function* d_f164be79137c4feecda8b0c95f9c4e6051393512cfb8310647e1e12726f07cc9(a0,a1,a2){let v663;switch(a0.c){
case 0:{
const v665=__node(1,[a1,a2]);
v663=v665;break;}
case 1:{
const v669=(a1)<(a0.a[0]);
let v668;if(v669){
const v673=__node(1,[a1,a2]);
const v676=__node(1,[a0.a[0],a0.a[1]]);
const v672=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(v673,v676);
v668=v672;}else{
const v680=__node(1,[a0.a[0],a0.a[1]]);
const v683=__node(1,[a1,a2]);
const v679=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(v680,v683);
v668=v679;}
v663=v668;break;}
case 2:{
const v689=d_33cb437b4635cf97d1432adf5fa704f96098a5dcdf2145356c6b147fc5db53b3(a0.a[0]);
const v687=(a1)<(v689);
let v686;if(v687){
const v692=yield d_f164be79137c4feecda8b0c95f9c4e6051393512cfb8310647e1e12726f07cc9(a0.a[0],a1,a2);
const v691=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(v692,a0.a[1]);
v686=v691;}else{
const v699=yield d_f164be79137c4feecda8b0c95f9c4e6051393512cfb8310647e1e12726f07cc9(a0.a[1],a1,a2);
const v697=yield d_39fdb49f21e47ef59bea4dece9690ec239474e73f3b69a62d9eb8cce5ac9392e(a0.a[0],v699);
v686=v697;}
v663=v686;break;}
default:throw Error('literal constructor projection');}
return v663;}
function* d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(a0){let v703;switch(a0.c){
case 0:{
const v705=0n;
v703=v705;break;}
case 1:{
const v708=yield d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(a0.a[1]);
const v706=BigInt.asUintN(64,(a0.a[0])+(v708));
v703=v706;break;}
default:throw Error('literal constructor projection');}
return v703;}
function d_f8b201f9576cf5f758072d19d59fc2103838413eaff9a64f4a5aa01b90455187(a0){let v710;switch(a0.c){
case 0:{
const v717=__node(0,[]);
const v716=__node(0,[v717]);
const v712=__node(0,[a0.a[0],a0.a[1],a0.a[2],v716,a0.a[4]]);
v710=v712;break;}
case 1:{
const v723=__node(0,[]);
const v722=__node(0,[v723]);
const v719=__node(1,[a0.a[0],a0.a[1],v722]);
v710=v719;break;}
default:throw Error('literal constructor projection');}
return v710;}
function f_186b6350f974a9daf5c57b97446437bb2cabe2a9241d8e38d84e02980089fef8(a0){return d_186b6350f974a9daf5c57b97446437bb2cabe2a9241d8e38d84e02980089fef8(a0);}
function f_2227a6ba7041bd43fcef1b26000ccf84bfe9666af2f812e03de515c517d771d0(a0){return __run(d_2227a6ba7041bd43fcef1b26000ccf84bfe9666af2f812e03de515c517d771d0(a0));}
function f_2d15d039af07da09e966dbb56adcd73b313da516d054674d5f55c495085b08bd(a0){return __run(d_2d15d039af07da09e966dbb56adcd73b313da516d054674d5f55c495085b08bd(a0));}
function f_378fe8760941738df4a2ee37fb2ec528d1a07b3b9e12ffcf79558a65c32829f4(a0){return __run(d_378fe8760941738df4a2ee37fb2ec528d1a07b3b9e12ffcf79558a65c32829f4(a0));}
function f_3b0c0ccd4b91f303b3f560132298b6e179e2746933a6772c9665fa8cca34d037(a0,a1,a2,a3,a4,a5){return __run(d_3b0c0ccd4b91f303b3f560132298b6e179e2746933a6772c9665fa8cca34d037(a0,a1,a2,a3,a4,a5));}
function f_4d9946ad9a037d55daebbf6b4f332ecf1e985eca512336e0f0bb06e1d923e74d(a0){return d_4d9946ad9a037d55daebbf6b4f332ecf1e985eca512336e0f0bb06e1d923e74d(a0);}
function f_6f015cf95d2de57418f6ec4a135049e4c4efe16e1bd8e8e2d897be79d1b5cda2(a0,a1){return __run(d_6f015cf95d2de57418f6ec4a135049e4c4efe16e1bd8e8e2d897be79d1b5cda2(a0,a1));}
function f_a30c0ace3df642a1b8bb987b0b4d92e42f1f5989252275039eac2b19b8e2f8cf(a0,a1,a2,a3){return __run(d_a30c0ace3df642a1b8bb987b0b4d92e42f1f5989252275039eac2b19b8e2f8cf(a0,a1,a2,a3));}
function f_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0){return __run(d_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(a0));}
function f_e20846c003a8b502d7ad895156c1789be9b8dd4e753f999358335a76133df97f(a0,a1){return __run(d_e20846c003a8b502d7ad895156c1789be9b8dd4e753f999358335a76133df97f(a0,a1));}
function f_e76afcdc421fd94b92ff9f51242ab3db38cff4e5f27b705ee3645613843bcfc2(a0){return __run(d_e76afcdc421fd94b92ff9f51242ab3db38cff4e5f27b705ee3645613843bcfc2(a0));}
function f_08d94601ac1aa2ed93b41bdd0a8554f32110869bd547d78880f4da001de33883(a0){return d_08d94601ac1aa2ed93b41bdd0a8554f32110869bd547d78880f4da001de33883(a0);}
function f_d0c069f5e4d74cddcd676b884d3c209df73106f994fb0b83d77481fc2dd559a0(a0){return d_d0c069f5e4d74cddcd676b884d3c209df73106f994fb0b83d77481fc2dd559a0(a0);}
function f_f8b201f9576cf5f758072d19d59fc2103838413eaff9a64f4a5aa01b90455187(a0){return d_f8b201f9576cf5f758072d19d59fc2103838413eaff9a64f4a5aa01b90455187(a0);}
const __encoder=new TextEncoder();
function __keyCompare(a,b){return a<b?-1:a>b?1:0;}

// Portable snapshot ABI shared with native/Wasm. Hashing uses Web Crypto.
function __snapshotLimits(limits={}){
 const result={bytes:64*1024*1024,values:1000000,depth:128,...limits};
 for(const k of ['bytes','values','depth'])if(!Number.isSafeInteger(result[k])||result[k]<0||result[k]>(k==='depth'?128:k==='values'?1000000:64*1024*1024))throw Error('invalid snapshot limits');
 return result;
}
const __hash=async bytes=>new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
function __snapshotWriter(limits){
 const out=[];let left=limits.values;
 function bytes(xs){if(xs.length>limits.bytes-out.length)throw Error('snapshot byte limit exceeded');for(const x of xs)out.push(x);}
 function integer(n,size){n=BigInt(n);for(let i=0;i<size;i++){bytes([Number(n&255n)]);n>>=8n;}}
 function raw(xs){integer(xs.length,8);bytes(xs);}
 function value(v,t,depth=0){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'unit':break;case 'bool':bytes([v?1:0]);break;
  case 'u32':case 'i32':case 'f32':integer(v,4);break;case 'u64':integer(v,8);break;
  case 'vector':if(v.length!==t.size)throw Error('vector dimension mismatch');for(const x of v)value(x,t.element,depth+1);break;
  case 'int':{let n=v<0n?-v:v;const xs=[];while(n){if(xs.length>=4096)throw Error('snapshot Int exceeds size limit');xs.push(Number(n&255n));n>>=8n;}bytes([v===0n?0:v>0n?1:2]);raw(xs);break;}
  case 'string':raw(__encoder.encode(v));break;
  case 'id':integer(BigInt('0x'+v),16);break;
  case 'enum':integer(t.variants.indexOf(v),4);break;
  case 'record':for(const f of t.fields)value(v[f.name],f.type,depth+1);break;
  case 'list':if(v.length>left)throw Error('snapshot value limit exceeded');integer(v.length,8);for(const x of v)value(x,t.element,depth+1);break;
  case 'option':if(Object.hasOwn(v,'Some')){bytes([1]);value(v.Some,t.element,depth+1);}else bytes([0]);break;
  case 'result':if(Object.hasOwn(v,'Ok')){bytes([0]);value(v.Ok,t.ok,depth+1);}else{bytes([1]);value(v.Err,t.error,depth+1);}break;
  default:throw Error('unsupported snapshot type');
 }}
 return {bytes,integer,raw,value,get left(){return left;},finish:()=>new Uint8Array(out)};
}
async function __snapshotEncode(meta,state,options){
 const limits=__snapshotLimits(options),w=__snapshotWriter(limits);
 w.integer(state.version,8);
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const rows=[...state.tables[r.index].entries()].sort((a,b)=>__keyCompare(a[0],b[0],r.key));if(rows.length>Math.floor(w.left/2))throw Error('snapshot row limit exceeded');w.integer(rows.length,8);for(const [k,v]of rows){w.value(k,r.key);w.value(v,r.value);}}
 w.integer(state.outbox.length,8);
 for(const e of state.outbox){const channel=meta.events.findIndex(t=>t.name===e.channel);w.integer(e.commit,8);w.integer(e.position,8);w.integer(channel,4);w.value(e.value,meta.events[channel].type);}
 const payload=w.finish(),header=__snapshotWriter(limits);header.bytes([86,76,83,84,65,84,69,0,1,0,1,0]);header.bytes(meta.snapshot.program);header.bytes(meta.snapshot.schema);header.integer(payload.length,8);header.bytes(payload);
 const bytes=header.finish();if(bytes.length+32>limits.bytes)throw Error('snapshot byte limit exceeded');const digest=await __hash(bytes);const result=new Uint8Array(bytes.length+32);result.set(bytes);result.set(digest,bytes.length);return result;
}
async function __snapshotDecode(meta,input,options){
 const limits=__snapshotLimits(options);
 if(!(input instanceof Uint8Array)&&!Array.isArray(input))throw Error('expected snapshot bytes');
 if(input.length>limits.bytes||input.length<116)throw Error('snapshot byte length invalid');
 if(Array.isArray(input)&&input.some(b=>!Number.isInteger(b)||b<0||b>255))throw Error('invalid snapshot bytes');
 const bytes=new Uint8Array(input); // capture before asynchronous integrity work
 function same(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
 if(!same(bytes.subarray(0,12),[86,76,83,84,65,84,69,0,1,0,1,0]))throw Error('snapshot format or semantics version mismatch');
 if(!same(bytes.subarray(12,44),meta.snapshot.program)||!same(bytes.subarray(44,76),meta.snapshot.schema))throw Error('snapshot program or schema identity mismatch');
 const end=bytes.length-32,digest=await __hash(bytes.subarray(0,end));if(!same(digest,bytes.subarray(end)))throw Error('snapshot integrity check failed');
 let at=76,left=limits.values;
 function take(n){if(!Number.isSafeInteger(n)||n<0||n>end-at)throw Error('truncated snapshot');const x=bytes.subarray(at,at+n);at+=n;return x;}
 function integer(size){const xs=take(size);let n=0n;for(let i=size-1;i>=0;i--)n=(n<<8n)+BigInt(xs[i]);return n;}
 function length(){const n=integer(8);if(n>BigInt(Number.MAX_SAFE_INTEGER))throw Error('snapshot length not addressable');return Number(n);}
 function sequence(){const n=length();if(n>left)throw Error('snapshot value limit exceeded');return n;}
 function raw(){return take(length());}
 const n=length();if(n!==end-84)throw Error('snapshot payload length mismatch');
 function value(t,depth=0){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'unit':return null;case 'bool':{const b=take(1)[0];if(b>1)throw Error('invalid Bool tag');return b===1;}
  case 'u32':case 'f32':return Number(integer(4));case 'i32':return Number(BigInt.asIntN(32,integer(4)));case 'u64':return integer(8);
  case 'vector':{const xs=[];for(let i=0;i<t.size;i++)xs.push(value(t.element,depth+1));return xs;}
  case 'int':{const sign=take(1)[0],xs=raw();if(xs.length>4096)throw Error('snapshot Int exceeds size limit');if(!((sign===0&&xs.length===0)||((sign===1||sign===2)&&xs.length>0&&xs[xs.length-1]!==0)))throw Error('noncanonical signed integer');let n=0n;for(let i=xs.length-1;i>=0;i--)n=(n<<8n)+BigInt(xs[i]);return sign===2?-n:n;}
  case 'string':return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw());
  case 'id':return integer(16).toString(16).padStart(32,'0');
  case 'enum':{const i=Number(integer(4));if(i>=t.variants.length)throw Error('invalid enum tag');return t.variants[i];}
  case 'record':return Object.fromEntries(t.fields.map(f=>[f.name,value(f.type,depth+1)]));
  case 'list':{const n=sequence(),xs=[];for(let i=0;i<n;i++)xs.push(value(t.element,depth+1));return xs;}
  case 'option':{const tag=take(1)[0];if(tag===0)return {None:null};if(tag===1)return {Some:value(t.element,depth+1)};throw Error('invalid Option tag');}
  case 'result':{const tag=take(1)[0];if(tag===0)return {Ok:value(t.ok,depth+1)};if(tag===1)return {Err:value(t.error,depth+1)};throw Error('invalid Result tag');}
  default:throw Error('unsupported snapshot type');
 }}
 const version=integer(8),tables=meta.roots.map(()=>new Map());
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const n=sequence();if(n>Math.floor(left/2))throw Error('snapshot row limit exceeded');let prior;for(let i=0;i<n;i++){const k=value(r.key),v=value(r.value);if(i&&__keyCompare(prior,k,r.key)>=0)throw Error('duplicate or unordered snapshot key');tables[r.index].set(k,v);prior=k;}}
 const count=sequence(),outbox=[];let prior;
 for(let i=0;i<count;i++){const commit=integer(8),position=integer(8),channel=Number(integer(4));if(!meta.events[channel])throw Error('unknown snapshot event channel');const v=value(meta.events[channel].type);if(commit===0n||commit>version||(prior&&(commit<prior.commit||(commit===prior.commit&&position<=prior.position))))throw Error('invalid snapshot event sequence');const e={commit,position,channel:meta.events[channel].name,value:v};outbox.push(e);prior=e;}
 if(at!==end)throw Error('trailing snapshot payload');return {version,tables,outbox};
}
function read_0(v,d=0,internal=false){return v;}
function write_0(v,d=0,snapshot=false){return v;}
function read_1(v,d=0,internal=false){return v;}
function write_1(v,d=0,snapshot=false){return v;}
function read_2(v,d=0,internal=false){return __node(0,[]);}
function write_2(v,d=0,snapshot=false){return null;}
function read_3(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_1(v[i],d+1,internal),tail]);return tail;}
function write_3(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_1(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_4(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_6(v[i],d+1,internal),tail]);return tail;}
function write_4(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_6(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_5(v,d=0,internal=false){switch(v){case "Error.Failed":return __node(0,[]);default:return undefined;}}
function write_5(v,d=0,snapshot=false){return ["Error.Failed"][v.c];}
function read_6(v,d=0,internal=false){return __node(0,[read_1(v["value"],d+1,internal),read_0(v["active"],d+1,internal)]);}
function write_6(v,d=0,snapshot=false){return Object.fromEntries([["value",write_1(v.a[0],d+1,snapshot)],["active",write_0(v.a[1],d+1,snapshot)]]);}
function read_7(v,d=0,internal=false){if(Object.hasOwn(v,'Some'))return __node(1,[read_6(v.Some,d+1,internal)]);return __node(0,[]);}
function write_7(v,d=0,snapshot=false){return v.c===0?{None:null}:{Some:write_6(v.a[0],d+1,snapshot)};}
function read_8(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_2(v.Ok,d+1,internal)]);return __node(1,[read_5(v.Err,d+1,internal)]);}
function write_8(v,d=0,snapshot=false){return v.c===0?{Ok:write_2(v.a[0],d+1,snapshot)}:{Err:write_5(v.a[0],d+1,snapshot)};}
const __meta={"events":[{"name":"seen","type":{"kind":"u64"}}],"roots":[{"key":{"kind":"u64"},"name":"Rows","value":{"fields":[{"name":"value","type":{"kind":"u64"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Row"}}],"snapshot":{"program":[164,20,219,208,59,235,46,77,62,228,218,82,19,65,177,192,80,104,209,34,182,251,67,150,219,17,134,111,72,214,155,52],"schema":[217,47,159,252,204,85,237,70,76,82,248,36,231,99,128,206,40,43,134,247,81,235,124,169,208,7,125,5,136,138,247,164]}};
function __fromTables(tables){const roots=[];
{const rows=[...tables[0].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){const [key,value]=rows[j];tail=__node(1,[key,read_6(value,0,true),tail]);}roots.push(tail);}
return __node(0,roots);}
function __tables(logical){const tables=[];
{let cursor=logical.a[0],prior;const rows=new Map();while(cursor.c!==0){const [key,value,tail]=cursor.a;rows.set(key,write_6(value,0,true));cursor=tail;}tables.push(rows);}
return tables;}
function __events(list){const events=[];let cursor=list;while(cursor.c!==0){const [event,tail]=cursor.a;switch(event.c){
case 0:events.push(["seen", write_1(event.a[0],0,true), write_1(event.a[0],0,false)]);break;
default:throw Error('unknown source event');}cursor=tail;}return events;}
// CALLER CONTRACT: arguments must have declared types and canonical values.
// Malformed data may throw, produce wrong results or corrupt state.
export function createState(){let version=0n,outbox=[],busy=false,transaction=null;
const initial=__node(0,[__node(0,[])]);let physical=f_378fe8760941738df4a2ee37fb2ec528d1a07b3b9e12ffcf79558a65c32829f4(initial);
function boundary(){if(busy)throw Error('state operation already in progress');}
async function invoke_json(name,args){boundary();switch(name){
case "put":{
const a0=read_1(args[0],0);
const a1=read_1(args[1],0);
const a2=read_0(args[2],0);
const a3=read_0(args[3],0);
const executed=f_3b0c0ccd4b91f303b3f560132298b6e179e2746933a6772c9665fa8cca34d037(physical,version,a0,a1,a2,a3);const observed=f_d0c069f5e4d74cddcd676b884d3c209df73106f994fb0b83d77481fc2dd559a0(executed),next=f_4d9946ad9a037d55daebbf6b4f332ecf1e985eca512336e0f0bb06e1d923e74d(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_8(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "erase":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_a30c0ace3df642a1b8bb987b0b4d92e42f1f5989252275039eac2b19b8e2f8cf(physical,version,a0,a1);const observed=f_d0c069f5e4d74cddcd676b884d3c209df73106f994fb0b83d77481fc2dd559a0(executed),next=f_4d9946ad9a037d55daebbf6b4f332ecf1e985eca512336e0f0bb06e1d923e74d(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_8(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "total_query":{
const executed=f_6f015cf95d2de57418f6ec4a135049e4c4efe16e1bd8e8e2d897be79d1b5cda2(physical,version);const observed=f_08d94601ac1aa2ed93b41bdd0a8554f32110869bd547d78880f4da001de33883(executed),next=f_186b6350f974a9daf5c57b97446437bb2cabe2a9241d8e38d84e02980089fef8(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "count_query":{
const executed=f_e20846c003a8b502d7ad895156c1789be9b8dd4e753f999358335a76133df97f(physical,version);const observed=f_f8b201f9576cf5f758072d19d59fc2103838413eaff9a64f4a5aa01b90455187(executed),next=f_186b6350f974a9daf5c57b97446437bb2cabe2a9241d8e38d84e02980089fef8(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
default:throw Error(`unknown action ${name}`);}}
return Object.freeze({invoke:invoke_json,invoke_json,beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');transaction=null;},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;transaction=null;},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_b7826aae147e8886f18fda462f945afd80c7cde8cda9e79cef27e33f8a6fcf2e(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);const next=f_378fe8760941738df4a2ee37fb2ec528d1a07b3b9e12ffcf79558a65c32829f4(logical);physical=next;version=saved.version;outbox=saved.outbox;}finally{busy=false;}}});}
function __publicEvent(channel,value){switch(channel){
case "seen":return write_1(read_1(value,0,true),0,false);
default:throw Error('unknown source event');}}

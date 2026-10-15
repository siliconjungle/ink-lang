const __nullaryNodes=[];
function __nullaryNode(c){return __nullaryNodes[c]??=({c,a:[]});}
function __node(c,a){return a.length===0?__nullaryNode(c):{c,a};}
const __deepCall=Symbol('private direct-call depth');let __directDepth=0;
function __run(call){const stack=[call];let result;while(stack.length){const frame=stack[stack.length-1],step=frame.next(result);if(step.done){result=step.value;stack.pop();}else{result=undefined;stack.push(step.value);}}return result;}
const __fpView=new DataView(new ArrayBuffer(4));
function __fpNumber(bits){__fpView.setUint32(0,Number(BigInt.asUintN(32,bits)),true);return __fpView.getFloat32(0,true);}
function __fpWord(op,a,b){
 if(op==='neg')return BigInt.asUintN(32,a)^2147483648n;
 const x=__fpNumber(a),y=__fpNumber(b);
 switch(op){case '==':return x===y;case '!=':return x!==y;case '<':return x<y;case '<=':return x<=y;case '>':return x>y;case '>=':return x>=y;}
 if(op==='is_nan')return Number.isNaN(x);if(op==='is_finite')return Number.isFinite(x);
 const even=x=>{if(!Number.isFinite(x)||Math.abs(x)>=8388608)return x;const a=Math.abs(x),i=Math.floor(a),r=a-i,y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;};
 const value=op==='+'?x+y:op==='-'?x-y:op==='*'?x*y:op==='div'?x/y:op==='sqrt'?Math.sqrt(x):op==='floor'?Math.floor(x):op==='ceil'?Math.ceil(x):op==='trunc'?Math.trunc(x):op==='round_ties_even'?even(x):undefined;
 if(value===undefined)throw Error('binary32 operator');if(Number.isNaN(value))return 2143289344n;__fpView.setFloat32(0,value,true);return BigInt(__fpView.getUint32(0,true));
}
function d_00e97e12a7e948c1b99476ebee82e98113958bdc0e22702ae5fc32ab7686f55e(a0){let v0;switch(a0.c){
case 0:{
const v2=d_994d31f9c6717bd5a3b06e8cf97f0506a6e94f81bbe54540d255a4dd9b9c84d7(a0.a[0],a0.a[1]);
v0=v2;break;}
default:throw Error('literal constructor projection');}
return v0;}
function* d_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(a0){let v5;switch(a0.c){
case 0:{
const v7=yield d_bbd06f8ad19624e300f552c0694799b4de98a6f84552186d49ece18aa918e641(a0.a[0],a0.a[1]);
v5=v7;break;}
default:throw Error('literal constructor projection');}
return v5;}
function d_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(a0){let v10;switch(a0.c){
case 0:{
v10=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v10;}
function* d_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0,a1,a2,a3,a4){let v13;switch(a0.c){
case 0:{
const v15=__nullaryNode(0);
v13=v15;break;}
case 1:{
let v18;if(a2){
v18=a4;}else{
const v21=false;
v18=v21;}
let v17;if(v18){
const v24=BigInt.asUintN(64,(a1)+(a3));
const v22=(a0.a[0])>(v24);
v17=v22;}else{
const v27=false;
v17=v27;}
let v16;if(v17){
const v30=yield d_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0.a[1],a1,a2,a3,a4);
const v28=__node(1,[a0.a[0],v30]);
v16=v28;}else{
const v36=yield d_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0.a[1],a1,a2,a3,a4);
v16=v36;}
v13=v16;break;}
default:throw Error('literal constructor projection');}
return v13;}
function* d_1da9e3da836de4e84a5d05f14d13542bda1811d1c496d57a3705f94e7c3531e6(a0,a1){const v43=yield d_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0,a1);
let v42;switch(v43.c){
case 0:{
const v46=false;
v42=v46;break;}
case 1:{
const v47=true;
v42=v47;break;}
default:throw Error('literal constructor projection');}
return v42;}
function* d_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(a0,a1,a2){const v51=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v50=yield d_d6e0436187b0639761ef247dc1095e52ac223260a6ccc5c6dd7efd37755b0eaa(v51,a1,a2);
const v48=__node(0,[a0,v50]);
return v48;}
function* d_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(a0,a1,a2,a3,a4){const v56=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v59=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v58=yield d_d215f30bcbdb0f9046f8696402b3ccdc67634e11f3877c494688846e9753c8c1(v59,a1,a2,a3,a4);
const v55=__node(0,[v56,v58]);
return v55;}
function* d_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0,a1){let v65;switch(a0.c){
case 0:{
const v67=__nullaryNode(0);
v65=v67;break;}
case 1:{
const v69=(a1)===(a0.a[0]);
let v68;if(v69){
const v72=yield d_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0.a[2],a1);
v68=v72;}else{
const v78=yield d_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0.a[2],a1);
const v75=__node(1,[a0.a[0],a0.a[1],v78]);
v68=v75;}
v65=v68;break;}
default:throw Error('literal constructor projection');}
return v65;}
function* d_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0){let v81;switch(a0.c){
case 0:{
const v83=__nullaryNode(0);
v81=v83;break;}
case 1:{
const v86=yield d_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0.a[2]);
const v84=__node(1,[a0.a[1],v86]);
v81=v84;break;}
default:throw Error('literal constructor projection');}
return v81;}
function* d_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(a0){let v88;switch(a0.c){
case 0:{
const v90=0n;
v88=v90;break;}
case 1:{
const v93=yield d_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(a0.a[1]);
const v91=BigInt.asUintN(64,(a0.a[0])+(v93));
v88=v91;break;}
default:throw Error('literal constructor projection');}
return v88;}
function* d_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(a0,a1){let v95;switch(a0.c){
case 0:{
const v99=__nullaryNode(0);
const v97=__node(1,[a1,v99]);
v95=v97;break;}
case 1:{
const v102=yield d_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(a0.a[1],a1);
const v100=__node(1,[a0.a[0],v102]);
v95=v100;break;}
default:throw Error('literal constructor projection');}
return v95;}
function d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0){let v105;switch(a0.c){
case 0:{
v105=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v105;}
function* d_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(a0,a1,a2,a3){let v108;switch(a0.c){
case 0:{
const v116=7n;
const v114=(a2)===(v116);
const v119=true;
const v117=(a3)===(v119);
const v113=(v114)&&(v117);
let v112;if(v113){
const v122=false;
const v124=__node(0,[a0.a[1],a0.a[0]]);
const v127=__nullaryNode(0);
const v120=__node(0,[a0.a[2],v122,a1,v124,v127]);
v112=v120;}else{
const v129=__node(0,[a0.a[1],a0.a[0]]);
const v128=yield d_58f5593d82551409f8bf3a5b9fb7b60c4365fe868e4441606f4e797b3f4f1346(v129,a1,a2,a3);
v112=v128;}
const v110=__node(0,[a0,v112]);
v108=v110;break;}
default:throw Error('literal constructor projection');}
return v108;}
function* d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0,a1,a2){let v135;switch(a0.c){
case 0:{
const v140=__nullaryNode(0);
const v137=__node(1,[a1,a2,v140]);
v135=v137;break;}
case 1:{
const v142=(a1)<(a0.a[0]);
let v141;if(v142){
const v145=__node(1,[a1,a2,a0]);
v141=v145;}else{
const v152=yield d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0.a[2],a1,a2);
const v149=__node(1,[a0.a[0],a0.a[1],v152]);
v141=v149;}
v135=v141;break;}
default:throw Error('literal constructor projection');}
return v135;}
function* d_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(a0,a1){const v159=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v158=yield d_d64bcf0161fa6a750a5a97b63230450dae05f5c2b3de9e6afd18451f3f3cc41f(v159,a1);
const v156=__node(0,[a0,v158]);
return v156;}
function* d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0,a1){let v162;switch(a0.c){
case 0:{
const v164=__nullaryNode(0);
v162=v164;break;}
case 1:{
const v166=(a1)===(a0.a[0]);
let v165;if(v166){
const v169=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
v165=v169;}else{
const v175=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
const v172=__node(1,[a0.a[0],a0.a[1],v175]);
v165=v172;}
v162=v165;break;}
default:throw Error('literal constructor projection');}
return v162;}
function* d_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0,a1,a2){let v178;switch(a0.c){
case 0:{
const v180=__nullaryNode(0);
v178=v180;break;}
case 1:{
let v182;if(a2){
const v184=(a0.a[0])>(a1);
v182=v184;}else{
const v187=false;
v182=v187;}
let v181;if(v182){
const v190=yield d_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0.a[1],a1,a2);
const v188=__node(1,[a0.a[0],v190]);
v181=v188;}else{
const v194=yield d_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0.a[1],a1,a2);
v181=v194;}
v178=v181;break;}
default:throw Error('literal constructor projection');}
return v178;}
function d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0){let v198;switch(a0.c){
case 0:{
const v200=__node(0,[a0.a[1],a0.a[0]]);
v198=v200;break;}
default:throw Error('literal constructor projection');}
return v198;}
function* d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1){let v203;switch(a0.c){
case 0:{
const v205=__nullaryNode(0);
v203=v205;break;}
case 1:{
const v207=(a1)===(a0.a[0]);
let v206;if(v207){
const v210=__node(1,[a0.a[1]]);
v206=v210;}else{
const v212=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0.a[2],a1);
v206=v212;}
v203=v206;break;}
default:throw Error('literal constructor projection');}
return v203;}
function* d_58f5593d82551409f8bf3a5b9fb7b60c4365fe868e4441606f4e797b3f4f1346(a0,a1,a2,a3){let v219;switch(a0.c){
case 0:{
v219=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v218=yield d_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(v219);
const v217=yield d_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(v218,a2,a3);
const v216=yield d_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v217);
const v224=false;
const v227=__nullaryNode(0);
const v215=__node(0,[v216,v224,a1,a0,v227]);
return v215;}
function d_5c7a045e4c67fd999ca409a0ee9ea64fb6f592ff202334ae767217e07f21b20c(a0){let v228;switch(a0.c){
case 0:{
v228=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v228;}
function* d_5d8a4a3ba01d191ea2d95dd3a8689bb86381b788688a626d8663f0bde35ac1f0(a0,a1,a2,a3,a4,a5){let v235;switch(a0.c){
case 0:{
v235=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v234=yield d_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(v235);
const v233=yield d_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(v234,a2,a3,a4,a5);
const v232=yield d_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v233);
const v242=false;
const v245=__nullaryNode(0);
const v231=__node(0,[v232,v242,a1,a0,v245]);
return v231;}
function d_797626ef604201781c474feaf09804195fd465633417d9dc9af2540ac9c963ae(a0){let v246;switch(a0.c){
case 0:{
v246=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v246;}
function d_8808512d588cb4820ac5be9f6cced4e5aac6b272db569428411ee8763ae5c5cb(a0){let v249;switch(a0.c){
case 0:{
v249=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v249;}
function d_91d812bd091decafa5e3540b78565a80fa12cbfb47227f9a4c426d95b1aa8fba(a0){let v252;switch(a0.c){
case 0:{
v252=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v252;}
function d_95f0e4554f4ebe956b405a90fac282abcafa9391aedbd6949a49fd5295820785(a0){let v255;switch(a0.c){
case 0:{
v255=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v255;}
function d_994d31f9c6717bd5a3b06e8cf97f0506a6e94f81bbe54540d255a4dd9b9c84d7(a0,a1){let v258;switch(a1.c){
case 0:{
let v260;switch(a1.a[3].c){
case 0:{
const v262=__node(0,[a1.a[3].a[1],a1.a[3].a[0],a0]);
v260=v262;break;}
default:throw Error('literal constructor projection');}
v258=v260;break;}
case 1:{
let v266;switch(a1.a[2].c){
case 0:{
const v268=__node(0,[a1.a[2].a[1],a1.a[2].a[0],a0]);
v266=v268;break;}
default:throw Error('literal constructor projection');}
v258=v266;break;}
default:throw Error('literal constructor projection');}
return v258;}
function* d_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(a0,a1,a2){const v273=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v276=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v275=yield d_c6a3a56c209a8eaec2fed5a0f13945c89fd2b192c1fdc4d85b76b140d86b14ac(v276,a1,a2);
const v272=__node(0,[v273,v275]);
return v272;}
function* d_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(a0,a1,a2,a3){const v281=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v284=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v283=yield d_f0da627ea7594c10d87d53cebda5e24f12169ea3795e0696c2a78256cd20a6fd(v284,a1,a2,a3);
const v280=__node(0,[v281,v283]);
return v280;}
function* d_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(a0,a1,a2){let v289;switch(a0.c){
case 0:{
const v294=__nullaryNode(0);
const v291=__node(1,[a1,a2,v294]);
v289=v291;break;}
case 1:{
const v296=(a1)<(a0.a[0]);
let v295;if(v296){
const v299=__node(1,[a1,a2,a0]);
v295=v299;}else{
const v306=yield d_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(a0.a[2],a1,a2);
const v303=__node(1,[a0.a[0],a0.a[1],v306]);
v295=v303;}
v289=v295;break;}
default:throw Error('literal constructor projection');}
return v289;}
function* d_bbd06f8ad19624e300f552c0694799b4de98a6f84552186d49ece18aa918e641(a0,a1){let v310;switch(a1.c){
case 0:{
let v312;if(a1.a[1]){
const v314=yield d_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a1.a[3]);
v312=v314;}else{
let v316;switch(a1.a[3].c){
case 0:{
const v318=__node(0,[a1.a[3].a[1],a1.a[3].a[0],a0]);
v316=v318;break;}
default:throw Error('literal constructor projection');}
v312=v316;}
v310=v312;break;}
case 1:{
let v322;switch(a1.a[2].c){
case 0:{
const v324=__node(0,[a1.a[2].a[1],a1.a[2].a[0],a0]);
v322=v324;break;}
default:throw Error('literal constructor projection');}
v310=v322;break;}
default:throw Error('literal constructor projection');}
return v310;}
function* d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(a0,a1){const v329=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1);
let v328;switch(v329.c){
case 0:{
const v332=false;
v328=v332;break;}
case 1:{
const v333=true;
v328=v333;break;}
default:throw Error('literal constructor projection');}
return v328;}
function* d_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a0){let v334;switch(a0.c){
case 0:{
const v341=yield d_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0.a[0]);
const v343=7n;
const v344=true;
const v340=yield d_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(v341,v343,v344);
const v339=yield d_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v340);
const v336=__node(0,[a0.a[1],a0.a[0],v339]);
v334=v336;break;}
default:throw Error('literal constructor projection');}
return v334;}
function d_c16b5ec5dc3d3a495ffc95be4fd1cd1cbc20cdf4f36bc8046e0beebfeedfc273(a0){let v345;switch(a0.c){
case 0:{
v345=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v345;}
function* d_c6a3a56c209a8eaec2fed5a0f13945c89fd2b192c1fdc4d85b76b140d86b14ac(a0,a1,a2){let v350;switch(a0.c){
case 0:{
let v354;switch(a0.c){
case 0:{
v354=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v353=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v354,a2);
const v352=__node(0,[v353,a0.a[1]]);
v350=v352;break;}
default:throw Error('literal constructor projection');}
const v349=__node(0,[v350]);
let v348;switch(v349.c){
case 0:{
const v361=__nullaryNode(0);
const v360=__node(0,[v361]);
let v359;switch(v360.c){
case 0:{
const v365=18446744073709551615n;
const v363=(a1)===(v365);
let v362;if(v363){
const v367=1n;
const v366=__node(1,[v367,a1,a0]);
v362=v366;}else{
const v371=__node(0,[v360.a[0]]);
const v373=true;
const v376=1n;
const v374=BigInt.asUintN(64,(a1)+(v376));
const v378=__nullaryNode(0);
const v370=__node(0,[v371,v373,v374,v349.a[0],v378]);
v362=v370;}
v359=v362;break;}
case 1:{
const v380=__node(1,[v360.a[0]]);
const v382=false;
const v385=__nullaryNode(0);
const v379=__node(0,[v380,v382,a1,a0,v385]);
v359=v379;break;}
default:throw Error('literal constructor projection');}
v348=v359;break;}
default:throw Error('literal constructor projection');}
return v348;}
function d_ce737b590102a4656bba35228ab31c8f7063faa0cbe3466de7aef5a367fb615a(a0){let v386;switch(a0.c){
case 0:{
v386=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v386;}
function* d_d215f30bcbdb0f9046f8696402b3ccdc67634e11f3877c494688846e9753c8c1(a0,a1,a2,a3,a4){let v391;switch(a0.c){
case 0:{
let v395;switch(a0.c){
case 0:{
v395=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v394=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v395,a2);
const v393=__node(0,[v394,a0.a[1]]);
v391=v393;break;}
default:throw Error('literal constructor projection');}
const v390=__node(0,[v391]);
let v389;switch(v390.c){
case 0:{
let v402;switch(v390.a[0].c){
case 0:{
v402=v390.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v401=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v402,a2);
let v400;if(v401){
const v407=2n;
const v406=__node(1,[v407,a1,a0]);
v400=v406;}else{
let v412;switch(v390.a[0].c){
case 0:{
let v416;switch(v390.a[0].c){
case 0:{
v416=v390.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v415=yield d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(v416,a2,a3);
const v414=__node(0,[v415,v390.a[0].a[1]]);
v412=v414;break;}
default:throw Error('literal constructor projection');}
const v411=__node(0,[v412]);
let v410;switch(v411.c){
case 0:{
const v425=__nullaryNode(0);
const v426=__node(0,[a3]);
const v424=yield d_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(v425,v426);
const v423=__node(0,[v424]);
let v422;switch(v423.c){
case 0:{
let v428;if(a4){
const v432=__nullaryNode(0);
const v431=__node(1,[v432]);
let v430;switch(v431.c){
case 0:{
const v436=18446744073709551615n;
const v434=(a1)===(v436);
let v433;if(v434){
const v438=1n;
const v437=__node(1,[v438,a1,a0]);
v433=v437;}else{
const v442=__node(0,[v431.a[0]]);
const v444=true;
const v447=1n;
const v445=BigInt.asUintN(64,(a1)+(v447));
const v441=__node(0,[v442,v444,v445,v411.a[0],v423.a[0]]);
v433=v441;}
v430=v433;break;}
case 1:{
const v451=__node(1,[v431.a[0]]);
const v453=false;
const v456=__nullaryNode(0);
const v450=__node(0,[v451,v453,a1,a0,v456]);
v430=v450;break;}
default:throw Error('literal constructor projection');}
v428=v430;}else{
const v459=__nullaryNode(0);
const v458=__node(0,[v459]);
let v457;switch(v458.c){
case 0:{
const v463=18446744073709551615n;
const v461=(a1)===(v463);
let v460;if(v461){
const v465=1n;
const v464=__node(1,[v465,a1,a0]);
v460=v464;}else{
const v469=__node(0,[v458.a[0]]);
const v471=true;
const v474=1n;
const v472=BigInt.asUintN(64,(a1)+(v474));
const v468=__node(0,[v469,v471,v472,v411.a[0],v423.a[0]]);
v460=v468;}
v457=v460;break;}
case 1:{
const v478=__node(1,[v458.a[0]]);
const v480=false;
const v483=__nullaryNode(0);
const v477=__node(0,[v478,v480,a1,a0,v483]);
v457=v477;break;}
default:throw Error('literal constructor projection');}
v428=v457;}
v422=v428;break;}
default:throw Error('literal constructor projection');}
v410=v422;break;}
default:throw Error('literal constructor projection');}
v400=v410;}
v389=v400;break;}
default:throw Error('literal constructor projection');}
return v389;}
function* d_d64bcf0161fa6a750a5a97b63230450dae05f5c2b3de9e6afd18451f3f3cc41f(a0,a1){let v486;switch(a0.c){
case 0:{
v486=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v489=0n;
const v485=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v486,v489);
const v490=false;
const v493=__nullaryNode(0);
const v484=__node(0,[v485,v490,a1,a0,v493]);
return v484;}
function* d_d6e0436187b0639761ef247dc1095e52ac223260a6ccc5c6dd7efd37755b0eaa(a0,a1,a2){let v496;switch(a0.c){
case 0:{
v496=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v495=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v496,a2);
const v500=false;
const v503=__nullaryNode(0);
const v494=__node(0,[v495,v500,a1,a0,v503]);
return v494;}
function* d_f0da627ea7594c10d87d53cebda5e24f12169ea3795e0696c2a78256cd20a6fd(a0,a1,a2,a3){let v506;switch(a0.c){
case 0:{
let v511;switch(a0.c){
case 0:{
v511=a0.a[1];break;}
default:throw Error('literal constructor projection');}
const v510=yield d_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(v511,a2);
const v508=__node(0,[a0.a[0],v510]);
v506=v508;break;}
default:throw Error('literal constructor projection');}
const v505=__node(0,[v506]);
let v504;switch(v505.c){
case 0:{
let v517;switch(v505.a[0].c){
case 0:{
v517=v505.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
const v516=yield d_1da9e3da836de4e84a5d05f14d13542bda1811d1c496d57a3705f94e7c3531e6(v517,a2);
let v515;if(v516){
const v522=2n;
const v521=__node(1,[v522,a1,a0]);
v515=v521;}else{
let v527;switch(v505.a[0].c){
case 0:{
let v532;switch(v505.a[0].c){
case 0:{
v532=v505.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
const v531=yield d_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(v532,a2,a3);
const v529=__node(0,[v505.a[0].a[0],v531]);
v527=v529;break;}
default:throw Error('literal constructor projection');}
const v526=__node(0,[v527]);
let v525;switch(v526.c){
case 0:{
const v539=__nullaryNode(0);
const v538=__node(0,[v539]);
let v537;switch(v538.c){
case 0:{
const v543=18446744073709551615n;
const v541=(a1)===(v543);
let v540;if(v541){
const v545=1n;
const v544=__node(1,[v545,a1,a0]);
v540=v544;}else{
const v549=__node(0,[v538.a[0]]);
const v551=true;
const v554=1n;
const v552=BigInt.asUintN(64,(a1)+(v554));
const v556=__nullaryNode(0);
const v548=__node(0,[v549,v551,v552,v526.a[0],v556]);
v540=v548;}
v537=v540;break;}
case 1:{
const v558=__node(1,[v538.a[0]]);
const v560=false;
const v563=__nullaryNode(0);
const v557=__node(0,[v558,v560,a1,a0,v563]);
v537=v557;break;}
default:throw Error('literal constructor projection');}
v525=v537;break;}
default:throw Error('literal constructor projection');}
v515=v525;}
v504=v515;break;}
default:throw Error('literal constructor projection');}
return v504;}
function d_f653aa4d4ffd77b7d3e2a34334e7c0b22e34da6dce91a1433ead8b9479f80aae(a0){let v564;switch(a0.c){
case 0:{
v564=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v564;}
function* d_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0,a1){let v567;switch(a0.c){
case 0:{
const v569=__nullaryNode(0);
v567=v569;break;}
case 1:{
const v571=(a1)===(a0.a[0]);
let v570;if(v571){
const v574=__node(1,[a0.a[1]]);
v570=v574;}else{
const v576=yield d_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0.a[2],a1);
v570=v576;}
v567=v570;break;}
default:throw Error('literal constructor projection');}
return v567;}
function* d_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(a0,a1,a2,a3,a4,a5){const v582=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v581=yield d_5d8a4a3ba01d191ea2d95dd3a8689bb86381b788688a626d8663f0bde35ac1f0(v582,a1,a2,a3,a4,a5);
const v579=__node(0,[a0,v581]);
return v579;}
function dFast_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v0;switch(a0.c){
case 0:{
const v2=dFast_bbd06f8ad19624e300f552c0694799b4de98a6f84552186d49ece18aa918e641(a0.a[0],a0.a[1]);
v0=v2;break;}
default:throw Error('literal constructor projection');}
return v0;}finally{__directDepth--;}}
function dFast_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0,a1,a2,a3,a4){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v5;switch(a0.c){
case 0:{
const v7=__nullaryNode(0);
v5=v7;break;}
case 1:{
let v10;if(a2){
v10=a4;}else{
const v13=false;
v10=v13;}
let v9;if(v10){
const v16=BigInt.asUintN(64,(a1)+(a3));
const v14=(a0.a[0])>(v16);
v9=v14;}else{
const v19=false;
v9=v19;}
let v8;if(v9){
const v22=dFast_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0.a[1],a1,a2,a3,a4);
const v20=__node(1,[a0.a[0],v22]);
v8=v20;}else{
const v28=dFast_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(a0.a[1],a1,a2,a3,a4);
v8=v28;}
v5=v8;break;}
default:throw Error('literal constructor projection');}
return v5;}finally{__directDepth--;}}
function dFast_1da9e3da836de4e84a5d05f14d13542bda1811d1c496d57a3705f94e7c3531e6(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v35=dFast_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0,a1);
let v34;switch(v35.c){
case 0:{
const v38=false;
v34=v38;break;}
case 1:{
const v39=true;
v34=v39;break;}
default:throw Error('literal constructor projection');}
return v34;}finally{__directDepth--;}}
function dFast_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v43=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v42=dFast_d6e0436187b0639761ef247dc1095e52ac223260a6ccc5c6dd7efd37755b0eaa(v43,a1,a2);
const v40=__node(0,[a0,v42]);
return v40;}finally{__directDepth--;}}
function dFast_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(a0,a1,a2,a3,a4){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v48=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v51=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v50=dFast_d215f30bcbdb0f9046f8696402b3ccdc67634e11f3877c494688846e9753c8c1(v51,a1,a2,a3,a4);
const v47=__node(0,[v48,v50]);
return v47;}finally{__directDepth--;}}
function dFast_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v57;switch(a0.c){
case 0:{
const v59=__nullaryNode(0);
v57=v59;break;}
case 1:{
const v61=(a1)===(a0.a[0]);
let v60;if(v61){
const v64=dFast_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0.a[2],a1);
v60=v64;}else{
const v70=dFast_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(a0.a[2],a1);
const v67=__node(1,[a0.a[0],a0.a[1],v70]);
v60=v67;}
v57=v60;break;}
default:throw Error('literal constructor projection');}
return v57;}finally{__directDepth--;}}
function dFast_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v73;switch(a0.c){
case 0:{
const v75=__nullaryNode(0);
v73=v75;break;}
case 1:{
const v78=dFast_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0.a[2]);
const v76=__node(1,[a0.a[1],v78]);
v73=v76;break;}
default:throw Error('literal constructor projection');}
return v73;}finally{__directDepth--;}}
function dFast_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v80;switch(a0.c){
case 0:{
const v82=0n;
v80=v82;break;}
case 1:{
const v85=dFast_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(a0.a[1]);
const v83=BigInt.asUintN(64,(a0.a[0])+(v85));
v80=v83;break;}
default:throw Error('literal constructor projection');}
return v80;}finally{__directDepth--;}}
function dFast_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v87;switch(a0.c){
case 0:{
const v91=__nullaryNode(0);
const v89=__node(1,[a1,v91]);
v87=v89;break;}
case 1:{
const v94=dFast_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(a0.a[1],a1);
const v92=__node(1,[a0.a[0],v94]);
v87=v92;break;}
default:throw Error('literal constructor projection');}
return v87;}finally{__directDepth--;}}
function dFast_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v97;switch(a0.c){
case 0:{
const v105=7n;
const v103=(a2)===(v105);
const v108=true;
const v106=(a3)===(v108);
const v102=(v103)&&(v106);
let v101;if(v102){
const v111=false;
const v113=__node(0,[a0.a[1],a0.a[0]]);
const v116=__nullaryNode(0);
const v109=__node(0,[a0.a[2],v111,a1,v113,v116]);
v101=v109;}else{
const v118=__node(0,[a0.a[1],a0.a[0]]);
const v117=dFast_58f5593d82551409f8bf3a5b9fb7b60c4365fe868e4441606f4e797b3f4f1346(v118,a1,a2,a3);
v101=v117;}
const v99=__node(0,[a0,v101]);
v97=v99;break;}
default:throw Error('literal constructor projection');}
return v97;}finally{__directDepth--;}}
function dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v124;switch(a0.c){
case 0:{
const v129=__nullaryNode(0);
const v126=__node(1,[a1,a2,v129]);
v124=v126;break;}
case 1:{
const v131=(a1)<(a0.a[0]);
let v130;if(v131){
const v134=__node(1,[a1,a2,a0]);
v130=v134;}else{
const v141=dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0.a[2],a1,a2);
const v138=__node(1,[a0.a[0],a0.a[1],v141]);
v130=v138;}
v124=v130;break;}
default:throw Error('literal constructor projection');}
return v124;}finally{__directDepth--;}}
function dFast_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v148=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v147=dFast_d64bcf0161fa6a750a5a97b63230450dae05f5c2b3de9e6afd18451f3f3cc41f(v148,a1);
const v145=__node(0,[a0,v147]);
return v145;}finally{__directDepth--;}}
function dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v151;switch(a0.c){
case 0:{
const v153=__nullaryNode(0);
v151=v153;break;}
case 1:{
const v155=(a1)===(a0.a[0]);
let v154;if(v155){
const v158=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
v154=v158;}else{
const v164=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
const v161=__node(1,[a0.a[0],a0.a[1],v164]);
v154=v161;}
v151=v154;break;}
default:throw Error('literal constructor projection');}
return v151;}finally{__directDepth--;}}
function dFast_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v167;switch(a0.c){
case 0:{
const v169=__nullaryNode(0);
v167=v169;break;}
case 1:{
let v171;if(a2){
const v173=(a0.a[0])>(a1);
v171=v173;}else{
const v176=false;
v171=v176;}
let v170;if(v171){
const v179=dFast_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0.a[1],a1,a2);
const v177=__node(1,[a0.a[0],v179]);
v170=v177;}else{
const v183=dFast_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(a0.a[1],a1,a2);
v170=v183;}
v167=v170;break;}
default:throw Error('literal constructor projection');}
return v167;}finally{__directDepth--;}}
function dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v187;switch(a0.c){
case 0:{
const v189=__nullaryNode(0);
v187=v189;break;}
case 1:{
const v191=(a1)===(a0.a[0]);
let v190;if(v191){
const v194=__node(1,[a0.a[1]]);
v190=v194;}else{
const v196=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0.a[2],a1);
v190=v196;}
v187=v190;break;}
default:throw Error('literal constructor projection');}
return v187;}finally{__directDepth--;}}
function dFast_58f5593d82551409f8bf3a5b9fb7b60c4365fe868e4441606f4e797b3f4f1346(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v203;switch(a0.c){
case 0:{
v203=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v202=dFast_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(v203);
const v201=dFast_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(v202,a2,a3);
const v200=dFast_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v201);
const v208=false;
const v211=__nullaryNode(0);
const v199=__node(0,[v200,v208,a1,a0,v211]);
return v199;}finally{__directDepth--;}}
function dFast_5d8a4a3ba01d191ea2d95dd3a8689bb86381b788688a626d8663f0bde35ac1f0(a0,a1,a2,a3,a4,a5){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v216;switch(a0.c){
case 0:{
v216=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v215=dFast_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(v216);
const v214=dFast_1ad77934be002323f9d30422a8ff7ce1b187cab7414b59b077679ba9d84a6639(v215,a2,a3,a4,a5);
const v213=dFast_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v214);
const v223=false;
const v226=__nullaryNode(0);
const v212=__node(0,[v213,v223,a1,a0,v226]);
return v212;}finally{__directDepth--;}}
function dFast_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v228=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v231=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v230=dFast_c6a3a56c209a8eaec2fed5a0f13945c89fd2b192c1fdc4d85b76b140d86b14ac(v231,a1,a2);
const v227=__node(0,[v228,v230]);
return v227;}finally{__directDepth--;}}
function dFast_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v236=d_3c29fcf03c716f45c5f1ad0f10db16d71746701369db571c4c7e3b7911388ad3(a0);
const v239=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v238=dFast_f0da627ea7594c10d87d53cebda5e24f12169ea3795e0696c2a78256cd20a6fd(v239,a1,a2,a3);
const v235=__node(0,[v236,v238]);
return v235;}finally{__directDepth--;}}
function dFast_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v244;switch(a0.c){
case 0:{
const v249=__nullaryNode(0);
const v246=__node(1,[a1,a2,v249]);
v244=v246;break;}
case 1:{
const v251=(a1)<(a0.a[0]);
let v250;if(v251){
const v254=__node(1,[a1,a2,a0]);
v250=v254;}else{
const v261=dFast_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(a0.a[2],a1,a2);
const v258=__node(1,[a0.a[0],a0.a[1],v261]);
v250=v258;}
v244=v250;break;}
default:throw Error('literal constructor projection');}
return v244;}finally{__directDepth--;}}
function dFast_bbd06f8ad19624e300f552c0694799b4de98a6f84552186d49ece18aa918e641(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v265;switch(a1.c){
case 0:{
let v267;if(a1.a[1]){
const v269=dFast_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a1.a[3]);
v267=v269;}else{
let v271;switch(a1.a[3].c){
case 0:{
const v273=__node(0,[a1.a[3].a[1],a1.a[3].a[0],a0]);
v271=v273;break;}
default:throw Error('literal constructor projection');}
v267=v271;}
v265=v267;break;}
case 1:{
let v277;switch(a1.a[2].c){
case 0:{
const v279=__node(0,[a1.a[2].a[1],a1.a[2].a[0],a0]);
v277=v279;break;}
default:throw Error('literal constructor projection');}
v265=v277;break;}
default:throw Error('literal constructor projection');}
return v265;}finally{__directDepth--;}}
function dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v284=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1);
let v283;switch(v284.c){
case 0:{
const v287=false;
v283=v287;break;}
case 1:{
const v288=true;
v283=v288;break;}
default:throw Error('literal constructor projection');}
return v283;}finally{__directDepth--;}}
function dFast_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v289;switch(a0.c){
case 0:{
const v296=dFast_2ced9bdd300fd4a098f9904849d581bf8de5db1654806d438268fd95471bfdeb(a0.a[0]);
const v298=7n;
const v299=true;
const v295=dFast_53e993bba95adb77b01c34015ac2053f1db69c9d94fea654f65923a9df7019ab(v296,v298,v299);
const v294=dFast_320c8a05cf2dce4253bee1bb127951cfdf3b161f9aad289d85ea4530d91f7573(v295);
const v291=__node(0,[a0.a[1],a0.a[0],v294]);
v289=v291;break;}
default:throw Error('literal constructor projection');}
return v289;}finally{__directDepth--;}}
function dFast_c6a3a56c209a8eaec2fed5a0f13945c89fd2b192c1fdc4d85b76b140d86b14ac(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v302;switch(a0.c){
case 0:{
let v306;switch(a0.c){
case 0:{
v306=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v305=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v306,a2);
const v304=__node(0,[v305,a0.a[1]]);
v302=v304;break;}
default:throw Error('literal constructor projection');}
const v301=__node(0,[v302]);
let v300;switch(v301.c){
case 0:{
const v313=__nullaryNode(0);
const v312=__node(0,[v313]);
let v311;switch(v312.c){
case 0:{
const v317=18446744073709551615n;
const v315=(a1)===(v317);
let v314;if(v315){
const v319=1n;
const v318=__node(1,[v319,a1,a0]);
v314=v318;}else{
const v323=__node(0,[v312.a[0]]);
const v325=true;
const v328=1n;
const v326=BigInt.asUintN(64,(a1)+(v328));
const v330=__nullaryNode(0);
const v322=__node(0,[v323,v325,v326,v301.a[0],v330]);
v314=v322;}
v311=v314;break;}
case 1:{
const v332=__node(1,[v312.a[0]]);
const v334=false;
const v337=__nullaryNode(0);
const v331=__node(0,[v332,v334,a1,a0,v337]);
v311=v331;break;}
default:throw Error('literal constructor projection');}
v300=v311;break;}
default:throw Error('literal constructor projection');}
return v300;}finally{__directDepth--;}}
function dFast_d215f30bcbdb0f9046f8696402b3ccdc67634e11f3877c494688846e9753c8c1(a0,a1,a2,a3,a4){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v340;switch(a0.c){
case 0:{
let v344;switch(a0.c){
case 0:{
v344=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v343=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v344,a2);
const v342=__node(0,[v343,a0.a[1]]);
v340=v342;break;}
default:throw Error('literal constructor projection');}
const v339=__node(0,[v340]);
let v338;switch(v339.c){
case 0:{
let v351;switch(v339.a[0].c){
case 0:{
v351=v339.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v350=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v351,a2);
let v349;if(v350){
const v356=2n;
const v355=__node(1,[v356,a1,a0]);
v349=v355;}else{
let v361;switch(v339.a[0].c){
case 0:{
let v365;switch(v339.a[0].c){
case 0:{
v365=v339.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v364=dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(v365,a2,a3);
const v363=__node(0,[v364,v339.a[0].a[1]]);
v361=v363;break;}
default:throw Error('literal constructor projection');}
const v360=__node(0,[v361]);
let v359;switch(v360.c){
case 0:{
const v374=__nullaryNode(0);
const v375=__node(0,[a3]);
const v373=dFast_3c2911e41060257a244cd010f703f3df4fe042f1f539a2495f286422360a4a0b(v374,v375);
const v372=__node(0,[v373]);
let v371;switch(v372.c){
case 0:{
let v377;if(a4){
const v381=__nullaryNode(0);
const v380=__node(1,[v381]);
let v379;switch(v380.c){
case 0:{
const v385=18446744073709551615n;
const v383=(a1)===(v385);
let v382;if(v383){
const v387=1n;
const v386=__node(1,[v387,a1,a0]);
v382=v386;}else{
const v391=__node(0,[v380.a[0]]);
const v393=true;
const v396=1n;
const v394=BigInt.asUintN(64,(a1)+(v396));
const v390=__node(0,[v391,v393,v394,v360.a[0],v372.a[0]]);
v382=v390;}
v379=v382;break;}
case 1:{
const v400=__node(1,[v380.a[0]]);
const v402=false;
const v405=__nullaryNode(0);
const v399=__node(0,[v400,v402,a1,a0,v405]);
v379=v399;break;}
default:throw Error('literal constructor projection');}
v377=v379;}else{
const v408=__nullaryNode(0);
const v407=__node(0,[v408]);
let v406;switch(v407.c){
case 0:{
const v412=18446744073709551615n;
const v410=(a1)===(v412);
let v409;if(v410){
const v414=1n;
const v413=__node(1,[v414,a1,a0]);
v409=v413;}else{
const v418=__node(0,[v407.a[0]]);
const v420=true;
const v423=1n;
const v421=BigInt.asUintN(64,(a1)+(v423));
const v417=__node(0,[v418,v420,v421,v360.a[0],v372.a[0]]);
v409=v417;}
v406=v409;break;}
case 1:{
const v427=__node(1,[v407.a[0]]);
const v429=false;
const v432=__nullaryNode(0);
const v426=__node(0,[v427,v429,a1,a0,v432]);
v406=v426;break;}
default:throw Error('literal constructor projection');}
v377=v406;}
v371=v377;break;}
default:throw Error('literal constructor projection');}
v359=v371;break;}
default:throw Error('literal constructor projection');}
v349=v359;}
v338=v349;break;}
default:throw Error('literal constructor projection');}
return v338;}finally{__directDepth--;}}
function dFast_d64bcf0161fa6a750a5a97b63230450dae05f5c2b3de9e6afd18451f3f3cc41f(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v435;switch(a0.c){
case 0:{
v435=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v438=0n;
const v434=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v435,v438);
const v439=false;
const v442=__nullaryNode(0);
const v433=__node(0,[v434,v439,a1,a0,v442]);
return v433;}finally{__directDepth--;}}
function dFast_d6e0436187b0639761ef247dc1095e52ac223260a6ccc5c6dd7efd37755b0eaa(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v445;switch(a0.c){
case 0:{
v445=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v444=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v445,a2);
const v449=false;
const v452=__nullaryNode(0);
const v443=__node(0,[v444,v449,a1,a0,v452]);
return v443;}finally{__directDepth--;}}
function dFast_f0da627ea7594c10d87d53cebda5e24f12169ea3795e0696c2a78256cd20a6fd(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v455;switch(a0.c){
case 0:{
let v460;switch(a0.c){
case 0:{
v460=a0.a[1];break;}
default:throw Error('literal constructor projection');}
const v459=dFast_2cd9b06b1d4e5d5d10cd3a3d66a1d6da265c8646c32ec3691bd9d57a54138fb7(v460,a2);
const v457=__node(0,[a0.a[0],v459]);
v455=v457;break;}
default:throw Error('literal constructor projection');}
const v454=__node(0,[v455]);
let v453;switch(v454.c){
case 0:{
let v466;switch(v454.a[0].c){
case 0:{
v466=v454.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
const v465=dFast_1da9e3da836de4e84a5d05f14d13542bda1811d1c496d57a3705f94e7c3531e6(v466,a2);
let v464;if(v465){
const v471=2n;
const v470=__node(1,[v471,a1,a0]);
v464=v470;}else{
let v476;switch(v454.a[0].c){
case 0:{
let v481;switch(v454.a[0].c){
case 0:{
v481=v454.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
const v480=dFast_b83e7e8d69e7c2e3c46d99398f396642b39ce1eebbe0437874389993d14d7b56(v481,a2,a3);
const v478=__node(0,[v454.a[0].a[0],v480]);
v476=v478;break;}
default:throw Error('literal constructor projection');}
const v475=__node(0,[v476]);
let v474;switch(v475.c){
case 0:{
const v488=__nullaryNode(0);
const v487=__node(0,[v488]);
let v486;switch(v487.c){
case 0:{
const v492=18446744073709551615n;
const v490=(a1)===(v492);
let v489;if(v490){
const v494=1n;
const v493=__node(1,[v494,a1,a0]);
v489=v493;}else{
const v498=__node(0,[v487.a[0]]);
const v500=true;
const v503=1n;
const v501=BigInt.asUintN(64,(a1)+(v503));
const v505=__nullaryNode(0);
const v497=__node(0,[v498,v500,v501,v475.a[0],v505]);
v489=v497;}
v486=v489;break;}
case 1:{
const v507=__node(1,[v487.a[0]]);
const v509=false;
const v512=__nullaryNode(0);
const v506=__node(0,[v507,v509,a1,a0,v512]);
v486=v506;break;}
default:throw Error('literal constructor projection');}
v474=v486;break;}
default:throw Error('literal constructor projection');}
v464=v474;}
v453=v464;break;}
default:throw Error('literal constructor projection');}
return v453;}finally{__directDepth--;}}
function dFast_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v513;switch(a0.c){
case 0:{
const v515=__nullaryNode(0);
v513=v515;break;}
case 1:{
const v517=(a1)===(a0.a[0]);
let v516;if(v517){
const v520=__node(1,[a0.a[1]]);
v516=v520;}else{
const v522=dFast_f7435bd52a159014e96502afea2a951517667a4ce09fdb25c4071cb68fbe3683(a0.a[2],a1);
v516=v522;}
v513=v516;break;}
default:throw Error('literal constructor projection');}
return v513;}finally{__directDepth--;}}
function dFast_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(a0,a1,a2,a3,a4,a5){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v528=d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);
const v527=dFast_5d8a4a3ba01d191ea2d95dd3a8689bb86381b788688a626d8663f0bde35ac1f0(v528,a1,a2,a3,a4,a5);
const v525=__node(0,[a0,v527]);
return v525;}finally{__directDepth--;}}
function f_00e97e12a7e948c1b99476ebee82e98113958bdc0e22702ae5fc32ab7686f55e(a0){return d_00e97e12a7e948c1b99476ebee82e98113958bdc0e22702ae5fc32ab7686f55e(a0);}
function f_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(a0){try{return dFast_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(a0));}}
function f_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(a0){return d_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(a0);}
function f_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(a0,a1,a2){try{return dFast_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(a0,a1,a2));}}
function f_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(a0,a1,a2,a3,a4){try{return dFast_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(a0,a1,a2,a3,a4);}catch(error){if(error!==__deepCall)throw error;return __run(d_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(a0,a1,a2,a3,a4));}}
function f_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(a0,a1,a2,a3){try{return dFast_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(a0,a1,a2,a3));}}
function f_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(a0,a1){try{return dFast_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(a0,a1);}catch(error){if(error!==__deepCall)throw error;return __run(d_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(a0,a1));}}
function f_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0){return d_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(a0);}
function f_5c7a045e4c67fd999ca409a0ee9ea64fb6f592ff202334ae767217e07f21b20c(a0){return d_5c7a045e4c67fd999ca409a0ee9ea64fb6f592ff202334ae767217e07f21b20c(a0);}
function f_797626ef604201781c474feaf09804195fd465633417d9dc9af2540ac9c963ae(a0){return d_797626ef604201781c474feaf09804195fd465633417d9dc9af2540ac9c963ae(a0);}
function f_8808512d588cb4820ac5be9f6cced4e5aac6b272db569428411ee8763ae5c5cb(a0){return d_8808512d588cb4820ac5be9f6cced4e5aac6b272db569428411ee8763ae5c5cb(a0);}
function f_91d812bd091decafa5e3540b78565a80fa12cbfb47227f9a4c426d95b1aa8fba(a0){return d_91d812bd091decafa5e3540b78565a80fa12cbfb47227f9a4c426d95b1aa8fba(a0);}
function f_95f0e4554f4ebe956b405a90fac282abcafa9391aedbd6949a49fd5295820785(a0){return d_95f0e4554f4ebe956b405a90fac282abcafa9391aedbd6949a49fd5295820785(a0);}
function f_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(a0,a1,a2){try{return dFast_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(a0,a1,a2));}}
function f_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(a0,a1,a2,a3){try{return dFast_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(a0,a1,a2,a3));}}
function f_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a0){try{return dFast_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(a0));}}
function f_c16b5ec5dc3d3a495ffc95be4fd1cd1cbc20cdf4f36bc8046e0beebfeedfc273(a0){return d_c16b5ec5dc3d3a495ffc95be4fd1cd1cbc20cdf4f36bc8046e0beebfeedfc273(a0);}
function f_ce737b590102a4656bba35228ab31c8f7063faa0cbe3466de7aef5a367fb615a(a0){return d_ce737b590102a4656bba35228ab31c8f7063faa0cbe3466de7aef5a367fb615a(a0);}
function f_f653aa4d4ffd77b7d3e2a34334e7c0b22e34da6dce91a1433ead8b9479f80aae(a0){return d_f653aa4d4ffd77b7d3e2a34334e7c0b22e34da6dce91a1433ead8b9479f80aae(a0);}
function f_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(a0,a1,a2,a3,a4,a5){try{return dFast_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(a0,a1,a2,a3,a4,a5);}catch(error){if(error!==__deepCall)throw error;return __run(d_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(a0,a1,a2,a3,a4,a5));}}
// Fixed subscription lifecycle. Root/output edges derive from checked source;
// values and ownership codecs are compiled from each query's declared type.
function __createObservers(prepare){
 const subscriptions=new Map(),byRoot=new Map(),errors=[],directRoots=[],rootSchedules=[];
 let pending=[],spare=[];
 let next=0,held=0,flushing=false;
 function report(s,error,phase){errors.push({query:s?.query??null,error,phase});if(s?.onError)try{s.onError(error);}catch(e){errors.push({query:s.query,error:e,phase:'error-handler'});}}
 function flush(initialPasses=0){
  if(held||flushing||!pending.length)return;
  flushing=true;let passes=initialPasses;
  try{
   while(pending.length&&!held){
    if(++passes>1024){report(null,Error('subscription publication budget exhausted'),'publication');break;}
    const affected=pending;pending=spare;spare=affected;
    for(const s of affected)s.queued=false;
    // Snapshot every affected value before consumers run. Deliveries reside in
    // the stable subscription slots; no per-delivery tuple is allocated.
    for(const s of affected){if(!s.active)continue;s.deliver=false;
     try{if(s.pair){const a=s.pairState?s.pairState.keeps[s.keep0]:s.read0(),b=s.pairState?s.pairState.keeps[s.keep1]:s.read1();if(s.value0!==a||s.value1!==b){s.value0=a;s.value1=b;s.delivery0=a;s.delivery1=b;s.deliver=true;}}else{const value=s.capture(s.read());if(!s.equal(s.value,value)){s.value=value;s.delivery=value;s.deliver=true;}}}
     catch(e){report(s,e,'query');}
    }
    for(const s of affected){if(!s.active||!s.deliver)continue;const value=s.delivery;s.deliver=false;s.delivery=undefined;
     try{if(s.pair)s.callback(s.delivery0,s.delivery1);else s.callback(s.output(value));}catch(e){report(s,e,'listener');}
    }
    affected.length=0;
   }
  }finally{flushing=false;}
 }
 function install(query,q,callback,{immediate=true,onError}={}){
  if(typeof callback!=='function'||onError!==undefined&&typeof onError!=='function')throw TypeError('subscription callback');
  const s={...q,id:next++,query,callback,onError,active:true,queued:false,deliver:false,delivery:undefined};
  if(s.pair){s.value0=s.pairState?s.pairState.keeps[s.keep0]:s.read0();s.value1=s.pairState?s.pairState.keeps[s.keep1]:s.read1();}else{s.value=s.capture(s.read());}subscriptions.set(s.id,s);
  for(const root of s.roots){let ids=byRoot.get(root);if(!ids)byRoot.set(root,ids=[]);ids.push(s);schedule(root,ids);}
  const dispose=()=>{if(!subscriptions.delete(s.id))return;s.active=false;for(const root of s.roots){const ids=byRoot.get(root);ids.splice(ids.indexOf(s),1);schedule(root,ids);if(!ids.length)byRoot.delete(root);}};
  if(immediate)try{if(s.pair)callback(s.value0,s.value1);else callback(s.output(s.value));}catch(e){dispose();throw e;}
  return dispose;
 }
 // Bind the publication implementation when consumers change, instead of
 // rediscovering the one-consumer schedule on each source mutation.
 function schedule(root,ids){
  const s=directRoots[root]=ids.length===1&&ids[0].pairState?ids[0]:null;
  rootSchedules[root]=!ids.length?null:s?()=>publishPair(s):(outputs,epoch)=>{enqueueRoot(root,outputs,epoch);flush();};
 }
 function publishPair(s){
  const a=s.pairState.keeps[s.keep0],b=s.pairState.keeps[s.keep1];
  if(s.value0===a&&s.value1===b)return;
  if(!held&&!flushing&&!pending.length){
   s.value0=a;s.value1=b;flushing=true;
   try{s.callback(a,b);}catch(e){report(s,e,'listener');}finally{flushing=false;}
   flush(1);return;
  }
  if(!s.queued){s.queued=true;pending.push(s);}flush();
 }
 function enqueueRoot(root,outputs,epoch){
  const slots=byRoot.get(root);if(!slots)return;
  for(let i=0;i<slots.length;i++){
   const s=slots[i];if(s.queued)continue;
   if(outputs!==null&&s.outputs?.length){
    let changed=false;for(let j=0;j<s.outputs.length;j++)if(epoch?outputs[s.outputs[j]]===epoch:outputs.has(s.outputs[j])){changed=true;break;}
    if(!changed)continue;
   }
   s.queued=true;pending.push(s);
  }
 }
 return {
  directRoots,rootSchedules,
  get active(){return subscriptions.size!==0;},
  subscribe(query,args,callback,options){return install(query,prepare(query,args),callback,options);},
  subscribeGroup(queries,callback,options){
   if(!Array.isArray(queries)||!queries.length)throw TypeError('subscription group requires queries');
   const qs=queries.map(q=>typeof q==='string'?prepare(q,[]):prepare(q.query,q.args??[]));
   const roots=[...new Set(qs.flatMap(q=>q.roots))];
   // An unknown dependency forces ordinary root invalidation for the group.
   const outputs=qs.every(q=>q.outputs?.length)?[...new Set(qs.flatMap(q=>q.outputs))]:[];
   const scalar=qs.every(q=>q.scalar),direct=qs.every(q=>q.direct);
   return install(queries,{roots,outputs,read:direct?()=>qs.map(q=>q.direct()):()=>qs.map(q=>q.read()),capture:scalar?values=>values:values=>values.map((v,i)=>qs[i].capture(v)),output:scalar?values=>values.slice():values=>values.map((v,i)=>qs[i].output(v)),equal:scalar?(a,b)=>a.every((v,i)=>v===b[i]):(a,b)=>a.every((v,i)=>qs[i].equal(v,b[i]))},callback,options);
  },
  subscribeValues(queries,callback,options){
   if(!Array.isArray(queries)||!queries.length)throw TypeError('subscription group requires queries');
   if(typeof callback!=='function')throw TypeError('subscription callback');
   const qs=queries.map(q=>typeof q==='string'?prepare(q,[]):prepare(q.query,q.args??[]));
   if(qs.length===2&&qs.every(q=>q.scalar)){
    const roots=[...new Set(qs.flatMap(q=>q.roots))],outputs=qs.every(q=>q.outputs?.length)?[...new Set(qs.flatMap(q=>q.outputs))]:[];
    const pairState=qs[0].committed&&qs[1].committed&&qs[0].committed.state===qs[1].committed.state?qs[0].committed.state:null;
    return install(queries,{roots,outputs,pair:true,pairState,keep0:qs[0].committed?.keep,keep1:qs[1].committed?.keep,read0:qs[0].direct||qs[0].read,read1:qs[1].direct||qs[1].read},callback,options);
   }
   return this.subscribeGroup(queries,values=>callback(...values),options);
  },
  commit(roots,outputs=null){
   if(!subscriptions.size)return;
   for(const root of roots)enqueueRoot(root,outputs,false);
   flush();
  },
  // A checked single-root action supplies a reusable array of changed outputs.
  // No root carrier, Set, affected-ID array or Map lookup per delivery is needed.
  commitRoot(root,outputs=null,epoch=0){
   rootSchedules[root]?.(outputs,epoch);
  },
  hold(){held++;return pending.slice();},
  release(){if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  rollback(mark){for(const s of pending)s.queued=false;pending.length=0;for(const s of mark)if(s.active&&!s.queued){s.queued=true;pending.push(s);}if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  batch(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('batch callback must be synchronous');held++;
   try{const value=callback();if(value&&typeof value.then==='function')throw TypeError('state batch callback must be synchronous');return value;}
   finally{held--;flush();}
  },
  flush,takeErrors(){return errors.splice(0);}
 };
}
function __repEqual(a,b){const work=[[a,b]];while(work.length){const [x,y]=work.pop();if(Object.is(x,y))continue;if(!x||!y||typeof x!=='object'||typeof y!=='object'||x.c!==y.c||x.a.length!==y.a.length)return false;for(let i=0;i<x.a.length;i++)work.push([x.a[i],y.a[i]]);}return true;}
const __encoder=new TextEncoder();
function __keyCompare(a,b){if(typeof a==='string'&&typeof b==='string'){const x=__encoder.encode(a),y=__encoder.encode(b);for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;return x.length-y.length;}return a<b?-1:a>b?1:0;}

// Portable snapshot ABI shared with native/Wasm. Hashing uses Web Crypto.
function __snapshotLimits(limits={}){
 const result={bytes:64*1024*1024,values:1000000,depth:128,...limits};
 for(const k of ['bytes','values','depth'])if(!Number.isSafeInteger(result[k])||result[k]<0||result[k]>(k==='depth'?128:k==='values'?1000000:64*1024*1024))throw Error('invalid snapshot limits');
 return result;
}
const __hash=async bytes=>new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
function __snapshotWriter(limits){
 const out=[];let left=limits.values,maxDepth=0;
 function bytes(xs){if(xs.length>limits.bytes-out.length)throw Error('snapshot byte limit exceeded');for(const x of xs)out.push(x);}
 function integer(n,size){n=BigInt(n);for(let i=0;i<size;i++){bytes([Number(n&255n)]);n>>=8n;}}
 function raw(xs){integer(xs.length,8);bytes(xs);}
 function value(v,t,depth=0,bindings=[]){maxDepth=Math.max(maxDepth,depth);if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{value(v,t.body,depth+1,bindings);}finally{bindings.pop();}break;
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');value(v,bound[1],depth+1,bindings);break;}
  case 'unit':break;case 'bool':bytes([v?1:0]);break;
  case 'u32':case 'i32':case 'f32':integer(v,4);break;case 'u64':integer(v,8);break;
  case 'vector':if(v.length!==t.size)throw Error('vector dimension mismatch');for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'int':{let n=v<0n?-v:v;const xs=[];while(n){if(xs.length>=4096)throw Error('snapshot Int exceeds size limit');xs.push(Number(n&255n));n>>=8n;}bytes([v===0n?0:v>0n?1:2]);raw(xs);break;}
  case 'string':raw(__encoder.encode(v));break;
  case 'id':integer(BigInt('0x'+v),16);break;
  case 'enum':integer(t.variants.indexOf(v),4);break;
  case 'record':for(const f of t.fields)value(t.elided?v:v[f.name],f.type,depth+1,bindings);break;
  case 'list':if(v.length>left)throw Error('snapshot value limit exceeded');integer(v.length,8);for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'option':if(Object.hasOwn(v,'Some')){bytes([1]);value(v.Some,t.element,depth+1,bindings);}else bytes([0]);break;
  case 'result':{const branch=t.sum_key?__sumView(t.sum_key,v):v;if(Object.hasOwn(branch,'Ok')){bytes([0]);value(branch.Ok,t.ok,depth+1,bindings);}else{bytes([1]);value(branch.Err,t.error,depth+1,bindings);}break;}
  default:throw Error('unsupported snapshot type');
 }}
 return {bytes,integer,raw,value,charge(cells,depth){left-=cells;if(left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');},get maxDepth(){return maxDepth;},get left(){return left;},finish:()=>new Uint8Array(out)};
}
async function __snapshotEncode(meta,state,options){
 const limits=__snapshotLimits(options),w=__snapshotWriter(limits);
 w.integer(state.version,8);
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const rows=[...state.tables[r.index].entries()].sort((a,b)=>__keyCompare(a[0],b[0],r.key));if(rows.length>Math.floor(w.left/2))throw Error('snapshot row limit exceeded');w.integer(rows.length,8);for(const [k,v]of rows){
  if(!meta.snapshotRows){w.value(k,r.snapshotKey??r.key);w.value(v,r.snapshotValue??r.value);continue;}
  const cache=state.snapshotRows[r.index];let packed=cache.get(k);
  if(!packed){const row=__snapshotWriter(limits);row.value(k,r.snapshotKey??r.key);row.value(v,r.snapshotValue??r.value);packed={bytes:row.finish(),cells:limits.values-row.left,depth:row.maxDepth};cache.set(k,packed);}
  w.charge(packed.cells,packed.depth);w.bytes(packed.bytes);
 }}
 w.integer(state.outbox.length,8);
 for(const e of state.outbox){const channel=meta.events.findIndex(t=>t.name===e.channel);w.integer(e.commit,8);w.integer(e.position,8);w.integer(channel,4);w.value(e.value,meta.events[channel].snapshotType??meta.events[channel].type);}
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
 function value(t,depth=0,bindings=[]){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{return value(t.body,depth+1,bindings);}finally{bindings.pop();}
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');return value(bound[1],depth+1,bindings);}
  case 'unit':return null;case 'bool':{const b=take(1)[0];if(b>1)throw Error('invalid Bool tag');return b===1;}
  case 'u32':case 'f32':return Number(integer(4));case 'i32':return Number(BigInt.asIntN(32,integer(4)));case 'u64':return integer(8);
  case 'vector':{const xs=[];for(let i=0;i<t.size;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'int':{const sign=take(1)[0],xs=raw();if(xs.length>4096)throw Error('snapshot Int exceeds size limit');if(!((sign===0&&xs.length===0)||((sign===1||sign===2)&&xs.length>0&&xs[xs.length-1]!==0)))throw Error('noncanonical signed integer');let n=0n;for(let i=xs.length-1;i>=0;i--)n=(n<<8n)+BigInt(xs[i]);return sign===2?-n:n;}
  case 'string':return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw());
  case 'id':return integer(16).toString(16).padStart(32,'0');
  case 'enum':{const i=Number(integer(4));if(i>=t.variants.length)throw Error('invalid enum tag');return t.variants[i];}
  case 'record':if(t.elided)return value(t.fields[0].type,depth+1,bindings);return Object.fromEntries(t.fields.map(f=>[f.name,value(f.type,depth+1,bindings)]));
  case 'list':{const n=sequence(),xs=[];for(let i=0;i<n;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'option':{const tag=take(1)[0];if(tag===0)return {None:null};if(tag===1)return {Some:value(t.element,depth+1,bindings)};throw Error('invalid Option tag');}
  case 'result':{const tag=take(1)[0];if(tag===0){const child=value(t.ok,depth+1,bindings);return t.sum_key?__sumMake(t.sum_key,true,child):{Ok:child};}if(tag===1){const child=value(t.error,depth+1,bindings);return t.sum_key?__sumMake(t.sum_key,false,child):{Err:child};}throw Error('invalid Result tag');}
  default:throw Error('unsupported snapshot type');
 }}
 const version=integer(8),tables=meta.roots.map(()=>new Map());
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const n=sequence();if(n>Math.floor(left/2))throw Error('snapshot row limit exceeded');let prior;for(let i=0;i<n;i++){const k=value(r.snapshotKey??r.key),v=value(r.snapshotValue??r.value);if(i&&__keyCompare(prior,k,r.key)>=0)throw Error('duplicate or unordered snapshot key');tables[r.index].set(k,v);prior=k;}}
 const count=sequence(),outbox=[];let prior;
 for(let i=0;i<count;i++){const commit=integer(8),position=integer(8),channel=Number(integer(4));if(!meta.events[channel])throw Error('unknown snapshot event channel');const v=value(meta.events[channel].snapshotType??meta.events[channel].type);if(commit===0n||commit>version||(prior&&(commit<prior.commit||(commit===prior.commit&&position<=prior.position))))throw Error('invalid snapshot event sequence');const e={commit,position,channel:meta.events[channel].name,value:v};outbox.push(e);prior=e;}
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
function read_4(v,d=0,internal=false){switch(v){case "Error.Failed":return __node(0,[]);default:return undefined;}}
function write_4(v,d=0,snapshot=false){return ["Error.Failed"][v.c];}
function read_5(v,d=0,internal=false){if(Object.hasOwn(v,'Some'))return __node(1,[read_1(v.Some,d+1,internal)]);return __node(0,[]);}
function write_5(v,d=0,snapshot=false){return v.c===0?{None:null}:{Some:write_1(v.a[0],d+1,snapshot)};}
function read_6(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_2(branch.Ok,d+1,internal)]);return __node(1,[read_4(branch.Err,d+1,internal)]);}
function write_6(v,d=0,snapshot=false){return v.c===0?{Ok:write_2(v.a[0],d+1,snapshot)}:{Err:write_4(v.a[0],d+1,snapshot)};}
const __meta={"events":[{"name":"changed","snapshotType":{"kind":"u64"},"type":{"kind":"u64"}}],"roots":[{"key":{"kind":"u64"},"name":"Rows","snapshotKey":{"kind":"u64"},"snapshotValue":{"kind":"u64"},"value":{"kind":"u64"}},{"key":{"kind":"u64"},"name":"Other","snapshotKey":{"kind":"u64"},"snapshotValue":{"kind":"u64"},"value":{"kind":"u64"}}],"snapshot":{"program":[244,4,127,163,46,157,63,199,94,35,35,22,176,213,219,119,29,215,245,17,32,63,186,240,255,249,9,52,153,133,149,155],"schema":[117,250,215,197,75,64,95,168,206,202,72,207,156,229,177,39,229,150,62,11,112,139,123,119,65,204,196,57,153,187,220,136]}};
function __fromTables(tables){const roots=[];
{const rows=[...tables[0].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){const [key,value]=rows[j];tail=__node(1,[read_1(key,0,true),read_1(value,0,true),tail]);}roots.push(tail);}
{const rows=[...tables[1].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){const [key,value]=rows[j];tail=__node(1,[read_1(key,0,true),read_1(value,0,true),tail]);}roots.push(tail);}
return __node(0,roots);}
function __tables(logical){const tables=[];
{let cursor=logical.a[0],prior;const rows=new Map();while(cursor.c!==0){const [key,value,tail]=cursor.a;rows.set(write_1(key,0,true),write_1(value,0,true));cursor=tail;}tables.push(rows);}
{let cursor=logical.a[1],prior;const rows=new Map();while(cursor.c!==0){const [key,value,tail]=cursor.a;rows.set(write_1(key,0,true),write_1(value,0,true));cursor=tail;}tables.push(rows);}
return tables;}
function __events(list){const events=[];let cursor=list;while(cursor.c!==0){const [event,tail]=cursor.a;switch(event.c){
case 0:events.push(["changed", write_1(event.a[0],0,true), write_1(event.a[0],0,false)]);break;
default:throw Error('unknown source event');}cursor=tail;}return events;}
// CALLER CONTRACT: arguments must have declared types and canonical values.
// Malformed data may throw, produce wrong results or corrupt state.
export function createState(){let version=0n,outbox=[],busy=false,transaction=null;
const initial=__node(0,[__node(0,[]),__node(0,[])]);let physical=f_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(initial);
const observers=__createObservers((name,args)=>{boundary();if(transaction)throw Error('subscription requires transaction boundary');switch(name){
case "get":{const captured=[];
captured.push(write_1(read_1(args[0],0),0,false));
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_5(v,0),output:v=>write_5(v,0,false),equal:__repEqual};}
case "score":{const captured=[];
captured.push(write_1(read_1(args[0],0),0,false));
captured.push(write_0(read_0(args[1],0),0,false));
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_1(v,0),output:v=>write_1(v,0,false),equal:__repEqual};}
case "four":{const captured=[];
captured.push(write_1(read_1(args[0],0),0,false));
captured.push(write_0(read_0(args[1],0),0,false));
captured.push(write_1(read_1(args[2],0),0,false));
captured.push(write_0(read_0(args[3],0),0,false));
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_1(v,0),output:v=>write_1(v,0,false),equal:__repEqual};}
case "zero":{const captured=[];
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_5(v,0),output:v=>write_5(v,0,false),equal:__repEqual};}
default:throw Error('subscription requires a readonly query');}});
const preconditions={};
function boundary(){if(busy)throw Error('state operation already in progress');}
function invoke_native(name,args,resultOnly=false){boundary();try{if(preconditions[name] && invoke_native(preconditions[name],args,true)!==true)throw Error('contract precondition failed');switch(name){
case "put":{
const a0=read_1(args[0],0);
const a1=read_1(args[1],0);
const a2=read_0(args[2],0);
const executed=f_25e7619be1a5622626af4d56502a0f701553bf8b9721ad9b3f28cbe8e8b9438b(physical,version,a0,a1,a2);const observed=f_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(executed),next=f_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "erase":{
const a0=read_1(args[0],0);
const executed=f_b1b00a751aab000778b760bf7af4482031925e1d25d26e4ba667720b0c31b872(physical,version,a0);const observed=f_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(executed),next=f_0c22d6725d78810d86b99885bbff49f2fa68c403f8c7ab1a6947a6429ec385eb(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "unrelated":{
const a0=read_1(args[0],0);
const a1=read_1(args[1],0);
const executed=f_b21e905d95d3789e004d01afc376f75415ce165418917a7c11acc4bf70bd2708(physical,version,a0,a1);const observed=f_1796c2faa51f3fba9b8d3cf0b801ecd7a3f9054daeddc23e4c9cb04a1a288c96(executed),next=f_00e97e12a7e948c1b99476ebee82e98113958bdc0e22702ae5fc32ab7686f55e(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([1]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "get":{
const a0=read_1(args[0],0);
const executed=f_22731667fe310b8d3aec3adf920afd71e851d50a50064880930d047325fc4646(physical,version,a0);const observed=f_95f0e4554f4ebe956b405a90fac282abcafa9391aedbd6949a49fd5295820785(executed),next=f_5c7a045e4c67fd999ca409a0ee9ea64fb6f592ff202334ae767217e07f21b20c(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_5(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "score":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_4153ef0dc14051399537412916c00d5d368e9d9d485bba45073469322f612fdc(physical,version,a0,a1);const observed=f_8808512d588cb4820ac5be9f6cced4e5aac6b272db569428411ee8763ae5c5cb(executed),next=f_ce737b590102a4656bba35228ab31c8f7063faa0cbe3466de7aef5a367fb615a(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "four":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const a2=read_1(args[2],0);
const a3=read_0(args[3],0);
const executed=f_fa33fded5e197fbf129b009466dd76b7611f80e92f7d1f21059878d376890611(physical,version,a0,a1,a2,a3);const observed=f_91d812bd091decafa5e3540b78565a80fa12cbfb47227f9a4c426d95b1aa8fba(executed),next=f_797626ef604201781c474feaf09804195fd465633417d9dc9af2540ac9c963ae(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "zero":{
const executed=f_4dfe0d6b8957cf37106417b4032a6a5bc84b53c841faf4ee25a3185602ac3e8e(physical,version);const observed=f_c16b5ec5dc3d3a495ffc95be4fd1cd1cbc20cdf4f36bc8046e0beebfeedfc273(executed),next=f_f653aa4d4ffd77b7d3e2a34334e7c0b22e34da6dce91a1433ead8b9479f80aae(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_5(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
default:throw Error(`unknown action ${name}`);}}catch(e){if(transaction?.strict)transaction.failure=e;throw e;}}
async function invoke_json(name,args){return invoke_native(name,args);}
const actionNames=new Set(["put","erase","unrelated","get","score","four","zero"]);
return Object.freeze({subscribe:observers.subscribe,subscribeGroup:observers.subscribeGroup,subscribeValues:(...args)=>observers.subscribeValues(...args),batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,transaction(callback){if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();transaction.strict=true;try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}},invoke:invoke_json,invoke_json,bind(name,{resultOnly=false}={}){if(!actionNames.has(name))throw Error(`unknown action ${name}`);return (...args)=>invoke_native(name,args,resultOnly);},beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length,notificationMark:observers.hold()};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');if(transaction.failure)throw transaction.failure;transaction=null;observers.release();},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;const mark=transaction.notificationMark;transaction=null;observers.rollback(mark);},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_5431946dc7d688fb7eac489fd0c32f36da571630951c41f5413e4fb2c3780b8f(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;observers.hold();let restored=false;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);
const next=f_bd908bc63b09d6039b26854cc05dab270f60007dc6481e4cd18b87f2da132915(logical);
physical=next;version=saved.version;outbox=saved.outbox;restored=true;}finally{busy=false;if(restored)observers.commit([0,1]);observers.release();}}});}
function __publicEvent(channel,value){switch(channel){
case "changed":return write_1(read_1(value,0,true),0,false);
default:throw Error('unknown source event');}}

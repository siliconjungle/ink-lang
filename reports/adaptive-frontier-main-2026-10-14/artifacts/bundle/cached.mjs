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
function* d_085e4620e533011070d4f570ac5c06b1ab91d1c609efb5f416a780c8601c01ef(a0,a1,a2,a3){let v2;switch(a0.c){
case 0:{
v2=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v1=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v2,a2);
let v0;if(v1){
let v8;switch(a0.c){
case 0:{
v8=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v7=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v8,a2);
let v6;if(v7){
let v14;switch(a0.c){
case 0:{
let v18;switch(a0.c){
case 0:{
v18=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v17=yield d_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(v18,a2,a3);
const v16=__node(0,[v17]);
v14=v16;break;}
default:throw Error('literal constructor projection');}
const v13=__node(0,[v14]);
let v12;switch(v13.c){
case 0:{
const v25=__nullaryNode(0);
const v24=__node(0,[v25]);
let v23;switch(v24.c){
case 0:{
const v29=18446744073709551615n;
const v27=(a1)===(v29);
let v26;if(v27){
const v31=1n;
const v30=__node(1,[v31,a1,a0]);
v26=v30;}else{
const v35=__node(0,[v24.a[0]]);
const v37=true;
const v40=1n;
const v38=BigInt.asUintN(64,(a1)+(v40));
const v42=__nullaryNode(0);
const v34=__node(0,[v35,v37,v38,v13.a[0],v42]);
v26=v34;}
v23=v26;break;}
case 1:{
const v44=__node(1,[v24.a[0]]);
const v46=false;
const v49=__nullaryNode(0);
const v43=__node(0,[v44,v46,a1,a0,v49]);
v23=v43;break;}
default:throw Error('literal constructor projection');}
v12=v23;break;}
default:throw Error('literal constructor projection');}
v6=v12;}else{
const v51=2n;
const v50=__node(1,[v51,a1,a0]);
v6=v50;}
v0=v6;}else{
let v56;switch(a0.c){
case 0:{
v56=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v55=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v56,a2);
let v54;if(v55){
const v61=2n;
const v60=__node(1,[v61,a1,a0]);
v54=v60;}else{
let v66;switch(a0.c){
case 0:{
let v70;switch(a0.c){
case 0:{
v70=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v69=yield d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(v70,a2,a3);
const v68=__node(0,[v69]);
v66=v68;break;}
default:throw Error('literal constructor projection');}
const v65=__node(0,[v66]);
let v64;switch(v65.c){
case 0:{
const v77=__nullaryNode(0);
const v76=__node(0,[v77]);
let v75;switch(v76.c){
case 0:{
const v81=18446744073709551615n;
const v79=(a1)===(v81);
let v78;if(v79){
const v83=1n;
const v82=__node(1,[v83,a1,a0]);
v78=v82;}else{
const v87=__node(0,[v76.a[0]]);
const v89=true;
const v92=1n;
const v90=BigInt.asUintN(64,(a1)+(v92));
const v94=__nullaryNode(0);
const v86=__node(0,[v87,v89,v90,v65.a[0],v94]);
v78=v86;}
v75=v78;break;}
case 1:{
const v96=__node(1,[v76.a[0]]);
const v98=false;
const v101=__nullaryNode(0);
const v95=__node(0,[v96,v98,a1,a0,v101]);
v75=v95;break;}
default:throw Error('literal constructor projection');}
v64=v75;break;}
default:throw Error('literal constructor projection');}
v54=v64;}
v0=v54;}
return v0;}
function* d_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0,a1){let v102;switch(a0.c){
case 0:{
const v104=0n;
v102=v104;break;}
case 1:{
const v107=(a1)===(a0.a[0]);
let v106;if(v107){
const v111=0n;
const v112=yield d_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0.a[1]);
const v110=BigInt.asUintN(64,(v111)-(v112));
v106=v110;}else{
const v114=0n;
v106=v114;}
const v115=yield d_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0.a[2],a1);
const v105=BigInt.asUintN(64,(v106)+(v115));
v102=v105;break;}
default:throw Error('literal constructor projection');}
return v102;}
function d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0){let v118;switch(a0.c){
case 0:{
const v120=__node(0,[a0.a[0]]);
v118=v120;break;}
default:throw Error('literal constructor projection');}
return v118;}
function d_1f2bd2b30861dc23b993366659a3fab03d33b682778eb069a085669b75961803(a0){let v122;switch(a0.c){
case 0:{
v122=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v122;}
function* d_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(a0){let v125;switch(a0.c){
case 0:{
let v127;switch(a0.a[3].c){
case 0:{
const v129=__node(0,[a0.a[3].a[0],a0.a[0]]);
v127=v129;break;}
default:throw Error('literal constructor projection');}
v125=v127;break;}
case 1:{
const v132=yield d_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0.a[2]);
v125=v132;break;}
default:throw Error('literal constructor projection');}
return v125;}
function* d_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(a0,a1,a2,a3){let v135;switch(a0.c){
case 0:{
const v143=0n;
const v141=yield d_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0.a[0],v143,a2);
const v139=BigInt.asUintN(64,(a0.a[1])+(v141));
const v137=__node(0,[a0.a[1],v139]);
v135=v137;break;}
default:throw Error('literal constructor projection');}
const v146=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v145=yield d_8f33ccae6288306f4b4f493d04659323599a55b720c3c53bacb11cf1f73db6f5(v146,a1,a2,a3);
const v134=__node(0,[v135,v145]);
return v134;}
function* d_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0){let v151;switch(a0.c){
case 0:{
const v156=yield d_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0.a[0]);
const v155=yield d_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(v156);
const v153=__node(0,[a0.a[0],v155]);
v151=v153;break;}
default:throw Error('literal constructor projection');}
return v151;}
function d_4147d91b67744c6fdcca25ea92e662c2305eb8ed1e257ee95e320ec64ba6b87a(a0){let v158;switch(a0.c){
case 0:{
const v160=d_5af8cc4d99a0f58a4b671586cb34ca51104900b08688bc47552e28ee3391574b(a0.a[0],a0.a[1]);
v158=v160;break;}
default:throw Error('literal constructor projection');}
return v158;}
function* d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0,a1,a2){let v163;switch(a0.c){
case 0:{
const v168=__nullaryNode(0);
const v165=__node(1,[a1,a2,v168]);
v163=v165;break;}
case 1:{
const v170=(a1)<(a0.a[0]);
let v169;if(v170){
const v173=__node(1,[a1,a2,a0]);
v169=v173;}else{
const v180=yield d_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0.a[2],a1,a2);
const v177=__node(1,[a0.a[0],a0.a[1],v180]);
v169=v177;}
v163=v169;break;}
default:throw Error('literal constructor projection');}
return v163;}
function d_4652426df32c5f12c32a3b2418e33090af6f778feb122a5b4b933120a8d27a65(a0,a1){let v184;switch(a0.c){
case 0:{
const v188=false;
const v190=__node(0,[a0.a[0]]);
const v192=__nullaryNode(0);
const v186=__node(0,[a0.a[1],v188,a1,v190,v192]);
v184=v186;break;}
default:throw Error('literal constructor projection');}
return v184;}
function* d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0,a1){let v193;switch(a0.c){
case 0:{
const v195=__nullaryNode(0);
v193=v195;break;}
case 1:{
const v197=(a1)===(a0.a[0]);
let v196;if(v197){
const v200=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
v196=v200;}else{
const v206=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
const v203=__node(1,[a0.a[0],a0.a[1],v206]);
v196=v203;}
v193=v196;break;}
default:throw Error('literal constructor projection');}
return v193;}
function* d_53e9c9af85a82d5a12527069508858c30734a21bc6f1cdd08f96fb5088d11b7e(a0,a1,a2){let v211;switch(a0.c){
case 0:{
let v215;switch(a0.c){
case 0:{
v215=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v218=0n;
const v214=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v215,v218);
const v213=__node(0,[v214]);
v211=v213;break;}
default:throw Error('literal constructor projection');}
const v210=__node(0,[v211]);
let v209;switch(v210.c){
case 0:{
let v221;switch(v210.a[0].c){
case 0:{
let v225;switch(v210.a[0].c){
case 0:{
v225=v210.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v228=0n;
const v224=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v225,v228);
const v223=__node(0,[v224]);
v221=v223;break;}
default:throw Error('literal constructor projection');}
const v220=__node(0,[v221]);
let v219;switch(v220.c){
case 0:{
const v232=__nullaryNode(0);
const v234=0n;
const v233=__node(0,[v234]);
const v231=yield d_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(v232,v233);
const v230=__node(0,[v231]);
let v229;switch(v230.c){
case 0:{
let v235;if(a2){
const v239=__nullaryNode(0);
const v238=__node(1,[v239]);
let v237;switch(v238.c){
case 0:{
const v243=18446744073709551615n;
const v241=(a1)===(v243);
let v240;if(v241){
const v245=1n;
const v244=__node(1,[v245,a1,a0]);
v240=v244;}else{
const v249=__node(0,[v238.a[0]]);
const v251=true;
const v254=1n;
const v252=BigInt.asUintN(64,(a1)+(v254));
const v248=__node(0,[v249,v251,v252,v220.a[0],v230.a[0]]);
v240=v248;}
v237=v240;break;}
case 1:{
const v258=__node(1,[v238.a[0]]);
const v260=false;
const v263=__nullaryNode(0);
const v257=__node(0,[v258,v260,a1,a0,v263]);
v237=v257;break;}
default:throw Error('literal constructor projection');}
v235=v237;}else{
const v266=__nullaryNode(0);
const v265=__node(0,[v266]);
let v264;switch(v265.c){
case 0:{
const v270=18446744073709551615n;
const v268=(a1)===(v270);
let v267;if(v268){
const v272=1n;
const v271=__node(1,[v272,a1,a0]);
v267=v271;}else{
const v276=__node(0,[v265.a[0]]);
const v278=true;
const v281=1n;
const v279=BigInt.asUintN(64,(a1)+(v281));
const v275=__node(0,[v276,v278,v279,v220.a[0],v230.a[0]]);
v267=v275;}
v264=v267;break;}
case 1:{
const v285=__node(1,[v265.a[0]]);
const v287=false;
const v290=__nullaryNode(0);
const v284=__node(0,[v285,v287,a1,a0,v290]);
v264=v284;break;}
default:throw Error('literal constructor projection');}
v235=v264;}
v229=v235;break;}
default:throw Error('literal constructor projection');}
v219=v229;break;}
default:throw Error('literal constructor projection');}
v209=v219;break;}
default:throw Error('literal constructor projection');}
return v209;}
function* d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1){let v291;switch(a0.c){
case 0:{
const v293=__nullaryNode(0);
v291=v293;break;}
case 1:{
const v295=(a1)===(a0.a[0]);
let v294;if(v295){
const v298=__node(1,[a0.a[1]]);
v294=v298;}else{
const v300=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0.a[2],a1);
v294=v300;}
v291=v294;break;}
default:throw Error('literal constructor projection');}
return v291;}
function* d_56ac8033b151615ff47f716a20c3863165e6cfa64265342c60384120be2599e9(a0,a1){let v303;switch(a1.c){
case 0:{
let v305;if(a1.a[1]){
const v307=yield d_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a1.a[3]);
v305=v307;}else{
let v309;switch(a1.a[3].c){
case 0:{
const v311=__node(0,[a1.a[3].a[0],a0]);
v309=v311;break;}
default:throw Error('literal constructor projection');}
v305=v309;}
v303=v305;break;}
case 1:{
let v314;switch(a1.a[2].c){
case 0:{
const v316=__node(0,[a1.a[2].a[0],a0]);
v314=v316;break;}
default:throw Error('literal constructor projection');}
v303=v314;break;}
default:throw Error('literal constructor projection');}
return v303;}
function d_5af8cc4d99a0f58a4b671586cb34ca51104900b08688bc47552e28ee3391574b(a0,a1){let v319;switch(a0.c){
case 0:{
let v321;switch(a1.c){
case 0:{
let v323;if(a1.a[1]){
let v325;switch(a1.a[3].c){
case 0:{
const v327=__node(0,[a1.a[3].a[0],a0.a[1]]);
v325=v327;break;}
default:throw Error('literal constructor projection');}
v323=v325;}else{
let v330;switch(a1.a[3].c){
case 0:{
const v332=__node(0,[a1.a[3].a[0],a0.a[0]]);
v330=v332;break;}
default:throw Error('literal constructor projection');}
v323=v330;}
v321=v323;break;}
case 1:{
let v335;switch(a1.a[2].c){
case 0:{
const v337=__node(0,[a1.a[2].a[0],a0.a[0]]);
v335=v337;break;}
default:throw Error('literal constructor projection');}
v321=v335;break;}
default:throw Error('literal constructor projection');}
v319=v321;break;}
default:throw Error('literal constructor projection');}
return v319;}
function d_6056ec57a09ebb895fd7aaee0a6b91ad8c69beb4305bc0971bd40b263a5702e6(a0){let v340;switch(a0.c){
case 0:{
v340=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v340;}
function* d_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(a0,a1,a2,a3){const v344=d_6056ec57a09ebb895fd7aaee0a6b91ad8c69beb4305bc0971bd40b263a5702e6(a0);
const v347=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v346=yield d_085e4620e533011070d4f570ac5c06b1ab91d1c609efb5f416a780c8601c01ef(v347,a1,a2,a3);
const v343=__node(0,[v344,v346]);
return v343;}
function* d_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(a0,a1,a2){const v353=d_6056ec57a09ebb895fd7aaee0a6b91ad8c69beb4305bc0971bd40b263a5702e6(a0);
const v356=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v355=yield d_917ecc8b7e9e33ee5fcc782d41f37930d2d329ada4bad00268b4f741f6b4a591(v356,a1,a2);
const v352=__node(0,[v353,v355]);
return v352;}
function* d_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0,a1,a2){let v360;switch(a0.c){
case 0:{
const v362=0n;
v360=v362;break;}
case 1:{
const v365=(a1)===(a0.a[0]);
let v364;if(v365){
const v369=yield d_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a2);
const v371=yield d_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0.a[1]);
const v368=BigInt.asUintN(64,(v369)-(v371));
v364=v368;}else{
const v373=0n;
v364=v373;}
const v374=yield d_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0.a[2],a1,a2);
const v363=BigInt.asUintN(64,(v364)+(v374));
v360=v363;break;}
default:throw Error('literal constructor projection');}
return v360;}
function* d_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(a0){let v378;switch(a0.c){
case 0:{
const v380=0n;
v378=v380;break;}
case 1:{
const v383=yield d_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(a0.a[1]);
const v381=BigInt.asUintN(64,(a0.a[0])+(v383));
v378=v381;break;}
default:throw Error('literal constructor projection');}
return v378;}
function* d_8f33ccae6288306f4b4f493d04659323599a55b720c3c53bacb11cf1f73db6f5(a0,a1,a2,a3){let v387;switch(a0.c){
case 0:{
v387=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v390=0n;
const v386=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v387,v390);
let v385;if(v386){
let v393;switch(a0.c){
case 0:{
v393=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v396=0n;
const v392=yield d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v393,v396);
let v391;if(v392){
let v399;switch(a0.c){
case 0:{
let v403;switch(a0.c){
case 0:{
v403=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v406=0n;
const v402=yield d_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(v403,v406,a2);
const v401=__node(0,[v402]);
v399=v401;break;}
default:throw Error('literal constructor projection');}
const v398=__node(0,[v399]);
let v397;switch(v398.c){
case 0:{
const v411=__nullaryNode(0);
const v412=__node(0,[a2]);
const v410=yield d_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(v411,v412);
const v409=__node(0,[v410]);
let v408;switch(v409.c){
case 0:{
let v414;if(a3){
const v418=__nullaryNode(0);
const v417=__node(1,[v418]);
let v416;switch(v417.c){
case 0:{
const v422=18446744073709551615n;
const v420=(a1)===(v422);
let v419;if(v420){
const v424=1n;
const v423=__node(1,[v424,a1,a0]);
v419=v423;}else{
const v428=__node(0,[v417.a[0]]);
const v430=true;
const v433=1n;
const v431=BigInt.asUintN(64,(a1)+(v433));
const v427=__node(0,[v428,v430,v431,v398.a[0],v409.a[0]]);
v419=v427;}
v416=v419;break;}
case 1:{
const v437=__node(1,[v417.a[0]]);
const v439=false;
const v442=__nullaryNode(0);
const v436=__node(0,[v437,v439,a1,a0,v442]);
v416=v436;break;}
default:throw Error('literal constructor projection');}
v414=v416;}else{
const v445=__nullaryNode(0);
const v444=__node(0,[v445]);
let v443;switch(v444.c){
case 0:{
const v449=18446744073709551615n;
const v447=(a1)===(v449);
let v446;if(v447){
const v451=1n;
const v450=__node(1,[v451,a1,a0]);
v446=v450;}else{
const v455=__node(0,[v444.a[0]]);
const v457=true;
const v460=1n;
const v458=BigInt.asUintN(64,(a1)+(v460));
const v454=__node(0,[v455,v457,v458,v398.a[0],v409.a[0]]);
v446=v454;}
v443=v446;break;}
case 1:{
const v464=__node(1,[v444.a[0]]);
const v466=false;
const v469=__nullaryNode(0);
const v463=__node(0,[v464,v466,a1,a0,v469]);
v443=v463;break;}
default:throw Error('literal constructor projection');}
v414=v443;}
v408=v414;break;}
default:throw Error('literal constructor projection');}
v397=v408;break;}
default:throw Error('literal constructor projection');}
v391=v397;}else{
const v471=2n;
const v470=__node(1,[v471,a1,a0]);
v391=v470;}
v385=v391;}else{
const v476=__nullaryNode(0);
const v475=__node(1,[v476]);
let v474;switch(v475.c){
case 0:{
const v480=18446744073709551615n;
const v478=(a1)===(v480);
let v477;if(v478){
const v482=1n;
const v481=__node(1,[v482,a1,a0]);
v477=v481;}else{
const v486=__node(0,[v475.a[0]]);
const v488=true;
const v491=1n;
const v489=BigInt.asUintN(64,(a1)+(v491));
const v493=__nullaryNode(0);
const v485=__node(0,[v486,v488,v489,a0,v493]);
v477=v485;}
v474=v477;break;}
case 1:{
const v495=__node(1,[v475.a[0]]);
const v497=false;
const v500=__nullaryNode(0);
const v494=__node(0,[v495,v497,a1,a0,v500]);
v474=v494;break;}
default:throw Error('literal constructor projection');}
v385=v474;}
return v385;}
function* d_917ecc8b7e9e33ee5fcc782d41f37930d2d329ada4bad00268b4f741f6b4a591(a0,a1,a2){let v503;switch(a0.c){
case 0:{
v503=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v502=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v503,a2);
const v507=false;
const v510=__nullaryNode(0);
const v501=__node(0,[v502,v507,a1,a0,v510]);
return v501;}
function d_9cec2e9327f4224ed002769b1b013526478817aafd3e1187bcab20b049664245(a0){let v511;switch(a0.c){
case 0:{
v511=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v511;}
function* d_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(a0,a1){let v514;switch(a0.c){
case 0:{
const v518=__nullaryNode(0);
const v516=__node(1,[a1,v518]);
v514=v516;break;}
case 1:{
const v521=yield d_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(a0.a[1],a1);
const v519=__node(1,[a0.a[0],v521]);
v514=v519;break;}
default:throw Error('literal constructor projection');}
return v514;}
function* d_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(a0,a1,a2){let v525;switch(a0.c){
case 0:{
const v534=0n;
const v532=yield d_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0.a[0],v534);
const v530=BigInt.asUintN(64,(a0.a[1])+(v532));
const v538=0n;
const v536=yield d_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[0],v538);
const v539=0n;
const v535=yield d_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(v536,v539);
const v529=BigInt.asUintN(64,(v530)+(v535));
const v527=__node(0,[a0.a[1],v529]);
v525=v527;break;}
default:throw Error('literal constructor projection');}
const v541=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v540=yield d_53e9c9af85a82d5a12527069508858c30734a21bc6f1cdd08f96fb5088d11b7e(v541,a1,a2);
const v524=__node(0,[v525,v540]);
return v524;}
function d_b076f980ba08c726d20d4597a016ebc6d594d9a5ee26eef4659205d7c0cd335c(a0){let v545;switch(a0.c){
case 0:{
const v547=d_fc02f807c48e2429bcb88774b9e4da0a83169ed9b927c7b81e31367aa9f14961(a0.a[0],a0.a[1]);
v545=v547;break;}
default:throw Error('literal constructor projection');}
return v545;}
function* d_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(a0,a1){const v551=yield d_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1);
let v550;switch(v551.c){
case 0:{
const v554=false;
v550=v554;break;}
case 1:{
const v555=true;
v550=v555;break;}
default:throw Error('literal constructor projection');}
return v550;}
function d_c1476ec115b20cbec9592c1f1d0de6e51def7f65ae523fbbf12a8aefe5ab7995(a0){let v556;switch(a0.c){
case 0:{
v556=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v556;}
function* d_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0){let v559;switch(a0.c){
case 0:{
const v561=__nullaryNode(0);
v559=v561;break;}
case 1:{
const v564=yield d_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0.a[2]);
const v562=__node(1,[a0.a[1],v564]);
v559=v562;break;}
default:throw Error('literal constructor projection');}
return v559;}
function* d_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(a0,a1,a2){let v566;switch(a0.c){
case 0:{
const v568=__nullaryNode(0);
v566=v568;break;}
case 1:{
const v572=(a1)===(a0.a[0]);
let v571;if(v572){
v571=a2;}else{
v571=a0.a[1];}
const v577=yield d_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(a0.a[2],a1,a2);
const v569=__node(1,[a0.a[0],v571,v577]);
v566=v569;break;}
default:throw Error('literal constructor projection');}
return v566;}
function* d_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0){const v584=0n;
const v586=__nullaryNode(0);
const v583=__node(1,[v584,a0,v586]);
const v582=yield d_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(v583);
const v581=yield d_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(v582);
return v581;}
function* d_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(a0){let v587;switch(a0.c){
case 0:{
const v589=yield d_56ac8033b151615ff47f716a20c3863165e6cfa64265342c60384120be2599e9(a0.a[0],a0.a[1]);
v587=v589;break;}
default:throw Error('literal constructor projection');}
return v587;}
function d_f0b0ab99b96beab5fa1fa16aae9a5f675a6046bf6487c40120a7775601a1a8aa(a0){return a0;}
function d_fc02f807c48e2429bcb88774b9e4da0a83169ed9b927c7b81e31367aa9f14961(a0,a1){let v593;switch(a1.c){
case 0:{
let v595;switch(a1.a[3].c){
case 0:{
const v597=__node(0,[a1.a[3].a[0],a0]);
v595=v597;break;}
default:throw Error('literal constructor projection');}
v593=v595;break;}
case 1:{
let v600;switch(a1.a[2].c){
case 0:{
const v602=__node(0,[a1.a[2].a[0],a0]);
v600=v602;break;}
default:throw Error('literal constructor projection');}
v593=v600;break;}
default:throw Error('literal constructor projection');}
return v593;}
function dFast_085e4620e533011070d4f570ac5c06b1ab91d1c609efb5f416a780c8601c01ef(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v2;switch(a0.c){
case 0:{
v2=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v1=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v2,a2);
let v0;if(v1){
let v8;switch(a0.c){
case 0:{
v8=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v7=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v8,a2);
let v6;if(v7){
let v14;switch(a0.c){
case 0:{
let v18;switch(a0.c){
case 0:{
v18=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v17=dFast_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(v18,a2,a3);
const v16=__node(0,[v17]);
v14=v16;break;}
default:throw Error('literal constructor projection');}
const v13=__node(0,[v14]);
let v12;switch(v13.c){
case 0:{
const v25=__nullaryNode(0);
const v24=__node(0,[v25]);
let v23;switch(v24.c){
case 0:{
const v29=18446744073709551615n;
const v27=(a1)===(v29);
let v26;if(v27){
const v31=1n;
const v30=__node(1,[v31,a1,a0]);
v26=v30;}else{
const v35=__node(0,[v24.a[0]]);
const v37=true;
const v40=1n;
const v38=BigInt.asUintN(64,(a1)+(v40));
const v42=__nullaryNode(0);
const v34=__node(0,[v35,v37,v38,v13.a[0],v42]);
v26=v34;}
v23=v26;break;}
case 1:{
const v44=__node(1,[v24.a[0]]);
const v46=false;
const v49=__nullaryNode(0);
const v43=__node(0,[v44,v46,a1,a0,v49]);
v23=v43;break;}
default:throw Error('literal constructor projection');}
v12=v23;break;}
default:throw Error('literal constructor projection');}
v6=v12;}else{
const v51=2n;
const v50=__node(1,[v51,a1,a0]);
v6=v50;}
v0=v6;}else{
let v56;switch(a0.c){
case 0:{
v56=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v55=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v56,a2);
let v54;if(v55){
const v61=2n;
const v60=__node(1,[v61,a1,a0]);
v54=v60;}else{
let v66;switch(a0.c){
case 0:{
let v70;switch(a0.c){
case 0:{
v70=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v69=dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(v70,a2,a3);
const v68=__node(0,[v69]);
v66=v68;break;}
default:throw Error('literal constructor projection');}
const v65=__node(0,[v66]);
let v64;switch(v65.c){
case 0:{
const v77=__nullaryNode(0);
const v76=__node(0,[v77]);
let v75;switch(v76.c){
case 0:{
const v81=18446744073709551615n;
const v79=(a1)===(v81);
let v78;if(v79){
const v83=1n;
const v82=__node(1,[v83,a1,a0]);
v78=v82;}else{
const v87=__node(0,[v76.a[0]]);
const v89=true;
const v92=1n;
const v90=BigInt.asUintN(64,(a1)+(v92));
const v94=__nullaryNode(0);
const v86=__node(0,[v87,v89,v90,v65.a[0],v94]);
v78=v86;}
v75=v78;break;}
case 1:{
const v96=__node(1,[v76.a[0]]);
const v98=false;
const v101=__nullaryNode(0);
const v95=__node(0,[v96,v98,a1,a0,v101]);
v75=v95;break;}
default:throw Error('literal constructor projection');}
v64=v75;break;}
default:throw Error('literal constructor projection');}
v54=v64;}
v0=v54;}
return v0;}finally{__directDepth--;}}
function dFast_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v102;switch(a0.c){
case 0:{
const v104=0n;
v102=v104;break;}
case 1:{
const v107=(a1)===(a0.a[0]);
let v106;if(v107){
const v111=0n;
const v112=dFast_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0.a[1]);
const v110=BigInt.asUintN(64,(v111)-(v112));
v106=v110;}else{
const v114=0n;
v106=v114;}
const v115=dFast_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0.a[2],a1);
const v105=BigInt.asUintN(64,(v106)+(v115));
v102=v105;break;}
default:throw Error('literal constructor projection');}
return v102;}finally{__directDepth--;}}
function dFast_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v118;switch(a0.c){
case 0:{
let v120;switch(a0.a[3].c){
case 0:{
const v122=__node(0,[a0.a[3].a[0],a0.a[0]]);
v120=v122;break;}
default:throw Error('literal constructor projection');}
v118=v120;break;}
case 1:{
const v125=dFast_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0.a[2]);
v118=v125;break;}
default:throw Error('literal constructor projection');}
return v118;}finally{__directDepth--;}}
function dFast_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v128;switch(a0.c){
case 0:{
const v136=0n;
const v134=dFast_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0.a[0],v136,a2);
const v132=BigInt.asUintN(64,(a0.a[1])+(v134));
const v130=__node(0,[a0.a[1],v132]);
v128=v130;break;}
default:throw Error('literal constructor projection');}
const v139=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v138=dFast_8f33ccae6288306f4b4f493d04659323599a55b720c3c53bacb11cf1f73db6f5(v139,a1,a2,a3);
const v127=__node(0,[v128,v138]);
return v127;}finally{__directDepth--;}}
function dFast_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v144;switch(a0.c){
case 0:{
const v149=dFast_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0.a[0]);
const v148=dFast_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(v149);
const v146=__node(0,[a0.a[0],v148]);
v144=v146;break;}
default:throw Error('literal constructor projection');}
return v144;}finally{__directDepth--;}}
function dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v151;switch(a0.c){
case 0:{
const v156=__nullaryNode(0);
const v153=__node(1,[a1,a2,v156]);
v151=v153;break;}
case 1:{
const v158=(a1)<(a0.a[0]);
let v157;if(v158){
const v161=__node(1,[a1,a2,a0]);
v157=v161;}else{
const v168=dFast_45191bef560e6321dce74a5a209a55eb52a4cf4c218e01d243a6aa036a818eae(a0.a[2],a1,a2);
const v165=__node(1,[a0.a[0],a0.a[1],v168]);
v157=v165;}
v151=v157;break;}
default:throw Error('literal constructor projection');}
return v151;}finally{__directDepth--;}}
function dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v172;switch(a0.c){
case 0:{
const v174=__nullaryNode(0);
v172=v174;break;}
case 1:{
const v176=(a1)===(a0.a[0]);
let v175;if(v176){
const v179=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
v175=v179;}else{
const v185=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[2],a1);
const v182=__node(1,[a0.a[0],a0.a[1],v185]);
v175=v182;}
v172=v175;break;}
default:throw Error('literal constructor projection');}
return v172;}finally{__directDepth--;}}
function dFast_53e9c9af85a82d5a12527069508858c30734a21bc6f1cdd08f96fb5088d11b7e(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v190;switch(a0.c){
case 0:{
let v194;switch(a0.c){
case 0:{
v194=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v197=0n;
const v193=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v194,v197);
const v192=__node(0,[v193]);
v190=v192;break;}
default:throw Error('literal constructor projection');}
const v189=__node(0,[v190]);
let v188;switch(v189.c){
case 0:{
let v200;switch(v189.a[0].c){
case 0:{
let v204;switch(v189.a[0].c){
case 0:{
v204=v189.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v207=0n;
const v203=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(v204,v207);
const v202=__node(0,[v203]);
v200=v202;break;}
default:throw Error('literal constructor projection');}
const v199=__node(0,[v200]);
let v198;switch(v199.c){
case 0:{
const v211=__nullaryNode(0);
const v213=0n;
const v212=__node(0,[v213]);
const v210=dFast_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(v211,v212);
const v209=__node(0,[v210]);
let v208;switch(v209.c){
case 0:{
let v214;if(a2){
const v218=__nullaryNode(0);
const v217=__node(1,[v218]);
let v216;switch(v217.c){
case 0:{
const v222=18446744073709551615n;
const v220=(a1)===(v222);
let v219;if(v220){
const v224=1n;
const v223=__node(1,[v224,a1,a0]);
v219=v223;}else{
const v228=__node(0,[v217.a[0]]);
const v230=true;
const v233=1n;
const v231=BigInt.asUintN(64,(a1)+(v233));
const v227=__node(0,[v228,v230,v231,v199.a[0],v209.a[0]]);
v219=v227;}
v216=v219;break;}
case 1:{
const v237=__node(1,[v217.a[0]]);
const v239=false;
const v242=__nullaryNode(0);
const v236=__node(0,[v237,v239,a1,a0,v242]);
v216=v236;break;}
default:throw Error('literal constructor projection');}
v214=v216;}else{
const v245=__nullaryNode(0);
const v244=__node(0,[v245]);
let v243;switch(v244.c){
case 0:{
const v249=18446744073709551615n;
const v247=(a1)===(v249);
let v246;if(v247){
const v251=1n;
const v250=__node(1,[v251,a1,a0]);
v246=v250;}else{
const v255=__node(0,[v244.a[0]]);
const v257=true;
const v260=1n;
const v258=BigInt.asUintN(64,(a1)+(v260));
const v254=__node(0,[v255,v257,v258,v199.a[0],v209.a[0]]);
v246=v254;}
v243=v246;break;}
case 1:{
const v264=__node(1,[v244.a[0]]);
const v266=false;
const v269=__nullaryNode(0);
const v263=__node(0,[v264,v266,a1,a0,v269]);
v243=v263;break;}
default:throw Error('literal constructor projection');}
v214=v243;}
v208=v214;break;}
default:throw Error('literal constructor projection');}
v198=v208;break;}
default:throw Error('literal constructor projection');}
v188=v198;break;}
default:throw Error('literal constructor projection');}
return v188;}finally{__directDepth--;}}
function dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v270;switch(a0.c){
case 0:{
const v272=__nullaryNode(0);
v270=v272;break;}
case 1:{
const v274=(a1)===(a0.a[0]);
let v273;if(v274){
const v277=__node(1,[a0.a[1]]);
v273=v277;}else{
const v279=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0.a[2],a1);
v273=v279;}
v270=v273;break;}
default:throw Error('literal constructor projection');}
return v270;}finally{__directDepth--;}}
function dFast_56ac8033b151615ff47f716a20c3863165e6cfa64265342c60384120be2599e9(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v282;switch(a1.c){
case 0:{
let v284;if(a1.a[1]){
const v286=dFast_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a1.a[3]);
v284=v286;}else{
let v288;switch(a1.a[3].c){
case 0:{
const v290=__node(0,[a1.a[3].a[0],a0]);
v288=v290;break;}
default:throw Error('literal constructor projection');}
v284=v288;}
v282=v284;break;}
case 1:{
let v293;switch(a1.a[2].c){
case 0:{
const v295=__node(0,[a1.a[2].a[0],a0]);
v293=v295;break;}
default:throw Error('literal constructor projection');}
v282=v293;break;}
default:throw Error('literal constructor projection');}
return v282;}finally{__directDepth--;}}
function dFast_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v299=d_6056ec57a09ebb895fd7aaee0a6b91ad8c69beb4305bc0971bd40b263a5702e6(a0);
const v302=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v301=dFast_085e4620e533011070d4f570ac5c06b1ab91d1c609efb5f416a780c8601c01ef(v302,a1,a2,a3);
const v298=__node(0,[v299,v301]);
return v298;}finally{__directDepth--;}}
function dFast_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v308=d_6056ec57a09ebb895fd7aaee0a6b91ad8c69beb4305bc0971bd40b263a5702e6(a0);
const v311=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v310=dFast_917ecc8b7e9e33ee5fcc782d41f37930d2d329ada4bad00268b4f741f6b4a591(v311,a1,a2);
const v307=__node(0,[v308,v310]);
return v307;}finally{__directDepth--;}}
function dFast_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v315;switch(a0.c){
case 0:{
const v317=0n;
v315=v317;break;}
case 1:{
const v320=(a1)===(a0.a[0]);
let v319;if(v320){
const v324=dFast_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a2);
const v326=dFast_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0.a[1]);
const v323=BigInt.asUintN(64,(v324)-(v326));
v319=v323;}else{
const v328=0n;
v319=v328;}
const v329=dFast_7dd06359d37d218fc182cbdb5f9dc455df6654af4e3272f07fef839b49caf82d(a0.a[2],a1,a2);
const v318=BigInt.asUintN(64,(v319)+(v329));
v315=v318;break;}
default:throw Error('literal constructor projection');}
return v315;}finally{__directDepth--;}}
function dFast_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v333;switch(a0.c){
case 0:{
const v335=0n;
v333=v335;break;}
case 1:{
const v338=dFast_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(a0.a[1]);
const v336=BigInt.asUintN(64,(a0.a[0])+(v338));
v333=v336;break;}
default:throw Error('literal constructor projection');}
return v333;}finally{__directDepth--;}}
function dFast_8f33ccae6288306f4b4f493d04659323599a55b720c3c53bacb11cf1f73db6f5(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v342;switch(a0.c){
case 0:{
v342=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v345=0n;
const v341=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v342,v345);
let v340;if(v341){
let v348;switch(a0.c){
case 0:{
v348=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v351=0n;
const v347=dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(v348,v351);
let v346;if(v347){
let v354;switch(a0.c){
case 0:{
let v358;switch(a0.c){
case 0:{
v358=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v361=0n;
const v357=dFast_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(v358,v361,a2);
const v356=__node(0,[v357]);
v354=v356;break;}
default:throw Error('literal constructor projection');}
const v353=__node(0,[v354]);
let v352;switch(v353.c){
case 0:{
const v366=__nullaryNode(0);
const v367=__node(0,[a2]);
const v365=dFast_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(v366,v367);
const v364=__node(0,[v365]);
let v363;switch(v364.c){
case 0:{
let v369;if(a3){
const v373=__nullaryNode(0);
const v372=__node(1,[v373]);
let v371;switch(v372.c){
case 0:{
const v377=18446744073709551615n;
const v375=(a1)===(v377);
let v374;if(v375){
const v379=1n;
const v378=__node(1,[v379,a1,a0]);
v374=v378;}else{
const v383=__node(0,[v372.a[0]]);
const v385=true;
const v388=1n;
const v386=BigInt.asUintN(64,(a1)+(v388));
const v382=__node(0,[v383,v385,v386,v353.a[0],v364.a[0]]);
v374=v382;}
v371=v374;break;}
case 1:{
const v392=__node(1,[v372.a[0]]);
const v394=false;
const v397=__nullaryNode(0);
const v391=__node(0,[v392,v394,a1,a0,v397]);
v371=v391;break;}
default:throw Error('literal constructor projection');}
v369=v371;}else{
const v400=__nullaryNode(0);
const v399=__node(0,[v400]);
let v398;switch(v399.c){
case 0:{
const v404=18446744073709551615n;
const v402=(a1)===(v404);
let v401;if(v402){
const v406=1n;
const v405=__node(1,[v406,a1,a0]);
v401=v405;}else{
const v410=__node(0,[v399.a[0]]);
const v412=true;
const v415=1n;
const v413=BigInt.asUintN(64,(a1)+(v415));
const v409=__node(0,[v410,v412,v413,v353.a[0],v364.a[0]]);
v401=v409;}
v398=v401;break;}
case 1:{
const v419=__node(1,[v399.a[0]]);
const v421=false;
const v424=__nullaryNode(0);
const v418=__node(0,[v419,v421,a1,a0,v424]);
v398=v418;break;}
default:throw Error('literal constructor projection');}
v369=v398;}
v363=v369;break;}
default:throw Error('literal constructor projection');}
v352=v363;break;}
default:throw Error('literal constructor projection');}
v346=v352;}else{
const v426=2n;
const v425=__node(1,[v426,a1,a0]);
v346=v425;}
v340=v346;}else{
const v431=__nullaryNode(0);
const v430=__node(1,[v431]);
let v429;switch(v430.c){
case 0:{
const v435=18446744073709551615n;
const v433=(a1)===(v435);
let v432;if(v433){
const v437=1n;
const v436=__node(1,[v437,a1,a0]);
v432=v436;}else{
const v441=__node(0,[v430.a[0]]);
const v443=true;
const v446=1n;
const v444=BigInt.asUintN(64,(a1)+(v446));
const v448=__nullaryNode(0);
const v440=__node(0,[v441,v443,v444,a0,v448]);
v432=v440;}
v429=v432;break;}
case 1:{
const v450=__node(1,[v430.a[0]]);
const v452=false;
const v455=__nullaryNode(0);
const v449=__node(0,[v450,v452,a1,a0,v455]);
v429=v449;break;}
default:throw Error('literal constructor projection');}
v340=v429;}
return v340;}finally{__directDepth--;}}
function dFast_917ecc8b7e9e33ee5fcc782d41f37930d2d329ada4bad00268b4f741f6b4a591(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v458;switch(a0.c){
case 0:{
v458=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v457=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(v458,a2);
const v462=false;
const v465=__nullaryNode(0);
const v456=__node(0,[v457,v462,a1,a0,v465]);
return v456;}finally{__directDepth--;}}
function dFast_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v466;switch(a0.c){
case 0:{
const v470=__nullaryNode(0);
const v468=__node(1,[a1,v470]);
v466=v468;break;}
case 1:{
const v473=dFast_a64f68dae0d3ccf95f269a25f7b92345158dfbb266707927a0733b9dfaddbbcc(a0.a[1],a1);
const v471=__node(1,[a0.a[0],v473]);
v466=v471;break;}
default:throw Error('literal constructor projection');}
return v466;}finally{__directDepth--;}}
function dFast_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v477;switch(a0.c){
case 0:{
const v486=0n;
const v484=dFast_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(a0.a[0],v486);
const v482=BigInt.asUintN(64,(a0.a[1])+(v484));
const v490=0n;
const v488=dFast_4f8ac751c074a8155c4b54e72a7019524725403dbbce8eb31591bf754c4b1f71(a0.a[0],v490);
const v491=0n;
const v487=dFast_091f4ca3cd81062034fa060567f1b387991d1cda6a79a21c7c40062094d5e064(v488,v491);
const v481=BigInt.asUintN(64,(v482)+(v487));
const v479=__node(0,[a0.a[1],v481]);
v477=v479;break;}
default:throw Error('literal constructor projection');}
const v493=d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);
const v492=dFast_53e9c9af85a82d5a12527069508858c30734a21bc6f1cdd08f96fb5088d11b7e(v493,a1,a2);
const v476=__node(0,[v477,v492]);
return v476;}finally{__directDepth--;}}
function dFast_bbe104df4fca4be006eea2e68096614f9aa005ed5dcea4182b1d0a54dfb9bfb4(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v498=dFast_54bcba3d562a98540c4f4f84d132b173bf4776981a8aeeeae4b8bc29b7575eaf(a0,a1);
let v497;switch(v498.c){
case 0:{
const v501=false;
v497=v501;break;}
case 1:{
const v502=true;
v497=v502;break;}
default:throw Error('literal constructor projection');}
return v497;}finally{__directDepth--;}}
function dFast_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v503;switch(a0.c){
case 0:{
const v505=__nullaryNode(0);
v503=v505;break;}
case 1:{
const v508=dFast_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(a0.a[2]);
const v506=__node(1,[a0.a[1],v508]);
v503=v506;break;}
default:throw Error('literal constructor projection');}
return v503;}finally{__directDepth--;}}
function dFast_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v510;switch(a0.c){
case 0:{
const v512=__nullaryNode(0);
v510=v512;break;}
case 1:{
const v516=(a1)===(a0.a[0]);
let v515;if(v516){
v515=a2;}else{
v515=a0.a[1];}
const v521=dFast_e7930df47ea24625591b2eb42d304876a45965ec2a66e0d4f3679ab164d36cea(a0.a[2],a1,a2);
const v513=__node(1,[a0.a[0],v515,v521]);
v510=v513;break;}
default:throw Error('literal constructor projection');}
return v510;}finally{__directDepth--;}}
function dFast_e84aa620b3d8be59ddc4543a1fbbf9a15ac5d0b80327e6cd0e8d4be856468490(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v528=0n;
const v530=__nullaryNode(0);
const v527=__node(1,[v528,a0,v530]);
const v526=dFast_d614418dce6412d011f63f3049fffbed10b39c1a0f596e9afc9abd024fc18f07(v527);
const v525=dFast_8234d81f941041314d06f7e9fe0092b353d5512047b86c3ebbdbe23afc5f625e(v526);
return v525;}finally{__directDepth--;}}
function dFast_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v531;switch(a0.c){
case 0:{
const v533=dFast_56ac8033b151615ff47f716a20c3863165e6cfa64265342c60384120be2599e9(a0.a[0],a0.a[1]);
v531=v533;break;}
default:throw Error('literal constructor projection');}
return v531;}finally{__directDepth--;}}
function f_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0){return d_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(a0);}
function f_1f2bd2b30861dc23b993366659a3fab03d33b682778eb069a085669b75961803(a0){return d_1f2bd2b30861dc23b993366659a3fab03d33b682778eb069a085669b75961803(a0);}
function f_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(a0){try{return dFast_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(a0));}}
function f_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(a0,a1,a2,a3){try{return dFast_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(a0,a1,a2,a3));}}
function f_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0){try{return dFast_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(a0));}}
function f_4147d91b67744c6fdcca25ea92e662c2305eb8ed1e257ee95e320ec64ba6b87a(a0){return d_4147d91b67744c6fdcca25ea92e662c2305eb8ed1e257ee95e320ec64ba6b87a(a0);}
function f_4652426df32c5f12c32a3b2418e33090af6f778feb122a5b4b933120a8d27a65(a0,a1){return d_4652426df32c5f12c32a3b2418e33090af6f778feb122a5b4b933120a8d27a65(a0,a1);}
function f_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(a0,a1,a2,a3){try{return dFast_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(a0,a1,a2,a3));}}
function f_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(a0,a1,a2){try{return dFast_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(a0,a1,a2));}}
function f_9cec2e9327f4224ed002769b1b013526478817aafd3e1187bcab20b049664245(a0){return d_9cec2e9327f4224ed002769b1b013526478817aafd3e1187bcab20b049664245(a0);}
function f_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(a0,a1,a2){try{return dFast_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(a0,a1,a2));}}
function f_b076f980ba08c726d20d4597a016ebc6d594d9a5ee26eef4659205d7c0cd335c(a0){return d_b076f980ba08c726d20d4597a016ebc6d594d9a5ee26eef4659205d7c0cd335c(a0);}
function f_c1476ec115b20cbec9592c1f1d0de6e51def7f65ae523fbbf12a8aefe5ab7995(a0){return d_c1476ec115b20cbec9592c1f1d0de6e51def7f65ae523fbbf12a8aefe5ab7995(a0);}
function f_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(a0){try{return dFast_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(a0));}}
function f_f0b0ab99b96beab5fa1fa16aae9a5f675a6046bf6487c40120a7775601a1a8aa(a0){return d_f0b0ab99b96beab5fa1fa16aae9a5f675a6046bf6487c40120a7775601a1a8aa(a0);}
// Fixed subscription lifecycle. Root/output edges derive from checked source;
// values and ownership codecs are compiled from each query's declared type.
function __createObservers(prepare){
 const subscriptions=new Map(),byRoot=new Map(),errors=[],directRoots=[];
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
  for(const root of s.roots){let ids=byRoot.get(root);if(!ids)byRoot.set(root,ids=[]);ids.push(s);directRoots[root]=ids.length===1&&s.pairState?s:null;}
  const dispose=()=>{if(!subscriptions.delete(s.id))return;s.active=false;for(const root of s.roots){const ids=byRoot.get(root);ids.splice(ids.indexOf(s),1);directRoots[root]=ids.length===1&&ids[0].pairState?ids[0]:null;if(!ids.length)byRoot.delete(root);}};
  if(immediate)try{if(s.pair)callback(s.value0,s.value1);else callback(s.output(s.value));}catch(e){dispose();throw e;}
  return dispose;
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
  directRoots,
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
   if(!subscriptions.size)return;
   const s=directRoots[root];
   // The one-consumer schedule reads its committed slots exactly once. It also
   // handles held/reentrant publication without reconstructing output flags.
   if(s){
    const a=s.pairState.keeps[s.keep0],b=s.pairState.keeps[s.keep1];
    if(s.value0===a&&s.value1===b)return;
    if(!held&&!flushing&&!pending.length){
     s.value0=a;s.value1=b;flushing=true;
     try{s.callback(a,b);}catch(e){report(s,e,'listener');}finally{flushing=false;}
     flush(1);return;
    }
    if(!s.queued){s.queued=true;pending.push(s);}flush();return;
   }
   enqueueRoot(root,outputs,epoch);flush();
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
const __meta={"events":[{"name":"seen","snapshotType":{"kind":"u64"},"type":{"kind":"u64"}}],"roots":[{"key":{"kind":"u64"},"name":"Rows","snapshotKey":{"kind":"u64"},"snapshotValue":{"kind":"u64"},"value":{"kind":"u64"}}],"snapshot":{"program":[160,33,192,72,112,43,78,146,57,80,40,10,28,14,204,15,13,19,19,136,75,133,45,15,24,186,57,111,153,72,149,95],"schema":[192,141,16,114,17,172,249,182,219,154,142,125,228,252,175,89,60,246,149,204,109,105,172,253,213,158,150,88,181,131,24,90]}};
function __fromTables(tables){const roots=[];
{const rows=[...tables[0].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){const [key,value]=rows[j];tail=__node(1,[read_1(key,0,true),read_1(value,0,true),tail]);}roots.push(tail);}
return __node(0,roots);}
function __tables(logical){const tables=[];
{let cursor=logical.a[0],prior;const rows=new Map();while(cursor.c!==0){const [key,value,tail]=cursor.a;rows.set(write_1(key,0,true),write_1(value,0,true));cursor=tail;}tables.push(rows);}
return tables;}
function __events(list){const events=[];let cursor=list;while(cursor.c!==0){const [event,tail]=cursor.a;switch(event.c){
case 0:events.push(["seen", write_1(event.a[0],0,true), write_1(event.a[0],0,false)]);break;
default:throw Error('unknown source event');}cursor=tail;}return events;}
// CALLER CONTRACT: arguments must have declared types and canonical values.
// Malformed data may throw, produce wrong results or corrupt state.
export function createState(){let version=0n,outbox=[],busy=false,transaction=null;
const initial=__node(0,[__node(0,[])]);let physical=f_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(initial);
const observers=__createObservers((name,args)=>{boundary();if(transaction)throw Error('subscription requires transaction boundary');switch(name){
case "zero":{const captured=[];
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_1(v,0),output:v=>write_1(v,0,false),equal:__repEqual};}
case "get":{const captured=[];
captured.push(write_1(read_1(args[0],0),0,false));
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_5(v,0),output:v=>write_5(v,0,false),equal:__repEqual};}
default:throw Error('subscription requires a readonly query');}});
const preconditions={};
function boundary(){if(busy)throw Error('state operation already in progress');}
function invoke_native(name,args,resultOnly=false){boundary();try{if(preconditions[name] && invoke_native(preconditions[name],args,true)!==true)throw Error('contract precondition failed');switch(name){
case "put":{
const a0=read_1(args[0],0);
const a1=read_1(args[1],0);
const executed=f_6ec6dd3edb292e86a3e089c740b6ed5288dc0b11bf646575ed6dad616d83e70e(physical,version,a0,a1);const observed=f_c1476ec115b20cbec9592c1f1d0de6e51def7f65ae523fbbf12a8aefe5ab7995(executed),next=f_f01bda54496d6aad172986120fed9d5ff55555579c1851113a813c3a7dc7c75a(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "replace_zero":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_37b89391e4baf3928e54f697ea20d2441fd63267421da84265bab36c1723fd97(physical,version,a0,a1);const observed=f_9cec2e9327f4224ed002769b1b013526478817aafd3e1187bcab20b049664245(executed),next=f_4147d91b67744c6fdcca25ea92e662c2305eb8ed1e257ee95e320ec64ba6b87a(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "erase_zero":{
const a0=read_0(args[0],0);
const executed=f_a84939364f9ced49650d0cee781d7545d686562eadc2b148fecd654d1a904994(physical,version,a0);const observed=f_9cec2e9327f4224ed002769b1b013526478817aafd3e1187bcab20b049664245(executed),next=f_4147d91b67744c6fdcca25ea92e662c2305eb8ed1e257ee95e320ec64ba6b87a(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_6(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "zero":{
const executed=f_4652426df32c5f12c32a3b2418e33090af6f778feb122a5b4b933120a8d27a65(physical,version);const observed=f_f0b0ab99b96beab5fa1fa16aae9a5f675a6046bf6487c40120a7775601a1a8aa(executed),next=f_21688e85f237e73075fe072d016c7519908d6542720156cb6f0dd134e70930c4(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "get":{
const a0=read_1(args[0],0);
const executed=f_7cacf95202f524bc2d7718c0087555e2ab819a83e6379cde56f33896f4a50cc5(physical,version,a0);const observed=f_1f2bd2b30861dc23b993366659a3fab03d33b682778eb069a085669b75961803(executed),next=f_b076f980ba08c726d20d4597a016ebc6d594d9a5ee26eef4659205d7c0cd335c(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_5(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
default:throw Error(`unknown action ${name}`);}}catch(e){if(transaction?.strict)transaction.failure=e;throw e;}}
async function invoke_json(name,args){return invoke_native(name,args);}
const actionNames=new Set(["put","replace_zero","erase_zero","zero","get"]);
return Object.freeze({subscribe:observers.subscribe,subscribeGroup:observers.subscribeGroup,subscribeValues:(...args)=>observers.subscribeValues(...args),batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,transaction(callback){if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();transaction.strict=true;try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}},invoke:invoke_json,invoke_json,bind(name,{resultOnly=false}={}){if(!actionNames.has(name))throw Error(`unknown action ${name}`);return (...args)=>invoke_native(name,args,resultOnly);},beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length,notificationMark:observers.hold()};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');if(transaction.failure)throw transaction.failure;transaction=null;observers.release();},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;const mark=transaction.notificationMark;transaction=null;observers.rollback(mark);},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_1a0caea182fade715fef1a167961ae6625d214ce2a47b897079d59803aff35cc(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;observers.hold();let restored=false;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);
const next=f_3bfe41d8c4e29bdeaadbb36c227f6d0ef56f56189b3de207813d5fa38d87855c(logical);
physical=next;version=saved.version;outbox=saved.outbox;restored=true;}finally{busy=false;if(restored)observers.commit([0]);observers.release();}}});}
function __publicEvent(channel,value){switch(channel){
case "seen":return write_1(read_1(value,0,true),0,false);
default:throw Error('unknown source event');}}

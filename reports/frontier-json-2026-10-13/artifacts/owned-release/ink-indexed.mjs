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
function d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(a0){let v0;switch(a0.c){
case 0:{
v0=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v0;}
function d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0){let v3;switch(a0.c){
case 0:{
const v5=0n;
v3=v5;break;}
case 1:{
const v6=1n;
v3=v6;break;}
case 2:{
v3=a0.a[6];break;}
default:throw Error('literal constructor projection');}
return v3;}
function* d_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a0,a1){const v8=yield d_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0,a1);
return v8;}
function* d_0ece595a937fc883aae5d90e31f204e9ccde30c7280a22873bac4482408934e0(a0,a1,a2){const v13=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v15=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v12=(v13)<(v15);
let v11;if(v12){
let v17;switch(a1.c){
case 0:{
const v21=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v19=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v21);
v17=v19;break;}
case 1:{
const v26=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v24=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v26);
v17=v24;break;}
case 2:{
const v30=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1.a[0]);
const v33=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1.a[1],a2);
const v29=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v30,v33);
v17=v29;break;}
default:throw Error('literal constructor projection');}
v11=v17;}else{
const v38=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v36=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v38);
v11=v36;}
return v11;}
function* d_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0,a1){const v45=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v43=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v45);
const v48=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v47=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v48,a1);
const v42=(v43)||(v47);
let v41;if(v42){
const v51=__nullaryNode(0);
v41=v51;}else{
let v52;switch(a0.c){
case 0:{
const v54=__nullaryNode(0);
v52=v54;break;}
case 1:{
const v56=yield d_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v55;if(v56){
const v59=__node(1,[a0.a[1]]);
v55=v59;}else{
const v61=__nullaryNode(0);
v55=v61;}
v52=v55;break;}
case 2:{
const v63=yield d_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a1);
const v66=yield d_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[1],a1);
const v62=d_22a54945b4301bfe87326de6b8f6e586502d061cf23225c609be2bf3e1be5447(v63,v66);
v52=v62;break;}
default:throw Error('literal constructor projection');}
v41=v52;}
return v41;}
function* d_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(a0){let v69;switch(a0.c){
case 0:{
const v72=yield d_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0.a[0]);
const v71=__node(0,[v72]);
v69=v71;break;}
default:throw Error('literal constructor projection');}
return v69;}
function* d_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(a0){let v74;switch(a0.c){
case 0:{
const v76=0n;
v74=v76;break;}
case 1:{
const v79=yield d_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(a0.a[1]);
const v77=BigInt.asUintN(64,(a0.a[0])+(v79));
v74=v77;break;}
default:throw Error('literal constructor projection');}
return v74;}
function* d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){let v81;switch(a0.c){
case 0:{
const v83=__nullaryNode(0);
v81=v83;break;}
case 1:{
const v84=__nullaryNode(0);
v81=v84;break;}
case 2:{
const v85=__nullaryNode(0);
v81=v85;break;}
case 3:{
const v86=__nullaryNode(0);
v81=v86;break;}
case 4:{
const v90=0n;
const v88=(a0.a[0])===(v90);
let v87;if(v88){
let v91;switch(a0.a[1].c){
case 0:{
const v93=__nullaryNode(0);
v91=v93;break;}
case 1:{
const v94=__nullaryNode(0);
v91=v94;break;}
case 2:{
const v95=__nullaryNode(0);
v91=v95;break;}
case 3:{
const v96=__nullaryNode(0);
v91=v96;break;}
case 4:{
const v97=__nullaryNode(0);
v91=v97;break;}
default:throw Error('literal constructor projection');}
v87=v91;}else{
const v101=1n;
const v99=(a0.a[0])===(v101);
let v98;if(v99){
let v102;switch(a0.a[1].c){
case 0:{
const v104=__nullaryNode(0);
v102=v104;break;}
case 1:{
const v105=__nullaryNode(0);
v102=v105;break;}
case 2:{
const v106=__nullaryNode(0);
v102=v106;break;}
case 3:{
let v107;switch(a0.a[1].a[1].c){
case 0:{
const v109=__nullaryNode(0);
v107=v109;break;}
case 1:{
const v110=__nullaryNode(0);
v107=v110;break;}
case 2:{
const v111=__nullaryNode(0);
v107=v111;break;}
case 3:{
let v112;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v115=d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0.a[1].a[0]);
const v117=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[1].a[0]);
const v114=__node(1,[v115,v117]);
v112=v114;break;}
case 1:{
const v119=__nullaryNode(0);
v112=v119;break;}
case 2:{
const v120=__nullaryNode(0);
v112=v120;break;}
case 3:{
const v121=__nullaryNode(0);
v112=v121;break;}
case 4:{
const v122=__nullaryNode(0);
v112=v122;break;}
default:throw Error('literal constructor projection');}
v107=v112;break;}
case 4:{
const v123=__nullaryNode(0);
v107=v123;break;}
default:throw Error('literal constructor projection');}
v102=v107;break;}
case 4:{
const v124=__nullaryNode(0);
v102=v124;break;}
default:throw Error('literal constructor projection');}
v98=v102;}else{
const v125=__nullaryNode(0);
v98=v125;}
v87=v98;}
v81=v87;break;}
default:throw Error('literal constructor projection');}
return v81;}
function d_1ded343e21e9e1c2410cf19d76be60a8e464fc6e2bb80b2f6a381623e6f78e3b(a0){const v126=__node(2,[a0]);
return v126;}
function* d_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(a0,a1,a2,a3,a4){let v128;switch(a0.c){
case 0:{
let v130;if(a4){
const v134=__nullaryNode(0);
const v133=__node(1,[v134]);
const v135=false;
const v137=__node(0,[a0.a[0]]);
const v139=__nullaryNode(0);
const v132=__node(0,[v133,v135,a1,v137,v139]);
v130=v132;}else{
const v143=18446744073709551615n;
const v141=(a1)===(v143);
let v140;if(v141){
const v145=1n;
const v147=__node(0,[a0.a[0]]);
const v144=__node(1,[v145,a1,v147]);
v140=v144;}else{
const v151=__nullaryNode(0);
const v150=__node(0,[v151]);
const v152=true;
const v155=1n;
const v153=BigInt.asUintN(64,(a1)+(v155));
const v159=yield d_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a2);
let v158;switch(v159.c){
case 0:{
const v162=false;
v158=v162;break;}
case 1:{
const v163=true;
v158=v163;break;}
default:throw Error('literal constructor projection');}
let v157;if(v158){
const v164=yield d_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[0],a2,a3);
v157=v164;}else{
const v168=yield d_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[0],a2,a3);
v157=v168;}
const v156=__node(0,[v157]);
let v174;switch(a3.c){
case 0:{
v174=a3.a[0];break;}
default:throw Error('literal constructor projection');}
const v173=__node(0,[v174]);
const v177=__nullaryNode(0);
const v172=__node(1,[v173,v177]);
const v149=__node(0,[v150,v152,v153,v156,v172]);
v140=v149;}
v130=v140;}
v128=v130;break;}
default:throw Error('literal constructor projection');}
return v128;}
function* d_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(a0,a1,a2,a3){let v178;switch(a0.c){
case 0:{
let v180;if(a3){
const v184=__nullaryNode(0);
const v183=__node(1,[v184]);
const v185=false;
const v187=__node(0,[a0.a[0]]);
const v189=__nullaryNode(0);
const v182=__node(0,[v183,v185,a1,v187,v189]);
v180=v182;}else{
const v193=18446744073709551615n;
const v191=(a1)===(v193);
let v190;if(v191){
const v195=1n;
const v197=__node(0,[a0.a[0]]);
const v194=__node(1,[v195,a1,v197]);
v190=v194;}else{
const v201=__nullaryNode(0);
const v200=__node(0,[v201]);
const v202=true;
const v205=1n;
const v203=BigInt.asUintN(64,(a1)+(v205));
const v207=yield d_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[0],a2);
const v206=__node(0,[v207]);
const v212=0n;
const v211=__node(0,[v212]);
const v213=__nullaryNode(0);
const v210=__node(1,[v211,v213]);
const v199=__node(0,[v200,v202,v203,v206,v210]);
v190=v199;}
v180=v190;}
v178=v180;break;}
default:throw Error('literal constructor projection');}
return v178;}
function d_22a54945b4301bfe87326de6b8f6e586502d061cf23225c609be2bf3e1be5447(a0,a1){let v214;switch(a0.c){
case 0:{
v214=a1;break;}
case 1:{
const v217=__node(1,[a0.a[0]]);
v214=v217;break;}
default:throw Error('literal constructor projection');}
return v214;}
function d_255299b53c72a2786fe15c53bfc1e342085e441f49d12eeb4c49852e9a066c38(a0){let v219;switch(a0.c){
case 0:{
const v221=false;
v219=v221;break;}
case 1:{
const v222=false;
v219=v222;break;}
case 2:{
v219=a0.a[0];break;}
case 3:{
const v224=false;
v219=v224;break;}
case 4:{
const v225=false;
v219=v225;break;}
default:throw Error('literal constructor projection');}
return v219;}
function d_2c27ab81fd535da7b15c47b4f86e70d3e022e597d14150e679f4200b4a936caf(a0){let v226;switch(a0.c){
case 0:{
v226=a0.a[3];break;}
case 1:{
v226=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v226;}
function* d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){let v230;switch(a0.c){
case 0:{
const v232=__nullaryNode(0);
v230=v232;break;}
case 1:{
const v233=__nullaryNode(0);
v230=v233;break;}
case 2:{
const v234=__nullaryNode(0);
v230=v234;break;}
case 3:{
const v235=__nullaryNode(0);
v230=v235;break;}
case 4:{
const v239=0n;
const v237=(a0.a[0])===(v239);
let v236;if(v237){
let v240;switch(a0.a[1].c){
case 0:{
const v242=__nullaryNode(0);
v240=v242;break;}
case 1:{
const v243=__nullaryNode(0);
v240=v243;break;}
case 2:{
const v244=__nullaryNode(0);
v240=v244;break;}
case 3:{
const v245=__nullaryNode(0);
v240=v245;break;}
case 4:{
const v246=__nullaryNode(0);
v240=v246;break;}
default:throw Error('literal constructor projection');}
v236=v240;}else{
const v250=1n;
const v248=(a0.a[0])===(v250);
let v247;if(v248){
let v251;switch(a0.a[1].c){
case 0:{
const v253=__nullaryNode(0);
v251=v253;break;}
case 1:{
const v254=__nullaryNode(0);
v251=v254;break;}
case 2:{
const v255=__nullaryNode(0);
v251=v255;break;}
case 3:{
let v256;switch(a0.a[1].a[1].c){
case 0:{
const v258=__nullaryNode(0);
v256=v258;break;}
case 1:{
const v259=__nullaryNode(0);
v256=v259;break;}
case 2:{
const v260=__nullaryNode(0);
v256=v260;break;}
case 3:{
let v261;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v265=yield d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0.a[1].a[1].a[0]);
const v263=__node(1,[a0.a[1].a[0],v265]);
v261=v263;break;}
case 1:{
const v267=__nullaryNode(0);
v261=v267;break;}
case 2:{
const v268=__nullaryNode(0);
v261=v268;break;}
case 3:{
const v269=__nullaryNode(0);
v261=v269;break;}
case 4:{
const v270=__nullaryNode(0);
v261=v270;break;}
default:throw Error('literal constructor projection');}
v256=v261;break;}
case 4:{
const v271=__nullaryNode(0);
v256=v271;break;}
default:throw Error('literal constructor projection');}
v251=v256;break;}
case 4:{
const v272=__nullaryNode(0);
v251=v272;break;}
default:throw Error('literal constructor projection');}
v247=v251;}else{
const v273=__nullaryNode(0);
v247=v273;}
v236=v247;}
v230=v236;break;}
default:throw Error('literal constructor projection');}
return v230;}
function* d_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0){let v274;switch(a0.c){
case 0:{
const v277=0n;
const v279=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v281=__nullaryNode(0);
const v278=__node(3,[v279,v281]);
const v276=__node(4,[v277,v278]);
v274=v276;break;}
default:throw Error('literal constructor projection');}
return v274;}
function d_31858978e848f97623668389b71fd41b0845c367e2d1ecb26272a01232a80b43(a0){const v282=0n;
return v282;}
function d_33b50e914daacaa87bef099914c13ede60a55a53922c8385278cebaadd341096(a0){let v283;switch(a0.c){
case 0:{
const v285=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v283=v285;break;}
case 1:{
const v290=__node(1,[a0.a[0],a0.a[1]]);
v283=v290;break;}
default:throw Error('literal constructor projection');}
return v283;}
function* d_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0){let v293;switch(a0.c){
case 0:{
const v295=__nullaryNode(0);
v293=v295;break;}
case 1:{
const v299=__nullaryNode(0);
const v296=__node(1,[a0.a[0],a0.a[1],v299]);
v293=v296;break;}
case 2:{
const v301=yield d_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[0]);
const v303=yield d_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[1]);
const v300=yield d_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(v301,v303);
v293=v300;break;}
default:throw Error('literal constructor projection');}
return v293;}
function* d_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(a0){let v305;switch(a0.c){
case 0:{
const v308=0n;
const v310=d_7d350b8c08d443785fb7708635e000d6ac98f2ec18aa5b162a96f36235b83f47(a0.a[0]);
const v312=__nullaryNode(0);
const v309=__node(3,[v310,v312]);
const v307=__node(4,[v308,v309]);
v305=v307;break;}
case 1:{
const v314=1n;
const v316=yield d_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0.a[0]);
const v318=__nullaryNode(0);
const v315=__node(3,[v316,v318]);
const v313=__node(4,[v314,v315]);
v305=v313;break;}
default:throw Error('literal constructor projection');}
return v305;}
function* d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(a0,a1){const v321=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v324=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v326=1n;
const v323=BigInt.asUintN(64,(v324)+(v326));
const v320=(v321)>(v323);
let v319;if(v320){
const v327=yield d_df61cd3826494889da2a704dc5d91ee794b4499d1ae7f97cb94445d06016d531(a0,a1);
v319=v327;}else{
const v330=yield d_b8817607f4fc8a3d4a760799a5583b58d6bbde93ed906aee863c4d0edcf1dc32(a0,a1);
v319=v330;}
return v319;}
function* d_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(a0,a1,a2){let v333;switch(a0.c){
case 0:{
const v336=yield d_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a2);
const v339=false;
const v341=__node(0,[a0.a[0]]);
const v343=__nullaryNode(0);
const v335=__node(0,[v336,v339,a1,v341,v343]);
v333=v335;break;}
default:throw Error('literal constructor projection');}
return v333;}
function* d_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(a0){let v344;switch(a0.c){
case 0:{
const v347=__nullaryNode(0);
const v346=__node(0,[v347]);
v344=v346;break;}
case 1:{
const v349=__nullaryNode(0);
const v348=__node(0,[v349]);
v344=v348;break;}
case 2:{
const v351=__nullaryNode(0);
const v350=__node(0,[v351]);
v344=v350;break;}
case 3:{
const v353=__nullaryNode(0);
const v352=__node(0,[v353]);
v344=v352;break;}
case 4:{
const v357=0n;
const v355=(a0.a[0])===(v357);
let v354;if(v355){
let v358;switch(a0.a[1].c){
case 0:{
const v361=__nullaryNode(0);
const v360=__node(0,[v361]);
v358=v360;break;}
case 1:{
const v363=__nullaryNode(0);
const v362=__node(0,[v363]);
v358=v362;break;}
case 2:{
const v365=__nullaryNode(0);
const v364=__node(0,[v365]);
v358=v364;break;}
case 3:{
let v366;switch(a0.a[1].a[1].c){
case 0:{
const v369=d_6cce05b519648ff4045eb3424833f6d16bf0753974a6bf0872594ce55e3a9196(a0.a[1].a[0]);
const v368=__node(0,[v369]);
v366=v368;break;}
case 1:{
const v372=__nullaryNode(0);
const v371=__node(0,[v372]);
v366=v371;break;}
case 2:{
const v374=__nullaryNode(0);
const v373=__node(0,[v374]);
v366=v373;break;}
case 3:{
const v376=__nullaryNode(0);
const v375=__node(0,[v376]);
v366=v375;break;}
case 4:{
const v378=__nullaryNode(0);
const v377=__node(0,[v378]);
v366=v377;break;}
default:throw Error('literal constructor projection');}
v358=v366;break;}
case 4:{
const v380=__nullaryNode(0);
const v379=__node(0,[v380]);
v358=v379;break;}
default:throw Error('literal constructor projection');}
v354=v358;}else{
const v384=1n;
const v382=(a0.a[0])===(v384);
let v381;if(v382){
let v385;switch(a0.a[1].c){
case 0:{
const v388=__nullaryNode(0);
const v387=__node(0,[v388]);
v385=v387;break;}
case 1:{
const v390=__nullaryNode(0);
const v389=__node(0,[v390]);
v385=v389;break;}
case 2:{
const v392=__nullaryNode(0);
const v391=__node(0,[v392]);
v385=v391;break;}
case 3:{
let v393;switch(a0.a[1].a[1].c){
case 0:{
const v396=yield d_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0.a[1].a[0]);
const v395=__node(1,[v396]);
v393=v395;break;}
case 1:{
const v399=__nullaryNode(0);
const v398=__node(0,[v399]);
v393=v398;break;}
case 2:{
const v401=__nullaryNode(0);
const v400=__node(0,[v401]);
v393=v400;break;}
case 3:{
const v403=__nullaryNode(0);
const v402=__node(0,[v403]);
v393=v402;break;}
case 4:{
const v405=__nullaryNode(0);
const v404=__node(0,[v405]);
v393=v404;break;}
default:throw Error('literal constructor projection');}
v385=v393;break;}
case 4:{
const v407=__nullaryNode(0);
const v406=__node(0,[v407]);
v385=v406;break;}
default:throw Error('literal constructor projection');}
v381=v385;}else{
const v409=__nullaryNode(0);
const v408=__node(0,[v409]);
v381=v408;}
v354=v381;}
v344=v354;break;}
default:throw Error('literal constructor projection');}
return v344;}
function* d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){let v410;switch(a0.c){
case 0:{
const v413=0n;
const v414=__nullaryNode(0);
const v412=__node(4,[v413,v414]);
v410=v412;break;}
case 1:{
const v416=1n;
const v418=d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0.a[0]);
const v421=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[1]);
const v423=__nullaryNode(0);
const v420=__node(3,[v421,v423]);
const v417=__node(3,[v418,v420]);
const v415=__node(4,[v416,v417]);
v410=v415;break;}
default:throw Error('literal constructor projection');}
return v410;}
function d_41afa6d4ad63db4772d16e42df9c45d282a27b65cd44f4d1478c4d2b583a1746(a0){let v424;switch(a0.c){
case 0:{
const v426=0n;
v424=v426;break;}
case 1:{
const v427=d_31858978e848f97623668389b71fd41b0845c367e2d1ecb26272a01232a80b43(a0.a[1]);
v424=v427;break;}
case 2:{
v424=a0.a[5];break;}
default:throw Error('literal constructor projection');}
return v424;}
function d_438a1790547cd2e8d3594d23bcb57445b0235f3c0b9a0d6e37ea8069f02ba71d(a0){let v430;switch(a0.c){
case 0:{
const v433=0n;
const v435=d_1ded343e21e9e1c2410cf19d76be60a8e464fc6e2bb80b2f6a381623e6f78e3b(a0.a[0]);
const v437=__nullaryNode(0);
const v434=__node(3,[v435,v437]);
const v432=__node(4,[v433,v434]);
v430=v432;break;}
default:throw Error('literal constructor projection');}
return v430;}
function* d_48821efa17660c75b83b8fae2e9d5b65c8e5087079595e29c181b42255a4c2e9(a0,a1){const v445=__nullaryNode(0);
const v442=__node(1,[a0,a1,v445]);
const v441=yield d_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(v442);
const v440=yield d_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(v441);
const v439=yield d_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(v440);
const v438=yield d_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(v439);
return v438;}
function* d_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(a0){let v446;switch(a0.c){
case 0:{
const v448=__nullaryNode(0);
v446=v448;break;}
case 1:{
const v451=yield d_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(a0.a[2]);
const v449=__node(1,[a0.a[1],v451]);
v446=v449;break;}
default:throw Error('literal constructor projection');}
return v446;}
function d_581e8fb85867e31d4e92fc93ed0fce5ca6fad75cd034ce7f7d7973a22a7c908e(a0){let v453;switch(a0.c){
case 0:{
const v455=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v453=v455;break;}
case 1:{
const v460=__node(1,[a0.a[0],a0.a[1]]);
v453=v460;break;}
default:throw Error('literal constructor projection');}
return v453;}
function d_592acf05bc6244571b512a48306f8a1b591096b3ac05f3e5f707eb8831cb0030(a0){let v463;switch(a0.c){
case 0:{
const v466=0n;
const v469=__nullaryNode(0);
const v467=__node(3,[a0.a[0],v469]);
const v465=__node(4,[v466,v467]);
v463=v465;break;}
case 1:{
const v471=1n;
const v474=__nullaryNode(0);
const v472=__node(3,[a0.a[0],v474]);
const v470=__node(4,[v471,v472]);
v463=v470;break;}
default:throw Error('literal constructor projection');}
return v463;}
function* d_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0){let v475;switch(a0.c){
case 0:{
const v478=0n;
const v480=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v482=__nullaryNode(0);
const v479=__node(3,[v480,v482]);
const v477=__node(4,[v478,v479]);
v475=v477;break;}
default:throw Error('literal constructor projection');}
return v475;}
function* d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){let v483;switch(a0.c){
case 0:{
const v486=0n;
const v487=__nullaryNode(0);
const v485=__node(4,[v486,v487]);
v483=v485;break;}
case 1:{
const v489=1n;
const v493=yield d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0.a[1]);
const v495=__nullaryNode(0);
const v492=__node(3,[v493,v495]);
const v490=__node(3,[a0.a[0],v492]);
const v488=__node(4,[v489,v490]);
v483=v488;break;}
default:throw Error('literal constructor projection');}
return v483;}
function* d_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(a0,a1){let v496;switch(a0.c){
case 0:{
let v501;switch(a0.a[0].c){
case 0:{
const v504=0n;
const v503=__node(0,[v504]);
v501=v503;break;}
case 1:{
const v505=yield d_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0.a[0].a[0],a0.a[0].a[1]);
v501=v505;break;}
case 2:{
v501=a0.a[0].a[4];break;}
default:throw Error('literal constructor projection');}
const v500=d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(v501);
const v509=4294967295n;
const v499=BigInt.asUintN(64,(v500)&(v509));
const v510=false;
const v512=__node(0,[a0.a[0]]);
const v514=__nullaryNode(0);
const v498=__node(0,[v499,v510,a1,v512,v514]);
v496=v498;break;}
default:throw Error('literal constructor projection');}
return v496;}
function* d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){let v515;switch(a0.c){
case 0:{
const v517=__nullaryNode(0);
v515=v517;break;}
case 1:{
const v518=__nullaryNode(0);
v515=v518;break;}
case 2:{
const v519=__nullaryNode(0);
v515=v519;break;}
case 3:{
const v520=__nullaryNode(0);
v515=v520;break;}
case 4:{
const v524=0n;
const v522=(a0.a[0])===(v524);
let v521;if(v522){
let v525;switch(a0.a[1].c){
case 0:{
const v527=__nullaryNode(0);
v525=v527;break;}
case 1:{
const v528=__nullaryNode(0);
v525=v528;break;}
case 2:{
const v529=__nullaryNode(0);
v525=v529;break;}
case 3:{
const v530=__nullaryNode(0);
v525=v530;break;}
case 4:{
const v531=__nullaryNode(0);
v525=v531;break;}
default:throw Error('literal constructor projection');}
v521=v525;}else{
const v535=1n;
const v533=(a0.a[0])===(v535);
let v532;if(v533){
let v536;switch(a0.a[1].c){
case 0:{
const v538=__nullaryNode(0);
v536=v538;break;}
case 1:{
const v539=__nullaryNode(0);
v536=v539;break;}
case 2:{
const v540=__nullaryNode(0);
v536=v540;break;}
case 3:{
let v541;switch(a0.a[1].a[1].c){
case 0:{
const v543=__nullaryNode(0);
v541=v543;break;}
case 1:{
const v544=__nullaryNode(0);
v541=v544;break;}
case 2:{
const v545=__nullaryNode(0);
v541=v545;break;}
case 3:{
let v546;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v550=yield d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0.a[1].a[1].a[0]);
const v548=__node(1,[a0.a[1].a[0],v550]);
v546=v548;break;}
case 1:{
const v552=__nullaryNode(0);
v546=v552;break;}
case 2:{
const v553=__nullaryNode(0);
v546=v553;break;}
case 3:{
const v554=__nullaryNode(0);
v546=v554;break;}
case 4:{
const v555=__nullaryNode(0);
v546=v555;break;}
default:throw Error('literal constructor projection');}
v541=v546;break;}
case 4:{
const v556=__nullaryNode(0);
v541=v556;break;}
default:throw Error('literal constructor projection');}
v536=v541;break;}
case 4:{
const v557=__nullaryNode(0);
v536=v557;break;}
default:throw Error('literal constructor projection');}
v532=v536;}else{
const v558=__nullaryNode(0);
v532=v558;}
v521=v532;}
v515=v521;break;}
default:throw Error('literal constructor projection');}
return v515;}
function* d_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0){let v559;switch(a0.c){
case 0:{
const v562=0n;
const v564=yield d_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0.a[0]);
const v566=__nullaryNode(0);
const v563=__node(3,[v564,v566]);
const v561=__node(4,[v562,v563]);
v559=v561;break;}
case 1:{
const v568=1n;
const v570=d_592acf05bc6244571b512a48306f8a1b591096b3ac05f3e5f707eb8831cb0030(a0.a[0]);
const v572=__nullaryNode(0);
const v569=__node(3,[v570,v572]);
const v567=__node(4,[v568,v569]);
v559=v567;break;}
default:throw Error('literal constructor projection');}
return v559;}
function d_6cce05b519648ff4045eb3424833f6d16bf0753974a6bf0872594ce55e3a9196(a0){let v573;switch(a0.c){
case 0:{
const v575=__nullaryNode(0);
v573=v575;break;}
case 1:{
const v576=__nullaryNode(0);
v573=v576;break;}
case 2:{
const v577=__nullaryNode(0);
v573=v577;break;}
case 3:{
const v578=__nullaryNode(0);
v573=v578;break;}
case 4:{
const v582=0n;
const v580=(a0.a[0])===(v582);
let v579;if(v580){
let v583;switch(a0.a[1].c){
case 0:{
const v585=__nullaryNode(0);
v583=v585;break;}
case 1:{
const v586=__nullaryNode(0);
v583=v586;break;}
case 2:{
const v587=__nullaryNode(0);
v583=v587;break;}
case 3:{
const v588=__nullaryNode(0);
v583=v588;break;}
case 4:{
const v589=__nullaryNode(0);
v583=v589;break;}
default:throw Error('literal constructor projection');}
v579=v583;}else{
const v590=__nullaryNode(0);
v579=v590;}
v573=v579;break;}
default:throw Error('literal constructor projection');}
return v573;}
function* d_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0,a1,a2){const v595=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v593=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v595);
const v598=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v597=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v598,a1);
const v592=(v593)||(v597);
let v591;if(v592){
v591=a0;}else{
let v602;switch(a0.c){
case 0:{
const v604=__nullaryNode(0);
v602=v604;break;}
case 1:{
const v606=yield d_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v605;if(v606){
const v609=__node(1,[a0.a[0],a2]);
v605=v609;}else{
const v612=__node(1,[a0.a[0],a0.a[1]]);
v605=v612;}
v602=v605;break;}
case 2:{
const v616=yield d_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[0],a1,a2);
const v620=yield d_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[1],a1,a2);
const v615=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v616,v620);
v602=v615;break;}
default:throw Error('literal constructor projection');}
v591=v602;}
return v591;}
function* d_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0,a1){let v624;switch(a0.c){
case 0:{
let v626;switch(a1.c){
case 0:{
const v628=true;
v626=v628;break;}
case 1:{
const v629=false;
v626=v629;break;}
default:throw Error('literal constructor projection');}
v624=v626;break;}
case 1:{
let v630;switch(a1.c){
case 0:{
const v632=false;
v630=v632;break;}
case 1:{
const v634=(a0.a[0])===(a1.a[0]);
let v633;if(v634){
const v638=yield d_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0.a[1],a1.a[1]);
let v637;if(v638){
const v641=true;
v637=v641;}else{
const v642=false;
v637=v642;}
v633=v637;}else{
const v643=false;
v633=v643;}
v630=v633;break;}
default:throw Error('literal constructor projection');}
v624=v630;break;}
default:throw Error('literal constructor projection');}
return v624;}
function d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0){let v644;switch(a0.c){
case 0:{
const v646=__nullaryNode(0);
v644=v646;break;}
case 1:{
v644=a0.a[0];break;}
case 2:{
v644=a0.a[3];break;}
default:throw Error('literal constructor projection');}
return v644;}
function d_7c626cb37b478498579f5a10f626efbc4235e3dbdd595bcd7fae8ed1c0c445c4(a0){let v649;switch(a0.c){
case 0:{
const v652=false;
const v651=__node(0,[v652]);
v649=v651;break;}
case 1:{
const v654=false;
const v653=__node(0,[v654]);
v649=v653;break;}
case 2:{
const v656=false;
const v655=__node(0,[v656]);
v649=v655;break;}
case 3:{
const v658=false;
const v657=__node(0,[v658]);
v649=v657;break;}
case 4:{
const v662=0n;
const v660=(a0.a[0])===(v662);
let v659;if(v660){
let v663;switch(a0.a[1].c){
case 0:{
const v666=false;
const v665=__node(0,[v666]);
v663=v665;break;}
case 1:{
const v668=false;
const v667=__node(0,[v668]);
v663=v667;break;}
case 2:{
const v670=false;
const v669=__node(0,[v670]);
v663=v669;break;}
case 3:{
let v671;switch(a0.a[1].a[1].c){
case 0:{
const v674=d_255299b53c72a2786fe15c53bfc1e342085e441f49d12eeb4c49852e9a066c38(a0.a[1].a[0]);
const v673=__node(0,[v674]);
v671=v673;break;}
case 1:{
const v677=false;
const v676=__node(0,[v677]);
v671=v676;break;}
case 2:{
const v679=false;
const v678=__node(0,[v679]);
v671=v678;break;}
case 3:{
const v681=false;
const v680=__node(0,[v681]);
v671=v680;break;}
case 4:{
const v683=false;
const v682=__node(0,[v683]);
v671=v682;break;}
default:throw Error('literal constructor projection');}
v663=v671;break;}
case 4:{
const v685=false;
const v684=__node(0,[v685]);
v663=v684;break;}
default:throw Error('literal constructor projection');}
v659=v663;}else{
const v687=false;
const v686=__node(0,[v687]);
v659=v686;}
v649=v659;break;}
default:throw Error('literal constructor projection');}
return v649;}
function* d_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0,a1){let v688;switch(a0.c){
case 0:{
let v690;switch(a1.c){
case 0:{
const v692=false;
v690=v692;break;}
case 1:{
const v693=true;
v690=v693;break;}
default:throw Error('literal constructor projection');}
v688=v690;break;}
case 1:{
let v694;switch(a1.c){
case 0:{
const v696=false;
v694=v696;break;}
case 1:{
const v698=(a0.a[0])===(a1.a[0]);
let v697;if(v698){
const v701=yield d_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0.a[1],a1.a[1]);
v697=v701;}else{
const v704=(a0.a[0])<(a1.a[0]);
v697=v704;}
v694=v697;break;}
default:throw Error('literal constructor projection');}
v688=v694;break;}
default:throw Error('literal constructor projection');}
return v688;}
function d_7d350b8c08d443785fb7708635e000d6ac98f2ec18aa5b162a96f36235b83f47(a0){let v707;switch(a0.c){
case 0:{
const v710=0n;
const v711=__nullaryNode(0);
const v709=__node(4,[v710,v711]);
v707=v709;break;}
default:throw Error('literal constructor projection');}
return v707;}
function* d_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a0){let v712;switch(a0.c){
case 0:{
const v715=0n;
const v714=__node(0,[v715]);
v712=v714;break;}
case 1:{
const v716=yield d_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0.a[0],a0.a[1]);
v712=v716;break;}
case 2:{
v712=a0.a[4];break;}
default:throw Error('literal constructor projection');}
return v712;}
function d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0){let v720;switch(a0.c){
case 0:{
const v722=__nullaryNode(0);
v720=v722;break;}
case 1:{
v720=a0.a[0];break;}
case 2:{
v720=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v720;}
function d_866f1a3a5f9afd801d31ee4cb13ab442ca9ed188ee66daa5441e65810dfaa8f7(a0){let v725;switch(a0.c){
case 0:{
v725=a0.a[3];break;}
case 1:{
v725=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v725;}
function* d_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0,a1){const v733=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v731=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v733);
const v736=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v735=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v736,a1);
const v730=(v731)||(v735);
let v729;if(v730){
v729=a0;}else{
let v740;switch(a0.c){
case 0:{
const v742=__nullaryNode(0);
v740=v742;break;}
case 1:{
const v744=yield d_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v743;if(v744){
const v747=__nullaryNode(0);
v743=v747;}else{
const v748=__node(1,[a0.a[0],a0.a[1]]);
v743=v748;}
v740=v743;break;}
case 2:{
const v752=yield d_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[0],a1);
const v755=yield d_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[1],a1);
const v751=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v752,v755);
v740=v751;break;}
default:throw Error('literal constructor projection');}
v729=v740;}
return v729;}
function* d_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(a0,a1){let v758;switch(a0.c){
case 0:{
v758=a1;break;}
case 1:{
const v764=yield d_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(a0.a[2],a1);
const v761=__node(1,[a0.a[0],a0.a[1],v764]);
v758=v761;break;}
default:throw Error('literal constructor projection');}
return v758;}
function* d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1){const v772=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v774=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a1);
const v771=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v772,v774);
let v770;if(v771){
const v776=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
v770=v776;}else{
const v778=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a1);
v770=v778;}
const v782=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v784=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a1);
const v781=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v782,v784);
let v780;if(v781){
const v786=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a1);
v780=v786;}else{
const v788=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
v780=v788;}
const v791=yield d_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a0);
const v793=yield d_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a1);
const v790=d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(v791,v793);
const v796=d_41afa6d4ad63db4772d16e42df9c45d282a27b65cd44f4d1478c4d2b583a1746(a0);
const v798=d_41afa6d4ad63db4772d16e42df9c45d282a27b65cd44f4d1478c4d2b583a1746(a1);
const v795=BigInt.asUintN(64,(v796)+(v798));
const v803=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v805=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v802=(v803)<(v805);
let v801;if(v802){
const v807=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
v801=v807;}else{
const v809=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
v801=v809;}
const v811=1n;
const v800=BigInt.asUintN(64,(v801)+(v811));
const v767=__node(2,[a0,a1,v770,v780,v790,v795,v800]);
return v767;}
function* d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){let v812;switch(a0.c){
case 0:{
const v815=0n;
const v816=__nullaryNode(0);
const v814=__node(4,[v815,v816]);
v812=v814;break;}
case 1:{
const v818=1n;
const v822=yield d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0.a[1]);
const v824=__nullaryNode(0);
const v821=__node(3,[v822,v824]);
const v819=__node(3,[a0.a[0],v821]);
const v817=__node(4,[v818,v819]);
v812=v817;break;}
default:throw Error('literal constructor projection');}
return v812;}
function* d_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(a0,a1,a2){let v825;switch(a0.c){
case 0:{
const v827=__node(1,[a1,a2]);
v825=v827;break;}
case 1:{
const v831=__node(1,[a1,a2]);
const v834=__node(1,[a0.a[0],a0.a[1]]);
const v830=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v831,v834);
v825=v830;break;}
case 2:{
const v838=yield d_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(a0.a[0],a1,a2);
const v837=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v838,a0.a[1]);
v825=v837;break;}
default:throw Error('literal constructor projection');}
return v825;}
function d_a7f0913c943a3d4b183c98e29ed4275b33d249620ed840ddabfbf932ca8b54cd(a0){let v843;switch(a0.c){
case 0:{
v843=a0.a[3];break;}
case 1:{
v843=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v843;}
function* d_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(a0){let v847;switch(a0.c){
case 0:{
const v850=yield d_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[0]);
const v849=__node(0,[v850]);
v847=v849;break;}
default:throw Error('literal constructor projection');}
return v847;}
function* d_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0){let v852;switch(a0.c){
case 0:{
const v855=__nullaryNode(0);
const v854=__node(0,[v855]);
v852=v854;break;}
case 1:{
const v857=__nullaryNode(0);
const v856=__node(0,[v857]);
v852=v856;break;}
case 2:{
const v859=__nullaryNode(0);
const v858=__node(0,[v859]);
v852=v858;break;}
case 3:{
const v861=__nullaryNode(0);
const v860=__node(0,[v861]);
v852=v860;break;}
case 4:{
const v865=0n;
const v863=(a0.a[0])===(v865);
let v862;if(v863){
let v866;switch(a0.a[1].c){
case 0:{
const v869=__nullaryNode(0);
const v868=__node(0,[v869]);
v866=v868;break;}
case 1:{
const v871=__nullaryNode(0);
const v870=__node(0,[v871]);
v866=v870;break;}
case 2:{
const v873=__nullaryNode(0);
const v872=__node(0,[v873]);
v866=v872;break;}
case 3:{
let v874;switch(a0.a[1].a[1].c){
case 0:{
const v877=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v876=__node(0,[v877]);
v874=v876;break;}
case 1:{
const v880=__nullaryNode(0);
const v879=__node(0,[v880]);
v874=v879;break;}
case 2:{
const v882=__nullaryNode(0);
const v881=__node(0,[v882]);
v874=v881;break;}
case 3:{
const v884=__nullaryNode(0);
const v883=__node(0,[v884]);
v874=v883;break;}
case 4:{
const v886=__nullaryNode(0);
const v885=__node(0,[v886]);
v874=v885;break;}
default:throw Error('literal constructor projection');}
v866=v874;break;}
case 4:{
const v888=__nullaryNode(0);
const v887=__node(0,[v888]);
v866=v887;break;}
default:throw Error('literal constructor projection');}
v862=v866;}else{
const v890=__nullaryNode(0);
const v889=__node(0,[v890]);
v862=v889;}
v852=v862;break;}
default:throw Error('literal constructor projection');}
return v852;}
function* d_b8817607f4fc8a3d4a760799a5583b58d6bbde93ed906aee863c4d0edcf1dc32(a0,a1){const v893=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v896=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v898=1n;
const v895=BigInt.asUintN(64,(v896)+(v898));
const v892=(v893)>(v895);
let v891;if(v892){
let v899;switch(a1.c){
case 0:{
const v901=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v899=v901;break;}
case 1:{
const v904=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v899=v904;break;}
case 2:{
const v907=yield d_f151aef50c337baa7a11990528cd1ef22ee578846f477ccfb3bd115b4ac69d47(a0,a1.a[0],a1.a[1]);
v899=v907;break;}
default:throw Error('literal constructor projection');}
v891=v899;}else{
const v911=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v891=v911;}
return v891;}
function* d_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(a0){let v914;switch(a0.c){
case 0:{
const v916=__nullaryNode(0);
v914=v916;break;}
case 1:{
let v918;switch(a0.a[0].c){
case 0:{
v918=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v921=yield d_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(a0.a[1]);
const v917=__node(1,[v918,v921]);
v914=v917;break;}
default:throw Error('literal constructor projection');}
return v914;}
function d_be39b632da6b6c85b97f1df43f7a58695006128dfe405c6284db9c22402055e5(a0){let v923;switch(a0.c){
case 0:{
const v925=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v923=v925;break;}
case 1:{
const v930=__node(1,[a0.a[0],a0.a[1]]);
v923=v930;break;}
default:throw Error('literal constructor projection');}
return v923;}
function d_d6bc4c53b80ad1f8905faecb76ff8d04f204371cbe91768017177bedd22fa703(a0){let v933;switch(a0.c){
case 0:{
const v936=__nullaryNode(0);
const v935=__node(0,[v936]);
v933=v935;break;}
case 1:{
const v938=__nullaryNode(0);
const v937=__node(0,[v938]);
v933=v937;break;}
case 2:{
const v940=__nullaryNode(0);
const v939=__node(0,[v940]);
v933=v939;break;}
case 3:{
const v942=__nullaryNode(0);
const v941=__node(0,[v942]);
v933=v941;break;}
case 4:{
const v946=0n;
const v944=(a0.a[0])===(v946);
let v943;if(v944){
let v947;switch(a0.a[1].c){
case 0:{
const v950=__nullaryNode(0);
const v949=__node(0,[v950]);
v947=v949;break;}
case 1:{
const v952=__nullaryNode(0);
const v951=__node(0,[v952]);
v947=v951;break;}
case 2:{
const v954=__nullaryNode(0);
const v953=__node(0,[v954]);
v947=v953;break;}
case 3:{
let v955;switch(a0.a[1].a[1].c){
case 0:{
const v957=__node(0,[a0.a[1].a[0]]);
v955=v957;break;}
case 1:{
const v960=__nullaryNode(0);
const v959=__node(0,[v960]);
v955=v959;break;}
case 2:{
const v962=__nullaryNode(0);
const v961=__node(0,[v962]);
v955=v961;break;}
case 3:{
const v964=__nullaryNode(0);
const v963=__node(0,[v964]);
v955=v963;break;}
case 4:{
const v966=__nullaryNode(0);
const v965=__node(0,[v966]);
v955=v965;break;}
default:throw Error('literal constructor projection');}
v947=v955;break;}
case 4:{
const v968=__nullaryNode(0);
const v967=__node(0,[v968]);
v947=v967;break;}
default:throw Error('literal constructor projection');}
v943=v947;}else{
const v972=1n;
const v970=(a0.a[0])===(v972);
let v969;if(v970){
let v973;switch(a0.a[1].c){
case 0:{
const v976=__nullaryNode(0);
const v975=__node(0,[v976]);
v973=v975;break;}
case 1:{
const v978=__nullaryNode(0);
const v977=__node(0,[v978]);
v973=v977;break;}
case 2:{
const v980=__nullaryNode(0);
const v979=__node(0,[v980]);
v973=v979;break;}
case 3:{
let v981;switch(a0.a[1].a[1].c){
case 0:{
const v983=__node(1,[a0.a[1].a[0]]);
v981=v983;break;}
case 1:{
const v986=__nullaryNode(0);
const v985=__node(0,[v986]);
v981=v985;break;}
case 2:{
const v988=__nullaryNode(0);
const v987=__node(0,[v988]);
v981=v987;break;}
case 3:{
const v990=__nullaryNode(0);
const v989=__node(0,[v990]);
v981=v989;break;}
case 4:{
const v992=__nullaryNode(0);
const v991=__node(0,[v992]);
v981=v991;break;}
default:throw Error('literal constructor projection');}
v973=v981;break;}
case 4:{
const v994=__nullaryNode(0);
const v993=__node(0,[v994]);
v973=v993;break;}
default:throw Error('literal constructor projection');}
v969=v973;}else{
const v996=__nullaryNode(0);
const v995=__node(0,[v996]);
v969=v995;}
v943=v969;}
v933=v943;break;}
default:throw Error('literal constructor projection');}
return v933;}
function* d_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0,a1,a2){let v997;switch(a0.c){
case 0:{
const v999=__node(1,[a1,a2]);
v997=v999;break;}
case 1:{
const v1003=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,a0.a[0]);
let v1002;if(v1003){
const v1007=__node(1,[a1,a2]);
const v1010=__node(1,[a0.a[0],a0.a[1]]);
const v1006=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v1007,v1010);
v1002=v1006;}else{
const v1014=__node(1,[a0.a[0],a0.a[1]]);
const v1017=__node(1,[a1,a2]);
const v1013=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v1014,v1017);
v1002=v1013;}
v997=v1002;break;}
case 2:{
const v1023=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0.a[0]);
const v1021=yield d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v1023);
let v1020;if(v1021){
const v1026=yield d_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[0],a1,a2);
const v1025=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v1026,a0.a[1]);
v1020=v1025;}else{
const v1033=yield d_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[1],a1,a2);
const v1031=yield d_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(a0.a[0],v1033);
v1020=v1031;}
v997=v1020;break;}
default:throw Error('literal constructor projection');}
return v997;}
function d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0){let v1037;switch(a0.c){
case 0:{
const v1039=0n;
v1037=v1039;break;}
case 1:{
v1037=a0.a[0];break;}
case 2:{
const v1041=0n;
v1037=v1041;break;}
case 3:{
const v1042=0n;
v1037=v1042;break;}
case 4:{
const v1043=0n;
v1037=v1043;break;}
default:throw Error('literal constructor projection');}
return v1037;}
function* d_df61cd3826494889da2a704dc5d91ee794b4499d1ae7f97cb94445d06016d531(a0,a1){const v1046=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v1049=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v1051=1n;
const v1048=BigInt.asUintN(64,(v1049)+(v1051));
const v1045=(v1046)>(v1048);
let v1044;if(v1045){
let v1052;switch(a0.c){
case 0:{
const v1054=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v1052=v1054;break;}
case 1:{
const v1057=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v1052=v1057;break;}
case 2:{
const v1060=yield d_0ece595a937fc883aae5d90e31f204e9ccde30c7280a22873bac4482408934e0(a0.a[0],a0.a[1],a1);
v1052=v1060;break;}
default:throw Error('literal constructor projection');}
v1044=v1052;}else{
const v1064=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v1044=v1064;}
return v1044;}
function* d_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0){let v1067;switch(a0.c){
case 0:{
const v1071=false;
const v1070=__node(0,[v1071]);
const v1069=__node(0,[v1070]);
v1067=v1069;break;}
case 1:{
const v1074=false;
const v1073=__node(0,[v1074]);
const v1072=__node(0,[v1073]);
v1067=v1072;break;}
case 2:{
const v1077=false;
const v1076=__node(0,[v1077]);
const v1075=__node(0,[v1076]);
v1067=v1075;break;}
case 3:{
const v1080=false;
const v1079=__node(0,[v1080]);
const v1078=__node(0,[v1079]);
v1067=v1078;break;}
case 4:{
const v1084=0n;
const v1082=(a0.a[0])===(v1084);
let v1081;if(v1082){
let v1085;switch(a0.a[1].c){
case 0:{
const v1089=false;
const v1088=__node(0,[v1089]);
const v1087=__node(0,[v1088]);
v1085=v1087;break;}
case 1:{
const v1092=false;
const v1091=__node(0,[v1092]);
const v1090=__node(0,[v1091]);
v1085=v1090;break;}
case 2:{
const v1095=false;
const v1094=__node(0,[v1095]);
const v1093=__node(0,[v1094]);
v1085=v1093;break;}
case 3:{
let v1096;switch(a0.a[1].a[1].c){
case 0:{
const v1099=d_7c626cb37b478498579f5a10f626efbc4235e3dbdd595bcd7fae8ed1c0c445c4(a0.a[1].a[0]);
const v1098=__node(0,[v1099]);
v1096=v1098;break;}
case 1:{
const v1103=false;
const v1102=__node(0,[v1103]);
const v1101=__node(0,[v1102]);
v1096=v1101;break;}
case 2:{
const v1106=false;
const v1105=__node(0,[v1106]);
const v1104=__node(0,[v1105]);
v1096=v1104;break;}
case 3:{
const v1109=false;
const v1108=__node(0,[v1109]);
const v1107=__node(0,[v1108]);
v1096=v1107;break;}
case 4:{
const v1112=false;
const v1111=__node(0,[v1112]);
const v1110=__node(0,[v1111]);
v1096=v1110;break;}
default:throw Error('literal constructor projection');}
v1085=v1096;break;}
case 4:{
const v1115=false;
const v1114=__node(0,[v1115]);
const v1113=__node(0,[v1114]);
v1085=v1113;break;}
default:throw Error('literal constructor projection');}
v1081=v1085;}else{
const v1119=1n;
const v1117=(a0.a[0])===(v1119);
let v1116;if(v1117){
let v1120;switch(a0.a[1].c){
case 0:{
const v1124=false;
const v1123=__node(0,[v1124]);
const v1122=__node(0,[v1123]);
v1120=v1122;break;}
case 1:{
const v1127=false;
const v1126=__node(0,[v1127]);
const v1125=__node(0,[v1126]);
v1120=v1125;break;}
case 2:{
const v1130=false;
const v1129=__node(0,[v1130]);
const v1128=__node(0,[v1129]);
v1120=v1128;break;}
case 3:{
let v1131;switch(a0.a[1].a[1].c){
case 0:{
const v1134=yield d_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0.a[1].a[0]);
const v1133=__node(1,[v1134]);
v1131=v1133;break;}
case 1:{
const v1138=false;
const v1137=__node(0,[v1138]);
const v1136=__node(0,[v1137]);
v1131=v1136;break;}
case 2:{
const v1141=false;
const v1140=__node(0,[v1141]);
const v1139=__node(0,[v1140]);
v1131=v1139;break;}
case 3:{
const v1144=false;
const v1143=__node(0,[v1144]);
const v1142=__node(0,[v1143]);
v1131=v1142;break;}
case 4:{
const v1147=false;
const v1146=__node(0,[v1147]);
const v1145=__node(0,[v1146]);
v1131=v1145;break;}
default:throw Error('literal constructor projection');}
v1120=v1131;break;}
case 4:{
const v1150=false;
const v1149=__node(0,[v1150]);
const v1148=__node(0,[v1149]);
v1120=v1148;break;}
default:throw Error('literal constructor projection');}
v1116=v1120;}else{
const v1153=false;
const v1152=__node(0,[v1153]);
const v1151=__node(0,[v1152]);
v1116=v1151;}
v1081=v1116;}
v1067=v1081;break;}
default:throw Error('literal constructor projection');}
return v1067;}
function* d_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0){let v1154;switch(a0.c){
case 0:{
const v1156=__nullaryNode(0);
v1154=v1156;break;}
case 1:{
let v1158;switch(a0.a[0].c){
case 0:{
v1158=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v1157;if(v1158){
const v1163=yield d_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0.a[1]);
const v1161=__node(1,[a0.a[0],v1163]);
v1157=v1161;}else{
const v1165=yield d_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0.a[1]);
v1157=v1165;}
v1154=v1157;break;}
default:throw Error('literal constructor projection');}
return v1154;}
function d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(a0,a1){let v1167;switch(a0.c){
case 0:{
let v1169;switch(a1.c){
case 0:{
const v1172=BigInt.asUintN(64,(a0.a[0])+(a1.a[0]));
const v1171=__node(0,[v1172]);
v1169=v1171;break;}
default:throw Error('literal constructor projection');}
v1167=v1169;break;}
default:throw Error('literal constructor projection');}
return v1167;}
function* d_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0){let v1175;switch(a0.c){
case 0:{
const v1179=__nullaryNode(0);
const v1178=__node(0,[v1179]);
const v1177=__node(0,[v1178]);
v1175=v1177;break;}
case 1:{
const v1182=__nullaryNode(0);
const v1181=__node(0,[v1182]);
const v1180=__node(0,[v1181]);
v1175=v1180;break;}
case 2:{
const v1185=__nullaryNode(0);
const v1184=__node(0,[v1185]);
const v1183=__node(0,[v1184]);
v1175=v1183;break;}
case 3:{
const v1188=__nullaryNode(0);
const v1187=__node(0,[v1188]);
const v1186=__node(0,[v1187]);
v1175=v1186;break;}
case 4:{
const v1192=0n;
const v1190=(a0.a[0])===(v1192);
let v1189;if(v1190){
let v1193;switch(a0.a[1].c){
case 0:{
const v1197=__nullaryNode(0);
const v1196=__node(0,[v1197]);
const v1195=__node(0,[v1196]);
v1193=v1195;break;}
case 1:{
const v1200=__nullaryNode(0);
const v1199=__node(0,[v1200]);
const v1198=__node(0,[v1199]);
v1193=v1198;break;}
case 2:{
const v1203=__nullaryNode(0);
const v1202=__node(0,[v1203]);
const v1201=__node(0,[v1202]);
v1193=v1201;break;}
case 3:{
let v1204;switch(a0.a[1].a[1].c){
case 0:{
const v1207=yield d_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0.a[1].a[0]);
const v1206=__node(0,[v1207]);
v1204=v1206;break;}
case 1:{
const v1211=__nullaryNode(0);
const v1210=__node(0,[v1211]);
const v1209=__node(0,[v1210]);
v1204=v1209;break;}
case 2:{
const v1214=__nullaryNode(0);
const v1213=__node(0,[v1214]);
const v1212=__node(0,[v1213]);
v1204=v1212;break;}
case 3:{
const v1217=__nullaryNode(0);
const v1216=__node(0,[v1217]);
const v1215=__node(0,[v1216]);
v1204=v1215;break;}
case 4:{
const v1220=__nullaryNode(0);
const v1219=__node(0,[v1220]);
const v1218=__node(0,[v1219]);
v1204=v1218;break;}
default:throw Error('literal constructor projection');}
v1193=v1204;break;}
case 4:{
const v1223=__nullaryNode(0);
const v1222=__node(0,[v1223]);
const v1221=__node(0,[v1222]);
v1193=v1221;break;}
default:throw Error('literal constructor projection');}
v1189=v1193;}else{
const v1227=1n;
const v1225=(a0.a[0])===(v1227);
let v1224;if(v1225){
let v1228;switch(a0.a[1].c){
case 0:{
const v1232=__nullaryNode(0);
const v1231=__node(0,[v1232]);
const v1230=__node(0,[v1231]);
v1228=v1230;break;}
case 1:{
const v1235=__nullaryNode(0);
const v1234=__node(0,[v1235]);
const v1233=__node(0,[v1234]);
v1228=v1233;break;}
case 2:{
const v1238=__nullaryNode(0);
const v1237=__node(0,[v1238]);
const v1236=__node(0,[v1237]);
v1228=v1236;break;}
case 3:{
let v1239;switch(a0.a[1].a[1].c){
case 0:{
const v1242=d_d6bc4c53b80ad1f8905faecb76ff8d04f204371cbe91768017177bedd22fa703(a0.a[1].a[0]);
const v1241=__node(1,[v1242]);
v1239=v1241;break;}
case 1:{
const v1246=__nullaryNode(0);
const v1245=__node(0,[v1246]);
const v1244=__node(0,[v1245]);
v1239=v1244;break;}
case 2:{
const v1249=__nullaryNode(0);
const v1248=__node(0,[v1249]);
const v1247=__node(0,[v1248]);
v1239=v1247;break;}
case 3:{
const v1252=__nullaryNode(0);
const v1251=__node(0,[v1252]);
const v1250=__node(0,[v1251]);
v1239=v1250;break;}
case 4:{
const v1255=__nullaryNode(0);
const v1254=__node(0,[v1255]);
const v1253=__node(0,[v1254]);
v1239=v1253;break;}
default:throw Error('literal constructor projection');}
v1228=v1239;break;}
case 4:{
const v1258=__nullaryNode(0);
const v1257=__node(0,[v1258]);
const v1256=__node(0,[v1257]);
v1228=v1256;break;}
default:throw Error('literal constructor projection');}
v1224=v1228;}else{
const v1261=__nullaryNode(0);
const v1260=__node(0,[v1261]);
const v1259=__node(0,[v1260]);
v1224=v1259;}
v1189=v1224;}
v1175=v1189;break;}
default:throw Error('literal constructor projection');}
return v1175;}
function* d_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0,a1){const v1263=yield d_48821efa17660c75b83b8fae2e9d5b65c8e5087079595e29c181b42255a4c2e9(a0,a1);
const v1262=__node(0,[v1263]);
return v1262;}
function* d_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0){let v1266;switch(a0.c){
case 0:{
const v1269=0n;
const v1271=yield d_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0.a[0]);
const v1273=__nullaryNode(0);
const v1270=__node(3,[v1271,v1273]);
const v1268=__node(4,[v1269,v1270]);
v1266=v1268;break;}
case 1:{
const v1275=1n;
const v1277=yield d_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0.a[0]);
const v1279=__nullaryNode(0);
const v1276=__node(3,[v1277,v1279]);
const v1274=__node(4,[v1275,v1276]);
v1266=v1274;break;}
default:throw Error('literal constructor projection');}
return v1266;}
function* d_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0){let v1280;switch(a0.c){
case 0:{
const v1283=0n;
const v1285=d_438a1790547cd2e8d3594d23bcb57445b0235f3c0b9a0d6e37ea8069f02ba71d(a0.a[0]);
const v1287=__nullaryNode(0);
const v1284=__node(3,[v1285,v1287]);
const v1282=__node(4,[v1283,v1284]);
v1280=v1282;break;}
case 1:{
const v1289=1n;
const v1291=yield d_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0.a[0]);
const v1293=__nullaryNode(0);
const v1290=__node(3,[v1291,v1293]);
const v1288=__node(4,[v1289,v1290]);
v1280=v1288;break;}
default:throw Error('literal constructor projection');}
return v1280;}
function* d_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0){let v1294;switch(a0.c){
case 0:{
const v1298=__nullaryNode(0);
const v1297=__node(0,[v1298]);
const v1296=__node(0,[v1297]);
v1294=v1296;break;}
case 1:{
const v1301=__nullaryNode(0);
const v1300=__node(0,[v1301]);
const v1299=__node(0,[v1300]);
v1294=v1299;break;}
case 2:{
const v1304=__nullaryNode(0);
const v1303=__node(0,[v1304]);
const v1302=__node(0,[v1303]);
v1294=v1302;break;}
case 3:{
const v1307=__nullaryNode(0);
const v1306=__node(0,[v1307]);
const v1305=__node(0,[v1306]);
v1294=v1305;break;}
case 4:{
const v1311=0n;
const v1309=(a0.a[0])===(v1311);
let v1308;if(v1309){
let v1312;switch(a0.a[1].c){
case 0:{
const v1316=__nullaryNode(0);
const v1315=__node(0,[v1316]);
const v1314=__node(0,[v1315]);
v1312=v1314;break;}
case 1:{
const v1319=__nullaryNode(0);
const v1318=__node(0,[v1319]);
const v1317=__node(0,[v1318]);
v1312=v1317;break;}
case 2:{
const v1322=__nullaryNode(0);
const v1321=__node(0,[v1322]);
const v1320=__node(0,[v1321]);
v1312=v1320;break;}
case 3:{
let v1323;switch(a0.a[1].a[1].c){
case 0:{
const v1326=yield d_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0.a[1].a[0]);
const v1325=__node(0,[v1326]);
v1323=v1325;break;}
case 1:{
const v1330=__nullaryNode(0);
const v1329=__node(0,[v1330]);
const v1328=__node(0,[v1329]);
v1323=v1328;break;}
case 2:{
const v1333=__nullaryNode(0);
const v1332=__node(0,[v1333]);
const v1331=__node(0,[v1332]);
v1323=v1331;break;}
case 3:{
const v1336=__nullaryNode(0);
const v1335=__node(0,[v1336]);
const v1334=__node(0,[v1335]);
v1323=v1334;break;}
case 4:{
const v1339=__nullaryNode(0);
const v1338=__node(0,[v1339]);
const v1337=__node(0,[v1338]);
v1323=v1337;break;}
default:throw Error('literal constructor projection');}
v1312=v1323;break;}
case 4:{
const v1342=__nullaryNode(0);
const v1341=__node(0,[v1342]);
const v1340=__node(0,[v1341]);
v1312=v1340;break;}
default:throw Error('literal constructor projection');}
v1308=v1312;}else{
const v1346=1n;
const v1344=(a0.a[0])===(v1346);
let v1343;if(v1344){
let v1347;switch(a0.a[1].c){
case 0:{
const v1351=__nullaryNode(0);
const v1350=__node(0,[v1351]);
const v1349=__node(0,[v1350]);
v1347=v1349;break;}
case 1:{
const v1354=__nullaryNode(0);
const v1353=__node(0,[v1354]);
const v1352=__node(0,[v1353]);
v1347=v1352;break;}
case 2:{
const v1357=__nullaryNode(0);
const v1356=__node(0,[v1357]);
const v1355=__node(0,[v1356]);
v1347=v1355;break;}
case 3:{
let v1358;switch(a0.a[1].a[1].c){
case 0:{
const v1361=yield d_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0.a[1].a[0]);
const v1360=__node(1,[v1361]);
v1358=v1360;break;}
case 1:{
const v1365=__nullaryNode(0);
const v1364=__node(0,[v1365]);
const v1363=__node(0,[v1364]);
v1358=v1363;break;}
case 2:{
const v1368=__nullaryNode(0);
const v1367=__node(0,[v1368]);
const v1366=__node(0,[v1367]);
v1358=v1366;break;}
case 3:{
const v1371=__nullaryNode(0);
const v1370=__node(0,[v1371]);
const v1369=__node(0,[v1370]);
v1358=v1369;break;}
case 4:{
const v1374=__nullaryNode(0);
const v1373=__node(0,[v1374]);
const v1372=__node(0,[v1373]);
v1358=v1372;break;}
default:throw Error('literal constructor projection');}
v1347=v1358;break;}
case 4:{
const v1377=__nullaryNode(0);
const v1376=__node(0,[v1377]);
const v1375=__node(0,[v1376]);
v1347=v1375;break;}
default:throw Error('literal constructor projection');}
v1343=v1347;}else{
const v1380=__nullaryNode(0);
const v1379=__node(0,[v1380]);
const v1378=__node(0,[v1379]);
v1343=v1378;}
v1308=v1343;}
v1294=v1308;break;}
default:throw Error('literal constructor projection');}
return v1294;}
function* d_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0){let v1381;switch(a0.c){
case 0:{
const v1383=__nullaryNode(0);
v1381=v1383;break;}
case 1:{
const v1385=yield d_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0.a[2]);
const v1384=yield d_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(v1385,a0.a[0],a0.a[1]);
v1381=v1384;break;}
default:throw Error('literal constructor projection');}
return v1381;}
function* d_f151aef50c337baa7a11990528cd1ef22ee578846f477ccfb3bd115b4ac69d47(a0,a1,a2){const v1391=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a2);
const v1393=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v1390=(v1391)<(v1393);
let v1389;if(v1390){
let v1395;switch(a1.c){
case 0:{
const v1398=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1397=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1398,a2);
v1395=v1397;break;}
case 1:{
const v1403=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1402=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1403,a2);
v1395=v1402;break;}
case 2:{
const v1408=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1.a[0]);
const v1411=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1.a[1],a2);
const v1407=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1408,v1411);
v1395=v1407;break;}
default:throw Error('literal constructor projection');}
v1389=v1395;}else{
const v1415=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1414=yield d_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1415,a2);
v1389=v1414;}
return v1389;}
function d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0){const v1419=__node(1,[a0]);
return v1419;}
function* d_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a0,a1){const v1421=yield d_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0,a1);
return v1421;}
function* d_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0){let v1424;switch(a0.c){
case 0:{
const v1427=__nullaryNode(0);
const v1426=__node(0,[v1427]);
v1424=v1426;break;}
case 1:{
const v1429=__nullaryNode(0);
const v1428=__node(0,[v1429]);
v1424=v1428;break;}
case 2:{
const v1431=__nullaryNode(0);
const v1430=__node(0,[v1431]);
v1424=v1430;break;}
case 3:{
const v1433=__nullaryNode(0);
const v1432=__node(0,[v1433]);
v1424=v1432;break;}
case 4:{
const v1437=0n;
const v1435=(a0.a[0])===(v1437);
let v1434;if(v1435){
let v1438;switch(a0.a[1].c){
case 0:{
const v1441=__nullaryNode(0);
const v1440=__node(0,[v1441]);
v1438=v1440;break;}
case 1:{
const v1443=__nullaryNode(0);
const v1442=__node(0,[v1443]);
v1438=v1442;break;}
case 2:{
const v1445=__nullaryNode(0);
const v1444=__node(0,[v1445]);
v1438=v1444;break;}
case 3:{
let v1446;switch(a0.a[1].a[1].c){
case 0:{
const v1449=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v1448=__node(0,[v1449]);
v1446=v1448;break;}
case 1:{
const v1452=__nullaryNode(0);
const v1451=__node(0,[v1452]);
v1446=v1451;break;}
case 2:{
const v1454=__nullaryNode(0);
const v1453=__node(0,[v1454]);
v1446=v1453;break;}
case 3:{
const v1456=__nullaryNode(0);
const v1455=__node(0,[v1456]);
v1446=v1455;break;}
case 4:{
const v1458=__nullaryNode(0);
const v1457=__node(0,[v1458]);
v1446=v1457;break;}
default:throw Error('literal constructor projection');}
v1438=v1446;break;}
case 4:{
const v1460=__nullaryNode(0);
const v1459=__node(0,[v1460]);
v1438=v1459;break;}
default:throw Error('literal constructor projection');}
v1434=v1438;}else{
const v1462=__nullaryNode(0);
const v1461=__node(0,[v1462]);
v1434=v1461;}
v1424=v1434;break;}
default:throw Error('literal constructor projection');}
return v1424;}
function dFast_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v0=dFast_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0,a1);
return v0;}finally{__directDepth--;}}
function dFast_0ece595a937fc883aae5d90e31f204e9ccde30c7280a22873bac4482408934e0(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v5=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v7=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v4=(v5)<(v7);
let v3;if(v4){
let v9;switch(a1.c){
case 0:{
const v13=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v11=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v13);
v9=v11;break;}
case 1:{
const v18=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v16=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v18);
v9=v16;break;}
case 2:{
const v22=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1.a[0]);
const v25=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1.a[1],a2);
const v21=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v22,v25);
v9=v21;break;}
default:throw Error('literal constructor projection');}
v3=v9;}else{
const v30=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1,a2);
const v28=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,v30);
v3=v28;}
return v3;}finally{__directDepth--;}}
function dFast_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v37=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v35=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v37);
const v40=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v39=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v40,a1);
const v34=(v35)||(v39);
let v33;if(v34){
const v43=__nullaryNode(0);
v33=v43;}else{
let v44;switch(a0.c){
case 0:{
const v46=__nullaryNode(0);
v44=v46;break;}
case 1:{
const v48=dFast_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v47;if(v48){
const v51=__node(1,[a0.a[1]]);
v47=v51;}else{
const v53=__nullaryNode(0);
v47=v53;}
v44=v47;break;}
case 2:{
const v55=dFast_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a1);
const v58=dFast_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[1],a1);
const v54=d_22a54945b4301bfe87326de6b8f6e586502d061cf23225c609be2bf3e1be5447(v55,v58);
v44=v54;break;}
default:throw Error('literal constructor projection');}
v33=v44;}
return v33;}finally{__directDepth--;}}
function dFast_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v61;switch(a0.c){
case 0:{
const v64=dFast_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0.a[0]);
const v63=__node(0,[v64]);
v61=v63;break;}
default:throw Error('literal constructor projection');}
return v61;}finally{__directDepth--;}}
function dFast_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v66;switch(a0.c){
case 0:{
const v68=0n;
v66=v68;break;}
case 1:{
const v71=dFast_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(a0.a[1]);
const v69=BigInt.asUintN(64,(a0.a[0])+(v71));
v66=v69;break;}
default:throw Error('literal constructor projection');}
return v66;}finally{__directDepth--;}}
function dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v73;switch(a0.c){
case 0:{
const v75=__nullaryNode(0);
v73=v75;break;}
case 1:{
const v76=__nullaryNode(0);
v73=v76;break;}
case 2:{
const v77=__nullaryNode(0);
v73=v77;break;}
case 3:{
const v78=__nullaryNode(0);
v73=v78;break;}
case 4:{
const v82=0n;
const v80=(a0.a[0])===(v82);
let v79;if(v80){
let v83;switch(a0.a[1].c){
case 0:{
const v85=__nullaryNode(0);
v83=v85;break;}
case 1:{
const v86=__nullaryNode(0);
v83=v86;break;}
case 2:{
const v87=__nullaryNode(0);
v83=v87;break;}
case 3:{
const v88=__nullaryNode(0);
v83=v88;break;}
case 4:{
const v89=__nullaryNode(0);
v83=v89;break;}
default:throw Error('literal constructor projection');}
v79=v83;}else{
const v93=1n;
const v91=(a0.a[0])===(v93);
let v90;if(v91){
let v94;switch(a0.a[1].c){
case 0:{
const v96=__nullaryNode(0);
v94=v96;break;}
case 1:{
const v97=__nullaryNode(0);
v94=v97;break;}
case 2:{
const v98=__nullaryNode(0);
v94=v98;break;}
case 3:{
let v99;switch(a0.a[1].a[1].c){
case 0:{
const v101=__nullaryNode(0);
v99=v101;break;}
case 1:{
const v102=__nullaryNode(0);
v99=v102;break;}
case 2:{
const v103=__nullaryNode(0);
v99=v103;break;}
case 3:{
let v104;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v107=d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0.a[1].a[0]);
const v109=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[1].a[0]);
const v106=__node(1,[v107,v109]);
v104=v106;break;}
case 1:{
const v111=__nullaryNode(0);
v104=v111;break;}
case 2:{
const v112=__nullaryNode(0);
v104=v112;break;}
case 3:{
const v113=__nullaryNode(0);
v104=v113;break;}
case 4:{
const v114=__nullaryNode(0);
v104=v114;break;}
default:throw Error('literal constructor projection');}
v99=v104;break;}
case 4:{
const v115=__nullaryNode(0);
v99=v115;break;}
default:throw Error('literal constructor projection');}
v94=v99;break;}
case 4:{
const v116=__nullaryNode(0);
v94=v116;break;}
default:throw Error('literal constructor projection');}
v90=v94;}else{
const v117=__nullaryNode(0);
v90=v117;}
v79=v90;}
v73=v79;break;}
default:throw Error('literal constructor projection');}
return v73;}finally{__directDepth--;}}
function dFast_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(a0,a1,a2,a3,a4){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v118;switch(a0.c){
case 0:{
let v120;if(a4){
const v124=__nullaryNode(0);
const v123=__node(1,[v124]);
const v125=false;
const v127=__node(0,[a0.a[0]]);
const v129=__nullaryNode(0);
const v122=__node(0,[v123,v125,a1,v127,v129]);
v120=v122;}else{
const v133=18446744073709551615n;
const v131=(a1)===(v133);
let v130;if(v131){
const v135=1n;
const v137=__node(0,[a0.a[0]]);
const v134=__node(1,[v135,a1,v137]);
v130=v134;}else{
const v141=__nullaryNode(0);
const v140=__node(0,[v141]);
const v142=true;
const v145=1n;
const v143=BigInt.asUintN(64,(a1)+(v145));
const v149=dFast_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a2);
let v148;switch(v149.c){
case 0:{
const v152=false;
v148=v152;break;}
case 1:{
const v153=true;
v148=v153;break;}
default:throw Error('literal constructor projection');}
let v147;if(v148){
const v154=dFast_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[0],a2,a3);
v147=v154;}else{
const v158=dFast_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[0],a2,a3);
v147=v158;}
const v146=__node(0,[v147]);
let v164;switch(a3.c){
case 0:{
v164=a3.a[0];break;}
default:throw Error('literal constructor projection');}
const v163=__node(0,[v164]);
const v167=__nullaryNode(0);
const v162=__node(1,[v163,v167]);
const v139=__node(0,[v140,v142,v143,v146,v162]);
v130=v139;}
v120=v130;}
v118=v120;break;}
default:throw Error('literal constructor projection');}
return v118;}finally{__directDepth--;}}
function dFast_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v168;switch(a0.c){
case 0:{
let v170;if(a3){
const v174=__nullaryNode(0);
const v173=__node(1,[v174]);
const v175=false;
const v177=__node(0,[a0.a[0]]);
const v179=__nullaryNode(0);
const v172=__node(0,[v173,v175,a1,v177,v179]);
v170=v172;}else{
const v183=18446744073709551615n;
const v181=(a1)===(v183);
let v180;if(v181){
const v185=1n;
const v187=__node(0,[a0.a[0]]);
const v184=__node(1,[v185,a1,v187]);
v180=v184;}else{
const v191=__nullaryNode(0);
const v190=__node(0,[v191]);
const v192=true;
const v195=1n;
const v193=BigInt.asUintN(64,(a1)+(v195));
const v197=dFast_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[0],a2);
const v196=__node(0,[v197]);
const v202=0n;
const v201=__node(0,[v202]);
const v203=__nullaryNode(0);
const v200=__node(1,[v201,v203]);
const v189=__node(0,[v190,v192,v193,v196,v200]);
v180=v189;}
v170=v180;}
v168=v170;break;}
default:throw Error('literal constructor projection');}
return v168;}finally{__directDepth--;}}
function dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v204;switch(a0.c){
case 0:{
const v206=__nullaryNode(0);
v204=v206;break;}
case 1:{
const v207=__nullaryNode(0);
v204=v207;break;}
case 2:{
const v208=__nullaryNode(0);
v204=v208;break;}
case 3:{
const v209=__nullaryNode(0);
v204=v209;break;}
case 4:{
const v213=0n;
const v211=(a0.a[0])===(v213);
let v210;if(v211){
let v214;switch(a0.a[1].c){
case 0:{
const v216=__nullaryNode(0);
v214=v216;break;}
case 1:{
const v217=__nullaryNode(0);
v214=v217;break;}
case 2:{
const v218=__nullaryNode(0);
v214=v218;break;}
case 3:{
const v219=__nullaryNode(0);
v214=v219;break;}
case 4:{
const v220=__nullaryNode(0);
v214=v220;break;}
default:throw Error('literal constructor projection');}
v210=v214;}else{
const v224=1n;
const v222=(a0.a[0])===(v224);
let v221;if(v222){
let v225;switch(a0.a[1].c){
case 0:{
const v227=__nullaryNode(0);
v225=v227;break;}
case 1:{
const v228=__nullaryNode(0);
v225=v228;break;}
case 2:{
const v229=__nullaryNode(0);
v225=v229;break;}
case 3:{
let v230;switch(a0.a[1].a[1].c){
case 0:{
const v232=__nullaryNode(0);
v230=v232;break;}
case 1:{
const v233=__nullaryNode(0);
v230=v233;break;}
case 2:{
const v234=__nullaryNode(0);
v230=v234;break;}
case 3:{
let v235;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v239=dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0.a[1].a[1].a[0]);
const v237=__node(1,[a0.a[1].a[0],v239]);
v235=v237;break;}
case 1:{
const v241=__nullaryNode(0);
v235=v241;break;}
case 2:{
const v242=__nullaryNode(0);
v235=v242;break;}
case 3:{
const v243=__nullaryNode(0);
v235=v243;break;}
case 4:{
const v244=__nullaryNode(0);
v235=v244;break;}
default:throw Error('literal constructor projection');}
v230=v235;break;}
case 4:{
const v245=__nullaryNode(0);
v230=v245;break;}
default:throw Error('literal constructor projection');}
v225=v230;break;}
case 4:{
const v246=__nullaryNode(0);
v225=v246;break;}
default:throw Error('literal constructor projection');}
v221=v225;}else{
const v247=__nullaryNode(0);
v221=v247;}
v210=v221;}
v204=v210;break;}
default:throw Error('literal constructor projection');}
return v204;}finally{__directDepth--;}}
function dFast_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v248;switch(a0.c){
case 0:{
const v251=0n;
const v253=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v255=__nullaryNode(0);
const v252=__node(3,[v253,v255]);
const v250=__node(4,[v251,v252]);
v248=v250;break;}
default:throw Error('literal constructor projection');}
return v248;}finally{__directDepth--;}}
function dFast_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v256;switch(a0.c){
case 0:{
const v258=__nullaryNode(0);
v256=v258;break;}
case 1:{
const v262=__nullaryNode(0);
const v259=__node(1,[a0.a[0],a0.a[1],v262]);
v256=v259;break;}
case 2:{
const v264=dFast_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[0]);
const v266=dFast_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[1]);
const v263=dFast_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(v264,v266);
v256=v263;break;}
default:throw Error('literal constructor projection');}
return v256;}finally{__directDepth--;}}
function dFast_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v268;switch(a0.c){
case 0:{
const v271=0n;
const v273=d_7d350b8c08d443785fb7708635e000d6ac98f2ec18aa5b162a96f36235b83f47(a0.a[0]);
const v275=__nullaryNode(0);
const v272=__node(3,[v273,v275]);
const v270=__node(4,[v271,v272]);
v268=v270;break;}
case 1:{
const v277=1n;
const v279=dFast_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0.a[0]);
const v281=__nullaryNode(0);
const v278=__node(3,[v279,v281]);
const v276=__node(4,[v277,v278]);
v268=v276;break;}
default:throw Error('literal constructor projection');}
return v268;}finally{__directDepth--;}}
function dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v284=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v287=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v289=1n;
const v286=BigInt.asUintN(64,(v287)+(v289));
const v283=(v284)>(v286);
let v282;if(v283){
const v290=dFast_df61cd3826494889da2a704dc5d91ee794b4499d1ae7f97cb94445d06016d531(a0,a1);
v282=v290;}else{
const v293=dFast_b8817607f4fc8a3d4a760799a5583b58d6bbde93ed906aee863c4d0edcf1dc32(a0,a1);
v282=v293;}
return v282;}finally{__directDepth--;}}
function dFast_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v296;switch(a0.c){
case 0:{
const v299=dFast_10b05b30c6994dc0ec04df5318b9a98f4f07b9587f2551d2c4f4eac3465aa940(a0.a[0],a2);
const v302=false;
const v304=__node(0,[a0.a[0]]);
const v306=__nullaryNode(0);
const v298=__node(0,[v299,v302,a1,v304,v306]);
v296=v298;break;}
default:throw Error('literal constructor projection');}
return v296;}finally{__directDepth--;}}
function dFast_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v307;switch(a0.c){
case 0:{
const v310=__nullaryNode(0);
const v309=__node(0,[v310]);
v307=v309;break;}
case 1:{
const v312=__nullaryNode(0);
const v311=__node(0,[v312]);
v307=v311;break;}
case 2:{
const v314=__nullaryNode(0);
const v313=__node(0,[v314]);
v307=v313;break;}
case 3:{
const v316=__nullaryNode(0);
const v315=__node(0,[v316]);
v307=v315;break;}
case 4:{
const v320=0n;
const v318=(a0.a[0])===(v320);
let v317;if(v318){
let v321;switch(a0.a[1].c){
case 0:{
const v324=__nullaryNode(0);
const v323=__node(0,[v324]);
v321=v323;break;}
case 1:{
const v326=__nullaryNode(0);
const v325=__node(0,[v326]);
v321=v325;break;}
case 2:{
const v328=__nullaryNode(0);
const v327=__node(0,[v328]);
v321=v327;break;}
case 3:{
let v329;switch(a0.a[1].a[1].c){
case 0:{
const v332=d_6cce05b519648ff4045eb3424833f6d16bf0753974a6bf0872594ce55e3a9196(a0.a[1].a[0]);
const v331=__node(0,[v332]);
v329=v331;break;}
case 1:{
const v335=__nullaryNode(0);
const v334=__node(0,[v335]);
v329=v334;break;}
case 2:{
const v337=__nullaryNode(0);
const v336=__node(0,[v337]);
v329=v336;break;}
case 3:{
const v339=__nullaryNode(0);
const v338=__node(0,[v339]);
v329=v338;break;}
case 4:{
const v341=__nullaryNode(0);
const v340=__node(0,[v341]);
v329=v340;break;}
default:throw Error('literal constructor projection');}
v321=v329;break;}
case 4:{
const v343=__nullaryNode(0);
const v342=__node(0,[v343]);
v321=v342;break;}
default:throw Error('literal constructor projection');}
v317=v321;}else{
const v347=1n;
const v345=(a0.a[0])===(v347);
let v344;if(v345){
let v348;switch(a0.a[1].c){
case 0:{
const v351=__nullaryNode(0);
const v350=__node(0,[v351]);
v348=v350;break;}
case 1:{
const v353=__nullaryNode(0);
const v352=__node(0,[v353]);
v348=v352;break;}
case 2:{
const v355=__nullaryNode(0);
const v354=__node(0,[v355]);
v348=v354;break;}
case 3:{
let v356;switch(a0.a[1].a[1].c){
case 0:{
const v359=dFast_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0.a[1].a[0]);
const v358=__node(1,[v359]);
v356=v358;break;}
case 1:{
const v362=__nullaryNode(0);
const v361=__node(0,[v362]);
v356=v361;break;}
case 2:{
const v364=__nullaryNode(0);
const v363=__node(0,[v364]);
v356=v363;break;}
case 3:{
const v366=__nullaryNode(0);
const v365=__node(0,[v366]);
v356=v365;break;}
case 4:{
const v368=__nullaryNode(0);
const v367=__node(0,[v368]);
v356=v367;break;}
default:throw Error('literal constructor projection');}
v348=v356;break;}
case 4:{
const v370=__nullaryNode(0);
const v369=__node(0,[v370]);
v348=v369;break;}
default:throw Error('literal constructor projection');}
v344=v348;}else{
const v372=__nullaryNode(0);
const v371=__node(0,[v372]);
v344=v371;}
v317=v344;}
v307=v317;break;}
default:throw Error('literal constructor projection');}
return v307;}finally{__directDepth--;}}
function dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v373;switch(a0.c){
case 0:{
const v376=0n;
const v377=__nullaryNode(0);
const v375=__node(4,[v376,v377]);
v373=v375;break;}
case 1:{
const v379=1n;
const v381=d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0.a[0]);
const v384=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[1]);
const v386=__nullaryNode(0);
const v383=__node(3,[v384,v386]);
const v380=__node(3,[v381,v383]);
const v378=__node(4,[v379,v380]);
v373=v378;break;}
default:throw Error('literal constructor projection');}
return v373;}finally{__directDepth--;}}
function dFast_48821efa17660c75b83b8fae2e9d5b65c8e5087079595e29c181b42255a4c2e9(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v394=__nullaryNode(0);
const v391=__node(1,[a0,a1,v394]);
const v390=dFast_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(v391);
const v389=dFast_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(v390);
const v388=dFast_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(v389);
const v387=dFast_1998b7479f4920a51c23a648e448cee6e67b2e9a5a3ff257f53d2d3b746f8e90(v388);
return v387;}finally{__directDepth--;}}
function dFast_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v395;switch(a0.c){
case 0:{
const v397=__nullaryNode(0);
v395=v397;break;}
case 1:{
const v400=dFast_4d8670ea4a931e6a2490ad1c330feeca6deef0dee64a6fa9f8ea6b16ad401acd(a0.a[2]);
const v398=__node(1,[a0.a[1],v400]);
v395=v398;break;}
default:throw Error('literal constructor projection');}
return v395;}finally{__directDepth--;}}
function dFast_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v402;switch(a0.c){
case 0:{
const v405=0n;
const v407=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v409=__nullaryNode(0);
const v406=__node(3,[v407,v409]);
const v404=__node(4,[v405,v406]);
v402=v404;break;}
default:throw Error('literal constructor projection');}
return v402;}finally{__directDepth--;}}
function dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v410;switch(a0.c){
case 0:{
const v413=0n;
const v414=__nullaryNode(0);
const v412=__node(4,[v413,v414]);
v410=v412;break;}
case 1:{
const v416=1n;
const v420=dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0.a[1]);
const v422=__nullaryNode(0);
const v419=__node(3,[v420,v422]);
const v417=__node(3,[a0.a[0],v419]);
const v415=__node(4,[v416,v417]);
v410=v415;break;}
default:throw Error('literal constructor projection');}
return v410;}finally{__directDepth--;}}
function dFast_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v423;switch(a0.c){
case 0:{
let v428;switch(a0.a[0].c){
case 0:{
const v431=0n;
const v430=__node(0,[v431]);
v428=v430;break;}
case 1:{
const v432=dFast_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0.a[0].a[0],a0.a[0].a[1]);
v428=v432;break;}
case 2:{
v428=a0.a[0].a[4];break;}
default:throw Error('literal constructor projection');}
const v427=d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(v428);
const v436=4294967295n;
const v426=BigInt.asUintN(64,(v427)&(v436));
const v437=false;
const v439=__node(0,[a0.a[0]]);
const v441=__nullaryNode(0);
const v425=__node(0,[v426,v437,a1,v439,v441]);
v423=v425;break;}
default:throw Error('literal constructor projection');}
return v423;}finally{__directDepth--;}}
function dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v442;switch(a0.c){
case 0:{
const v444=__nullaryNode(0);
v442=v444;break;}
case 1:{
const v445=__nullaryNode(0);
v442=v445;break;}
case 2:{
const v446=__nullaryNode(0);
v442=v446;break;}
case 3:{
const v447=__nullaryNode(0);
v442=v447;break;}
case 4:{
const v451=0n;
const v449=(a0.a[0])===(v451);
let v448;if(v449){
let v452;switch(a0.a[1].c){
case 0:{
const v454=__nullaryNode(0);
v452=v454;break;}
case 1:{
const v455=__nullaryNode(0);
v452=v455;break;}
case 2:{
const v456=__nullaryNode(0);
v452=v456;break;}
case 3:{
const v457=__nullaryNode(0);
v452=v457;break;}
case 4:{
const v458=__nullaryNode(0);
v452=v458;break;}
default:throw Error('literal constructor projection');}
v448=v452;}else{
const v462=1n;
const v460=(a0.a[0])===(v462);
let v459;if(v460){
let v463;switch(a0.a[1].c){
case 0:{
const v465=__nullaryNode(0);
v463=v465;break;}
case 1:{
const v466=__nullaryNode(0);
v463=v466;break;}
case 2:{
const v467=__nullaryNode(0);
v463=v467;break;}
case 3:{
let v468;switch(a0.a[1].a[1].c){
case 0:{
const v470=__nullaryNode(0);
v468=v470;break;}
case 1:{
const v471=__nullaryNode(0);
v468=v471;break;}
case 2:{
const v472=__nullaryNode(0);
v468=v472;break;}
case 3:{
let v473;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v477=dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0.a[1].a[1].a[0]);
const v475=__node(1,[a0.a[1].a[0],v477]);
v473=v475;break;}
case 1:{
const v479=__nullaryNode(0);
v473=v479;break;}
case 2:{
const v480=__nullaryNode(0);
v473=v480;break;}
case 3:{
const v481=__nullaryNode(0);
v473=v481;break;}
case 4:{
const v482=__nullaryNode(0);
v473=v482;break;}
default:throw Error('literal constructor projection');}
v468=v473;break;}
case 4:{
const v483=__nullaryNode(0);
v468=v483;break;}
default:throw Error('literal constructor projection');}
v463=v468;break;}
case 4:{
const v484=__nullaryNode(0);
v463=v484;break;}
default:throw Error('literal constructor projection');}
v459=v463;}else{
const v485=__nullaryNode(0);
v459=v485;}
v448=v459;}
v442=v448;break;}
default:throw Error('literal constructor projection');}
return v442;}finally{__directDepth--;}}
function dFast_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v486;switch(a0.c){
case 0:{
const v489=0n;
const v491=dFast_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0.a[0]);
const v493=__nullaryNode(0);
const v490=__node(3,[v491,v493]);
const v488=__node(4,[v489,v490]);
v486=v488;break;}
case 1:{
const v495=1n;
const v497=d_592acf05bc6244571b512a48306f8a1b591096b3ac05f3e5f707eb8831cb0030(a0.a[0]);
const v499=__nullaryNode(0);
const v496=__node(3,[v497,v499]);
const v494=__node(4,[v495,v496]);
v486=v494;break;}
default:throw Error('literal constructor projection');}
return v486;}finally{__directDepth--;}}
function dFast_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v504=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v502=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v504);
const v507=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v506=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v507,a1);
const v501=(v502)||(v506);
let v500;if(v501){
v500=a0;}else{
let v511;switch(a0.c){
case 0:{
const v513=__nullaryNode(0);
v511=v513;break;}
case 1:{
const v515=dFast_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v514;if(v515){
const v518=__node(1,[a0.a[0],a2]);
v514=v518;}else{
const v521=__node(1,[a0.a[0],a0.a[1]]);
v514=v521;}
v511=v514;break;}
case 2:{
const v525=dFast_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[0],a1,a2);
const v529=dFast_719c56a9f115236fdd91513eb5bbb783dc301e86c16fc5259051e778952984d7(a0.a[1],a1,a2);
const v524=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v525,v529);
v511=v524;break;}
default:throw Error('literal constructor projection');}
v500=v511;}
return v500;}finally{__directDepth--;}}
function dFast_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v533;switch(a0.c){
case 0:{
let v535;switch(a1.c){
case 0:{
const v537=true;
v535=v537;break;}
case 1:{
const v538=false;
v535=v538;break;}
default:throw Error('literal constructor projection');}
v533=v535;break;}
case 1:{
let v539;switch(a1.c){
case 0:{
const v541=false;
v539=v541;break;}
case 1:{
const v543=(a0.a[0])===(a1.a[0]);
let v542;if(v543){
const v547=dFast_7677a2aae87159948c5a5348ad3d8b2abeada094d525816137826d0b4c0f43b5(a0.a[1],a1.a[1]);
let v546;if(v547){
const v550=true;
v546=v550;}else{
const v551=false;
v546=v551;}
v542=v546;}else{
const v552=false;
v542=v552;}
v539=v542;break;}
default:throw Error('literal constructor projection');}
v533=v539;break;}
default:throw Error('literal constructor projection');}
return v533;}finally{__directDepth--;}}
function dFast_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v553;switch(a0.c){
case 0:{
let v555;switch(a1.c){
case 0:{
const v557=false;
v555=v557;break;}
case 1:{
const v558=true;
v555=v558;break;}
default:throw Error('literal constructor projection');}
v553=v555;break;}
case 1:{
let v559;switch(a1.c){
case 0:{
const v561=false;
v559=v561;break;}
case 1:{
const v563=(a0.a[0])===(a1.a[0]);
let v562;if(v563){
const v566=dFast_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0.a[1],a1.a[1]);
v562=v566;}else{
const v569=(a0.a[0])<(a1.a[0]);
v562=v569;}
v559=v562;break;}
default:throw Error('literal constructor projection');}
v553=v559;break;}
default:throw Error('literal constructor projection');}
return v553;}finally{__directDepth--;}}
function dFast_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v572;switch(a0.c){
case 0:{
const v575=0n;
const v574=__node(0,[v575]);
v572=v574;break;}
case 1:{
const v576=dFast_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0.a[0],a0.a[1]);
v572=v576;break;}
case 2:{
v572=a0.a[4];break;}
default:throw Error('literal constructor projection');}
return v572;}finally{__directDepth--;}}
function dFast_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v584=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v582=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v584);
const v587=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v586=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v587,a1);
const v581=(v582)||(v586);
let v580;if(v581){
v580=a0;}else{
let v591;switch(a0.c){
case 0:{
const v593=__nullaryNode(0);
v591=v593;break;}
case 1:{
const v595=dFast_08c47d3c338c7d98770f501c59e653e64881e065e117f7871cfd32a64e54386e(a1,a0.a[0]);
let v594;if(v595){
const v598=__nullaryNode(0);
v594=v598;}else{
const v599=__node(1,[a0.a[0],a0.a[1]]);
v594=v599;}
v591=v594;break;}
case 2:{
const v603=dFast_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[0],a1);
const v606=dFast_934e30e4b87c8277c491a87bc6ee5b7babadcbc52086acdd028ed82b5cb11773(a0.a[1],a1);
const v602=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v603,v606);
v591=v602;break;}
default:throw Error('literal constructor projection');}
v580=v591;}
return v580;}finally{__directDepth--;}}
function dFast_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v609;switch(a0.c){
case 0:{
v609=a1;break;}
case 1:{
const v615=dFast_955d4ba13cb469d4bc5e0aeac46f6194e157aafc4ab3429f6d2ed8b1465185d7(a0.a[2],a1);
const v612=__node(1,[a0.a[0],a0.a[1],v615]);
v609=v612;break;}
default:throw Error('literal constructor projection');}
return v609;}finally{__directDepth--;}}
function dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v623=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
const v625=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a1);
const v622=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v623,v625);
let v621;if(v622){
const v627=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a0);
v621=v627;}else{
const v629=d_7f9b7d03b3963b5863bc07b924cd088ac4dc020b5f714a4817bee9b48c983e1b(a1);
v621=v629;}
const v633=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
const v635=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a1);
const v632=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(v633,v635);
let v631;if(v632){
const v637=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a1);
v631=v637;}else{
const v639=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0);
v631=v639;}
const v642=dFast_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a0);
const v644=dFast_7f22306aa0784b6b3ee9886182aca23c82b24c8b4ec1f491bcfffde511b36d67(a1);
const v641=d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(v642,v644);
const v647=d_41afa6d4ad63db4772d16e42df9c45d282a27b65cd44f4d1478c4d2b583a1746(a0);
const v649=d_41afa6d4ad63db4772d16e42df9c45d282a27b65cd44f4d1478c4d2b583a1746(a1);
const v646=BigInt.asUintN(64,(v647)+(v649));
const v654=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v656=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v653=(v654)<(v656);
let v652;if(v653){
const v658=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
v652=v658;}else{
const v660=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
v652=v660;}
const v662=1n;
const v651=BigInt.asUintN(64,(v652)+(v662));
const v618=__node(2,[a0,a1,v621,v631,v641,v646,v651]);
return v618;}finally{__directDepth--;}}
function dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v663;switch(a0.c){
case 0:{
const v666=0n;
const v667=__nullaryNode(0);
const v665=__node(4,[v666,v667]);
v663=v665;break;}
case 1:{
const v669=1n;
const v673=dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0.a[1]);
const v675=__nullaryNode(0);
const v672=__node(3,[v673,v675]);
const v670=__node(3,[a0.a[0],v672]);
const v668=__node(4,[v669,v670]);
v663=v668;break;}
default:throw Error('literal constructor projection');}
return v663;}finally{__directDepth--;}}
function dFast_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v676;switch(a0.c){
case 0:{
const v678=__node(1,[a1,a2]);
v676=v678;break;}
case 1:{
const v682=__node(1,[a1,a2]);
const v685=__node(1,[a0.a[0],a0.a[1]]);
const v681=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v682,v685);
v676=v681;break;}
case 2:{
const v689=dFast_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(a0.a[0],a1,a2);
const v688=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v689,a0.a[1]);
v676=v688;break;}
default:throw Error('literal constructor projection');}
return v676;}finally{__directDepth--;}}
function dFast_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v694;switch(a0.c){
case 0:{
const v697=dFast_342c7b0c0877e6367a8ff9869b89279e008fe2b837e30b03c513ea86b511fb79(a0.a[0]);
const v696=__node(0,[v697]);
v694=v696;break;}
default:throw Error('literal constructor projection');}
return v694;}finally{__directDepth--;}}
function dFast_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v699;switch(a0.c){
case 0:{
const v702=__nullaryNode(0);
const v701=__node(0,[v702]);
v699=v701;break;}
case 1:{
const v704=__nullaryNode(0);
const v703=__node(0,[v704]);
v699=v703;break;}
case 2:{
const v706=__nullaryNode(0);
const v705=__node(0,[v706]);
v699=v705;break;}
case 3:{
const v708=__nullaryNode(0);
const v707=__node(0,[v708]);
v699=v707;break;}
case 4:{
const v712=0n;
const v710=(a0.a[0])===(v712);
let v709;if(v710){
let v713;switch(a0.a[1].c){
case 0:{
const v716=__nullaryNode(0);
const v715=__node(0,[v716]);
v713=v715;break;}
case 1:{
const v718=__nullaryNode(0);
const v717=__node(0,[v718]);
v713=v717;break;}
case 2:{
const v720=__nullaryNode(0);
const v719=__node(0,[v720]);
v713=v719;break;}
case 3:{
let v721;switch(a0.a[1].a[1].c){
case 0:{
const v724=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v723=__node(0,[v724]);
v721=v723;break;}
case 1:{
const v727=__nullaryNode(0);
const v726=__node(0,[v727]);
v721=v726;break;}
case 2:{
const v729=__nullaryNode(0);
const v728=__node(0,[v729]);
v721=v728;break;}
case 3:{
const v731=__nullaryNode(0);
const v730=__node(0,[v731]);
v721=v730;break;}
case 4:{
const v733=__nullaryNode(0);
const v732=__node(0,[v733]);
v721=v732;break;}
default:throw Error('literal constructor projection');}
v713=v721;break;}
case 4:{
const v735=__nullaryNode(0);
const v734=__node(0,[v735]);
v713=v734;break;}
default:throw Error('literal constructor projection');}
v709=v713;}else{
const v737=__nullaryNode(0);
const v736=__node(0,[v737]);
v709=v736;}
v699=v709;break;}
default:throw Error('literal constructor projection');}
return v699;}finally{__directDepth--;}}
function dFast_b8817607f4fc8a3d4a760799a5583b58d6bbde93ed906aee863c4d0edcf1dc32(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v740=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v743=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v745=1n;
const v742=BigInt.asUintN(64,(v743)+(v745));
const v739=(v740)>(v742);
let v738;if(v739){
let v746;switch(a1.c){
case 0:{
const v748=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v746=v748;break;}
case 1:{
const v751=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v746=v751;break;}
case 2:{
const v754=dFast_f151aef50c337baa7a11990528cd1ef22ee578846f477ccfb3bd115b4ac69d47(a0,a1.a[0],a1.a[1]);
v746=v754;break;}
default:throw Error('literal constructor projection');}
v738=v746;}else{
const v758=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v738=v758;}
return v738;}finally{__directDepth--;}}
function dFast_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v761;switch(a0.c){
case 0:{
const v763=__nullaryNode(0);
v761=v763;break;}
case 1:{
let v765;switch(a0.a[0].c){
case 0:{
v765=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v768=dFast_bc5bbbb660d4e67685a4db4839120d22a071af32c5520999152e4916b67665eb(a0.a[1]);
const v764=__node(1,[v765,v768]);
v761=v764;break;}
default:throw Error('literal constructor projection');}
return v761;}finally{__directDepth--;}}
function dFast_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v770;switch(a0.c){
case 0:{
const v772=__node(1,[a1,a2]);
v770=v772;break;}
case 1:{
const v776=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,a0.a[0]);
let v775;if(v776){
const v780=__node(1,[a1,a2]);
const v783=__node(1,[a0.a[0],a0.a[1]]);
const v779=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v780,v783);
v775=v779;}else{
const v787=__node(1,[a0.a[0],a0.a[1]]);
const v790=__node(1,[a1,a2]);
const v786=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v787,v790);
v775=v786;}
v770=v775;break;}
case 2:{
const v796=d_7a541f2f7f106f1f9e19ffa7fa0b2136c1072da4ce10a842ad72fa3b545c7158(a0.a[0]);
const v794=dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a1,v796);
let v793;if(v794){
const v799=dFast_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[0],a1,a2);
const v798=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(v799,a0.a[1]);
v793=v798;}else{
const v806=dFast_d81aa100c860f0568fcc8d884e96ee57688d887bbefe6277df976134373e4fc7(a0.a[1],a1,a2);
const v804=dFast_35aa8ffd436d2bd00db7c80a782c358c25b5fb687b9b45420dcdcb2d34540fa3(a0.a[0],v806);
v793=v804;}
v770=v793;break;}
default:throw Error('literal constructor projection');}
return v770;}finally{__directDepth--;}}
function dFast_df61cd3826494889da2a704dc5d91ee794b4499d1ae7f97cb94445d06016d531(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v812=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a0);
const v815=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v817=1n;
const v814=BigInt.asUintN(64,(v815)+(v817));
const v811=(v812)>(v814);
let v810;if(v811){
let v818;switch(a0.c){
case 0:{
const v820=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v818=v820;break;}
case 1:{
const v823=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v818=v823;break;}
case 2:{
const v826=dFast_0ece595a937fc883aae5d90e31f204e9ccde30c7280a22873bac4482408934e0(a0.a[0],a0.a[1],a1);
v818=v826;break;}
default:throw Error('literal constructor projection');}
v810=v818;}else{
const v830=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
v810=v830;}
return v810;}finally{__directDepth--;}}
function dFast_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v833;switch(a0.c){
case 0:{
const v837=false;
const v836=__node(0,[v837]);
const v835=__node(0,[v836]);
v833=v835;break;}
case 1:{
const v840=false;
const v839=__node(0,[v840]);
const v838=__node(0,[v839]);
v833=v838;break;}
case 2:{
const v843=false;
const v842=__node(0,[v843]);
const v841=__node(0,[v842]);
v833=v841;break;}
case 3:{
const v846=false;
const v845=__node(0,[v846]);
const v844=__node(0,[v845]);
v833=v844;break;}
case 4:{
const v850=0n;
const v848=(a0.a[0])===(v850);
let v847;if(v848){
let v851;switch(a0.a[1].c){
case 0:{
const v855=false;
const v854=__node(0,[v855]);
const v853=__node(0,[v854]);
v851=v853;break;}
case 1:{
const v858=false;
const v857=__node(0,[v858]);
const v856=__node(0,[v857]);
v851=v856;break;}
case 2:{
const v861=false;
const v860=__node(0,[v861]);
const v859=__node(0,[v860]);
v851=v859;break;}
case 3:{
let v862;switch(a0.a[1].a[1].c){
case 0:{
const v865=d_7c626cb37b478498579f5a10f626efbc4235e3dbdd595bcd7fae8ed1c0c445c4(a0.a[1].a[0]);
const v864=__node(0,[v865]);
v862=v864;break;}
case 1:{
const v869=false;
const v868=__node(0,[v869]);
const v867=__node(0,[v868]);
v862=v867;break;}
case 2:{
const v872=false;
const v871=__node(0,[v872]);
const v870=__node(0,[v871]);
v862=v870;break;}
case 3:{
const v875=false;
const v874=__node(0,[v875]);
const v873=__node(0,[v874]);
v862=v873;break;}
case 4:{
const v878=false;
const v877=__node(0,[v878]);
const v876=__node(0,[v877]);
v862=v876;break;}
default:throw Error('literal constructor projection');}
v851=v862;break;}
case 4:{
const v881=false;
const v880=__node(0,[v881]);
const v879=__node(0,[v880]);
v851=v879;break;}
default:throw Error('literal constructor projection');}
v847=v851;}else{
const v885=1n;
const v883=(a0.a[0])===(v885);
let v882;if(v883){
let v886;switch(a0.a[1].c){
case 0:{
const v890=false;
const v889=__node(0,[v890]);
const v888=__node(0,[v889]);
v886=v888;break;}
case 1:{
const v893=false;
const v892=__node(0,[v893]);
const v891=__node(0,[v892]);
v886=v891;break;}
case 2:{
const v896=false;
const v895=__node(0,[v896]);
const v894=__node(0,[v895]);
v886=v894;break;}
case 3:{
let v897;switch(a0.a[1].a[1].c){
case 0:{
const v900=dFast_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0.a[1].a[0]);
const v899=__node(1,[v900]);
v897=v899;break;}
case 1:{
const v904=false;
const v903=__node(0,[v904]);
const v902=__node(0,[v903]);
v897=v902;break;}
case 2:{
const v907=false;
const v906=__node(0,[v907]);
const v905=__node(0,[v906]);
v897=v905;break;}
case 3:{
const v910=false;
const v909=__node(0,[v910]);
const v908=__node(0,[v909]);
v897=v908;break;}
case 4:{
const v913=false;
const v912=__node(0,[v913]);
const v911=__node(0,[v912]);
v897=v911;break;}
default:throw Error('literal constructor projection');}
v886=v897;break;}
case 4:{
const v916=false;
const v915=__node(0,[v916]);
const v914=__node(0,[v915]);
v886=v914;break;}
default:throw Error('literal constructor projection');}
v882=v886;}else{
const v919=false;
const v918=__node(0,[v919]);
const v917=__node(0,[v918]);
v882=v917;}
v847=v882;}
v833=v847;break;}
default:throw Error('literal constructor projection');}
return v833;}finally{__directDepth--;}}
function dFast_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v920;switch(a0.c){
case 0:{
const v922=__nullaryNode(0);
v920=v922;break;}
case 1:{
let v924;switch(a0.a[0].c){
case 0:{
v924=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v923;if(v924){
const v929=dFast_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0.a[1]);
const v927=__node(1,[a0.a[0],v929]);
v923=v927;}else{
const v931=dFast_e35ab19d18573af8fa2e7e0f4cc4a51dbfabff66663bb8e403af7afa216937df(a0.a[1]);
v923=v931;}
v920=v923;break;}
default:throw Error('literal constructor projection');}
return v920;}finally{__directDepth--;}}
function dFast_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v933;switch(a0.c){
case 0:{
const v937=__nullaryNode(0);
const v936=__node(0,[v937]);
const v935=__node(0,[v936]);
v933=v935;break;}
case 1:{
const v940=__nullaryNode(0);
const v939=__node(0,[v940]);
const v938=__node(0,[v939]);
v933=v938;break;}
case 2:{
const v943=__nullaryNode(0);
const v942=__node(0,[v943]);
const v941=__node(0,[v942]);
v933=v941;break;}
case 3:{
const v946=__nullaryNode(0);
const v945=__node(0,[v946]);
const v944=__node(0,[v945]);
v933=v944;break;}
case 4:{
const v950=0n;
const v948=(a0.a[0])===(v950);
let v947;if(v948){
let v951;switch(a0.a[1].c){
case 0:{
const v955=__nullaryNode(0);
const v954=__node(0,[v955]);
const v953=__node(0,[v954]);
v951=v953;break;}
case 1:{
const v958=__nullaryNode(0);
const v957=__node(0,[v958]);
const v956=__node(0,[v957]);
v951=v956;break;}
case 2:{
const v961=__nullaryNode(0);
const v960=__node(0,[v961]);
const v959=__node(0,[v960]);
v951=v959;break;}
case 3:{
let v962;switch(a0.a[1].a[1].c){
case 0:{
const v965=dFast_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0.a[1].a[0]);
const v964=__node(0,[v965]);
v962=v964;break;}
case 1:{
const v969=__nullaryNode(0);
const v968=__node(0,[v969]);
const v967=__node(0,[v968]);
v962=v967;break;}
case 2:{
const v972=__nullaryNode(0);
const v971=__node(0,[v972]);
const v970=__node(0,[v971]);
v962=v970;break;}
case 3:{
const v975=__nullaryNode(0);
const v974=__node(0,[v975]);
const v973=__node(0,[v974]);
v962=v973;break;}
case 4:{
const v978=__nullaryNode(0);
const v977=__node(0,[v978]);
const v976=__node(0,[v977]);
v962=v976;break;}
default:throw Error('literal constructor projection');}
v951=v962;break;}
case 4:{
const v981=__nullaryNode(0);
const v980=__node(0,[v981]);
const v979=__node(0,[v980]);
v951=v979;break;}
default:throw Error('literal constructor projection');}
v947=v951;}else{
const v985=1n;
const v983=(a0.a[0])===(v985);
let v982;if(v983){
let v986;switch(a0.a[1].c){
case 0:{
const v990=__nullaryNode(0);
const v989=__node(0,[v990]);
const v988=__node(0,[v989]);
v986=v988;break;}
case 1:{
const v993=__nullaryNode(0);
const v992=__node(0,[v993]);
const v991=__node(0,[v992]);
v986=v991;break;}
case 2:{
const v996=__nullaryNode(0);
const v995=__node(0,[v996]);
const v994=__node(0,[v995]);
v986=v994;break;}
case 3:{
let v997;switch(a0.a[1].a[1].c){
case 0:{
const v1000=d_d6bc4c53b80ad1f8905faecb76ff8d04f204371cbe91768017177bedd22fa703(a0.a[1].a[0]);
const v999=__node(1,[v1000]);
v997=v999;break;}
case 1:{
const v1004=__nullaryNode(0);
const v1003=__node(0,[v1004]);
const v1002=__node(0,[v1003]);
v997=v1002;break;}
case 2:{
const v1007=__nullaryNode(0);
const v1006=__node(0,[v1007]);
const v1005=__node(0,[v1006]);
v997=v1005;break;}
case 3:{
const v1010=__nullaryNode(0);
const v1009=__node(0,[v1010]);
const v1008=__node(0,[v1009]);
v997=v1008;break;}
case 4:{
const v1013=__nullaryNode(0);
const v1012=__node(0,[v1013]);
const v1011=__node(0,[v1012]);
v997=v1011;break;}
default:throw Error('literal constructor projection');}
v986=v997;break;}
case 4:{
const v1016=__nullaryNode(0);
const v1015=__node(0,[v1016]);
const v1014=__node(0,[v1015]);
v986=v1014;break;}
default:throw Error('literal constructor projection');}
v982=v986;}else{
const v1019=__nullaryNode(0);
const v1018=__node(0,[v1019]);
const v1017=__node(0,[v1018]);
v982=v1017;}
v947=v982;}
v933=v947;break;}
default:throw Error('literal constructor projection');}
return v933;}finally{__directDepth--;}}
function dFast_e9b513c35d01316480f9cd38dd147d14e6c78e4aac7d88b2b2ad5c66581143ab(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1021=dFast_48821efa17660c75b83b8fae2e9d5b65c8e5087079595e29c181b42255a4c2e9(a0,a1);
const v1020=__node(0,[v1021]);
return v1020;}finally{__directDepth--;}}
function dFast_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1024;switch(a0.c){
case 0:{
const v1027=0n;
const v1029=dFast_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0.a[0]);
const v1031=__nullaryNode(0);
const v1028=__node(3,[v1029,v1031]);
const v1026=__node(4,[v1027,v1028]);
v1024=v1026;break;}
case 1:{
const v1033=1n;
const v1035=dFast_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0.a[0]);
const v1037=__nullaryNode(0);
const v1034=__node(3,[v1035,v1037]);
const v1032=__node(4,[v1033,v1034]);
v1024=v1032;break;}
default:throw Error('literal constructor projection');}
return v1024;}finally{__directDepth--;}}
function dFast_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1038;switch(a0.c){
case 0:{
const v1041=0n;
const v1043=d_438a1790547cd2e8d3594d23bcb57445b0235f3c0b9a0d6e37ea8069f02ba71d(a0.a[0]);
const v1045=__nullaryNode(0);
const v1042=__node(3,[v1043,v1045]);
const v1040=__node(4,[v1041,v1042]);
v1038=v1040;break;}
case 1:{
const v1047=1n;
const v1049=dFast_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0.a[0]);
const v1051=__nullaryNode(0);
const v1048=__node(3,[v1049,v1051]);
const v1046=__node(4,[v1047,v1048]);
v1038=v1046;break;}
default:throw Error('literal constructor projection');}
return v1038;}finally{__directDepth--;}}
function dFast_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1052;switch(a0.c){
case 0:{
const v1056=__nullaryNode(0);
const v1055=__node(0,[v1056]);
const v1054=__node(0,[v1055]);
v1052=v1054;break;}
case 1:{
const v1059=__nullaryNode(0);
const v1058=__node(0,[v1059]);
const v1057=__node(0,[v1058]);
v1052=v1057;break;}
case 2:{
const v1062=__nullaryNode(0);
const v1061=__node(0,[v1062]);
const v1060=__node(0,[v1061]);
v1052=v1060;break;}
case 3:{
const v1065=__nullaryNode(0);
const v1064=__node(0,[v1065]);
const v1063=__node(0,[v1064]);
v1052=v1063;break;}
case 4:{
const v1069=0n;
const v1067=(a0.a[0])===(v1069);
let v1066;if(v1067){
let v1070;switch(a0.a[1].c){
case 0:{
const v1074=__nullaryNode(0);
const v1073=__node(0,[v1074]);
const v1072=__node(0,[v1073]);
v1070=v1072;break;}
case 1:{
const v1077=__nullaryNode(0);
const v1076=__node(0,[v1077]);
const v1075=__node(0,[v1076]);
v1070=v1075;break;}
case 2:{
const v1080=__nullaryNode(0);
const v1079=__node(0,[v1080]);
const v1078=__node(0,[v1079]);
v1070=v1078;break;}
case 3:{
let v1081;switch(a0.a[1].a[1].c){
case 0:{
const v1084=dFast_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0.a[1].a[0]);
const v1083=__node(0,[v1084]);
v1081=v1083;break;}
case 1:{
const v1088=__nullaryNode(0);
const v1087=__node(0,[v1088]);
const v1086=__node(0,[v1087]);
v1081=v1086;break;}
case 2:{
const v1091=__nullaryNode(0);
const v1090=__node(0,[v1091]);
const v1089=__node(0,[v1090]);
v1081=v1089;break;}
case 3:{
const v1094=__nullaryNode(0);
const v1093=__node(0,[v1094]);
const v1092=__node(0,[v1093]);
v1081=v1092;break;}
case 4:{
const v1097=__nullaryNode(0);
const v1096=__node(0,[v1097]);
const v1095=__node(0,[v1096]);
v1081=v1095;break;}
default:throw Error('literal constructor projection');}
v1070=v1081;break;}
case 4:{
const v1100=__nullaryNode(0);
const v1099=__node(0,[v1100]);
const v1098=__node(0,[v1099]);
v1070=v1098;break;}
default:throw Error('literal constructor projection');}
v1066=v1070;}else{
const v1104=1n;
const v1102=(a0.a[0])===(v1104);
let v1101;if(v1102){
let v1105;switch(a0.a[1].c){
case 0:{
const v1109=__nullaryNode(0);
const v1108=__node(0,[v1109]);
const v1107=__node(0,[v1108]);
v1105=v1107;break;}
case 1:{
const v1112=__nullaryNode(0);
const v1111=__node(0,[v1112]);
const v1110=__node(0,[v1111]);
v1105=v1110;break;}
case 2:{
const v1115=__nullaryNode(0);
const v1114=__node(0,[v1115]);
const v1113=__node(0,[v1114]);
v1105=v1113;break;}
case 3:{
let v1116;switch(a0.a[1].a[1].c){
case 0:{
const v1119=dFast_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0.a[1].a[0]);
const v1118=__node(1,[v1119]);
v1116=v1118;break;}
case 1:{
const v1123=__nullaryNode(0);
const v1122=__node(0,[v1123]);
const v1121=__node(0,[v1122]);
v1116=v1121;break;}
case 2:{
const v1126=__nullaryNode(0);
const v1125=__node(0,[v1126]);
const v1124=__node(0,[v1125]);
v1116=v1124;break;}
case 3:{
const v1129=__nullaryNode(0);
const v1128=__node(0,[v1129]);
const v1127=__node(0,[v1128]);
v1116=v1127;break;}
case 4:{
const v1132=__nullaryNode(0);
const v1131=__node(0,[v1132]);
const v1130=__node(0,[v1131]);
v1116=v1130;break;}
default:throw Error('literal constructor projection');}
v1105=v1116;break;}
case 4:{
const v1135=__nullaryNode(0);
const v1134=__node(0,[v1135]);
const v1133=__node(0,[v1134]);
v1105=v1133;break;}
default:throw Error('literal constructor projection');}
v1101=v1105;}else{
const v1138=__nullaryNode(0);
const v1137=__node(0,[v1138]);
const v1136=__node(0,[v1137]);
v1101=v1136;}
v1066=v1101;}
v1052=v1066;break;}
default:throw Error('literal constructor projection');}
return v1052;}finally{__directDepth--;}}
function dFast_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1139;switch(a0.c){
case 0:{
const v1141=__nullaryNode(0);
v1139=v1141;break;}
case 1:{
const v1143=dFast_f106a6ad8842d8b4783134f4c05edbf7ccdcf5bb61215be491af8cefeb936a48(a0.a[2]);
const v1142=dFast_a4ea3abb4ed22c9cabb20212914a1681a13fa9e8930f25b1a2afc5421ae99159(v1143,a0.a[0],a0.a[1]);
v1139=v1142;break;}
default:throw Error('literal constructor projection');}
return v1139;}finally{__directDepth--;}}
function dFast_f151aef50c337baa7a11990528cd1ef22ee578846f477ccfb3bd115b4ac69d47(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1149=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a2);
const v1151=d_0627888d4039634ee8cb951e7e1be512df84eccf5889b4a605bab4e76ef1b877(a1);
const v1148=(v1149)<(v1151);
let v1147;if(v1148){
let v1153;switch(a1.c){
case 0:{
const v1156=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1155=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1156,a2);
v1153=v1155;break;}
case 1:{
const v1161=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1160=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1161,a2);
v1153=v1160;break;}
case 2:{
const v1166=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1.a[0]);
const v1169=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a1.a[1],a2);
const v1165=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1166,v1169);
v1153=v1165;break;}
default:throw Error('literal constructor projection');}
v1147=v1153;}else{
const v1173=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(a0,a1);
const v1172=dFast_a3d66a208f5d98a0b8f21fdf04aaa41e4803aa649725137936546efe7376576e(v1173,a2);
v1147=v1172;}
return v1147;}finally{__directDepth--;}}
function dFast_f7e2bbf37a3cfb1a9ef9f764112fc20514c851bd97b994c4ed1588528b820375(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1177=dFast_7ce36e251f4c200563676c1b96b20922ce669b08b09e98440b27e0ec449e6d42(a0,a1);
return v1177;}finally{__directDepth--;}}
function dFast_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1180;switch(a0.c){
case 0:{
const v1183=__nullaryNode(0);
const v1182=__node(0,[v1183]);
v1180=v1182;break;}
case 1:{
const v1185=__nullaryNode(0);
const v1184=__node(0,[v1185]);
v1180=v1184;break;}
case 2:{
const v1187=__nullaryNode(0);
const v1186=__node(0,[v1187]);
v1180=v1186;break;}
case 3:{
const v1189=__nullaryNode(0);
const v1188=__node(0,[v1189]);
v1180=v1188;break;}
case 4:{
const v1193=0n;
const v1191=(a0.a[0])===(v1193);
let v1190;if(v1191){
let v1194;switch(a0.a[1].c){
case 0:{
const v1197=__nullaryNode(0);
const v1196=__node(0,[v1197]);
v1194=v1196;break;}
case 1:{
const v1199=__nullaryNode(0);
const v1198=__node(0,[v1199]);
v1194=v1198;break;}
case 2:{
const v1201=__nullaryNode(0);
const v1200=__node(0,[v1201]);
v1194=v1200;break;}
case 3:{
let v1202;switch(a0.a[1].a[1].c){
case 0:{
const v1205=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v1204=__node(0,[v1205]);
v1202=v1204;break;}
case 1:{
const v1208=__nullaryNode(0);
const v1207=__node(0,[v1208]);
v1202=v1207;break;}
case 2:{
const v1210=__nullaryNode(0);
const v1209=__node(0,[v1210]);
v1202=v1209;break;}
case 3:{
const v1212=__nullaryNode(0);
const v1211=__node(0,[v1212]);
v1202=v1211;break;}
case 4:{
const v1214=__nullaryNode(0);
const v1213=__node(0,[v1214]);
v1202=v1213;break;}
default:throw Error('literal constructor projection');}
v1194=v1202;break;}
case 4:{
const v1216=__nullaryNode(0);
const v1215=__node(0,[v1216]);
v1194=v1215;break;}
default:throw Error('literal constructor projection');}
v1190=v1194;}else{
const v1218=__nullaryNode(0);
const v1217=__node(0,[v1218]);
v1190=v1217;}
v1180=v1190;break;}
default:throw Error('literal constructor projection');}
return v1180;}finally{__directDepth--;}}
function f_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(a0){try{return dFast_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(a0));}}
function f_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(a0,a1,a2,a3,a4){try{return dFast_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(a0,a1,a2,a3,a4);}catch(error){if(error!==__deepCall)throw error;return __run(d_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(a0,a1,a2,a3,a4));}}
function f_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(a0,a1,a2,a3){try{return dFast_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(a0,a1,a2,a3));}}
function f_2c27ab81fd535da7b15c47b4f86e70d3e022e597d14150e679f4200b4a936caf(a0){return d_2c27ab81fd535da7b15c47b4f86e70d3e022e597d14150e679f4200b4a936caf(a0);}
function f_33b50e914daacaa87bef099914c13ede60a55a53922c8385278cebaadd341096(a0){return d_33b50e914daacaa87bef099914c13ede60a55a53922c8385278cebaadd341096(a0);}
function f_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(a0,a1,a2){try{return dFast_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(a0,a1,a2));}}
function f_581e8fb85867e31d4e92fc93ed0fce5ca6fad75cd034ce7f7d7973a22a7c908e(a0){return d_581e8fb85867e31d4e92fc93ed0fce5ca6fad75cd034ce7f7d7973a22a7c908e(a0);}
function f_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(a0,a1){try{return dFast_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(a0,a1);}catch(error){if(error!==__deepCall)throw error;return __run(d_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(a0,a1));}}
function f_866f1a3a5f9afd801d31ee4cb13ab442ca9ed188ee66daa5441e65810dfaa8f7(a0){return d_866f1a3a5f9afd801d31ee4cb13ab442ca9ed188ee66daa5441e65810dfaa8f7(a0);}
function f_a7f0913c943a3d4b183c98e29ed4275b33d249620ed840ddabfbf932ca8b54cd(a0){return d_a7f0913c943a3d4b183c98e29ed4275b33d249620ed840ddabfbf932ca8b54cd(a0);}
function f_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(a0){try{return dFast_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(a0));}}
function f_be39b632da6b6c85b97f1df43f7a58695006128dfe405c6284db9c22402055e5(a0){return d_be39b632da6b6c85b97f1df43f7a58695006128dfe405c6284db9c22402055e5(a0);}
function f_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){try{return dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0));}}
function f_1ded343e21e9e1c2410cf19d76be60a8e464fc6e2bb80b2f6a381623e6f78e3b(a0){return d_1ded343e21e9e1c2410cf19d76be60a8e464fc6e2bb80b2f6a381623e6f78e3b(a0);}
function f_255299b53c72a2786fe15c53bfc1e342085e441f49d12eeb4c49852e9a066c38(a0){return d_255299b53c72a2786fe15c53bfc1e342085e441f49d12eeb4c49852e9a066c38(a0);}
function f_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){try{return dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0));}}
function f_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0){try{return dFast_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_3044d44bda44c20b6368cd0a7c43164a26e2c0b71075481b991749c07ccc1226(a0));}}
function f_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(a0){try{return dFast_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(a0));}}
function f_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(a0){try{return dFast_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(a0));}}
function f_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){try{return dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0));}}
function f_438a1790547cd2e8d3594d23bcb57445b0235f3c0b9a0d6e37ea8069f02ba71d(a0){return d_438a1790547cd2e8d3594d23bcb57445b0235f3c0b9a0d6e37ea8069f02ba71d(a0);}
function f_592acf05bc6244571b512a48306f8a1b591096b3ac05f3e5f707eb8831cb0030(a0){return d_592acf05bc6244571b512a48306f8a1b591096b3ac05f3e5f707eb8831cb0030(a0);}
function f_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0){try{return dFast_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_59a36f8cc0488bff3eb7932a7daa95e58aae2658c522975919974e1ae7d6a5de(a0));}}
function f_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){try{return dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0));}}
function f_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){try{return dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0));}}
function f_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0){try{return dFast_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_6c71454ef8d90d3b5549d14f041d3e3ac1d63c8ed3d36c1654bbd7e38ba6f66e(a0));}}
function f_6cce05b519648ff4045eb3424833f6d16bf0753974a6bf0872594ce55e3a9196(a0){return d_6cce05b519648ff4045eb3424833f6d16bf0753974a6bf0872594ce55e3a9196(a0);}
function f_7c626cb37b478498579f5a10f626efbc4235e3dbdd595bcd7fae8ed1c0c445c4(a0){return d_7c626cb37b478498579f5a10f626efbc4235e3dbdd595bcd7fae8ed1c0c445c4(a0);}
function f_7d350b8c08d443785fb7708635e000d6ac98f2ec18aa5b162a96f36235b83f47(a0){return d_7d350b8c08d443785fb7708635e000d6ac98f2ec18aa5b162a96f36235b83f47(a0);}
function f_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){try{return dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0));}}
function f_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0){try{return dFast_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_b45d9af1547c8e35b306281f1b75f405cb3c5af7bb115412788f0d3f008b10d4(a0));}}
function f_d6bc4c53b80ad1f8905faecb76ff8d04f204371cbe91768017177bedd22fa703(a0){return d_d6bc4c53b80ad1f8905faecb76ff8d04f204371cbe91768017177bedd22fa703(a0);}
function f_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0){return d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0);}
function f_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0){try{return dFast_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_e31c2157beccdbd88a2a51f08c0e0a13b988598fee6fa5ecb9178386f1179c3f(a0));}}
function f_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0){try{return dFast_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_e94e47cbe62012d5e809aedd5112d083d61fb222c86b443ece43cf4debd2915b(a0));}}
function f_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0){try{return dFast_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_efcdae14764f44ab67c03d3bbdae84c8f17d67449c99e48e139a5d537ba0a2a9(a0));}}
function f_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0){try{return dFast_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_eff581ac92c49828db8b27a019888789af3544101c4dad466c5a13cd42e75362(a0));}}
function f_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0){try{return dFast_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_f02d90d4711a298d4db949d10777d8a3a87a0316ff345f3c1671ba95c023e0a3(a0));}}
function f_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0){return d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0);}
function f_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0){try{return dFast_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_fb2545cc19e049178f0920fd55f8b0efe383eba0bef786d3df75817c171bf2cd(a0));}}
// Fixed host subscription lifecycle. Dependencies come from checked effects;
// equality and ownership codecs are compiled from each query's result type.
function __createObservers(prepare){
 const subscriptions=new Map(),byRoot=new Map(),pending=new Set(),errors=[];
 let next=0,held=0,flushing=false;
 function report(s,error,phase){
  errors.push({query:s?.query??null,error,phase});
  if(s?.onError)try{s.onError(error);}catch(e){errors.push({query:s.query,error:e,phase:'error-handler'});}
 }
 function flush(){
  if(held||flushing||!pending.size)return;
  flushing=true;let passes=0;
  try{
   while(pending.size&&!held){
    if(++passes>1024){report(null,Error('subscription publication budget exhausted'),'publication');break;}
    const affected=new Set();
    for(const root of pending)for(const id of byRoot.get(root)||[])affected.add(id);
    pending.clear();const deliveries=[];
    // Evaluate all affected queries before calling any consumers.
    for(const id of affected){
     const s=subscriptions.get(id);if(!s)continue;
     try{const value=s.capture(s.read());if(!s.equal(s.value,value)){s.value=value;deliveries.push([s,value]);}}
     catch(e){report(s,e,'query');}
    }
    for(const [s,value]of deliveries)if(subscriptions.get(s.id)===s){
     try{s.callback(s.output(value));}catch(e){report(s,e,'listener');}
    }
   }
  }finally{flushing=false;}
 }
 return {
  get active(){return subscriptions.size!==0;},
  subscribe(query,args,callback,{immediate=true,onError}={}){
   if(typeof callback!=='function'||onError!==undefined&&typeof onError!=='function')throw TypeError('subscription callback');
   const q=prepare(query,args),s={...q,id:next++,query,callback,onError};
   s.value=s.capture(s.read());subscriptions.set(s.id,s);
   for(const root of s.roots){let ids=byRoot.get(root);if(!ids)byRoot.set(root,ids=new Set());ids.add(s.id);}
   const dispose=()=>{if(!subscriptions.delete(s.id))return;for(const root of s.roots){const ids=byRoot.get(root);ids.delete(s.id);if(!ids.size)byRoot.delete(root);}};
   if(immediate)try{callback(s.output(s.value));}catch(e){dispose();throw e;}
   return dispose;
  },
  commit(roots){if(!subscriptions.size)return;for(const root of roots)pending.add(root);flush();},
  hold(){held++;return new Set(pending);},
  release(){if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  rollback(mark){pending.clear();for(const root of mark)pending.add(root);if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  batch(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('batch callback must be synchronous');held++;
   try{const value=callback();if(value&&typeof value.then==='function')throw TypeError('state batch callback must be synchronous');return value;}
   finally{held--;flush();}
  },
  flush,
  takeErrors(){return errors.splice(0);}
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
 const out=[];let left=limits.values;
 function bytes(xs){if(xs.length>limits.bytes-out.length)throw Error('snapshot byte limit exceeded');for(const x of xs)out.push(x);}
 function integer(n,size){n=BigInt(n);for(let i=0;i<size;i++){bytes([Number(n&255n)]);n>>=8n;}}
 function raw(xs){integer(xs.length,8);bytes(xs);}
 function value(v,t,depth=0,bindings=[]){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{value(v,t.body,depth+1,bindings);}finally{bindings.pop();}break;
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');value(v,bound[1],depth+1,bindings);break;}
  case 'unit':break;case 'bool':bytes([v?1:0]);break;
  case 'u32':case 'i32':case 'f32':integer(v,4);break;case 'u64':integer(v,8);break;
  case 'vector':if(v.length!==t.size)throw Error('vector dimension mismatch');for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'int':{let n=v<0n?-v:v;const xs=[];while(n){if(xs.length>=4096)throw Error('snapshot Int exceeds size limit');xs.push(Number(n&255n));n>>=8n;}bytes([v===0n?0:v>0n?1:2]);raw(xs);break;}
  case 'string':raw(__encoder.encode(v));break;
  case 'id':integer(BigInt('0x'+v),16);break;
  case 'enum':integer(t.variants.indexOf(v),4);break;
  case 'record':for(const f of t.fields)value(v[f.name],f.type,depth+1,bindings);break;
  case 'list':if(v.length>left)throw Error('snapshot value limit exceeded');integer(v.length,8);for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'option':if(Object.hasOwn(v,'Some')){bytes([1]);value(v.Some,t.element,depth+1,bindings);}else bytes([0]);break;
  case 'result':if(Object.hasOwn(v,'Ok')){bytes([0]);value(v.Ok,t.ok,depth+1,bindings);}else{bytes([1]);value(v.Err,t.error,depth+1,bindings);}break;
  default:throw Error('unsupported snapshot type');
 }}
 return {bytes,integer,raw,value,get left(){return left;},finish:()=>new Uint8Array(out)};
}
async function __snapshotEncode(meta,state,options){
 const limits=__snapshotLimits(options),w=__snapshotWriter(limits);
 w.integer(state.version,8);
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const rows=[...state.tables[r.index].entries()].sort((a,b)=>__keyCompare(a[0],b[0],r.key));if(rows.length>Math.floor(w.left/2))throw Error('snapshot row limit exceeded');w.integer(rows.length,8);for(const [k,v]of rows){w.value(k,r.snapshotKey??r.key);w.value(v,r.snapshotValue??r.value);}}
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
  case 'record':return Object.fromEntries(t.fields.map(f=>[f.name,value(f.type,depth+1,bindings)]));
  case 'list':{const n=sequence(),xs=[];for(let i=0;i<n;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'option':{const tag=take(1)[0];if(tag===0)return {None:null};if(tag===1)return {Some:value(t.element,depth+1,bindings)};throw Error('invalid Option tag');}
  case 'result':{const tag=take(1)[0];if(tag===0)return {Ok:value(t.ok,depth+1,bindings)};if(tag===1)return {Err:value(t.error,depth+1,bindings)};throw Error('invalid Result tag');}
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
function read_1(v,d=0,internal=false){const bytes=__encoder.encode(v);let tail=__node(0,[]);for(let i=bytes.length-1;i>=0;i--)tail=__node(1,[BigInt(bytes[i]),tail]);return tail;}
function write_1(v,d=0,snapshot=false){const bytes=[];let cursor=v;while(cursor.c!==0){bytes.push(Number(cursor.a[0]));cursor=cursor.a[1];}return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes));}
function read_2(v,d=0,internal=false){return BigInt(v);}
function write_2(v,d=0,snapshot=false){return snapshot?v:Number(v);}
function read_3(v,d=0,internal=false){return __node(0,[]);}
function write_3(v,d=0,snapshot=false){return null;}
function read_4(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_2(v[i],d+1,internal),tail]);return tail;}
function write_4(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_2(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_5(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_9(v[i],d+1,internal),tail]);return tail;}
function write_5(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_9(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_6(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_16(v[i],d+1,internal),tail]);return tail;}
function write_6(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_16(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_7(v,d=0,internal=false){let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[read_17(v[i],d+1,internal),tail]);return tail;}
function write_7(v,d=0,snapshot=false){let cursor=v;const xs=[];while(cursor.c!==0){xs.push(write_17(cursor.a[0],d+1,snapshot));cursor=cursor.a[1];}return xs;}
function read_8(v,d=0,internal=false){switch(v){case "Error.Failed":return __node(0,[]);default:return undefined;}}
function write_8(v,d=0,snapshot=false){return ["Error.Failed"][v.c];}
function read_9(v,d=0,internal=false){return __node(0,[read_2(v["value"],d+1,internal),read_0(v["active"],d+1,internal),read_17(v["metadata"],d+1,internal)]);}
function write_9(v,d=0,snapshot=false){return Object.fromEntries([["value",write_2(v.a[0],d+1,snapshot)],["active",write_0(v.a[1],d+1,snapshot)],["metadata",write_17(v.a[2],d+1,snapshot)]]);}
function read_10(v,d=0,internal=false){return __node(0,[read_1(v["item0"],d+1,internal)]);}
function write_10(v,d=0,snapshot=false){return Object.fromEntries([["item0",write_1(v.a[0],d+1,snapshot)]]);}
function read_11(v,d=0,internal=false){return __node(4,[0n,__node(3,[f_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(read_6(v["item0"],d+1,internal)),__node(0,[])])]);}
function write_11(v,d=0,snapshot=false){if(v.c!==4||v.a[0]!==0n)throw Error('recursive record tag');let cursor=v.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field0=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==0)throw Error('recursive record field tail');return Object.fromEntries([["item0",write_6(f_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(field0),d+1,snapshot)]]);}
function read_12(v,d=0,internal=false){return __node(0,[read_1(v["item0"],d+1,internal)]);}
function write_12(v,d=0,snapshot=false){return Object.fromEntries([["item0",write_1(v.a[0],d+1,snapshot)]]);}
function read_13(v,d=0,internal=false){return __node(0,[read_0(v["item0"],d+1,internal)]);}
function write_13(v,d=0,snapshot=false){return Object.fromEntries([["item0",write_0(v.a[0],d+1,snapshot)]]);}
function read_14(v,d=0,internal=false){return __node(4,[1n,__node(3,[f_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(read_7(v["item0"],d+1,internal)),__node(0,[])])]);}
function write_14(v,d=0,snapshot=false){if(v.c!==4||v.a[0]!==1n)throw Error('recursive record tag');let cursor=v.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field0=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==0)throw Error('recursive record field tail');return Object.fromEntries([["item0",write_7(f_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(field0),d+1,snapshot)]]);}
function read_15(v,d=0,internal=false){return __node(0,[]);}
function write_15(v,d=0,snapshot=false){return Object.fromEntries([]);}
function read_16(v,d=0,internal=false){return __node(4,[2n,__node(3,[f_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(read_1(v["key"],d+1,internal)),__node(3,[read_17(v["value"],d+1,internal),__node(0,[])])])]);}
function write_16(v,d=0,snapshot=false){if(v.c!==4||v.a[0]!==2n)throw Error('recursive record tag');let cursor=v.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field0=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field1=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==0)throw Error('recursive record field tail');return Object.fromEntries([["key",write_1(f_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(field0),d+1,snapshot)],["value",write_17(field1,d+1,snapshot)]]);}
function read_17(v,d=0,internal=false){return __node(4,[3n,__node(3,[f_3482b0be47b91349a62d90fd337d79c8f7c39fffef95cf13c87842354de2fbcb(read_24(v["payload"],d+1,internal)),__node(0,[])])]);}
function write_17(v,d=0,snapshot=false){if(v.c!==4||v.a[0]!==3n)throw Error('recursive record tag');let cursor=v.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field0=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==0)throw Error('recursive record field tail');return Object.fromEntries([["payload",write_24(f_38696acc76796b9783d11576b35647a487da370f8e5dd5d73c26e1f4b62d3501(field0),d+1,snapshot)]]);}
function read_18(v,d=0,internal=false){if(Object.hasOwn(v,'Some'))return __node(1,[read_9(v.Some,d+1,internal)]);return __node(0,[]);}
function write_18(v,d=0,snapshot=false){return v.c===0?{None:null}:{Some:write_9(v.a[0],d+1,snapshot)};}
function read_19(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_3(v.Ok,d+1,internal)]);return __node(1,[read_8(v.Err,d+1,internal)]);}
function write_19(v,d=0,snapshot=false){return v.c===0?{Ok:write_3(v.a[0],d+1,snapshot)}:{Err:write_8(v.a[0],d+1,snapshot)};}
function read_20(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_10(v.Ok,d+1,internal)]);return __node(1,[read_23(v.Err,d+1,internal)]);}
function write_20(v,d=0,snapshot=false){return v.c===0?{Ok:write_10(v.a[0],d+1,snapshot)}:{Err:write_23(v.a[0],d+1,snapshot)};}
function read_21(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_12(v.Ok,d+1,internal)]);return __node(1,[read_20(v.Err,d+1,internal)]);}
function write_21(v,d=0,snapshot=false){return v.c===0?{Ok:write_12(v.a[0],d+1,snapshot)}:{Err:write_20(v.a[0],d+1,snapshot)};}
function read_22(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_13(v.Ok,d+1,internal)]);return __node(1,[read_21(v.Err,d+1,internal)]);}
function write_22(v,d=0,snapshot=false){return v.c===0?{Ok:write_13(v.a[0],d+1,snapshot)}:{Err:write_21(v.a[0],d+1,snapshot)};}
function read_23(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_14(v.Ok,d+1,internal)]);return __node(1,[read_11(v.Err,d+1,internal)]);}
function write_23(v,d=0,snapshot=false){return v.c===0?{Ok:write_14(v.a[0],d+1,snapshot)}:{Err:write_11(v.a[0],d+1,snapshot)};}
function read_24(v,d=0,internal=false){if(Object.hasOwn(v,'Ok'))return __node(0,[read_15(v.Ok,d+1,internal)]);return __node(1,[read_22(v.Err,d+1,internal)]);}
function write_24(v,d=0,snapshot=false){return v.c===0?{Ok:write_15(v.a[0],d+1,snapshot)}:{Err:write_22(v.a[0],d+1,snapshot)};}
const __meta={"events":[{"name":"seen","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"roots":[{"key":{"kind":"string"},"name":"Rows","snapshotKey":{"kind":"string"},"snapshotValue":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"body":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"body":{"fields":[{"name":"item0","type":{"element":{"body":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"kind":"bind","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"body":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record"}},"kind":"result","ok":{"fields":[],"kind":"record"}}}],"kind":"record"},"kind":"bind","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"value":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"}}],"snapshot":{"program":[170,2,160,201,22,34,6,102,106,120,127,195,108,222,134,87,107,18,249,205,65,4,204,37,145,133,33,239,56,73,0,121],"schema":[215,31,142,65,238,22,48,236,29,237,247,185,248,201,46,30,164,196,64,247,0,243,34,135,232,15,229,166,43,18,34,88]}};
function __fromTables(tables){const roots=[];
{const rows=[...tables[0].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){const [key,value]=rows[j];tail=__node(1,[read_1(key,0,true),read_9(value,0,true),tail]);}roots.push(tail);}
return __node(0,roots);}
function __tables(logical){const tables=[];
{let cursor=logical.a[0],prior;const rows=new Map();while(cursor.c!==0){const [key,value,tail]=cursor.a;rows.set(write_1(key,0,true),write_9(value,0,true));cursor=tail;}tables.push(rows);}
return tables;}
function __events(list){const events=[];let cursor=list;while(cursor.c!==0){const [event,tail]=cursor.a;switch(event.c){
case 0:events.push(["seen", write_2(event.a[0],0,true), write_2(event.a[0],0,false)]);break;
default:throw Error('unknown source event');}cursor=tail;}return events;}
// CALLER CONTRACT: arguments must have declared types and canonical values.
// Malformed data may throw, produce wrong results or corrupt state.
export function createState(){let version=0n,outbox=[],busy=false,transaction=null;
const initial=__node(0,[__node(0,[])]);let physical=f_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(initial);
const observers=__createObservers((name,args)=>{boundary();if(transaction)throw Error('subscription requires transaction boundary');switch(name){
case "total":{const captured=[];
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_2(v,0),output:v=>write_2(v,0,false),equal:__repEqual};}
case "row":{const captured=[];
captured.push(write_1(read_1(args[0],0),0,false));
return {roots:[0],read:()=>invoke_native(name,captured,true),capture:v=>read_18(v,0),output:v=>write_18(v,0,false),equal:__repEqual};}
default:throw Error('subscription requires a readonly query');}});
const preconditions={};
function boundary(){if(busy)throw Error('state operation already in progress');}
function invoke_native(name,args,resultOnly=false){boundary();try{if(preconditions[name] && invoke_native(preconditions[name],args,true)!==true)throw Error('contract precondition failed');switch(name){
case "put":{
const a0=read_1(args[0],0);
const a1=read_9(args[1],0);
const a2=read_0(args[2],0);
const executed=f_1fba665a3fbc7cc841ca31f17413f3a3c44367338facc15004b96a61873b967b(physical,version,a0,a1,a2);const observed=f_be39b632da6b6c85b97f1df43f7a58695006128dfe405c6284db9c22402055e5(executed),next=f_866f1a3a5f9afd801d31ee4cb13ab442ca9ed188ee66daa5441e65810dfaa8f7(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_19(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "erase":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_22833f373fb00826088792e0e389fbc6ab56546e2115894519bbb620ca35b527(physical,version,a0,a1);const observed=f_be39b632da6b6c85b97f1df43f7a58695006128dfe405c6284db9c22402055e5(executed),next=f_866f1a3a5f9afd801d31ee4cb13ab442ca9ed188ee66daa5441e65810dfaa8f7(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_19(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "total":{
const executed=f_651f15d1c50b1c6bd035ad37f101a922110ae0bd0acde0fd87d8a3d376810b7a(physical,version);const observed=f_581e8fb85867e31d4e92fc93ed0fce5ca6fad75cd034ce7f7d7973a22a7c908e(executed),next=f_2c27ab81fd535da7b15c47b4f86e70d3e022e597d14150e679f4200b4a936caf(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_2(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "row":{
const a0=read_1(args[0],0);
const executed=f_3673b1f831ac7464c7a80ac869d9738b38b98ad965da2326f6c95a036e10893a(physical,version,a0);const observed=f_33b50e914daacaa87bef099914c13ede60a55a53922c8385278cebaadd341096(executed),next=f_a7f0913c943a3d4b183c98e29ed4275b33d249620ed840ddabfbf932ca8b54cd(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_18(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
default:throw Error(`unknown action ${name}`);}}catch(e){if(transaction?.strict)transaction.failure=e;throw e;}}
async function invoke_json(name,args){return invoke_native(name,args);}
const actionNames=new Set(["put","erase","total","row"]);
return Object.freeze({subscribe:observers.subscribe,batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,transaction(callback){if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();transaction.strict=true;try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}},invoke:invoke_json,invoke_json,bind(name,{resultOnly=false}={}){if(!actionNames.has(name))throw Error(`unknown action ${name}`);return (...args)=>invoke_native(name,args,resultOnly);},beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length,notificationMark:observers.hold()};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');if(transaction.failure)throw transaction.failure;transaction=null;observers.release();},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;const mark=transaction.notificationMark;transaction=null;observers.rollback(mark);},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_afe28114e0582a4280e8585da359dfff06729853f8d62ae8103672d238bfd67f(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;observers.hold();let restored=false;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);
const next=f_1819c59b6d30f1a2751ce42ec2974a81a7e327a0c9455f0a1f926f81b17c5405(logical);
physical=next;version=saved.version;outbox=saved.outbox;restored=true;}finally{busy=false;if(restored)observers.commit([0]);observers.release();}}});}
function __publicEvent(channel,value){switch(channel){
case "seen":return write_2(read_2(value,0,true),0,false);
default:throw Error('unknown source event');}}

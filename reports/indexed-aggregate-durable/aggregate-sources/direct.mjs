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
function* d_1419a88ebd493c48bec40dc7f338d0d0ce762dc90f37959c2647653232bda1ae(a0,a1){let v5;switch(a0.c){
case 0:{
v5=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v4=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(v5);
const v3=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(v4);
const v2=yield d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(v3);
const v1=yield d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(v2);
const v8=false;
const v11=__node(0,[]);
const v0=__node(0,[v1,v8,a1,a0,v11]);
return v0;}
function* d_183ac32696b63735bd16558d4f0a96c3b3204e7aa520383460f05ccf1df4e3e6(a0,a1){let v17;switch(a0.c){
case 0:{
v17=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v16=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(v17);
const v15=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(v16);
const v14=yield d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(v15);
const v13=yield d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(v14);
const v20=false;
const v23=__node(0,[]);
const v12=__node(0,[v13,v20,a1,a0,v23]);
return v12;}
function* d_1bd023aad73501f6a08419de176f39130186c37009f9dd6c85c17fe81681e3a7(a0,a1,a2){let v24;switch(a0.c){
case 0:{
const v26=__node(0,[]);
v24=v26;break;}
case 1:{
const v30=(a1)===(a0.a[0]);
let v29;if(v30){
v29=a2;}else{
v29=a0.a[1];}
const v35=yield d_1bd023aad73501f6a08419de176f39130186c37009f9dd6c85c17fe81681e3a7(a0.a[2],a1,a2);
const v27=__node(1,[a0.a[0],v29,v35]);
v24=v27;break;}
default:throw Error('literal constructor projection');}
return v24;}
function* d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0){let v39;switch(a0.c){
case 0:{
const v41=__node(0,[]);
v39=v41;break;}
case 1:{
let v43;switch(a0.a[0].c){
case 0:{
v43=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v42;if(v43){
const v48=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0.a[1]);
const v46=__node(1,[a0.a[0],v48]);
v42=v46;}else{
const v50=yield d_1c4ef7b3f512ff85bfb65b181a32c0bfc88e4cddfeb6b1bd12fbb24fe24d9805(a0.a[1]);
v42=v50;}
v39=v42;break;}
default:throw Error('literal constructor projection');}
return v39;}
function* d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(a0){let v52;switch(a0.c){
case 0:{
const v54=__node(0,[]);
v52=v54;break;}
case 1:{
let v58;switch(a0.a[0].c){
case 0:{
v58=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v61=0n;
const v57=BigInt.asUintN(64,(v58)*(v61));
const v62=1n;
const v56=BigInt.asUintN(64,(v57)+(v62));
const v63=yield d_1e34544693ce3a76972d38f5de098aca0975198471a6c30935fe54cb724504c8(a0.a[1]);
const v55=__node(1,[v56,v63]);
v52=v55;break;}
default:throw Error('literal constructor projection');}
return v52;}
function d_267afceb9a54b756d7d780bb1dc5f711cb9e38751d6d54e31458cd7d922c2ae6(a0){let v65;switch(a0.c){
case 0:{
let v67;switch(a0.a[1].c){
case 0:{
const v74=__node(0,[]);
const v73=__node(0,[v74]);
const v69=__node(0,[a0.a[1].a[0],a0.a[1].a[1],a0.a[1].a[2],v73,a0.a[1].a[4]]);
v67=v69;break;}
case 1:{
const v80=__node(0,[]);
const v79=__node(0,[v80]);
const v76=__node(1,[a0.a[1].a[0],a0.a[1].a[1],v79]);
v67=v76;break;}
default:throw Error('literal constructor projection');}
v65=v67;break;}
default:throw Error('literal constructor projection');}
return v65;}
function d_32645792a4c54c5281a543aba5a3fb4409bf13d1e4c237e62d03edf4d9eea91d(a0){let v81;switch(a0.c){
case 0:{
v81=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v81;}
function* d_3627402bddbf4c365a7a7ed663056d54477b0953a48ba7efa4740233ab4a05e1(a0,a1){const v85=yield d_b6ebb989f27c81ed137782efcd903763cfe847a58e7c0cf7283c5362a25a26cd(a0,a1);
let v84;switch(v85.c){
case 0:{
const v88=false;
v84=v88;break;}
case 1:{
const v89=true;
v84=v89;break;}
default:throw Error('literal constructor projection');}
return v84;}
function* d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(a0){let v90;switch(a0.c){
case 0:{
const v92=__node(0,[]);
v90=v92;break;}
case 1:{
let v94;switch(a0.a[0].c){
case 0:{
v94=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v97=yield d_3ac8d3f13efde674396bc57a7438ad8d845b3229ec0af8cf2f27c539f1e6f4f3(a0.a[1]);
const v93=__node(1,[v94,v97]);
v90=v93;break;}
default:throw Error('literal constructor projection');}
return v90;}
function d_4022bfa54726d2c6ccec19b8c285e52ad2d8408d38875d986cd1b87c856a1b64(a0){return a0;}
function* d_4c8a27fc51c255c469be32603b437d10b7f1891ab257792f389a4dcf76858c31(a0,a1,a2,a3){let v102;switch(a0.c){
case 0:{
let v106;switch(a0.c){
case 0:{
v106=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v105=yield d_9401eb45a19a2c9a0ed59cc37f132b81bf6410fcffe6120998e3941ca57557a6(v106,a2);
const v104=__node(0,[v105]);
v102=v104;break;}
default:throw Error('literal constructor projection');}
const v101=__node(0,[v102]);
let v100;switch(v101.c){
case 0:{
const v113=__node(0,[]);
const v114=__node(0,[a2]);
const v112=yield d_80d50ce28872030b301103e24f3b913c47e960161127d76a8565b320668a0769(v113,v114);
const v111=__node(0,[v112]);
let v110;switch(v111.c){
case 0:{
let v116;if(a3){
const v120=__node(0,[]);
const v119=__node(1,[v120]);
let v118;switch(v119.c){
case 0:{
const v124=18446744073709551615n;
const v122=(a1)===(v124);
let v121;if(v122){
const v126=1n;
const v125=__node(1,[v126,a1,a0]);
v121=v125;}else{
const v130=__node(0,[v119.a[0]]);
const v132=true;
const v135=1n;
const v133=BigInt.asUintN(64,(a1)+(v135));
const v129=__node(0,[v130,v132,v133,v101.a[0],v111.a[0]]);
v121=v129;}
v118=v121;break;}
case 1:{
const v139=__node(1,[v119.a[0]]);
const v141=false;
const v144=__node(0,[]);
const v138=__node(0,[v139,v141,a1,a0,v144]);
v118=v138;break;}
default:throw Error('literal constructor projection');}
v116=v118;}else{
const v147=__node(0,[]);
const v146=__node(0,[v147]);
let v145;switch(v146.c){
case 0:{
const v151=18446744073709551615n;
const v149=(a1)===(v151);
let v148;if(v149){
const v153=1n;
const v152=__node(1,[v153,a1,a0]);
v148=v152;}else{
const v157=__node(0,[v146.a[0]]);
const v159=true;
const v162=1n;
const v160=BigInt.asUintN(64,(a1)+(v162));
const v156=__node(0,[v157,v159,v160,v101.a[0],v111.a[0]]);
v148=v156;}
v145=v148;break;}
case 1:{
const v166=__node(1,[v146.a[0]]);
const v168=false;
const v171=__node(0,[]);
const v165=__node(0,[v166,v168,a1,a0,v171]);
v145=v165;break;}
default:throw Error('literal constructor projection');}
v116=v145;}
v110=v116;break;}
default:throw Error('literal constructor projection');}
v100=v110;break;}
default:throw Error('literal constructor projection');}
return v100;}
function d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0){let v172;switch(a0.c){
case 0:{
const v174=__node(0,[a0.a[0]]);
v172=v174;break;}
default:throw Error('literal constructor projection');}
return v172;}
function d_674e4f1f94aa35f9d19eea4f05299421f31bb3a8da9fe8ba4063fe093851740a(a0){let v176;switch(a0.c){
case 0:{
v176=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v176;}
function d_6a7bc2488e1119d43c186f3d3b055de71c23c8f4a131e6de916b35ab2fcfa9d2(a0){let v179;switch(a0.c){
case 0:{
v179=a0.a[1];break;}
default:throw Error('literal constructor projection');}
return v179;}
function d_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(a0){let v182;switch(a0.c){
case 0:{
const v184=__node(0,[a0.a[0]]);
v182=v184;break;}
default:throw Error('literal constructor projection');}
return v182;}
function d_7a776bf4cdca1f4421e417e46250e10eb5e5869e4e19a42a87e2834fc69f78b9(a0){let v186;switch(a0.c){
case 0:{
let v188;switch(a0.a[1].c){
case 0:{
const v195=__node(0,[]);
const v194=__node(0,[v195]);
const v190=__node(0,[a0.a[1].a[0],a0.a[1].a[1],a0.a[1].a[2],v194,a0.a[1].a[4]]);
v188=v190;break;}
case 1:{
const v201=__node(0,[]);
const v200=__node(0,[v201]);
const v197=__node(1,[a0.a[1].a[0],a0.a[1].a[1],v200]);
v188=v197;break;}
default:throw Error('literal constructor projection');}
v186=v188;break;}
default:throw Error('literal constructor projection');}
return v186;}
function* d_7c8ea52ee301ca514d7e2006bf0470e492a11a8301ff911af4b792587831c232(a0,a1){const v205=d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0);
const v204=yield d_183ac32696b63735bd16558d4f0a96c3b3204e7aa520383460f05ccf1df4e3e6(v205,a1);
const v202=__node(0,[a0,v204]);
return v202;}
function* d_80d50ce28872030b301103e24f3b913c47e960161127d76a8565b320668a0769(a0,a1){let v208;switch(a0.c){
case 0:{
const v212=__node(0,[]);
const v210=__node(1,[a1,v212]);
v208=v210;break;}
case 1:{
const v215=yield d_80d50ce28872030b301103e24f3b913c47e960161127d76a8565b320668a0769(a0.a[1],a1);
const v213=__node(1,[a0.a[0],v215]);
v208=v213;break;}
default:throw Error('literal constructor projection');}
return v208;}
function* d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0){let v218;switch(a0.c){
case 0:{
const v220=__node(0,[]);
v218=v220;break;}
case 1:{
let v222;switch(a0.a[0].c){
case 0:{
v222=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v221;if(v222){
const v227=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0.a[1]);
const v225=__node(1,[a0.a[0],v227]);
v221=v225;}else{
const v229=yield d_85a7d3b8a8546e52909abfe0c30d30a4b6da6981bb0b2fa37b1a363c96f862b7(a0.a[1]);
v221=v229;}
v218=v221;break;}
default:throw Error('literal constructor projection');}
return v218;}
function* d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(a0){let v231;switch(a0.c){
case 0:{
const v233=__node(0,[]);
v231=v233;break;}
case 1:{
const v236=yield d_860856c66fc035defeb18a36b37c55c658790c951fb1e274c3501374069fd590(a0.a[2]);
const v234=__node(1,[a0.a[1],v236]);
v231=v234;break;}
default:throw Error('literal constructor projection');}
return v231;}
function* d_905d11c6176db15c2c7553180f82311f91721aec65c089fabcb4fb16564b99b7(a0,a1){const v241=d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0);
const v240=yield d_1419a88ebd493c48bec40dc7f338d0d0ce762dc90f37959c2647653232bda1ae(v241,a1);
const v238=__node(0,[a0,v240]);
return v238;}
function* d_9401eb45a19a2c9a0ed59cc37f132b81bf6410fcffe6120998e3941ca57557a6(a0,a1){let v244;switch(a0.c){
case 0:{
const v246=__node(0,[]);
v244=v246;break;}
case 1:{
const v248=(a1)===(a0.a[0]);
let v247;if(v248){
const v251=yield d_9401eb45a19a2c9a0ed59cc37f132b81bf6410fcffe6120998e3941ca57557a6(a0.a[2],a1);
v247=v251;}else{
const v257=yield d_9401eb45a19a2c9a0ed59cc37f132b81bf6410fcffe6120998e3941ca57557a6(a0.a[2],a1);
const v254=__node(1,[a0.a[0],a0.a[1],v257]);
v247=v254;}
v244=v247;break;}
default:throw Error('literal constructor projection');}
return v244;}
function* d_97d06ef935a3d8622ec65971b15007a56226c9416f1a6d8c3715ad96cf36e81f(a0,a1,a2,a3,a4,a5){const v261=d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0);
const v260=yield d_cf4b6a90f479fc219713bb74407cc5d732894bbe7db32498b7f7769e626bc675(v261,a1,a2,a3,a4,a5);
return v260;}
function* d_b6ebb989f27c81ed137782efcd903763cfe847a58e7c0cf7283c5362a25a26cd(a0,a1){let v268;switch(a0.c){
case 0:{
const v270=__node(0,[]);
v268=v270;break;}
case 1:{
const v272=(a1)===(a0.a[0]);
let v271;if(v272){
const v275=__node(1,[a0.a[1]]);
v271=v275;}else{
const v277=yield d_b6ebb989f27c81ed137782efcd903763cfe847a58e7c0cf7283c5362a25a26cd(a0.a[2],a1);
v271=v277;}
v268=v271;break;}
default:throw Error('literal constructor projection');}
return v268;}
function* d_bc4d015ad149ec5c0d70a8274a7cf3d6fa0f70a959f9c1f0fc1ffc56874c1733(a0,a1,a2,a3){const v281=d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0);
const v280=yield d_4c8a27fc51c255c469be32603b437d10b7f1891ab257792f389a4dcf76858c31(v281,a1,a2,a3);
return v280;}
function* d_c1f86b566538a4823301d392b3efd476bb2ed5525ae16291ec5d98d096376f90(a0,a1,a2){let v286;switch(a0.c){
case 0:{
const v291=__node(0,[]);
const v288=__node(1,[a1,a2,v291]);
v286=v288;break;}
case 1:{
const v293=(a1)<(a0.a[0]);
let v292;if(v293){
const v296=__node(1,[a1,a2,a0]);
v292=v296;}else{
const v303=yield d_c1f86b566538a4823301d392b3efd476bb2ed5525ae16291ec5d98d096376f90(a0.a[2],a1,a2);
const v300=__node(1,[a0.a[0],a0.a[1],v303]);
v292=v300;}
v286=v292;break;}
default:throw Error('literal constructor projection');}
return v286;}
function d_c9c90db0e7b8c312a993015e941adb30051ef78556af109c44754960eee0ba2d(a0){let v308;switch(a0.c){
case 0:{
v308=a0.a[3];break;}
case 1:{
v308=a0.a[2];break;}
default:throw Error('literal constructor projection');}
const v307=d_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(v308);
return v307;}
function* d_cf4b6a90f479fc219713bb74407cc5d732894bbe7db32498b7f7769e626bc675(a0,a1,a2,a3,a4,a5){let v314;switch(a0.c){
case 0:{
v314=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v313=yield d_3627402bddbf4c365a7a7ed663056d54477b0953a48ba7efa4740233ab4a05e1(v314,a2);
let v312;if(v313){
let v320;switch(a0.c){
case 0:{
v320=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v319=yield d_3627402bddbf4c365a7a7ed663056d54477b0953a48ba7efa4740233ab4a05e1(v320,a2);
let v318;if(v319){
let v326;switch(a0.c){
case 0:{
let v330;switch(a0.c){
case 0:{
v330=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v334=__node(0,[a3,a4]);
const v329=yield d_1bd023aad73501f6a08419de176f39130186c37009f9dd6c85c17fe81681e3a7(v330,a2,v334);
const v328=__node(0,[v329]);
v326=v328;break;}
default:throw Error('literal constructor projection');}
const v325=__node(0,[v326]);
let v324;switch(v325.c){
case 0:{
const v340=__node(0,[]);
const v341=__node(0,[a3]);
const v339=yield d_80d50ce28872030b301103e24f3b913c47e960161127d76a8565b320668a0769(v340,v341);
const v338=__node(0,[v339]);
let v337;switch(v338.c){
case 0:{
let v343;if(a5){
const v347=__node(0,[]);
const v346=__node(1,[v347]);
let v345;switch(v346.c){
case 0:{
const v351=18446744073709551615n;
const v349=(a1)===(v351);
let v348;if(v349){
const v353=1n;
const v352=__node(1,[v353,a1,a0]);
v348=v352;}else{
const v357=__node(0,[v346.a[0]]);
const v359=true;
const v362=1n;
const v360=BigInt.asUintN(64,(a1)+(v362));
const v356=__node(0,[v357,v359,v360,v325.a[0],v338.a[0]]);
v348=v356;}
v345=v348;break;}
case 1:{
const v366=__node(1,[v346.a[0]]);
const v368=false;
const v371=__node(0,[]);
const v365=__node(0,[v366,v368,a1,a0,v371]);
v345=v365;break;}
default:throw Error('literal constructor projection');}
v343=v345;}else{
const v374=__node(0,[]);
const v373=__node(0,[v374]);
let v372;switch(v373.c){
case 0:{
const v378=18446744073709551615n;
const v376=(a1)===(v378);
let v375;if(v376){
const v380=1n;
const v379=__node(1,[v380,a1,a0]);
v375=v379;}else{
const v384=__node(0,[v373.a[0]]);
const v386=true;
const v389=1n;
const v387=BigInt.asUintN(64,(a1)+(v389));
const v383=__node(0,[v384,v386,v387,v325.a[0],v338.a[0]]);
v375=v383;}
v372=v375;break;}
case 1:{
const v393=__node(1,[v373.a[0]]);
const v395=false;
const v398=__node(0,[]);
const v392=__node(0,[v393,v395,a1,a0,v398]);
v372=v392;break;}
default:throw Error('literal constructor projection');}
v343=v372;}
v337=v343;break;}
default:throw Error('literal constructor projection');}
v324=v337;break;}
default:throw Error('literal constructor projection');}
v318=v324;}else{
const v400=2n;
const v399=__node(1,[v400,a1,a0]);
v318=v399;}
v312=v318;}else{
let v405;switch(a0.c){
case 0:{
v405=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v404=yield d_3627402bddbf4c365a7a7ed663056d54477b0953a48ba7efa4740233ab4a05e1(v405,a2);
let v403;if(v404){
const v410=2n;
const v409=__node(1,[v410,a1,a0]);
v403=v409;}else{
let v415;switch(a0.c){
case 0:{
let v419;switch(a0.c){
case 0:{
v419=a0.a[0];break;}
default:throw Error('literal constructor projection');}
const v423=__node(0,[a3,a4]);
const v418=yield d_c1f86b566538a4823301d392b3efd476bb2ed5525ae16291ec5d98d096376f90(v419,a2,v423);
const v417=__node(0,[v418]);
v415=v417;break;}
default:throw Error('literal constructor projection');}
const v414=__node(0,[v415]);
let v413;switch(v414.c){
case 0:{
const v429=__node(0,[]);
const v430=__node(0,[a3]);
const v428=yield d_80d50ce28872030b301103e24f3b913c47e960161127d76a8565b320668a0769(v429,v430);
const v427=__node(0,[v428]);
let v426;switch(v427.c){
case 0:{
let v432;if(a5){
const v436=__node(0,[]);
const v435=__node(1,[v436]);
let v434;switch(v435.c){
case 0:{
const v440=18446744073709551615n;
const v438=(a1)===(v440);
let v437;if(v438){
const v442=1n;
const v441=__node(1,[v442,a1,a0]);
v437=v441;}else{
const v446=__node(0,[v435.a[0]]);
const v448=true;
const v451=1n;
const v449=BigInt.asUintN(64,(a1)+(v451));
const v445=__node(0,[v446,v448,v449,v414.a[0],v427.a[0]]);
v437=v445;}
v434=v437;break;}
case 1:{
const v455=__node(1,[v435.a[0]]);
const v457=false;
const v460=__node(0,[]);
const v454=__node(0,[v455,v457,a1,a0,v460]);
v434=v454;break;}
default:throw Error('literal constructor projection');}
v432=v434;}else{
const v463=__node(0,[]);
const v462=__node(0,[v463]);
let v461;switch(v462.c){
case 0:{
const v467=18446744073709551615n;
const v465=(a1)===(v467);
let v464;if(v465){
const v469=1n;
const v468=__node(1,[v469,a1,a0]);
v464=v468;}else{
const v473=__node(0,[v462.a[0]]);
const v475=true;
const v478=1n;
const v476=BigInt.asUintN(64,(a1)+(v478));
const v472=__node(0,[v473,v475,v476,v414.a[0],v427.a[0]]);
v464=v472;}
v461=v464;break;}
case 1:{
const v482=__node(1,[v462.a[0]]);
const v484=false;
const v487=__node(0,[]);
const v481=__node(0,[v482,v484,a1,a0,v487]);
v461=v481;break;}
default:throw Error('literal constructor projection');}
v432=v461;}
v426=v432;break;}
default:throw Error('literal constructor projection');}
v413=v426;break;}
default:throw Error('literal constructor projection');}
v403=v413;}
v312=v403;}
return v312;}
function d_db40c28ca38f9868ed7cdb9d8e56215bead63bb1860b608501d664d3fb5ced54(a0){let v488;switch(a0.c){
case 0:{
v488=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v488;}
function* d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(a0){let v491;switch(a0.c){
case 0:{
const v493=0n;
v491=v493;break;}
case 1:{
const v496=yield d_e2ca0264984b8a85a7ce10e263b78fe652a2ad6d9b73eec70267b0b27cedf63b(a0.a[1]);
const v494=BigInt.asUintN(64,(a0.a[0])+(v496));
v491=v494;break;}
default:throw Error('literal constructor projection');}
return v491;}
function* d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(a0){let v498;switch(a0.c){
case 0:{
const v500=0n;
v498=v500;break;}
case 1:{
const v503=yield d_f4382357257997dc9baee0b6ecf9b6cc766701993418e72196ead925a3c78422(a0.a[1]);
const v501=BigInt.asUintN(64,(a0.a[0])+(v503));
v498=v501;break;}
default:throw Error('literal constructor projection');}
return v498;}
function d_f97a4b18aa60ede004ab440d47c690792d1c51147a1b5bfd09475b0488e44897(a0){let v505;switch(a0.c){
case 0:{
const v512=__node(0,[]);
const v511=__node(0,[v512]);
const v507=__node(0,[a0.a[0],a0.a[1],a0.a[2],v511,a0.a[4]]);
v505=v507;break;}
case 1:{
const v518=__node(0,[]);
const v517=__node(0,[v518]);
const v514=__node(1,[a0.a[0],a0.a[1],v517]);
v505=v514;break;}
default:throw Error('literal constructor projection');}
return v505;}
function f_32645792a4c54c5281a543aba5a3fb4409bf13d1e4c237e62d03edf4d9eea91d(a0){return d_32645792a4c54c5281a543aba5a3fb4409bf13d1e4c237e62d03edf4d9eea91d(a0);}
function f_4022bfa54726d2c6ccec19b8c285e52ad2d8408d38875d986cd1b87c856a1b64(a0){return d_4022bfa54726d2c6ccec19b8c285e52ad2d8408d38875d986cd1b87c856a1b64(a0);}
function f_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0){return d_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(a0);}
function f_674e4f1f94aa35f9d19eea4f05299421f31bb3a8da9fe8ba4063fe093851740a(a0){return d_674e4f1f94aa35f9d19eea4f05299421f31bb3a8da9fe8ba4063fe093851740a(a0);}
function f_6a7bc2488e1119d43c186f3d3b055de71c23c8f4a131e6de916b35ab2fcfa9d2(a0){return d_6a7bc2488e1119d43c186f3d3b055de71c23c8f4a131e6de916b35ab2fcfa9d2(a0);}
function f_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(a0){return d_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(a0);}
function f_7c8ea52ee301ca514d7e2006bf0470e492a11a8301ff911af4b792587831c232(a0,a1){return __run(d_7c8ea52ee301ca514d7e2006bf0470e492a11a8301ff911af4b792587831c232(a0,a1));}
function f_905d11c6176db15c2c7553180f82311f91721aec65c089fabcb4fb16564b99b7(a0,a1){return __run(d_905d11c6176db15c2c7553180f82311f91721aec65c089fabcb4fb16564b99b7(a0,a1));}
function f_97d06ef935a3d8622ec65971b15007a56226c9416f1a6d8c3715ad96cf36e81f(a0,a1,a2,a3,a4,a5){return __run(d_97d06ef935a3d8622ec65971b15007a56226c9416f1a6d8c3715ad96cf36e81f(a0,a1,a2,a3,a4,a5));}
function f_bc4d015ad149ec5c0d70a8274a7cf3d6fa0f70a959f9c1f0fc1ffc56874c1733(a0,a1,a2,a3){return __run(d_bc4d015ad149ec5c0d70a8274a7cf3d6fa0f70a959f9c1f0fc1ffc56874c1733(a0,a1,a2,a3));}
function f_c9c90db0e7b8c312a993015e941adb30051ef78556af109c44754960eee0ba2d(a0){return d_c9c90db0e7b8c312a993015e941adb30051ef78556af109c44754960eee0ba2d(a0);}
function f_db40c28ca38f9868ed7cdb9d8e56215bead63bb1860b608501d664d3fb5ced54(a0){return d_db40c28ca38f9868ed7cdb9d8e56215bead63bb1860b608501d664d3fb5ced54(a0);}
function f_267afceb9a54b756d7d780bb1dc5f711cb9e38751d6d54e31458cd7d922c2ae6(a0){return d_267afceb9a54b756d7d780bb1dc5f711cb9e38751d6d54e31458cd7d922c2ae6(a0);}
function f_7a776bf4cdca1f4421e417e46250e10eb5e5869e4e19a42a87e2834fc69f78b9(a0){return d_7a776bf4cdca1f4421e417e46250e10eb5e5869e4e19a42a87e2834fc69f78b9(a0);}
function f_f97a4b18aa60ede004ab440d47c690792d1c51147a1b5bfd09475b0488e44897(a0){return d_f97a4b18aa60ede004ab440d47c690792d1c51147a1b5bfd09475b0488e44897(a0);}
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
const initial=__node(0,[__node(0,[])]);let physical=f_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(initial);
function boundary(){if(busy)throw Error('state operation already in progress');}
async function invoke_json(name,args){boundary();switch(name){
case "put":{
const a0=read_1(args[0],0);
const a1=read_1(args[1],0);
const a2=read_0(args[2],0);
const a3=read_0(args[3],0);
const executed=f_97d06ef935a3d8622ec65971b15007a56226c9416f1a6d8c3715ad96cf36e81f(physical,version,a0,a1,a2,a3);const observed=f_f97a4b18aa60ede004ab440d47c690792d1c51147a1b5bfd09475b0488e44897(executed),next=f_c9c90db0e7b8c312a993015e941adb30051ef78556af109c44754960eee0ba2d(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_8(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "erase":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_bc4d015ad149ec5c0d70a8274a7cf3d6fa0f70a959f9c1f0fc1ffc56874c1733(physical,version,a0,a1);const observed=f_f97a4b18aa60ede004ab440d47c690792d1c51147a1b5bfd09475b0488e44897(executed),next=f_c9c90db0e7b8c312a993015e941adb30051ef78556af109c44754960eee0ba2d(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_8(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "total_query":{
const executed=f_905d11c6176db15c2c7553180f82311f91721aec65c089fabcb4fb16564b99b7(physical,version);const observed=f_7a776bf4cdca1f4421e417e46250e10eb5e5869e4e19a42a87e2834fc69f78b9(executed),next=f_674e4f1f94aa35f9d19eea4f05299421f31bb3a8da9fe8ba4063fe093851740a(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
case "count_query":{
const executed=f_7c8ea52ee301ca514d7e2006bf0470e492a11a8301ff911af4b792587831c232(physical,version);const observed=f_267afceb9a54b756d7d780bb1dc5f711cb9e38751d6d54e31458cd7d922c2ae6(executed),next=f_db40c28ca38f9868ed7cdb9d8e56215bead63bb1860b608501d664d3fb5ced54(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,,events]=observed.a;const result=write_1(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;return {result,committed,version,events:published};}
default:throw Error(`unknown action ${name}`);}}
return Object.freeze({invoke:invoke_json,invoke_json,beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');transaction=null;},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;transaction=null;},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_540aaca1eed8035a25cb8f51a32e3b31389e9e6a03a665ea663f35aed8226306(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);const next=f_715d0e9a534d1c83efa3d8cbc90338c7062d0770f76fe5f981183c5dfe8a6b57(logical);physical=next;version=saved.version;outbox=saved.outbox;}finally{busy=false;}}});}
function __publicEvent(channel,value){switch(channel){
case "seen":return write_1(read_1(value,0,true),0,false);
default:throw Error('unknown source event');}}

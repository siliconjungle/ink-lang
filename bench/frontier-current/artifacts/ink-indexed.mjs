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
function d_03298824eef80e61c5d610b0d055588c3b5e18f3e4a0069e0c629ff952a4dfff(a0){let v0;switch(a0.c){
case 0:{
const v3=false;
const v2=__node(0,[v3]);
v0=v2;break;}
case 1:{
const v5=false;
const v4=__node(0,[v5]);
v0=v4;break;}
case 2:{
const v7=false;
const v6=__node(0,[v7]);
v0=v6;break;}
case 3:{
const v9=false;
const v8=__node(0,[v9]);
v0=v8;break;}
case 4:{
const v13=0n;
const v11=(a0.a[0])===(v13);
let v10;if(v11){
let v14;switch(a0.a[1].c){
case 0:{
const v17=false;
const v16=__node(0,[v17]);
v14=v16;break;}
case 1:{
const v19=false;
const v18=__node(0,[v19]);
v14=v18;break;}
case 2:{
const v21=false;
const v20=__node(0,[v21]);
v14=v20;break;}
case 3:{
let v22;switch(a0.a[1].a[1].c){
case 0:{
const v25=d_32feeed0ef0e575804563216399ba5caee6f40801013e7febc06526a428b9c05(a0.a[1].a[0]);
const v24=__node(0,[v25]);
v22=v24;break;}
case 1:{
const v28=false;
const v27=__node(0,[v28]);
v22=v27;break;}
case 2:{
const v30=false;
const v29=__node(0,[v30]);
v22=v29;break;}
case 3:{
const v32=false;
const v31=__node(0,[v32]);
v22=v31;break;}
case 4:{
const v34=false;
const v33=__node(0,[v34]);
v22=v33;break;}
default:throw Error('literal constructor projection');}
v14=v22;break;}
case 4:{
const v36=false;
const v35=__node(0,[v36]);
v14=v35;break;}
default:throw Error('literal constructor projection');}
v10=v14;}else{
const v38=false;
const v37=__node(0,[v38]);
v10=v37;}
v0=v10;break;}
default:throw Error('literal constructor projection');}
return v0;}
function d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(a0){let v39;switch(a0.c){
case 0:{
v39=a0.a[0];break;}
default:throw Error('literal constructor projection');}
return v39;}
function d_05ffd0570ccc7655dca87d4bab899c9fbfdf45d5352d3ea336ab231ff18961a2(a0){let v42;switch(a0.c){
case 0:{
v42=a0.a[3];break;}
case 1:{
v42=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v42;}
function* d_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0){let v46;switch(a0.c){
case 0:{
const v49=__nullaryNode(0);
const v48=__node(0,[v49]);
v46=v48;break;}
case 1:{
const v51=__nullaryNode(0);
const v50=__node(0,[v51]);
v46=v50;break;}
case 2:{
const v53=__nullaryNode(0);
const v52=__node(0,[v53]);
v46=v52;break;}
case 3:{
const v55=__nullaryNode(0);
const v54=__node(0,[v55]);
v46=v54;break;}
case 4:{
const v59=0n;
const v57=(a0.a[0])===(v59);
let v56;if(v57){
let v60;switch(a0.a[1].c){
case 0:{
const v63=__nullaryNode(0);
const v62=__node(0,[v63]);
v60=v62;break;}
case 1:{
const v65=__nullaryNode(0);
const v64=__node(0,[v65]);
v60=v64;break;}
case 2:{
const v67=__nullaryNode(0);
const v66=__node(0,[v67]);
v60=v66;break;}
case 3:{
let v68;switch(a0.a[1].a[1].c){
case 0:{
const v71=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v70=__node(0,[v71]);
v68=v70;break;}
case 1:{
const v74=__nullaryNode(0);
const v73=__node(0,[v74]);
v68=v73;break;}
case 2:{
const v76=__nullaryNode(0);
const v75=__node(0,[v76]);
v68=v75;break;}
case 3:{
const v78=__nullaryNode(0);
const v77=__node(0,[v78]);
v68=v77;break;}
case 4:{
const v80=__nullaryNode(0);
const v79=__node(0,[v80]);
v68=v79;break;}
default:throw Error('literal constructor projection');}
v60=v68;break;}
case 4:{
const v82=__nullaryNode(0);
const v81=__node(0,[v82]);
v60=v81;break;}
default:throw Error('literal constructor projection');}
v56=v60;}else{
const v84=__nullaryNode(0);
const v83=__node(0,[v84]);
v56=v83;}
v46=v56;break;}
default:throw Error('literal constructor projection');}
return v46;}
function d_114ce5fc88cab5a19bac748f711cdc98ce30c8e2e5dce4e358591543d20cdb96(a0){let v85;switch(a0.c){
case 0:{
const v87=0n;
v85=v87;break;}
case 1:{
const v88=d_4338ec4c0e2c813b0b789012f85ed789218cd89514cbf9b8cc91ef21fca53f71(a0.a[1]);
v85=v88;break;}
case 2:{
v85=a0.a[5];break;}
default:throw Error('literal constructor projection');}
return v85;}
function* d_12c738c0e30827ae33ba32ddc8efbededcaf228ded8b93018e9c67d2c4f9b0c8(a0,a1,a2){const v93=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v95=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v92=(v93)<(v95);
let v91;if(v92){
let v97;switch(a1.c){
case 0:{
const v101=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v99=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v101);
v97=v99;break;}
case 1:{
const v106=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v104=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v106);
v97=v104;break;}
case 2:{
const v110=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1.a[0]);
const v113=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1.a[1],a2);
const v109=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v110,v113);
v97=v109;break;}
default:throw Error('literal constructor projection');}
v91=v97;}else{
const v118=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v116=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v118);
v91=v116;}
return v91;}
function* d_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(a0,a1,a2,a3){let v121;switch(a0.c){
case 0:{
let v123;if(a3){
const v127=__nullaryNode(0);
const v126=__node(1,[v127]);
const v128=false;
const v130=__node(0,[a0.a[0]]);
const v132=__nullaryNode(0);
const v125=__node(0,[v126,v128,a1,v130,v132]);
v123=v125;}else{
const v136=18446744073709551615n;
const v134=(a1)===(v136);
let v133;if(v134){
const v138=1n;
const v140=__node(0,[a0.a[0]]);
const v137=__node(1,[v138,a1,v140]);
v133=v137;}else{
const v144=__nullaryNode(0);
const v143=__node(0,[v144]);
const v145=true;
const v148=1n;
const v146=BigInt.asUintN(64,(a1)+(v148));
const v150=yield d_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[0],a2);
const v149=__node(0,[v150]);
const v155=0n;
const v154=__node(0,[v155]);
const v156=__nullaryNode(0);
const v153=__node(1,[v154,v156]);
const v142=__node(0,[v143,v145,v146,v149,v153]);
v133=v142;}
v123=v133;}
v121=v123;break;}
default:throw Error('literal constructor projection');}
return v121;}
function* d_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0){let v157;switch(a0.c){
case 0:{
const v159=__nullaryNode(0);
v157=v159;break;}
case 1:{
const v163=__nullaryNode(0);
const v160=__node(1,[a0.a[0],a0.a[1],v163]);
v157=v160;break;}
case 2:{
const v165=yield d_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[0]);
const v167=yield d_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[1]);
const v164=yield d_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(v165,v167);
v157=v164;break;}
default:throw Error('literal constructor projection');}
return v157;}
function* d_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(a0,a1,a2,a3,a4){let v169;switch(a0.c){
case 0:{
let v171;if(a4){
const v175=__nullaryNode(0);
const v174=__node(1,[v175]);
const v176=false;
const v178=__node(0,[a0.a[0]]);
const v180=__nullaryNode(0);
const v173=__node(0,[v174,v176,a1,v178,v180]);
v171=v173;}else{
const v184=18446744073709551615n;
const v182=(a1)===(v184);
let v181;if(v182){
const v186=1n;
const v188=__node(0,[a0.a[0]]);
const v185=__node(1,[v186,a1,v188]);
v181=v185;}else{
const v192=__nullaryNode(0);
const v191=__node(0,[v192]);
const v193=true;
const v196=1n;
const v194=BigInt.asUintN(64,(a1)+(v196));
const v200=yield d_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a2);
let v199;switch(v200.c){
case 0:{
const v203=false;
v199=v203;break;}
case 1:{
const v204=true;
v199=v204;break;}
default:throw Error('literal constructor projection');}
let v198;if(v199){
const v205=yield d_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[0],a2,a3);
v198=v205;}else{
const v209=yield d_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[0],a2,a3);
v198=v209;}
const v197=__node(0,[v198]);
let v215;switch(a3.c){
case 0:{
v215=a3.a[0];break;}
default:throw Error('literal constructor projection');}
const v214=__node(0,[v215]);
const v218=__nullaryNode(0);
const v213=__node(1,[v214,v218]);
const v190=__node(0,[v191,v193,v194,v197,v213]);
v181=v190;}
v171=v181;}
v169=v171;break;}
default:throw Error('literal constructor projection');}
return v169;}
function* d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){let v219;switch(a0.c){
case 0:{
const v221=__nullaryNode(0);
v219=v221;break;}
case 1:{
const v222=__nullaryNode(0);
v219=v222;break;}
case 2:{
const v223=__nullaryNode(0);
v219=v223;break;}
case 3:{
const v224=__nullaryNode(0);
v219=v224;break;}
case 4:{
const v228=0n;
const v226=(a0.a[0])===(v228);
let v225;if(v226){
let v229;switch(a0.a[1].c){
case 0:{
const v231=__nullaryNode(0);
v229=v231;break;}
case 1:{
const v232=__nullaryNode(0);
v229=v232;break;}
case 2:{
const v233=__nullaryNode(0);
v229=v233;break;}
case 3:{
const v234=__nullaryNode(0);
v229=v234;break;}
case 4:{
const v235=__nullaryNode(0);
v229=v235;break;}
default:throw Error('literal constructor projection');}
v225=v229;}else{
const v239=1n;
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
let v245;switch(a0.a[1].a[1].c){
case 0:{
const v247=__nullaryNode(0);
v245=v247;break;}
case 1:{
const v248=__nullaryNode(0);
v245=v248;break;}
case 2:{
const v249=__nullaryNode(0);
v245=v249;break;}
case 3:{
let v250;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v253=d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0.a[1].a[0]);
const v255=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[1].a[0]);
const v252=__node(1,[v253,v255]);
v250=v252;break;}
case 1:{
const v257=__nullaryNode(0);
v250=v257;break;}
case 2:{
const v258=__nullaryNode(0);
v250=v258;break;}
case 3:{
const v259=__nullaryNode(0);
v250=v259;break;}
case 4:{
const v260=__nullaryNode(0);
v250=v260;break;}
default:throw Error('literal constructor projection');}
v245=v250;break;}
case 4:{
const v261=__nullaryNode(0);
v245=v261;break;}
default:throw Error('literal constructor projection');}
v240=v245;break;}
case 4:{
const v262=__nullaryNode(0);
v240=v262;break;}
default:throw Error('literal constructor projection');}
v236=v240;}else{
const v263=__nullaryNode(0);
v236=v263;}
v225=v236;}
v219=v225;break;}
default:throw Error('literal constructor projection');}
return v219;}
function* d_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(a0){let v264;switch(a0.c){
case 0:{
const v267=0n;
const v269=d_a6e6be603ffc708d75702b41b4951c9610ef010501658e8e255d0cb0930c73ae(a0.a[0]);
const v271=__nullaryNode(0);
const v268=__node(3,[v269,v271]);
const v266=__node(4,[v267,v268]);
v264=v266;break;}
case 1:{
const v273=1n;
const v275=yield d_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0.a[0]);
const v277=__nullaryNode(0);
const v274=__node(3,[v275,v277]);
const v272=__node(4,[v273,v274]);
v264=v272;break;}
default:throw Error('literal constructor projection');}
return v264;}
function d_240b4d82770aa55288bc615c5de18ec6664a8b220af957a3d2818e2547879117(a0){let v278;switch(a0.c){
case 0:{
v278=a0.a[3];break;}
case 1:{
v278=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v278;}
function* d_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0){let v282;switch(a0.c){
case 0:{
const v285=0n;
const v287=yield d_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0.a[0]);
const v289=__nullaryNode(0);
const v286=__node(3,[v287,v289]);
const v284=__node(4,[v285,v286]);
v282=v284;break;}
case 1:{
const v291=1n;
const v293=yield d_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0.a[0]);
const v295=__nullaryNode(0);
const v292=__node(3,[v293,v295]);
const v290=__node(4,[v291,v292]);
v282=v290;break;}
default:throw Error('literal constructor projection');}
return v282;}
function* d_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a0,a1){const v296=yield d_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0,a1);
return v296;}
function* d_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0,a1){const v303=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v301=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v303);
const v306=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v305=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v306,a1);
const v300=(v301)||(v305);
let v299;if(v300){
v299=a0;}else{
let v310;switch(a0.c){
case 0:{
const v312=__nullaryNode(0);
v310=v312;break;}
case 1:{
const v314=yield d_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v313;if(v314){
const v317=__nullaryNode(0);
v313=v317;}else{
const v318=__node(1,[a0.a[0],a0.a[1]]);
v313=v318;}
v310=v313;break;}
case 2:{
const v322=yield d_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[0],a1);
const v325=yield d_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[1],a1);
const v321=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v322,v325);
v310=v321;break;}
default:throw Error('literal constructor projection');}
v299=v310;}
return v299;}
function* d_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(a0){let v328;switch(a0.c){
case 0:{
const v330=__nullaryNode(0);
v328=v330;break;}
case 1:{
let v332;switch(a0.a[0].c){
case 0:{
v332=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v335=yield d_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(a0.a[1]);
const v331=__node(1,[v332,v335]);
v328=v331;break;}
default:throw Error('literal constructor projection');}
return v328;}
function* d_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0,a1){const v338=yield d_dbedb8fa453e46bc9cf3454751e4797067eecbf51e094214b9c9deee1238483d(a0,a1);
const v337=__node(0,[v338]);
return v337;}
function* d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){let v341;switch(a0.c){
case 0:{
const v343=__nullaryNode(0);
v341=v343;break;}
case 1:{
const v344=__nullaryNode(0);
v341=v344;break;}
case 2:{
const v345=__nullaryNode(0);
v341=v345;break;}
case 3:{
const v346=__nullaryNode(0);
v341=v346;break;}
case 4:{
const v350=0n;
const v348=(a0.a[0])===(v350);
let v347;if(v348){
let v351;switch(a0.a[1].c){
case 0:{
const v353=__nullaryNode(0);
v351=v353;break;}
case 1:{
const v354=__nullaryNode(0);
v351=v354;break;}
case 2:{
const v355=__nullaryNode(0);
v351=v355;break;}
case 3:{
const v356=__nullaryNode(0);
v351=v356;break;}
case 4:{
const v357=__nullaryNode(0);
v351=v357;break;}
default:throw Error('literal constructor projection');}
v347=v351;}else{
const v361=1n;
const v359=(a0.a[0])===(v361);
let v358;if(v359){
let v362;switch(a0.a[1].c){
case 0:{
const v364=__nullaryNode(0);
v362=v364;break;}
case 1:{
const v365=__nullaryNode(0);
v362=v365;break;}
case 2:{
const v366=__nullaryNode(0);
v362=v366;break;}
case 3:{
let v367;switch(a0.a[1].a[1].c){
case 0:{
const v369=__nullaryNode(0);
v367=v369;break;}
case 1:{
const v370=__nullaryNode(0);
v367=v370;break;}
case 2:{
const v371=__nullaryNode(0);
v367=v371;break;}
case 3:{
let v372;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v376=yield d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0.a[1].a[1].a[0]);
const v374=__node(1,[a0.a[1].a[0],v376]);
v372=v374;break;}
case 1:{
const v378=__nullaryNode(0);
v372=v378;break;}
case 2:{
const v379=__nullaryNode(0);
v372=v379;break;}
case 3:{
const v380=__nullaryNode(0);
v372=v380;break;}
case 4:{
const v381=__nullaryNode(0);
v372=v381;break;}
default:throw Error('literal constructor projection');}
v367=v372;break;}
case 4:{
const v382=__nullaryNode(0);
v367=v382;break;}
default:throw Error('literal constructor projection');}
v362=v367;break;}
case 4:{
const v383=__nullaryNode(0);
v362=v383;break;}
default:throw Error('literal constructor projection');}
v358=v362;}else{
const v384=__nullaryNode(0);
v358=v384;}
v347=v358;}
v341=v347;break;}
default:throw Error('literal constructor projection');}
return v341;}
function d_32feeed0ef0e575804563216399ba5caee6f40801013e7febc06526a428b9c05(a0){let v385;switch(a0.c){
case 0:{
const v387=false;
v385=v387;break;}
case 1:{
const v388=false;
v385=v388;break;}
case 2:{
v385=a0.a[0];break;}
case 3:{
const v390=false;
v385=v390;break;}
case 4:{
const v391=false;
v385=v391;break;}
default:throw Error('literal constructor projection');}
return v385;}
function* d_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0){let v392;switch(a0.c){
case 0:{
const v396=__nullaryNode(0);
const v395=__node(0,[v396]);
const v394=__node(0,[v395]);
v392=v394;break;}
case 1:{
const v399=__nullaryNode(0);
const v398=__node(0,[v399]);
const v397=__node(0,[v398]);
v392=v397;break;}
case 2:{
const v402=__nullaryNode(0);
const v401=__node(0,[v402]);
const v400=__node(0,[v401]);
v392=v400;break;}
case 3:{
const v405=__nullaryNode(0);
const v404=__node(0,[v405]);
const v403=__node(0,[v404]);
v392=v403;break;}
case 4:{
const v409=0n;
const v407=(a0.a[0])===(v409);
let v406;if(v407){
let v410;switch(a0.a[1].c){
case 0:{
const v414=__nullaryNode(0);
const v413=__node(0,[v414]);
const v412=__node(0,[v413]);
v410=v412;break;}
case 1:{
const v417=__nullaryNode(0);
const v416=__node(0,[v417]);
const v415=__node(0,[v416]);
v410=v415;break;}
case 2:{
const v420=__nullaryNode(0);
const v419=__node(0,[v420]);
const v418=__node(0,[v419]);
v410=v418;break;}
case 3:{
let v421;switch(a0.a[1].a[1].c){
case 0:{
const v424=yield d_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0.a[1].a[0]);
const v423=__node(0,[v424]);
v421=v423;break;}
case 1:{
const v428=__nullaryNode(0);
const v427=__node(0,[v428]);
const v426=__node(0,[v427]);
v421=v426;break;}
case 2:{
const v431=__nullaryNode(0);
const v430=__node(0,[v431]);
const v429=__node(0,[v430]);
v421=v429;break;}
case 3:{
const v434=__nullaryNode(0);
const v433=__node(0,[v434]);
const v432=__node(0,[v433]);
v421=v432;break;}
case 4:{
const v437=__nullaryNode(0);
const v436=__node(0,[v437]);
const v435=__node(0,[v436]);
v421=v435;break;}
default:throw Error('literal constructor projection');}
v410=v421;break;}
case 4:{
const v440=__nullaryNode(0);
const v439=__node(0,[v440]);
const v438=__node(0,[v439]);
v410=v438;break;}
default:throw Error('literal constructor projection');}
v406=v410;}else{
const v444=1n;
const v442=(a0.a[0])===(v444);
let v441;if(v442){
let v445;switch(a0.a[1].c){
case 0:{
const v449=__nullaryNode(0);
const v448=__node(0,[v449]);
const v447=__node(0,[v448]);
v445=v447;break;}
case 1:{
const v452=__nullaryNode(0);
const v451=__node(0,[v452]);
const v450=__node(0,[v451]);
v445=v450;break;}
case 2:{
const v455=__nullaryNode(0);
const v454=__node(0,[v455]);
const v453=__node(0,[v454]);
v445=v453;break;}
case 3:{
let v456;switch(a0.a[1].a[1].c){
case 0:{
const v459=yield d_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0.a[1].a[0]);
const v458=__node(1,[v459]);
v456=v458;break;}
case 1:{
const v463=__nullaryNode(0);
const v462=__node(0,[v463]);
const v461=__node(0,[v462]);
v456=v461;break;}
case 2:{
const v466=__nullaryNode(0);
const v465=__node(0,[v466]);
const v464=__node(0,[v465]);
v456=v464;break;}
case 3:{
const v469=__nullaryNode(0);
const v468=__node(0,[v469]);
const v467=__node(0,[v468]);
v456=v467;break;}
case 4:{
const v472=__nullaryNode(0);
const v471=__node(0,[v472]);
const v470=__node(0,[v471]);
v456=v470;break;}
default:throw Error('literal constructor projection');}
v445=v456;break;}
case 4:{
const v475=__nullaryNode(0);
const v474=__node(0,[v475]);
const v473=__node(0,[v474]);
v445=v473;break;}
default:throw Error('literal constructor projection');}
v441=v445;}else{
const v478=__nullaryNode(0);
const v477=__node(0,[v478]);
const v476=__node(0,[v477]);
v441=v476;}
v406=v441;}
v392=v406;break;}
default:throw Error('literal constructor projection');}
return v392;}
function* d_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(a0,a1){let v479;switch(a0.c){
case 0:{
v479=a1;break;}
case 1:{
const v485=yield d_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(a0.a[2],a1);
const v482=__node(1,[a0.a[0],a0.a[1],v485]);
v479=v482;break;}
default:throw Error('literal constructor projection');}
return v479;}
function* d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){let v488;switch(a0.c){
case 0:{
const v491=0n;
const v492=__nullaryNode(0);
const v490=__node(4,[v491,v492]);
v488=v490;break;}
case 1:{
const v494=1n;
const v496=d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0.a[0]);
const v499=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[1]);
const v501=__nullaryNode(0);
const v498=__node(3,[v499,v501]);
const v495=__node(3,[v496,v498]);
const v493=__node(4,[v494,v495]);
v488=v493;break;}
default:throw Error('literal constructor projection');}
return v488;}
function d_427b0b37997e853e4c3ce1211556fbd99b80f84a972a4862d8ed930df0cab652(a0){let v502;switch(a0.c){
case 0:{
const v504=__nullaryNode(0);
v502=v504;break;}
case 1:{
const v505=__nullaryNode(0);
v502=v505;break;}
case 2:{
const v506=__nullaryNode(0);
v502=v506;break;}
case 3:{
const v507=__nullaryNode(0);
v502=v507;break;}
case 4:{
const v511=0n;
const v509=(a0.a[0])===(v511);
let v508;if(v509){
let v512;switch(a0.a[1].c){
case 0:{
const v514=__nullaryNode(0);
v512=v514;break;}
case 1:{
const v515=__nullaryNode(0);
v512=v515;break;}
case 2:{
const v516=__nullaryNode(0);
v512=v516;break;}
case 3:{
const v517=__nullaryNode(0);
v512=v517;break;}
case 4:{
const v518=__nullaryNode(0);
v512=v518;break;}
default:throw Error('literal constructor projection');}
v508=v512;}else{
const v519=__nullaryNode(0);
v508=v519;}
v502=v508;break;}
default:throw Error('literal constructor projection');}
return v502;}
function d_4338ec4c0e2c813b0b789012f85ed789218cd89514cbf9b8cc91ef21fca53f71(a0){const v520=0n;
return v520;}
function* d_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0){let v521;switch(a0.c){
case 0:{
const v524=__nullaryNode(0);
const v523=__node(0,[v524]);
v521=v523;break;}
case 1:{
const v526=__nullaryNode(0);
const v525=__node(0,[v526]);
v521=v525;break;}
case 2:{
const v528=__nullaryNode(0);
const v527=__node(0,[v528]);
v521=v527;break;}
case 3:{
const v530=__nullaryNode(0);
const v529=__node(0,[v530]);
v521=v529;break;}
case 4:{
const v534=0n;
const v532=(a0.a[0])===(v534);
let v531;if(v532){
let v535;switch(a0.a[1].c){
case 0:{
const v538=__nullaryNode(0);
const v537=__node(0,[v538]);
v535=v537;break;}
case 1:{
const v540=__nullaryNode(0);
const v539=__node(0,[v540]);
v535=v539;break;}
case 2:{
const v542=__nullaryNode(0);
const v541=__node(0,[v542]);
v535=v541;break;}
case 3:{
let v543;switch(a0.a[1].a[1].c){
case 0:{
const v546=yield d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v545=__node(0,[v546]);
v543=v545;break;}
case 1:{
const v549=__nullaryNode(0);
const v548=__node(0,[v549]);
v543=v548;break;}
case 2:{
const v551=__nullaryNode(0);
const v550=__node(0,[v551]);
v543=v550;break;}
case 3:{
const v553=__nullaryNode(0);
const v552=__node(0,[v553]);
v543=v552;break;}
case 4:{
const v555=__nullaryNode(0);
const v554=__node(0,[v555]);
v543=v554;break;}
default:throw Error('literal constructor projection');}
v535=v543;break;}
case 4:{
const v557=__nullaryNode(0);
const v556=__node(0,[v557]);
v535=v556;break;}
default:throw Error('literal constructor projection');}
v531=v535;}else{
const v559=__nullaryNode(0);
const v558=__node(0,[v559]);
v531=v558;}
v521=v531;break;}
default:throw Error('literal constructor projection');}
return v521;}
function* d_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0){let v560;switch(a0.c){
case 0:{
const v564=__nullaryNode(0);
const v563=__node(0,[v564]);
const v562=__node(0,[v563]);
v560=v562;break;}
case 1:{
const v567=__nullaryNode(0);
const v566=__node(0,[v567]);
const v565=__node(0,[v566]);
v560=v565;break;}
case 2:{
const v570=__nullaryNode(0);
const v569=__node(0,[v570]);
const v568=__node(0,[v569]);
v560=v568;break;}
case 3:{
const v573=__nullaryNode(0);
const v572=__node(0,[v573]);
const v571=__node(0,[v572]);
v560=v571;break;}
case 4:{
const v577=0n;
const v575=(a0.a[0])===(v577);
let v574;if(v575){
let v578;switch(a0.a[1].c){
case 0:{
const v582=__nullaryNode(0);
const v581=__node(0,[v582]);
const v580=__node(0,[v581]);
v578=v580;break;}
case 1:{
const v585=__nullaryNode(0);
const v584=__node(0,[v585]);
const v583=__node(0,[v584]);
v578=v583;break;}
case 2:{
const v588=__nullaryNode(0);
const v587=__node(0,[v588]);
const v586=__node(0,[v587]);
v578=v586;break;}
case 3:{
let v589;switch(a0.a[1].a[1].c){
case 0:{
const v592=yield d_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0.a[1].a[0]);
const v591=__node(0,[v592]);
v589=v591;break;}
case 1:{
const v596=__nullaryNode(0);
const v595=__node(0,[v596]);
const v594=__node(0,[v595]);
v589=v594;break;}
case 2:{
const v599=__nullaryNode(0);
const v598=__node(0,[v599]);
const v597=__node(0,[v598]);
v589=v597;break;}
case 3:{
const v602=__nullaryNode(0);
const v601=__node(0,[v602]);
const v600=__node(0,[v601]);
v589=v600;break;}
case 4:{
const v605=__nullaryNode(0);
const v604=__node(0,[v605]);
const v603=__node(0,[v604]);
v589=v603;break;}
default:throw Error('literal constructor projection');}
v578=v589;break;}
case 4:{
const v608=__nullaryNode(0);
const v607=__node(0,[v608]);
const v606=__node(0,[v607]);
v578=v606;break;}
default:throw Error('literal constructor projection');}
v574=v578;}else{
const v612=1n;
const v610=(a0.a[0])===(v612);
let v609;if(v610){
let v613;switch(a0.a[1].c){
case 0:{
const v617=__nullaryNode(0);
const v616=__node(0,[v617]);
const v615=__node(0,[v616]);
v613=v615;break;}
case 1:{
const v620=__nullaryNode(0);
const v619=__node(0,[v620]);
const v618=__node(0,[v619]);
v613=v618;break;}
case 2:{
const v623=__nullaryNode(0);
const v622=__node(0,[v623]);
const v621=__node(0,[v622]);
v613=v621;break;}
case 3:{
let v624;switch(a0.a[1].a[1].c){
case 0:{
const v627=d_a039048c26d54adb202c40b817021d597559263e9463d68f4e5d1a1c1b25fea5(a0.a[1].a[0]);
const v626=__node(1,[v627]);
v624=v626;break;}
case 1:{
const v631=__nullaryNode(0);
const v630=__node(0,[v631]);
const v629=__node(0,[v630]);
v624=v629;break;}
case 2:{
const v634=__nullaryNode(0);
const v633=__node(0,[v634]);
const v632=__node(0,[v633]);
v624=v632;break;}
case 3:{
const v637=__nullaryNode(0);
const v636=__node(0,[v637]);
const v635=__node(0,[v636]);
v624=v635;break;}
case 4:{
const v640=__nullaryNode(0);
const v639=__node(0,[v640]);
const v638=__node(0,[v639]);
v624=v638;break;}
default:throw Error('literal constructor projection');}
v613=v624;break;}
case 4:{
const v643=__nullaryNode(0);
const v642=__node(0,[v643]);
const v641=__node(0,[v642]);
v613=v641;break;}
default:throw Error('literal constructor projection');}
v609=v613;}else{
const v646=__nullaryNode(0);
const v645=__node(0,[v646]);
const v644=__node(0,[v645]);
v609=v644;}
v574=v609;}
v560=v574;break;}
default:throw Error('literal constructor projection');}
return v560;}
function d_4c4283d9bb9a560f33be06edbc0114c9ded935578cb692cfdb535462f78d9be2(a0){let v647;switch(a0.c){
case 0:{
const v649=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v647=v649;break;}
case 1:{
const v654=__node(1,[a0.a[0],a0.a[1]]);
v647=v654;break;}
default:throw Error('literal constructor projection');}
return v647;}
function* d_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0){let v657;switch(a0.c){
case 0:{
const v660=0n;
const v662=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v664=__nullaryNode(0);
const v661=__node(3,[v662,v664]);
const v659=__node(4,[v660,v661]);
v657=v659;break;}
default:throw Error('literal constructor projection');}
return v657;}
function d_5f767c355aaf0f5fbc953d9ce843d81625d75240e115f4f018fef42ffcd3842d(a0){let v665;switch(a0.c){
case 0:{
const v667=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v665=v667;break;}
case 1:{
const v672=__node(1,[a0.a[0],a0.a[1]]);
v665=v672;break;}
default:throw Error('literal constructor projection');}
return v665;}
function* d_5feaec23975c8663ce24a41f23808087551b31c6b1cfdd1675e0c1418c720017(a0,a1,a2){const v677=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a2);
const v679=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v676=(v677)<(v679);
let v675;if(v676){
let v681;switch(a1.c){
case 0:{
const v684=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v683=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v684,a2);
v681=v683;break;}
case 1:{
const v689=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v688=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v689,a2);
v681=v688;break;}
case 2:{
const v694=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1.a[0]);
const v697=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1.a[1],a2);
const v693=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v694,v697);
v681=v693;break;}
default:throw Error('literal constructor projection');}
v675=v681;}else{
const v701=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v700=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v701,a2);
v675=v700;}
return v675;}
function* d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){let v705;switch(a0.c){
case 0:{
const v708=0n;
const v709=__nullaryNode(0);
const v707=__node(4,[v708,v709]);
v705=v707;break;}
case 1:{
const v711=1n;
const v715=yield d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0.a[1]);
const v717=__nullaryNode(0);
const v714=__node(3,[v715,v717]);
const v712=__node(3,[a0.a[0],v714]);
const v710=__node(4,[v711,v712]);
v705=v710;break;}
default:throw Error('literal constructor projection');}
return v705;}
function* d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1){const v723=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v725=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a1);
const v722=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v723,v725);
let v721;if(v722){
const v727=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
v721=v727;}else{
const v729=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a1);
v721=v729;}
const v733=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v735=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a1);
const v732=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v733,v735);
let v731;if(v732){
const v737=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a1);
v731=v737;}else{
const v739=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
v731=v739;}
const v742=yield d_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a0);
const v744=yield d_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a1);
const v741=d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(v742,v744);
const v747=d_114ce5fc88cab5a19bac748f711cdc98ce30c8e2e5dce4e358591543d20cdb96(a0);
const v749=d_114ce5fc88cab5a19bac748f711cdc98ce30c8e2e5dce4e358591543d20cdb96(a1);
const v746=BigInt.asUintN(64,(v747)+(v749));
const v754=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v756=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v753=(v754)<(v756);
let v752;if(v753){
const v758=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
v752=v758;}else{
const v760=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
v752=v760;}
const v762=1n;
const v751=BigInt.asUintN(64,(v752)+(v762));
const v718=__node(2,[a0,a1,v721,v731,v741,v746,v751]);
return v718;}
function* d_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0){let v763;switch(a0.c){
case 0:{
const v766=0n;
const v768=yield d_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0.a[0]);
const v770=__nullaryNode(0);
const v767=__node(3,[v768,v770]);
const v765=__node(4,[v766,v767]);
v763=v765;break;}
case 1:{
const v772=1n;
const v774=d_e39d391c398088bd47fb3a92c665b301b6d5f6f6e823e8702cd2400a3598833e(a0.a[0]);
const v776=__nullaryNode(0);
const v773=__node(3,[v774,v776]);
const v771=__node(4,[v772,v773]);
v763=v771;break;}
default:throw Error('literal constructor projection');}
return v763;}
function* d_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0,a1,a2){let v777;switch(a0.c){
case 0:{
const v779=__node(1,[a1,a2]);
v777=v779;break;}
case 1:{
const v783=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,a0.a[0]);
let v782;if(v783){
const v787=__node(1,[a1,a2]);
const v790=__node(1,[a0.a[0],a0.a[1]]);
const v786=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v787,v790);
v782=v786;}else{
const v794=__node(1,[a0.a[0],a0.a[1]]);
const v797=__node(1,[a1,a2]);
const v793=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v794,v797);
v782=v793;}
v777=v782;break;}
case 2:{
const v803=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0.a[0]);
const v801=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v803);
let v800;if(v801){
const v806=yield d_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[0],a1,a2);
const v805=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v806,a0.a[1]);
v800=v805;}else{
const v813=yield d_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[1],a1,a2);
const v811=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(a0.a[0],v813);
v800=v811;}
v777=v800;break;}
default:throw Error('literal constructor projection');}
return v777;}
function* d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){let v817;switch(a0.c){
case 0:{
const v819=__nullaryNode(0);
v817=v819;break;}
case 1:{
const v820=__nullaryNode(0);
v817=v820;break;}
case 2:{
const v821=__nullaryNode(0);
v817=v821;break;}
case 3:{
const v822=__nullaryNode(0);
v817=v822;break;}
case 4:{
const v826=0n;
const v824=(a0.a[0])===(v826);
let v823;if(v824){
let v827;switch(a0.a[1].c){
case 0:{
const v829=__nullaryNode(0);
v827=v829;break;}
case 1:{
const v830=__nullaryNode(0);
v827=v830;break;}
case 2:{
const v831=__nullaryNode(0);
v827=v831;break;}
case 3:{
const v832=__nullaryNode(0);
v827=v832;break;}
case 4:{
const v833=__nullaryNode(0);
v827=v833;break;}
default:throw Error('literal constructor projection');}
v823=v827;}else{
const v837=1n;
const v835=(a0.a[0])===(v837);
let v834;if(v835){
let v838;switch(a0.a[1].c){
case 0:{
const v840=__nullaryNode(0);
v838=v840;break;}
case 1:{
const v841=__nullaryNode(0);
v838=v841;break;}
case 2:{
const v842=__nullaryNode(0);
v838=v842;break;}
case 3:{
let v843;switch(a0.a[1].a[1].c){
case 0:{
const v845=__nullaryNode(0);
v843=v845;break;}
case 1:{
const v846=__nullaryNode(0);
v843=v846;break;}
case 2:{
const v847=__nullaryNode(0);
v843=v847;break;}
case 3:{
let v848;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v852=yield d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0.a[1].a[1].a[0]);
const v850=__node(1,[a0.a[1].a[0],v852]);
v848=v850;break;}
case 1:{
const v854=__nullaryNode(0);
v848=v854;break;}
case 2:{
const v855=__nullaryNode(0);
v848=v855;break;}
case 3:{
const v856=__nullaryNode(0);
v848=v856;break;}
case 4:{
const v857=__nullaryNode(0);
v848=v857;break;}
default:throw Error('literal constructor projection');}
v843=v848;break;}
case 4:{
const v858=__nullaryNode(0);
v843=v858;break;}
default:throw Error('literal constructor projection');}
v838=v843;break;}
case 4:{
const v859=__nullaryNode(0);
v838=v859;break;}
default:throw Error('literal constructor projection');}
v834=v838;}else{
const v860=__nullaryNode(0);
v834=v860;}
v823=v834;}
v817=v823;break;}
default:throw Error('literal constructor projection');}
return v817;}
function d_6c354deeb0357c30b83c67ef2f12e55115e3a1508eae6f3f36b2739f09278d90(a0){let v861;switch(a0.c){
case 0:{
v861=a0.a[3];break;}
case 1:{
v861=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v861;}
function d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0){let v865;switch(a0.c){
case 0:{
const v867=0n;
v865=v867;break;}
case 1:{
const v868=1n;
v865=v868;break;}
case 2:{
v865=a0.a[6];break;}
default:throw Error('literal constructor projection');}
return v865;}
function d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0){let v870;switch(a0.c){
case 0:{
const v872=__nullaryNode(0);
v870=v872;break;}
case 1:{
v870=a0.a[0];break;}
case 2:{
v870=a0.a[3];break;}
default:throw Error('literal constructor projection');}
return v870;}
function* d_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0){let v875;switch(a0.c){
case 0:{
const v879=false;
const v878=__node(0,[v879]);
const v877=__node(0,[v878]);
v875=v877;break;}
case 1:{
const v882=false;
const v881=__node(0,[v882]);
const v880=__node(0,[v881]);
v875=v880;break;}
case 2:{
const v885=false;
const v884=__node(0,[v885]);
const v883=__node(0,[v884]);
v875=v883;break;}
case 3:{
const v888=false;
const v887=__node(0,[v888]);
const v886=__node(0,[v887]);
v875=v886;break;}
case 4:{
const v892=0n;
const v890=(a0.a[0])===(v892);
let v889;if(v890){
let v893;switch(a0.a[1].c){
case 0:{
const v897=false;
const v896=__node(0,[v897]);
const v895=__node(0,[v896]);
v893=v895;break;}
case 1:{
const v900=false;
const v899=__node(0,[v900]);
const v898=__node(0,[v899]);
v893=v898;break;}
case 2:{
const v903=false;
const v902=__node(0,[v903]);
const v901=__node(0,[v902]);
v893=v901;break;}
case 3:{
let v904;switch(a0.a[1].a[1].c){
case 0:{
const v907=d_03298824eef80e61c5d610b0d055588c3b5e18f3e4a0069e0c629ff952a4dfff(a0.a[1].a[0]);
const v906=__node(0,[v907]);
v904=v906;break;}
case 1:{
const v911=false;
const v910=__node(0,[v911]);
const v909=__node(0,[v910]);
v904=v909;break;}
case 2:{
const v914=false;
const v913=__node(0,[v914]);
const v912=__node(0,[v913]);
v904=v912;break;}
case 3:{
const v917=false;
const v916=__node(0,[v917]);
const v915=__node(0,[v916]);
v904=v915;break;}
case 4:{
const v920=false;
const v919=__node(0,[v920]);
const v918=__node(0,[v919]);
v904=v918;break;}
default:throw Error('literal constructor projection');}
v893=v904;break;}
case 4:{
const v923=false;
const v922=__node(0,[v923]);
const v921=__node(0,[v922]);
v893=v921;break;}
default:throw Error('literal constructor projection');}
v889=v893;}else{
const v927=1n;
const v925=(a0.a[0])===(v927);
let v924;if(v925){
let v928;switch(a0.a[1].c){
case 0:{
const v932=false;
const v931=__node(0,[v932]);
const v930=__node(0,[v931]);
v928=v930;break;}
case 1:{
const v935=false;
const v934=__node(0,[v935]);
const v933=__node(0,[v934]);
v928=v933;break;}
case 2:{
const v938=false;
const v937=__node(0,[v938]);
const v936=__node(0,[v937]);
v928=v936;break;}
case 3:{
let v939;switch(a0.a[1].a[1].c){
case 0:{
const v942=yield d_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0.a[1].a[0]);
const v941=__node(1,[v942]);
v939=v941;break;}
case 1:{
const v946=false;
const v945=__node(0,[v946]);
const v944=__node(0,[v945]);
v939=v944;break;}
case 2:{
const v949=false;
const v948=__node(0,[v949]);
const v947=__node(0,[v948]);
v939=v947;break;}
case 3:{
const v952=false;
const v951=__node(0,[v952]);
const v950=__node(0,[v951]);
v939=v950;break;}
case 4:{
const v955=false;
const v954=__node(0,[v955]);
const v953=__node(0,[v954]);
v939=v953;break;}
default:throw Error('literal constructor projection');}
v928=v939;break;}
case 4:{
const v958=false;
const v957=__node(0,[v958]);
const v956=__node(0,[v957]);
v928=v956;break;}
default:throw Error('literal constructor projection');}
v924=v928;}else{
const v961=false;
const v960=__node(0,[v961]);
const v959=__node(0,[v960]);
v924=v959;}
v889=v924;}
v875=v889;break;}
default:throw Error('literal constructor projection');}
return v875;}
function d_7fb84a3d8c0cc8dccb1389411ed329f5786f26af2054a718626e4549bd41453c(a0){let v962;switch(a0.c){
case 0:{
const v965=0n;
const v967=d_b3e8018f607dbaccf0be3a1707d96ba1896d760d7e5e12bb588a2875a72756be(a0.a[0]);
const v969=__nullaryNode(0);
const v966=__node(3,[v967,v969]);
const v964=__node(4,[v965,v966]);
v962=v964;break;}
default:throw Error('literal constructor projection');}
return v962;}
function* d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a0,a1){const v970=yield d_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0,a1);
return v970;}
function* d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(a0,a1){const v975=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v978=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v980=1n;
const v977=BigInt.asUintN(64,(v978)+(v980));
const v974=(v975)>(v977);
let v973;if(v974){
const v981=yield d_c14dfd4816837171f0b19554bfc6800dadcadaa19f0f7fd611f66f1a308753df(a0,a1);
v973=v981;}else{
const v984=yield d_fd90a681adb57d4742edf3c18ccf6beb2c9dff11c3f5a2dd296613ddd8827ebf(a0,a1);
v973=v984;}
return v973;}
function* d_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0,a1,a2){const v991=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v989=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v991);
const v994=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v993=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v994,a1);
const v988=(v989)||(v993);
let v987;if(v988){
v987=a0;}else{
let v998;switch(a0.c){
case 0:{
const v1000=__nullaryNode(0);
v998=v1000;break;}
case 1:{
const v1002=yield d_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v1001;if(v1002){
const v1005=__node(1,[a0.a[0],a2]);
v1001=v1005;}else{
const v1008=__node(1,[a0.a[0],a0.a[1]]);
v1001=v1008;}
v998=v1001;break;}
case 2:{
const v1012=yield d_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[0],a1,a2);
const v1016=yield d_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[1],a1,a2);
const v1011=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v1012,v1016);
v998=v1011;break;}
default:throw Error('literal constructor projection');}
v987=v998;}
return v987;}
function d_8cf1aef20be8c6745e1cb36686f8ccde00ff20b5621667d1a445e494a81a6465(a0){let v1020;switch(a0.c){
case 0:{
const v1022=__node(0,[a0.a[0],a0.a[1],a0.a[2],a0.a[4]]);
v1020=v1022;break;}
case 1:{
const v1027=__node(1,[a0.a[0],a0.a[1]]);
v1020=v1027;break;}
default:throw Error('literal constructor projection');}
return v1020;}
function* d_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(a0,a1){let v1030;switch(a0.c){
case 0:{
let v1035;switch(a0.a[0].c){
case 0:{
const v1038=0n;
const v1037=__node(0,[v1038]);
v1035=v1037;break;}
case 1:{
const v1039=yield d_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0.a[0].a[0],a0.a[0].a[1]);
v1035=v1039;break;}
case 2:{
v1035=a0.a[0].a[4];break;}
default:throw Error('literal constructor projection');}
const v1034=d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(v1035);
const v1043=4294967295n;
const v1033=BigInt.asUintN(64,(v1034)&(v1043));
const v1044=false;
const v1046=__node(0,[a0.a[0]]);
const v1048=__nullaryNode(0);
const v1032=__node(0,[v1033,v1044,a1,v1046,v1048]);
v1030=v1032;break;}
default:throw Error('literal constructor projection');}
return v1030;}
function d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0){let v1049;switch(a0.c){
case 0:{
const v1051=__nullaryNode(0);
v1049=v1051;break;}
case 1:{
v1049=a0.a[0];break;}
case 2:{
v1049=a0.a[2];break;}
default:throw Error('literal constructor projection');}
return v1049;}
function d_a039048c26d54adb202c40b817021d597559263e9463d68f4e5d1a1c1b25fea5(a0){let v1054;switch(a0.c){
case 0:{
const v1057=__nullaryNode(0);
const v1056=__node(0,[v1057]);
v1054=v1056;break;}
case 1:{
const v1059=__nullaryNode(0);
const v1058=__node(0,[v1059]);
v1054=v1058;break;}
case 2:{
const v1061=__nullaryNode(0);
const v1060=__node(0,[v1061]);
v1054=v1060;break;}
case 3:{
const v1063=__nullaryNode(0);
const v1062=__node(0,[v1063]);
v1054=v1062;break;}
case 4:{
const v1067=0n;
const v1065=(a0.a[0])===(v1067);
let v1064;if(v1065){
let v1068;switch(a0.a[1].c){
case 0:{
const v1071=__nullaryNode(0);
const v1070=__node(0,[v1071]);
v1068=v1070;break;}
case 1:{
const v1073=__nullaryNode(0);
const v1072=__node(0,[v1073]);
v1068=v1072;break;}
case 2:{
const v1075=__nullaryNode(0);
const v1074=__node(0,[v1075]);
v1068=v1074;break;}
case 3:{
let v1076;switch(a0.a[1].a[1].c){
case 0:{
const v1078=__node(0,[a0.a[1].a[0]]);
v1076=v1078;break;}
case 1:{
const v1081=__nullaryNode(0);
const v1080=__node(0,[v1081]);
v1076=v1080;break;}
case 2:{
const v1083=__nullaryNode(0);
const v1082=__node(0,[v1083]);
v1076=v1082;break;}
case 3:{
const v1085=__nullaryNode(0);
const v1084=__node(0,[v1085]);
v1076=v1084;break;}
case 4:{
const v1087=__nullaryNode(0);
const v1086=__node(0,[v1087]);
v1076=v1086;break;}
default:throw Error('literal constructor projection');}
v1068=v1076;break;}
case 4:{
const v1089=__nullaryNode(0);
const v1088=__node(0,[v1089]);
v1068=v1088;break;}
default:throw Error('literal constructor projection');}
v1064=v1068;}else{
const v1093=1n;
const v1091=(a0.a[0])===(v1093);
let v1090;if(v1091){
let v1094;switch(a0.a[1].c){
case 0:{
const v1097=__nullaryNode(0);
const v1096=__node(0,[v1097]);
v1094=v1096;break;}
case 1:{
const v1099=__nullaryNode(0);
const v1098=__node(0,[v1099]);
v1094=v1098;break;}
case 2:{
const v1101=__nullaryNode(0);
const v1100=__node(0,[v1101]);
v1094=v1100;break;}
case 3:{
let v1102;switch(a0.a[1].a[1].c){
case 0:{
const v1104=__node(1,[a0.a[1].a[0]]);
v1102=v1104;break;}
case 1:{
const v1107=__nullaryNode(0);
const v1106=__node(0,[v1107]);
v1102=v1106;break;}
case 2:{
const v1109=__nullaryNode(0);
const v1108=__node(0,[v1109]);
v1102=v1108;break;}
case 3:{
const v1111=__nullaryNode(0);
const v1110=__node(0,[v1111]);
v1102=v1110;break;}
case 4:{
const v1113=__nullaryNode(0);
const v1112=__node(0,[v1113]);
v1102=v1112;break;}
default:throw Error('literal constructor projection');}
v1094=v1102;break;}
case 4:{
const v1115=__nullaryNode(0);
const v1114=__node(0,[v1115]);
v1094=v1114;break;}
default:throw Error('literal constructor projection');}
v1090=v1094;}else{
const v1117=__nullaryNode(0);
const v1116=__node(0,[v1117]);
v1090=v1116;}
v1064=v1090;}
v1054=v1064;break;}
default:throw Error('literal constructor projection');}
return v1054;}
function* d_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(a0){let v1118;switch(a0.c){
case 0:{
const v1121=__nullaryNode(0);
const v1120=__node(0,[v1121]);
v1118=v1120;break;}
case 1:{
const v1123=__nullaryNode(0);
const v1122=__node(0,[v1123]);
v1118=v1122;break;}
case 2:{
const v1125=__nullaryNode(0);
const v1124=__node(0,[v1125]);
v1118=v1124;break;}
case 3:{
const v1127=__nullaryNode(0);
const v1126=__node(0,[v1127]);
v1118=v1126;break;}
case 4:{
const v1131=0n;
const v1129=(a0.a[0])===(v1131);
let v1128;if(v1129){
let v1132;switch(a0.a[1].c){
case 0:{
const v1135=__nullaryNode(0);
const v1134=__node(0,[v1135]);
v1132=v1134;break;}
case 1:{
const v1137=__nullaryNode(0);
const v1136=__node(0,[v1137]);
v1132=v1136;break;}
case 2:{
const v1139=__nullaryNode(0);
const v1138=__node(0,[v1139]);
v1132=v1138;break;}
case 3:{
let v1140;switch(a0.a[1].a[1].c){
case 0:{
const v1143=d_427b0b37997e853e4c3ce1211556fbd99b80f84a972a4862d8ed930df0cab652(a0.a[1].a[0]);
const v1142=__node(0,[v1143]);
v1140=v1142;break;}
case 1:{
const v1146=__nullaryNode(0);
const v1145=__node(0,[v1146]);
v1140=v1145;break;}
case 2:{
const v1148=__nullaryNode(0);
const v1147=__node(0,[v1148]);
v1140=v1147;break;}
case 3:{
const v1150=__nullaryNode(0);
const v1149=__node(0,[v1150]);
v1140=v1149;break;}
case 4:{
const v1152=__nullaryNode(0);
const v1151=__node(0,[v1152]);
v1140=v1151;break;}
default:throw Error('literal constructor projection');}
v1132=v1140;break;}
case 4:{
const v1154=__nullaryNode(0);
const v1153=__node(0,[v1154]);
v1132=v1153;break;}
default:throw Error('literal constructor projection');}
v1128=v1132;}else{
const v1158=1n;
const v1156=(a0.a[0])===(v1158);
let v1155;if(v1156){
let v1159;switch(a0.a[1].c){
case 0:{
const v1162=__nullaryNode(0);
const v1161=__node(0,[v1162]);
v1159=v1161;break;}
case 1:{
const v1164=__nullaryNode(0);
const v1163=__node(0,[v1164]);
v1159=v1163;break;}
case 2:{
const v1166=__nullaryNode(0);
const v1165=__node(0,[v1166]);
v1159=v1165;break;}
case 3:{
let v1167;switch(a0.a[1].a[1].c){
case 0:{
const v1170=yield d_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0.a[1].a[0]);
const v1169=__node(1,[v1170]);
v1167=v1169;break;}
case 1:{
const v1173=__nullaryNode(0);
const v1172=__node(0,[v1173]);
v1167=v1172;break;}
case 2:{
const v1175=__nullaryNode(0);
const v1174=__node(0,[v1175]);
v1167=v1174;break;}
case 3:{
const v1177=__nullaryNode(0);
const v1176=__node(0,[v1177]);
v1167=v1176;break;}
case 4:{
const v1179=__nullaryNode(0);
const v1178=__node(0,[v1179]);
v1167=v1178;break;}
default:throw Error('literal constructor projection');}
v1159=v1167;break;}
case 4:{
const v1181=__nullaryNode(0);
const v1180=__node(0,[v1181]);
v1159=v1180;break;}
default:throw Error('literal constructor projection');}
v1155=v1159;}else{
const v1183=__nullaryNode(0);
const v1182=__node(0,[v1183]);
v1155=v1182;}
v1128=v1155;}
v1118=v1128;break;}
default:throw Error('literal constructor projection');}
return v1118;}
function* d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){let v1184;switch(a0.c){
case 0:{
const v1187=0n;
const v1188=__nullaryNode(0);
const v1186=__node(4,[v1187,v1188]);
v1184=v1186;break;}
case 1:{
const v1190=1n;
const v1194=yield d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0.a[1]);
const v1196=__nullaryNode(0);
const v1193=__node(3,[v1194,v1196]);
const v1191=__node(3,[a0.a[0],v1193]);
const v1189=__node(4,[v1190,v1191]);
v1184=v1189;break;}
default:throw Error('literal constructor projection');}
return v1184;}
function* d_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(a0,a1,a2){let v1197;switch(a0.c){
case 0:{
const v1199=__node(1,[a1,a2]);
v1197=v1199;break;}
case 1:{
const v1203=__node(1,[a1,a2]);
const v1206=__node(1,[a0.a[0],a0.a[1]]);
const v1202=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v1203,v1206);
v1197=v1202;break;}
case 2:{
const v1210=yield d_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(a0.a[0],a1,a2);
const v1209=yield d_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v1210,a0.a[1]);
v1197=v1209;break;}
default:throw Error('literal constructor projection');}
return v1197;}
function* d_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a0){let v1215;switch(a0.c){
case 0:{
const v1218=0n;
const v1217=__node(0,[v1218]);
v1215=v1217;break;}
case 1:{
const v1219=yield d_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0.a[0],a0.a[1]);
v1215=v1219;break;}
case 2:{
v1215=a0.a[4];break;}
default:throw Error('literal constructor projection');}
return v1215;}
function d_a6e6be603ffc708d75702b41b4951c9610ef010501658e8e255d0cb0930c73ae(a0){let v1223;switch(a0.c){
case 0:{
const v1226=0n;
const v1227=__nullaryNode(0);
const v1225=__node(4,[v1226,v1227]);
v1223=v1225;break;}
default:throw Error('literal constructor projection');}
return v1223;}
function d_b3e8018f607dbaccf0be3a1707d96ba1896d760d7e5e12bb588a2875a72756be(a0){const v1228=__node(2,[a0]);
return v1228;}
function* d_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0){let v1230;switch(a0.c){
case 0:{
const v1232=__nullaryNode(0);
v1230=v1232;break;}
case 1:{
const v1234=yield d_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0.a[2]);
const v1233=yield d_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(v1234,a0.a[0],a0.a[1]);
v1230=v1233;break;}
default:throw Error('literal constructor projection');}
return v1230;}
function* d_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(a0){let v1238;switch(a0.c){
case 0:{
const v1240=0n;
v1238=v1240;break;}
case 1:{
const v1243=yield d_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(a0.a[1]);
const v1241=BigInt.asUintN(64,(a0.a[0])+(v1243));
v1238=v1241;break;}
default:throw Error('literal constructor projection');}
return v1238;}
function d_bd371baa55327eed78b79e9700cd9e761119c3ce3cfd6260279cad2a9a1f798a(a0,a1){let v1245;switch(a0.c){
case 0:{
v1245=a1;break;}
case 1:{
const v1248=__node(1,[a0.a[0]]);
v1245=v1248;break;}
default:throw Error('literal constructor projection');}
return v1245;}
function* d_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(a0,a1,a2){let v1250;switch(a0.c){
case 0:{
const v1253=yield d_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a2);
const v1256=false;
const v1258=__node(0,[a0.a[0]]);
const v1260=__nullaryNode(0);
const v1252=__node(0,[v1253,v1256,a1,v1258,v1260]);
v1250=v1252;break;}
default:throw Error('literal constructor projection');}
return v1250;}
function* d_c14dfd4816837171f0b19554bfc6800dadcadaa19f0f7fd611f66f1a308753df(a0,a1){const v1263=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v1266=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v1268=1n;
const v1265=BigInt.asUintN(64,(v1266)+(v1268));
const v1262=(v1263)>(v1265);
let v1261;if(v1262){
let v1269;switch(a0.c){
case 0:{
const v1271=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1269=v1271;break;}
case 1:{
const v1274=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1269=v1274;break;}
case 2:{
const v1277=yield d_12c738c0e30827ae33ba32ddc8efbededcaf228ded8b93018e9c67d2c4f9b0c8(a0.a[0],a0.a[1],a1);
v1269=v1277;break;}
default:throw Error('literal constructor projection');}
v1261=v1269;}else{
const v1281=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1261=v1281;}
return v1261;}
function* d_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0,a1){let v1284;switch(a0.c){
case 0:{
let v1286;switch(a1.c){
case 0:{
const v1288=false;
v1286=v1288;break;}
case 1:{
const v1289=true;
v1286=v1289;break;}
default:throw Error('literal constructor projection');}
v1284=v1286;break;}
case 1:{
let v1290;switch(a1.c){
case 0:{
const v1292=false;
v1290=v1292;break;}
case 1:{
const v1294=(a0.a[0])===(a1.a[0]);
let v1293;if(v1294){
const v1297=yield d_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0.a[1],a1.a[1]);
v1293=v1297;}else{
const v1300=(a0.a[0])<(a1.a[0]);
v1293=v1300;}
v1290=v1293;break;}
default:throw Error('literal constructor projection');}
v1284=v1290;break;}
default:throw Error('literal constructor projection');}
return v1284;}
function* d_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0,a1){const v1307=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v1305=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v1307);
const v1310=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v1309=yield d_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v1310,a1);
const v1304=(v1305)||(v1309);
let v1303;if(v1304){
const v1313=__nullaryNode(0);
v1303=v1313;}else{
let v1314;switch(a0.c){
case 0:{
const v1316=__nullaryNode(0);
v1314=v1316;break;}
case 1:{
const v1318=yield d_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v1317;if(v1318){
const v1321=__node(1,[a0.a[1]]);
v1317=v1321;}else{
const v1323=__nullaryNode(0);
v1317=v1323;}
v1314=v1317;break;}
case 2:{
const v1325=yield d_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a1);
const v1328=yield d_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[1],a1);
const v1324=d_bd371baa55327eed78b79e9700cd9e761119c3ce3cfd6260279cad2a9a1f798a(v1325,v1328);
v1314=v1324;break;}
default:throw Error('literal constructor projection');}
v1303=v1314;}
return v1303;}
function* d_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0){let v1331;switch(a0.c){
case 0:{
const v1334=0n;
const v1336=d_7fb84a3d8c0cc8dccb1389411ed329f5786f26af2054a718626e4549bd41453c(a0.a[0]);
const v1338=__nullaryNode(0);
const v1335=__node(3,[v1336,v1338]);
const v1333=__node(4,[v1334,v1335]);
v1331=v1333;break;}
case 1:{
const v1340=1n;
const v1342=yield d_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0.a[0]);
const v1344=__nullaryNode(0);
const v1341=__node(3,[v1342,v1344]);
const v1339=__node(4,[v1340,v1341]);
v1331=v1339;break;}
default:throw Error('literal constructor projection');}
return v1331;}
function* d_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(a0){let v1345;switch(a0.c){
case 0:{
const v1348=yield d_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[0]);
const v1347=__node(0,[v1348]);
v1345=v1347;break;}
default:throw Error('literal constructor projection');}
return v1345;}
function* d_dbedb8fa453e46bc9cf3454751e4797067eecbf51e094214b9c9deee1238483d(a0,a1){const v1357=__nullaryNode(0);
const v1354=__node(1,[a0,a1,v1357]);
const v1353=yield d_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(v1354);
const v1352=yield d_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(v1353);
const v1351=yield d_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(v1352);
const v1350=yield d_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(v1351);
return v1350;}
function* d_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0){let v1358;switch(a0.c){
case 0:{
const v1360=__nullaryNode(0);
v1358=v1360;break;}
case 1:{
let v1362;switch(a0.a[0].c){
case 0:{
v1362=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v1361;if(v1362){
const v1367=yield d_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0.a[1]);
const v1365=__node(1,[a0.a[0],v1367]);
v1361=v1365;}else{
const v1369=yield d_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0.a[1]);
v1361=v1369;}
v1358=v1361;break;}
default:throw Error('literal constructor projection');}
return v1358;}
function d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0){let v1371;switch(a0.c){
case 0:{
const v1373=0n;
v1371=v1373;break;}
case 1:{
v1371=a0.a[0];break;}
case 2:{
const v1375=0n;
v1371=v1375;break;}
case 3:{
const v1376=0n;
v1371=v1376;break;}
case 4:{
const v1377=0n;
v1371=v1377;break;}
default:throw Error('literal constructor projection');}
return v1371;}
function* d_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(a0){let v1378;switch(a0.c){
case 0:{
const v1381=yield d_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0.a[0]);
const v1380=__node(0,[v1381]);
v1378=v1380;break;}
default:throw Error('literal constructor projection');}
return v1378;}
function* d_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(a0){let v1383;switch(a0.c){
case 0:{
const v1385=__nullaryNode(0);
v1383=v1385;break;}
case 1:{
const v1388=yield d_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(a0.a[2]);
const v1386=__node(1,[a0.a[1],v1388]);
v1383=v1386;break;}
default:throw Error('literal constructor projection');}
return v1383;}
function d_e39d391c398088bd47fb3a92c665b301b6d5f6f6e823e8702cd2400a3598833e(a0){let v1390;switch(a0.c){
case 0:{
const v1393=0n;
const v1396=__nullaryNode(0);
const v1394=__node(3,[a0.a[0],v1396]);
const v1392=__node(4,[v1393,v1394]);
v1390=v1392;break;}
case 1:{
const v1398=1n;
const v1401=__nullaryNode(0);
const v1399=__node(3,[a0.a[0],v1401]);
const v1397=__node(4,[v1398,v1399]);
v1390=v1397;break;}
default:throw Error('literal constructor projection');}
return v1390;}
function d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(a0,a1){let v1402;switch(a0.c){
case 0:{
let v1404;switch(a1.c){
case 0:{
const v1407=BigInt.asUintN(64,(a0.a[0])+(a1.a[0]));
const v1406=__node(0,[v1407]);
v1404=v1406;break;}
default:throw Error('literal constructor projection');}
v1402=v1404;break;}
default:throw Error('literal constructor projection');}
return v1402;}
function* d_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0){let v1410;switch(a0.c){
case 0:{
const v1413=0n;
const v1415=yield d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v1417=__nullaryNode(0);
const v1414=__node(3,[v1415,v1417]);
const v1412=__node(4,[v1413,v1414]);
v1410=v1412;break;}
default:throw Error('literal constructor projection');}
return v1410;}
function* d_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0,a1){let v1418;switch(a0.c){
case 0:{
let v1420;switch(a1.c){
case 0:{
const v1422=true;
v1420=v1422;break;}
case 1:{
const v1423=false;
v1420=v1423;break;}
default:throw Error('literal constructor projection');}
v1418=v1420;break;}
case 1:{
let v1424;switch(a1.c){
case 0:{
const v1426=false;
v1424=v1426;break;}
case 1:{
const v1428=(a0.a[0])===(a1.a[0]);
let v1427;if(v1428){
const v1432=yield d_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0.a[1],a1.a[1]);
let v1431;if(v1432){
const v1435=true;
v1431=v1435;}else{
const v1436=false;
v1431=v1436;}
v1427=v1431;}else{
const v1437=false;
v1427=v1437;}
v1424=v1427;break;}
default:throw Error('literal constructor projection');}
v1418=v1424;break;}
default:throw Error('literal constructor projection');}
return v1418;}
function d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0){const v1438=__node(1,[a0]);
return v1438;}
function* d_fd90a681adb57d4742edf3c18ccf6beb2c9dff11c3f5a2dd296613ddd8827ebf(a0,a1){const v1442=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v1445=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v1447=1n;
const v1444=BigInt.asUintN(64,(v1445)+(v1447));
const v1441=(v1442)>(v1444);
let v1440;if(v1441){
let v1448;switch(a1.c){
case 0:{
const v1450=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1448=v1450;break;}
case 1:{
const v1453=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1448=v1453;break;}
case 2:{
const v1456=yield d_5feaec23975c8663ce24a41f23808087551b31c6b1cfdd1675e0c1418c720017(a0,a1.a[0],a1.a[1]);
v1448=v1456;break;}
default:throw Error('literal constructor projection');}
v1440=v1448;}else{
const v1460=yield d_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1440=v1460;}
return v1440;}
function dFast_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v0;switch(a0.c){
case 0:{
const v3=__nullaryNode(0);
const v2=__node(0,[v3]);
v0=v2;break;}
case 1:{
const v5=__nullaryNode(0);
const v4=__node(0,[v5]);
v0=v4;break;}
case 2:{
const v7=__nullaryNode(0);
const v6=__node(0,[v7]);
v0=v6;break;}
case 3:{
const v9=__nullaryNode(0);
const v8=__node(0,[v9]);
v0=v8;break;}
case 4:{
const v13=0n;
const v11=(a0.a[0])===(v13);
let v10;if(v11){
let v14;switch(a0.a[1].c){
case 0:{
const v17=__nullaryNode(0);
const v16=__node(0,[v17]);
v14=v16;break;}
case 1:{
const v19=__nullaryNode(0);
const v18=__node(0,[v19]);
v14=v18;break;}
case 2:{
const v21=__nullaryNode(0);
const v20=__node(0,[v21]);
v14=v20;break;}
case 3:{
let v22;switch(a0.a[1].a[1].c){
case 0:{
const v25=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v24=__node(0,[v25]);
v22=v24;break;}
case 1:{
const v28=__nullaryNode(0);
const v27=__node(0,[v28]);
v22=v27;break;}
case 2:{
const v30=__nullaryNode(0);
const v29=__node(0,[v30]);
v22=v29;break;}
case 3:{
const v32=__nullaryNode(0);
const v31=__node(0,[v32]);
v22=v31;break;}
case 4:{
const v34=__nullaryNode(0);
const v33=__node(0,[v34]);
v22=v33;break;}
default:throw Error('literal constructor projection');}
v14=v22;break;}
case 4:{
const v36=__nullaryNode(0);
const v35=__node(0,[v36]);
v14=v35;break;}
default:throw Error('literal constructor projection');}
v10=v14;}else{
const v38=__nullaryNode(0);
const v37=__node(0,[v38]);
v10=v37;}
v0=v10;break;}
default:throw Error('literal constructor projection');}
return v0;}finally{__directDepth--;}}
function dFast_12c738c0e30827ae33ba32ddc8efbededcaf228ded8b93018e9c67d2c4f9b0c8(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v41=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v43=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v40=(v41)<(v43);
let v39;if(v40){
let v45;switch(a1.c){
case 0:{
const v49=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v47=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v49);
v45=v47;break;}
case 1:{
const v54=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v52=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v54);
v45=v52;break;}
case 2:{
const v58=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1.a[0]);
const v61=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1.a[1],a2);
const v57=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v58,v61);
v45=v57;break;}
default:throw Error('literal constructor projection');}
v39=v45;}else{
const v66=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1,a2);
const v64=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,v66);
v39=v64;}
return v39;}finally{__directDepth--;}}
function dFast_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(a0,a1,a2,a3){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v69;switch(a0.c){
case 0:{
let v71;if(a3){
const v75=__nullaryNode(0);
const v74=__node(1,[v75]);
const v76=false;
const v78=__node(0,[a0.a[0]]);
const v80=__nullaryNode(0);
const v73=__node(0,[v74,v76,a1,v78,v80]);
v71=v73;}else{
const v84=18446744073709551615n;
const v82=(a1)===(v84);
let v81;if(v82){
const v86=1n;
const v88=__node(0,[a0.a[0]]);
const v85=__node(1,[v86,a1,v88]);
v81=v85;}else{
const v92=__nullaryNode(0);
const v91=__node(0,[v92]);
const v93=true;
const v96=1n;
const v94=BigInt.asUintN(64,(a1)+(v96));
const v98=dFast_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[0],a2);
const v97=__node(0,[v98]);
const v103=0n;
const v102=__node(0,[v103]);
const v104=__nullaryNode(0);
const v101=__node(1,[v102,v104]);
const v90=__node(0,[v91,v93,v94,v97,v101]);
v81=v90;}
v71=v81;}
v69=v71;break;}
default:throw Error('literal constructor projection');}
return v69;}finally{__directDepth--;}}
function dFast_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v105;switch(a0.c){
case 0:{
const v107=__nullaryNode(0);
v105=v107;break;}
case 1:{
const v111=__nullaryNode(0);
const v108=__node(1,[a0.a[0],a0.a[1],v111]);
v105=v108;break;}
case 2:{
const v113=dFast_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[0]);
const v115=dFast_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[1]);
const v112=dFast_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(v113,v115);
v105=v112;break;}
default:throw Error('literal constructor projection');}
return v105;}finally{__directDepth--;}}
function dFast_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(a0,a1,a2,a3,a4){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v117;switch(a0.c){
case 0:{
let v119;if(a4){
const v123=__nullaryNode(0);
const v122=__node(1,[v123]);
const v124=false;
const v126=__node(0,[a0.a[0]]);
const v128=__nullaryNode(0);
const v121=__node(0,[v122,v124,a1,v126,v128]);
v119=v121;}else{
const v132=18446744073709551615n;
const v130=(a1)===(v132);
let v129;if(v130){
const v134=1n;
const v136=__node(0,[a0.a[0]]);
const v133=__node(1,[v134,a1,v136]);
v129=v133;}else{
const v140=__nullaryNode(0);
const v139=__node(0,[v140]);
const v141=true;
const v144=1n;
const v142=BigInt.asUintN(64,(a1)+(v144));
const v148=dFast_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a2);
let v147;switch(v148.c){
case 0:{
const v151=false;
v147=v151;break;}
case 1:{
const v152=true;
v147=v152;break;}
default:throw Error('literal constructor projection');}
let v146;if(v147){
const v153=dFast_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[0],a2,a3);
v146=v153;}else{
const v157=dFast_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[0],a2,a3);
v146=v157;}
const v145=__node(0,[v146]);
let v163;switch(a3.c){
case 0:{
v163=a3.a[0];break;}
default:throw Error('literal constructor projection');}
const v162=__node(0,[v163]);
const v166=__nullaryNode(0);
const v161=__node(1,[v162,v166]);
const v138=__node(0,[v139,v141,v142,v145,v161]);
v129=v138;}
v119=v129;}
v117=v119;break;}
default:throw Error('literal constructor projection');}
return v117;}finally{__directDepth--;}}
function dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v167;switch(a0.c){
case 0:{
const v169=__nullaryNode(0);
v167=v169;break;}
case 1:{
const v170=__nullaryNode(0);
v167=v170;break;}
case 2:{
const v171=__nullaryNode(0);
v167=v171;break;}
case 3:{
const v172=__nullaryNode(0);
v167=v172;break;}
case 4:{
const v176=0n;
const v174=(a0.a[0])===(v176);
let v173;if(v174){
let v177;switch(a0.a[1].c){
case 0:{
const v179=__nullaryNode(0);
v177=v179;break;}
case 1:{
const v180=__nullaryNode(0);
v177=v180;break;}
case 2:{
const v181=__nullaryNode(0);
v177=v181;break;}
case 3:{
const v182=__nullaryNode(0);
v177=v182;break;}
case 4:{
const v183=__nullaryNode(0);
v177=v183;break;}
default:throw Error('literal constructor projection');}
v173=v177;}else{
const v187=1n;
const v185=(a0.a[0])===(v187);
let v184;if(v185){
let v188;switch(a0.a[1].c){
case 0:{
const v190=__nullaryNode(0);
v188=v190;break;}
case 1:{
const v191=__nullaryNode(0);
v188=v191;break;}
case 2:{
const v192=__nullaryNode(0);
v188=v192;break;}
case 3:{
let v193;switch(a0.a[1].a[1].c){
case 0:{
const v195=__nullaryNode(0);
v193=v195;break;}
case 1:{
const v196=__nullaryNode(0);
v193=v196;break;}
case 2:{
const v197=__nullaryNode(0);
v193=v197;break;}
case 3:{
let v198;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v201=d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0.a[1].a[0]);
const v203=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[1].a[0]);
const v200=__node(1,[v201,v203]);
v198=v200;break;}
case 1:{
const v205=__nullaryNode(0);
v198=v205;break;}
case 2:{
const v206=__nullaryNode(0);
v198=v206;break;}
case 3:{
const v207=__nullaryNode(0);
v198=v207;break;}
case 4:{
const v208=__nullaryNode(0);
v198=v208;break;}
default:throw Error('literal constructor projection');}
v193=v198;break;}
case 4:{
const v209=__nullaryNode(0);
v193=v209;break;}
default:throw Error('literal constructor projection');}
v188=v193;break;}
case 4:{
const v210=__nullaryNode(0);
v188=v210;break;}
default:throw Error('literal constructor projection');}
v184=v188;}else{
const v211=__nullaryNode(0);
v184=v211;}
v173=v184;}
v167=v173;break;}
default:throw Error('literal constructor projection');}
return v167;}finally{__directDepth--;}}
function dFast_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v212;switch(a0.c){
case 0:{
const v215=0n;
const v217=d_a6e6be603ffc708d75702b41b4951c9610ef010501658e8e255d0cb0930c73ae(a0.a[0]);
const v219=__nullaryNode(0);
const v216=__node(3,[v217,v219]);
const v214=__node(4,[v215,v216]);
v212=v214;break;}
case 1:{
const v221=1n;
const v223=dFast_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0.a[0]);
const v225=__nullaryNode(0);
const v222=__node(3,[v223,v225]);
const v220=__node(4,[v221,v222]);
v212=v220;break;}
default:throw Error('literal constructor projection');}
return v212;}finally{__directDepth--;}}
function dFast_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v226;switch(a0.c){
case 0:{
const v229=0n;
const v231=dFast_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0.a[0]);
const v233=__nullaryNode(0);
const v230=__node(3,[v231,v233]);
const v228=__node(4,[v229,v230]);
v226=v228;break;}
case 1:{
const v235=1n;
const v237=dFast_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0.a[0]);
const v239=__nullaryNode(0);
const v236=__node(3,[v237,v239]);
const v234=__node(4,[v235,v236]);
v226=v234;break;}
default:throw Error('literal constructor projection');}
return v226;}finally{__directDepth--;}}
function dFast_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v240=dFast_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0,a1);
return v240;}finally{__directDepth--;}}
function dFast_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v247=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v245=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v247);
const v250=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v249=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v250,a1);
const v244=(v245)||(v249);
let v243;if(v244){
v243=a0;}else{
let v254;switch(a0.c){
case 0:{
const v256=__nullaryNode(0);
v254=v256;break;}
case 1:{
const v258=dFast_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v257;if(v258){
const v261=__nullaryNode(0);
v257=v261;}else{
const v262=__node(1,[a0.a[0],a0.a[1]]);
v257=v262;}
v254=v257;break;}
case 2:{
const v266=dFast_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[0],a1);
const v269=dFast_273ee33328376426ef981d6809a5430712f4167aff7e5c93c7a2ff4f2843194f(a0.a[1],a1);
const v265=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v266,v269);
v254=v265;break;}
default:throw Error('literal constructor projection');}
v243=v254;}
return v243;}finally{__directDepth--;}}
function dFast_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v272;switch(a0.c){
case 0:{
const v274=__nullaryNode(0);
v272=v274;break;}
case 1:{
let v276;switch(a0.a[0].c){
case 0:{
v276=a0.a[0].a[0];break;}
default:throw Error('literal constructor projection');}
const v279=dFast_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(a0.a[1]);
const v275=__node(1,[v276,v279]);
v272=v275;break;}
default:throw Error('literal constructor projection');}
return v272;}finally{__directDepth--;}}
function dFast_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v282=dFast_dbedb8fa453e46bc9cf3454751e4797067eecbf51e094214b9c9deee1238483d(a0,a1);
const v281=__node(0,[v282]);
return v281;}finally{__directDepth--;}}
function dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v285;switch(a0.c){
case 0:{
const v287=__nullaryNode(0);
v285=v287;break;}
case 1:{
const v288=__nullaryNode(0);
v285=v288;break;}
case 2:{
const v289=__nullaryNode(0);
v285=v289;break;}
case 3:{
const v290=__nullaryNode(0);
v285=v290;break;}
case 4:{
const v294=0n;
const v292=(a0.a[0])===(v294);
let v291;if(v292){
let v295;switch(a0.a[1].c){
case 0:{
const v297=__nullaryNode(0);
v295=v297;break;}
case 1:{
const v298=__nullaryNode(0);
v295=v298;break;}
case 2:{
const v299=__nullaryNode(0);
v295=v299;break;}
case 3:{
const v300=__nullaryNode(0);
v295=v300;break;}
case 4:{
const v301=__nullaryNode(0);
v295=v301;break;}
default:throw Error('literal constructor projection');}
v291=v295;}else{
const v305=1n;
const v303=(a0.a[0])===(v305);
let v302;if(v303){
let v306;switch(a0.a[1].c){
case 0:{
const v308=__nullaryNode(0);
v306=v308;break;}
case 1:{
const v309=__nullaryNode(0);
v306=v309;break;}
case 2:{
const v310=__nullaryNode(0);
v306=v310;break;}
case 3:{
let v311;switch(a0.a[1].a[1].c){
case 0:{
const v313=__nullaryNode(0);
v311=v313;break;}
case 1:{
const v314=__nullaryNode(0);
v311=v314;break;}
case 2:{
const v315=__nullaryNode(0);
v311=v315;break;}
case 3:{
let v316;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v320=dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0.a[1].a[1].a[0]);
const v318=__node(1,[a0.a[1].a[0],v320]);
v316=v318;break;}
case 1:{
const v322=__nullaryNode(0);
v316=v322;break;}
case 2:{
const v323=__nullaryNode(0);
v316=v323;break;}
case 3:{
const v324=__nullaryNode(0);
v316=v324;break;}
case 4:{
const v325=__nullaryNode(0);
v316=v325;break;}
default:throw Error('literal constructor projection');}
v311=v316;break;}
case 4:{
const v326=__nullaryNode(0);
v311=v326;break;}
default:throw Error('literal constructor projection');}
v306=v311;break;}
case 4:{
const v327=__nullaryNode(0);
v306=v327;break;}
default:throw Error('literal constructor projection');}
v302=v306;}else{
const v328=__nullaryNode(0);
v302=v328;}
v291=v302;}
v285=v291;break;}
default:throw Error('literal constructor projection');}
return v285;}finally{__directDepth--;}}
function dFast_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v329;switch(a0.c){
case 0:{
const v333=__nullaryNode(0);
const v332=__node(0,[v333]);
const v331=__node(0,[v332]);
v329=v331;break;}
case 1:{
const v336=__nullaryNode(0);
const v335=__node(0,[v336]);
const v334=__node(0,[v335]);
v329=v334;break;}
case 2:{
const v339=__nullaryNode(0);
const v338=__node(0,[v339]);
const v337=__node(0,[v338]);
v329=v337;break;}
case 3:{
const v342=__nullaryNode(0);
const v341=__node(0,[v342]);
const v340=__node(0,[v341]);
v329=v340;break;}
case 4:{
const v346=0n;
const v344=(a0.a[0])===(v346);
let v343;if(v344){
let v347;switch(a0.a[1].c){
case 0:{
const v351=__nullaryNode(0);
const v350=__node(0,[v351]);
const v349=__node(0,[v350]);
v347=v349;break;}
case 1:{
const v354=__nullaryNode(0);
const v353=__node(0,[v354]);
const v352=__node(0,[v353]);
v347=v352;break;}
case 2:{
const v357=__nullaryNode(0);
const v356=__node(0,[v357]);
const v355=__node(0,[v356]);
v347=v355;break;}
case 3:{
let v358;switch(a0.a[1].a[1].c){
case 0:{
const v361=dFast_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0.a[1].a[0]);
const v360=__node(0,[v361]);
v358=v360;break;}
case 1:{
const v365=__nullaryNode(0);
const v364=__node(0,[v365]);
const v363=__node(0,[v364]);
v358=v363;break;}
case 2:{
const v368=__nullaryNode(0);
const v367=__node(0,[v368]);
const v366=__node(0,[v367]);
v358=v366;break;}
case 3:{
const v371=__nullaryNode(0);
const v370=__node(0,[v371]);
const v369=__node(0,[v370]);
v358=v369;break;}
case 4:{
const v374=__nullaryNode(0);
const v373=__node(0,[v374]);
const v372=__node(0,[v373]);
v358=v372;break;}
default:throw Error('literal constructor projection');}
v347=v358;break;}
case 4:{
const v377=__nullaryNode(0);
const v376=__node(0,[v377]);
const v375=__node(0,[v376]);
v347=v375;break;}
default:throw Error('literal constructor projection');}
v343=v347;}else{
const v381=1n;
const v379=(a0.a[0])===(v381);
let v378;if(v379){
let v382;switch(a0.a[1].c){
case 0:{
const v386=__nullaryNode(0);
const v385=__node(0,[v386]);
const v384=__node(0,[v385]);
v382=v384;break;}
case 1:{
const v389=__nullaryNode(0);
const v388=__node(0,[v389]);
const v387=__node(0,[v388]);
v382=v387;break;}
case 2:{
const v392=__nullaryNode(0);
const v391=__node(0,[v392]);
const v390=__node(0,[v391]);
v382=v390;break;}
case 3:{
let v393;switch(a0.a[1].a[1].c){
case 0:{
const v396=dFast_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0.a[1].a[0]);
const v395=__node(1,[v396]);
v393=v395;break;}
case 1:{
const v400=__nullaryNode(0);
const v399=__node(0,[v400]);
const v398=__node(0,[v399]);
v393=v398;break;}
case 2:{
const v403=__nullaryNode(0);
const v402=__node(0,[v403]);
const v401=__node(0,[v402]);
v393=v401;break;}
case 3:{
const v406=__nullaryNode(0);
const v405=__node(0,[v406]);
const v404=__node(0,[v405]);
v393=v404;break;}
case 4:{
const v409=__nullaryNode(0);
const v408=__node(0,[v409]);
const v407=__node(0,[v408]);
v393=v407;break;}
default:throw Error('literal constructor projection');}
v382=v393;break;}
case 4:{
const v412=__nullaryNode(0);
const v411=__node(0,[v412]);
const v410=__node(0,[v411]);
v382=v410;break;}
default:throw Error('literal constructor projection');}
v378=v382;}else{
const v415=__nullaryNode(0);
const v414=__node(0,[v415]);
const v413=__node(0,[v414]);
v378=v413;}
v343=v378;}
v329=v343;break;}
default:throw Error('literal constructor projection');}
return v329;}finally{__directDepth--;}}
function dFast_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v416;switch(a0.c){
case 0:{
v416=a1;break;}
case 1:{
const v422=dFast_3ca0548981ecf5c75191b56cbad83983825a71845be502493e2bb7ecfa865ce8(a0.a[2],a1);
const v419=__node(1,[a0.a[0],a0.a[1],v422]);
v416=v419;break;}
default:throw Error('literal constructor projection');}
return v416;}finally{__directDepth--;}}
function dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v425;switch(a0.c){
case 0:{
const v428=0n;
const v429=__nullaryNode(0);
const v427=__node(4,[v428,v429]);
v425=v427;break;}
case 1:{
const v431=1n;
const v433=d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0.a[0]);
const v436=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[1]);
const v438=__nullaryNode(0);
const v435=__node(3,[v436,v438]);
const v432=__node(3,[v433,v435]);
const v430=__node(4,[v431,v432]);
v425=v430;break;}
default:throw Error('literal constructor projection');}
return v425;}finally{__directDepth--;}}
function dFast_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v439;switch(a0.c){
case 0:{
const v442=__nullaryNode(0);
const v441=__node(0,[v442]);
v439=v441;break;}
case 1:{
const v444=__nullaryNode(0);
const v443=__node(0,[v444]);
v439=v443;break;}
case 2:{
const v446=__nullaryNode(0);
const v445=__node(0,[v446]);
v439=v445;break;}
case 3:{
const v448=__nullaryNode(0);
const v447=__node(0,[v448]);
v439=v447;break;}
case 4:{
const v452=0n;
const v450=(a0.a[0])===(v452);
let v449;if(v450){
let v453;switch(a0.a[1].c){
case 0:{
const v456=__nullaryNode(0);
const v455=__node(0,[v456]);
v453=v455;break;}
case 1:{
const v458=__nullaryNode(0);
const v457=__node(0,[v458]);
v453=v457;break;}
case 2:{
const v460=__nullaryNode(0);
const v459=__node(0,[v460]);
v453=v459;break;}
case 3:{
let v461;switch(a0.a[1].a[1].c){
case 0:{
const v464=dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0.a[1].a[0]);
const v463=__node(0,[v464]);
v461=v463;break;}
case 1:{
const v467=__nullaryNode(0);
const v466=__node(0,[v467]);
v461=v466;break;}
case 2:{
const v469=__nullaryNode(0);
const v468=__node(0,[v469]);
v461=v468;break;}
case 3:{
const v471=__nullaryNode(0);
const v470=__node(0,[v471]);
v461=v470;break;}
case 4:{
const v473=__nullaryNode(0);
const v472=__node(0,[v473]);
v461=v472;break;}
default:throw Error('literal constructor projection');}
v453=v461;break;}
case 4:{
const v475=__nullaryNode(0);
const v474=__node(0,[v475]);
v453=v474;break;}
default:throw Error('literal constructor projection');}
v449=v453;}else{
const v477=__nullaryNode(0);
const v476=__node(0,[v477]);
v449=v476;}
v439=v449;break;}
default:throw Error('literal constructor projection');}
return v439;}finally{__directDepth--;}}
function dFast_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v478;switch(a0.c){
case 0:{
const v482=__nullaryNode(0);
const v481=__node(0,[v482]);
const v480=__node(0,[v481]);
v478=v480;break;}
case 1:{
const v485=__nullaryNode(0);
const v484=__node(0,[v485]);
const v483=__node(0,[v484]);
v478=v483;break;}
case 2:{
const v488=__nullaryNode(0);
const v487=__node(0,[v488]);
const v486=__node(0,[v487]);
v478=v486;break;}
case 3:{
const v491=__nullaryNode(0);
const v490=__node(0,[v491]);
const v489=__node(0,[v490]);
v478=v489;break;}
case 4:{
const v495=0n;
const v493=(a0.a[0])===(v495);
let v492;if(v493){
let v496;switch(a0.a[1].c){
case 0:{
const v500=__nullaryNode(0);
const v499=__node(0,[v500]);
const v498=__node(0,[v499]);
v496=v498;break;}
case 1:{
const v503=__nullaryNode(0);
const v502=__node(0,[v503]);
const v501=__node(0,[v502]);
v496=v501;break;}
case 2:{
const v506=__nullaryNode(0);
const v505=__node(0,[v506]);
const v504=__node(0,[v505]);
v496=v504;break;}
case 3:{
let v507;switch(a0.a[1].a[1].c){
case 0:{
const v510=dFast_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0.a[1].a[0]);
const v509=__node(0,[v510]);
v507=v509;break;}
case 1:{
const v514=__nullaryNode(0);
const v513=__node(0,[v514]);
const v512=__node(0,[v513]);
v507=v512;break;}
case 2:{
const v517=__nullaryNode(0);
const v516=__node(0,[v517]);
const v515=__node(0,[v516]);
v507=v515;break;}
case 3:{
const v520=__nullaryNode(0);
const v519=__node(0,[v520]);
const v518=__node(0,[v519]);
v507=v518;break;}
case 4:{
const v523=__nullaryNode(0);
const v522=__node(0,[v523]);
const v521=__node(0,[v522]);
v507=v521;break;}
default:throw Error('literal constructor projection');}
v496=v507;break;}
case 4:{
const v526=__nullaryNode(0);
const v525=__node(0,[v526]);
const v524=__node(0,[v525]);
v496=v524;break;}
default:throw Error('literal constructor projection');}
v492=v496;}else{
const v530=1n;
const v528=(a0.a[0])===(v530);
let v527;if(v528){
let v531;switch(a0.a[1].c){
case 0:{
const v535=__nullaryNode(0);
const v534=__node(0,[v535]);
const v533=__node(0,[v534]);
v531=v533;break;}
case 1:{
const v538=__nullaryNode(0);
const v537=__node(0,[v538]);
const v536=__node(0,[v537]);
v531=v536;break;}
case 2:{
const v541=__nullaryNode(0);
const v540=__node(0,[v541]);
const v539=__node(0,[v540]);
v531=v539;break;}
case 3:{
let v542;switch(a0.a[1].a[1].c){
case 0:{
const v545=d_a039048c26d54adb202c40b817021d597559263e9463d68f4e5d1a1c1b25fea5(a0.a[1].a[0]);
const v544=__node(1,[v545]);
v542=v544;break;}
case 1:{
const v549=__nullaryNode(0);
const v548=__node(0,[v549]);
const v547=__node(0,[v548]);
v542=v547;break;}
case 2:{
const v552=__nullaryNode(0);
const v551=__node(0,[v552]);
const v550=__node(0,[v551]);
v542=v550;break;}
case 3:{
const v555=__nullaryNode(0);
const v554=__node(0,[v555]);
const v553=__node(0,[v554]);
v542=v553;break;}
case 4:{
const v558=__nullaryNode(0);
const v557=__node(0,[v558]);
const v556=__node(0,[v557]);
v542=v556;break;}
default:throw Error('literal constructor projection');}
v531=v542;break;}
case 4:{
const v561=__nullaryNode(0);
const v560=__node(0,[v561]);
const v559=__node(0,[v560]);
v531=v559;break;}
default:throw Error('literal constructor projection');}
v527=v531;}else{
const v564=__nullaryNode(0);
const v563=__node(0,[v564]);
const v562=__node(0,[v563]);
v527=v562;}
v492=v527;}
v478=v492;break;}
default:throw Error('literal constructor projection');}
return v478;}finally{__directDepth--;}}
function dFast_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v565;switch(a0.c){
case 0:{
const v568=0n;
const v570=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v572=__nullaryNode(0);
const v569=__node(3,[v570,v572]);
const v567=__node(4,[v568,v569]);
v565=v567;break;}
default:throw Error('literal constructor projection');}
return v565;}finally{__directDepth--;}}
function dFast_5feaec23975c8663ce24a41f23808087551b31c6b1cfdd1675e0c1418c720017(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v575=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a2);
const v577=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v574=(v575)<(v577);
let v573;if(v574){
let v579;switch(a1.c){
case 0:{
const v582=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v581=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v582,a2);
v579=v581;break;}
case 1:{
const v587=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v586=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v587,a2);
v579=v586;break;}
case 2:{
const v592=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1.a[0]);
const v595=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a1.a[1],a2);
const v591=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v592,v595);
v579=v591;break;}
default:throw Error('literal constructor projection');}
v573=v579;}else{
const v599=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
const v598=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v599,a2);
v573=v598;}
return v573;}finally{__directDepth--;}}
function dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v603;switch(a0.c){
case 0:{
const v606=0n;
const v607=__nullaryNode(0);
const v605=__node(4,[v606,v607]);
v603=v605;break;}
case 1:{
const v609=1n;
const v613=dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0.a[1]);
const v615=__nullaryNode(0);
const v612=__node(3,[v613,v615]);
const v610=__node(3,[a0.a[0],v612]);
const v608=__node(4,[v609,v610]);
v603=v608;break;}
default:throw Error('literal constructor projection');}
return v603;}finally{__directDepth--;}}
function dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v621=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v623=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a1);
const v620=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v621,v623);
let v619;if(v620){
const v625=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
v619=v625;}else{
const v627=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a1);
v619=v627;}
const v631=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v633=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a1);
const v630=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v631,v633);
let v629;if(v630){
const v635=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a1);
v629=v635;}else{
const v637=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
v629=v637;}
const v640=dFast_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a0);
const v642=dFast_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a1);
const v639=d_e5231945cad4c7e3dd0ce4976768ecf32c363196ab3b4643c4fe6ad3cc5dbd53(v640,v642);
const v645=d_114ce5fc88cab5a19bac748f711cdc98ce30c8e2e5dce4e358591543d20cdb96(a0);
const v647=d_114ce5fc88cab5a19bac748f711cdc98ce30c8e2e5dce4e358591543d20cdb96(a1);
const v644=BigInt.asUintN(64,(v645)+(v647));
const v652=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v654=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v651=(v652)<(v654);
let v650;if(v651){
const v656=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
v650=v656;}else{
const v658=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
v650=v658;}
const v660=1n;
const v649=BigInt.asUintN(64,(v650)+(v660));
const v616=__node(2,[a0,a1,v619,v629,v639,v644,v649]);
return v616;}finally{__directDepth--;}}
function dFast_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v661;switch(a0.c){
case 0:{
const v664=0n;
const v666=dFast_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0.a[0]);
const v668=__nullaryNode(0);
const v665=__node(3,[v666,v668]);
const v663=__node(4,[v664,v665]);
v661=v663;break;}
case 1:{
const v670=1n;
const v672=d_e39d391c398088bd47fb3a92c665b301b6d5f6f6e823e8702cd2400a3598833e(a0.a[0]);
const v674=__nullaryNode(0);
const v671=__node(3,[v672,v674]);
const v669=__node(4,[v670,v671]);
v661=v669;break;}
default:throw Error('literal constructor projection');}
return v661;}finally{__directDepth--;}}
function dFast_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v675;switch(a0.c){
case 0:{
const v677=__node(1,[a1,a2]);
v675=v677;break;}
case 1:{
const v681=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,a0.a[0]);
let v680;if(v681){
const v685=__node(1,[a1,a2]);
const v688=__node(1,[a0.a[0],a0.a[1]]);
const v684=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v685,v688);
v680=v684;}else{
const v692=__node(1,[a0.a[0],a0.a[1]]);
const v695=__node(1,[a1,a2]);
const v691=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v692,v695);
v680=v691;}
v675=v680;break;}
case 2:{
const v701=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0.a[0]);
const v699=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v701);
let v698;if(v699){
const v704=dFast_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[0],a1,a2);
const v703=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v704,a0.a[1]);
v698=v703;}else{
const v711=dFast_67bcc6232a9e179e7e42cd51acc4ffd80b1bf630c321d28cf525351a5dc930ab(a0.a[1],a1,a2);
const v709=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(a0.a[0],v711);
v698=v709;}
v675=v698;break;}
default:throw Error('literal constructor projection');}
return v675;}finally{__directDepth--;}}
function dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v715;switch(a0.c){
case 0:{
const v717=__nullaryNode(0);
v715=v717;break;}
case 1:{
const v718=__nullaryNode(0);
v715=v718;break;}
case 2:{
const v719=__nullaryNode(0);
v715=v719;break;}
case 3:{
const v720=__nullaryNode(0);
v715=v720;break;}
case 4:{
const v724=0n;
const v722=(a0.a[0])===(v724);
let v721;if(v722){
let v725;switch(a0.a[1].c){
case 0:{
const v727=__nullaryNode(0);
v725=v727;break;}
case 1:{
const v728=__nullaryNode(0);
v725=v728;break;}
case 2:{
const v729=__nullaryNode(0);
v725=v729;break;}
case 3:{
const v730=__nullaryNode(0);
v725=v730;break;}
case 4:{
const v731=__nullaryNode(0);
v725=v731;break;}
default:throw Error('literal constructor projection');}
v721=v725;}else{
const v735=1n;
const v733=(a0.a[0])===(v735);
let v732;if(v733){
let v736;switch(a0.a[1].c){
case 0:{
const v738=__nullaryNode(0);
v736=v738;break;}
case 1:{
const v739=__nullaryNode(0);
v736=v739;break;}
case 2:{
const v740=__nullaryNode(0);
v736=v740;break;}
case 3:{
let v741;switch(a0.a[1].a[1].c){
case 0:{
const v743=__nullaryNode(0);
v741=v743;break;}
case 1:{
const v744=__nullaryNode(0);
v741=v744;break;}
case 2:{
const v745=__nullaryNode(0);
v741=v745;break;}
case 3:{
let v746;switch(a0.a[1].a[1].a[1].c){
case 0:{
const v750=dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0.a[1].a[1].a[0]);
const v748=__node(1,[a0.a[1].a[0],v750]);
v746=v748;break;}
case 1:{
const v752=__nullaryNode(0);
v746=v752;break;}
case 2:{
const v753=__nullaryNode(0);
v746=v753;break;}
case 3:{
const v754=__nullaryNode(0);
v746=v754;break;}
case 4:{
const v755=__nullaryNode(0);
v746=v755;break;}
default:throw Error('literal constructor projection');}
v741=v746;break;}
case 4:{
const v756=__nullaryNode(0);
v741=v756;break;}
default:throw Error('literal constructor projection');}
v736=v741;break;}
case 4:{
const v757=__nullaryNode(0);
v736=v757;break;}
default:throw Error('literal constructor projection');}
v732=v736;}else{
const v758=__nullaryNode(0);
v732=v758;}
v721=v732;}
v715=v721;break;}
default:throw Error('literal constructor projection');}
return v715;}finally{__directDepth--;}}
function dFast_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v759;switch(a0.c){
case 0:{
const v763=false;
const v762=__node(0,[v763]);
const v761=__node(0,[v762]);
v759=v761;break;}
case 1:{
const v766=false;
const v765=__node(0,[v766]);
const v764=__node(0,[v765]);
v759=v764;break;}
case 2:{
const v769=false;
const v768=__node(0,[v769]);
const v767=__node(0,[v768]);
v759=v767;break;}
case 3:{
const v772=false;
const v771=__node(0,[v772]);
const v770=__node(0,[v771]);
v759=v770;break;}
case 4:{
const v776=0n;
const v774=(a0.a[0])===(v776);
let v773;if(v774){
let v777;switch(a0.a[1].c){
case 0:{
const v781=false;
const v780=__node(0,[v781]);
const v779=__node(0,[v780]);
v777=v779;break;}
case 1:{
const v784=false;
const v783=__node(0,[v784]);
const v782=__node(0,[v783]);
v777=v782;break;}
case 2:{
const v787=false;
const v786=__node(0,[v787]);
const v785=__node(0,[v786]);
v777=v785;break;}
case 3:{
let v788;switch(a0.a[1].a[1].c){
case 0:{
const v791=d_03298824eef80e61c5d610b0d055588c3b5e18f3e4a0069e0c629ff952a4dfff(a0.a[1].a[0]);
const v790=__node(0,[v791]);
v788=v790;break;}
case 1:{
const v795=false;
const v794=__node(0,[v795]);
const v793=__node(0,[v794]);
v788=v793;break;}
case 2:{
const v798=false;
const v797=__node(0,[v798]);
const v796=__node(0,[v797]);
v788=v796;break;}
case 3:{
const v801=false;
const v800=__node(0,[v801]);
const v799=__node(0,[v800]);
v788=v799;break;}
case 4:{
const v804=false;
const v803=__node(0,[v804]);
const v802=__node(0,[v803]);
v788=v802;break;}
default:throw Error('literal constructor projection');}
v777=v788;break;}
case 4:{
const v807=false;
const v806=__node(0,[v807]);
const v805=__node(0,[v806]);
v777=v805;break;}
default:throw Error('literal constructor projection');}
v773=v777;}else{
const v811=1n;
const v809=(a0.a[0])===(v811);
let v808;if(v809){
let v812;switch(a0.a[1].c){
case 0:{
const v816=false;
const v815=__node(0,[v816]);
const v814=__node(0,[v815]);
v812=v814;break;}
case 1:{
const v819=false;
const v818=__node(0,[v819]);
const v817=__node(0,[v818]);
v812=v817;break;}
case 2:{
const v822=false;
const v821=__node(0,[v822]);
const v820=__node(0,[v821]);
v812=v820;break;}
case 3:{
let v823;switch(a0.a[1].a[1].c){
case 0:{
const v826=dFast_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0.a[1].a[0]);
const v825=__node(1,[v826]);
v823=v825;break;}
case 1:{
const v830=false;
const v829=__node(0,[v830]);
const v828=__node(0,[v829]);
v823=v828;break;}
case 2:{
const v833=false;
const v832=__node(0,[v833]);
const v831=__node(0,[v832]);
v823=v831;break;}
case 3:{
const v836=false;
const v835=__node(0,[v836]);
const v834=__node(0,[v835]);
v823=v834;break;}
case 4:{
const v839=false;
const v838=__node(0,[v839]);
const v837=__node(0,[v838]);
v823=v837;break;}
default:throw Error('literal constructor projection');}
v812=v823;break;}
case 4:{
const v842=false;
const v841=__node(0,[v842]);
const v840=__node(0,[v841]);
v812=v840;break;}
default:throw Error('literal constructor projection');}
v808=v812;}else{
const v845=false;
const v844=__node(0,[v845]);
const v843=__node(0,[v844]);
v808=v843;}
v773=v808;}
v759=v773;break;}
default:throw Error('literal constructor projection');}
return v759;}finally{__directDepth--;}}
function dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v846=dFast_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0,a1);
return v846;}finally{__directDepth--;}}
function dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v851=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v854=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v856=1n;
const v853=BigInt.asUintN(64,(v854)+(v856));
const v850=(v851)>(v853);
let v849;if(v850){
const v857=dFast_c14dfd4816837171f0b19554bfc6800dadcadaa19f0f7fd611f66f1a308753df(a0,a1);
v849=v857;}else{
const v860=dFast_fd90a681adb57d4742edf3c18ccf6beb2c9dff11c3f5a2dd296613ddd8827ebf(a0,a1);
v849=v860;}
return v849;}finally{__directDepth--;}}
function dFast_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v867=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v865=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v867);
const v870=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v869=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v870,a1);
const v864=(v865)||(v869);
let v863;if(v864){
v863=a0;}else{
let v874;switch(a0.c){
case 0:{
const v876=__nullaryNode(0);
v874=v876;break;}
case 1:{
const v878=dFast_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v877;if(v878){
const v881=__node(1,[a0.a[0],a2]);
v877=v881;}else{
const v884=__node(1,[a0.a[0],a0.a[1]]);
v877=v884;}
v874=v877;break;}
case 2:{
const v888=dFast_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[0],a1,a2);
const v892=dFast_8c669d53d1ffbea1c37e4783a734540c7cf05136c179e5927ffe7c082b66db84(a0.a[1],a1,a2);
const v887=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(v888,v892);
v874=v887;break;}
default:throw Error('literal constructor projection');}
v863=v874;}
return v863;}finally{__directDepth--;}}
function dFast_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v896;switch(a0.c){
case 0:{
let v901;switch(a0.a[0].c){
case 0:{
const v904=0n;
const v903=__node(0,[v904]);
v901=v903;break;}
case 1:{
const v905=dFast_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0.a[0].a[0],a0.a[0].a[1]);
v901=v905;break;}
case 2:{
v901=a0.a[0].a[4];break;}
default:throw Error('literal constructor projection');}
const v900=d_05e194209f1e47abcac42f109e9d808bc9cd6ed4fe9d86cf08ca4a673a253e86(v901);
const v909=4294967295n;
const v899=BigInt.asUintN(64,(v900)&(v909));
const v910=false;
const v912=__node(0,[a0.a[0]]);
const v914=__nullaryNode(0);
const v898=__node(0,[v899,v910,a1,v912,v914]);
v896=v898;break;}
default:throw Error('literal constructor projection');}
return v896;}finally{__directDepth--;}}
function dFast_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v915;switch(a0.c){
case 0:{
const v918=__nullaryNode(0);
const v917=__node(0,[v918]);
v915=v917;break;}
case 1:{
const v920=__nullaryNode(0);
const v919=__node(0,[v920]);
v915=v919;break;}
case 2:{
const v922=__nullaryNode(0);
const v921=__node(0,[v922]);
v915=v921;break;}
case 3:{
const v924=__nullaryNode(0);
const v923=__node(0,[v924]);
v915=v923;break;}
case 4:{
const v928=0n;
const v926=(a0.a[0])===(v928);
let v925;if(v926){
let v929;switch(a0.a[1].c){
case 0:{
const v932=__nullaryNode(0);
const v931=__node(0,[v932]);
v929=v931;break;}
case 1:{
const v934=__nullaryNode(0);
const v933=__node(0,[v934]);
v929=v933;break;}
case 2:{
const v936=__nullaryNode(0);
const v935=__node(0,[v936]);
v929=v935;break;}
case 3:{
let v937;switch(a0.a[1].a[1].c){
case 0:{
const v940=d_427b0b37997e853e4c3ce1211556fbd99b80f84a972a4862d8ed930df0cab652(a0.a[1].a[0]);
const v939=__node(0,[v940]);
v937=v939;break;}
case 1:{
const v943=__nullaryNode(0);
const v942=__node(0,[v943]);
v937=v942;break;}
case 2:{
const v945=__nullaryNode(0);
const v944=__node(0,[v945]);
v937=v944;break;}
case 3:{
const v947=__nullaryNode(0);
const v946=__node(0,[v947]);
v937=v946;break;}
case 4:{
const v949=__nullaryNode(0);
const v948=__node(0,[v949]);
v937=v948;break;}
default:throw Error('literal constructor projection');}
v929=v937;break;}
case 4:{
const v951=__nullaryNode(0);
const v950=__node(0,[v951]);
v929=v950;break;}
default:throw Error('literal constructor projection');}
v925=v929;}else{
const v955=1n;
const v953=(a0.a[0])===(v955);
let v952;if(v953){
let v956;switch(a0.a[1].c){
case 0:{
const v959=__nullaryNode(0);
const v958=__node(0,[v959]);
v956=v958;break;}
case 1:{
const v961=__nullaryNode(0);
const v960=__node(0,[v961]);
v956=v960;break;}
case 2:{
const v963=__nullaryNode(0);
const v962=__node(0,[v963]);
v956=v962;break;}
case 3:{
let v964;switch(a0.a[1].a[1].c){
case 0:{
const v967=dFast_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0.a[1].a[0]);
const v966=__node(1,[v967]);
v964=v966;break;}
case 1:{
const v970=__nullaryNode(0);
const v969=__node(0,[v970]);
v964=v969;break;}
case 2:{
const v972=__nullaryNode(0);
const v971=__node(0,[v972]);
v964=v971;break;}
case 3:{
const v974=__nullaryNode(0);
const v973=__node(0,[v974]);
v964=v973;break;}
case 4:{
const v976=__nullaryNode(0);
const v975=__node(0,[v976]);
v964=v975;break;}
default:throw Error('literal constructor projection');}
v956=v964;break;}
case 4:{
const v978=__nullaryNode(0);
const v977=__node(0,[v978]);
v956=v977;break;}
default:throw Error('literal constructor projection');}
v952=v956;}else{
const v980=__nullaryNode(0);
const v979=__node(0,[v980]);
v952=v979;}
v925=v952;}
v915=v925;break;}
default:throw Error('literal constructor projection');}
return v915;}finally{__directDepth--;}}
function dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v981;switch(a0.c){
case 0:{
const v984=0n;
const v985=__nullaryNode(0);
const v983=__node(4,[v984,v985]);
v981=v983;break;}
case 1:{
const v987=1n;
const v991=dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0.a[1]);
const v993=__nullaryNode(0);
const v990=__node(3,[v991,v993]);
const v988=__node(3,[a0.a[0],v990]);
const v986=__node(4,[v987,v988]);
v981=v986;break;}
default:throw Error('literal constructor projection');}
return v981;}finally{__directDepth--;}}
function dFast_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v994;switch(a0.c){
case 0:{
const v996=__node(1,[a1,a2]);
v994=v996;break;}
case 1:{
const v1000=__node(1,[a1,a2]);
const v1003=__node(1,[a0.a[0],a0.a[1]]);
const v999=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v1000,v1003);
v994=v999;break;}
case 2:{
const v1007=dFast_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(a0.a[0],a1,a2);
const v1006=dFast_884005fc290364e6178acab543434442fcf049b3b9fb6357496cf02d59b52679(v1007,a0.a[1]);
v994=v1006;break;}
default:throw Error('literal constructor projection');}
return v994;}finally{__directDepth--;}}
function dFast_a659449b204736285d45a9927664b972a58b1bddb24f3fdc3f6f2fbb40c2e580(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1012;switch(a0.c){
case 0:{
const v1015=0n;
const v1014=__node(0,[v1015]);
v1012=v1014;break;}
case 1:{
const v1016=dFast_2c41ea77569aa8570c4d561a1ead76fe225db6bf35ca50e248ea65c4a83a7a3d(a0.a[0],a0.a[1]);
v1012=v1016;break;}
case 2:{
v1012=a0.a[4];break;}
default:throw Error('literal constructor projection');}
return v1012;}finally{__directDepth--;}}
function dFast_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1020;switch(a0.c){
case 0:{
const v1022=__nullaryNode(0);
v1020=v1022;break;}
case 1:{
const v1024=dFast_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0.a[2]);
const v1023=dFast_a59ca16bb8035164995f7b7c326b82ed908f5b61ea568260d5d810d9db6150b9(v1024,a0.a[0],a0.a[1]);
v1020=v1023;break;}
default:throw Error('literal constructor projection');}
return v1020;}finally{__directDepth--;}}
function dFast_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1028;switch(a0.c){
case 0:{
const v1030=0n;
v1028=v1030;break;}
case 1:{
const v1033=dFast_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(a0.a[1]);
const v1031=BigInt.asUintN(64,(a0.a[0])+(v1033));
v1028=v1031;break;}
default:throw Error('literal constructor projection');}
return v1028;}finally{__directDepth--;}}
function dFast_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(a0,a1,a2){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1035;switch(a0.c){
case 0:{
const v1038=dFast_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a2);
const v1041=false;
const v1043=__node(0,[a0.a[0]]);
const v1045=__nullaryNode(0);
const v1037=__node(0,[v1038,v1041,a1,v1043,v1045]);
v1035=v1037;break;}
default:throw Error('literal constructor projection');}
return v1035;}finally{__directDepth--;}}
function dFast_c14dfd4816837171f0b19554bfc6800dadcadaa19f0f7fd611f66f1a308753df(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1048=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v1051=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v1053=1n;
const v1050=BigInt.asUintN(64,(v1051)+(v1053));
const v1047=(v1048)>(v1050);
let v1046;if(v1047){
let v1054;switch(a0.c){
case 0:{
const v1056=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1054=v1056;break;}
case 1:{
const v1059=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1054=v1059;break;}
case 2:{
const v1062=dFast_12c738c0e30827ae33ba32ddc8efbededcaf228ded8b93018e9c67d2c4f9b0c8(a0.a[0],a0.a[1],a1);
v1054=v1062;break;}
default:throw Error('literal constructor projection');}
v1046=v1054;}else{
const v1066=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1046=v1066;}
return v1046;}finally{__directDepth--;}}
function dFast_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1069;switch(a0.c){
case 0:{
let v1071;switch(a1.c){
case 0:{
const v1073=false;
v1071=v1073;break;}
case 1:{
const v1074=true;
v1071=v1074;break;}
default:throw Error('literal constructor projection');}
v1069=v1071;break;}
case 1:{
let v1075;switch(a1.c){
case 0:{
const v1077=false;
v1075=v1077;break;}
case 1:{
const v1079=(a0.a[0])===(a1.a[0]);
let v1078;if(v1079){
const v1082=dFast_c96648078cca950563bff7dff33a6c792d28689c62afba9a1d2511bacfa895fd(a0.a[1],a1.a[1]);
v1078=v1082;}else{
const v1085=(a0.a[0])<(a1.a[0]);
v1078=v1085;}
v1075=v1078;break;}
default:throw Error('literal constructor projection');}
v1069=v1075;break;}
default:throw Error('literal constructor projection');}
return v1069;}finally{__directDepth--;}}
function dFast_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1092=d_9cd5af634f19aa6e7a6d2f4d15ff6bf653638905deeea5bb6a80fac84e21d616(a0);
const v1090=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(a1,v1092);
const v1095=d_76539c376732c82386cdad0c065f748805fa269958f302aa39ef7b834e337365(a0);
const v1094=dFast_871e94e2acb303721199c0289b183bbf5ddb82916114a26af556e54ac1c1b241(v1095,a1);
const v1089=(v1090)||(v1094);
let v1088;if(v1089){
const v1098=__nullaryNode(0);
v1088=v1098;}else{
let v1099;switch(a0.c){
case 0:{
const v1101=__nullaryNode(0);
v1099=v1101;break;}
case 1:{
const v1103=dFast_26a9e52c0c11d3e0f0f1a9c646af1eecec1dcbe6c485e3150628b1a247443ac4(a1,a0.a[0]);
let v1102;if(v1103){
const v1106=__node(1,[a0.a[1]]);
v1102=v1106;}else{
const v1108=__nullaryNode(0);
v1102=v1108;}
v1099=v1102;break;}
case 2:{
const v1110=dFast_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[0],a1);
const v1113=dFast_d369d56e1dda85e4f17f1591357fef4fbe5930db5a7008634b9b20f10b0b7463(a0.a[1],a1);
const v1109=d_bd371baa55327eed78b79e9700cd9e761119c3ce3cfd6260279cad2a9a1f798a(v1110,v1113);
v1099=v1109;break;}
default:throw Error('literal constructor projection');}
v1088=v1099;}
return v1088;}finally{__directDepth--;}}
function dFast_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1116;switch(a0.c){
case 0:{
const v1119=0n;
const v1121=d_7fb84a3d8c0cc8dccb1389411ed329f5786f26af2054a718626e4549bd41453c(a0.a[0]);
const v1123=__nullaryNode(0);
const v1120=__node(3,[v1121,v1123]);
const v1118=__node(4,[v1119,v1120]);
v1116=v1118;break;}
case 1:{
const v1125=1n;
const v1127=dFast_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0.a[0]);
const v1129=__nullaryNode(0);
const v1126=__node(3,[v1127,v1129]);
const v1124=__node(4,[v1125,v1126]);
v1116=v1124;break;}
default:throw Error('literal constructor projection');}
return v1116;}finally{__directDepth--;}}
function dFast_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1130;switch(a0.c){
case 0:{
const v1133=dFast_16086b852076601b01f3c69614c54f877600165f1e14db93eefa87d1ad5eaf28(a0.a[0]);
const v1132=__node(0,[v1133]);
v1130=v1132;break;}
default:throw Error('literal constructor projection');}
return v1130;}finally{__directDepth--;}}
function dFast_dbedb8fa453e46bc9cf3454751e4797067eecbf51e094214b9c9deee1238483d(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1142=__nullaryNode(0);
const v1139=__node(1,[a0,a1,v1142]);
const v1138=dFast_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(v1139);
const v1137=dFast_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(v1138);
const v1136=dFast_2ad939bc7e4007ce40665af4d350308a158abe49bbed5968efba8578e4e0b024(v1137);
const v1135=dFast_bbefb8dd9714ffbd0cb3d332fd84e40bd773b71d2c4acaec720eb4f50975d483(v1136);
return v1135;}finally{__directDepth--;}}
function dFast_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1143;switch(a0.c){
case 0:{
const v1145=__nullaryNode(0);
v1143=v1145;break;}
case 1:{
let v1147;switch(a0.a[0].c){
case 0:{
v1147=a0.a[0].a[1];break;}
default:throw Error('literal constructor projection');}
let v1146;if(v1147){
const v1152=dFast_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0.a[1]);
const v1150=__node(1,[a0.a[0],v1152]);
v1146=v1150;}else{
const v1154=dFast_dd8cd6593a332d9574b3a325f6fcf465556dac02f26b395ef1c2d3bce72bfc51(a0.a[1]);
v1146=v1154;}
v1143=v1146;break;}
default:throw Error('literal constructor projection');}
return v1143;}finally{__directDepth--;}}
function dFast_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1156;switch(a0.c){
case 0:{
const v1159=dFast_b5b1035feb5492e1e7d982d50c0b80c9080f214096c13cff5be045a441ac9fa3(a0.a[0]);
const v1158=__node(0,[v1159]);
v1156=v1158;break;}
default:throw Error('literal constructor projection');}
return v1156;}finally{__directDepth--;}}
function dFast_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1161;switch(a0.c){
case 0:{
const v1163=__nullaryNode(0);
v1161=v1163;break;}
case 1:{
const v1166=dFast_e308ead4773e3fdc5524589eb9b08b4d2b0525647e7ea350c28a5c66a9ce6b92(a0.a[2]);
const v1164=__node(1,[a0.a[1],v1166]);
v1161=v1164;break;}
default:throw Error('literal constructor projection');}
return v1161;}finally{__directDepth--;}}
function dFast_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1168;switch(a0.c){
case 0:{
const v1171=0n;
const v1173=dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0.a[0]);
const v1175=__nullaryNode(0);
const v1172=__node(3,[v1173,v1175]);
const v1170=__node(4,[v1171,v1172]);
v1168=v1170;break;}
default:throw Error('literal constructor projection');}
return v1168;}finally{__directDepth--;}}
function dFast_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{let v1176;switch(a0.c){
case 0:{
let v1178;switch(a1.c){
case 0:{
const v1180=true;
v1178=v1180;break;}
case 1:{
const v1181=false;
v1178=v1181;break;}
default:throw Error('literal constructor projection');}
v1176=v1178;break;}
case 1:{
let v1182;switch(a1.c){
case 0:{
const v1184=false;
v1182=v1184;break;}
case 1:{
const v1186=(a0.a[0])===(a1.a[0]);
let v1185;if(v1186){
const v1190=dFast_f02e62e1211b3eaa13a591ccab29eb97bfb635a4914c83f144d6347d54633514(a0.a[1],a1.a[1]);
let v1189;if(v1190){
const v1193=true;
v1189=v1193;}else{
const v1194=false;
v1189=v1194;}
v1185=v1189;}else{
const v1195=false;
v1185=v1195;}
v1182=v1185;break;}
default:throw Error('literal constructor projection');}
v1176=v1182;break;}
default:throw Error('literal constructor projection');}
return v1176;}finally{__directDepth--;}}
function dFast_fd90a681adb57d4742edf3c18ccf6beb2c9dff11c3f5a2dd296613ddd8827ebf(a0,a1){if(__directDepth>=128)throw __deepCall;__directDepth++;try{const v1198=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a1);
const v1201=d_739939207d193a54a74de548254a6ef49047e8c1cf8e69d7d3442e7e62e3851c(a0);
const v1203=1n;
const v1200=BigInt.asUintN(64,(v1201)+(v1203));
const v1197=(v1198)>(v1200);
let v1196;if(v1197){
let v1204;switch(a1.c){
case 0:{
const v1206=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1204=v1206;break;}
case 1:{
const v1209=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1204=v1209;break;}
case 2:{
const v1212=dFast_5feaec23975c8663ce24a41f23808087551b31c6b1cfdd1675e0c1418c720017(a0,a1.a[0],a1.a[1]);
v1204=v1212;break;}
default:throw Error('literal constructor projection');}
v1196=v1204;}else{
const v1216=dFast_66670a219f0062becb20922b4014ff7530a53f8fa2c70fdca087b5b9f67eaedb(a0,a1);
v1196=v1216;}
return v1196;}finally{__directDepth--;}}
function f_05ffd0570ccc7655dca87d4bab899c9fbfdf45d5352d3ea336ab231ff18961a2(a0){return d_05ffd0570ccc7655dca87d4bab899c9fbfdf45d5352d3ea336ab231ff18961a2(a0);}
function f_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(a0,a1,a2,a3){try{return dFast_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(a0,a1,a2,a3);}catch(error){if(error!==__deepCall)throw error;return __run(d_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(a0,a1,a2,a3));}}
function f_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(a0,a1,a2,a3,a4){try{return dFast_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(a0,a1,a2,a3,a4);}catch(error){if(error!==__deepCall)throw error;return __run(d_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(a0,a1,a2,a3,a4));}}
function f_240b4d82770aa55288bc615c5de18ec6664a8b220af957a3d2818e2547879117(a0){return d_240b4d82770aa55288bc615c5de18ec6664a8b220af957a3d2818e2547879117(a0);}
function f_4c4283d9bb9a560f33be06edbc0114c9ded935578cb692cfdb535462f78d9be2(a0){return d_4c4283d9bb9a560f33be06edbc0114c9ded935578cb692cfdb535462f78d9be2(a0);}
function f_5f767c355aaf0f5fbc953d9ce843d81625d75240e115f4f018fef42ffcd3842d(a0){return d_5f767c355aaf0f5fbc953d9ce843d81625d75240e115f4f018fef42ffcd3842d(a0);}
function f_6c354deeb0357c30b83c67ef2f12e55115e3a1508eae6f3f36b2739f09278d90(a0){return d_6c354deeb0357c30b83c67ef2f12e55115e3a1508eae6f3f36b2739f09278d90(a0);}
function f_8cf1aef20be8c6745e1cb36686f8ccde00ff20b5621667d1a445e494a81a6465(a0){return d_8cf1aef20be8c6745e1cb36686f8ccde00ff20b5621667d1a445e494a81a6465(a0);}
function f_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(a0,a1){try{return dFast_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(a0,a1);}catch(error){if(error!==__deepCall)throw error;return __run(d_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(a0,a1));}}
function f_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(a0,a1,a2){try{return dFast_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(a0,a1,a2);}catch(error){if(error!==__deepCall)throw error;return __run(d_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(a0,a1,a2));}}
function f_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(a0){try{return dFast_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(a0));}}
function f_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(a0){try{return dFast_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(a0));}}
function f_03298824eef80e61c5d610b0d055588c3b5e18f3e4a0069e0c629ff952a4dfff(a0){return d_03298824eef80e61c5d610b0d055588c3b5e18f3e4a0069e0c629ff952a4dfff(a0);}
function f_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0){try{return dFast_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_071e0745f24e6e7e02e529e326ccc6a77928198f4918f2eda7263f0a3ee2faa9(a0));}}
function f_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0){try{return dFast_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_1b03c8e7d2fe1e3bc4f99ca4eaa7eb57c17092b09000ffb50964ef5ba81545e8(a0));}}
function f_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(a0){try{return dFast_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(a0));}}
function f_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0){try{return dFast_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_255649b9cbac16407b523c81900614f5632a1410d9f86ed805581176f1435118(a0));}}
function f_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0){try{return dFast_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_2f3744a28d2bd400e2c41c08eba448f09f90fa8c111118db0487ee41fd0badaf(a0));}}
function f_32feeed0ef0e575804563216399ba5caee6f40801013e7febc06526a428b9c05(a0){return d_32feeed0ef0e575804563216399ba5caee6f40801013e7febc06526a428b9c05(a0);}
function f_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0){try{return dFast_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_36170a7b1d6c78646e99aac7b5e8963a367cad28a79c282dd5f28e3d1e089b4e(a0));}}
function f_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0){try{return dFast_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_3d31efe703d53eba6ff049b501b23e2c2194f55fdcba5bc093506feb5ae9198b(a0));}}
function f_427b0b37997e853e4c3ce1211556fbd99b80f84a972a4862d8ed930df0cab652(a0){return d_427b0b37997e853e4c3ce1211556fbd99b80f84a972a4862d8ed930df0cab652(a0);}
function f_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0){try{return dFast_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_476d1ba6427290c573c7b7a8648067cffecde052b2c55a2051e3c9b9ce2048c8(a0));}}
function f_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0){try{return dFast_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_4b87ae7c3e9f5dc74a7b7fd43672628d6050af586197963103b944d243990e3f(a0));}}
function f_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0){try{return dFast_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_58037123130d7e1b348ecdc9b98852b56f0072d9fddc440c0f4e907e8e6bc314(a0));}}
function f_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0){try{return dFast_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_63f5abad85991eb0b4316d7a237e4c6dfa250dc5701319158d8e1c5a5d0b5ce1(a0));}}
function f_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0){try{return dFast_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_667f487d1fd10a13f5305b9d558eb5c6b6144d213d729b2f0ac57a392e80cc70(a0));}}
function f_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0){try{return dFast_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_6b1b9775890f183896c7ab29de3706741ab0672b54340ef2271617e5e0408bd1(a0));}}
function f_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0){try{return dFast_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_7da717aaa169a06208f47c85e1ebb5cdc984cfe0b1fa946c657227291fdc427b(a0));}}
function f_7fb84a3d8c0cc8dccb1389411ed329f5786f26af2054a718626e4549bd41453c(a0){return d_7fb84a3d8c0cc8dccb1389411ed329f5786f26af2054a718626e4549bd41453c(a0);}
function f_a039048c26d54adb202c40b817021d597559263e9463d68f4e5d1a1c1b25fea5(a0){return d_a039048c26d54adb202c40b817021d597559263e9463d68f4e5d1a1c1b25fea5(a0);}
function f_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(a0){try{return dFast_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(a0));}}
function f_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0){try{return dFast_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_a3e6acdfd40405483460b2e1f192cdf0bfb29427a7350e13bb37fb3dfa19bb1d(a0));}}
function f_a6e6be603ffc708d75702b41b4951c9610ef010501658e8e255d0cb0930c73ae(a0){return d_a6e6be603ffc708d75702b41b4951c9610ef010501658e8e255d0cb0930c73ae(a0);}
function f_b3e8018f607dbaccf0be3a1707d96ba1896d760d7e5e12bb588a2875a72756be(a0){return d_b3e8018f607dbaccf0be3a1707d96ba1896d760d7e5e12bb588a2875a72756be(a0);}
function f_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0){try{return dFast_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_d42666c6091cf7d7ea4060a6a2f593d66eac2fd6aaa192270663d7d50732bb4a(a0));}}
function f_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0){return d_dde6bdcc9b6b7ecfea016b2cbda59185994641360ea181aa49a54e1dae668102(a0);}
function f_e39d391c398088bd47fb3a92c665b301b6d5f6f6e823e8702cd2400a3598833e(a0){return d_e39d391c398088bd47fb3a92c665b301b6d5f6f6e823e8702cd2400a3598833e(a0);}
function f_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0){try{return dFast_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0);}catch(error){if(error!==__deepCall)throw error;return __run(d_ea53af7218738110d5d4f745cb77765d7388bc5838d8b230b86078d2f20c87b1(a0));}}
function f_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0){return d_f5850ee9b1fbe51ad57a9d4942b368f18c86fb69578c4ff37fb69957db61eacc(a0);}
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
function read_17(v,d=0,internal=false){return __node(4,[3n,__node(3,[f_1c6783b7630e489ad75d685892c1041af46bb941ef78eb489136bef208796b00(read_24(v["payload"],d+1,internal)),__node(0,[])])]);}
function write_17(v,d=0,snapshot=false){if(v.c!==4||v.a[0]!==3n)throw Error('recursive record tag');let cursor=v.a[1];if(cursor.c!==3)throw Error('recursive record fields');const field0=cursor.a[0];cursor=cursor.a[1];if(cursor.c!==0)throw Error('recursive record field tail');return Object.fromEntries([["payload",write_24(f_a25ed50f6402238fa54a732e61337c85de747cc90b6fe0dae89e11f0cf779297(field0),d+1,snapshot)]]);}
function read_18(v,d=0,internal=false){if(Object.hasOwn(v,'Some'))return __node(1,[read_9(v.Some,d+1,internal)]);return __node(0,[]);}
function write_18(v,d=0,snapshot=false){return v.c===0?{None:null}:{Some:write_9(v.a[0],d+1,snapshot)};}
function read_19(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_3(branch.Ok,d+1,internal)]);return __node(1,[read_8(branch.Err,d+1,internal)]);}
function write_19(v,d=0,snapshot=false){return v.c===0?{Ok:write_3(v.a[0],d+1,snapshot)}:{Err:write_8(v.a[0],d+1,snapshot)};}
function read_20(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_10(branch.Ok,d+1,internal)]);return __node(1,[read_23(branch.Err,d+1,internal)]);}
function write_20(v,d=0,snapshot=false){return v.c===0?{Ok:write_10(v.a[0],d+1,snapshot)}:{Err:write_23(v.a[0],d+1,snapshot)};}
function read_21(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_12(branch.Ok,d+1,internal)]);return __node(1,[read_20(branch.Err,d+1,internal)]);}
function write_21(v,d=0,snapshot=false){return v.c===0?{Ok:write_12(v.a[0],d+1,snapshot)}:{Err:write_20(v.a[0],d+1,snapshot)};}
function read_22(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_13(branch.Ok,d+1,internal)]);return __node(1,[read_21(branch.Err,d+1,internal)]);}
function write_22(v,d=0,snapshot=false){return v.c===0?{Ok:write_13(v.a[0],d+1,snapshot)}:{Err:write_21(v.a[0],d+1,snapshot)};}
function read_23(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_14(branch.Ok,d+1,internal)]);return __node(1,[read_11(branch.Err,d+1,internal)]);}
function write_23(v,d=0,snapshot=false){return v.c===0?{Ok:write_14(v.a[0],d+1,snapshot)}:{Err:write_11(v.a[0],d+1,snapshot)};}
function read_24(v,d=0,internal=false){const branch=internal?v:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[read_15(branch.Ok,d+1,internal)]);return __node(1,[read_22(branch.Err,d+1,internal)]);}
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
const initial=__node(0,[__node(0,[])]);let physical=f_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(initial);
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
const executed=f_197d023b91b0d93fcccb3b555e67285115bf997e022df302b7f9f6736ef4b04c(physical,version,a0,a1,a2);const observed=f_8cf1aef20be8c6745e1cb36686f8ccde00ff20b5621667d1a445e494a81a6465(executed),next=f_05ffd0570ccc7655dca87d4bab899c9fbfdf45d5352d3ea336ab231ff18961a2(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_19(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "erase":{
const a0=read_1(args[0],0);
const a1=read_0(args[1],0);
const executed=f_15862e2bca5c1fc6afb417e3bc28011b78411835787974e7b0520c89bda049b3(physical,version,a0,a1);const observed=f_8cf1aef20be8c6745e1cb36686f8ccde00ff20b5621667d1a445e494a81a6465(executed),next=f_05ffd0570ccc7655dca87d4bab899c9fbfdf45d5352d3ea336ab231ff18961a2(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_19(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&true&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([0]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "total":{
const executed=f_8d7aae61e10c250551734d2c9a2a692444a1df9eb31dc4c6baf6794dbe6610b4(physical,version);const observed=f_5f767c355aaf0f5fbc953d9ce843d81625d75240e115f4f018fef42ffcd3842d(executed),next=f_6c354deeb0357c30b83c67ef2f12e55115e3a1508eae6f3f36b2739f09278d90(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_2(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
case "row":{
const a0=read_1(args[0],0);
const executed=f_c040b0ef129bb8d5fd8c6bc58deff6027cd67433a024990ae80b05631a19d47c(physical,version,a0);const observed=f_4c4283d9bb9a560f33be06edbc0114c9ded935578cb692cfdb535462f78d9be2(executed),next=f_240b4d82770aa55288bc615c5de18ec6664a8b220af957a3d2818e2547879117(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [reply,committed,newVersion,events]=observed.a;const result=write_18(reply,0,false),staged=__events(events),published=[];
if(committed){for(let i=0;i<staged.length;i++){const [channel,value,publicValue]=staged[i];outbox.push({commit:newVersion,position:BigInt(i),channel,value});if(!resultOnly)published.push({commit:newVersion,position:BigInt(i),channel,value:publicValue});}}physical=next;version=newVersion;if(!committed&&false&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{action:name,result});if(committed)observers.commit([]);return resultOnly?result:{result,committed,version:newVersion,events:published};}
default:throw Error(`unknown action ${name}`);}}catch(e){if(transaction?.strict)transaction.failure=e;throw e;}}
async function invoke_json(name,args){return invoke_native(name,args);}
const actionNames=new Set(["put","erase","total","row"]);
return Object.freeze({subscribe:observers.subscribe,subscribeGroup:observers.subscribeGroup,subscribeValues:(...args)=>observers.subscribeValues(...args),batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,transaction(callback){if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();transaction.strict=true;try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}},invoke:invoke_json,invoke_json,bind(name,{resultOnly=false}={}){if(!actionNames.has(name))throw Error(`unknown action ${name}`);return (...args)=>invoke_native(name,args,resultOnly);},beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length,notificationMark:observers.hold()};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');if(transaction.failure)throw transaction.failure;transaction=null;observers.release();},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;const mark=transaction.notificationMark;transaction=null;observers.rollback(mark);},get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();
const logical=f_d4d7ee270c966b17c126414d4d749624c512116a7ad7c65840732d2bda4b7418(physical);return __snapshotEncode(__meta,{version,tables:__tables(logical),outbox},limits);},async restore(bytes,limits){boundary();if(transaction)throw Error('restore during state transaction');busy=true;observers.hold();let restored=false;try{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);
const next=f_e1f7f4bd92e14189964f695365ea04d1b9423d79bc86175e2a8d213615c42676(logical);
physical=next;version=saved.version;outbox=saved.outbox;restored=true;}finally{busy=false;if(restored)observers.commit([0]);observers.release();}}});}
function __publicEvent(channel,value){switch(channel){
case "seen":return write_2(read_2(value,0,true),0,false);
default:throw Error('unknown source event');}}

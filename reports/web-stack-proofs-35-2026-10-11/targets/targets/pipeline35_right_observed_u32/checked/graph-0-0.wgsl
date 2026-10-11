@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=min(a0[0],a1[0]);let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a1[1u+(i)*1u+0u];
var t2:u32=a3[(0u)*1u+0u];
var t3:u32=a2[(0u)*1u+0u];
var t4:u32=t1;
var t5:u32=t3;
var t6:u32=t4;
var t7:u32=t5;
var t8:u32;
if (t7==0) {
t8=0u;
} else { t8=t6 % t7; }
var t9:u32=t8;
var t10:u32=(t9 + t4);
var t11:u32=(t10 + t3);
var t12:u32=a3[(0u)*1u+0u];
var t13:u32=a2[(0u)*1u+0u];
var t14:u32=t0;
var t15:u32=t11;
var t16:u32=t12;
var t17:u32=t13;
var t18:u32=t14;
var t19:u32;
if ((t18 < t15)) {
var t20:u32=t14;
var t21:u32=t15;
t19=(t20 + (t21 * t17));
} else {
var t22:u32=t14;
var t23:u32=t15;
t19=(t22 - (t23 * t17));
}
var t24:u32=t19;
var t25:u32=(t24 + t16);
output[1u+i*1u+0u]=t25;


}
}
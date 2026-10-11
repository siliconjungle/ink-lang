@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=min(a0[0],a1[0]);let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a3[(0u)*1u+0u];
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=t0;
var t4:u32=t2;
var t5:u32=t3;
var t6:u32=t4;
var t7:u32;
if (t6==0) {
t7=0u;
} else { t7=t5 / t6; }
var t8:u32=t7;
var t9:u32=(t8 + t3);
var t10:u32=(t9 + t1);
var t11:u32=a1[1u+(i)*1u+0u];
var t12:u32=a3[(0u)*1u+0u];
var t13:u32=a2[(0u)*1u+0u];
var t14:u32=t11;
var t15:u32=t13;
var t16:u32=t14;
var t17:u32=t15;
var t18:u32;
if (t17==0) {
t18=0u;
} else { t18=t16 % t17; }
var t19:u32=t18;
var t20:u32=(t19 + t14);
var t21:u32=(t20 + t13);
var t22:u32=a3[(0u)*1u+0u];
var t23:u32=a2[(0u)*1u+0u];
var t24:u32=t10;
var t25:u32=t21;
var t26:u32=t22;
var t27:u32=t23;
var t28:u32=t24;
var t29:u32;
if ((t28 < t26)) {
var t30:u32=t24;
var t31:u32=(t30 + t25);
t29=(t31 * t27);
} else {
var t32:u32=t24;
var t33:u32=(t32 - t25);
t29=(t33 + t26);
}
var t34:u32=t29;
output[1u+i*1u+0u]=t34;


}
}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=a0[0u];}if(i>=a0[0u]){return;}
var t0:u32=i;
var t1:u32=a0[1u+(i)*1u+0u];
var t2:u32=t0;
var t3:u32=t1;
var t4:u32=a2[(0u)*1u+0u];
var t5:u32=a3[(0u)*1u+0u];
var t6:u32=t2;
var t7:u32;
if ((t6 < t4)) {
var t8:u32=t3;
t7=(t8 + t5);
} else {
var t9:u32=t3;
t7=(t9 - t4);
}
var t10:u32=t7;
var t11:u32=t0;
var t12:u32=t1;
var t13:u32=a2[(0u)*1u+0u];
var t14:u32=a3[(0u)*1u+0u];
var t15:u32=t11;
var t16:u32=3u;
var t17:u32;
if (t16==0) {
t17=0u;
} else { t17=t15 % t16; }
var t18:u32=t17;
var t19:u32;
if ((t18 == 0u)) {
var t20:u32=t12;
t19=(t20 * t14);
} else {
var t21:u32=t12;
t19=(t21 + t13);
}
var t22:u32=t19;
var t23:u32=a2[(0u)*1u+0u];
var t24:u32=a3[(0u)*1u+0u];
var t25:u32=t10;
var t26:u32;
if ((t25 < t22)) {
var t27:u32=t10;
var t28:u32=t22;
t26=(t27 + (t28 * t24));
} else {
var t29:u32=t10;
var t30:u32=(t29 - t22);
t26=(t30 + t23);
}
var t31:u32=t26;
output[1u+i*1u+0u]=t31;


}
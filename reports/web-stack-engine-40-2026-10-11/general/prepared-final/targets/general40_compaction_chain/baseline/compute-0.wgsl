struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
var t0:u32=0u;
for(var t1=0u;t1<a0[0u];t1++){
var t2:u32=a0[1u+(t1)*1u+0u];
var t3:u32=t2;
var t4:u32=a3[(0u)*1u+0u];
var t5:u32=t3;
var t6:u32=(t5 * t4);
var t7:u32=(t6 + 1u);
var t8:u32=t7;
var t9:u32=16u;
var t10:u32;
if (t9==0) {
t10=0u;
} else { t10=t8 % t9; }
var t11:u32=t10;
if((t11 < a2[(0u)*1u+0u])){t0++;}}
if(i==0u){output[0u]=t0;}if(i>=t0){return;}
var t12:u32=0u;
var t13:u32;
for(var t14=0u;t14<a0[0u];t14++){
var t15:u32=a0[1u+(t14)*1u+0u];
var t16:u32=t15;
var t17:u32=a3[(0u)*1u+0u];
var t18:u32=t16;
var t19:u32=(t18 * t17);
var t20:u32=(t19 + 1u);
var t21:u32=t20;
var t22:u32=t21;
var t23:u32=16u;
var t24:u32;
if (t23==0) {
t24=0u;
} else { t24=t22 % t23; }
var t25:u32=t24;
if((t25 < a2[(0u)*1u+0u])){if(t12==i){t13=t20;break;}t12++;}}
var t26:u32=t13;
var t27:u32=t26;
var t28:u32=a2[(0u)*1u+0u];
var t29:u32=a3[(0u)*1u+0u];
var t30:u32=t27;
var t31:u32;
if ((t30 < t28)) {
var t32:u32=t27;
t31=(t32 + t29);
} else {
var t33:u32=t27;
t31=(t33 - t28);
}
var t34:u32=t31;
output[1u+i*1u+0u]=t34;


}
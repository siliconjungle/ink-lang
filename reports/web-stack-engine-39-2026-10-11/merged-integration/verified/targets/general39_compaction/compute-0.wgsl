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
var t4:u32=16u;
var t5:u32;
if (t4==0) {
t5=0u;
} else { t5=t3 % t4; }
var t6:u32=t5;
if((t6 < a2[(0u)*1u+0u])){t0++;}}
if(i==0u){output[0u]=t0;}if(i>=t0){return;}
var t7:u32=0u;
var t8:u32;
for(var t9=0u;t9<a0[0u];t9++){
var t10:u32=a0[1u+(t9)*1u+0u];
var t11:u32=t10;
var t12:u32=t11;
var t13:u32=16u;
var t14:u32;
if (t13==0) {
t14=0u;
} else { t14=t12 % t13; }
var t15:u32=t14;
if((t15 < a2[(0u)*1u+0u])){if(t7==i){t8=t10;break;}t7++;}}
var t16:u32=t8;
var t17:u32=t16;
var t18:u32=(t17 * a3[(0u)*1u+0u]);
var t19:u32=(t18 + 1u);
output[1u+i*1u+0u]=t19;


}
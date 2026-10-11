struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@group(0) @binding(2) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[1]){return;}
var t0:u32=0u;
for(var t1=0u;t1<a0[0u];t1++){
var t2:vec2<u32>=vec2<u32>(a0[1u+(t1)*2u+0u],a0[1u+(t1)*2u+1u]);
var t3:u32=(t2).x;
var t4:u32=(t3 + 1u);
var t5:u32=(t2).y;
var t6:u32=(t5 * 3u);
var t7:vec2<u32>=vec2<u32>(t4,t6);
var t8:u32=(t7).x;
if((t8 > 0u)){t0++;}}
if(i==0u){output[0u]=t0;}if(i>=t0){return;}
var t9:u32=0u;
var t10:vec2<u32>;
for(var t11=0u;t11<a0[0u];t11++){
var t12:vec2<u32>=vec2<u32>(a0[1u+(t11)*2u+0u],a0[1u+(t11)*2u+1u]);
var t13:u32=(t12).x;
var t14:u32=(t13 + 1u);
var t15:u32=(t12).y;
var t16:u32=(t15 * 3u);
var t17:vec2<u32>=vec2<u32>(t14,t16);
var t18:vec2<u32>=t17;
var t19:u32=(t18).x;
if((t19 > 0u)){if(t9==i){t10=t17;break;}t9++;}}
var t20:vec2<u32>=t10;
output[1u+i*2u+0u]=(t20).x;
output[1u+i*2u+1u]=(t20).y;


}
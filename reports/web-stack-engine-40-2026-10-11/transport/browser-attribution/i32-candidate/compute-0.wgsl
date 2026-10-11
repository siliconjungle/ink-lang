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
var t2:i32=bitcast<i32>(a0[1u+(t1)*1u+0u]);
var t3:i32=t2;
var t4:i32=bitcast<i32>(bitcast<u32>(t3) + bitcast<u32>(1i));
var t5:i32=t4;
if((t5 < 0i)){t0++;}}
if(i==0u){output[0u]=t0;}if(i>=t0){return;}
var t6:i32=0i;
for(var t7=0u;t7<=i;t7++){
var t8:u32=0u;
var t9:i32;
for(var t10=0u;t10<a0[0u];t10++){
var t11:i32=bitcast<i32>(a0[1u+(t10)*1u+0u]);
var t12:i32=t11;
var t13:i32=bitcast<i32>(bitcast<u32>(t12) + bitcast<u32>(1i));
var t14:i32=t13;
var t15:i32=t14;
if((t15 < 0i)){if(t8==t7){t9=t13;break;}t8++;}}
t6=bitcast<i32>(bitcast<u32>(t6) + bitcast<u32>(t9));}
var t16:i32=t6;
output[1u+i*1u+0u]=bitcast<u32>(t16);


}
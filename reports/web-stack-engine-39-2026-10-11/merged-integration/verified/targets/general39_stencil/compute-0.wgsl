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
if(i==0u){output[0u]=a0[0u];}if(i>=a0[0u]){return;}
var t0:u32=i;
var t1:u32=a0[1u+(i)*1u+0u];
var t2:u32=t0;
var t3:u32=(t2 - 1u);
var t4:u32;if(t3<a0[0u]){
t4=a0[1u+(t3)*1u+0u];}else{
t4=0u;}
var t5:u32=t4;
var t6:u32=t1;
var t7:u32=(t5 + (t6 * a3[(0u)*1u+0u]));
var t8:u32=t0;
var t9:u32=(t8 + 1u);
var t10:u32;if(t9<a0[0u]){
t10=a0[1u+(t9)*1u+0u];}else{
t10=0u;}
var t11:u32=(t7 + t10);
output[1u+i*1u+0u]=t11;


}
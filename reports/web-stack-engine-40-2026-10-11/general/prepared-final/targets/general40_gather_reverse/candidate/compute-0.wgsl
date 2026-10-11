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
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=(t2 - t0);
var t4:u32=(t3 - 1u);
var t5:u32;if(t4<a1[0u]){
t5=a1[1u+(t4)*1u+0u];}else{
t5=t1;}
var t6:u32=t5;
var t7:u32=t1;
var t8:u32=(t6 + (t7 * a3[(0u)*1u+0u]));
output[1u+i*1u+0u]=t8;


}
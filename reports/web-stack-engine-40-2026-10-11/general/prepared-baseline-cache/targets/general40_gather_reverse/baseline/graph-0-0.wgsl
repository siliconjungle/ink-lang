struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=a0[0];let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a2[(0u)*1u+0u];
var t1:u32=(t0 - i);
var t2:u32=(t1 - 1u);
var t3:u32;if(t2<a3[0u]){
t3=a3[1u+(t2)*1u+0u];}else{
t3=a0[1u+(i)*1u+0u];}
var t4:u32=t3;
var t5:u32=a0[1u+(i)*1u+0u];
var t6:u32=(t4 + (t5 * a1[(0u)*1u+0u]));
output[1u+i*1u+0u]=t6;


}
}
struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=min(a0[0],a1[0]);let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=(t0 * a1[1u+(i)*1u+0u]);
output[1u+i*1u+0u]=t1;


}
}
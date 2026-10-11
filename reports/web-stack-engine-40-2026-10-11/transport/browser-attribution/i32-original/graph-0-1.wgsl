struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var used=0u;for(var i=0u;i<a0[0];i++){
var t0:i32=bitcast<i32>(a0[1u+(i)*1u+0u]);
if ((t0 < 0i)) {
output[1u+used*1u+0u]=bitcast<u32>(bitcast<i32>(a0[1u+(i)*1u+0u]));

used++;
}

}output[0]=used;
}
struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var used=0u;for(var i=0u;i<a0[0];i++){
var t0:u32=(vec2<u32>(a0[1u+(i)*2u+0u],a0[1u+(i)*2u+1u])).x;
if ((t0 > 0u)) {
output[1u+used*2u+0u]=(vec2<u32>(a0[1u+(i)*2u+0u],a0[1u+(i)*2u+1u])).x;
output[1u+used*2u+1u]=(vec2<u32>(a0[1u+(i)*2u+0u],a0[1u+(i)*2u+1u])).y;

used++;
}

}output[0]=used;
}
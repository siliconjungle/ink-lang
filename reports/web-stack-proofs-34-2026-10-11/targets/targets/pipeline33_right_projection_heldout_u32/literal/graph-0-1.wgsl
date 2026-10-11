@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var acc:u32=0u;output[0]=a0[0];for(var i=0u;i<a0[0];i++){
acc=(acc + a0[1u+(i)*1u+0u]);
output[1u+i*1u+0u]=acc;


}
}
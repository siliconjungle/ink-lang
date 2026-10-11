@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var t0:u32=a2[(0u)*1u+0u];
var t1:u32=a0[(0u)*1u+0u];
var t2:u32;
if (t1==0) {
t2=0u;
} else { t2=t0 % t1; }
var t3:u32=t2;
var t4:bool=(t3 < a1[(0u)*1u+0u]);
output[0u+0u]=select(0u,1u,t4);


}
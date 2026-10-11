@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=min(a0[0],a1[0]);let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a1[1u+(i)*1u+0u];
var t1:u32=a3[(0u)*1u+0u];
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=t0;
var t4:u32;
if ((t3 < t1)) {
var t5:u32=t0;
t4=(t5 + t2);
} else {
var t6:u32=t0;
t4=(t6 - t2);
}
var t7:u32=t4;
output[1u+i*1u+0u]=t7;


}
}
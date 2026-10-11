@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=a0[0];let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a2[(0u)*1u+0u];
var t2:u32=a1[(0u)*1u+0u];
var t3:u32=t0;
var t4:u32=t2;
var t5:u32;
if (t4==0) {
t5=0u;
} else { t5=t3 / t4; }
var t6:u32=t5;
var t7:u32=(t6 + t1);
output[1u+i*1u+0u]=t7;


}
}
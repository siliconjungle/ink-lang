@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var t0:u32=a2[(0u)*1u+0u];
var t1:u32;
if ((t0 < a1[(0u)*1u+0u])) {
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=a0[(0u)*1u+0u];
var t4:u32;
if (t3==0) {
t4=0u;
} else { t4=t2 / t3; }
var t5:u32=t4;
t1=(t5 + a1[(0u)*1u+0u]);
} else {
var t6:u32=a2[(0u)*1u+0u];
var t7:u32=a0[(0u)*1u+0u];
var t8:u32;
if (t7==0) {
t8=0u;
} else { t8=t6 % t7; }
var t9:u32=t8;
t1=(t9 + a0[(0u)*1u+0u]);
}
var t10:u32=t1;
output[0u+0u]=t10;


}
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
var t5:u32=t3;
var t6:u32=t4;
var t7:u32;
if (t6==0) {
t7=0u;
} else { t7=t5 / t6; }
var t8:u32=t7;
var t9:u32=t3;
var t10:u32=t4;
var t11:u32;
if (t10==0) {
t11=0u;
} else { t11=t9 % t10; }
var t12:u32=(t8 + t11);
var t13:u32=(t12 + t1);
output[1u+i*1u+0u]=t13;


}
}
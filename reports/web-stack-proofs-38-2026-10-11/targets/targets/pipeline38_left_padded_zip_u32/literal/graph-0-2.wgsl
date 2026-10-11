@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=a0[0];let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=i;
var t1:u32=a0[1u+(i)*1u+0u];
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=a1[(0u)*1u+0u];
var t4:u32=t0;
var t5:u32=3u;
var t6:u32;
if (t5==0) {
t6=0u;
} else { t6=t4 % t5; }
var t7:u32=t6;
var t8:u32;
if ((t7 == 0u)) {
var t9:u32=t1;
t8=(t9 * t3);
} else {
var t10:u32=t1;
t8=(t10 + t2);
}
var t11:u32=t8;
output[1u+i*1u+0u]=t11;


}
}
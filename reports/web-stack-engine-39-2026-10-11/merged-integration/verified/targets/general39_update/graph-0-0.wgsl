struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=a0[0];let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=i;
var t1:u32=a1[(0u)*1u+0u];
var t2:u32;
if (t1==0) {
t2=1u;
} else { t2=t0 % t1; }
var t3:u32=t2;
var t4:u32;
if ((t3 == 0u)) {
var t5:u32=i;
var t6:u32;if(t5<a2[0u]){
t6=a2[1u+(t5)*1u+0u];}else{
t6=a0[1u+(i)*1u+0u];}
t4=t6;
} else {
t4=a0[1u+(i)*1u+0u];
}
var t7:u32=t4;
output[1u+i*1u+0u]=t7;


}
}
struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@group(0) @binding(2) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[1]){return;}
var t0:u32=0u;
for(var t1=0u;t1<a0[0u];t1++){
var t2:bool=(a0[1u+(t1)*1u+0u]!=0u);
var t3:bool;
if (t2) {
t3=false;
} else {
t3=true;
}
var t4:bool=t3;
if(t4){t0++;}}
if(i==0u){output[0u]=t0;}if(i>=t0){return;}
var t5:u32=0u;
var t6:bool;
for(var t7=0u;t7<a0[0u];t7++){
var t8:bool=(a0[1u+(t7)*1u+0u]!=0u);
var t9:bool;
if (t8) {
t9=false;
} else {
t9=true;
}
var t10:bool=t9;
var t11:bool=t10;
if(t11){if(t5==i){t6=t10;break;}t5++;}}
var t12:bool=t6;
output[1u+i*1u+0u]=select(0u,1u,t12);


}
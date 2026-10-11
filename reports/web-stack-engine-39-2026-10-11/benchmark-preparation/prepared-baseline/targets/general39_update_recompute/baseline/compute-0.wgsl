@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=a0[0u];}if(i>=a0[0u]){return;}
var t0:u32=i;
var t1:u32=a0[1u+(i)*1u+0u];
var t2:u32=t0;
var t3:u32=a3[(0u)*1u+0u];
var t4:u32;
if (t3==0) {
t4=1u;
} else { t4=t2 % t3; }
var t5:u32=t4;
var t6:u32;
if ((t5 == 0u)) {
var t7:u32=t0;
var t8:u32;if(t7<a1[0u]){
t8=a1[1u+(t7)*1u+0u];}else{
t8=t1;}
t6=t8;
} else {
t6=t1;
}
var t9:u32=t6;
output[1u+i*1u+0u]=t9;


}
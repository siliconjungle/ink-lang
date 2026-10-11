@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=min(a0[0u],a1[0u]);}if(i>=min(a0[0u],a1[0u])){return;}
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a1[1u+(i)*1u+0u];
var t2:u32=t1;
var t3:u32;
if ((t2 < a2[(0u)*1u+0u])) {
var t4:u32=t1;
t3=(t4 + a3[(0u)*1u+0u]);
} else {
var t5:u32=t1;
t3=(t5 - a3[(0u)*1u+0u]);
}
var t6:u32=t3;
output[1u+i*1u+0u]=t6;


}
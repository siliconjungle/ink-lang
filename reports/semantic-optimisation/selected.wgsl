@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read_write> output:array<u32>;
@group(0) @binding(2) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[1]){return;}
var t0:u32=a0[(i)*1u+0u];
var t1:u32=t0;
var t2:u32=(t1 * 3u);
var t3:u32=t2;
var t4:u32=(t3 + 10u);
output[i*1u+0u]=t4;


}
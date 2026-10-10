@group(0) @binding(0) var<storage,read> input_data:array<u32>;
@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;
@group(0) @binding(2) var<storage,read> input_length:u32;
@group(0) @binding(3) var<storage,read_write> output_length:u32;
@group(0) @binding(4) var<storage,read> params:array<u32>;

@group(0) @binding(5) var<storage,read_write> prefixes:array<u32>;
@group(0) @binding(6) var<storage,read_write> counts:array<u32>;
var<workgroup> scan:array<u32,256>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>,@builtin(local_invocation_id) lid:vec3<u32>,@builtin(workgroup_id) group:vec3<u32>) {
var selected=0u;
if(gid.x<input_length){
if((input_data[gid.x] > 100u)){selected=1u;}
}
scan[lid.x]=selected;
workgroupBarrier();
for(var stride=1u;stride<256u;stride*=2u){
var previous=0u;if(lid.x>=stride){previous=scan[lid.x-stride];}
workgroupBarrier();scan[lid.x]+=previous;workgroupBarrier();
}
if(gid.x<input_length){prefixes[gid.x]=scan[lid.x];}
if(lid.x==255u){counts[group.x]=scan[255];}
}
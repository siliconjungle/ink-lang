@group(0) @binding(0) var<storage,read> input_data:array<u32>;
@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;
@group(0) @binding(2) var<storage,read> input_length:u32;
@group(0) @binding(3) var<storage,read_write> output_length:u32;
var<workgroup> partial:array<u32,256>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>,@builtin(local_invocation_id) lid:vec3<u32>,@builtin(workgroup_id) group:vec3<u32>) {
    var value=0u;
    if(gid.x<input_length){value=input_data[gid.x];}
    partial[lid.x]=value;
    workgroupBarrier();
    for(var stride=128u;stride>0u;stride/=2u){
        if(lid.x<stride){partial[lid.x]+=partial[lid.x+stride];}
        workgroupBarrier();
    }
    if(lid.x==0u){output_data[group.x]=partial[0];}
    if(gid.x==0u){output_length=(input_length+255u)/256u;}
}

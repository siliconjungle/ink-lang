@group(0) @binding(0) var<storage,read> input_data:array<u32>;
@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;
@group(0) @binding(2) var<storage,read> input_length:u32;
@group(0) @binding(3) var<storage,read> prefixes:array<u32>;
@group(0) @binding(4) var<storage,read> offsets:array<u32>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
    let i=gid.x;if(i>=input_length){return;}
    var previous=0u;if(i%256u!=0u){previous=prefixes[i-1u];}
    let inclusive=prefixes[i];
    if(inclusive>previous){output_data[offsets[i/256u]+inclusive-1u]=input_data[i];}
}

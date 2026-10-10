@group(0) @binding(0) var<storage,read> counts:array<u32>;
@group(0) @binding(1) var<storage,read_write> offsets:array<u32>;
@group(0) @binding(2) var<storage,read_write> output_length:u32;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
    if(gid.x>=arrayLength(&counts)){return;}
    // Simple ordered block prefix primitive; selection measures its full cost.
    var before=0u;for(var block=0u;block<gid.x;block++){before+=counts[block];}
    offsets[gid.x]=before;
    if(gid.x+1u==arrayLength(&counts)){output_length=before+counts[gid.x];}
}

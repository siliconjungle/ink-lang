@group(0) @binding(0) var<storage,read> input_data:array<u32>;
@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;
@group(0) @binding(2) var<storage,read> input_length:u32;
@group(0) @binding(3) var<storage,read_write> output_length:u32;
@group(0) @binding(4) var<storage,read> params:array<u32>;

@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>) {
if(gid.x==0u){output_length=input_length;}
if(gid.x<input_length){
output_data[gid.x]=((input_data[gid.x] * params[1]) + 7u);
}
}
@group(0) @binding(0) var<storage,read> input_length:u32;
@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;
@compute @workgroup_size(1) fn main(){output_data[0]=input_length;}

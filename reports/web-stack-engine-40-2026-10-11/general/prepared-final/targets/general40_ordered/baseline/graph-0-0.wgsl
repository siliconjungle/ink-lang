struct InkBuffer_u32{data:array<u32,64>,length:u32,}
struct InkBuffer_i32{data:array<i32,64>,length:u32,}
struct InkBuffer_f32{data:array<f32,64>,length:u32,}
struct InkBuffer_bool{data:array<bool,64>,length:u32,}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var acc:u32=a1[(0u)*1u+0u];var cursor=a0[0];loop{if(cursor==0u){break;}cursor--;let i=cursor;
var t0:u32=acc;
var t1:u32;
if ((t0 < a1[(0u)*1u+0u])) {
var t2:u32=a0[1u+(i)*1u+0u];
var t3:u32=acc;
t1=(t2 + (t3 * a2[(0u)*1u+0u]));
} else {
var t4:u32=a0[1u+(i)*1u+0u];
t1=(t4 - acc);
}
acc=t1;

}output[0u+0u]=acc;

}
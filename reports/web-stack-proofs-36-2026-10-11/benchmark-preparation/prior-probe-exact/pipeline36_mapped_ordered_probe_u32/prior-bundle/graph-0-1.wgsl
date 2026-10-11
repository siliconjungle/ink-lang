@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var acc:u32=a1[(0u)*1u+0u];var cursor=a0[0];loop{if(cursor==0u){break;}cursor--;let i=cursor;
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=acc;
var t2:u32=a1[(0u)*1u+0u];
var t3:u32=a2[(0u)*1u+0u];
var t4:u32=t1;
var t5:u32;
if ((t4 < t2)) {
var t6:u32=t0;
var t7:u32=t1;
t5=(t6 + (t7 * t3));
} else {
var t8:u32=t0;
t5=(t8 - t1);
}
acc=t5;

}output[0u+0u]=acc;

}
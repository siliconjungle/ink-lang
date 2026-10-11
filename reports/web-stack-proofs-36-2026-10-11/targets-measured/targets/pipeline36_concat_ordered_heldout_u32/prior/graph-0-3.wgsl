@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var acc:u32=a1[(0u)*1u+0u];var cursor=a0[0];loop{if(cursor==0u){break;}cursor--;let i=cursor;
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=acc;
var t2:u32=a3[(0u)*1u+0u];
var t3:u32=a2[(0u)*1u+0u];
var t4:u32=t0;
var t5:u32=t1;
var t6:u32=t2;
var t7:u32=t3;
var t8:u32=t5;
var t9:u32;
if ((t8 < t6)) {
var t10:u32=t4;
var t11:u32=t5;
t9=(t10 + (t11 * t7));
} else {
var t12:u32=t4;
t9=(t12 - t5);
}
acc=t9;

}output[0u+0u]=acc;

}
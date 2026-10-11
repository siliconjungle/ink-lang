@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}var acc:u32=a1[(0u)*1u+0u];var cursor=a0[0];loop{if(cursor==0u){break;}cursor--;let i=cursor;
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a1[(0u)*1u+0u];
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=t0;
var t4:u32=t2;
var t5:u32=t3;
var t6:u32=t4;
var t7:u32;
if (t6==0) {
t7=0u;
} else { t7=t5 / t6; }
var t8:u32=t7;
var t9:u32=(t8 + t1);
var t10:u32=acc;
var t11:u32=a1[(0u)*1u+0u];
var t12:u32=a2[(0u)*1u+0u];
var t13:u32=t9;
var t14:u32=t10;
var t15:u32=t11;
var t16:u32=t12;
var t17:u32=t14;
var t18:u32;
if ((t17 < t15)) {
var t19:u32=t13;
var t20:u32=t14;
t18=(t19 + (t20 * t16));
} else {
var t21:u32=t13;
t18=(t21 - t14);
}
acc=t18;

}output[0u+0u]=acc;

}
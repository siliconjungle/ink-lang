@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=min(a0[0u],a1[0u]);}if(i>=min(a0[0u],a1[0u])){return;}
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=a1[1u+(i)*1u+0u];
var t2:u32=t1;
var t3:u32=a2[(0u)*1u+0u];
var t4:u32=a3[(0u)*1u+0u];
var t5:u32=t2;
var t6:u32=t3;
var t7:u32=t4;
var t8:u32=t5;
var t9:u32;
if ((t8 < t6)) {
var t10:u32=t5;
var t11:u32=t7;
var t12:u32;
if (t11==0) {
t12=0u;
} else { t12=t10 / t11; }
var t13:u32=t12;
t9=(t13 + t6);
} else {
var t14:u32=t5;
var t15:u32=t7;
var t16:u32;
if (t15==0) {
t16=0u;
} else { t16=t14 % t15; }
var t17:u32=t16;
t9=(t17 + t7);
}
var t18:u32=t9;
output[1u+i*1u+0u]=t18;


}
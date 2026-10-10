@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=min(a0[0u],a1[0u]);}if(i>=min(a0[0u],a1[0u])){return;}
var t0:u32=0u;
for(var t1=0u;t1<=i;t1++){
var t2:u32=a0[1u+(t1)*1u+0u];
var t3:u32=t2;
var t4:u32=a2[(0u)*1u+0u];
var t5:u32=a3[(0u)*1u+0u];
var t6:u32=t3;
var t7:u32=t5;
var t8:u32;
if (t7==0) {
t8=0u;
} else { t8=t6 / t7; }
var t9:u32=t8;
var t10:u32=a1[1u+(t1)*1u+0u];
var t11:u32=t10;
var t12:u32=a2[(0u)*1u+0u];
var t13:u32=a3[(0u)*1u+0u];
var t14:u32=t11;
var t15:u32=t13;
var t16:u32;
if (t15==0) {
t16=0u;
} else { t16=t14 % t15; }
var t17:u32=t16;
var t18:u32=(t9 + t4);
var t19:u32=(t17 + t13);
var t20:u32=t18;
t0=(t0 + (t20 + t19));}
var t21:u32=t0;
var t22:u32=t21;
var t23:u32=a2[(0u)*1u+0u];
var t24:u32=a3[(0u)*1u+0u];
var t25:u32=t22;
var t26:u32;
if ((t25 < t23)) {
var t27:u32=t22;
t26=(t27 + t24);
} else {
var t28:u32=t22;
t26=(t28 - t24);
}
var t29:u32=t26;
output[1u+i*1u+0u]=t29;


}
@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read> a3:array<u32>;
@group(0) @binding(4) var<storage,read_write> output:array<u32>;
@group(0) @binding(5) var<storage,read> ink_meta:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){let i=gid.x;if(i>=ink_meta[4]){return;}
if(i==0u){output[0u]=min(a0[0u],a1[0u]);}if(i>=min(a0[0u],a1[0u])){return;}
var t0:u32=a0[1u+(i)*1u+0u];
var t1:u32=t0;
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=a3[(0u)*1u+0u];
var t4:u32=t1;
var t5:u32=t3;
var t6:u32;
if (t5==0) {
t6=0u;
} else { t6=t4 / t5; }
var t7:u32=t6;
var t8:u32=t1;
var t9:u32=t3;
var t10:u32;
if (t9==0) {
t10=0u;
} else { t10=t8 % t9; }
var t11:u32=(t7 + t10);
var t12:u32=(t11 + t2);
var t13:u32=a1[1u+(i)*1u+0u];
var t14:u32=t13;
var t15:u32=a2[(0u)*1u+0u];
var t16:u32=a3[(0u)*1u+0u];
var t17:u32=t14;
var t18:u32;
if ((t17 < t15)) {
var t19:u32=t14;
var t20:u32=t16;
var t21:u32;
if (t20==0) {
t21=0u;
} else { t21=t19 / t20; }
var t22:u32=t21;
t18=(t22 + t15);
} else {
var t23:u32=t14;
var t24:u32=t16;
var t25:u32;
if (t24==0) {
t25=0u;
} else { t25=t23 % t24; }
var t26:u32=t25;
t18=(t26 + t16);
}
var t27:u32=t18;
output[1u+i*1u+0u]=t27;


}
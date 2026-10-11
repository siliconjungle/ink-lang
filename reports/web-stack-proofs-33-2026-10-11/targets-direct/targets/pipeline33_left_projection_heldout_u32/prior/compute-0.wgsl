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
var t2:u32=0u;
for(var t3=0u;t3<=t1;t3++){
var t4:u32=a0[1u+(t3)*1u+0u];
var t5:u32=t4;
var t6:u32=a2[(0u)*1u+0u];
var t7:u32=a3[(0u)*1u+0u];
var t8:u32=t5;
var t9:u32=t7;
var t10:u32;
if (t9==0) {
t10=0u;
} else { t10=t8 / t9; }
var t11:u32=t10;
var t12:u32=t5;
var t13:u32=t7;
var t14:u32;
if (t13==0) {
t14=0u;
} else { t14=t12 % t13; }
var t15:u32=(t11 + t14);
t2=(t2 + (t15 + t6));}
t0=(t0 + t2);}
var t16:u32=t0;
var t17:u32=a1[1u+(i)*1u+0u];
var t18:u32=t17;
var t19:u32=a2[(0u)*1u+0u];
var t20:u32=a3[(0u)*1u+0u];
var t21:u32=t18;
var t22:u32;
if ((t21 < t19)) {
var t23:u32=t18;
var t24:u32=t20;
var t25:u32;
if (t24==0) {
t25=0u;
} else { t25=t23 / t24; }
var t26:u32=t25;
t22=(t26 + t19);
} else {
var t27:u32=t18;
var t28:u32=t20;
var t29:u32;
if (t28==0) {
t29=0u;
} else { t29=t27 % t28; }
var t30:u32=t29;
t22=(t30 + t20);
}
var t31:u32=t22;
output[1u+i*1u+0u]=t31;


}
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
var t2:u32=t0;
var t3:u32=a2[(0u)*1u+0u];
var t4:u32=a3[(0u)*1u+0u];
var t5:u32=t2;
var t6:u32=t4;
var t7:u32=t5;
var t8:u32=t6;
var t9:u32;
if (t8==0) {
t9=0u;
} else { t9=t7 / t8; }
var t10:u32=t9;
var t11:u32=(t10 + t5);
var t12:u32=(t11 + t3);
var t13:u32=a2[(0u)*1u+0u];
var t14:u32=a3[(0u)*1u+0u];
var t15:u32=t12;
var t16:u32=t13;
var t17:u32=t14;
var t18:u32=t15;
var t19:u32;
if ((t18 < t16)) {
var t20:u32=t15;
t19=(t20 + t17);
} else {
var t21:u32=t15;
t19=(t21 - t17);
}
var t22:u32=t19;
var t23:u32=t1;
var t24:u32=a2[(0u)*1u+0u];
var t25:u32=a3[(0u)*1u+0u];
var t26:u32=t23;
var t27:u32=t25;
var t28:u32=t26;
var t29:u32=t27;
var t30:u32;
if (t29==0) {
t30=0u;
} else { t30=t28 % t29; }
var t31:u32=t30;
var t32:u32=(t31 + t26);
var t33:u32=(t32 + t25);
var t34:u32=a2[(0u)*1u+0u];
var t35:u32=a3[(0u)*1u+0u];
var t36:u32=t22;
var t37:u32=t33;
var t38:u32=t34;
var t39:u32=t35;
var t40:u32=t36;
var t41:u32;
if ((t40 < t38)) {
var t42:u32=t36;
var t43:u32=(t42 + t37);
t41=(t43 * t39);
} else {
var t44:u32=t36;
var t45:u32=(t44 - t37);
t41=(t45 + t38);
}
var t46:u32=t41;
output[1u+i*1u+0u]=t46;


}
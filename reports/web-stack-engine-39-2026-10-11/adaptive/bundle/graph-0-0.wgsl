@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read> a2:array<u32>;
@group(0) @binding(3) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let size=a0[0];let i=gid.x;if(i==0u){output[0]=size;}if(i<size){
var t0:u32=i;
var t1:u32=a0[1u+(i)*1u+0u];
var t2:u32=a2[(0u)*1u+0u];
var t3:u32=a1[(0u)*1u+0u];
var t4:u32=t0;
var t5:u32=t1;
var t6:u32=t2;
var t7:u32=t3;
var t8:u32=t5;
var t9:u32=t7;
var t10:u32;
if (t9==0) {
t10=0u;
} else { t10=t8 / t9; }
var t11:u32=t10;
var t12:u32=t4;
var t13:u32=t7;
var t14:u32;
if (t13==0) {
t14=0u;
} else { t14=t12 % t13; }
var t15:u32=(t11 + t14);
var t16:u32=(t15 + t6);
var t17:u32=i;
var t18:u32=a0[1u+(i)*1u+0u];
var t19:u32=a2[(0u)*1u+0u];
var t20:u32=a1[(0u)*1u+0u];
var t21:u32=t17;
var t22:u32=t18;
var t23:u32=t19;
var t24:u32=t20;
var t25:u32=t21;
var t26:u32;
if ((t25 < t23)) {
var t27:u32=t22;
t26=(t27 + t24);
} else {
var t28:u32=t22;
t26=(t28 * 3u);
}
var t29:u32=t26;
var t30:u32=a2[(0u)*1u+0u];
var t31:u32=a1[(0u)*1u+0u];
var t32:u32=t16;
var t33:u32=t29;
var t34:u32=t30;
var t35:u32=t31;
var t36:u32=t32;
var t37:u32;
if ((t36 < t33)) {
var t38:u32=t32;
var t39:u32=t35;
var t40:u32;
if (t39==0) {
t40=0u;
} else { t40=t38 / t39; }
var t41:u32=t40;
t37=(t41 + t33);
} else {
var t42:u32=t33;
var t43:u32=t35;
var t44:u32;
if (t43==0) {
t44=0u;
} else { t44=t42 % t43; }
var t45:u32=t44;
t37=(t45 + t32);
}
var t46:u32=t37;
output[1u+i*1u+0u]=t46;


}
}
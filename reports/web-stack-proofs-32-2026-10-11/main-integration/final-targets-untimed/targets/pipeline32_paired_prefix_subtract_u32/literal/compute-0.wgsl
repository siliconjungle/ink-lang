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
t0=(t0 + a0[1u+(t1)*1u+0u]);}
var t2:u32=0u;
for(var t3=0u;t3<=i;t3++){
t2=(t2 + a1[1u+(t3)*1u+0u]);}
var t4:u32=t0;
var t5:u32=t2;
var t6:u32=t4;
var t7:u32=(t6 - t5);
var t8:u32=t7;
var t9:u32=a2[(0u)*1u+0u];
var t10:u32=a3[(0u)*1u+0u];
var t11:u32=t8;
var t12:u32;
if ((t11 < t9)) {
var t13:u32=t8;
t12=(t13 + t10);
} else {
var t14:u32=t8;
t12=(t14 - t10);
}
var t15:u32=t12;
output[1u+i*1u+0u]=t15;


}
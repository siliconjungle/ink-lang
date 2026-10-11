@group(0) @binding(0) var<storage,read> a0:array<u32>;
@group(0) @binding(1) var<storage,read> a1:array<u32>;
@group(0) @binding(2) var<storage,read_write> output:array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
if(gid.x!=0u){return;}let n=a0[0];output[0]=n+a1[0];for(var i=0u;i<n;i++){output[1u+i*1u+0u]=a0[1u+(i)*1u+0u];

}for(var i=0u;i<a1[0];i++){output[1u+(n+i)*1u+0u]=a1[1u+(i)*1u+0u];
}
}
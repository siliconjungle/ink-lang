// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{if (seed<k){let mut a=seed;for &x in xs.iter().rev(){a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}a as u64}else{let mut a=seed;for &x in xs.iter().rev(){a=(if (a>k){(a).wrapping_sub((x).wrapping_mul(seed))}else{(a).wrapping_add(x)});}a as u64}},
1=>{if (seed<k){let mut a=seed;for &x in xs.iter().rev(){a=(if (x<seed){((a).wrapping_mul(k)).wrapping_add(x)}else{(a).wrapping_sub(x)});}a as u64}else{let mut a=seed;for &x in xs.iter().rev(){a=(if (a<k){((x).wrapping_mul(k)).wrapping_add(a)}else{(x).wrapping_sub((a).wrapping_mul(seed))});}a as u64}},
3=>{let mut a=seed;for &x in xs.iter().rev(){if (rem(x,seed,0u32)<k){let x=(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)});a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}}a as u64},
5=>{for &x in xs{if (x>seed){return x as u64;}}seed as u64},
6=>{let mut acc=seed;for &x in xs.iter().rev(){let a=x;let b=x;let v=(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});acc=(if (acc<seed){(v).wrapping_sub(acc)}else{(v).wrapping_add((acc).wrapping_mul(k))});}acc as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{let mut n=0;for &x in xs{if (rem(x,seed,0u32)<k){*out.add(n)=(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)});n+=1;}}n},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{let n=xs.len().min(ys.len());for j in 0..n{let a=xs[j];let b=ys[j];let v=(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});*out.add(j)=(if (v>k){(v).wrapping_sub(seed)}else{(v).wrapping_add(seed)});}n},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
7=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;*out.add(j)=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});}xs.len()},
8=>{let c0=k.wrapping_add(1u32);let c1=k.wrapping_add(3u32);let c2=k.wrapping_add(5u32);let c3=k.wrapping_add(7u32);let c4=k.wrapping_add(9u32);let c5=k.wrapping_add(11u32);let c6=k.wrapping_add(13u32);let c7=k.wrapping_add(15u32);let c8=k.wrapping_add(17u32);let c9=k.wrapping_add(19u32);let c10=k.wrapping_add(21u32);let c11=k.wrapping_add(23u32);let c12=k.wrapping_add(25u32);let c13=k.wrapping_add(27u32);let c14=k.wrapping_add(29u32);let c15=k.wrapping_add(31u32);for(j,&x)in xs.iter().enumerate(){let mut v=x.wrapping_add(seed);v=v.wrapping_mul(c0).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c1).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c2).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c3).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c4).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c5).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c6).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c7).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c8).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c9).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c10).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c11).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c12).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c13).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c14).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}v=v.wrapping_mul(c15).wrapping_add(x);if v>=4294967291u32{v-=4294967291u32;}*out.add(j)=v;}xs.len()},
_=>panic!("unknown case")}}

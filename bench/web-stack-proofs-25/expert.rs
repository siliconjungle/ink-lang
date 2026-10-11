// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
1=>{let mut a=seed;for &x in xs.iter().rev(){if (rem(x,seed,0u32)<k){let x=(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)});a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}}a as u64},
3=>{let cutoff=quot(k,2u32,0u32);let mut a=seed;for &x in xs.iter().rev(){if ((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<cutoff){let x=(if (x>k){((x).wrapping_mul(k)).wrapping_sub(seed)}else{(seed).wrapping_add(x)});a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}}a as u64},
4=>{for &x in xs{if (x>seed){return x as u64;}}seed as u64},
5=>{for &x in xs{if (x<k){return x as u64;}}seed as u64},
6=>{for &x in xs{if (x>seed){return (if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)}) as u64;}}let x=seed;(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)}) as u64},
8=>{let mut a=0u32;for &x in xs{if (rem(x,seed,0u32)<k){a=a.wrapping_add((if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)}));}}a as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let mut n=0;for &x in xs{if (rem(x,seed,0u32)<k){*out.add(n)=(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)});n+=1;}}n},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{let cutoff=quot(k,2u32,0u32);let mut n=0;for &x in xs{if ((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<cutoff){*out.add(n)=(if (x>k){((x).wrapping_mul(k)).wrapping_sub(seed)}else{(seed).wrapping_add(x)});n+=1;}}n},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
7=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;*out.add(j)=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});}xs.len()},
8=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
_=>panic!("unknown case")}}

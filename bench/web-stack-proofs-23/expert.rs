// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{xs.len() as u64},
1=>{for &x in xs{if (x>seed){return x as u64;}}seed as u64},
2=>{for &x in xs{if (x>seed){return (if (x>k){(x).wrapping_sub(k)}else{(x).wrapping_add(k)}) as u64;}}seed as u64},
3=>{xs.len() as u64},
4=>{for &x in xs{if (x<k){return x as u64;}}seed as u64},
5=>{for &x in xs{if (x<k){return (if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)}) as u64;}}seed as u64},
8=>{let first=xs.first().copied().unwrap_or(seed);(first).wrapping_add(k) as u64},
11=>{let first=xs.first().copied().unwrap_or(seed);((first).wrapping_mul(k)).wrapping_add(seed) as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
3=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});}xs.len()},
7=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});}xs.len()},
8=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
9=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)});}xs.len()},
10=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)});}xs.len()},
11=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
_=>panic!("unknown case")}}

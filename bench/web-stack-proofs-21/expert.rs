// Exact source-stage/fused wrapping algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{let mut a=0u32;for &x in xs{if (x<seed){a=a.wrapping_add(quot((x).wrapping_add(seed),k,seed));}else{a=a.wrapping_add(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed));}}a as u64},
1=>{let mut a=0u32;for &x in xs{if (x<seed){a=a.wrapping_add(quot((x).wrapping_add(seed),k,seed));}else{a=a.wrapping_sub(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed));}}a as u64},
2=>{let mut a=0u32;let mut b=0u32;for &x in xs{if (x<seed){a=a.wrapping_add(quot((x).wrapping_add(seed),k,seed));}else{b=b.wrapping_add(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed));}}(a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3))) as u64},
3=>{let mut a=0u32;for &x in xs{if (x>k){a=a.wrapping_add(((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32));}else{a=a.wrapping_add(quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k));}}a as u64},
4=>{let mut a=0u32;for &x in xs{if (x>k){a=a.wrapping_add(((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32));}else{a=a.wrapping_sub(quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k));}}a as u64},
5=>{let mut a=0u32;let mut b=0u32;for &x in xs{if (x>k){a=a.wrapping_add(((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32));}else{b=b.wrapping_add(quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k));}}(a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3))) as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(k)});let x=value;*out.add(j)=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
7=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let x=value;*out.add(j)=(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(k)});}xs.len()},
8=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let x=value;*out.add(j)=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
9=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (x>k){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)});let x=value;*out.add(j)=(if (rem(i,3u32,0u32)==0u32){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
10=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let x=value;*out.add(j)=(if (x>k){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)});}xs.len()},
11=>{for(j,&original)in xs.iter().enumerate(){let i=j as u32;let x=original;let value=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let x=value;*out.add(j)=(if (rem(i,3u32,0u32)==0u32){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
_=>panic!("unknown case")}}

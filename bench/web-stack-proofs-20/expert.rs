// Same Rust source for native and Wasm, exact ordered wrapping operations.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;1},
1=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
2=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;1},
3=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;1},
4=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;1},
5=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;1},
6=>{for(i,(&a,&b))in xs.iter().zip(ys.iter()).enumerate(){let v=(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});*out.add(i)=(if (v>k){(v).wrapping_sub(seed)}else{(v).wrapping_add(seed)});}xs.len().min(ys.len())},
7=>{for(i,(&a,&b))in xs.iter().zip(ys.iter()).enumerate(){let v=(if (a>b){(a).wrapping_sub(b)}else{(b).wrapping_sub(a)});*out.add(i)=(if (v<seed){(v).wrapping_mul(k)}else{(v).wrapping_add(seed)});}xs.len().min(ys.len())},
_=>panic!("unknown case")}}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{if !(seed<k){return 0;}let mut a=0u32;for &x in xs{a=a.wrapping_add(quot((x).wrapping_add(seed),k,seed));}a as u64},
1=>{if !(seed<k){return 0;}let mut n=0u64;for &x in xs{if (x<seed){n+=1;}}n},
2=>{if !(seed<k){return seed as u64;}let mut a=seed;for &x in xs.iter().rev(){a=((x).wrapping_add(seed)).wrapping_mul((a).wrapping_add(k));}a as u64},
3=>{if !(seed==k){return seed as u64;}let mut a=seed;for &x in xs.iter().rev(){a=(if (x<k){(a).wrapping_add((x).wrapping_mul(seed))}else{(a).wrapping_sub((x).wrapping_mul(k))});}a as u64},
4=>{let mut acc=seed;for &a in xs.iter().rev(){let b=a;let v=(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});acc=(if (acc<seed){(v).wrapping_sub(acc)}else{(v).wrapping_add((acc).wrapping_mul(k))});}acc as u64},
5=>{let mut acc=seed;for &a in xs.iter().rev(){let b=a;let v=(if (a>k){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))});acc=(if (v<seed){(v).wrapping_add((acc).wrapping_mul(k))}else{(v).wrapping_sub(acc)});}acc as u64},
_=>panic!("non-scalar case")}}

// Strong controls; native/Wasm use identical Rust source and fixed ABI.
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let mut a:u32=seed;for &x in xs.iter().rev(){let x=((x).wrapping_mul(3u32)).wrapping_add(k);a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
1=>{let mut a:u32=0;for &x in xs.iter(){if !(x<seed){continue;}a=a.wrapping_add(x);}*out=a;1},
2=>{let mut a:u32=0;for &x in xs.iter(){let x=((x).wrapping_mul(3u32)).wrapping_add(k);if !(x<seed){continue;}a=a.wrapping_add(x);}*out=a;1},
3=>{let mut a:u32=0;for &x in xs.iter(){let x=(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_sub(seed)});a=a.wrapping_add(x);}*out=a;1},
4=>{let mut a:u32=seed;for &x in xs.iter().rev(){if !(x>seed){continue;}a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
5=>{let mut a:u32=seed;for &x in xs.iter().rev(){let x=(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(k)});if !(x>seed){continue;}a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
6=>{let value=xs.first().map(|&x|(if (x<seed){seed}else{x})).unwrap_or(seed);*out=value.wrapping_mul(k);1},
7=>{let value=xs.first().or_else(||ys.first()).copied().unwrap_or(seed);*out=value.wrapping_add(k);1},
8=>{let value=xs.len() as u64;*out=value as u32;*out.add(1)=(value>>32)as u32;2},
9=>{let value=xs.first().map(|&x|(if (x>k){k}else{x})).unwrap_or(k);*out=value.wrapping_sub(seed);1},
10=>{let value=xs.first().or_else(||ys.first()).copied().unwrap_or(k);*out=value.wrapping_sub(seed);1},
11=>{let value=xs.len() as u64;*out=value as u32;*out.add(1)=(value>>32)as u32;2},
12=>{for(i,&x)in xs.iter().enumerate(){*out.add(i)=(if (x<seed){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
13=>{for(i,&x)in xs.iter().enumerate(){*out.add(i)=((if (x<seed){seed}else{x})).wrapping_mul(k);}xs.len()},
_=>panic!("unknown case")}}

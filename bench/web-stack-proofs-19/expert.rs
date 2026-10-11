// Same Rust source for native and Wasm, wrapping word operations.
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let _ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let mut a=0u32;for &x in xs{a=a.wrapping_add(((x).wrapping_add(7u32)).wrapping_mul((x).wrapping_add(seed)));}*out=a;1},
1=>{let mut a=0u32;let mut b=0u32;for &x in xs{let value=((x).wrapping_add(7u32)).wrapping_mul((x).wrapping_add(seed));if (x<seed){a=a.wrapping_add(value);}else{b=b.wrapping_add(value);}}*out=a.wrapping_sub(b);1},
2=>{let mut a=0u32;let mut b=0u32;for &x in xs{let value=((x).wrapping_add(7u32)).wrapping_mul((x).wrapping_add(seed));if (x<seed){a=a.wrapping_add(value);}else{b=b.wrapping_add(value);}}*out=a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3));1},
3=>{let mut a=0u32;for &x in xs{a=a.wrapping_add(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed));}*out=a;1},
4=>{let mut a=0u32;let mut b=0u32;for &x in xs{let value=((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed);if (x>seed){a=a.wrapping_add(value);}else{b=b.wrapping_add(value);}}*out=a.wrapping_sub(b);1},
5=>{let mut a=0u32;let mut b=0u32;for &x in xs{let value=((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed);if (x>seed){a=a.wrapping_add(value);}else{b=b.wrapping_add(value);}}*out=a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3));1},
6=>{for(i,&x)in xs.iter().enumerate(){let a=(if (x<seed){x}else{k});let b=(if (x<seed){k}else{x});*out.add(i)=(if (a<b){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});}xs.len()},
7=>{for(i,&x)in xs.iter().enumerate(){let a=(if (x>k){x}else{seed});let b=(if (x>k){seed}else{x});*out.add(i)=(if (a>b){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))});}xs.len()},
_=>panic!("unknown case")}}

// Same original/expert Rust compiled for native and Wasm. Modulo-word arithmetic explicit.
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|((x).wrapping_mul(3u32)).wrapping_add(k)).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
1=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|((x).wrapping_mul(x)).wrapping_add(k)).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
2=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_sub(seed)})).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
3=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|(if (x<seed){(x).wrapping_mul(k)}else{(x).wrapping_add(k)})).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
4=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|((x).wrapping_sub(seed)).wrapping_mul((x).wrapping_sub(seed))).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
5=>{let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|(if (x<seed){x}else{seed})).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}*out=a;1},
6=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..8{a=(if (a<seed){seed}else{a});}*out.add(i)=a;}xs.len()},
7=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..32{a=(if (a>k){k}else{a});}*out.add(i)=a;}xs.len()},
8=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..64{a=(if (a==seed){k}else{a});}*out.add(i)=a;}xs.len()},
9=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..8{a=(if (a<k){k}else{a});}*out.add(i)=a;}xs.len()},
10=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..32{a=(if (a>seed){seed}else{a});}*out.add(i)=a;}xs.len()},
11=>{for(i,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..64{a=(if (a==k){seed}else{a});}*out.add(i)=a;}xs.len()},
_=>panic!("unknown case")}}

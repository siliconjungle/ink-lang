// Strong controls; native/Wasm use identical Rust source and fixed ABI.
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let values=xs;let mapped:Vec<u32>=values.iter().map(|&x|((x).wrapping_mul(3u32)).wrapping_add(k)).collect();let values=&mapped[..];let mut a:u32=seed;for &x in values.iter().rev(){a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
1=>{let values=xs;let filtered:Vec<u32>=values.iter().copied().filter(|&x|x<seed).collect();let values=&filtered[..];let mut a:u32=0;for &x in values.iter(){a=a.wrapping_add(x);}*out=a;1},
2=>{let values=xs;let mapped:Vec<u32>=values.iter().map(|&x|((x).wrapping_mul(3u32)).wrapping_add(k)).collect();let values=&mapped[..];let filtered:Vec<u32>=values.iter().copied().filter(|&x|x<seed).collect();let values=&filtered[..];let mut a:u32=0;for &x in values.iter(){a=a.wrapping_add(x);}*out=a;1},
3=>{let values=xs;let mapped:Vec<u32>=values.iter().map(|&x|(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_sub(seed)})).collect();let values=&mapped[..];let mut a:u32=0;for &x in values.iter(){a=a.wrapping_add(x);}*out=a;1},
4=>{let values=xs;let filtered:Vec<u32>=values.iter().copied().filter(|&x|x>seed).collect();let values=&filtered[..];let mut a:u32=seed;for &x in values.iter().rev(){a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
5=>{let values=xs;let mapped:Vec<u32>=values.iter().map(|&x|(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(k)})).collect();let values=&mapped[..];let filtered:Vec<u32>=values.iter().copied().filter(|&x|x>seed).collect();let values=&filtered[..];let mut a:u32=seed;for &x in values.iter().rev(){a=x.wrapping_add(a.wrapping_mul(k));}*out=a;1},
6=>{let values:Vec<u32>=xs.iter().map(|&x|(if (x<seed){seed}else{x})).collect();let value=values.first().copied().unwrap_or(seed);*out=value.wrapping_mul(k);1},
7=>{let mut values=Vec::with_capacity(xs.len()+ys.len());values.extend_from_slice(xs);values.extend_from_slice(ys);let value=values.first().copied().unwrap_or(seed);*out=value.wrapping_add(k);1},
8=>{let values:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|(if (a<seed){((a).wrapping_mul(k)).wrapping_add(b)}else{(b).wrapping_sub(seed)})).collect();let value=values.len() as u64;*out=value as u32;*out.add(1)=(value>>32)as u32;2},
9=>{let values:Vec<u32>=xs.iter().map(|&x|(if (x>k){k}else{x})).collect();let value=values.first().copied().unwrap_or(k);*out=value.wrapping_sub(seed);1},
10=>{let mut values=Vec::with_capacity(xs.len()+ys.len());values.extend_from_slice(xs);values.extend_from_slice(ys);let value=values.first().copied().unwrap_or(k);*out=value.wrapping_sub(seed);1},
11=>{let values:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|(if (a==b){((a).wrapping_mul(k)).wrapping_sub(seed)}else{(b).wrapping_add(seed)})).collect();let value=values.len() as u64;*out=value as u32;*out.add(1)=(value>>32)as u32;2},
12=>{for(i,&x)in xs.iter().enumerate(){*out.add(i)=(if (x<seed){(x).wrapping_mul(k)}else{(x).wrapping_add(seed)});}xs.len()},
13=>{let values:Vec<u32>=xs.iter().map(|&x|if x<seed{seed}else{x}).collect();for(i,&x)in values.iter().enumerate(){*out.add(i)=x.wrapping_mul(k);}xs.len()},
_=>panic!("unknown case")}}

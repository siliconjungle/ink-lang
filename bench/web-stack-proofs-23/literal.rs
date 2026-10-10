// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{let yes:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();let no:Vec<u32>=xs.iter().copied().filter(|&x|!(x>seed)).collect();(yes.len() as u64).wrapping_add(no.len() as u64)},
1=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();accepted.first().copied().unwrap_or(seed) as u64},
2=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|(if (x>k){(x).wrapping_sub(k)}else{(x).wrapping_add(k)})).collect();mapped.first().copied().unwrap_or(seed) as u64},
3=>{let yes:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();let no:Vec<u32>=xs.iter().copied().filter(|&x|!(x<k)).collect();(yes.len() as u64).wrapping_add(no.len() as u64)},
4=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();accepted.first().copied().unwrap_or(seed) as u64},
5=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)})).collect();mapped.first().copied().unwrap_or(seed) as u64},
8=>{let scan_first=||{let mut a=0u32;let values:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();values.first().copied().unwrap_or(seed)};(scan_first()).wrapping_add(k) as u64},
11=>{let scan_first=||{let mut a=0u32;let values:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();values.first().copied().unwrap_or(seed)};((scan_first()).wrapping_mul(k)).wrapping_add(seed) as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
3=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{let mut a=0u32;let prefixes:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();let zipped:Vec<u32>=prefixes.iter().zip(xs.iter()).map(|(&prefix,&x)|(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)})).collect();for(j,&value)in zipped.iter().enumerate(){*out.add(j)=value;}zipped.len()},
7=>{let mut a=0u32;let prefixes:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();let zipped:Vec<u32>=xs.iter().zip(prefixes.iter()).map(|(&x,&prefix)|(if (x<seed){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)})).collect();for(j,&value)in zipped.iter().enumerate(){*out.add(j)=value;}zipped.len()},
8=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
9=>{let mut a=0u32;let prefixes:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();let zipped:Vec<u32>=prefixes.iter().zip(xs.iter()).map(|(&prefix,&x)|(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)})).collect();for(j,&value)in zipped.iter().enumerate(){*out.add(j)=value;}zipped.len()},
10=>{let mut a=0u32;let prefixes:Vec<u32>=xs.iter().map(|&x|{a=a.wrapping_add(x);a}).collect();let zipped:Vec<u32>=xs.iter().zip(prefixes.iter()).map(|(&x,&prefix)|(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)})).collect();for(j,&value)in zipped.iter().enumerate(){*out.add(j)=value;}zipped.len()},
11=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
_=>panic!("unknown case")}}

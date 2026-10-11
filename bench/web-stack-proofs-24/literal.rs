// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{let mapped:Vec<u32>=xs.iter().copied().map(|x|(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)})).collect();mapped.first().copied().unwrap_or((if (seed>k){((seed).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(seed)})) as u64},
1=>{let mapped:Vec<u32>=xs.iter().copied().map(|x|(if (x<k){((x).wrapping_mul(x)).wrapping_add(seed)}else{((x).wrapping_sub(seed)).wrapping_mul((x).wrapping_add(k))})).collect();mapped.first().copied().unwrap_or((if (seed<k){((seed).wrapping_mul(seed)).wrapping_add(seed)}else{((seed).wrapping_sub(seed)).wrapping_mul((seed).wrapping_add(k))})) as u64},
2=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)})).collect();mapped.first().copied().unwrap_or((if (seed>k){((seed).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(seed)})) as u64},
3=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|(if (x<k){((x).wrapping_mul(x)).wrapping_add(seed)}else{((x).wrapping_sub(seed)).wrapping_mul((x).wrapping_add(k))})).collect();mapped.first().copied().unwrap_or((if (seed<k){((seed).wrapping_mul(seed)).wrapping_add(seed)}else{((seed).wrapping_sub(seed)).wrapping_mul((seed).wrapping_add(k))})) as u64},
4=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();accepted.first().copied().unwrap_or(seed) as u64},
5=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();accepted.first().copied().unwrap_or(seed) as u64},
6=>{xs.len() as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{let value=bench_scalar(case,xs,ys,seed,k);*out=value as u32;*out.add(1)=(value>>32) as u32;2},
7=>{let mapped:Vec<u32>=xs.iter().copied().enumerate().map(|(j,x)|{let i=j as u32;(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)})}).collect();for(j,&value)in mapped.iter().enumerate(){*out.add(j)=value;}mapped.len()},
_=>panic!("unknown case")}}

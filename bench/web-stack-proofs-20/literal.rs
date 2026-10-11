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
6=>{let zipped:Vec<u32>=xs.iter().zip(ys.iter()).map(|(&a,&b)|(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))})).collect();let mapped:Vec<u32>=zipped.iter().map(|&v|(if (v>k){(v).wrapping_sub(seed)}else{(v).wrapping_add(seed)})).collect();for(i,&v)in mapped.iter().enumerate(){*out.add(i)=v;}mapped.len()},
7=>{let zipped:Vec<u32>=xs.iter().zip(ys.iter()).map(|(&a,&b)|(if (a>b){(a).wrapping_sub(b)}else{(b).wrapping_sub(a)})).collect();let mapped:Vec<u32>=zipped.iter().map(|&v|(if (v<seed){(v).wrapping_mul(k)}else{(v).wrapping_add(seed)})).collect();for(i,&v)in mapped.iter().enumerate(){*out.add(i)=v;}mapped.len()},
_=>panic!("unknown case")}}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{let mapped:Vec<u32>=xs.iter().map(|&x|if (seed<k){quot((x).wrapping_add(seed),k,seed)}else{0}).collect();let mut a=0u32;for x in mapped{a=a.wrapping_add(x);}a as u64},
1=>{let filtered:Vec<u32>=xs.iter().copied().filter(|&x|if (seed<k){(x<seed)}else{false}).collect();let n=filtered.len() as u64;n},
2=>{let mut a=seed;for &x in xs.iter().rev(){a=if (seed<k){((x).wrapping_add(seed)).wrapping_mul((a).wrapping_add(k))}else{a};}a as u64},
3=>{let mut a=seed;for &x in xs.iter().rev(){a=if (seed==k){(if (x<k){(a).wrapping_add((x).wrapping_mul(seed))}else{(a).wrapping_sub((x).wrapping_mul(k))})}else{a};}a as u64},
4=>{let zipped:Vec<u32>=xs.iter().map(|&a|{let b=a;(if (a<seed){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))})}).collect();let mut acc=seed;for &v in zipped.iter().rev(){acc=(if (acc<seed){(v).wrapping_sub(acc)}else{(v).wrapping_add((acc).wrapping_mul(k))});}acc as u64},
5=>{let zipped:Vec<u32>=xs.iter().map(|&a|{let b=a;(if (a>k){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))})}).collect();let mut acc=seed;for &v in zipped.iter().rev(){acc=(if (v<seed){(v).wrapping_add((acc).wrapping_mul(k))}else{(v).wrapping_sub(acc)});}acc as u64},
_=>panic!("non-scalar case")}}

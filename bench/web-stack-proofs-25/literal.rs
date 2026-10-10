// Source-stage/fused algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
1=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(rem(x,seed,0u32)<k)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if (rem(x,seed,0u32)<k){(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)})}else{(if (x>seed){(x).wrapping_sub(seed)}else{(x).wrapping_mul(k)})}).collect();let mut a=seed;for &x in mapped.iter().rev(){a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}a as u64},
3=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<quot(k,2u32,0u32))).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if ((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<quot(k,2u32,0u32)){(if (x>k){((x).wrapping_mul(k)).wrapping_sub(seed)}else{(seed).wrapping_add(x)})}else{(if (x<k){(x).wrapping_add(seed)}else{(x).wrapping_sub(k)})}).collect();let mut a=seed;for &x in mapped.iter().rev(){a=(if (a<seed){(x).wrapping_add((a).wrapping_mul(k))}else{(x).wrapping_sub(a)});}a as u64},
4=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();accepted.first().copied().unwrap_or(seed) as u64},
5=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x<k)).collect();accepted.first().copied().unwrap_or(seed) as u64},
6=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(x>seed)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|(if (x>k){((x).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(x)})).collect();mapped.first().copied().unwrap_or((if (seed>k){((seed).wrapping_mul(k)).wrapping_add(seed)}else{(seed).wrapping_sub(seed)})) as u64},
8=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(rem(x,seed,0u32)<k)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if (rem(x,seed,0u32)<k){(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)})}else{(if (x>seed){(x).wrapping_sub(seed)}else{(x).wrapping_mul(k)})}).collect();let mut a=0u32;for &x in &mapped{a=a.wrapping_add(x);}a as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|(rem(x,seed,0u32)<k)).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if (rem(x,seed,0u32)<k){(if (x<seed){(seed).wrapping_sub(x)}else{(x).wrapping_add(seed)})}else{(if (x>seed){(x).wrapping_sub(seed)}else{(x).wrapping_mul(k)})}).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{let accepted:Vec<u32>=xs.iter().copied().filter(|&x|((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<quot(k,2u32,0u32))).collect();let mapped:Vec<u32>=accepted.iter().copied().map(|x|if ((if (x<seed){rem((seed).wrapping_sub(x),k,0u32)}else{rem((x).wrapping_sub(seed),k,0u32)})<quot(k,2u32,0u32)){(if (x>k){((x).wrapping_mul(k)).wrapping_sub(seed)}else{(seed).wrapping_add(x)})}else{(if (x<k){(x).wrapping_add(seed)}else{(x).wrapping_sub(k)})}).collect();for(j,&v)in mapped.iter().enumerate(){*out.add(j)=v;}mapped.len()},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
7=>{let mapped:Vec<u32>=xs.iter().copied().enumerate().map(|(j,x)|{let i=j as u32;(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)})}).collect();for(j,&value)in mapped.iter().enumerate(){*out.add(j)=value;}mapped.len()},
8=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
_=>panic!("unknown case")}}

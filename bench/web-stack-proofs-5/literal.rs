// Original source stages; ordinary Rust release/library optimisations allowed.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
fn total(xs:&[u32])->u32{xs.iter().rev().fold(0,|a,&x|x.wrapping_add(a))}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 let scalar=match case{
  0=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();mapped.first().copied().unwrap_or(seed.wrapping_mul(k))},
  1=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_add(seed)).collect();mapped.first().copied().unwrap_or(seed.wrapping_mul(k).wrapping_add(seed))},
  2=>{let mapped:Vec<bool>=xs.iter().map(|&x|x<seed).collect();u32::from(mapped.first().copied().unwrap_or(k<seed))},
  3=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_sub(x.wrapping_mul(k))).collect();total(&mapped)},
  4=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_sub(x.wrapping_mul(seed))).collect();total(&mapped)},
  5=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_add(seed)).collect();mapped.iter().rev().fold(seed,|a,_|a)},
  6=>{for(i,&x) in xs.iter().enumerate(){*out.add(i)=x.wrapping_mul(k).wrapping_sub(x.wrapping_mul(seed));}return len;},
  _=>panic!("case")
 };
 *out=scalar;1
}

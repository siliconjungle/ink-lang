// Original source stages; normal Rust release optimisation is permitted.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
fn p4(a:u32)->u32{a.wrapping_mul(a).wrapping_mul(a).wrapping_mul(a)}
fn p5(a:u32)->u32{p4(a).wrapping_mul(a)}
fn q(a:u32,k:u32)->u32{p4(a.wrapping_add(k)).wrapping_sub(p4(a)).wrapping_sub(4u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(a).wrapping_mul(k)).wrapping_sub(6u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(k).wrapping_mul(k)).wrapping_sub(4u32.wrapping_mul(a).wrapping_mul(k).wrapping_mul(k).wrapping_mul(k))}
fn c(a:u32,k:u32)->u32{p5(a.wrapping_add(k)).wrapping_sub(p5(a)).wrapping_sub(5u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(a).wrapping_mul(a).wrapping_mul(k)).wrapping_sub(10u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(a).wrapping_mul(k).wrapping_mul(k)).wrapping_sub(10u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(k).wrapping_mul(k).wrapping_mul(k)).wrapping_sub(5u32.wrapping_mul(a).wrapping_mul(k).wrapping_mul(k).wrapping_mul(k).wrapping_mul(k))}
fn weighted(xs:&[u32],seed:u32,k:u32)->Vec<u32>{xs.iter().zip(xs).map(|(&x,&y)|x.wrapping_mul(k).wrapping_add(y.wrapping_mul(seed))).collect()}
unsafe fn map<F:Fn(u32)->u32>(xs:&[u32],out:*mut u32,f:F)->usize{for(i,&x) in xs.iter().enumerate(){*out.add(i)=f(x);}xs.len()}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>map(xs,out,|x|{let mut a=x;for _ in 0..1024{a=q(a,k).wrapping_add(a);}a}),
  1=>map(xs,out,|x|{let mut a=x;for _ in 0..1024{a=c(a,k).wrapping_add(a);}a}),
  2=>map(xs,out,|x|q(x,k)),
  3=>{let zipped=weighted(xs,seed,k);let mut a=seed;for &x in zipped.iter().rev(){a=x.wrapping_sub(a);}*out=a;1},
  4=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();let filtered:Vec<u32>=mapped.into_iter().filter(|&x|x<seed).collect();let mut a=seed;for &x in filtered.iter().rev(){a=x.wrapping_sub(a);}*out=a;1},
  5=>{let zipped=weighted(xs,seed,k);let a=zipped.into_iter().fold(0u32,|a,x|a.wrapping_add(x));*out=a;1},
  _=>panic!("case")
 }
}

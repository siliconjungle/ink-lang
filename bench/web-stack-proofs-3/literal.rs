// Literal original source stages; normal Rust release/library optimisation.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
unsafe fn write_values<F:Fn(u32,u32)->u32>(xs:&[u32],ys:&[u32],out:*mut u32,f:F)->usize{let n=xs.len().min(ys.len());for i in 0..n{*out.add(i)=f(xs[i],ys[i]);}n}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();write_values(&mapped,xs,out,u32::wrapping_add)},
  1=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();write_values(xs,&mapped,out,u32::wrapping_sub)},
  2=>{let lhs:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();let rhs:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(seed)).collect();write_values(&lhs,&rhs,out,u32::wrapping_sub)},
  3=>{for(i,&x) in xs.iter().enumerate(){let mut a=x;for _ in 0..256{a=if x<seed{a.wrapping_add(k)}else{a.wrapping_sub(seed)};}*out.add(i)=a;}len},
  4=>{for(i,&x) in xs.iter().enumerate(){let mut a=x;for _ in 0..256{a=a.wrapping_mul(k).wrapping_add(a.wrapping_add(seed).wrapping_mul(1u32.wrapping_sub(k)));}*out.add(i)=a;}len},
  5=>{for(i,&x) in xs.iter().enumerate(){let mut a=if x<seed{seed}else{x};for _ in 0..256{a=if x<seed{seed}else{a};}*out.add(i)=a;}len},
  _=>panic!("case")
 }
}

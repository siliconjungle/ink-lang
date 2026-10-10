// Original source stages; normal release optimisation allowed.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>{for(j,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..64{
    let left=if x<seed{a.wrapping_mul(k)}else{seed.wrapping_sub(a).wrapping_mul(k)};let right=if x<seed{seed.wrapping_sub(a).wrapping_mul(k)}else{a.wrapping_mul(k)};a=a.wrapping_add(left).wrapping_add(right);
  }*out.add(j)=a.wrapping_add(seed);}len},
  1=>{for(j,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..64{
    let left=if x<seed{a.wrapping_mul(k)}else{a.wrapping_mul(seed)};let right=if x<seed{a.wrapping_add(seed).wrapping_mul(1u32.wrapping_sub(k))}else{a.wrapping_add(seed).wrapping_mul(1u32.wrapping_sub(seed))};a=left.wrapping_add(right);
  }*out.add(j)=a.wrapping_add(seed);}len},
  2=>{for(j,&x)in xs.iter().enumerate(){let mut a=x;for _ in 0..64{
    a=if x<seed{a.wrapping_sub(seed).wrapping_add(k).wrapping_add(seed).wrapping_sub(k)}else{a.wrapping_sub(k).wrapping_add(seed).wrapping_add(k).wrapping_sub(seed)};
  }*out.add(j)=a.wrapping_add(seed);}len},
  3=>{for(j,(&a,&b))in xs.iter().zip(xs.iter()).enumerate(){*out.add(j)=a.wrapping_mul(b);}len},
  4=>{let squared:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_mul(b)).collect();for(j,&x)in squared.iter().enumerate(){*out.add(j)=x.wrapping_mul(k).wrapping_add(seed);}len},
  5=>{for(j,(&a,&b))in xs.iter().zip(xs.iter()).enumerate(){*out.add(j)=a.wrapping_sub(b).wrapping_mul(a.wrapping_sub(b));}len},
  _=>panic!("case")
 }
}

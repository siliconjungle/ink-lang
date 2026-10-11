// Original source operations and stages; normal release optimization allowed.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=x.wrapping_mul(x).wrapping_add(seed.wrapping_mul(seed)).wrapping_sub(2u32.wrapping_mul(x).wrapping_mul(seed));}len},
  1=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=x.wrapping_mul(k).wrapping_add(x.wrapping_add(seed).wrapping_mul(1u32.wrapping_sub(k)));}len},
  2=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=x.wrapping_mul(seed).wrapping_mul(x.wrapping_mul(seed)).wrapping_add(2u32.wrapping_mul(x.wrapping_mul(seed)).wrapping_mul(k)).wrapping_add(k.wrapping_mul(k));}len},
  3=>{let zipped:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|if a<b{a}else{b}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_mul(k).wrapping_add(seed);}len},
  4=>{let zipped:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|if a<b{b}else{a}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=if x<seed{x.wrapping_mul(k)}else{x.wrapping_add(seed)};}len},
  5=>{let zipped:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|if a==b{a.wrapping_mul(k)}else{b.wrapping_mul(seed)}).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},
  _=>panic!("case")
 }
}

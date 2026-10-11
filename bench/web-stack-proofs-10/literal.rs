// Original ordered source operations/stages; normal release optimization allowed.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=((((((x).wrapping_add(k)).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_sub((((2u32).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x))).wrapping_add((((x).wrapping_sub(k)).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k)))).wrapping_add(seed);}len},
  1=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=(((((((x).wrapping_add(k)).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_sub(((((2u32).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x))).wrapping_add(((((x).wrapping_sub(k)).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k)))).wrapping_add(seed);}len},
  2=>{for(j,&x)in xs.iter().enumerate(){*out.add(j)=((((((((x).wrapping_add(k)).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_mul((x).wrapping_add(k))).wrapping_sub((((((2u32).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x)).wrapping_mul(x))).wrapping_add((((((x).wrapping_sub(k)).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k))).wrapping_mul((x).wrapping_sub(k)))).wrapping_add(seed);}len},
  3=>{let inner:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_add(b.wrapping_mul(k))).collect();let outer:Vec<u32>=inner.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_sub(b.wrapping_mul(seed))).collect();for(j,&x)in outer.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},
  4=>{let inner:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_add(b.wrapping_mul(k))).collect();let outer:Vec<u32>=xs.iter().zip(inner.iter()).map(|(&a,&b)|a.wrapping_mul(seed).wrapping_sub(b)).collect();for(j,&x)in outer.iter().enumerate(){*out.add(j)=if x<seed{x.wrapping_mul(k)}else{x.wrapping_add(seed)};}len},
  5=>{let left:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_add(seed)).collect();let right:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_sub(seed)).collect();let zipped:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|a.wrapping_mul(b)).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},
  _=>panic!("case")
 }
}

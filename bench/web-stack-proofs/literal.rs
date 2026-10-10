// Literal original source; case dispatch occurs once per call, outside loops.
#[no_mangle]pub extern "C" fn bench_alloc(len:usize)->*mut u32{let mut xs=vec![0;len];let p=xs.as_mut_ptr();std::mem::forget(xs);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(ptr:*mut u32,len:usize){drop(Vec::from_raw_parts(ptr,len,len));}
fn q(a:u32,k:u32)->u32{a.wrapping_add(k).wrapping_mul(a.wrapping_add(k)).wrapping_sub(a.wrapping_mul(a)).wrapping_sub(2u32.wrapping_mul(a).wrapping_mul(k))}
fn c(a:u32,k:u32)->u32{a.wrapping_add(k).wrapping_mul(a.wrapping_add(k)).wrapping_mul(a.wrapping_add(k)).wrapping_sub(a.wrapping_mul(a).wrapping_mul(a)).wrapping_sub(3u32.wrapping_mul(a).wrapping_mul(a).wrapping_mul(k)).wrapping_sub(3u32.wrapping_mul(a).wrapping_mul(k).wrapping_mul(k))}
unsafe fn map<F:Fn(u32)->u32>(xs:&[u32],out:*mut u32,f:F)->usize{for(i,&x) in xs.iter().enumerate(){*out.add(i)=f(x);}xs.len()}
#[no_mangle]pub unsafe extern "C" fn bench_map(case:u32,ptr:*const u32,len:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(ptr,len);
 match case{
  0=>map(xs,out,|x|{let mut a=x;for _ in 0..4096{a=q(a,k).wrapping_add(a);}a}),
  1=>map(xs,out,|x|{let mut a=x;for _ in 0..1024{a=c(a,k).wrapping_add(a);}a}),
  2=>map(xs,out,|x|{let mut a=x;for _ in 0..1024{a=a.wrapping_add(k).wrapping_mul(a.wrapping_sub(k)).wrapping_sub(a.wrapping_mul(a)).wrapping_add(a);}a}),
  3=>map(xs,out,|x|q(x,k)),4=>map(xs,out,|x|c(x,k)),
  5=>{let flags:Vec<bool>=xs.iter().map(|&x|x<seed).collect();for(i,b) in flags.into_iter().enumerate(){*out.add(i)=if b{k}else{k.wrapping_add(1)};}len},
  6=>{for(i,(&x,&y)) in xs.iter().zip(xs).enumerate(){*out.add(i)=x.wrapping_add(y);}len},
  7=>{let zeros:Vec<u32>=xs.iter().map(|&x|x.wrapping_sub(x)).collect();let mut a=0u32;for(i,x) in zeros.into_iter().enumerate(){a=a.wrapping_add(x);*out.add(i)=a;}len},
  8=>map(xs,out,|x|(if x==seed{seed}else{x}).wrapping_add(k)),
  9=>map(xs,out,|x|{let mut a=x;for _ in 0..512{a=x;}a.wrapping_add(k)}),
  10=>{let mapped:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k)).collect();let mut a=seed;for &x in mapped.iter().rev(){a=x.wrapping_sub(a);}*out=a;1},
  _=>panic!("case")
 }
}

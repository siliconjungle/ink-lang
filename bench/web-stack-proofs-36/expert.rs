const VECTOR:[bool;4]=[false,false,false,false];
#[inline]fn left(x:u32,seed:u32,k:u32)->u32{(if k==0{0}else{x/k}).wrapping_add(seed)}
#[inline]fn right(x:u32,k:u32)->u32{(if k==0{0}else{x%k}).wrapping_add(k)}
#[inline]fn post(x:u32,seed:u32,k:u32)->u32{if x<seed{x.wrapping_add(k)}else{x.wrapping_sub(k)}}
#[inline]fn reduce(x:u32,acc:u32,seed:u32,k:u32)->u32{if acc<seed{x.wrapping_add(acc.wrapping_mul(k))}else{x.wrapping_sub(acc)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval_scalar32(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->u32{
 let mut acc=seed;
 match task{
  0=>for i in(0..nx).rev(){acc=reduce(left(*x.add(i),seed,k),acc,seed,k)},
  1=>for i in(0..nx).rev(){acc=reduce(post(left(*x.add(i),seed,k),seed,k),acc,seed,k)},
  2=>for i in(0..nx).rev(){let v=*x.add(i);if(if k==0{0}else{v%k})<seed{acc=reduce(left(v,seed,k),acc,seed,k)}},
  3=>{for i in(0..ny).rev(){acc=reduce(right(*y.add(i),k),acc,seed,k)}for i in(0..nx).rev(){acc=reduce(left(*x.add(i),seed,k),acc,seed,k)}},
  _=>std::hint::unreachable_unchecked()
 }acc
}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{*out=bench_eval_scalar32(task,x,nx,y,ny,seed,k);*out.add(1)=0;2}

#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

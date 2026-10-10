const VECTOR:[bool;4]=[true,true,true,true];
#[inline]fn post(v:u32,seed:u32,k:u32)->u32{if v<seed{v.wrapping_add(k)}else{v.wrapping_sub(k)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let n=nx.min(ny);let xs=std::slice::from_raw_parts(x,n);let ys=std::slice::from_raw_parts(y,n);let mut acc=0u32;
 match task{
 0=>for i in 0..n{acc=acc.wrapping_add(xs[i]).wrapping_add(ys[i]);*out.add(i)=post(acc,seed,k)},
 1=>for i in 0..n{acc=acc.wrapping_add(xs[i]).wrapping_sub(ys[i]);*out.add(i)=post(acc,seed,k)},
 2=>for i in 0..n{let a=(if k==0{0}else{xs[i]/k}).wrapping_add(seed);let b=(if k==0{0}else{ys[i]%k}).wrapping_add(k);acc=acc.wrapping_add(a).wrapping_add(b);*out.add(i)=post(acc,seed,k)},
 3=>for i in 0..n{let a=(if k==0{0}else{xs[i]/k}).wrapping_add(seed);let b=(if k==0{0}else{ys[i]%k}).wrapping_add(k);acc=acc.wrapping_add(a).wrapping_sub(b);*out.add(i)=post(acc,seed,k)},
 _=>std::hint::unreachable_unchecked()};n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

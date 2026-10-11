// Already-fused destination controls preserve both observed values and grouping.
const VECTOR:[bool;4]=[true,true,true,true];
#[inline]fn left(x:u32,seed:u32,k:u32)->u32{(if k==0{0}else{x/k}).wrapping_add(x).wrapping_add(seed)}
#[inline]fn right(y:u32,k:u32)->u32{(if k==0{0}else{y%k}).wrapping_add(y).wrapping_add(k)}
#[inline]fn post(x:u32,seed:u32,k:u32)->u32{if x<seed{x.wrapping_add(k)}else{x.wrapping_sub(k)}}
#[inline]fn raw(a:u32,b:u32,seed:u32,k:u32)->u32{(if a<b{a.wrapping_add(b.wrapping_mul(k))}else{a.wrapping_sub(b.wrapping_mul(k))}).wrapping_add(seed)}
#[inline]fn held(a:u32,b:u32,seed:u32,k:u32)->u32{if a<seed{a.wrapping_add(b).wrapping_mul(k)}else{a.wrapping_sub(b).wrapping_add(seed)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let n=nx.min(ny);
 match task{
  0=>for i in 0..n{*out.add(i)=raw(left(*x.add(i),seed,k),*y.add(i),seed,k)},
  1=>for i in 0..n{*out.add(i)=raw(*x.add(i),right(*y.add(i),k),seed,k)},
  2=>for i in 0..n{*out.add(i)=held(left(*x.add(i),seed,k),right(*y.add(i),k),seed,k)},
  3=>for i in 0..n{*out.add(i)=held(post(left(*x.add(i),seed,k),seed,k),right(*y.add(i),k),seed,k)},
  _=>std::hint::unreachable_unchecked()
 }n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

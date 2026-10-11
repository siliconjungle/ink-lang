// Both mapper values observed in one xs loop; caller destination reused.
const VECTOR:[bool;4]=[true,true,true,true];
#[inline]fn base_left(i:u32,x:u32,seed:u32,k:u32)->u32{if i<seed{x.wrapping_add(k)}else{x.wrapping_sub(seed)}}
#[inline]fn base_right(i:u32,x:u32,seed:u32,k:u32)->u32{if i%3==0{x.wrapping_mul(k)}else{x.wrapping_add(seed)}}
#[inline]fn base_pair(a:u32,b:u32,seed:u32,k:u32)->u32{if a<b{a.wrapping_add(b.wrapping_mul(k))}else{a.wrapping_sub(b).wrapping_add(seed)}}
#[inline]fn composed_left(i:u32,x:u32,seed:u32,k:u32)->u32{(if k==0{0}else{x/k}).wrapping_add(if k==0{0}else{i%k}).wrapping_add(seed)}
#[inline]fn composed_right(i:u32,x:u32,seed:u32,k:u32)->u32{if i<seed{x.wrapping_add(k)}else{x.wrapping_mul(3)}}
#[inline]fn composed_pair(a:u32,b:u32,k:u32)->u32{if a<b{(if k==0{0}else{a/k}).wrapping_add(b)}else{(if k==0{0}else{b%k}).wrapping_add(a)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,_y:*const u32,_ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 match task{
  0|1=>for i in 0..nx{let v=*x.add(i);let a=base_left(i as u32,v,seed,k);let b=base_right(i as u32,v,seed,k);*out.add(i)=base_pair(a,b,seed,k)},
  2|3=>for i in 0..nx{let v=*x.add(i);let a=composed_left(i as u32,v,seed,k);let b=composed_right(i as u32,v,seed,k);*out.add(i)=composed_pair(a,b,k)},
  _=>std::hint::unreachable_unchecked()
 }nx
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

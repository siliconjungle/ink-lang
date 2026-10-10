const VECTOR:[bool;4]=[true,true,true,true];
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(x,nx);let ys=std::slice::from_raw_parts(y,ny);let mut count=0;
 match task{
  0=>{for &v in xs.iter().chain(ys){if v<seed{*out.add(count)=v;count+=1}}},
  1=>{for &v in xs{let a=if v<seed{v.wrapping_add(k)}else{v.wrapping_sub(k)};if a<seed{*out.add(count)=seed.wrapping_sub(a);count+=1}}},
  2=>{for &v in xs.iter().chain(ys){if (if k==0{0}else{v%k})<seed{*out.add(count)=v;count+=1}}},
  3=>{for &v in xs{let a=v.wrapping_add(if k==0{0}else{v/k});if a<seed{*out.add(count)=if a<k{k.wrapping_sub(a)}else{a.wrapping_mul(k).wrapping_add(1)};count+=1}}},
  _=>std::hint::unreachable_unchecked()
 }count
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

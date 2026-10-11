const VECTOR:[bool;4]=[true,true,true,true];
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,_y:*const u32,_ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(x,nx);
 match task{
 0|1=>{let mut count=0;for &v in xs{if v<seed{*out.add(count)=if v<k{k.wrapping_sub(v)}else{v.wrapping_add(k)};count+=1}}count},
 2|3=>{let c=if task==2{seed.wrapping_add(k)}else{(if k==0{0}else{seed/k}).wrapping_add(1)};let mut acc=0u32;for i in 0..nx{acc=acc.wrapping_add(c);*out.add(i)=acc}nx},
 _=>std::hint::unreachable_unchecked()}
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

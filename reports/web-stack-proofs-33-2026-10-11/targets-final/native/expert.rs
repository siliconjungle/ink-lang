// Strong direct destination controls: traverse only the selected paired prefix.
const VECTOR:[bool;4]=[true,true,true,true];
#[inline]fn selected(x:u32,seed:u32,k:u32,secondary:bool)->u32{if secondary{if x<seed{(if k==0{0}else{x/k}).wrapping_add(seed)}else{(if k==0{0}else{x%k}).wrapping_add(k)}}else if x<seed{x.wrapping_add(k)}else{x.wrapping_sub(k)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let n=nx.min(ny);
 match task{
  0=>for i in 0..n{*out.add(i)=selected(*y.add(i),seed,k,false)},
  1=>for i in 0..n{*out.add(i)=selected(*x.add(i),seed,k,false)},
  2=>for i in 0..n{*out.add(i)=selected(*y.add(i),seed,k,true)},
  3=>for i in 0..n{*out.add(i)=selected(*x.add(i),seed,k,true)},
  _=>std::hint::unreachable_unchecked()
 }n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}
#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->BenchResult{let count=bench_eval(task,x,nx,y,ny,seed,k,out);if VECTOR[task as usize]{BenchResult{data:out,len:count,scalar:0}}else{BenchResult{data:std::ptr::null(),len:0,scalar:(*out as u64)|((*out.add(1) as u64)<<32)}}}
#[no_mangle]pub extern "C" fn bench_reset(){}

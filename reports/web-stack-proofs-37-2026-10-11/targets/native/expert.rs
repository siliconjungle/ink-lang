// Strong fused controls write only the selected paired prefix into caller output.
const VECTOR:[bool;4]=[true,true,true,true];
#[inline]fn base(y:u32,seed:u32,k:u32)->u32{if y<seed{y.wrapping_add(k)}else{y.wrapping_sub(k)}}
#[inline]fn held(y:u32,seed:u32,k:u32)->u32{if y<seed{(if k==0{0}else{y/k}).wrapping_add(seed)}else{(if k==0{0}else{y%k}).wrapping_add(k)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let n=nx.min(ny);
 match task{
  0=>for i in 0..n{*out.add(i)=base(*y.add(i),seed,k)},
  1=>for i in 0..n{*out.add(i)=base(*x.add(i),seed,k)},
  2=>for i in 0..n{*out.add(i)=held(*y.add(i),seed,k)},
  3=>for i in 0..n{*out.add(i)=held(*x.add(i),seed,k)},
  _=>std::hint::unreachable_unchecked()
 }n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}
#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->BenchResult{let count=bench_eval(task,x,nx,y,ny,seed,k,out);if VECTOR[task as usize]{BenchResult{data:out,len:count,scalar:0}}else{BenchResult{data:std::ptr::null(),len:0,scalar:(*out as u64)|((*out.add(1) as u64)<<32)}}}
#[no_mangle]pub extern "C" fn bench_reset(){}

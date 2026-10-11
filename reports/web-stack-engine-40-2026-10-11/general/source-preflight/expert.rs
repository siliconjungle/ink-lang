const VECTOR:[bool;12]=[true,true,true,true,false,true,true,true,true,true,false,true];
#[no_mangle]pub unsafe extern "C" fn bench_eval_scalar32(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->u32{if task==10{let mut a=seed;for i in(0..nx.min(ny)).rev(){a=(*x.add(i)).wrapping_mul(*y.add(i)).wrapping_add(a.wrapping_mul(k))}return a}let mut a=seed;for i in(0..nx).rev(){a=if a<seed{(*x.add(i)).wrapping_add(a.wrapping_mul(k))}else{(*x.add(i)).wrapping_sub(a)}}a}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let mut n=nx;
 match task{
  0=>for i in 0..nx{*out.add(i)=(*x.add(i)).wrapping_mul(k).wrapping_add(seed)},
  1=>{n=0;for i in 0..nx{let v=*x.add(i);if v%16<seed{*out.add(n)=v.wrapping_mul(k).wrapping_add(1);n+=1}}},
  2=>{let mut a=0u32;for i in 0..nx{a=a.wrapping_add(*x.add(i));*out.add(i)=a}},
  3=>for i in 0..nx{let v=*x.add(i);*out.add(i)=if v<seed{v.wrapping_mul(k).wrapping_add(1)}else{(if k==0{0}else{v/k}).wrapping_add(seed)}},
  4=>{*out=bench_eval_scalar32(task,x,nx,y,ny,seed,k);*out.add(1)=0;n=2},
  5=>for i in 0..nx{let l=if i==0{0}else{*x.add(i-1)};let r=if i+1<nx{*x.add(i+1)}else{0};*out.add(i)=l.wrapping_add((*x.add(i)).wrapping_mul(k)).wrapping_add(r)},
  6=>{std::ptr::copy_nonoverlapping(x,out,nx);if k>0{for i in(0..nx.min(ny)).step_by(k as usize){*out.add(i)=*y.add(i)}}},
  7=>for i in 0..nx{*out.add(i)=if k>0&&i%(k as usize)==0&&i<ny{*y.add(i)}else{*x.add(i)}},
  8=>{n=0;for i in 0..nx{let v=(*x.add(i)).wrapping_mul(k).wrapping_add(1);if v%16<seed{*out.add(n)=if v<seed{v.wrapping_add(k)}else{v.wrapping_sub(seed)};n+=1}}},
  9=>{let mut a=0u32;for i in 0..nx{let x=*x.add(i);let v=(if k==0{0}else{x/k}).wrapping_add(x).wrapping_add(seed);a=a.wrapping_add(v);*out.add(i)=a}},
  10=>{*out=bench_eval_scalar32(task,x,nx,y,ny,seed,k);*out.add(1)=0;n=2},
  11=>for i in 0..nx{let index=seed.wrapping_sub(i as u32).wrapping_sub(1)as usize;let v=if index<ny{*y.add(index)}else{*x.add(i)};*out.add(i)=v.wrapping_add((*x.add(i)).wrapping_mul(k))},
  _=>std::hint::unreachable_unchecked()
 }n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

static mut BENCH_OWNED:Option<Vec<u32>>=None;
#[no_mangle]pub unsafe extern "C" fn bench_eval_owned(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->usize{
 let mut value=Vec::<u32>::with_capacity(nx.max(2));let n=bench_eval(task,x,nx,y,ny,seed,k,value.as_mut_ptr());value.set_len(n);BENCH_OWNED=Some(value);n
}
#[no_mangle]pub unsafe extern "C" fn bench_owned_ptr()->*const u32{BENCH_OWNED.as_ref().unwrap().as_ptr()}
#[no_mangle]pub unsafe extern "C" fn bench_owned_clear(){BENCH_OWNED=None;}

#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}
#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->BenchResult{if VECTOR[task as usize]{let n=bench_eval_owned(task,x,nx,y,ny,seed,k);BenchResult{data:bench_owned_ptr(),len:n,scalar:0}}else{BenchResult{data:std::ptr::null(),len:0,scalar:bench_eval_scalar32(task,x,nx,y,ny,seed,k)as u64}}}
#[no_mangle]pub unsafe extern "C" fn bench_reset(){bench_owned_clear();}

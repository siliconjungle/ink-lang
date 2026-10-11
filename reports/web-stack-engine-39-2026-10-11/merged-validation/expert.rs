const VECTOR:[bool;8]=[true,true,true,true,false,true,true,true];
#[no_mangle]pub unsafe extern "C" fn bench_eval_scalar32(_task:u32,x:*const u32,nx:usize,_y:*const u32,_ny:usize,seed:u32,k:u32)->u32{let mut a=seed;for i in(0..nx).rev(){a=if a<seed{(*x.add(i)).wrapping_add(a.wrapping_mul(k))}else{(*x.add(i)).wrapping_sub(a)}}a}
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
  _=>std::hint::unreachable_unchecked()
 }n
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

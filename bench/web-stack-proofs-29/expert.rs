const VECTOR:[bool;3]=[false,false,true];
fn accepts(x:u32,seed:u32,k:u32)->bool{if x<seed{x<k}else{x>k}}
fn calibrate(x:u32,seed:u32,k:u32)->u32{if x<seed{x.wrapping_mul(k).wrapping_add(seed)}else{x.wrapping_sub(k)}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->usize{
 let xs=std::slice::from_raw_parts(x,nx);let ys=std::slice::from_raw_parts(y,ny);
 match task{
  0|1=>{let mut count=0u64;for &value in xs{if accepts(value,seed,k){count=count.wrapping_add(1)}}*out=count as u32;*out.add(1)=(count>>32) as u32;2},
  2=>{for (i,&value) in xs.iter().chain(ys).enumerate(){*out.add(i)=calibrate(value,seed,k)}nx+ny},
  _=>std::hint::unreachable_unchecked()
 }
}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut value=vec![0u32;n.max(1)];let p=value.as_mut_ptr();std::mem::forget(value);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}

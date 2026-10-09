#![no_std]
use core::slice;
// ABI: p is a non-null, aligned pointer to n readable u64 elements.
// All language variants use this same contract in the common C driver.
#[no_mangle]
pub unsafe extern "C" fn lang_fn_sum_values(p:*const u64,n:usize)->u64{
    slice::from_raw_parts(p,n).iter().fold(0u64,|s,&x|s.wrapping_add(x))
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_affine(p:*const u64,n:usize,a:u64,b:u64)->u64{
    slice::from_raw_parts(p,n).iter().map(|&x|x.wrapping_mul(a).wrapping_add(b)).fold(0u64,u64::wrapping_add)
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_squares(p:*const u64,n:usize)->u64{
    slice::from_raw_parts(p,n).iter().map(|&x|x.wrapping_mul(x)).fold(0u64,u64::wrapping_add)
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_filter_sum(p:*const u64,n:usize,t:u64)->u64{
    slice::from_raw_parts(p,n).iter().copied().filter(|&x|x<t).fold(0u64,u64::wrapping_add)
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_pipeline(p:*const u64,n:usize,a:u64,b:u64,t:u64)->u64{
    slice::from_raw_parts(p,n).iter().map(|&x|x.wrapping_mul(a).wrapping_add(b)).filter(|&y|y<t).map(|y|y.wrapping_mul(y).wrapping_add(7)).fold(0u64,u64::wrapping_add)
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_expanded(p:*const u64,n:usize)->u64{
    slice::from_raw_parts(p,n).iter().map(|&x|{let y=x.wrapping_add(3);y.wrapping_mul(y)}).fold(0u64,u64::wrapping_add)
}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_count_under(p:*const u64,n:usize,t:u64)->u64{
    slice::from_raw_parts(p,n).iter().filter(|&&x|x<t).count() as u64
}

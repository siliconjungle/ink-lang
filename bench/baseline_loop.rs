#![no_std]
use core::slice;
#[no_mangle]
pub unsafe extern "C" fn lang_fn_sum_values(p:*const u64,n:usize)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){s=s.wrapping_add(x);}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_affine(p:*const u64,n:usize,a:u64,b:u64)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){s=s.wrapping_add(x.wrapping_mul(a).wrapping_add(b));}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_squares(p:*const u64,n:usize)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){s=s.wrapping_add(x.wrapping_mul(x));}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_filter_sum(p:*const u64,n:usize,t:u64)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){if x<t{s=s.wrapping_add(x);}}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_pipeline(p:*const u64,n:usize,a:u64,b:u64,t:u64)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){let y=x.wrapping_mul(a).wrapping_add(b);if y<t{s=s.wrapping_add(y.wrapping_mul(y).wrapping_add(7));}}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_expanded(p:*const u64,n:usize)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){let y=x.wrapping_add(3);s=s.wrapping_add(y.wrapping_mul(y));}s}
#[no_mangle]
pub unsafe extern "C" fn lang_fn_count_under(p:*const u64,n:usize,t:u64)->u64{let mut s=0u64;for &x in slice::from_raw_parts(p,n){if x<t{s=s.wrapping_add(1);}}s}

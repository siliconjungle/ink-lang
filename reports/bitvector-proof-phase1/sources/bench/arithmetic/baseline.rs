#[no_mangle]
pub extern "C" fn lang_fn_add_zero(x: u64) -> u64 { x.wrapping_add(0) }
#[no_mangle]
pub extern "C" fn lang_fn_subtract_self(x: u64) -> u64 { x.wrapping_sub(x) }
#[no_mangle]
pub extern "C" fn lang_fn_add_commute(x: u64, y: u64) -> u64 { x.wrapping_add(y) }
#[no_mangle]
pub extern "C" fn lang_fn_cancel_add(x: u64, y: u64) -> u64 { x.wrapping_add(y).wrapping_sub(y) }
#[no_mangle]
pub extern "C" fn lang_fn_multiply_zero(x: u64) -> u64 { x.wrapping_mul(0) }
#[no_mangle]
pub extern "C" fn lang_fn_unsigned_reflexive(x: u64) -> bool { x <= x }
#[no_mangle]
pub extern "C" fn lang_fn_unsigned_maximum(x: u64) -> bool { x <= u64::MAX }
#[no_mangle]
pub extern "C" fn lang_fn_choose_equal(x: u64, b: bool) -> u64 { if b { x } else { x } }

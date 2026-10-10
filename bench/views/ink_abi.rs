// View-sweep host ABI over the generated program; all behaviour calls generated methods.
fn vs_small(v: &BigInt) -> i64 {
    let (sign, digits) = v.to_u64_digits();
    assert!(digits.len() <= 1 && digits.first().copied().unwrap_or(0) <= i64::MAX as u64);
    let m = digits.first().copied().unwrap_or(0) as i64;
    if sign == num_bigint::Sign::Minus { -m } else { m }
}
#[no_mangle] pub extern "C" fn vs_new(n: u64) -> *mut State {
    let mut s = State::new();
    for k in 0..n {
        assert!(s.invoke_view_l_put(k, l_Row { l_b: (k % 1000) as u32, l_flag: k % 3 != 0 }).unwrap().result.is_ok());
    }
    Box::into_raw(Box::new(s))
}
#[no_mangle] pub unsafe extern "C" fn vs_free(s: *mut State) { drop(Box::from_raw(s)); }
#[no_mangle] pub unsafe extern "C" fn vs_put(s: *mut State, key: u64, b: u32, flag: u32) -> u32 {
    match (&mut *s).invoke_view_l_put(key, l_Row { l_b: b, l_flag: flag != 0 }).unwrap().result { Ok(()) => 0, Err(_) => 1 }
}
#[no_mangle] pub unsafe extern "C" fn vs_del(s: *mut State, key: u64) -> u32 {
    match (&mut *s).invoke_view_l_del(key).unwrap().result { Ok(()) => 0, Err(_) => 1 }
}
#[no_mangle] pub unsafe extern "C" fn vs_units(s: *mut State) -> i64 { vs_small(&(&mut *s).invoke_view_l_units().unwrap().result) }
#[no_mangle] pub unsafe extern "C" fn vs_rows(s: *mut State) -> i64 { vs_small(&(&mut *s).invoke_view_l_rows().unwrap().result) }

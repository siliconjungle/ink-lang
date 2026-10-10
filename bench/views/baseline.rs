// Handwritten Rust baselines for the view sweep. Same observations as the Ink
// program: unique-key upsert/delete, sum of b over flagged rows, count of
// flagged rows. `scan` recomputes on every query; otherwise totals are
// maintained by deltas. `bigint` uses arbitrary-precision totals like Ink.
use std::collections::BTreeMap;
#[cfg(feature = "bigint")] use num_bigint::BigInt as Total;
#[cfg(not(feature = "bigint"))] type Total = i64;
pub struct State { rows: BTreeMap<u64, (u32, bool)>, units: Total, count: Total, version: u64 }
fn contribution(row: &(u32, bool)) -> (Total, Total) {
    if row.1 { (Total::from(row.0), Total::from(1u8)) } else { (Total::from(0u8), Total::from(0u8)) }
}
fn small(v: &Total) -> i64 {
    #[cfg(feature = "bigint")] { let (sign, d) = v.to_u64_digits(); let m = d.first().copied().unwrap_or(0) as i64; if sign == num_bigint::Sign::Minus { -m } else { m } }
    #[cfg(not(feature = "bigint"))] { *v }
}
#[no_mangle] pub extern "C" fn vs_new(n: u64) -> *mut State {
    let mut s = State { rows: BTreeMap::new(), units: Total::from(0u8), count: Total::from(0u8), version: 0 };
    for k in 0..n { unsafe { vs_put(&mut s, k, (k % 1000) as u32, (k % 3 != 0) as u32); } }
    Box::into_raw(Box::new(s))
}
#[no_mangle] pub unsafe extern "C" fn vs_free(s: *mut State) { drop(Box::from_raw(s)); }
#[no_mangle] pub unsafe extern "C" fn vs_put(s: *mut State, key: u64, b: u32, flag: u32) -> u32 {
    let s = &mut *s;
    let row = (b, flag != 0);
    let old = s.rows.insert(key, row);
    if cfg!(not(feature = "scan")) {
        if let Some(old) = old { let (u, c) = contribution(&old); s.units -= u; s.count -= c; }
        let (u, c) = contribution(&row); s.units += u; s.count += c;
    }
    s.version += 1; 0
}
#[no_mangle] pub unsafe extern "C" fn vs_del(s: *mut State, key: u64) -> u32 {
    let s = &mut *s;
    if let Some(old) = s.rows.remove(&key) {
        if cfg!(not(feature = "scan")) { let (u, c) = contribution(&old); s.units -= u; s.count -= c; }
    }
    s.version += 1; 0
}
#[no_mangle] pub unsafe extern "C" fn vs_units(s: *mut State) -> i64 {
    let s = &*s;
    if cfg!(feature = "scan") { let mut t = Total::from(0u8); for r in s.rows.values() { t += contribution(r).0; } small(&t) } else { small(&s.units) }
}
#[no_mangle] pub unsafe extern "C" fn vs_rows(s: *mut State) -> i64 {
    let s = &*s;
    if cfg!(feature = "scan") { let mut t = Total::from(0u8); for r in s.rows.values() { t += contribution(r).1; } small(&t) } else { small(&s.count) }
}

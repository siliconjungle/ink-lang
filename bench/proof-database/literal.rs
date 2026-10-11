// Direct translations of kernels.ink before proof rewriting. Ordinary release
// optimisation is allowed; no hand-derived shortcuts or black_box barriers.
#[no_mangle]
pub extern "C" fn bench_alloc(len: usize) -> *mut u32 {
    let mut xs=vec![0u32;len]; let ptr=xs.as_mut_ptr(); std::mem::forget(xs); ptr
}
#[no_mangle]
pub unsafe extern "C" fn bench_free(ptr: *mut u32, len: usize) {
    drop(Vec::from_raw_parts(ptr,len,len));
}
#[no_mangle]
pub unsafe extern "C" fn bench_call(case: u32, ptr: *const u32, len: usize, seed: u32, factor: u32) -> u64 {
    let xs=std::slice::from_raw_parts(ptr,len);
    match case {
        0 => {let mut acc=seed; for _ in 0..4096 {acc=acc.wrapping_sub(factor);} acc as u64},
        1 => {let mut acc=seed; for _ in 0..4096 {acc=acc.wrapping_add(factor.wrapping_mul(factor));} acc as u64},
        2 => {let mapped: Vec<u32>=xs.iter().map(|x|x.wrapping_mul(factor)).collect();
            mapped.iter().fold(0u32,|s,x|s.wrapping_add(*x)) as u64},
        3 => {let mapped: Vec<u32>=xs.iter().map(|_|0).collect();
            mapped.iter().fold(0u32,|s,x|s.wrapping_add(*x)) as u64},
        4 => {let mapped: Vec<u32>=xs.iter().map(|x|x.wrapping_mul(*x).wrapping_add(7)).collect();
            mapped.len() as u64},
        5 => {let filtered: Vec<u32>=xs.iter().copied().filter(|_|true).collect();
            filtered.iter().fold(0u32,|s,x|s.wrapping_add(*x)) as u64},
        6 => {let filtered: Vec<u32>=xs.iter().copied().filter(|_|false).collect();filtered.len() as u64},
        _ => panic!("unknown case"),
    }
}
#[no_mangle]
pub unsafe extern "C" fn bench_filter(ptr: *const u32, len: usize, seed: u32, factor: u32, out: *mut u32) -> usize {
    let xs=std::slice::from_raw_parts(ptr,len);
    let first: Vec<u32>=xs.iter().copied().filter(|x|*x<factor).collect();
    let second: Vec<u32>=first.iter().copied().filter(|x|*x>seed).collect();
    std::ptr::copy_nonoverlapping(second.as_ptr(),out,second.len()); second.len()
}
#[no_mangle]
pub unsafe extern "C" fn bench_map(ptr: *const u32, len: usize, factor: u32, out: *mut u32) -> usize {
    let xs=std::slice::from_raw_parts(ptr,len);
    let mapped: Vec<u32>=xs.iter().map(|&x|{
        let mut acc=x; for _ in 0..32 {acc=acc.wrapping_sub(factor);} acc
    }).collect();
    std::ptr::copy_nonoverlapping(mapped.as_ptr(),out,mapped.len()); mapped.len()
}

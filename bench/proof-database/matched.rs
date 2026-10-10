// Same checked algorithms, modulo 2^32; allocator used for resident host input.
#[no_mangle]
pub extern "C" fn bench_alloc(len: usize) -> *mut u32 {
    let mut xs = vec![0u32; len];
    let ptr = xs.as_mut_ptr();
    std::mem::forget(xs);
    ptr
}
#[no_mangle]
pub unsafe extern "C" fn bench_free(ptr: *mut u32, len: usize) {
    drop(Vec::from_raw_parts(ptr, len, len));
}
#[no_mangle]
pub unsafe extern "C" fn bench_call(case: u32, ptr: *const u32, len: usize, seed: u32, factor: u32) -> u64 {
    let xs = std::slice::from_raw_parts(ptr, len);
    match case {
        0 => seed.wrapping_sub(4096u32.wrapping_mul(factor)) as u64,
        1 => seed.wrapping_add(4096u32.wrapping_mul(factor.wrapping_mul(factor))) as u64,
        2 => xs.iter().fold(0u32, |s, x| s.wrapping_add(*x)).wrapping_mul(factor) as u64,
        3 => 0,
        4 => len as u64,
        5 => xs.iter().fold(0u32, |s, x| s.wrapping_add(*x)) as u64,
        6 => 0,
        _ => panic!("unknown case"),
    }
}
#[no_mangle]
pub unsafe extern "C" fn bench_filter(ptr: *const u32, len: usize, seed: u32, factor: u32, out: *mut u32) -> usize {
    let xs = std::slice::from_raw_parts(ptr, len);
    let mut count = 0;
    for &x in xs {
        if x < factor && x > seed { *out.add(count) = x; count += 1; }
    }
    count
}
#[no_mangle]
pub unsafe extern "C" fn bench_map(ptr: *const u32, len: usize, factor: u32, out: *mut u32) -> usize {
    let xs = std::slice::from_raw_parts(ptr, len);
    let delta=32u32.wrapping_mul(factor);
    for (i,&x) in xs.iter().enumerate() { *out.add(i)=x.wrapping_sub(delta); }
    len
}

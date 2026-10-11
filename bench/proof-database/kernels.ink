module ProofPerformance;

pub fn repeat_subtract(xs: List<u32>, seed: u32, factor: u32) -> u32 {
    return repeat(4096, seed, fn(i) => fn(acc) => acc - factor);
}
pub fn repeat_product(xs: List<u32>, seed: u32, factor: u32) -> u32 {
    return repeat(4096, seed, fn(i) => fn(acc) => acc + factor * factor);
}
pub fn scaled_sum(xs: List<u32>, seed: u32, factor: u32) -> u32 {
    return sum(xs.map(fn(x) => x * factor));
}
pub fn zero_sum(xs: List<u32>, seed: u32, factor: u32) -> u32 {
    return sum(xs.map(fn(x) => 0));
}
pub fn mapped_count(xs: List<u32>, seed: u32, factor: u32) -> u64 {
    return count(xs.map(fn(x) => x * x + 7));
}
pub fn true_filter_sum(xs: List<u32>, seed: u32, factor: u32) -> u32 {
    return sum(xs.filter(fn(x) => true));
}
pub fn false_filter_count(xs: List<u32>, seed: u32, factor: u32) -> u64 {
    return count(xs.filter(fn(x) => false));
}
pub fn fused_filter(xs: List<u32>, seed: u32, factor: u32) -> List<u32> {
    return xs.filter(fn(x) => x < factor).filter(fn(x) => x > seed);
}
pub fn gpu_repeat_subtract(xs: List<u32>, seed: u32, factor: u32) -> List<u32> {
    return xs.map(fn(x) => repeat(32, x, fn(i) => fn(acc) => acc - factor));
}

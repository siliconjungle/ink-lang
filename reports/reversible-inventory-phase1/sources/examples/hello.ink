module hello;

fn total(xs: List<u64>, scale: u64) -> u64 {
    return sum(xs.map(fn(x) => x * scale));
}

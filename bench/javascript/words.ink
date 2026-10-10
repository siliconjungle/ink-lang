module Words;
fn wrapping(xs: List<u64>) -> List<u64> { return xs.map(fn(x) => x * x + 1); }

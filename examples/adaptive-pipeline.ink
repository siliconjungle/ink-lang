module AdaptivePipeline;
fn inc(xs: List<u32>) -> List<u32> { return xs.map(fn(x) => x + 1); }
fn double(xs: List<u32>) -> List<u32> { return xs.map(fn(x) => x * 2); }
fn identity(xs: List<u32>) -> List<u32> { return xs; }
fn evens(xs: List<u32>) -> List<u32> { return xs.filter(fn(x) => rem_or(x, 2, 0) == 0); }
fn total(xs: List<u32>) -> u32 { return sum(xs); }
fn combine(a: u32, b: u32) -> u32 { return a + b; }
fn wide(xs: List<u64>) -> List<u64> { return xs.map(fn(x) => x * 17 + 1); }
fn heavy(xs: List<u32>) -> List<u32> {
  return xs.map(fn(x) => repeat(512, x, fn(i) => fn(v) => v * 1664525 + 1013904223 + i));
}

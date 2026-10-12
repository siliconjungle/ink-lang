module GpuParallel;
// Parallel GPU schedule fixtures: every element type and size boundary.
record Item { key: i32, weight: u32, flag: Bool, }
fn scan_u32(xs: List<u32>) -> List<u32> { return xs.scan(); }
fn scan_i32(xs: List<i32>) -> List<i32> { return xs.scan(); }
fn scan_u64(xs: List<u64>) -> List<u64> { return xs.scan(); }
fn sort_u32(xs: List<u32>) -> List<u32> { return xs.sort(); }
fn sort_i32(xs: List<i32>) -> List<i32> { return xs.sort(); }
fn sort_u64(xs: List<u64>) -> List<u64> { return xs.sort(); }
fn keep_items(xs: List<Item>, limit: i32) -> List<Item> { return xs.filter(fn(x) => x.flag && x.key < limit); }
fn keep_odd(xs: List<u64>) -> List<u64> { return xs.filter(fn(x) => rem_or(x, 2, 0) == 1); }
fn sum_u32(xs: List<u32>) -> u32 { return sum(xs); }
fn sum_i32(xs: List<i32>) -> i32 { return sum(xs); }
fn sum_u64(xs: List<u64>) -> u64 { return sum(xs); }
fn cat_items(xs: List<Item>, ys: List<Item>) -> List<Item> { return xs.concat(ys); }
fn pipeline(xs: List<i32>) -> i32 { return sum(xs.filter(fn(x) => x > 0).map(fn(x) => x * 3).sort().scan()); }

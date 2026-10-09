module arithmetic_search;
fn scalar(x: u64, y: u64) -> u64 { return (x + y) - y + 0; }
fn zeros(x: u64) -> u64 { return x - x; }
fn mapped(xs: List<u64>, offset: u64) -> u64 { return sum(xs.map(fn(x) => (x + offset) - offset + 0)); }
fn shadow(xs: List<u64>, x: u64) -> u64 { return sum(xs.map(fn(x) => (x + 0) * 0)); }
fn factored(x: u64) -> u64 { return x * x + 6 * x + 9; }

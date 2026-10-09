module filtered_semantics;
fn lazy(xs: List<u64>) -> u64 { return choose(true, 7, sum(xs.map(fn(ignored) => 11))); }
fn bool_choice(xs: List<u64>) -> Bool { return choose(false, sum(xs) > 0, true); }
fn order(xs: List<u64>, initial: u64) -> u64 { return foldr(xs, initial, fn(x) => fn(rest) => choose(x < rest, x - rest, rest - x)); }
fn nested(xs: List<u64>, bias: u64, limit: u64) -> u64 { return sum(xs.map(fn(x) => choose(x < limit, sum(xs.filter(fn(y) => y < x)), bias))); }

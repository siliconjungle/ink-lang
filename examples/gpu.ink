module gpu_demo;

fn square(x: u32) -> u32 { return x * x + 17; }
fn twice(x: u32) -> u32 { return square(square(x)); }
fn four(x: u32) -> u32 { return twice(twice(x)); }
fn eight(x: u32) -> u32 { return four(four(x)); }
fn sixteen(x: u32) -> u32 { return eight(eight(x)); }
fn thirtytwo(x: u32) -> u32 { return sixteen(sixteen(x)); }
fn sixtyfour(x: u32) -> u32 { return thirtytwo(thirtytwo(x)); }

pub fn heavy(xs: List<u32>) -> u32 { return sum(xs.map(fn(x) => sixtyfour(x))); }
pub fn total(xs: List<u32>, scale: u32) -> u32 { return sum(xs.map(fn(x) => x * scale)); }
pub fn filtered(xs: List<u32>, limit: u32) -> u32 { return sum(xs.filter(fn(x) => x < limit).map(fn(x) => x * x)); }
pub fn selected(xs: List<u32>, limit: u32) -> u64 { return count(xs.filter(fn(x) => x < limit)); }
pub fn conditional(xs: List<u32>, enabled: Bool) -> u32 { return sum(xs.map(fn(x) => choose(enabled, square(x), x))); }
pub fn ordered(xs: List<u32>) -> u32 { return foldr(xs, 0, fn(x) => fn(rest) => x - rest); }
pub fn wide(xs: List<u64>) -> u64 { return sum(xs.map(fn(x) => x + 1)); }
pub fn constant(xs: List<u32>) -> u32 { return sum(xs.map(fn(x) => 1)); }
pub fn double_filter(xs: List<u32>, limit: u32) -> u32 { return sum(xs.filter(fn(x) => x < limit).filter(fn(x) => x > 0).map(fn(x) => x * x)); }
pub fn shadow(xs: List<u32>, x: u32) -> u32 { return sum(xs.map(fn(x) => x + 1).map(fn(y) => y + x)); }
pub fn lazy(xs: List<u32>, enabled: Bool) -> u32 { return choose(enabled, sum(xs), 7); }
// Literal-only intermediate maps retain their default u64 width.
pub fn intermediate_wide(xs: List<u32>) -> u32 { return sum(xs.map(fn(x) => 4294967295 + 1).filter(fn(x) => x < 1).map(fn(x) => 1)); }
pub fn count_constants(xs: List<u32>) -> u64 { return count(xs.map(fn(x) => 1)); }

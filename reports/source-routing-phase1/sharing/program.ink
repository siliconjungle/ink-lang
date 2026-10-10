module sharing;
fn bulk(xs: List<u32>) -> u32 { return sum(xs); }
fn combine(a: u32, b: u32) -> u32 { return a + b; }
fn entry(xs: List<u32>) -> u32 { return combine(bulk(xs), bulk(xs)); }

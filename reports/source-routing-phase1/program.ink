module routing_example;
fn bulk(xs: List<u32>, scale: u32) -> u32 {
    return sum(xs.map(fn(x) => x * scale + 7).filter(fn(x) => x > 100));
}
fn finish(value: u32, bias: u32) -> u32 { return value + bias; }
fn entry(xs: List<u32>, scale: u32, bias: u32) -> u32 {
    return finish(bulk(xs, scale), bias);
}

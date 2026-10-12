module Composed;
pub fn f(xs:List<u32>,n:u32,cut:u32)->u64 {
    return count(xs.take(n).concat(xs.drop(n)).filter(fn(x)=>x>=cut));
}

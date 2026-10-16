module integer_measure;
fn reduce(xs:List<u64>)->u64{return foldl(xs,0,fn(x)=>fn(a)=>a+quot_or(x,8,73));}
pub fn score(xs:List<u64>,cohort:u32)->u64{return reduce(xs);}

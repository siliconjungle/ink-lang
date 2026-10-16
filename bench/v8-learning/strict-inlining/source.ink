module strict_inline_measure;
fn reduce(xs:List<u64>)->u64{return foldl(xs,0,fn(x)=>fn(a)=>a+x);}
fn twice(x:u64)->u64{return x+x;}
pub fn score(xs:List<u64>,cohort:u32)->u64{return twice(reduce(xs));}

module shared_witnesses;
fn reduce(xs:List<u64>)->u64{return foldl(xs,0,fn(x)=>fn(a)=>a+quot_or(x,x,73)+rem_or(x,x,73)+rem_or(0,x,73));}
pub fn score(xs:List<u64>,cohort:u32)->u64{return reduce(xs)+word_widen_u32_to_u64(cohort);}

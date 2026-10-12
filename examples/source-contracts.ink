module source_contracts;
private state Current:u64=0;
invariant Current==0;
spec change reset(n:u64)->Unit reads(Current) writes(Current)
 requires n==0;
 ensures Current==n;
 ensures before(Current)==0;
implementation store for reset {Current=n;return ();}
query read()->u64 reads(Current){return Current;}
change twice()->Unit reads(Current) writes(Current){reset(0);reset(0);return ();}
spec fn only_zero(x:u64)->u64 requires x==0; ensures result==x;
implementation identity for only_zero{return x;}
spec fn apply<T>(x:T,f:fn(T)->T)->T ensures result==f(x);
implementation direct for apply{return f(x);}
fn increment(x:u64)->u64{return apply<u64>(x,fn(n)=>n+1);}
record Job{id:u64, value:u64,}
fn ids(xs:List<Job>)->Bool{return unique_ids(xs);}
fn bags(xs:List<u64>,ys:List<u64>)->Bool{return multiset(xs)==multiset(ys);}
fn float_bags(xs:List<f32>,ys:List<f32>)->Bool{return multiset(xs)==multiset(ys);}
fn unique_values(xs:List<u64>)->Bool{return unique(xs);}
fn unique_keys(xs:List<Job>)->Bool{return unique_by(xs,fn(x)=>x.id);}

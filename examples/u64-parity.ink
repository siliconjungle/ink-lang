module u64_parity;
record WideRow {value:u64,rank:u32,}
fn add(xs:List<u64>,n:u64)->List<u64>{return xs.map(fn(x)=>x+n);}
fn subtract(xs:List<u64>,n:u64)->List<u64>{return xs.map(fn(x)=>x-n);}
fn multiply(xs:List<u64>,n:u64)->List<u64>{return xs.map(fn(x)=>x*n);}
fn negate(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>-x);}
fn quotient(xs:List<u64>,n:u64)->List<u64>{return xs.map(fn(x)=>quot_or(x,n,17));}
fn remainder(xs:List<u64>,n:u64)->List<u64>{return xs.map(fn(x)=>rem_or(x,n,19));}
fn comparisons(xs:List<u64>,n:u64)->List<Bool>{return xs.map(fn(x)=>choose(x>=n,x!=n,x<n));}
fn sort(xs:List<u64>)->List<u64>{return xs.sort();}
fn scan(xs:List<u64>)->List<u64>{return xs.scan();}
fn total(xs:List<u64>)->u64{return sum(xs);}
fn owned(xs:List<u64>,at:u32)->List<u64>{return xs.map(fn(x)=>buffer_fill(4,x).split_at(at,fn(left)=>fn(right)=>left.map_parallel(1,fn(i)=>fn(v)=>v+3).append(right.map_parallel(1,fn(i)=>fn(v)=>v*5))).at_or(0,11));}
fn records(xs:List<WideRow>,n:u64)->List<WideRow>{return xs.map(fn(x)=>WideRow{value:x.value*n,rank:x.rank+1});}
query identity(x:u64)->u64{return x;}

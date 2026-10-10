module FilteredSort;
fn filtered_length(xs:List<u32>,limit:u32)->u32{return length(xs.sort().filter(fn(x)=>x<limit));}
fn filtered_count(xs:List<u32>,limit:u32)->u64{return count(xs.sort().filter(fn(x)=>x<limit));}
fn filtered_sum(xs:List<u32>,limit:u32)->u32{return sum(xs.sort().filter(fn(x)=>x<limit));}
fn wide_length(xs:List<u64>,limit:u64)->u32{return length(xs.sort().filter(fn(x)=>x<limit));}
fn wide_count(xs:List<u64>,limit:u64)->u64{return count(xs.sort().filter(fn(x)=>x<limit));}
fn wide_sum(xs:List<u64>,limit:u64)->u64{return sum(xs.sort().filter(fn(x)=>x<limit));}
fn signed_length(xs:List<i32>,limit:i32)->u32{return length(xs.sort().filter(fn(x)=>x<limit));}
fn signed_count(xs:List<i32>,limit:i32)->u64{return count(xs.sort().filter(fn(x)=>x<limit));}
fn signed_sum(xs:List<i32>,limit:i32)->i32{return sum(xs.sort().filter(fn(x)=>x<limit));}
fn filtered_values(xs:List<u32>,limit:u32)->List<u32>{return xs.sort().filter(fn(x)=>x<limit);}
fn captured(xs:List<u32>,limits:List<u32>)->List<u64>{
    return limits.map(fn(limit)=>count(xs.sort().filter(fn(x)=>x<limit)));
}

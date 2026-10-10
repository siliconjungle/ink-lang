module SortCardinality;
fn sorted_length(xs:List<u32>)->u32{return length(xs.sort());}
fn sorted_count(xs:List<u32>)->u64{return count(xs.sort());}
fn wide_length(xs:List<u64>)->u32{return length(xs.sort());}
fn wide_count(xs:List<u64>)->u64{return count(xs.sort());}
fn signed_length(xs:List<i32>)->u32{return length(xs.sort());}
fn signed_count(xs:List<i32>)->u64{return count(xs.sort());}
fn sorted_sum(xs:List<u32>)->u32{return sum(xs.sort());}
fn wide_sum(xs:List<u64>)->u64{return sum(xs.sort());}
fn signed_sum(xs:List<i32>)->i32{return sum(xs.sort());}
fn pipeline_count(xs:List<u32>,limit:u32)->u64{
    return count(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3).sort());
}
fn sorted_values(xs:List<u32>)->List<u32>{return xs.sort();}

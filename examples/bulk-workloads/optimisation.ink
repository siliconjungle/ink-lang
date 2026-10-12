module bulk_optimisation;
fn fill_length(xs:List<u32>,start:u32,count:u32,value:u32)->u32{return buffer(xs).fill_range(start,count,value).len();}
fn zero_fill(xs:List<u32>,start:u32,value:u32)->List<u32>{return buffer(xs).fill_range(start,0,value).freeze();}
fn zero_copy(xs:List<u32>,source:u32,destination:u32)->List<u32>{return buffer(xs).copy_within(source,destination,0).freeze();}
query readiness()->u32{return 1;}

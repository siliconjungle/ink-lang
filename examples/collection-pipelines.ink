module CollectionPipelines;
fn mapped_length(xs:List<u32>)->u32{return length(xs.map(fn(x)=>x*x+17));}
fn converted_length(xs:List<u32>,limit:u32)->u32{return length(xs.map(fn(x)=>x<limit));}
fn mapped_fold(xs:List<u32>,seed:u32)->u32{
    return foldr(xs.map(fn(x)=>x*17+3),seed,fn(x)=>fn(rest)=>x-rest);
}
fn filtered_fold(xs:List<u32>,limit:u32,seed:u32)->u32{
    return foldr(xs.filter(fn(x)=>x<limit),seed,fn(x)=>fn(rest)=>x-rest);
}
fn pipeline_fold(xs:List<u32>,limit:u32,seed:u32)->u32{
    return foldr(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3),seed,fn(x)=>fn(rest)=>x-rest);
}
fn discarded_length(xs:List<u32>)->u32{return length(xs.filter(fn(x)=>false));}
fn discarded_count(xs:List<u32>)->u64{return count(xs.filter(fn(x)=>false));}
fn float_fold(xs:List<f32>,scale:f32,offset:f32,seed:f32)->f32{
    return foldr(xs.map(fn(x)=>x*scale+offset),seed,fn(x)=>fn(rest)=>x-rest);
}
fn wide_fold(xs:List<u64>,seed:u64)->u64{
    return foldr(xs.map(fn(x)=>x*17+3),seed,fn(x)=>fn(rest)=>x-rest);
}
fn signed_fold(xs:List<i32>,seed:i32)->i32{
    return foldr(xs.filter(fn(x)=>x<0),seed,fn(x)=>fn(rest)=>x-rest);
}
fn mapped_sum(xs:List<u32>)->u32{return sum(xs.map(fn(x)=>x*17+3));}
fn filtered_sum(xs:List<u32>,limit:u32)->u32{return sum(xs.filter(fn(x)=>x<limit));}
fn pipeline_sum(xs:List<u32>,limit:u32)->u32{return sum(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3));}
fn float_filter_fold(xs:List<f32>,limit:f32,seed:f32)->f32{
    return foldr(xs.filter(fn(x)=>x<limit),seed,fn(x)=>fn(rest)=>x-rest);
}
fn float_pipeline_fold(xs:List<f32>,limit:f32,scale:f32,offset:f32,seed:f32)->f32{
    return foldr(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*scale+offset),seed,fn(x)=>fn(rest)=>x-rest);
}

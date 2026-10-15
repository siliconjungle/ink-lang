module invariant_measurement;
pub fn run(xs:List<u32>,ys:List<u32>)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+x*foldl(ys,0,fn(y)=>fn(b)=>b+y*y));}

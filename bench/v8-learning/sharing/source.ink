module sharing_traversals;
pub fn run(xs:List<u32>)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+x*x)+foldl(xs,0,fn(x)=>fn(a)=>a+x*x);}

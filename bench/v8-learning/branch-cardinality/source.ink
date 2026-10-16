module branch_work;
pub fn folded(xs:List<u32>,ys:List<u32>)->u32{
 return foldl(xs,0,fn(x)=>fn(a)=>a+x*foldl(ys,0,fn(y)=>fn(b)=>b+y*y));
}
pub fn mapped(xs:List<u32>,ys:List<u32>)->List<u32>{
 return xs.map(fn(x)=>x+foldl(ys,0,fn(y)=>fn(a)=>a+y*y));
}
pub fn filtered(xs:List<u32>,ys:List<u32>)->List<u32>{
 return xs.filter(fn(x)=>x>foldr(ys,0,fn(y)=>fn(a)=>a+y*y));
}

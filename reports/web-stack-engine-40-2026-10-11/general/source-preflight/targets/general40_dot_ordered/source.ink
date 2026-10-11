module General40;
pub fn general40_dot_ordered(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.zip(ys,fn(x)=>fn(y)=>x*y),seed,fn(x)=>fn(acc)=>x+acc*k);}

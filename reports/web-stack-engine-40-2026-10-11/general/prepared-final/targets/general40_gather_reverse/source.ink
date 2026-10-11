module General40;
pub fn general40_gather_reverse(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>ys.at_or(seed-i-1,x)+x*k);}

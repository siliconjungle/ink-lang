module General40;
pub fn general40_compaction(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.filter(fn(x)=>rem_or(x,16,0)<seed).map(fn(x)=>x*k+1);}

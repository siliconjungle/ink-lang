module structure_bench;
pub fn all_below(xs:List<u32>,cut:u32)->Bool{return foldl(xs,true,fn(x)=>fn(a)=>a && x<cut);}
pub fn product(xs:List<u64>,k:u64)->u64{return foldl(xs,1,fn(x)=>fn(a)=>a*(x+k));}
pub fn total_sorted(xs:List<u32>)->u32{return foldr(xs.sort(),0,fn(x)=>fn(a)=>x+a);}
pub fn count_big(xs:List<u32>,k:u32)->u64{return foldr(xs.sort(),0,fn(x)=>fn(a)=>choose(x>k,a+1,a));}

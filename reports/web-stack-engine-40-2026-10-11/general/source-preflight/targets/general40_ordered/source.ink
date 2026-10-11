module General40;
pub fn general40_ordered(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs,seed,fn(x)=>fn(acc)=>choose(acc<seed,x+acc*k,x-acc));}

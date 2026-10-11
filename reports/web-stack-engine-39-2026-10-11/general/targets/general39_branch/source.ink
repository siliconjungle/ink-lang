module General39;
pub fn general39_branch(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,x*k+1,quot_or(x,k,0)+seed));}

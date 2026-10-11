module General39;
pub fn general39_update_recompute(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,k,1)==0,ys.at_or(i,x),x));}

module General39;
pub fn general39_stencil(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>xs.at_or(i-1,0)+x*k+xs.at_or(i+1,0));}

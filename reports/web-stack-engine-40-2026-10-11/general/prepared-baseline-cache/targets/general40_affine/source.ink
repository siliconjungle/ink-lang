module General40;
pub fn general40_affine(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*k+seed);}

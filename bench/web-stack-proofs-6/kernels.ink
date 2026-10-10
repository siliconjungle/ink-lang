module WebStackProofs6;
pub fn contribution_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(64,x,fn(i)=>fn(a)=>a+choose(x<seed,a*k,(seed-a)*k)+choose(x<seed,(seed-a)*k,a*k))+seed);}
pub fn conditional_blend(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(64,x,fn(i)=>fn(a)=>choose(x<seed,a*k,a*seed)+choose(x<seed,(a+seed)*(1-k),(a+seed)*(1-seed)))+seed);}
pub fn compensated_patch(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(64,x,fn(i)=>fn(a)=>choose(x<seed,a-seed+k+seed-k,a-k+seed+k-seed))+seed);}

pub fn squared_values(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a*b);}
pub fn calibrated_squares(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a*b).map(fn(x)=>x*k+seed);}
pub fn self_squared_distance(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>(a-b)*(a-b));}

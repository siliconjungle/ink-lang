module WebProof18;
pub fn sorted_calibrated_total_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>x*3+k));}
pub fn sorted_squared_energy_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>x*x+k));}
pub fn sorted_distance_total_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>choose(x<seed,seed-x,x-seed)));}
pub fn sorted_calibrated_total_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>choose(x<seed,x*k,x+k)));}
pub fn sorted_squared_energy_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>(x-seed)*(x-seed)));}
pub fn sorted_distance_total_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.sort().map(fn(x)=>choose(x<seed,x,seed)));}
pub fn lower_projection_repeat_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(8,x,fn(i)=>fn(a)=>choose(a<seed,seed,a)));}
pub fn upper_projection_repeat_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(32,x,fn(i)=>fn(a)=>choose(a>k,k,a)));}
pub fn keyed_projection_repeat_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(64,x,fn(i)=>fn(a)=>choose(a==seed,k,a)));}
pub fn lower_projection_repeat_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(8,x,fn(i)=>fn(a)=>choose(a<k,k,a)));}
pub fn upper_projection_repeat_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(32,x,fn(i)=>fn(a)=>choose(a>seed,seed,a)));}
pub fn keyed_projection_repeat_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(64,x,fn(i)=>fn(a)=>choose(a==k,seed,a)));}

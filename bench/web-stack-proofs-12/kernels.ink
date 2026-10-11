module WebProof12;
pub fn cubic_odd_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)-(x-k)*(x-k)*(x-k)+seed);}
pub fn quartic_odd_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)*(x+k)-(x-k)*(x-k)*(x-k)*(x-k)+seed);}
pub fn quintic_odd_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)*(x+k)*(x+k)-(x-k)*(x-k)*(x-k)*(x-k)*(x-k)+seed);}

pub fn gated_mapped_left(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x+seed).zip(xs,fn(a)=>fn(b)=>choose(b<seed,a,b)).map(fn(x)=>x*k+seed);}
pub fn gated_mapped_right(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs.map(fn(x)=>x*x+seed),fn(a)=>fn(b)=>choose(a<seed,a,b)).map(fn(x)=>x*k+seed);}
pub fn mode_selected_pair(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x+seed).zip(xs.map(fn(x)=>x*k-seed),fn(a)=>fn(b)=>choose(seed<k,a,b)).map(fn(x)=>x+seed);}

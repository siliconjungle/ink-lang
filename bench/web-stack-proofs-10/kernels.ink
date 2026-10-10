module WebProof10;
pub fn cubic_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)-2*x*x*x+(x-k)*(x-k)*(x-k)+seed);}
pub fn quartic_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)*(x+k)-2*x*x*x*x+(x-k)*(x-k)*(x-k)*(x-k)+seed);}
pub fn quintic_difference(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)*(x+k)*(x+k)-2*x*x*x*x*x+(x-k)*(x-k)*(x-k)*(x-k)*(x-k)+seed);}

pub fn nested_left_route(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a+b*k).zip(xs,fn(a)=>fn(b)=>a-b*seed).map(fn(x)=>x+seed);}
pub fn nested_right_route(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs.zip(xs,fn(a)=>fn(b)=>a+b*k),fn(a)=>fn(b)=>a*seed-b).map(fn(x)=>choose(x<seed,x*k,x+seed));}
pub fn multiplicative_pair(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*k+seed).zip(xs.map(fn(x)=>x*k-seed),fn(a)=>fn(b)=>a*b).map(fn(x)=>x+seed);}

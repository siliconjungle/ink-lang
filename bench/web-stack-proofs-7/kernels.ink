module WebProof7;
pub fn centered_energy(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x+seed*seed-2*x*seed);}
pub fn complementary_blend(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*k+(x+seed)*(1-k));}
pub fn calibrated_energy(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x*seed)*(x*seed)+2*(x*seed)*k+k*k);}

pub fn minimum_route(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs,fn(a)=>fn(b)=>choose(a<b,a,b)).map(fn(x)=>x*k+seed);
}

pub fn maximum_route(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs,fn(a)=>fn(b)=>choose(a<b,b,a)).map(fn(x)=>choose(x<seed,x*k,x+seed));
}

pub fn equality_route(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs,fn(a)=>fn(b)=>choose(a==b,a*k,b*seed)).map(fn(x)=>x+seed);
}

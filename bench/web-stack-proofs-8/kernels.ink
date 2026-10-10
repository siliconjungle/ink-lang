module WebProof8;
pub fn centered_fourth_moment(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x*x*x-4*x*x*x*seed+6*x*x*seed*seed-4*x*seed*seed*seed+seed*seed*seed*seed);}
pub fn centered_sixth_moment(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x*x*x*x*x-6*x*x*x*x*x*seed+15*x*x*x*x*seed*seed-20*x*x*x*seed*seed*seed+15*x*x*seed*seed*seed*seed-6*x*seed*seed*seed*seed*seed+seed*seed*seed*seed*seed*seed);}
pub fn centered_eighth_moment(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*x*x*x*x*x*x*x-8*x*x*x*x*x*x*x*seed+28*x*x*x*x*x*x*seed*seed-56*x*x*x*x*x*seed*seed*seed+70*x*x*x*x*seed*seed*seed*seed-56*x*x*x*seed*seed*seed*seed*seed+28*x*x*seed*seed*seed*seed*seed*seed-8*x*seed*seed*seed*seed*seed*seed*seed+seed*seed*seed*seed*seed*seed*seed*seed);}

pub fn projected_right(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*x+seed).zip(xs,fn(a)=>fn(b)=>b).map(fn(x)=>x*k+seed);
}

pub fn projected_left(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs.map(fn(x)=>x*x+seed),fn(a)=>fn(b)=>a).map(fn(x)=>choose(x<seed,x*k,x+seed));
}

pub fn complemented_total(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>seed-x).zip(xs,fn(a)=>fn(b)=>a+b).map(fn(x)=>x*k+seed);
}

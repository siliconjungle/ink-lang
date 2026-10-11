module WebProof9;
pub fn bernstein_cubic_constant(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>seed*(1-x)*(1-x)*(1-x)+3*seed*x*(1-x)*(1-x)+3*seed*x*x*(1-x)+seed*x*x*x);}
pub fn bernstein_quintic_constant(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>seed*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)+5*seed*x*(1-x)*(1-x)*(1-x)*(1-x)+10*seed*x*x*(1-x)*(1-x)*(1-x)+10*seed*x*x*x*(1-x)*(1-x)+5*seed*x*x*x*x*(1-x)+seed*x*x*x*x*x);}
pub fn bernstein_septic_constant(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>seed*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)+7*seed*x*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)+21*seed*x*x*(1-x)*(1-x)*(1-x)*(1-x)*(1-x)+35*seed*x*x*x*(1-x)*(1-x)*(1-x)*(1-x)+35*seed*x*x*x*x*(1-x)*(1-x)*(1-x)+21*seed*x*x*x*x*x*(1-x)*(1-x)+7*seed*x*x*x*x*x*x*(1-x)+seed*x*x*x*x*x*x*x);}


pub fn mapped_difference(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*k+seed).zip(xs.map(fn(x)=>x*k+seed),fn(a)=>fn(b)=>a-b).map(fn(x)=>x+seed);
}

pub fn paired_complement(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*k).zip(xs.map(fn(x)=>seed-x*k),fn(a)=>fn(b)=>a+b).map(fn(x)=>x+seed);
}

pub fn padded_prefix(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.concat(xs).zip(xs,fn(a)=>fn(b)=>a+b).map(fn(x)=>choose(x<seed,x*k,x+seed));
}

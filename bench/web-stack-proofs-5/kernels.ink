module WebStackProofs5;
pub fn scaled_first(xs:List<u32>,seed:u32,k:u32)->u32 {
    return xs.map(fn(x)=>x*k).at_or(0,seed*k);
}

pub fn calibrated_first(xs:List<u32>,seed:u32,k:u32)->u32 {
    return xs.map(fn(x)=>x*k+seed).at_or(0,seed*k+seed);
}

pub fn first_below_threshold(xs:List<u32>,seed:u32,k:u32)->u32 {
    return choose(xs.map(fn(x)=>x<seed).at_or(0,k<seed),1,0);
}

pub fn dead_map_fold(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*k+seed),seed,fn(x)=>fn(a)=>a);}
pub fn discount_total(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.map(fn(x)=>x-x*k));}
pub fn spread_total(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.map(fn(x)=>x*k-x*seed));}
pub fn spread_map(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*k-x*seed);}

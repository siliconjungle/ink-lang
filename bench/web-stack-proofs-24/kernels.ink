module WebProof24;
pub fn demand_mapped_head_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.map(fn(x)=>choose(x>k,x*k+seed,seed-x)).at_or(0,choose(seed>k,seed*k+seed,seed-seed));}
pub fn demand_mapped_head_heldout_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.map(fn(x)=>choose(x<k,x*x+seed,(x-seed)*(x+k))).at_or(0,choose(seed<k,seed*seed+seed,(seed-seed)*(seed+k)));}
pub fn demand_filtered_mapped_head_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x>k,x*k+seed,seed-x)).at_or(0,choose(seed>k,seed*k+seed,seed-seed));}
pub fn demand_filtered_mapped_head_heldout_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x<k).map(fn(x)=>choose(x<k,x*x+seed,(x-seed)*(x+k))).at_or(0,choose(seed<k,seed*seed+seed,(seed-seed)*(seed+k)));}
pub fn skip_first_accepted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).at_or(0,seed);}
pub fn skip_first_accepted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x<k).at_or(0,seed);}
pub fn reference_count_u32(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs);}
pub fn reference_indexed_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed));}

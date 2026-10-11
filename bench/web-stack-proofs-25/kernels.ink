module WebProof25;
pub fn accepted_repair_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.filter(fn(x)=>rem_or(x,seed,0)<k).map(fn(x)=>choose(rem_or(x,seed,0)<k,choose(x<seed,seed-x,x+seed),choose(x>seed,x-seed,x*k)));}
pub fn accepted_checksum_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.filter(fn(x)=>rem_or(x,seed,0)<k).map(fn(x)=>choose(rem_or(x,seed,0)<k,choose(x<seed,seed-x,x+seed),choose(x>seed,x-seed,x*k))),seed,fn(x)=>fn(a)=>choose(a<seed,x+a*k,x-a));}
pub fn accepted_repair_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.filter(fn(x)=>choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0)).map(fn(x)=>choose(choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0),choose(x>k,x*k-seed,seed+x),choose(x<k,x+seed,x-k)));}
pub fn accepted_checksum_heldout_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.filter(fn(x)=>choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0)).map(fn(x)=>choose(choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0),choose(x>k,x*k-seed,seed+x),choose(x<k,x+seed,x-k))),seed,fn(x)=>fn(a)=>choose(a<seed,x+a*k,x-a));}
pub fn skip_first_accepted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).at_or(0,seed);}
pub fn skip_first_accepted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x<k).at_or(0,seed);}
pub fn demand_filtered_mapped_head_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x>k,x*k+seed,seed-x)).at_or(0,choose(seed>k,seed*k+seed,seed-seed));}
pub fn reference_indexed_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed));}
pub fn accepted_total_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>rem_or(x,seed,0)<k).map(fn(x)=>choose(rem_or(x,seed,0)<k,choose(x<seed,seed-x,x+seed),choose(x>seed,x-seed,x*k))));}

module WebProof21;
pub fn partition_dual_add_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>quot_or(x+seed,k,seed)))+sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed));}
pub fn partition_dual_subtract_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>quot_or(x+seed,k,seed)))-sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed));}
pub fn partition_dual_weighted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>quot_or(x+seed,k,seed)))*k+sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed))*3;}
pub fn partition_dual_add_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>k).map(fn(x)=>choose(x>seed,x-seed,seed-x)*3))+sum(xs.filter(fn(x)=>(x>k)==false).map(fn(x)=>quot_or(x*k+seed,seed,k)));}
pub fn partition_dual_subtract_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>k).map(fn(x)=>choose(x>seed,x-seed,seed-x)*3))-sum(xs.filter(fn(x)=>(x>k)==false).map(fn(x)=>quot_or(x*k+seed,seed,k)));}
pub fn partition_dual_weighted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>k).map(fn(x)=>choose(x>seed,x-seed,seed-x)*3))*k+sum(xs.filter(fn(x)=>(x>k)==false).map(fn(x)=>quot_or(x*k+seed,seed,k)))*3;}
pub fn map_indexed_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,x+k,x-k)).map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x*k,x+seed));}
pub fn indexed_map_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)).map(fn(x)=>choose(x<seed,x+k,x-k));}
pub fn indexed_indexed_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)).map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x*k,x+seed));}
pub fn map_indexed_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x>k,x-seed,seed-x)).map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,3,0)==0,x*k,x+seed));}
pub fn indexed_map_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)).map(fn(x)=>choose(x>k,x-seed,seed-x));}
pub fn indexed_indexed_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)).map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,3,0)==0,x*k,x+seed));}

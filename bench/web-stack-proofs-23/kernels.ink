module WebProof23;
pub fn skip_partition_count_u32(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs.filter(fn(x)=>x>seed))+count(xs.filter(fn(x)=>(x>seed)==false));}
pub fn skip_first_accepted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).at_or(0,seed);}
pub fn skip_mapped_first_accepted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x>k,x-k,x+k)).at_or(0,seed);}
pub fn skip_partition_count_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs.filter(fn(x)=>x<k))+count(xs.filter(fn(x)=>(x<k)==false));}
pub fn skip_first_accepted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x<k).at_or(0,seed);}
pub fn skip_mapped_first_accepted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return xs.filter(fn(x)=>x<k).map(fn(x)=>choose(x<seed,x+k,x-seed)).at_or(0,seed);}
pub fn pipeline_scan_left_project_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.scan().zip(xs,fn(prefix)=>fn(x)=>choose(x<seed,x+k,x-seed));}
pub fn pipeline_scan_right_project_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs.scan(),fn(x)=>fn(prefix)=>choose(x<seed,x+k,x-seed));}
pub fn pipeline_scan_first_value_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.scan().at_or(0,seed)+k;}
pub fn pipeline_scan_left_project_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.scan().zip(xs,fn(prefix)=>fn(x)=>choose(x>k,x*k+seed,seed-x));}
pub fn pipeline_scan_right_project_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs.scan(),fn(x)=>fn(prefix)=>choose(x>k,x*k+seed,seed-x));}
pub fn pipeline_scan_first_value_heldout_u32(xs:List<u32>,seed:u32,k:u32)->u32{return xs.scan().at_or(0,seed)*k+seed;}

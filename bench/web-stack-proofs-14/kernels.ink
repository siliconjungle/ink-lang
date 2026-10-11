module WebProof14;
pub fn calibrated_checksum(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*3+k),seed,fn(x)=>fn(a)=>x+a*k);}
pub fn accepted_total(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed));}
pub fn calibrated_accepted_total(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.map(fn(x)=>x*3+k).filter(fn(x)=>x<seed));}
pub fn distance_total(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)));}
pub fn accepted_checksum(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.filter(fn(x)=>x>seed),seed,fn(x)=>fn(a)=>x+a*k);}
pub fn calibrated_accepted_checksum(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>choose(x<seed,x+k,x-k)).filter(fn(x)=>x>seed),seed,fn(x)=>fn(a)=>x+a*k);}
pub fn callback_mapped_head(xs:List<u32>,seed:u32,k:u32)->u32{return xs.map(fn(x)=>choose(x<seed,seed,x)).at_or(0,seed)*k;}
pub fn concat_first_result(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return xs.concat(ys).at_or(0,seed)+k;}
pub fn self_zip_cardinality(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs.zip(xs,fn(a)=>fn(b)=>choose(a<seed,a*k+b,b-seed)));}
pub fn clamped_first(xs:List<u32>,seed:u32,k:u32)->u32{return xs.map(fn(x)=>choose(x>k,k,x)).at_or(0,k)-seed;}
pub fn concat_signed_offset(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return xs.concat(ys).at_or(0,k)-seed;}
pub fn paired_score_count(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs.zip(xs,fn(a)=>fn(b)=>choose(a==b,a*k-seed,b+seed)));}
pub fn threshold_remap(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,x*k,x+seed));}
pub fn calibration_pipeline(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,seed,x)).map(fn(x)=>x*k);}

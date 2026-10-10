module WebProof20;
pub fn gated_mapper_sum_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.map(fn(x)=>choose(seed<k,quot_or(x+seed,k,seed),0)));}
pub fn gated_predicate_count_u32(xs:List<u32>,seed:u32,k:u32)->u64{return count(xs.filter(fn(x)=>choose(seed<k,x<seed,false)));}
pub fn gated_arbitrary_fold_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs,seed,fn(x)=>fn(a)=>choose(seed<k,(x+seed)*(a+k),a));}
pub fn gated_arbitrary_fold_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs,seed,fn(x)=>fn(a)=>choose(seed==k,choose(x<k,a+x*seed,a-x*k),a));}
pub fn paired_ordered_score_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.zip(xs,fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b*k)),seed,fn(v)=>fn(acc)=>choose(acc<seed,v-acc,v+acc*k));}
pub fn paired_ordered_signal_heldout_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.zip(xs,fn(a)=>fn(b)=>choose(a>k,a*b+seed,a+b*k)),seed,fn(v)=>fn(acc)=>choose(v<seed,v+acc*k,v-acc));}
pub fn paired_calibrated_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys,fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b*k)).map(fn(v)=>choose(v>k,v-seed,v+seed));}
pub fn paired_contrast_heldout_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys,fn(a)=>fn(b)=>choose(a>b,a-b,b-a)).map(fn(v)=>choose(v<seed,v*k,v+seed));}

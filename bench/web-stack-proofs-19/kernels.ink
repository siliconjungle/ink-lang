module WebProof19;
pub fn partition_recombine_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>(x+7)*(x+seed)))+sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>(x+7)*(x+seed)));}
pub fn partition_contrast_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>(x+7)*(x+seed)))-sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>(x+7)*(x+seed)));}
pub fn partition_weighted_u32(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x<seed).map(fn(x)=>(x+7)*(x+seed)))*k+sum(xs.filter(fn(x)=>(x<seed)==false).map(fn(x)=>(x+7)*(x+seed)))*3;}
pub fn partition_recombine_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x<k,k-x,x-k)+seed))+sum(xs.filter(fn(x)=>(x>seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed));}
pub fn partition_contrast_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x<k,k-x,x-k)+seed))-sum(xs.filter(fn(x)=>(x>seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed));}
pub fn partition_weighted_u32_heldout(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>x>seed).map(fn(x)=>choose(x<k,k-x,x-k)+seed))*k+sum(xs.filter(fn(x)=>(x>seed)==false).map(fn(x)=>choose(x<k,k-x,x-k)+seed))*3;}
pub fn paired_score_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,x,k)).zip(xs.map(fn(x)=>choose(x<seed,k,x)),fn(a)=>fn(b)=>choose(a<b,a+b*k,a-b*k));}
pub fn paired_signal_heldout_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x>k,x,seed)).zip(xs.map(fn(x)=>choose(x>k,seed,x)),fn(a)=>fn(b)=>choose(a>b,a*b+seed,a+b*k));}

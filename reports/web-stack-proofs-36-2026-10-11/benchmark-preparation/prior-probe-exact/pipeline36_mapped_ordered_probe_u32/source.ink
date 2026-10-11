module ProofRecipe;
pub fn pipeline36_mapped_ordered_probe_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>word(x,seed,k)),seed,fn(x)=>fn(acc)=>mix(x,acc,seed,k));}
fn word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+seed;}
fn mix(x:u32,acc:u32,seed:u32,k:u32)->u32{return choose(acc<seed,x+acc*k,x-acc);}

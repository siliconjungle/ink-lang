module ProofRecipe;
pub fn pipeline34_right_projection_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map(fn(x)=>discarded_word(x,seed,k)),fn(y)=>fn(unused)=>selected_word(y,seed,k));}
fn selected_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}
fn discarded_word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(x,k,0)+seed;}

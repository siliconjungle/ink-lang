module ProofRecipe;
pub fn pipeline33_left_projection_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.scan().zip(ys,fn(unused)=>fn(y)=>selected_word(y,seed,k));}
fn selected_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}

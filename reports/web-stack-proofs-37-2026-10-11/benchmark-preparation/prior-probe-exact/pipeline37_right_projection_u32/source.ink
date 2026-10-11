module ProofRecipe;
pub fn pipeline37_right_projection_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map_indexed(fn(i)=>fn(x)=>discarded_index(i,x,seed,k)),fn(y)=>fn(unused)=>selected_word(y,seed,k));}
fn discarded_index(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,(x+k)+i,x-seed);}
fn selected_word(y:u32,seed:u32,k:u32)->u32{return choose(y<seed,y+k,y-k);}

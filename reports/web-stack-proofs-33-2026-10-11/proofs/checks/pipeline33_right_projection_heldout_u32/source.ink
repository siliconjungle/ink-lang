module Pipeline33;
pub fn pipeline33_right_projection_heldout_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map(fn(x)=>discarded_word(x,seed,k)).scan().scan(),fn(y)=>fn(unused)=>selected_word(y,seed,k));}
fn selected_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,quot_or(x,k,0)+seed,rem_or(x,k,0)+k);}
fn discarded_word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(x,k,0)+seed;}

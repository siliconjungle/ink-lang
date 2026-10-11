module Pipeline37;
pub fn pipeline37_right_projection_heldout_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map_indexed(fn(i)=>fn(x)=>discarded_index(i,x,seed,k)),fn(y)=>fn(unused)=>selected_word(y,seed,k));}
fn discarded_index(i:u32,x:u32,seed:u32,k:u32)->u32{return index_signal(i,x,seed,k); }
fn index_signal(i:u32,x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(i,k,0)+seed;}
fn selected_word(y:u32,seed:u32,k:u32)->u32{return repair_word(y,seed,k);}
fn repair_word(y:u32,seed:u32,k:u32)->u32{return choose(y<seed,quot_or(y,k,0)+seed,rem_or(y,k,0)+k);}

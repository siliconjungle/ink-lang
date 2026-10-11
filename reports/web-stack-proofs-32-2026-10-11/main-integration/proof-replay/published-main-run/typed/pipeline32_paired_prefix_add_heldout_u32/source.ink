module Pipeline32;
pub fn pipeline32_paired_prefix_add_heldout_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>left_word(x,seed,k)).scan().zip(ys.map(fn(x)=>right_word(x,seed,k)).scan(),fn(a)=>fn(b)=>a+b).map(fn(x)=>output_word(x,seed,k));}
fn output_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}
fn left_word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+seed;}
fn right_word(x:u32,seed:u32,k:u32)->u32{return rem_or(x,k,0)+k;}

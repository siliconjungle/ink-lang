module Pipeline33;
pub fn pipeline33_right_projection_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.scan(),fn(y)=>fn(unused)=>selected_word(y,seed,k));}
fn selected_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}

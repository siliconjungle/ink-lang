module Pipeline32;
pub fn pipeline32_paired_prefix_add_i32(xs:List<i32>,ys:List<i32>,seed:i32,k:i32)->List<i32>{return xs.scan().zip(ys.scan(),fn(a)=>fn(b)=>a+b).map(fn(x)=>output_word(x,seed,k));}
fn output_word(x:i32,seed:i32,k:i32)->i32{return choose(x<seed,x+k,x-k);}

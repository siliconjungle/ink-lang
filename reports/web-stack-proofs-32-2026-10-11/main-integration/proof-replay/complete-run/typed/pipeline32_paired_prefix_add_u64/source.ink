module Pipeline32;
pub fn pipeline32_paired_prefix_add_u64(xs:List<u64>,ys:List<u64>,seed:u64,k:u64)->List<u64>{return xs.scan().zip(ys.scan(),fn(a)=>fn(b)=>a+b).map(fn(x)=>output_word(x,seed,k));}
fn output_word(x:u64,seed:u64,k:u64)->u64{return choose(x<seed,x+k,x-k);}

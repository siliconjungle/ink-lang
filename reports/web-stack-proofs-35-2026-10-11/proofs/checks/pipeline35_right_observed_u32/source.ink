module Pipeline35;
pub fn pipeline35_right_observed_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map(fn(y)=>right_word(y,seed,k)),fn(a)=>fn(b)=>combine_words(a,b,seed,k));}
fn left_word(x:u32,seed:u32,k:u32)->u32{return normalize_left(x,k)+seed;}
fn normalize_left(x:u32,k:u32)->u32{return quot_or(x,k,0)+x;}
fn right_word(y:u32,seed:u32,k:u32)->u32{return normalize_right(y,k)+k;}
fn normalize_right(y:u32,k:u32)->u32{return rem_or(y,k,0)+y;}
fn combine_words(a:u32,b:u32,seed:u32,k:u32)->u32{return mix_words(a,b,seed,k);}
fn mix_words(a:u32,b:u32,seed:u32,k:u32)->u32{return choose(a<b,a+b*k,a-b*k)+seed;}

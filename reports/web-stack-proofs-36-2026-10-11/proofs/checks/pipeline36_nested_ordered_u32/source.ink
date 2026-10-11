module Pipeline36;
pub fn pipeline36_nested_ordered_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>left_word(x,seed,k)).map(fn(x)=>post_word(x,seed,k)),seed,fn(x)=>fn(acc)=>reduce_word(x,acc,seed,k));}
fn left_word(x:u32,seed:u32,k:u32)->u32{return calibrate_left(x,k)+seed;}
fn calibrate_left(x:u32,k:u32)->u32{return quot_or(x,k,0);}
fn right_word(x:u32,seed:u32,k:u32)->u32{return calibrate_right(x,k)+k;}
fn calibrate_right(x:u32,k:u32)->u32{return rem_or(x,k,0);}
fn reduce_word(x:u32,acc:u32,seed:u32,k:u32)->u32{return mix_word(x,acc,seed,k);}
fn mix_word(x:u32,acc:u32,seed:u32,k:u32)->u32{return choose(acc<seed,x+acc*k,x-acc);}
fn post_word(x:u32,seed:u32,k:u32)->u32{return repair_word(x,seed,k);}
fn repair_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}

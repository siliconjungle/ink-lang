module General40;
pub fn general40_compaction_chain(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>stage_word(x,k)).filter(fn(x)=>rem_or(x,16,0)<seed).map(fn(x)=>repair_word(x,seed,k));}fn stage_word(x:u32,k:u32)->u32{return x*k+1;}
fn repair_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-seed);}

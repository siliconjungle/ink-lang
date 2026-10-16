module range_measurement;
pub fn guarded(x:u64)->u64 {return choose(x<=4294967295,word_widen_u32_to_u64(word_narrow_u64_to_u32(x)),x);}
pub fn relational(x:u64,upper:u64)->u64 {return choose(x<upper && upper<=4294967296,word_widen_u32_to_u64(word_narrow_u64_to_u32(x)),x);}
pub fn wrapped(x:u64)->u64 {return choose(x+1<=4294967295,word_widen_u32_to_u64(word_narrow_u64_to_u32(x+1)),x+1);}

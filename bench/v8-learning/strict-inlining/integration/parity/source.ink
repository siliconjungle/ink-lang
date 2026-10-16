module strict_inlining;
fn slow(xs:List<u32>)->List<u32>{return repeat(1000,xs,fn(i)=>fn(a)=>a);}
fn slow_word(x:u32)->u32{return repeat(1000,x,fn(i)=>fn(a)=>a);}
fn mix(first:u64,ignored:List<u32>,gate:Bool,last:u32)->u64{return choose(gate,first+first+word_widen_u32_to_u64(last),0);}
pub fn strict(seed:u64,gate:Bool)->u64{return mix(seed,slow([7]),gate,9);}
fn reversed(first:u32,last:u64)->u64{return last+word_widen_u32_to_u64(first)+last;}
pub fn tail(seed:u64)->u64{return reversed(7,seed);}
fn twice(x:u64)->u64{return x+x;}
pub fn nested(xs:List<u64>,offset:u64)->List<u64>{return xs.map(fn(x)=>twice(x+offset));}
fn copy(xs:List<f32>,marker:u32)->List<f32>{return xs;}
pub fn untouched(xs:List<f32>)->List<f32>{return copy(xs,word_narrow_u64_to_u32(twice(0)));}
fn first(x:u32,ignored:u32)->u32{return x;}
pub fn lazy(seed:u32,gate:Bool)->u32{return choose(gate,first(seed,slow_word(seed)),0);}
fn conversion(x:u64)->u64{return word_widen_u32_to_u64(word_narrow_u64_to_u32(x));}
pub fn converted(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>conversion(x));}

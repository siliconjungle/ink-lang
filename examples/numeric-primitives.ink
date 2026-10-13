module numeric_primitives;
record Summary { root:f32, quotient:f32, rounded:f32, finite:Bool, bits:u32, }
pub fn inspect(x:f32,d:f32)->Summary{return Summary{root:sqrt(x),quotient:x/d,rounded:round_ties_even(x),finite:is_finite(x),bits:f32_bits(x)};}
pub fn roots(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>sqrt(x));}
pub fn ratios(xs:List<f32>,d:f32)->List<f32>{return xs.map(fn(x)=>x/d);}
pub fn word_stats(xs:List<u64>)->List<u32>{return xs.map(fn(x)=>popcount(x)+leading_zeros(x)+trailing_zeros(x));}
pub fn text_slice(s:String,start:u32,end:u32)->Option<String>{return string_slice(s,start,end);}
pub fn text_search(s:String,needle:String,start:u32)->Option<u32>{return string_find(s,needle,start);}

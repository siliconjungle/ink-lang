module numeric_bench;
record Ops { root:u32, quotient:u32, floored:u32, ceiled:u32, truncated:u32, rounded:u32, nan:Bool, finite:Bool, }
record Casts { unsigned:Option<u32>, wide:Option<u64>, signed:Option<i32>, exact:Option<Int>, }
pub fn float_ops(xs:List<Vec2<f32>>)->List<Ops>{return xs.map(fn(v)=>Ops{root:f32_bits(sqrt(v.x)),quotient:f32_bits(v.x/v.y),floored:f32_bits(floor(v.x)),ceiled:f32_bits(ceil(v.x)),truncated:f32_bits(trunc(v.x)),rounded:f32_bits(round_ties_even(v.x)),nan:is_nan(v.x),finite:is_finite(v.x)});}
pub fn casts(x:f32)->Casts{return Casts{unsigned:u32_from_f32(x),wide:u64_from_f32(x),signed:i32_from_f32(x),exact:int_from_f32(x)};}
pub fn from_wide(xs:List<u64>)->List<u32>{return xs.map(fn(x)=>f32_bits(f32_from_u64(x)));}
pub fn from_unsigned(x:u32)->u32{return f32_bits(f32_from_u32(x));}
pub fn from_signed(x:i32)->u32{return f32_bits(f32_from_i32(x));}
pub fn from_exact(x:Int)->u32{return f32_bits(f32_from_int(x));}
pub fn word_stats(xs:List<u64>)->List<Vec3<u32>>{return xs.map(fn(x)=>vec3(popcount(x),leading_zeros(x),trailing_zeros(x)));}
pub fn signed_stats(x:i32)->Vec3<u32>{return vec3(popcount(x),leading_zeros(x),trailing_zeros(x));}
pub fn word32_stats(x:u32)->Vec3<u32>{return vec3(popcount(x),leading_zeros(x),trailing_zeros(x));}
pub fn byte_len(s:String)->u32{return string_byte_len(s);}
pub fn byte(s:String,i:u32)->Option<u32>{return string_byte_at(s,i);}
pub fn substring(s:String,a:u32,b:u32)->Option<String>{return string_slice(s,a,b);}
pub fn joined(a:String,b:String)->String{return string_concat(a,b);}
pub fn locate(s:String,n:String,a:u32)->Option<u32>{return string_find(s,n,a);}

module exact_f32_patterns;
pub fn roundtrip(x:f32)->f32{return f32_from_bits(f32_bits(x));}
pub fn raw_roundtrip(raw:u32)->u32{return f32_bits(f32_from_bits(raw));}
pub fn twice(x:f32)->f32{return -(-x);}
pub fn nan_neg(x:f32)->Bool{return is_nan(-x);}
pub fn finite_neg(x:f32)->Bool{return is_finite(-x);}
pub fn neg_bits(x:f32)->u32{return f32_bits(-x);}
pub fn neg_raw(raw:u32)->f32{return -f32_from_bits(raw);}
pub fn nan_raw(raw:u32)->Bool{return is_nan(f32_from_bits(raw));}
pub fn finite_raw(raw:u32)->Bool{return is_finite(f32_from_bits(raw));}
pub fn self_eq(x:f32)->Bool{return x==x;}
pub fn self_ne(x:f32)->Bool{return x!=x;}
pub fn self_lt(x:f32)->Bool{return x<x;}
pub fn self_gt(x:f32)->Bool{return x>x;}
pub fn self_le(x:f32)->Bool{return x<=x;}
pub fn self_ge(x:f32)->Bool{return x>=x;}
pub fn copied(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>f32_from_bits(f32_bits(x)));}
pub fn classes(xs:List<f32>)->List<u32>{return xs.map(fn(x)=>choose(is_nan(-x),1,choose(is_finite(-x),2,3)));}
fn expensive(x:f32)->f32{return repeat(1000,x,fn(i)=>fn(a)=>a);}
pub fn observed(x:f32)->Bool{return expensive(x)<expensive(x);}

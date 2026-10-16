module exact_float_copy;
pub fn copied(xs:List<f32>,cohort:u32)->List<f32>{return xs.map(fn(x)=>f32_from_bits(f32_bits(x)));}

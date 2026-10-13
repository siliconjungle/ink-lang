module automatic_correctness;
pub fn run(xs:List<u32>,n:u32)->List<u32>{return xs.map(fn(x)=>x*13+7).take(n);}
pub fn ordered(xs:List<f32>)->f32{return foldl(xs,0.0,fn(x)=>fn(a)=>a+x);}
pub fn require_nonzero(x:u32)->Result<u32,String>{if x==0{return Err("zero");}return Ok(x);}

module OrderedEnergy;
pub fn run(xs:List<f32>)->f32{return foldl(xs.map(fn(x)=>x*x),0.0,fn(x)=>fn(a)=>a+x);}

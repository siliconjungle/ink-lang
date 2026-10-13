module reserved; pub fn run(xs:List<f32>,cut:f32)->f32{return foldl(xs.filter(fn(x)=>x<cut).map(fn(x)=>x*0.5),0.0,fn(x)=>fn(a)=>a+x);}

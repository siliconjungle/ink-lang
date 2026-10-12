module frozen_software;

pub fn run(xs:List<u32>,cut:u32)->Bool{return foldl(xs,true,fn(x)=>fn(a)=>a && x<cut);}

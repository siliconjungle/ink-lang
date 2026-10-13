module OrderedMask;
pub fn run(xs:List<u32>,cut:u32)->u32{return foldl(xs.filter(fn(x)=>x>=cut).map(fn(x)=>x*13+7),19,fn(x)=>fn(a)=>x-a);}

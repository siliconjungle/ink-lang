module reserved; pub fn run(xs:List<List<u32>>,cut:u32)->Bool{return foldl(xs.map(fn(x)=>foldl(x,true,fn(v)=>fn(a)=>a && v<cut)),true,fn(x)=>fn(a)=>a && x);}

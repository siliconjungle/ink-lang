module AlertQuery;
record Reading { value:u32,valid:Bool,channel:u32, }
pub fn run(xs:List<Reading>,cut:u32)->Bool{return foldl(xs.filter(fn(x)=>x.valid).map(fn(x)=>x.value>cut),false,fn(x)=>fn(a)=>a || x);}

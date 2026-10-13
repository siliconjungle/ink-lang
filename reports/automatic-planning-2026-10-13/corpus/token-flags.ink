module reserved; record Token { kind:u32,flag:Bool, } pub fn run(xs:List<Token>,key:u32)->Bool{return foldl(xs.filter(fn(x)=>x.flag).map(fn(x)=>x.kind==key),false,fn(x)=>fn(a)=>a || x);}

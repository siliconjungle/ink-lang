module separate_development;
fn any(xs:List<u32>)->Bool{return foldl(xs,false,fn(x)=>fn(a)=>a || x>16);}
fn every(xs:List<u32>)->Bool{return foldl(xs,true,fn(x)=>fn(a)=>a && x<16);}
fn controlled(xs:List<u32>)->u32{return fold_until(xs.filter(fn(x)=>x>3).map(fn(x)=>x*17+3),0,fn(x)=>fn(a)=>x>4096,fn(x)=>fn(a)=>x-a);}

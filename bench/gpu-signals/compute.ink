module GpuSignals;
fn cheap(xs:List<u32>)->u32 {return sum(xs.map(fn(x)=>x*17+1));}
fn heavy(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>repeat(512,x,fn(i)=>fn(v)=>v*1664525+1013904223+i+rem_or(v,251,0)*v));}
fn total(xs:List<u32>)->u32 {return sum(xs);}
fn step(xs:List<u32>,n:u32)->List<u32> {return xs.map_indexed(fn(index)=>fn(x)=>repeat(64,x+xs.at_or(rem_or(index+1,n,0),0),fn(i)=>fn(v)=>v*1664525+1013904223+i+rem_or(v,251,0)*v));}
fn affine(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>x*17+1);}

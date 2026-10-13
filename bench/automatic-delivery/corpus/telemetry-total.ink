module TelemetryTotal;
record Reading { value:u32,valid:Bool,channel:u32, }
pub fn run(xs:List<Reading>)->u32{return foldl(xs.filter(fn(x)=>x.valid).map(fn(x)=>x.value),0,fn(x)=>fn(a)=>a+x);}

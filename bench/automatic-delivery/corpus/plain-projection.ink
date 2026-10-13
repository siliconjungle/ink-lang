module PlainProjection;
record Reading { value:u32,valid:Bool,channel:u32, }
pub fn run(xs:List<Reading>)->List<u32>{return xs.map(fn(x)=>x.channel);}

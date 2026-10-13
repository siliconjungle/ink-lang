module SelectionMode;pub fn run(xs:List<u32>,mode:Bool)->List<u32>{return xs.filter(fn(x)=>choose(mode,x>100,x<50));}

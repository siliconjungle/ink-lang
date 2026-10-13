module VisibleCount;
record Layer { id:u32,opacity:u32,visible:Bool,label:String, }
pub fn run(xs:List<Layer>,cut:u32)->u32{return length(xs.filter(fn(x)=>x.visible && x.opacity>=cut).map(fn(x)=>x.id));}

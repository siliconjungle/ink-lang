module RowUpdate;
record Layer { id:u32,opacity:u32,visible:Bool,label:String, }
pub fn run(xs:List<Layer>,delta:u32)->List<Layer>{return xs.map(fn(x)=>Layer{id:x.id,opacity:choose(x.visible,x.opacity+delta,x.opacity),visible:x.visible,label:x.label});}

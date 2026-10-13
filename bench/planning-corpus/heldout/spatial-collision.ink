module frozen_software;
record Box { minX:u32,minY:u32,maxX:u32,maxY:u32, }
fn intersects(a:Box,b:Box)->Bool {return a.minX<=b.maxX && a.minY<=b.maxY && a.maxX>=b.minX && a.maxY>=b.minY;}
pub fn run(xs:List<Box>,q:Box)->Bool{return foldl(xs,false,fn(x)=>fn(a)=>a || intersects(x,q));}

module frozen_software;
fn contains(xs:List<u32>,x:u32)->Bool {return foldl(xs,false,fn(y)=>fn(a)=>a || y==x);}
pub fn run(xs:List<u32>,target:u32)->Bool{return contains(xs,target);}

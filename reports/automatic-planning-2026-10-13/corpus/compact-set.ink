module frozen_software;
fn contains(xs:List<u32>,x:u32)->Bool {return foldl(xs,false,fn(y)=>fn(a)=>a || y==x);}
pub fn run(xs:List<u32>,unused:u32)->List<u32>{var out:List<u32>=[];for x in xs {if !contains(out,x){out=out.concat([x]);}}return out;}

module frozen_software;
record DistinctState { seen:Bool,last:u32,output:List<u32>, }
pub fn run(xs:List<u32>,unused:u32)->List<u32>{return foldl(xs,DistinctState{seen:false,last:0,output:[]},fn(x)=>fn(a)=>choose(!a.seen || a.last!=x,DistinctState{seen:true,last:x,output:a.output.concat([x])},a)).output;}

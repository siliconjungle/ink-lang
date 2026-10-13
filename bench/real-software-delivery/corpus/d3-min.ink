module D3Min;
record Extremum { valid:Bool,value:u32, }
pub fn run(xs:List<u32>)->Extremum{return foldl(xs,Extremum{valid:false,value:0},fn(x)=>fn(a)=>choose(!a.valid || a.value>x,Extremum{valid:true,value:x},a));}

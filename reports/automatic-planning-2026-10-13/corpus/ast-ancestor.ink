module frozen_software;
record Node { key:u32,label:String,active:Bool, }
pub fn run(xs:List<Node>,cut:u32)->String{return foldr(xs,"missing",fn(x)=>fn(a)=>choose(x.key==cut,x.label,a));}

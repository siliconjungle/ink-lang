module frozen_software;
record TextState { count:u32,previous:u32, }
pub fn run(xs:List<u32>,unused:u32)->TextState{return foldl(xs,TextState{count:0,previous:0},fn(x)=>fn(a)=>TextState{count:a.count+choose(x==13 || (x==10 && a.previous!=13),1,0),previous:x});}

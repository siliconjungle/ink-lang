module TextLength;
pub fn run(xs:List<String>)->i32{return foldl(xs,-1,fn(line)=>fn(a)=>a+line.length()+1);}

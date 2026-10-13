module UnicodeQuery;
pub fn run(xs:List<String>,target:String)->Bool{return foldl(xs,false,fn(x)=>fn(a)=>a || x==target);}

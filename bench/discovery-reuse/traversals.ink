module TraversalElimination;
record Row{key:u32,label:String,flag:Bool,}
pub fn visible(xs:List<Row>)->List<Row>{return xs.filter(fn(x)=>true);}
pub fn discarded(xs:List<Row>)->List<Row>{return xs.filter(fn(x)=>false);}
pub fn keep_left(xs:List<Row>,seed:String)->String{return foldl(xs,seed,fn(x)=>fn(acc)=>acc);}
pub fn keep_right(xs:List<Row>,seed:u64)->u64{return foldr(xs,seed,fn(x)=>fn(acc)=>acc);}
pub fn combined_count(xs:List<Row>,ys:List<Row>)->u64{return count(xs.concat(ys));}
pub fn combined_length(xs:List<Row>,ys:List<Row>)->u32{return length(xs.concat(ys));}

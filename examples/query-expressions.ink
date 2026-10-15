module query_expressions;

record Pair{left:u32,right:u32,}

fn filtered(xs:List<u32>,threshold:u32,offset:u32)->List<u32>{
 return list<u32>{from x in xs;where x>=threshold;select x*3+offset;};
}
fn pipeline(xs:List<u32>,threshold:u32,offset:u32)->List<u32>{
 return xs.filter(fn(x)=>x>=threshold).map(fn(x)=>x*3+offset);
}
fn manual(xs:List<u32>,threshold:u32,offset:u32)->List<u32>{
 var output:Buffer<u32>=Buffer.empty();
 for x in xs{if x>=threshold{output=output.push(x*3+offset);}}
 return output.freeze();
}
fn joined(xs:List<u32>,ys:List<u32>)->List<Pair>{
 return list<Pair>{from x in xs;join y in ys on x==y;select Pair{left:x,right:y};};
}
fn manual_join(xs:List<u32>,ys:List<u32>)->List<Pair>{
 var output:Buffer<Pair>=Buffer.empty();
 for x in xs{for y in ys{if x==y{output=output.push(Pair{left:x,right:y});}}}
 return output.freeze();
}
fn lateral(xs:List<u32>)->List<u32>{
 return list<u32>{from x in xs;where x>0;from y in [x,x+1];select x*10+y;};
}
fn intersects(xs:List<u32>,ys:List<u32>)->Bool{
 return exists{from x in xs;join y in ys on x==y;};
}
fn contains(xs:List<u32>,target:u32)->Bool{
 return exists{from x in xs;select x==target;};
}
fn manual_contains(xs:List<u32>,target:u32)->Bool{
 return repeat_until(length(xs),false,fn(found)=>found,fn(i,found)=>xs.at_or(i,0)==target);
}
fn copied<T>(xs:List<T>)->List<T>{return list<T>{from x in xs;select x;};}
fn float_bits()->List<u32>{
 let xs:List<f32>=[f32_from_bits(2147483648),f32_from_bits(2143289345),f32_from_bits(1)];
 return copied<f32>(xs).map(fn(x)=>f32_bits(x));
}
// An independent numerical kernel exercises actual eligible GPU dispatch in
// conformance. Dynamic query collection uses the existing compiled CPU fallback.
fn scaled(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x*3+1);}

private state Trace:List<u32>=[];
event Seen:u32;
enum Error{Aborted,}
change input(tag:u32,empty:Bool)->List<u32> reads(Trace) writes(Trace) emits(Seen){
 Trace=Trace.concat([tag]);emit Seen(tag);return choose(empty,[],[tag,tag]);
}
change run(empty:Bool,abort:Bool)->Result<List<u32>,Error> reads(Trace) writes(Trace) emits(Seen){
 let output=list<u32>{from x in input(1,empty);join y in input(2,false) on true;select x*10+y;};
 if abort{return Err(Error.Aborted);}
 return Ok(output);
}
query trace()->List<u32> reads(Trace){return Trace;}

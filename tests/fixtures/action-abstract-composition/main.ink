module action_abstract_composition;
import "../abstract-interfaces/library.ink" as lib;
private state Values:List<lib.Hidden<u32>>=[];
event Seen:u32;
query items(xs:List<lib.Hidden<u32>>)->List<u32>{return xs.map(fn(v)=>lib.observe<u32>(v));}
query current()->List<u32> reads(Values){return Values.map(fn(v)=>lib.observe<u32>(v));}
query maybe(v:Option<lib.Hidden<u32>>)->u32{return v.fold(fn(x)=>lib.observe<u32>(x),fn(_)=>0);}
query either(v:Result<lib.Hidden<u32>,lib.Hidden<u32>>)->u32{return v.fold(fn(x)=>lib.observe<u32>(x),fn(x)=>lib.observe<u32>(x));}
change store(xs:List<lib.Hidden<u32>>)->Result<Unit,String> writes(Values) emits(Seen){
 Values=xs;emit Seen(sum(xs.map(fn(v)=>lib.observe<u32>(v))));return Ok(());
}
change abort(xs:List<lib.Hidden<u32>>)->Result<Unit,String> writes(Values) emits(Seen){
 Values=xs;emit Seen(sum(xs.map(fn(v)=>lib.observe<u32>(v))));return Err("stop");
}

fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}

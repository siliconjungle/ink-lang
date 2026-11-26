module action_callbacks;
refined record Checked { item:u32, valid:Bool, } invariant value.valid;
fn observe(v:Checked)->u32{return v.item;}
private state Values:List<Checked>=[];
event Seen:u32;
query items(xs:List<Checked>)->List<u32>{return xs.map(fn(v)=>observe(v));}
query current()->List<u32> reads(Values){return Values.map(fn(v)=>observe(v));}
query maybe(v:Option<Checked>)->u32{return v.fold(fn(x)=>observe(x),fn(_)=>0);}
query either(v:Result<Checked,Checked>)->u32{return v.fold(fn(x)=>observe(x),fn(x)=>observe(x));}
change store(xs:List<Checked>)->Result<Unit,String> writes(Values) emits(Seen){
 Values=xs;emit Seen(sum(xs.map(fn(v)=>observe(v))));return Ok(());
}
change abort(xs:List<Checked>)->Result<Unit,String> writes(Values) emits(Seen){
 Values=xs;emit Seen(sum(xs.map(fn(v)=>observe(v))));return Err("stop");
}

module f32_representation;
enum Error{Failed,}
record Row{value:f32,active:Bool,}
state Rows:Table<u64,Row> = Table.empty();
keep total:f32 = sum(Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.value));
event changed:f32;
change put(key:u64,value:f32,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){Rows.remove(key);Rows.insert(key,Row{value:value,active:active});emit changed(value);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}
query total_query()->f32 reads(total){return total;}
query add(a:f32,b:f32)->f32{return a+b;}
query sub(a:f32,b:f32)->f32{return a-b;}
query mul(a:f32,b:f32)->f32{return a*b;}
query neg(a:f32)->f32{return -a;}
query less(a:f32,b:f32)->Bool{return a<b;}
query equal(a:f32,b:f32)->Bool{return a==b;}
query multiply_add(a:f32,b:f32,c:f32)->f32{return a*b+c;}

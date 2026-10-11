module field_sensitive_point;
enum Error{Failed,}
record Row{value:u64,active:Bool,group:u64,}
fn value_of(row:Option<Row>)->u64{return row.fold(fn(value)=>value.value,fn(unit)=>0);}
fn group_of(row:Option<Row>)->u64{return row.fold(fn(value)=>value.group,fn(unit)=>0);}
state Rows:Table<u64,Row> = Table.empty();
event seen:u64;
change put(key:u64,value:u64,active:Bool,group:u64)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){Rows.replace(key,Row{value:value,active:active,group:group});}else{Rows.insert(key,Row{value:value,active:active,group:group});}
 emit seen(value);return Ok(());
}
change active(key:u64,flag:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){
  let value=value_of(Rows.get(key));
  let group=group_of(Rows.get(key));
  Rows.replace(key,Row{value:value,active:flag,group:group});
 }
 emit seen(key);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){Rows.remove(key);emit seen(key);if fail{return Err(Error.Failed);}return Ok(());}
query zero_field()->u64 reads(Rows){return value_of(Rows.get(0));}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}

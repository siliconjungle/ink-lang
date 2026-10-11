module point_delta;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
event seen:u64;
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}return Ok(());}
change replace_zero(value:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){if Rows.contains(0){Rows.replace(0,value);}else{return Err(Error.Failed);}emit seen(value);if fail{return Err(Error.Failed);}return Ok(());}
change erase_zero(fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){Rows.remove(0);Rows.remove(0);emit seen(0);if fail{return Err(Error.Failed);}return Ok(());}
query zero()->Option<u64> reads(Rows){return Rows.get(0);}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}

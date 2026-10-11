module grouped_state;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
change put(key:u64,value:u64,fail:Bool)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}if fail{return Err(Error.Failed);}return Ok(());}
change erase(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Ok(());}
query total(group:u64)->u64 reads(Rows){return sum(Rows.values().filter(fn(value)=>value==group));}

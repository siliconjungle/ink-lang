module representation_migrations;
enum Error{Failed,}
state Z:Table<u64,Bool> = Table.empty();
state Rows:Table<u64,u64> = Table.empty();
event seen:u64;
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}
 emit seen(value);return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 Rows.remove(key); Rows.remove(key);
 emit seen(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
query zero()->Option<u64> reads(Rows){return Rows.get(0);}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}

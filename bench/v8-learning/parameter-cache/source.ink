module parameter_cache;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
state Other:Table<u64,u64> = Table.empty();
event changed:u64;
change put(key:u64,value:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){
 Rows.remove(key);Rows.insert(key,value);emit changed(value);
 if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Ok(());}
change unrelated(key:u64,value:u64)->Result<Unit,Error> writes(Other){Other.remove(key);Other.insert(key,value);return Ok(());}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}
query score(cut:u64,include:Bool)->u64 reads(Rows){return sum(Rows.values().filter(fn(v)=>include && v>cut));}
query four(a:u64,b:Bool,c:u64,d:Bool)->u64 reads(Rows){return sum(Rows.values().filter(fn(v)=>b && d && v>a+c));}
query zero()->Option<u64> reads(Rows){return Rows.get(0);}

module frontier_flags;
enum Error{Failed,}
record Row{value:u64,active:Bool,visible:Bool,selected:Bool,}
state Rows:Table<i32,Row> = Table.empty();
event seen:Row;
change put(key:i32,value:u64,active:Bool,visible:Bool,selected:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 let row=Row{value:value,active:active,visible:visible,selected:selected};
 if Rows.contains(key){Rows.replace(key,row);}else{Rows.insert(key,row);}
 emit seen(row);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:i32,fail:Bool)->Result<Unit,Error> writes(Rows){Rows.remove(key);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:i32)->Option<Row> reads(Rows){return Rows.get(key);}
query rows()->List<Row> reads(Rows){return Rows.values();}

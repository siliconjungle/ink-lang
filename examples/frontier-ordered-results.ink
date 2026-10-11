module frontier_ordered;
enum Error{Failed,}
record Row{amount:u64,active:Bool,}
state Rows:Table<u64,Row> = Table.empty();
event seen:u64;
change put(key:u64,amount:u64,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 let row=Row{amount:amount,active:active};
 if Rows.contains(key){Rows.replace(key,row);}else{Rows.insert(key,row);}
 emit seen(amount);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows){Rows.remove(key);if fail{return Err(Error.Failed);}return Ok(());}
query active()->List<u64> reads(Rows){return Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.amount+17);}
query all()->List<u64> reads(Rows){return Rows.values().map(fn(row)=>row.amount);}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}

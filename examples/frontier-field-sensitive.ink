module frontier_dependencies;
enum Error{Failed,}
record Row{amount:u64,label:u64,}
state Rows:Table<u64,Row> = Table.empty();
event seen:u64;
change put(amount:u64,label:u64)->Result<Unit,Error> writes(Rows){Rows.remove(0);Rows.insert(0,Row{amount:amount,label:label});return Ok(());}
change label(value:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 let old=Rows.get(0).unwrap_or(Row{amount:0,label:0});
 if Rows.contains(0){Rows.replace(0,Row{amount:old.amount,label:value});}
 emit seen(value);if fail{return Err(Error.Failed);}return Ok(());
}
change amount(value:u64)->Result<Unit,Error> writes(Rows){
 let old=Rows.get(0).unwrap_or(Row{amount:0,label:0});
 if Rows.contains(0){Rows.replace(0,Row{amount:value,label:old.label});}return Ok(());
}
query cached()->Option<u64> reads(Rows){return Rows.get(0).map(fn(row)=>row.amount);}
query row()->Option<Row> reads(Rows){return Rows.get(0);}

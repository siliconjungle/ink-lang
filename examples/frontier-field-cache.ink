module frontier_fields;
enum Error{Failed,}
record Row{amount:u64,label:u64,}
state Rows:Table<u64,Row> =Table.empty();
event seen:Row;
change put(key:u64,amount:u64,label:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
    let row=Row{amount:amount,label:label};
    if Rows.contains(key){Rows.replace(key,row);}else{Rows.insert(key,row);}
    emit seen(row);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows){Rows.remove(key);if fail{return Err(Error.Failed);}return Ok(());}
query amount()->Option<u64> reads(Rows){return Rows.get(0).map(fn(row)=>row.amount);}
query biased(bias:u64)->Option<u64> reads(Rows){return Rows.get(0).map(fn(row)=>row.amount+bias);}
query row(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}

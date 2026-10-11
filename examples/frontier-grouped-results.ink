module frontier_grouped;
enum Error{Failed,}
record Row{amount:u64,group:u64,}
record Groups{zero:u64,one:u64,other:u64,count:u64,}
state Rows:Table<u64,Row> = Table.empty();
keep zero:u64 = sum(Rows.values().filter(fn(row)=>row.group==0).map(fn(row)=>row.amount));
keep one:u64 = sum(Rows.values().filter(fn(row)=>row.group==1).map(fn(row)=>row.amount));
keep other:u64 = sum(Rows.values().filter(fn(row)=>row.group>1).map(fn(row)=>row.amount));
keep group_count:u64 = sum(Rows.values().filter(fn(row)=>row.group==0).map(fn(row)=>row.amount*0+1));
event seen:u64;
change put(key:u64,amount:u64,group:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 let row=Row{amount:amount,group:group};
 if Rows.contains(key){Rows.replace(key,row);}else{Rows.insert(key,row);}
 emit seen(amount);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows){Rows.remove(key);if fail{return Err(Error.Failed);}return Ok(());}
query groups()->Groups reads(zero,one,other,group_count){return Groups{zero:zero,one:one,other:other,count:group_count};}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}

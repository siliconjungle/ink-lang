module filtered_aggregate;
enum Error{Failed,}
record Row{value:u64,active:Bool,}
state Rows:Table<u64,Row> = Table.empty();
keep total:u64 = sum(Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.value));
keep size:u64 = sum(Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.value*0+1));
event seen:u64;
change put(key:u64,value:u64,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){Rows.replace(key,Row{value:value,active:active});}else{Rows.insert(key,Row{value:value,active:active});}
 emit seen(value);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){Rows.remove(key);emit seen(key);if fail{return Err(Error.Failed);}return Ok(());}
query total_query()->u64 reads(total){return total;}
query count_query()->u64 reads(size){return size;}

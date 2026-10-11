module transaction_benchmark;
state Rows:Table<u64,u64> = Table.empty();
state Selected:Table<u64,Unit> = Table.empty();
change batch(keys:List<u64>,values:List<u64>)->Result<Unit,String> writes(Rows){return Rows.put_many(keys,values);}
change put(key:u64,value:u64)->Result<Unit,String> writes(Rows){Rows.put(key,value);return Ok(());}
change fail(key:u64,value:u64)->Result<Unit,String> writes(Rows){Rows.put(key,value);return Err("rollback");}
query scan()->u64 reads(Rows){return Rows.sum_by(fn(value)=>value);}
query materialised()->u64 reads(Rows){return sum(Rows.values().map(fn(value)=>value));}

module signal_point;
state Rows:Table<u64,u64> = Table.empty();
change put(key:u64,value:u64)->Result<Unit,String> writes(Rows){Rows.put(key,value);return Ok(());}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}

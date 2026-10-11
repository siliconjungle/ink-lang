module membership_cache;
state Rows: Table<u64,u64> = Table.empty();
state Selected: Table<u64,Unit> = Table.empty();
state Unrelated: Table<u64,u64> = Table.empty();
change put(key:u64,value:u64)->Result<Unit,String> writes(Rows){Rows.put(key,value);return Ok(());}
change replace(key:u64,value:u64)->Result<Unit,String> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}return Ok(());}
change select(key:u64)->Result<Unit,String> writes(Selected){Selected.put(key,());return Ok(());}
change erase(key:u64)->Result<Unit,String> writes(Selected){Selected.remove(key);return Ok(());}
change unrelated(key:u64,value:u64)->Result<Unit,String> writes(Unrelated){Unrelated.put(key,value);return Ok(());}
query intersection()->List<u64> reads(Rows,Selected){return Rows.shared_keys(Selected);}

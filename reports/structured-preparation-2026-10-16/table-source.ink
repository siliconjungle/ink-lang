module structured_keeps;
id Key;
record Node { name:String, values:List<f32>, next:Option<Node>, }
record Prepared { rows:List<Node>, words:List<u64>, owner:Key, }
record Pair { before:Result<Prepared,String>, after:Result<Prepared,String>, }
state Rows:Table<u32,Node>=Table.empty();
state Metadata:Table<u32,Key>=Table.empty();
state Unrelated:Table<u32,u32>=Table.empty();
event changed:u32;
fn prepare(rows:List<Node>,owner:Key)->Result<Prepared,String> {
 if length(rows)==0 {return Err("no rows");}
 return Ok(Prepared{rows:rows.map(fn(row)=>Node{..row,name:string_concat(row.name," prepared")}),words:[0,18446744073709551615],owner:owner});
}
keep PreparedRows:Result<Prepared,String>=Metadata.get(0).fold(fn(owner)=>prepare(Rows.values(),owner),fn(u)=>Err("no owner"));
keep Names:List<String>=PreparedRows.fold(fn(p)=>p.rows.map(fn(row)=>row.name),fn(error)=>[]);
query value()->Result<Prepared,String> reads(PreparedRows){return PreparedRows;}
query names()->List<String> reads(Names){return Names;}
fn append(xs:List<String>)->List<String>{return xs.concat(["private append"]);}
query appended()->List<String> reads(Names){return append(Names);}
change put(key:u32,node:Node)->Result<Unit,String> writes(Rows) emits(changed) {Rows.put(key,node);emit changed(key);return Ok(());}
change owner(value:Key)->Result<Unit,String> writes(Metadata){Metadata.put(0,value);return Ok(());}
change unrelated(value:u32)->Result<Unit,String> writes(Unrelated){Unrelated.put(0,value);return Ok(());}
change peek_put(key:u32,node:Node)->Result<Pair,String> reads(PreparedRows) writes(Rows) emits(changed) {
 let before=PreparedRows;Rows.put(key,node);let after=PreparedRows;emit changed(key);return Ok(Pair{before:before,after:after});
}
change aborted(key:u32,node:Node)->Result<Unit,String> reads(PreparedRows) writes(Rows) emits(changed) {
 let before=PreparedRows;let changed=peek_put(key,node)?;let after=PreparedRows;return Err("rollback preparation");
}
change remove(key:u32)->Result<Unit,String> writes(Rows){Rows.remove(key);return Ok(());}
fn batch(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.5);}

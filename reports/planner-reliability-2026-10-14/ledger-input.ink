module maintained_ledger;
enum Error{Cancelled,}
record Entry{amount:u64,weight:u64,included:Bool,}
state Entries:Table<u64,Entry> = Table.empty();
state Other:Table<u64,Entry> = Table.empty();
keep weighted:u64 = sum(Entries.values().map(fn(e)=>e.amount*e.weight));
keep included:u64 = sum(Entries.values().filter(fn(e)=>e.included).map(fn(e)=>e.amount));
keep other:u64 = sum(Other.values().map(fn(e)=>e.amount));
event changed:u64;
change write(key:u64,entry:Entry,cancel:Bool)->Result<Unit,Error> writes(Entries) emits(changed){
 Entries.put(key,entry);emit changed(key);if cancel{return Err(Error.Cancelled);}return Ok(());
}
change write_other(key:u64,entry:Entry)->Unit writes(Other){Other.put(key,entry);return ();}
change two(key:u64,entry:Entry,cancel:Bool)->Result<Unit,Error> writes(Entries) emits(changed){
 write(key,entry,false);write(key+1,entry,cancel);return Ok(());
}
change erase(key:u64)->Unit writes(Entries){Entries.remove(key);return ();}
change observed(key:u64,entry:Entry,cancel:Bool)->Result<u64,Error> writes(Entries) reads(weighted){
 Entries.put(key,entry);let value:u64 = weighted;if cancel{return Err(Error.Cancelled);}return Ok(value);
}
query weight()->u64 reads(weighted){return weighted;}
query selected()->u64 reads(included){return included;}
query other_total()->u64 reads(other){return other;}
query rows()->List<Entry> reads(Entries){return Entries.values();}

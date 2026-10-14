module maintained_parity;
enum Error{Cancelled,}
record Entry{active:Bool,weight:u64,}
state Entries:Table<u64,Entry> = Table.empty();
fn odd(xs:List<Entry>)->Bool{return foldr(xs,false,fn(e)=>fn(acc)=>e.active!=acc);}
fn even(xs:List<Entry>)->Bool{return foldr(xs,true,fn(e)=>fn(acc)=>e.active!=acc);}
keep parity:Bool = odd(Entries.values());
keep even_parity:Bool = even(Entries.values());
keep weighted:u64 = sum(Entries.values().map(fn(e)=>e.weight));
event changed:u64;
change write(key:u64,entry:Entry,cancel:Bool)->Result<Unit,Error> writes(Entries) emits(changed){
 Entries.put(key,entry);emit changed(key);if cancel{return Err(Error.Cancelled);}return Ok(());
}
change erase(key:u64)->Unit writes(Entries){Entries.remove(key);return ();}
query odd_count()->Bool reads(parity){return parity;}
query even_count()->Bool reads(even_parity){return even_parity;}
query total()->u64 reads(weighted){return weighted;}

module frontier_scalar_chunks;
enum Error{Failed,}
record Row{words:List<u64>,flags:List<Bool>,}
state Rows:Table<u64,Row> =Table.empty();
event changed:List<Bool>;
change put(key:u64,words:List<u64>,flags:List<Bool>,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){
 Rows.remove(key);Rows.insert(key,Row{words:words,flags:flags});
 emit changed(flags);if fail{return Err(Error.Failed);}return Ok(());
}
query words(key:u64)->Option<List<u64>> reads(Rows){return Rows.get(key).map(fn(row)=>row.words);}
query flags(key:u64)->Option<List<Bool>> reads(Rows){return Rows.get(key).map(fn(row)=>row.flags);}
fn edit_flags(xs:List<Bool>,a:u32,b:u32,value:Bool)->List<Bool>{
 let work=buffer(xs);let work=work.swap(a,b);let work=work.set(a,value);return work.freeze();
}
fn fill_flags(n:u32,value:Bool)->List<Bool>{let work=buffer_fill(n,value);return work.freeze();}
query edited(xs:List<Bool>,a:u32,b:u32,value:Bool)->List<Bool>{return edit_flags(xs,a,b,value);}
query filled(n:u32,value:Bool)->List<Bool>{return fill_flags(n,value);}

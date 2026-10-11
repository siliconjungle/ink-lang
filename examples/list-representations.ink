module list_representation;
enum Error{Failed,}
state Rows:Table<u64,List<u64>> = Table.empty();
event seen:List<u64>;
fn sum_list(xs:List<u64>)->u64{return sum(xs);}
fn count_list(xs:List<u64>)->u64{return count(xs);}
change put(key:u64,value:List<u64>,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}emit seen(value);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u64)->Option<List<u64>> reads(Rows){return Rows.get(key);}
query total(xs:List<u64>)->u64{return sum_list(xs);}
query size(xs:List<u64>)->u64{return count_list(xs);}

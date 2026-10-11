module word32_representation;
enum Error{Failed,}
record Row{unsigned:u32,signed:i32,}
state Rows:Table<u64,Row> = Table.empty();
event changed:Row;
change put(key:u64,ua:u32,ub:u32,sa:i32,sb:i32,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){let row=Row{unsigned:ua+ub,signed:sa*sb};Rows.remove(key);Rows.insert(key,row);emit changed(row);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}
query unsigned_add(a:u32,b:u32)->u32{return a+b;}
query signed_sub(a:i32,b:i32)->i32{return a-b;}
query signed_less(a:i32,b:i32)->Bool{return a<b;}
query signed_neg(a:i32)->i32{return -a;}

fn quotient_value(a:i32,b:i32,f:i32)->i32{return quot_or(a,b,f);}
query quotient(a:i32,b:i32,f:i32)->i32{return quotient_value(a,b,f);}
fn remainder_value(a:i32,b:i32,f:i32)->i32{return rem_or(a,b,f);}
query remainder(a:i32,b:i32,f:i32)->i32{return remainder_value(a,b,f);}
fn unsigned_value(a:u64,b:u64,f:u64)->u64{return quot_or(a,b,f);}
query unsigned_quotient(a:u64,b:u64,f:u64)->u64{return unsigned_value(a,b,f);}

module pure_numerical_representation;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);Rows.insert(key,value);return Ok(());}
fn filtered(xs:List<u32>,threshold:u32,bias:u32)->u32{return sum(xs.filter(fn(x)=>x>threshold).map(fn(x)=>x+bias));}
fn folded(xs:List<u64>,initial:u64,m:u64)->u64{return foldr(xs,initial,fn(x)=>fn(acc)=>x+acc*m);}
fn negative(xs:List<i32>,bias:i32)->i32{return sum(xs.map(fn(x)=>-x+bias));}
query filtered_query(xs:List<u32>,threshold:u32,bias:u32)->u32{return filtered(xs,threshold,bias);}
query folded_query(xs:List<u64>,initial:u64,m:u64)->u64{return folded(xs,initial,m);}
query negative_query(xs:List<i32>,bias:i32)->i32{return negative(xs,bias);}

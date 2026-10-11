module exact_representation;
enum Error{Failed,}
record Row{value:Int,active:Bool,}
state Rows:Table<u64,Row> = Table.empty();
keep total:Int = sum(Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.value));
keep size:Int = count(Rows.values().filter(fn(row)=>row.active));
event seen:Int;
change put(key:u64,value:Int,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){if Rows.contains(key){Rows.replace(key,Row{value:value,active:active});}else{Rows.insert(key,Row{value:value,active:active});}emit seen(value);if fail{return Err(Error.Failed);}return Ok(());}
query total_query()->Int reads(total){return total;}
query count_query()->Int reads(size){return size;}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}
query addition(a:Int,b:Int)->Int{return a+b;}
query subtraction(a:Int,b:Int)->Int{return a-b;}
query multiplication(a:Int,b:Int)->Int{return a*b;}
query negative(a:Int)->Int{return -a;}
query less(a:Int,b:Int)->Bool{return a<b;}

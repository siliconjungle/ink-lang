module json_state_benchmark;
import "std:json" as json;
record Row { value:u32, active:Bool, metadata:json.Json, }
state Rows:Table<String,Row> = Table.empty();
event seen:u32;
enum Error { Failed, }
change put(key:String,row:Row,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen) {
 Rows.put(key,row);emit seen(row.value);if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:String,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen) {
 Rows.remove(key);emit seen(0);if fail{return Err(Error.Failed);}return Ok(());
}
query total()->u32 reads(Rows) { return sum(Rows.values().filter(fn(row)=>row.active).map(fn(row)=>row.value)); }
query row(key:String)->Option<Row> reads(Rows) { return Rows.get(key); }
fn set_document(document:json.Json,key:String,value:json.Json)->Result<json.Json,json.JsonError>{return json.set(document,key,value);}
fn identity(document:json.Json)->json.Json{return document;}

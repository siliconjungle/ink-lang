module collection_edits;
record Item { key:u32, value:f32, }
fn overwrite(xs:List<u32>,i:u32,a:u32,b:u32)->List<u32>{return buffer(xs).set(i,a).set(i,b).freeze();}
fn unchanged(xs:List<u32>,i:u32,a:u32)->List<u32>{return buffer(xs).set(i,xs.at_or(i,a)).freeze();}
fn truncate_twice(xs:List<u32>,i:u32)->List<u32>{return buffer(xs).truncate(i).truncate(i).freeze();}
fn unchanged_float(xs:List<f32>,i:u32,a:f32)->List<f32>{return buffer(xs).set(i,xs.at_or(i,a)).freeze();}
fn overwrite_record(xs:List<Item>,i:u32,a:Item,b:Item)->List<Item>{return buffer(xs).set(i,a).set(i,b).freeze();}
fn unchanged_string(xs:List<String>,i:u32,a:String)->List<String>{return buffer(xs).set(i,xs.at_or(i,a)).freeze();}
fn overwritten_work(xs:List<u32>,i:u32,b:u32)->List<u32>{return buffer(xs).set(i,foldr(xs,0,fn(x)=>fn(acc)=>x+acc)).set(i,b).freeze();}
query ready()->u32{return 1;}
enum Error { Failed, }
record Data { xs:List<u32>, }
state Rows:Table<u64,Data> = Table.empty();
event changed:List<u32>;
change put(xs:List<u32>,i:u32,a:u32,b:u32,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){
 let result=overwrite(xs,i,a,b);
 Rows.remove(0);Rows.insert(0,Data{xs:result});emit changed(result);
 if fail{return Err(Error.Failed);}return Ok(());
}
query get()->Option<Data> reads(Rows){return Rows.get(0);}

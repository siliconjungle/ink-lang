module boolean_aggregates;
enum Error { Failed, }
record Row { active:Bool, }
state Rows:Table<u64,Row> = Table.empty();
fn any_rows(rows:List<Row>)->Bool{return foldr(rows,false,fn(row)=>fn(found)=>row.active||found);}
fn all_rows(rows:List<Row>)->Bool{return foldr(rows,true,fn(row)=>fn(found)=>row.active&&found);}
keep any_active:Bool = any_rows(Rows.values());
keep all_active:Bool = all_rows(Rows.values());
event seen:u64;
change insert(key:u64,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){return Err(Error.Failed);}
 Rows.insert(key,Row{active:active});emit seen(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
change replace(key:u64,active:Bool,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){Rows.replace(key,Row{active:active});}else{return Err(Error.Failed);}emit seen(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 Rows.remove(key);emit seen(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
query any_query()->Bool reads(any_active){return any_active;}
query all_query()->Bool reads(all_active){return all_active;}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}

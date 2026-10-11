module general_indexed;
enum Error{Failed,Missing,}
enum Shade{Light,Dark,}
id Owner;
record Nested{label:String,shade:Shade,}
record Payload{value:u64,active:Bool,trail:List<u64>,maybe:Option<u64>,point:Vec2<f32>,signed:i32,exact:Int,label:String,owner:Owner,unsigned:u32,result:Result<u64,Error>,unit:Unit,nested:Option<Nested>,}
state Items:Table<u64,Payload> = Table.empty();
state Marks:Table<u64,u64> = Table.empty();
event seen:u64;
keep weighted:u64=sum(Items.values().filter(fn(row)=>row.active && row.value>3).map(fn(row)=>row.value*7+2));
fn any_values(xs:List<u64>)->Bool{return foldr(xs,false,fn(value)=>fn(acc)=>value>0 || acc);}
keep nonzero:Bool=any_values(Marks.values());
query weighted_query()->u64 reads(weighted){return weighted;}
query labelled()->u64 reads(Items){return sum(Items.values().filter(fn(row)=>row.label=="🧵 café").map(fn(row)=>row.value));}
query for_owner(owner:Owner)->u64 reads(Items){return sum(Items.values().filter(fn(row)=>row.owner==owner).map(fn(row)=>row.value));}
query any_mark()->Bool reads(nonzero){return nonzero;}
query dynamic(limit:u64)->u64 reads(Items){return sum(Items.values().filter(fn(row)=>row.value>limit).map(fn(row)=>row.value));}
query joined()->u64 reads(Items,Marks){return sum(Items.values().map(fn(row)=>row.value))+sum(Marks.values());}
query get(key:u64)->Option<Payload> reads(Items){return Items.get(key);}
change put(key:u64,row:Payload,mark:u64,fail:Bool)->Result<Unit,Error> writes(Items,Marks) emits(seen){
 if Items.contains(key){Items.replace(key,row);}else{Items.insert(key,row);}
 if Marks.contains(key){Marks.replace(key,mark);}else{Marks.insert(key,mark);}
 emit seen(mark);if fail{return Err(Error.Failed);}return Ok(());
}
change edits(first:u64,second:u64,value:u64,fail:Bool)->Result<u64,Error> writes(Marks) emits(seen){
 if Marks.contains(first){
 Marks.replace(first,value);let middle=Marks.get(first).ok_or(Error.Missing)?;
 if Marks.contains(second){Marks.replace(second,middle+1);}else{return Err(Error.Missing);}
 emit seen(middle);
 if fail{return Err(Error.Failed);}return Ok(middle);
 }return Err(Error.Missing);
}
change erase(first:u64,second:u64,fail:Bool)->Result<Unit,Error> writes(Items,Marks) emits(seen){
 Items.remove(first);Items.remove(second);Marks.remove(first);Marks.remove(second);
 emit seen(first);if fail{return Err(Error.Failed);}return Ok(());
}
change replace_remove(first:u64,second:u64,value:u64)->Result<Unit,Error> writes(Marks){
 if Marks.contains(first){Marks.replace(first,value);Marks.remove(second);return Ok(());}return Err(Error.Missing);
}
change remove_replace(first:u64,second:u64,value:u64)->Result<Unit,Error> writes(Marks){
 Marks.remove(first);if Marks.contains(second){Marks.replace(second,value);return Ok(());}return Err(Error.Missing);
}
query floating()->f32 reads(Items){return sum(Items.values().map(fn(row)=>row.point.x));}

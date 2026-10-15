module consumer_entry;
private state Counter:u32=1;
invariant Counter>0;
event Seen:u32;
spec fn guarded(x:u32,limit:u32)->u32 requires limit>0;ensures result==x;
implementation identity for guarded{return x;}
query rows(x:u32)->List<u32>{return [x];}
change repair(xs:List<u32>)->Result<Unit,String> writes(Counter) emits(Seen){
 Counter=0;Counter=2;let values=xs.map(fn(x)=>guarded(x,Counter));emit Seen(sum(values));return Ok(());
}
change repair_abort(xs:List<u32>)->Result<Unit,String> writes(Counter) emits(Seen){
 Counter=0;Counter=2;let values=xs.map(fn(x)=>guarded(x,Counter));emit Seen(sum(values));return Err("rollback");
}
change empty()->Result<Unit,String> writes(Counter){
 Counter=0;let xs:List<u32>=[];let values=xs.map(fn(x)=>guarded(x,Counter));Counter=1;return Ok(());
}
query captured()->List<u32>{let item:u32=7;return rows(item).map(fn(x)=>guarded(x,1));}
query current()->u32 reads(Counter){return Counter;}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}

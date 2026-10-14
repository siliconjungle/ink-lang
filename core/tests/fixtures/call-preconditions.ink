module call_preconditions;
private state Counter:u32=1;
event Changed:u32;
spec query take(x:u32)->u32 reads(Counter) requires x>0;requires Counter>0;ensures result==x;
implementation read for take{return x;}
spec query pair(a:u32,b:u32)->u32 reads(Counter) requires a==0;requires b==2;requires Counter==2;ensures result==a;
implementation first for pair{return a;}
change set(x:u32)->Result<u32,String> writes(Counter) emits(Changed){Counter=x;emit Changed(x);return Ok(x);}
change repaired()->Result<Unit,String> writes(Counter){
 Counter=0;Counter=1;let captured=take(1);return Err("rollback");
}
change arguments()->Result<Unit,String> writes(Counter) emits(Changed){
 let captured=pair(set(0)?,set(2)?);return Ok(());
}
query current()->u32 reads(Counter){return Counter;}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}

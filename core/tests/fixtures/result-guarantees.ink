module result_guarantees;
private state Counter:u32=1;
invariant Counter>0;
event Repaired:u32;
spec query positive()->u32 reads(Counter) ensures result>0;
implementation read for positive{return Counter;}
spec fn need(x:u32)->u32 requires x>0;ensures result==x;
implementation identity for need{return x;}
spec query echo(x:u32)->u32 requires x>0;ensures result>0;
implementation echo_body for echo{return x;}
spec change allocate(x:u32)->Result<u32,String> writes(Counter) requires x>0;
 ensures result.fold(fn(v)=>v>0,fn(e)=>true);
implementation allocate_body for allocate{Counter=1;return Ok(x);}
spec fn consume(v:Result<u32,String>)->u32 requires v.fold(fn(x)=>x>0,fn(e)=>true);ensures result==0;
implementation sink for consume{return 0;}
query safe_read()->u32 reads(Counter){let captured=positive();return need(captured);}
change safe_echo()->Result<Unit,String> writes(Counter){
 Counter=0;let captured=echo(1);let seen=need(captured);return Err("rollback");
}
change safe_change()->Result<Unit,String> writes(Counter){
 Counter=0;let captured=allocate(1);let seen=consume(captured);return Err("rollback");
}
change repair()->Result<Unit,String> writes(Counter) emits(Repaired){
 Counter=0;emit Repaired(0);Counter=1;let captured=positive();let seen=need(captured);emit Repaired(captured);return Err("rollback");
}
change repair_nested()->Result<Unit,String> writes(Counter) emits(Repaired){
 Counter=0;emit Repaired(0);let updated=allocate(1);let captured=positive();let seen=need(captured);emit Repaired(captured);return Err("rollback");
}
change repair_commit()->Result<Unit,String> writes(Counter) emits(Repaired){
 Counter=0;emit Repaired(0);Counter=2;let captured=positive();let seen=need(captured);emit Repaired(captured);return Ok(());
}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}

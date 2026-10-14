module guard_examples;
record Row{value:u32,}
fn masked(value:u64)->u64{return choose((value&255)>255,99,value&255);}
fn captured(xs:List<Row>)->List<u32>{return xs.map(fn(r)=>choose((r.value&15)<=15,r.value&15,99));}
fn unknown(value:u64)->u64{return choose(value<255,1,2);}
fn signed(value:i32)->i32{return choose(value<0,1,2);}
fn sum_values(values:List<u32>)->u32{return foldl(values,0,fn(value,n)=>value+n);}
enum Error{Rejected,}
private state Saved:List<u32>=[];
event total:u32;
change save(xs:List<Row>,reject:Bool)->Result<u32,Error> writes(Saved) emits(total){let values=captured(xs);Saved=values;let n=sum_values(values);emit total(n);return choose(reject,Err(Error.Rejected),Ok(n));}
query saved()->List<u32> reads(Saved){return Saved;}

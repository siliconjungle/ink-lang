module small_helpers;
record Owner{a:List<u32>,b:List<u32>,c:List<u32>,tag:u32,}
fn observed(s:Owner,amount:u32)->Owner{return Owner{a:s.a,b:s.b,c:s.c,tag:s.tag+amount};}
fn main(s:Owner,amount:u32)->u32{return observed(s,amount).tag+observed(s,amount+1).tag;}
fn callback(xs:List<Owner>,amount:u32)->List<u32>{return xs.map(fn(s)=>observed(s,amount).tag);}
record Mutable{left:Buffer<u32>,right:Buffer<u32>,tag:u32,pad:u32,}
record Tagged{owner:Mutable,value:u32,}
fn reading(s:Mutable)->Tagged{let value=s.tag;return Tagged{owner:s,value:value};}
fn owned_sum(xs:List<u32>)->u32{
 let owner=Mutable{left:buffer(xs),right:Buffer.empty(),tag:17,pad:0};
 let tagged=reading(owner);return tagged.value;
}
enum Error{Rejected,}
private state Saved:u32=0;
event total:u32;
change save(s:Owner,amount:u32,reject:Bool)->Result<u32,Error> writes(Saved) emits(total){
 Saved=main(s,amount);emit total(Saved);return choose(reject,Err(Error.Rejected),Ok(Saved));
}
query saved()->u32 reads(Saved){return Saved;}

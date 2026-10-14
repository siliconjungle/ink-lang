module caller;
import "library.ink" as lib;
fn make()->lib.Hidden<u32>{return lib.wrap<u32>(7);}
fn read(v:lib.Hidden<u32>)->u32{return lib.through<u32>(v,fn(x)=>lib.observe<u32>(x));}
fn mapped(v:lib.Hidden<u32>)->lib.Hidden<u32>{return lib.transform<u32>(v,fn(x)=>x+1);}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
private state Current:lib.Hidden<u32>=lib.wrap<u32>(0);
event Saved:lib.Hidden<u32>;
change set(v:lib.Hidden<u32>)->Result<Unit,String> writes(Current) emits(Saved){
 Current=v;
 emit Saved(v);
 return Ok(());
}
change abort(v:lib.Hidden<u32>)->Result<Unit,String> writes(Current) emits(Saved){
 Current=v;
 emit Saved(v);
 return Err("aborted");
}
query current()->u32 reads(Current){return lib.observe<u32>(Current);}

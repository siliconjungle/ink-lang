module ComposedState;
enum Error{Failed,}
state Marker:Table<u32,u32> = Table.empty();
event changed:u32;
change put(k:u32,v:u32,fail:Bool)->Result<Unit,Error> writes(Marker) emits(changed){
 if Marker.contains(k){Marker.replace(k,v);}else{Marker.insert(k,v);}
 emit changed(v);if fail{return Err(Error.Failed);}return Ok(());
}
query rows()->List<u32> reads(Marker){return Marker.values();}
pub fn f(xs:List<u32>,n:u32,cut:u32)->u64 {
 return count(xs.take(n).concat(xs.drop(n)).filter(fn(x)=>x>=cut));
}

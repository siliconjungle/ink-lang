module DatabaseAlgorithms;
enum Error{Failed,}
state Marker:Table<u32,u32> = Table.empty();
event changed:u32;
change put(k:u32,v:u32,fail:Bool)->Result<Unit,Error> writes(Marker) emits(changed){if Marker.contains(k){Marker.replace(k,v);}else{Marker.insert(k,v);}emit changed(v);if fail{return Err(Error.Failed);}return Ok(());}
query rows()->List<u32> reads(Marker){return Marker.values();}
pub fn map_words(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x);}
pub fn map_words_again(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x);}
pub fn map_strings(xs:List<String>)->List<String>{return xs.map(fn(x)=>x);}
pub fn partition(xs:List<Bool>,n:u32)->List<Bool>{return xs.take(n).concat(xs.drop(n));}
pub fn qualifying(xs:List<u32>,cut:u32)->u64{return count(xs.filter(fn(x)=>x>=cut));}
pub fn numeric(xs:List<u32>,scale:u32)->List<u32>{return xs.map(fn(x)=>x*scale+scale);}
pub fn signed(x:i32,scale:i32)->i32{return x*scale+scale;}
pub fn concatenate(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.concat(ys);}

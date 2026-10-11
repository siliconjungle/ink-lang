module owned_collection_optimisation;
fn read_written(k:u64,x:u32,f:u32)->u32{let m:Map<u64,u32> = Map.empty();let m=m.set(k,x);return m.get_or(k,f);}
fn contains_written(k:i32,x:f32)->Bool{let m:Map<i32,f32> = Map.empty();let m=m.set(k,x);return m.contains(k);}
fn read_removed(k:u32,x:u32,f:u32)->u32{let m:Map<u32,u32> = Map.empty();let m=m.set(k,x);let m=m.remove(k);return m.get_or(k,f);}
fn push_length(xs:List<u32>,x:u32)->u32{return buffer(xs).push(x).len();}
fn no_iterations(xs:List<u32>)->List<u32>{let b=buffer(xs);let b=repeat_until(0,b,fn(b)=>false,fn(i)=>fn(b)=>b.push(i));return b.freeze();}
query ready()->u32{return 1;}

module resolved_parent_correspondence;
record Resolution{ends:Map<u64,u32>,parents:List<u32>,}
record Gathering{ends:Map<u64,u32>,parents:Buffer<u32>,}
record Split{map:Map<u64,u32>,values:Buffer<u32>,}
fn original_step(r:Gathering,p:u64)->Gathering{let value=r.ends.get_or(p,0);return Gathering{ends:r.ends,parents:r.parents.push(value)};}
fn shared_step(s:Split,p:u64)->Split{let value=s.map.get_or(p,0);return Split{map:s.map,values:s.values.push(value)};}
fn decode(s:Split)->Gathering{return Gathering{ends:s.map,parents:s.values};}
fn original(ends:Map<u64,u32>,parents:List<u64>)->Resolution{
 let r=foldl(parents,Gathering{ends:ends,parents:Buffer.empty()},fn(p,r)=>original_step(r,p));
 return Resolution{ends:r.ends,parents:r.parents.freeze()};
}
fn shared(ends:Map<u64,u32>,parents:List<u64>)->Resolution{
 let s=foldl(parents,Split{map:ends,values:Buffer.empty()},fn(p,s)=>shared_step(s,p));let r=decode(s);
 return Resolution{ends:r.ends,parents:r.parents.freeze()};
}
fn original_values(ends:Map<u64,u32>,parents:List<u64>)->List<u32>{return original(ends,parents).parents;}
fn shared_values(ends:Map<u64,u32>,parents:List<u64>)->List<u32>{return shared(ends,parents).parents;}

module preserved_map_resolution;
record State{ends:Map<u64,u32>,counter:u32,}
record Resolving{ends:Map<u64,u32>,values:Buffer<u32>,}
fn step(r:Resolving,p:u64)->Resolving{let value=r.ends.get_or(p,0);return Resolving{ends:r.ends,values:r.values.push(value)};}
fn values(s:State,parents:List<u64>)->List<u32>{let r=foldl(parents,Resolving{ends:s.ends,values:Buffer.empty()},fn(p,r)=>step(r,p));return r.values.freeze();}
fn changed(s:State)->State{return State{ends:s.ends,counter:s.counter+1};}
fn before(s:State,parents:List<u64>)->List<u32>{return values(s,parents);}
fn after(s:State,parents:List<u64>)->List<u32>{return values(changed(s),parents);}

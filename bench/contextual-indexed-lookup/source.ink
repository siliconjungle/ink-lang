module contextual_lookup;
record Request { key:u32,other:u32,enabled:Bool,probes:List<u32>, }
record Answer { key:u32,hit:Bool,other:Bool, }
fn records(keys:List<u32>,requests:List<Request>,indexed_table:u32,indexed_query:u32)->List<Answer>{
 return requests.map(fn(q)=>Answer{key:q.key+indexed_table,
  hit:foldr(keys,false,fn(item)=>fn(found)=>found||item==(q.key+indexed_query)),
  other:!foldr(keys,false,fn(item)=>fn(found)=>q.other==item||found)});
}
fn predicate(allowed:List<u32>,denied:List<u32>,requests:List<Request>)->List<Request>{
 return requests.filter(fn(q)=>q.enabled && foldl(allowed,false,fn(item)=>fn(found)=>item==q.key||found)
  && !foldl(denied,false,fn(item)=>fn(found)=>found||q.other==item));
}
fn nested(keys:List<u32>,requests:List<Request>)->List<List<Bool>>{
 return requests.map(fn(q)=>q.probes.map(fn(k)=>foldr(keys,false,fn(item)=>fn(found)=>(k+q.key)==item||found)));
}
fn correlated(requests:List<Request>)->List<Bool>{
 return requests.map(fn(q)=>foldr(q.probes,false,fn(item)=>fn(found)=>q.key==item||found));
}

module PreparedSums;
fn member(keys:List<u32>,q:u32)->Bool {
 let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return index.contains(q);
}
fn optional(keys:List<u32>,x:Option<u32>)->Bool {return x.fold(fn(q)=>member(keys,q),fn(u)=>false);}
fn mapped(keys:List<u32>,x:Result<u32,String>)->Result<Bool,String> {return x.map(fn(q)=>member(keys,q));}
fn errors(keys:List<u32>,x:Result<String,u32>)->Result<String,Bool> {return x.map_err(fn(q)=>member(keys,q));}
fn folded(keys:List<u32>,x:Result<u32,u32>)->Bool {return x.fold(fn(q)=>member(keys,q),fn(q)=>member(keys,q+1));}
fn nested(keys:List<u32>,x:Result<Option<u32>,Result<u32,String>>)->Result<List<Bool>,String> {
 return x.fold(fn(v)=>v.fold(fn(q)=>Ok([member(keys,q)]),fn(u)=>Ok([])),fn(e)=>e.map(fn(q)=>[member(keys,q)]));
}
fn payload(x:Option<List<u32>>,q:u32)->Bool {return x.fold(fn(keys)=>member(keys,q),fn(u)=>false);}
fn payload_forward(x:Option<List<u32>>,q:u32)->Bool {return payload(x,q);}
fn result_payload(x:Result<List<u32>,String>,q:u32)->Result<Bool,String> {return x.map(fn(keys)=>member(keys,q));}
fn result_forward(x:Result<List<u32>,String>,q:u32)->Result<Bool,String> {return result_payload(x,q);}
fn probe(q:u32)->u32 {let check:Map<u32,Bool>=foldr([q],Map.empty(),fn(k)=>fn(m)=>m.set(k,true));return choose(check.contains(q),q,q);}
fn receiver(q:u32)->Option<u32> {return Some(probe(q));}
fn receiver_work(keys:List<u32>,q:u32)->Bool {return receiver(q).fold(fn(q)=>member(keys,q),fn(u)=>false);}
fn with_default(keys:List<u32>,x:Option<u32>,q:u32)->Result<Bool,u32> {return x.ok_or(probe(q)).map(fn(q)=>member(keys,q));}
fn negative(xs:List<f64>,q:u32)->List<f64> {let negated=xs.map(fn(v)=>-v);return negated.concat([f64_from_u32(q)]);}
fn doubles(x:Option<List<f64>>,q:u32)->List<f64> {return x.fold(fn(xs)=>negative(xs,q),fn(u)=>[]);}
fn owned(keys:List<u32>,x:Option<u32>)->List<u32> {
 let owner:Buffer<u32>=buffer(keys);
 return x.fold(fn(q)=>owner.push(q),fn(u)=>owner.push(9)).freeze();
}
spec fn checked(keys:List<u32>,x:Option<u32>,allowed:Bool)->Bool requires allowed; ensures true;
implementation checked_body for checked {return optional(keys,x);}
record Context { keys:List<u32>, offset:u32, }
fn record_member(c:Context,q:u32)->Bool {
 let index:Map<u32,Bool>=foldr(c.keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return index.contains(q+c.offset);
}
fn mixed(keys:List<u32>,x:Option<u32>,offset:u32)->Bool {
 let c=Context{keys:keys,offset:offset};return x.fold(fn(q)=>record_member(c,q),fn(u)=>false);
}
fn scale(xs:List<f32>,weight:f32)->List<f32> {let base=xs.map(fn(x)=>-x);return base.map(fn(x)=>x*weight);}
fn weighted(x:Option<List<f32>>,weight:f32)->List<f32> {return x.map(fn(xs)=>scale(xs,weight)).fold(fn(xs)=>xs,fn(u)=>[]);}
fn scalar(value:f32,weight:f32)->f32 {let values=scale([value],weight);return values.at_or(0,0.0);}
fn float_result(x:Result<f32,Result<f32,String>>,weight:f32)->Result<f32,Result<f32,String>> {
 return x.map(fn(v)=>scalar(v,weight)).map_err(fn(e)=>e.map(fn(v)=>scalar(v,weight)));
}

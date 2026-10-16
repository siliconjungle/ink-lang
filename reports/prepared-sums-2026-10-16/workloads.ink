module prepared_sums;
record Row { key:u32, value:u32, }
fn pick(q:u32)->Result<u32,u32> {return choose(q<1024,Ok(q),Err(q));}
fn member(keys:List<u32>,q:u32)->Bool {
 let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(index)=>index.set(k,true));return index.contains(q);
}
fn member_choice(keys:List<u32>,q:u32)->Bool {return pick(q).fold(fn(v)=>member(keys,v),fn(v)=>member(keys,v));}
fn membership(keys:List<u32>,queries:List<u32>)->List<Bool> {return queries.map(fn(q)=>member_choice(keys,q));}
fn add_row(row:Row,index:Map<u32,u32>)->Map<u32,u32> {let previous=index.get_or(row.key,0);return index.set(row.key,previous+row.value);}
fn grouped(rows:List<Row>,q:u32)->u32 {
 let empty:Map<u32,u32>=Map.empty();let index=foldl(rows,empty,fn(row)=>fn(index)=>add_row(row,index));return index.get_or(q,0);
}
fn group_choice(rows:List<Row>,q:u32)->u32 {return pick(q).map(fn(v)=>grouped(rows,v)).map_err(fn(v)=>grouped(rows,v)).fold(fn(v)=>v,fn(v)=>v);}
fn aggregates(rows:List<Row>,queries:List<u32>)->List<u32> {return queries.map(fn(q)=>group_choice(rows,q));}
record Frame { index:u32, value:f32, }
fn coefficient(weights:List<f32>,index:u32,x:f32)->f32 {let prepared=weights.map(fn(w)=>w*w+0.25);return prepared.at_or(index,0.0)*x;}
fn coefficient_choice(weights:List<f32>,index:u32,x:f32)->f32 {
 let frame:Option<Frame>=choose(index<16,Some(Frame{index:index,value:x}),None);
 return frame.fold(fn(v)=>coefficient(weights,v.index,v.value),fn(u)=>coefficient(weights,index,x));
}
fn numeric(weights:List<f32>,xs:List<f32>)->List<f32> {return xs.map_indexed(fn(i)=>fn(x)=>coefficient_choice(weights,i,x));}

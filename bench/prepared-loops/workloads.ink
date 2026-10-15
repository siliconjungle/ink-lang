module prepared_loops;
record Row { key:u32, value:u32, }
fn member(keys:List<u32>,query:u32)->Bool {
 let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(key)=>fn(index)=>index.set(key,true));
 return index.contains(query);
}
fn membership(keys:List<u32>,queries:List<u32>)->List<Bool> {return queries.map(fn(query)=>member(keys,query));}
fn add_row(row:Row,index:Map<u32,u32>)->Map<u32,u32> {
 let previous=index.get_or(row.key,0);
 return index.set(row.key,previous+row.value);
}
fn grouped(rows:List<Row>,query:u32)->u32 {
 let empty:Map<u32,u32>=Map.empty();
 let index=foldl(rows,empty,fn(row)=>fn(index)=>add_row(row,index));
 return index.get_or(query,0);
}
fn aggregates(rows:List<Row>,queries:List<u32>)->List<u32> {return queries.map(fn(query)=>grouped(rows,query));}
fn coefficient(weights:List<f32>,index:u32,x:f32)->f32 {
 let prepared=weights.map(fn(w)=>w*w+0.25);
 return prepared.at_or(index,0.0)*x;
}
fn numeric(weights:List<f32>,xs:List<f32>)->List<f32> {return xs.map_indexed(fn(i)=>fn(x)=>coefficient(weights,i,x));}

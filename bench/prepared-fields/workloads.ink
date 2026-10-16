module prepared_fields;
record Row { key:u32, value:u32, }
record Member { keys:List<u32>, query:u32, }
fn member_context(keys:List<u32>,query:u32)->Member {return Member{keys:keys,query:query};}
fn member(c:Member)->Bool {
 let index:Map<u32,Bool>=foldr(c.keys,Map.empty(),fn(key)=>fn(index)=>index.set(key,true));
 return index.contains(c.query);
}
fn membership(keys:List<u32>,queries:List<u32>)->List<Bool> {return queries.map(fn(query)=>member(member_context(keys,query)));}
fn add_row(row:Row,index:Map<u32,u32>)->Map<u32,u32> {
 let previous=index.get_or(row.key,0);return index.set(row.key,previous+row.value);
}
record Group { rows:List<Row>, query:u32, }
fn grouped(c:Group)->u32 {
 let empty:Map<u32,u32>=Map.empty();
 let index=foldl(c.rows,empty,fn(row)=>fn(index)=>add_row(row,index));
 return index.get_or(c.query,0);
}
fn aggregates(rows:List<Row>,queries:List<u32>)->List<u32> {return queries.map(fn(query)=>grouped(Group{rows:rows,query:query}));}
record Coefficients { weights:List<f32>, index:u32, x:f32, }
fn coefficient(c:Coefficients)->f32 {
 let prepared=c.weights.map(fn(w)=>w*w+0.25);
 return prepared.at_or(c.index,0.0)*c.x;
}
fn numeric(weights:List<f32>,xs:List<f32>)->List<f32> {return xs.map_indexed(fn(i)=>fn(x)=>coefficient(Coefficients{weights:weights,index:i,x:x}));}

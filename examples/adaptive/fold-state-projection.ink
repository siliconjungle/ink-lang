module projected_graph;
record Work { values:Buffer<u32>, total:u32, }
fn step(item:u32,weight:u32,work:Work)->Work {
 let value=work.values.at_or(item,0)+weight;
 return Work{values:work.values.push(value),total:work.total+value};
}
fn evaluate(code:List<u32>,weight:u32,input:List<u32>)->List<u32> {
 let work=foldl(code,Work{values:buffer(input),total:0},fn(item)=>fn(work)=>step(item,weight,work));
 return work.values.freeze();
}
state Weight:Table<u64,u32>=Table.empty();
state Count:Table<u64,u32>=Table.empty();
event advanced:u32;
change retune(weight:u32)->Unit writes(Weight){Weight.put(0,weight);return ();}
query serve(code:List<u32>,input:List<u32>)->List<u32> reads(Weight){
 return evaluate(code,Weight.get(0).unwrap_or(1),input);
}
change frame(code:List<u32>,input:List<u32>,fail:Bool)->Result<List<u32>,String>
 reads(Weight,Count) writes(Count) emits(advanced){
 let n=Count.get(0).unwrap_or(0)+1;Count.put(0,n);emit advanced(n);
 let result=evaluate(code,Weight.get(0).unwrap_or(1),input);
 if fail{return Err("rollback");}return Ok(result);
}

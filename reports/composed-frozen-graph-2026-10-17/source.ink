module owned_graph;
enum Kind { Add, Multiply, }
record Node { kind:Kind, wire:u32, weight:u32, }
record Work { values:Buffer<f32>, total:f32, }
state Code:Table<u64,List<Node>>=Table.empty();
trainable state Weights:Table<u64,List<f32>>=Table.empty();
state Count:Table<u64,u32>=Table.empty();
event advanced:u32;
fn step(node:Node,weights:List<f32>,work:Work)->Work {
 let a=work.values.at_or(node.wire,0.0);let w=weights.at_or(node.weight,0.0);
 let value=match node.kind {Kind.Add=>a+w,Kind.Multiply=>a*w,};
 return Work{values:work.values.push(value),total:work.total+value};
}
fn evaluate(code:List<Node>,weights:List<f32>,input:List<f32>)->List<f32> {
 let work=foldl(code,Work{values:buffer(input),total:0.0},fn(node)=>fn(work)=>step(node,weights,work));
 return work.values.freeze();
}
learn change retune(weights:List<f32>)->Unit writes(Weights){Weights.put(0,weights);return ();}
query serve(input:List<f32>)->List<f32> reads(Code,Weights){return evaluate(Code.get(0).unwrap_or([]),Weights.get(0).unwrap_or([0.5,2.0]),input);}
change frame(input:List<f32>,fail:Bool)->Result<List<f32>,String> reads(Code,Weights,Count) writes(Count) emits(advanced){
 let n=Count.get(0).unwrap_or(0)+1;Count.put(0,n);emit advanced(n);
 let result=evaluate(Code.get(0).unwrap_or([]),Weights.get(0).unwrap_or([0.5,2.0]),input);
 if fail {return Err("rollback");}return Ok(result);
}

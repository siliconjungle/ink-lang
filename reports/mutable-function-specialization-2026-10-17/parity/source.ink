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
query serve(input:List<f32>)->List<f32> reads(Code,Weights){return adaptive(Code.get(0).unwrap_or([]),Weights.get(0).unwrap_or([0.5,2.0]),input);}
change frame(input:List<f32>,fail:Bool)->Result<List<f32>,String> reads(Code,Weights,Count) writes(Count) emits(advanced){
 let n=Count.get(0).unwrap_or(0)+1;Count.put(0,n);emit advanced(n);
 let result=adaptive(Code.get(0).unwrap_or([]),Weights.get(0).unwrap_or([0.5,2.0]),input);
 if fail {return Err("rollback");}return Ok(result);
}

fn chosen(weights:List<f32>,input:List<f32>)->List<f32>{return evaluate([Node{kind:Kind.Add,wire:0,weight:0},Node{kind:Kind.Multiply,wire:1,weight:1},Node{kind:Kind.Add,wire:2,weight:0},Node{kind:Kind.Multiply,wire:3,weight:1},Node{kind:Kind.Add,wire:4,weight:0},Node{kind:Kind.Multiply,wire:5,weight:1},Node{kind:Kind.Add,wire:6,weight:0},Node{kind:Kind.Multiply,wire:7,weight:1},Node{kind:Kind.Add,wire:8,weight:0},Node{kind:Kind.Multiply,wire:9,weight:1},Node{kind:Kind.Add,wire:10,weight:0},Node{kind:Kind.Multiply,wire:11,weight:1},Node{kind:Kind.Add,wire:12,weight:0},Node{kind:Kind.Multiply,wire:13,weight:1},Node{kind:Kind.Add,wire:14,weight:0},Node{kind:Kind.Multiply,wire:15,weight:1},Node{kind:Kind.Add,wire:16,weight:0},Node{kind:Kind.Multiply,wire:17,weight:1},Node{kind:Kind.Add,wire:18,weight:0},Node{kind:Kind.Multiply,wire:19,weight:1},Node{kind:Kind.Add,wire:20,weight:0},Node{kind:Kind.Multiply,wire:21,weight:1},Node{kind:Kind.Add,wire:22,weight:0},Node{kind:Kind.Multiply,wire:23,weight:1},Node{kind:Kind.Add,wire:24,weight:0},Node{kind:Kind.Multiply,wire:25,weight:1},Node{kind:Kind.Add,wire:26,weight:0},Node{kind:Kind.Multiply,wire:27,weight:1},Node{kind:Kind.Add,wire:28,weight:0},Node{kind:Kind.Multiply,wire:29,weight:1},Node{kind:Kind.Add,wire:30,weight:0},Node{kind:Kind.Multiply,wire:31,weight:1}],weights,input);}
fn adaptive(code:List<Node>,weights:List<f32>,input:List<f32>)->List<f32>{return choose(code==[Node{kind:Kind.Add,wire:0,weight:0},Node{kind:Kind.Multiply,wire:1,weight:1},Node{kind:Kind.Add,wire:2,weight:0},Node{kind:Kind.Multiply,wire:3,weight:1},Node{kind:Kind.Add,wire:4,weight:0},Node{kind:Kind.Multiply,wire:5,weight:1},Node{kind:Kind.Add,wire:6,weight:0},Node{kind:Kind.Multiply,wire:7,weight:1},Node{kind:Kind.Add,wire:8,weight:0},Node{kind:Kind.Multiply,wire:9,weight:1},Node{kind:Kind.Add,wire:10,weight:0},Node{kind:Kind.Multiply,wire:11,weight:1},Node{kind:Kind.Add,wire:12,weight:0},Node{kind:Kind.Multiply,wire:13,weight:1},Node{kind:Kind.Add,wire:14,weight:0},Node{kind:Kind.Multiply,wire:15,weight:1},Node{kind:Kind.Add,wire:16,weight:0},Node{kind:Kind.Multiply,wire:17,weight:1},Node{kind:Kind.Add,wire:18,weight:0},Node{kind:Kind.Multiply,wire:19,weight:1},Node{kind:Kind.Add,wire:20,weight:0},Node{kind:Kind.Multiply,wire:21,weight:1},Node{kind:Kind.Add,wire:22,weight:0},Node{kind:Kind.Multiply,wire:23,weight:1},Node{kind:Kind.Add,wire:24,weight:0},Node{kind:Kind.Multiply,wire:25,weight:1},Node{kind:Kind.Add,wire:26,weight:0},Node{kind:Kind.Multiply,wire:27,weight:1},Node{kind:Kind.Add,wire:28,weight:0},Node{kind:Kind.Multiply,wire:29,weight:1},Node{kind:Kind.Add,wire:30,weight:0},Node{kind:Kind.Multiply,wire:31,weight:1}],chosen(weights,input),evaluate(code,weights,input));}
change recode(code:List<Node>)->Unit writes(Code){Code.put(0,code);return ();}

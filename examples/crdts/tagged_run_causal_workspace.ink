module tagged_run_causal_workspace_examples;
import "../../knowledge/libraries/tagged_run_causal_workspace.ink" as causal;
import "../../knowledge/libraries/causal_ranges.ink" as original;
record Query{left:List<u32>,right:List<u32>,}
record Answer{removed:List<causal.Range>,added:List<causal.Range>,valid:Bool,}
record Copy{ranges:Buffer<causal.Range>,values:Buffer<causal.Range>,index:u32,}
record Batch{graph:causal.Graph,answers:Buffer<Answer>,}
fn copy_step(c:Copy)->Copy{
 let value=c.ranges.at_or(c.index,causal.Range{start:0,end:0});
 return Copy{..c,values:c.values.push(value),index:c.index+1};
}
fn copied(ranges:Buffer<causal.Range>)->Copy{
 let bound=ranges.len();
 return repeat_until(bound,Copy{ranges:ranges,values:Buffer.empty(),index:0},fn(c)=>false,fn(i,c)=>copy_step(c));
}
fn rolled(g:causal.Graph,rollover:Bool)->causal.Graph{return g;}
fn queried(b:Batch,q:Query,rollover:Bool)->Batch{
 let g=rolled(b.graph,rollover);
 let d=causal.difference(g,q.left,q.right);let valid=d.valid;
 let removed=copied(d.removed);let added=copied(d.added);
 let answer=Answer{removed:removed.values.freeze(),added:added.values.freeze(),valid:valid};
 return Batch{graph:causal.recycled(d.graph,removed.ranges,added.ranges),answers:b.answers.push(answer)};
}
fn built(parents:List<List<u32>>)->causal.Graph{
 var g:causal.Graph=causal.empty();for ps in parents{g=causal.append(g,ps);}return g;
}
fn queries(parents:List<List<u32>>,queries:List<Query>,rollover:Bool)->List<Answer>{
 var b:Batch=Batch{graph:built(parents),answers:Buffer.empty()};
 for q in queries{b=queried(b,q,rollover);}return b.answers.freeze();
}
record OldBatch{graph:original.Graph,answers:Buffer<Answer>,}
fn original_query(b:OldBatch,q:Query)->OldBatch{
 let d=original.difference(b.graph,q.left,q.right);let valid=d.valid;
 let removed=d.removed.freeze().map(fn(r)=>causal.Range{start:r.start,end:r.end});
 let added=d.added.freeze().map(fn(r)=>causal.Range{start:r.start,end:r.end});
 return OldBatch{graph:d.graph,answers:b.answers.push(Answer{removed:removed,added:added,valid:valid})};
}
fn original_built(parents:List<List<u32>>)->original.Graph{
 var g:original.Graph=original.empty();for ps in parents{g=original.append(g,ps);}return g;
}
fn scalar(parents:List<List<u32>>,queries:List<Query>)->List<Answer>{
 var b:OldBatch=OldBatch{graph:original_built(parents),answers:Buffer.empty()};
 for q in queries{b=original_query(b,q);}return b.answers.freeze();
}
fn progressive(parents:List<List<u32>>,rollover:Bool)->List<Answer>{
 var b:Batch=Batch{graph:causal.empty(),answers:Buffer.empty()};var previous:u32=0;
 for ps in parents{
  let g=causal.append(b.graph,ps);let current=g.next-1;
  b=queried(Batch{graph:g,answers:b.answers},Query{left:choose(previous==0,[],[previous]),right:[current]},rollover);
  previous=current;
 }
 return b.answers.freeze();
}

fn from_chain(count:u32,queries:List<Query>)->List<Answer>{
 var b:Batch=Batch{graph:causal.chain(count),answers:Buffer.empty()};
 for q in queries{b=queried(b,q,false);}return b.answers.freeze();
}

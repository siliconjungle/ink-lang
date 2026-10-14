module span_measure_examples;
import "../../knowledge/libraries/span_event_graph.ink" as spans;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/weighted_sequence.ink" as sequence;
record Checking{walker:spans.Walker,index:u32,valid:Bool,}
fn step(c:Checking)->Checking{
 let slot=c.index;let n=c.walker.engine.tree.nodes.at_or(slot,sequence.nil<u32>(0));
 let left=c.walker.engine.tree.nodes.at_or(n.left,sequence.nil<u32>(0));
 let right=c.walker.engine.tree.nodes.at_or(n.right,sequence.nil<u32>(0));
 let span=c.walker.engine.spans.at_or(slot,spans.nil());
 let ok=n.extent==span.length && n.weight==spans.weight(span)
  && n.size==left.size+right.size+n.extent && n.live==left.live+right.live+n.weight
  && (n.left==0 || left.parent==slot) && (n.right==0 || right.parent==slot);
 return Checking{..c,index:slot+1,valid:c.valid && ok};
}
fn checked(c:Checking)->Checking{
 let bound=c.walker.engine.tree.nodes.len();
 return repeat_until(bound,c,fn(c)=>c.index>=bound || !c.valid,fn(i,c)=>step(c));
}
fn after(c:Checking,change:batches.Change)->Checking{
 let w=spans.apply(c.walker,change);
 return checked(Checking{walker:w,index:1,valid:c.valid});
}
fn valid_measures(changes:List<batches.Change>)->Bool{
 let c=foldl(changes,Checking{walker:spans.empty(),index:1,valid:true},fn(change,c)=>after(c,change));
 return c.valid && c.walker.error==0 && c.walker.engine.error==0;
}

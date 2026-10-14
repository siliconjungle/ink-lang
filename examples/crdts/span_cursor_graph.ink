module span_cursor_graph_examples;
import "../../knowledge/libraries/span_cursor_event_graph.ink" as spans;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn materialize(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return spans.materialize(changes);}
fn scalar(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return batches.materialize(changes);}
fn walked(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return spans.walked(changes);}
fn metrics(changes:List<batches.Change>)->List<u32>{
 var w:spans.Walker=spans.empty();for c in changes{w=spans.apply(w,c);}
 let targets:u32=foldl(w.applied.freeze(),0,fn(xs,n)=>n+length(xs));
 return [w.graph.nodes.len(),w.engine.spans.len(),w.engine.payload.len(),w.ends.len(),targets];
}

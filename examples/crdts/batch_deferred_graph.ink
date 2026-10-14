module batch_deferred_graph_examples;
import "../../knowledge/libraries/checkpoint_batch_deferred_span_graph.ink" as spans;
import "../../knowledge/libraries/batch_deferred_event_graph.ink" as phases;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn materialize(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return phases.materialize(changes);}
fn scalar(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return batches.materialize(changes);}
fn walked(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return spans.walked(changes);}
fn metrics(changes:List<batches.Change>)->List<u32>{
 var w:spans.Walker=spans.empty();for c in changes{w=spans.apply(w,c);}
 let targets:u32=w.applied.values.len();
 return [w.graph.nodes.len(),w.engine.spans.len(),w.engine.payload.len(),w.ends.len(),targets];
}

fn small_phases(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return phases.materialize_with(changes,2);}

fn zero_phases(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return phases.materialize_with(changes,0);}
fn enabled(changes:List<batches.Change>,minimum:u32)->u32{let plan=phases.prepared(changes,minimum);return foldl(plan.fast,0,fn(marked,n)=>n+choose(marked,1,0));}

module batched_graph_examples;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as reference;
import "../../knowledge/libraries/native_event_graph.ink" as graph;
fn materialize(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return batches.materialize(changes);}
fn expand(changes:List<batches.Change>)->List<graph.Event>{return batches.expand(changes);}

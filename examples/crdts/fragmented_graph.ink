module fragmented_graph_examples;
import "../../knowledge/libraries/fragmented_event_graph.ink" as fragments;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/native_event_graph.ink" as graph;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn valid(changes:List<batches.Change>)->Bool{return fragments.fragmented(changes).valid;}
fn pieces(changes:List<batches.Change>)->List<batches.Change>{return fragments.fragmented(changes).changes;}
fn original_events(changes:List<batches.Change>)->List<graph.Event>{return batches.expand(changes);}
fn fragment_events(changes:List<batches.Change>)->List<graph.Event>{return batches.expand(fragments.fragmented(changes).changes);}
fn materialize(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return fragments.materialize(changes);}
fn scalar(changes:List<batches.Change>)->Result<List<u32>,reference.Error>{return batches.materialize(changes);}

module compact_graph_examples;
import "../../knowledge/libraries/compact_event_graph.ink" as graph;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn materialize(events:List<graph.Event>)->Result<List<u32>,reference.Error>{return graph.materialize(events);}
fn walked(events:List<graph.Event>)->Result<List<u32>,reference.Error>{return graph.walked(events);}

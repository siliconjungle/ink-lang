module event_graph_examples;
import "../../knowledge/libraries/event_graph_text.ink" as graph;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn materialize(events:List<graph.Event>)->Result<List<u32>,reference.Error>{return graph.materialize(events);}
fn walked(events:List<graph.Event>)->Result<List<u32>,reference.Error>{return graph.walked(events);}

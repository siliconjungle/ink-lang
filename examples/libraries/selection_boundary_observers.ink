module selection_boundary_observers;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as graph;
fn selected_engine(engine:graph.Engine,position:u32)->graph.Engine{return graph.selected(engine,position).engine;}
fn split_zero(engine:graph.Engine,slot:u32)->graph.Engine{return graph.split(engine,slot,0);}

module selected_engine_frame;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as graph;
fn selected_engine(engine:graph.Engine,position:u32)->graph.Engine{return graph.selected(engine,position).engine;}

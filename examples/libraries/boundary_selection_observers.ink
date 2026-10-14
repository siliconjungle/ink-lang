module boundary_selection_observers;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as base;
import "../../knowledge/libraries/boundary_selection.ink" as boundary;
fn original(engine:base.Engine,position:u32)->base.Located{return boundary.original(engine,position);}
fn reused(engine:base.Engine,position:u32)->base.Located{return boundary.reused(engine,position);}
fn selected_engine(engine:base.Engine,position:u32)->base.Engine{return base.selected(engine,position).engine;}
fn split_zero(engine:base.Engine,slot:u32)->base.Engine{return base.split(engine,slot,0);}

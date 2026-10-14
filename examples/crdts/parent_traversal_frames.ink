module parent_traversal_frames;
import "../../knowledge/libraries/resolved_parent_span_graph.ink" as ordinary;
import "../../knowledge/libraries/checkpoint_resolved_parent_span_graph.ink" as checkpoint;
fn retreat_step(x:ordinary.Walking)->ordinary.Walking{return ordinary.Walking{walker:ordinary.toggle_batch(x.walker,x.index-2,false),index:x.index-1};}
fn advance_step(x:ordinary.Walking)->ordinary.Walking{return ordinary.Walking{walker:ordinary.toggle_batch(x.walker,x.index-1,true),index:x.index+1};}
fn checkpoint_retreat_step(x:checkpoint.Walking)->checkpoint.Walking{return checkpoint.Walking{walker:checkpoint.toggle_batch(x.walker,x.index-2,false),index:x.index-1};}
fn checkpoint_advance_step(x:checkpoint.Walking)->checkpoint.Walking{return checkpoint.Walking{walker:checkpoint.toggle_batch(x.walker,x.index-1,true),index:x.index+1};}

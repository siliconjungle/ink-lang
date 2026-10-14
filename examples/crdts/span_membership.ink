module span_membership;
import "../../knowledge/libraries/refinement_span.ink" as span;
fn at_start(start:u64,length:u32)->Bool{return span.covers(start,length,start);}

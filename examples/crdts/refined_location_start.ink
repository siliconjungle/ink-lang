module refined_location_start;
import "../../knowledge/libraries/engine_pass_span_graph.ink" as base;
import "../../knowledge/libraries/refinement_span.ink" as membership;
fn hit(e:base.Engine,slot:u32)->Bool{let span=e.spans.at_or(slot,base.nil());return slot!=0 && slot<e.spans.len() && membership.covers(span.id,span.length,span.id);}
fn selected(e:base.Engine,slot:u32)->base.Located{let span=e.spans.at_or(slot,base.nil());let valid=slot!=0 && slot<e.spans.len() && membership.covers(span.id,span.length,span.id);let id=span.id;return choose(valid,base.refined_location(e,id,slot),base.Located{engine:e,slot:0,offset:0,rank:0,hint:0});}
fn direct(e:base.Engine,slot:u32)->base.Located{let span=e.spans.at_or(slot,base.nil());let valid=slot!=0 && slot<e.spans.len() && membership.covers(span.id,span.length,span.id);return choose(valid,base.Located{engine:e,slot:slot,offset:0,rank:0,hint:0},base.Located{engine:e,slot:0,offset:0,rank:0,hint:0});}

fn fragment_selected(e:base.Engine,slot:u32)->base.Located{let span=e.spans.at_or(slot,base.nil());let valid=slot!=0 && slot<e.spans.len() && membership.covers(span.id,span.length,span.id);let id=span.id;return choose(valid,base.fragment_location(e,id,slot),base.Located{engine:e,slot:0,offset:0,rank:0,hint:0});}

fn refined_guarded(e:base.Engine,slot:u32)->base.Located{let r=fragment_selected(e,slot);if r.offset==0{return r;}let span=r.engine.spans.at_or(slot,base.nil());let id=span.id;let next=r.engine.spans.len();let engine=base.split(r.engine,r.slot,r.offset);return base.fragment_location(engine,id,next);}

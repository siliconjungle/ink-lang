module uniform_interval_index_observers;
import "../../knowledge/libraries/uniform_interval_index.ink" as uniform;
record Observation{valid:Bool,found:uniform.Found,overlap:Bool,}
fn probe(prefix:uniform.Prefix,key:u64,start:u64,end:u64)->Observation{return Observation{valid:uniform.valid(prefix),found:uniform.locate(prefix,key),overlap:uniform.overlaps(prefix,start,end)};}

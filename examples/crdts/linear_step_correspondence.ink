module linear_step_correspondence;
import "../../knowledge/libraries/checked_linear_batches.ink" as old;
import "../../knowledge/libraries/hoisted_linear_batches.ink" as new;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
fn old_data(linear:batches.Linear,previous:u64,c:batches.Change)->batches.Linear{
 return old.step(old.Checked{linear:linear,previous:previous},c).linear;
}
fn new_data(linear:batches.Linear,previous:u64,c:batches.Change)->batches.Linear{
 return new.step(new.Checked{linear:linear,previous:previous},c).linear;
}
fn old_previous(linear:batches.Linear,previous:u64,c:batches.Change)->u64{
 return old.step(old.Checked{linear:linear,previous:previous},c).previous;
}
fn new_previous(linear:batches.Linear,previous:u64,c:batches.Change)->u64{
 return new.step(new.Checked{linear:linear,previous:previous},c).previous;
}
fn bridge(s:old.Checked)->new.Checked{return new.Checked{linear:s.linear,previous:s.previous};}
fn bridge_old_step(s:old.Checked,c:batches.Change)->new.Checked{return bridge(old.step(s,c));}
fn new_step_bridge(s:old.Checked,c:batches.Change)->new.Checked{return new.step(bridge(s),c);}
fn old_stop(c:batches.Change,s:old.Checked)->Bool{return s.linear.error!=0;}
fn new_stop(c:batches.Change,s:new.Checked)->Bool{return s.linear.error!=0;}
fn old_stop_view(c:batches.Change,s:old.Checked)->Bool{return old_stop(c,s);}
fn new_stop_view(c:batches.Change,s:old.Checked)->Bool{return new_stop(c,bridge(s));}

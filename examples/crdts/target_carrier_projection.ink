module target_carrier_projection;
import "../../knowledge/libraries/checkpoint_dual_hint_span_graph.ink" as old;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
record Reduced{engine:old.Engine,index:u32,end:u32,}
record Context{targets:List<old.Target>,on:Bool,}
fn projected(p:old.TargetPass)->Reduced{return Reduced{engine:p.walker.engine,index:p.index,end:p.end};}
fn old_step(p:old.TargetPass,c:Context)->old.TargetPass{return old.target_step(p,c.on);}
fn reduced_step(p:Reduced,c:Context)->Reduced{let target=c.targets.at_or(p.index,old.Target{slot:0,id:0,length:0,insert:false});return Reduced{engine:old.toggle(p.engine,target,c.on),index:p.index+1,end:p.end};}
fn projected_step(p:old.TargetPass,on:Bool)->Reduced{return projected(old.target_step(p,on));}
fn step_projected(p:old.TargetPass,on:Bool)->Reduced{let targets=p.walker.applied.values.freeze();let reduced=Reduced{engine:p.walker.engine,index:p.index,end:p.end};return reduced_step(reduced,Context{targets:targets,on:on});}
fn old_stop(p:old.TargetPass)->Bool{return p.index>=p.end;}
fn reduced_stop(p:Reduced)->Bool{return p.index>=p.end;}
fn stop_original(p:old.TargetPass)->Bool{return old_stop(p);}
fn stop_projected(p:old.TargetPass)->Bool{return reduced_stop(projected(p));}

fn with_targets(p:old.TargetPass,targets:List<old.Target>)->old.TargetPass{let w=p.walker;let applied=w.applied;return old.TargetPass{walker:old.Walker{..w,applied:ragged.Rows<old.Target>{ranges:applied.ranges,values:buffer(targets)}},index:p.index,end:p.end};}
fn encoded_projected_step(p:old.TargetPass,targets:List<old.Target>,on:Bool)->Reduced{return projected_step(with_targets(p,targets),on);}
fn encoded_step_projected(p:old.TargetPass,targets:List<old.Target>,on:Bool)->Reduced{return step_projected(with_targets(p,targets),on);}

record Encoded{pass:old.TargetPass,targets:List<old.Target>,}
fn encode(e:Encoded)->old.TargetPass{return with_targets(e.pass,e.targets);}
fn view(e:Encoded)->Reduced{return projected(e.pass);}
fn transition(e:Encoded,on:Bool)->Encoded{let targets=e.targets;let pass=old.target_step(with_targets(e.pass,targets),on);return Encoded{pass:pass,targets:targets};}
fn projected_transition(e:Encoded,on:Bool)->Reduced{return view(transition(e,on));}
fn transition_projected(e:Encoded,on:Bool)->Reduced{let targets=e.targets;return reduced_step(view(e),Context{targets:targets,on:on});}
fn physical_stop(e:Encoded)->Bool{return old_stop(e.pass);}
fn encoded_stop_original(e:Encoded)->Bool{return physical_stop(e);}
fn encoded_stop_projected(e:Encoded)->Bool{return reduced_stop(view(e));}

record View{reduced:Reduced,targets:List<old.Target>,}
fn loop_view(e:Encoded)->View{let targets=e.targets;return View{reduced:view(e),targets:targets};}
fn loop_reduced(v:View,on:Bool)->View{let targets=v.targets;return View{reduced:reduced_step(v.reduced,Context{targets:targets,on:on}),targets:targets};}
fn loop_projected_transition(e:Encoded,on:Bool)->View{return loop_view(transition(e,on));}
fn loop_transition_projected(e:Encoded,on:Bool)->View{return loop_reduced(loop_view(e),on);}
fn loop_stop(v:View)->Bool{return reduced_stop(v.reduced);}
fn loop_stop_original(e:Encoded)->Bool{return physical_stop(e);}
fn loop_stop_projected(e:Encoded)->Bool{return loop_stop(loop_view(e));}

fn loop_projected_engine(e:Encoded,on:Bool)->old.Engine{return loop_projected_transition(e,on).reduced.engine;}
fn loop_reduced_engine(e:Encoded,on:Bool)->old.Engine{return loop_transition_projected(e,on).reduced.engine;}
fn loop_projected_index(e:Encoded,on:Bool)->u32{return loop_projected_transition(e,on).reduced.index;}
fn loop_reduced_index(e:Encoded,on:Bool)->u32{return loop_transition_projected(e,on).reduced.index;}
fn loop_projected_end(e:Encoded,on:Bool)->u32{return loop_projected_transition(e,on).reduced.end;}
fn loop_reduced_end(e:Encoded,on:Bool)->u32{return loop_transition_projected(e,on).reduced.end;}
fn loop_projected_targets(e:Encoded,on:Bool)->List<old.Target>{return loop_projected_transition(e,on).targets;}
fn loop_reduced_targets(e:Encoded,on:Bool)->List<old.Target>{return loop_transition_projected(e,on).targets;}

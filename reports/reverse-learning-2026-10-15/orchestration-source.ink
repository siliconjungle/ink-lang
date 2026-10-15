module learning_orchestration;
record Context { input:f32, target:f32, }
record Model { weight:f32, updates:u32, }
record SettingsState { first_rate:f32, second_rate:f32, budget:u32, first_paused:Bool, second_paused:Bool, }
record Decision { second_steps:u32, second_rate:f32, }
record Report { learner:u32, steps:u32, loss:f32, }
record Models { first:Model, second:Model, settings:SettingsState, }
trainable state First:Model = Model{weight:0.0,updates:0};
trainable state Second:Model = Model{weight:0.25,updates:0};
trainable state Settings:SettingsState = SettingsState{first_rate:0.1,second_rate:0.02,budget:2,first_paused:false,second_paused:false};
event trained:Report;
fn objective(weight:f32,c:Context)->f32 {let error=weight*c.input-c.target;return error*error;}
fn settings_valid(s:SettingsState)->Bool {return is_finite(s.first_rate) && is_finite(s.second_rate) && s.first_rate>0.0 && s.first_rate<=0.25 && s.second_rate>0.0 && s.second_rate<=0.25 && s.budget>0 && s.budget<=8;}
fn model_valid(m:Model)->Bool {return is_finite(m.weight) && m.weight>=-8.0 && m.weight<=8.0;}
// A normal pure function can inspect whole context and another model's outcome.
fn policy(c:Context,first:Model,s:SettingsState)->Decision {
 return Decision{second_steps:choose(!s.second_paused && c.target>0.0,1,0),second_rate:choose(objective(first.weight,c)>0.25,s.first_rate*0.5,s.first_rate*0.25)};
}
fn update(model:Model,c:Context,rate:f32,steps:u32)->Model {
 return repeat_until(steps,model,fn(m)=>false,fn(i)=>fn(m)=>Model{weight:m.weight-rate*gradient(objective,m.weight,c),updates:m.updates+1});
}
learn change configure(s:SettingsState)->Result<Unit,String> writes(Settings)
 requires(settings_valid(s),"settings domain") {Settings=s;return Ok(());}
learn change train_first(c:Context,steps:u32)->Result<f32,String>
 reads(First,Settings) writes(First) emits(trained)
 requires(!Settings.first_paused && steps>0 && steps<=Settings.budget,"first training budget")
 ensures(result=>model_valid(First),"first model domain") {
 let next=update(First,c,Settings.first_rate,steps);First=next;
 let loss=objective(next.weight,c);emit trained(Report{learner:1,steps:steps,loss:loss});return Ok(loss);
}
learn change train_second(c:Context,steps:u32)->Result<f32,String>
 reads(Second,Settings) writes(Second) emits(trained)
 requires(!Settings.second_paused && steps>0 && steps<=Settings.budget,"second training budget")
 ensures(result=>model_valid(Second),"second model domain") {
 let next=update(Second,c,Settings.second_rate,steps);Second=next;
 let loss=objective(next.weight,c);emit trained(Report{learner:2,steps:steps,loss:loss});return Ok(loss);
}
// This application coordinates two learners using ordinary checked calls.
learn change feedback(c:Context)->Result<Models,String>
 reads(First,Second,Settings) writes(First,Second,Settings) emits(trained)
 requires(is_finite(c.input) && is_finite(c.target),"observation domain") {
 let s=Settings;
 if !s.first_paused {let loss=train_first(c,s.budget)?;}
 let decision=policy(c,First,s);
 Settings=SettingsState{..s,second_rate:decision.second_rate};
 if decision.second_steps>0 {
  let linked=Context{input:First.weight*c.input,target:c.target};
  let loss=train_second(linked,decision.second_steps)?;
 }
 return Ok(Models{first:First,second:Second,settings:Settings});
}
learn change cancel(c:Context)->Result<Unit,String>
 reads(First,Second,Settings) writes(First,Second,Settings) emits(trained) {
 let result=feedback(c)?;return Err("cancel coordinated training");
}
query models()->Models reads(First,Second,Settings) {return Models{first:First,second:Second,settings:Settings};}
fn batch(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

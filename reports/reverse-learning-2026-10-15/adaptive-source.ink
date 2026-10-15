module neural_adaptive;
import "std:neural" as nn;
import "std:learning" as learning;
record ControlState { rate:f32, accepted:u32, rejected:u32, }
enum Reason { Improved, LossRise, InvalidUpdate, }
record Feedback { before:f32, after:f32, accepted:Bool, reason:Reason, steps:u32, rate:f32, }
state Architecture:Result<nn.Network,String> = nn.network(10,[6,6],4,10000);
trainable state Optimizer:Result<learning.Adam,String> = learning.adam(initial_weights(244));
trainable state Control:ControlState = ControlState{rate:0.02,accepted:0,rejected:0};
event trained:Feedback;
fn initial_weights(count:u32)->List<f32> {
 let initial:Buffer<f32>=Buffer.empty();
 return repeat_until(count,initial,fn(b)=>false,fn(i)=>fn(b)=>b.push(0.02+f32_from_u32(rem_or(i,17,0))*0.003)).freeze();
}
fn loss(net:nn.Network,weights:List<f32>,features:List<f32>,target:List<f32>)->Result<f32,String> {
 let predicted=nn.predict(net,weights,features)?;
 if length(target)==0 || length(predicted)!=length(target) || !learning.finite(target) {return Err("target domain");}
 let errors=predicted.zip(target,fn(a)=>fn(b)=>a-b);
 let value=sum(errors.map(fn(e)=>e*e))/f32_from_u32(length(target));
 if !is_finite(value) {return Err("nonfinite loss");}return Ok(value);
}
fn update(net:nn.Network,state:learning.Adam,features:List<f32>,target:List<f32>,rate:f32)->Result<learning.Adam,String> {
 let gradient=nn.mse_gradient(net,state.weights,features,target)?;
 return learning.update(state,gradient.gradient,learning.configuration(rate));
}
fn frame(net:nn.Network,state:learning.Adam,features:List<f32>,target:List<f32>,rate:f32,steps:u32)->Result<learning.Adam,String> {
 let initial:Result<learning.Adam,String>=Ok(state);
 return repeat_until(steps,initial,fn(result)=>result.fold(fn(state)=>false,fn(error)=>true),
  fn(i)=>fn(result)=>result.fold(fn(state)=>update(net,state,features,target,rate),fn(error)=>Err(error)));
}
fn optimizer_valid(value:Result<learning.Adam,String>)->Bool {
 return value.fold(fn(o)=>learning.valid(o) && length(o.weights)==244 && foldl(o.weights,true,fn(w)=>fn(ok)=>ok && w>=-8.0 && w<=8.0),fn(error)=>false);
}
adaptive query predict(features:List<f32>)->Result<List<f32>,String> reads(Architecture,Optimizer) {
 let net=Architecture?;let current=Optimizer?;return nn.predict(net,current.weights,features);
}
query objective(features:List<f32>,target:List<f32>)->Result<f32,String> reads(Architecture,Optimizer) {
 let net=Architecture?;let current=Optimizer?;return loss(net,current.weights,features,target);
}
query model()->Result<learning.Adam,String> reads(Optimizer) {return Optimizer;}
query control()->ControlState reads(Control) {return Control;}
learn change observe(features:List<f32>,target:List<f32>,steps:u32)->Result<Feedback,String>
 reads(Architecture,Optimizer,Control) writes(Optimizer,Control) emits(trained)
 requires(steps>=2 && steps<=20 && learning.finite(features) && learning.finite(target),"training domain")
 ensures(result=>optimizer_valid(Optimizer) && Control.rate>0.0 && Control.rate<=0.02,"model domain") {
 let net=Architecture?;let before=Optimizer?;let control=Control;
 let old_loss=loss(net,before.weights,features,target)?;
 // Both candidate steps and acceptance use this same immutable context/target.
 let candidate=frame(net,before,features,target,control.rate,steps);
 let candidate_loss=candidate.fold(fn(candidate)=>loss(net,candidate.weights,features,target),fn(error)=>Err(error));
 let accepted=candidate_loss.fold(fn(value)=>value<=old_loss,fn(error)=>false);
 if accepted {
  Optimizer=candidate;
  let rate=choose(control.rate*1.15<0.02,control.rate*1.15,0.02);
  Control=ControlState{rate:rate,accepted:control.accepted+1,rejected:control.rejected};
 } else {
  // Backtracking is an authored accepted transition of control state. Weights
  // AND both Adam moments remain at their pre-frame values.
  let rate=choose(control.rate*0.5>0.02/4096.0,control.rate*0.5,0.02/4096.0);
  Control=ControlState{rate:rate,accepted:control.accepted,rejected:control.rejected+1};
 }
 let reason=choose(accepted,Reason.Improved,candidate_loss.fold(fn(value)=>Reason.LossRise,fn(error)=>Reason.InvalidUpdate));
 let after=choose(accepted,candidate_loss.fold(fn(value)=>value,fn(error)=>old_loss),old_loss);
 let feedback=Feedback{before:old_loss,after:after,accepted:accepted,reason:reason,steps:steps,rate:Control.rate};
 emit trained(feedback);return Ok(feedback);
}
learn change cancel(features:List<f32>,target:List<f32>)->Result<Unit,String>
 reads(Architecture,Optimizer,Control) writes(Optimizer,Control) emits(trained) {
 let result=observe(features,target,2)?;return Err("rollback frame");
}
record Sample { mode:Mode, value:f32, }
enum Mode { Square, Offset, }
// Typed callback matches use CPU fallback; numeric() below dispatches on GPU.
fn mapped(samples:List<Sample>)->List<f32> {
 return samples.map(fn(sample)=>match sample.mode {Mode.Square=>sample.value*sample.value,Mode.Offset=>sample.value+0.5,});
}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

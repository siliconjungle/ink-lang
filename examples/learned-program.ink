module learned_program;
import "std:policy_gradient" as rl;
import "std:learning" as learning;
enum Op { Identity, Scale, Bias, Relu, }
record Coefficients { scale:f32,bias:f32, }
record Example { input:f32,target:f32, }
record Goal { samples:List<Example>,instruction_cost:f32,version:u32, }
record MassRow { identity:f32,scale:f32,bias:f32,relu:f32, }
record Parameters { a:MassRow,b:MassRow,c:MassRow,d:MassRow, }
record Pick { slot:u32,operation:u32, }
record Sampled { code:List<Op>,decisions:List<rl.Decision>, }
record Building { choices:List<Op>,decisions:List<rl.Decision>, }
record Distribution { masses:List<f32>,derivatives:List<List<f32>>, }
record Report { step:u32,loss:f32,best:f32,accepted:Bool,goal_version:u32, }
trainable state Structure:Table<u64,List<Op>>=Table.empty();
trainable state Weights:Table<u64,Coefficients>=Table.empty();
trainable state Policy:Table<u64,learning.Adam>=Table.empty();
trainable state Target:Table<u64,Goal>=Table.empty();
state Live:Table<u64,f32>=Table.empty();
event searched:Report;
event updated:Coefficients;

fn evaluate(code:List<Op>,w:Coefficients,input:f32)->f32 {
 return foldl(code,input,fn(op)=>fn(value)=>choose(op==Op.Scale,value*w.scale,
  choose(op==Op.Bias,value+w.bias,choose(op==Op.Relu,choose(value>0.0,value,0.0),value))));
}
fn coefficients_valid(w:Coefficients)->Bool {
 return is_finite(w.scale) && w.scale>=0.25 && w.scale<=1.0 && is_finite(w.bias) && w.bias>=0.0 && w.bias<=0.5;
}
fn goal_valid(g:Goal)->Bool {
 return length(g.samples)>0 && length(g.samples)<=32 && is_finite(g.instruction_cost) && g.instruction_cost>=0.0 && g.instruction_cost<=0.01
  && foldl(g.samples,true,fn(s)=>fn(ok)=>ok && is_finite(s.input) && s.input>=-4.0 && s.input<=4.0 && is_finite(s.target) && s.target>=-32.0 && s.target<=32.0);
}
// This objective evaluates the entire candidate on the authored workload.
// The instruction penalty is an application preference, not measured latency.
fn squared_error(code:List<Op>,w:Coefficients,s:Example)->f32 {
 let error=evaluate(code,w,s.input)-s.target;return error*error;
}
fn objective(code:List<Op>,w:Coefficients,g:Goal)->f32 {
 let error=foldl(g.samples,0.0,fn(s)=>fn(total)=>total+squared_error(code,w,s));
 let instructions=foldl(code,0.0,fn(op)=>fn(total)=>total+choose(op==Op.Identity,0.0,1.0));
 return error/f32_from_u32(length(g.samples))+g.instruction_cost*instructions;
}
fn unpack(xs:List<f32>)->Parameters {return Parameters{a:MassRow{identity:xs.at_or(0,1.0),scale:xs.at_or(1,1.0),bias:xs.at_or(2,1.0),relu:xs.at_or(3,1.0)},b:MassRow{identity:xs.at_or(4,1.0),scale:xs.at_or(5,1.0),bias:xs.at_or(6,1.0),relu:xs.at_or(7,1.0)},c:MassRow{identity:xs.at_or(8,1.0),scale:xs.at_or(9,1.0),bias:xs.at_or(10,1.0),relu:xs.at_or(11,1.0)},d:MassRow{identity:xs.at_or(12,1.0),scale:xs.at_or(13,1.0),bias:xs.at_or(14,1.0),relu:xs.at_or(15,1.0)}};}
fn pack(w:Parameters)->List<f32> {return [w.a.identity,w.a.scale,w.a.bias,w.a.relu,w.b.identity,w.b.scale,w.b.bias,w.b.relu,w.c.identity,w.c.scale,w.c.bias,w.c.relu,w.d.identity,w.d.scale,w.d.bias,w.d.relu];}
fn mass(w:Parameters,p:Pick)->f32 {
 let row=choose(p.slot==0,w.a,choose(p.slot==1,w.b,choose(p.slot==2,w.c,w.d)));
 let z=choose(p.operation==0,row.identity,choose(p.operation==1,row.scale,choose(p.operation==2,row.bias,row.relu)));
 return z*z+0.1;
}
fn operation(index:u32)->Op {return choose(index==0,Op.Identity,choose(index==1,Op.Scale,choose(index==2,Op.Bias,Op.Relu)));}
fn distribution(w:Parameters,slot:u32)->Distribution {
 let a=Pick{slot:slot,operation:0};let b=Pick{slot:slot,operation:1};let c=Pick{slot:slot,operation:2};let d=Pick{slot:slot,operation:3};
 return Distribution{masses:[mass(w,a),mass(w,b),mass(w,c),mass(w,d)],
  derivatives:[pack(gradient(mass,w,a)),pack(gradient(mass,w,b)),pack(gradient(mass,w,c)),pack(gradient(mass,w,d))]};
}
fn sample_slot(accumulator:Result<Building,String>,slot:u32,w:Parameters,units:List<f32>)->Result<Building,String> {
 let previous=accumulator?;
 let d=distribution(w,slot);
 let decision=rl.decide(d.masses,d.derivatives,[true,true,true,true],units.at_or(slot,-1.0))?;
 return Ok(Building{choices:previous.choices.concat([operation(decision.action)]),decisions:previous.decisions.concat([decision])});
}
fn sample(weights:List<f32>,units:List<f32>)->Result<Sampled,String> {
 if length(weights)!=16 || length(units)!=4 {return Err("policy shape");}
 let w=unpack(weights);let slots:List<u32>=[0,1,2,3];
 let initial:Result<Building,String>=Ok(Building{choices:[],decisions:[]});
 let sampled=foldl(slots,initial,fn(slot)=>fn(acc)=>sample_slot(acc,slot,w,units))?;
 let empty:List<Op>=[];
 let code=repeat(8,empty,fn(i)=>fn(code)=>code.concat(sampled.choices));
 return Ok(Sampled{code:code,decisions:sampled.decisions});
}
// Bounded reward shaping is authored here; the library receives no built-in goal.
fn reward(loss:f32)->f32 {return -loss/(1.0+loss);}
fn operation_index(op:Op)->u32 {return choose(op==Op.Identity,0,choose(op==Op.Scale,1,choose(op==Op.Bias,2,3)));}
fn elite_slot(accumulator:Result<List<rl.Decision>,String>,slot:u32,w:Parameters,code:List<Op>)->Result<List<rl.Decision>,String> {
 let previous=accumulator?;let d=distribution(w,slot);
 let decision=rl.score_action(d.masses,d.derivatives,[true,true,true,true],operation_index(code.at_or(slot,Op.Identity)))?;
 return Ok(previous.concat([decision]));
}
// Once a good full program has been found, fit its likelihood at the current
// policy. This is explicit elite distillation, not off-policy REINFORCE replay.
fn proposal_gradient(weights:List<f32>,selected:List<Op>,sampled:List<rl.Decision>,loss:f32,before:f32)->Result<List<f32>,String> {
 if length(selected)==32 {
  let slots:List<u32>=[0,1,2,3];let initial:Result<List<rl.Decision>,String>=Ok([]);let w=unpack(weights);
  let elite=foldl(slots,initial,fn(slot)=>fn(acc)=>elite_slot(acc,slot,w,selected))?;
  return rl.joint_gradient(elite,1.0,0.0);
 }
 return rl.joint_gradient(sampled,reward(loss),reward(before));
}
fn valid_policy(p:learning.Adam)->Bool {return learning.valid(p) && length(p.weights)==16 && foldl(p.weights,true,fn(w)=>fn(ok)=>ok && w>=-8.0 && w<=8.0);}
learn change initialize()->Result<Unit,String> writes(Policy) {
 let p=learning.adam([1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0])?;
 Policy.put(0,p);return Ok(());
}
learn change retarget(samples:List<Example>,instruction_cost:f32,expected:u32)->Result<u32,String> reads(Target) writes(Target,Policy) {
 let old=Target.get(0).fold(fn(g)=>g.version,fn(u)=>0);
 if expected!=old || old==4294967295 {return Err("stale goal");}
 let next=Goal{samples:samples,instruction_cost:instruction_cost,version:old+1};
 if !goal_valid(next) {return Err("goal domain");}
 Target.put(0,next);let reset=initialize()?;return Ok(next.version);
}
learn change retune(w:Coefficients,fail:Bool)->Result<Unit,String> writes(Weights) emits(updated)
 requires(coefficients_valid(w),"coefficient domain") {
 Weights.put(0,w);emit updated(w);if fail {return Err("cancel coefficient update");}return Ok(());
}
learn change episode(units:List<f32>,rate:f32,goal_version:u32)->Result<Report,String>
 reads(Structure,Weights,Policy,Target) writes(Structure,Policy) emits(searched) {
 let policy=Policy.get(0).ok_or("initialize policy")?;let goal=Target.get(0).ok_or("initialize target")?;
 let w=Weights.get(0).unwrap_or(Coefficients{scale:0.75,bias:0.25});
 if !valid_policy(policy) || !goal_valid(goal) || !coefficients_valid(w) || goal.version!=goal_version || !is_finite(rate) || rate<=0.0 || rate>0.1 {return Err("training domain or stale goal");}
 let previous=Structure.get(0).unwrap_or([]);let before=objective(previous,w,goal);
 let candidate=sample(policy.weights,units)?;let loss=objective(candidate.code,w,goal);
 let accepted=loss<before;let selected=choose(accepted,candidate.code,previous);
 let gradient=proposal_gradient(policy.weights,selected,candidate.decisions,loss,before)?;
 let next=learning.update(policy,gradient,learning.Config{..learning.configuration(rate),norm_limit:0.0})?;
 if !valid_policy(next) || !is_finite(loss) {return Err("candidate domain");}
 if accepted {Structure.put(0,selected);}
 Policy.put(0,next);
 let report=Report{step:next.steps,loss:loss,best:choose(accepted,loss,before),accepted:accepted,goal_version:goal.version};
 emit searched(report);return Ok(report);
}
learn change aborted(units:List<f32>,rate:f32,goal_version:u32)->Result<Unit,String>
 reads(Structure,Weights,Policy,Target) writes(Structure,Policy) emits(searched) {
 let report=episode(units,rate,goal_version)?;return Err("cancel whole search step");
}
adaptive query serve(input:f32)->f32 reads(Structure,Weights,Live) {
 return evaluate(Structure.get(0).unwrap_or([]),Weights.get(0).unwrap_or(Coefficients{scale:0.75,bias:0.25}),input)+Live.get(0).unwrap_or(0.0);
}
query structure()->List<Op> reads(Structure) {return Structure.get(0).unwrap_or([]);}
query policy()->Result<learning.Adam,String> reads(Policy) {return Policy.get(0).ok_or("initialize policy");}
query loss()->Result<f32,String> reads(Structure,Weights,Target) {
 let goal=Target.get(0).ok_or("initialize target")?;
 if !goal_valid(goal) {return Err("goal domain");}
 return Ok(objective(Structure.get(0).unwrap_or([]),Weights.get(0).unwrap_or(Coefficients{scale:0.75,bias:0.25}),goal));
}
change set_live(value:f32)->Unit writes(Live) {Live.put(0,value);return ();}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

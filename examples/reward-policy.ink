module reward_policy;
import "std:policy_gradient" as rl;
import "std:learning" as learning;
record Context { signal:f32, urgency:f32, }
record Weights { left_bias:f32, left_slope:f32, right_bias:f32, right_slope:f32, }
record Input { context:Context, action:u32, }
record Pending { ticket:u32, base:u32, context:Context, decision:rl.Decision, }
record AgentState { optimizer:learning.Adam, version:u32, ticket:u32, pending:Option<Pending>, }
record Acted { ticket:u32, action:u32, probability:f32, }
trainable state Agent:Result<AgentState,String> = initialize();
event updated:u32;
fn initialize()->Result<AgentState,String> {
 let optimizer=learning.adam([1.0,0.0,1.0,0.0])?;
 return Ok(AgentState{optimizer:optimizer,version:0,ticket:0,pending:None});
}
fn unpack(xs:List<f32>)->Weights {return Weights{left_bias:xs.at_or(0,0.0),left_slope:xs.at_or(1,0.0),right_bias:xs.at_or(2,0.0),right_slope:xs.at_or(3,0.0)};}
fn pack(w:Weights)->List<f32> {return [w.left_bias,w.left_slope,w.right_bias,w.right_slope];}
fn mass(w:Weights,input:Input)->f32 {
 let feature=input.context.signal*(1.0+input.context.urgency);
 let z=choose(input.action==0,w.left_bias+w.left_slope*feature,w.right_bias+w.right_slope*feature);
 return z*z+0.1;
}
fn valid_context(c:Context)->Bool {return is_finite(c.signal) && c.signal>=-1.0 && c.signal<=1.0 && is_finite(c.urgency) && c.urgency>=0.0 && c.urgency<=1.0;}
fn policy(weights:List<f32>,c:Context,unit:f32)->Result<rl.Decision,String> {
 if length(weights)!=4 || !valid_context(c) {return Err("policy context");}
 let w=unpack(weights);let left=Input{context:c,action:0};let right=Input{context:c,action:1};
 return rl.decide([mass(w,left),mass(w,right)],[pack(gradient(mass,w,left)),pack(gradient(mass,w,right))],[true,true],unit);
}
fn valid_agent(agent:AgentState)->Bool {
 return learning.valid(agent.optimizer) && length(agent.optimizer.weights)==4 && foldl(agent.optimizer.weights,true,fn(w)=>fn(ok)=>ok && w>=-8.0 && w<=8.0);
}
adaptive query predict(c:Context)->Result<List<f32>,String> reads(Agent) {
 let agent=Agent?;if !valid_agent(agent) || !valid_context(c) {return Err("agent domain");}
 let w=unpack(agent.optimizer.weights);
 return rl.probabilities([mass(w,Input{context:c,action:0}),mass(w,Input{context:c,action:1})],[true,true]);
}
query model()->Result<AgentState,String> reads(Agent) {return Agent;}
learn change act(c:Context,unit:f32)->Result<Acted,String> reads(Agent) writes(Agent) {
 let agent=Agent?;
 if !valid_agent(agent) || agent.pending.fold(fn(p)=>true,fn(u)=>false) || agent.ticket==4294967295 {return Err("pending decision or agent domain");}
 let decision=policy(agent.optimizer.weights,c,unit)?;let ticket=agent.ticket+1;
 Agent=Ok(AgentState{..agent,ticket:ticket,pending:Some(Pending{ticket:ticket,base:agent.version,context:c,decision:decision})});
 return Ok(Acted{ticket:ticket,action:decision.action,probability:decision.probability});
}
learn change feedback(ticket:u32,return_value:f32,baseline:f32,rate:f32)->Result<u32,String> reads(Agent) writes(Agent) emits(updated) {
 let agent=Agent?;let pending=agent.pending.ok_or("no pending decision")?;
 if !valid_agent(agent) || ticket!=pending.ticket || pending.base!=agent.version || agent.version==4294967295 {return Err("stale policy feedback");}
 let gradient=rl.reinforce(pending.decision,return_value,baseline)?;
 let optimizer=learning.update(agent.optimizer,gradient,learning.configuration(rate))?;
 let next=AgentState{..agent,optimizer:optimizer,version:agent.version+1,pending:None};
 if !valid_agent(next) {return Err("candidate domain");}
 Agent=Ok(next);emit updated(next.version);return Ok(next.version);
}
learn change cancel()->Result<Unit,String> reads(Agent) writes(Agent) {let agent=Agent?;Agent=Ok(AgentState{..agent,pending:None});return Ok(());}
learn change invalidate()->Result<Unit,String> reads(Agent) writes(Agent) {
 let agent=Agent?;if agent.version==4294967295 {return Err("version exhausted");}
 Agent=Ok(AgentState{..agent,version:agent.version+1});return Ok(());
}
// This objective belongs to this example, never to the compiler or RL library.
fn reward(c:Context,action:u32)->f32 {return choose(action==choose(c.signal>=0.0,0,1),1.0,-1.0);}
learn change episode(c:Context,unit:f32,rate:f32)->Result<u32,String> reads(Agent) writes(Agent) emits(updated) {
 let decision=act(c,unit)?;return feedback(decision.ticket,reward(c,decision.action),0.0,rate);
}
learn change aborted(c:Context)->Result<Unit,String> reads(Agent) writes(Agent) emits(updated) {
 let version=episode(c,0.25,0.02)?;return Err("cancel outer training");
}
fn decision(masses:List<f32>,derivatives:List<List<f32>>,allowed:List<Bool>,unit:f32)->Result<rl.Decision,String> {return rl.decide(masses,derivatives,allowed,unit);}
fn score_action(masses:List<f32>,derivatives:List<List<f32>>,allowed:List<Bool>,action:u32)->Result<rl.Decision,String> {return rl.score_action(masses,derivatives,allowed,action);}
fn returns(rewards:List<f32>,discount:f32,bootstrap:f32)->Result<List<f32>,String> {return rl.returns(rewards,discount,bootstrap);}
fn trajectory(decisions:List<rl.Decision>,rewards:List<f32>,baselines:List<f32>,discount:f32,bootstrap:f32)->Result<List<f32>,String> {
 let returns=rl.returns(rewards,discount,bootstrap)?;
 return rl.mean_gradient(decisions,returns,baselines);
}
fn joint(decisions:List<rl.Decision>,return_value:f32,baseline:f32)->Result<List<f32>,String> {
 return rl.joint_gradient(decisions,return_value,baseline);
}
fn total(decisions:List<rl.Decision>,return_values:List<f32>,baselines:List<f32>)->Result<List<f32>,String> {
 return rl.total_gradient(decisions,return_values,baselines);
}
fn edge(kind:u32)->Result<rl.Decision,String> {
 let value=f32_from_bits(choose(kind==0,2143289344,choose(kind==1,2139095040,1)));
 return rl.decide([value,1.0],[[1.0],[1.0]],[true,true],0.0);
}
fn batch(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

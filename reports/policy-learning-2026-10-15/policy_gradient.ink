module ink.knowledge.policy_gradient;
// Score-function policy gradients over author-supplied nonnegative masses.
// Derivatives, rewards, observations and random inputs belong to the application.
record Decision { action:u32, probability:f32, score:List<f32>, }
fn finite(xs:List<f32>)->Bool {return foldl(xs,true,fn(x)=>fn(ok)=>ok && is_finite(x));}
fn maximum(masses:List<f32>,allowed:List<Bool>)->f32 {
 var maximum:f32=0.0;var i:u32=0;
 for mass in masses {if allowed.at_or(i,false) && mass>maximum {maximum=mass;}i=i+1;}
 return maximum;
}
fn weights(masses:List<f32>,allowed:List<Bool>)->Result<List<f32>,String> {
 if length(masses)==0 || length(masses)>256 || length(allowed)!=length(masses) || !finite(masses)
  || !foldl(masses,true,fn(m)=>fn(ok)=>ok && m>=0.0) {return Err("policy shape or mass domain");}
 let maximum=maximum(masses,allowed);
 if maximum==0.0 {return Err("no positive allowed policy mass");}
 var out:Buffer<f32>=Buffer.empty();var i:u32=0;
 for mass in masses {out=out.push(choose(allowed.at_or(i,false),mass/maximum,0.0));i=i+1;}
 return Ok(out.freeze());
}
fn probabilities(masses:List<f32>,allowed:List<Bool>)->Result<List<f32>,String> {
 let scaled=weights(masses,allowed)?;
 let total=foldl(scaled,0.0,fn(x)=>fn(sum)=>sum+x);
 return Ok(scaled.map(fn(x)=>x/total));
}
fn select(scaled:List<f32>,unit:f32,total:f32)->u32 {
 let threshold=unit*total;
 var accumulated:f32=0.0;var selected:u32=0;var found:Bool=false;var i:u32=0;
 // The final positive entry is the explicit fallback for F32 boundary rounding.
 for weight in scaled {
  if weight>0.0 && !found {selected=i;}
  accumulated=accumulated+weight;
  if weight>0.0 && !found && threshold<accumulated {selected=i;found=true;}
  i=i+1;
 }
 return selected;
}
fn correction(derivatives:List<List<f32>>,allowed:List<Bool>,maximum:f32,total:f32)->List<f32> {
 var correction:List<f32>=derivatives.at_or(0,[]).map(fn(d)=>0.0);var i:u32=0;
 for row in derivatives {
  if allowed.at_or(i,false) {correction=correction.zip(row,fn(sum)=>fn(d)=>sum+(d/maximum)/total);}
  i=i+1;
 }
 return correction;
}
fn scores(masses:List<f32>,derivatives:List<List<f32>>,allowed:List<Bool>,total:f32,selected:u32)->List<f32> {
 let selected_mass=masses.at_or(selected,0.0);let maximum=maximum(masses,allowed);
 let correction=correction(derivatives,allowed,maximum,total);
 return derivatives.at_or(selected,[]).zip(correction,fn(derivative)=>fn(c)=>derivative/selected_mass-c);
}
fn decide(masses:List<f32>,derivatives:List<List<f32>>,allowed:List<Bool>,unit:f32)->Result<Decision,String> {
 let scaled=weights(masses,allowed)?;
 let parameters=length(derivatives.at_or(0,[]));
 if !is_finite(unit) || unit<0.0 || unit>=1.0 || length(derivatives)!=length(masses)
  || parameters==0 || parameters>4096 || length(masses)>quot_or(65536,parameters,0) {return Err("policy sampling or derivative shape");}
 if !foldl(derivatives,true,fn(row)=>fn(ok)=>ok && length(row)==parameters && finite(row)) {return Err("policy derivative domain");}
 let total=foldl(scaled,0.0,fn(x)=>fn(sum)=>sum+x);
 let selected=select(scaled,unit,total);
 let score=scores(masses,derivatives,allowed,total,selected);
 let probability=scaled.at_or(selected,0.0)/total;
 if !finite(score) || probability<=0.0 {return Err("nonfinite policy score or probability underflow");}
 return Ok(Decision{action:selected,probability:probability,score:score});
}
// Negative reward-weighted score: compatible with a minimizing SGD/Adam update.
fn reinforce(decision:Decision,return_value:f32,baseline:f32)->Result<List<f32>,String> {
 if !is_finite(return_value) || !is_finite(baseline) || !is_finite(decision.probability)
  || decision.probability<=0.0 || decision.probability>1.0 || length(decision.score)==0 || length(decision.score)>4096 || !finite(decision.score) {return Err("policy feedback domain");}
 let advantage=return_value-baseline;
 let gradient=decision.score.map(fn(score)=>-advantage*score);
 if !is_finite(advantage) || !finite(gradient) {return Err("nonfinite policy gradient");}
 return Ok(gradient);
}
fn accumulate(accumulator:Result<List<f32>,String>,decision:Decision,return_value:f32,baseline:f32)->Result<List<f32>,String> {
 let sum=accumulator?;let gradient=reinforce(decision,return_value,baseline)?;
 if length(sum)!=length(gradient) {return Err("trajectory parameter shape");}
 let total=sum.zip(gradient,fn(a)=>fn(b)=>a+b);
 if !finite(total) {return Err("nonfinite trajectory gradient");}
 return Ok(total);
}
fn mean_gradient(decisions:List<Decision>,return_values:List<f32>,baselines:List<f32>)->Result<List<f32>,String> {
 let first=decisions.at_or(0,Decision{action:0,probability:0.0,score:[]});let parameters=length(first.score);
 if length(decisions)==0 || length(decisions)>4096 || length(return_values)!=length(decisions) || length(baselines)!=length(decisions)
  || parameters==0 || parameters>4096 || length(decisions)>quot_or(65536,parameters,0) {return Err("trajectory shape");}
 var accumulator:Result<List<f32>,String>=Ok(first.score.map(fn(x)=>0.0));var i:u32=0;
 for decision in decisions {accumulator=accumulate(accumulator,decision,return_values.at_or(i,0.0),baselines.at_or(i,0.0));i=i+1;}
 let total=accumulator?;return Ok(total.map(fn(g)=>g/f32_from_u32(length(decisions))));
}
fn returns(rewards:List<f32>,discount:f32,bootstrap:f32)->Result<List<f32>,String> {
 if length(rewards)>4096 || !finite(rewards) || !is_finite(discount) || discount<0.0 || discount>1.0 || !is_finite(bootstrap) {return Err("return domain");}
 var reversed:Buffer<f32>=Buffer.empty();var next:f32=bootstrap;var i:u32=0;
 for ignored in rewards {next=rewards.at_or(length(rewards)-1-i,0.0)+discount*next;reversed=reversed.push(next);i=i+1;}
 let reversed=reversed.freeze();if !finite(reversed) {return Err("nonfinite return");}
 var out:Buffer<f32>=Buffer.empty();var i:u32=0;
 for ignored in reversed {out=out.push(reversed.at_or(length(reversed)-1-i,0.0));i=i+1;}
 return Ok(out.freeze());
}

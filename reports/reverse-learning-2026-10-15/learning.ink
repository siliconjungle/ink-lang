module ink.knowledge.learning;
// Explicit F32 optimizer state. Different moment arithmetic from binary64 Adam
// is not a claim of bit-for-bit parity with another implementation.
record Adam { weights:List<f32>, first:List<f32>, second:List<f32>, steps:u32, first_power:f32, second_power:f32, }
record Config { rate:f32, first_decay:f32, second_decay:f32, epsilon:f32, weight_decay:f32, norm_limit:f32, }
fn configuration(rate:f32)->Config {return Config{rate:rate,first_decay:0.9,second_decay:0.999,epsilon:0.00000001,weight_decay:0.0,norm_limit:1.0};}
fn finite(xs:List<f32>)->Bool {return foldl(xs,true,fn(x)=>fn(ok)=>ok && is_finite(x));}
fn valid(state:Adam)->Bool {
 return length(state.weights)==length(state.first) && length(state.weights)==length(state.second) && finite(state.weights) && finite(state.first) && finite(state.second)
  && foldl(state.second,true,fn(x)=>fn(ok)=>ok && x>=0.0)
  && state.first_power>=0.0 && state.first_power<=1.0 && state.second_power>=0.0 && state.second_power<=1.0;
}
fn adam(weights:List<f32>)->Result<Adam,String> {
 if !finite(weights) {return Err("nonfinite weights");}
 let zero=weights.map(fn(w)=>0.0);
 return Ok(Adam{weights:weights,first:zero,second:zero,steps:0,first_power:1.0,second_power:1.0});
}
fn configuration_valid(c:Config)->Bool {
 return is_finite(c.rate) && c.rate>0.0 && c.first_decay>=0.0 && c.first_decay<1.0 && c.second_decay>=0.0 && c.second_decay<1.0
  && is_finite(c.epsilon) && c.epsilon>0.0 && is_finite(c.weight_decay) && c.weight_decay>=0.0 && is_finite(c.norm_limit) && c.norm_limit>=0.0;
}
fn abs(x:f32)->f32 {return choose(x<0.0,-x,x);}
fn gradient_scale(xs:List<f32>,limit:f32)->f32 {
 if limit==0.0 {return 1.0;}
 let maximum=foldl(xs,0.0,fn(x)=>fn(m)=>choose(abs(x)>m,abs(x),m));
 if maximum==0.0 {return 1.0;}
 let total=foldl(xs,0.0,fn(x)=>fn(s)=>s+(x/maximum)*(x/maximum));
 let scale=(limit/maximum)/sqrt(total);
 return choose(scale<1.0,scale,1.0);
}
fn parameter_update(weight:f32,first:f32,second:f32,first_power:f32,second_power:f32,c:Config)->f32 {
 return weight-c.rate*(first/(1.0-first_power))/(sqrt(second/(1.0-second_power))+c.epsilon);
}
fn update(state:Adam,gradient:List<f32>,c:Config)->Result<Adam,String> {
 if !valid(state) || !configuration_valid(c) || length(gradient)!=length(state.weights) || !finite(gradient) || state.steps==4294967295 {return Err("optimizer domain");}
 var adjusted:Buffer<f32>=Buffer.empty();var i:u32=0;
 for g in gradient {adjusted=adjusted.push(g+c.weight_decay*state.weights.at_or(i,0.0));i=i+1;}
 let adjusted=adjusted.freeze();if !finite(adjusted) {return Err("nonfinite gradient");}
 let scale=gradient_scale(adjusted,c.norm_limit);
 let first_power=state.first_power*c.first_decay;let second_power=state.second_power*c.second_decay;
 var weights:Buffer<f32>=Buffer.empty();var first:Buffer<f32>=Buffer.empty();var second:Buffer<f32>=Buffer.empty();var i:u32=0;
 for g in adjusted {
  let g=g*scale;
  let m=c.first_decay*state.first.at_or(i,0.0)+(1.0-c.first_decay)*g;
  let v=c.second_decay*state.second.at_or(i,0.0)+(1.0-c.second_decay)*g*g;
  let next=parameter_update(state.weights.at_or(i,0.0),m,v,first_power,second_power,c);
  weights=weights.push(next);first=first.push(m);second=second.push(v);i=i+1;
 }
 let candidate=Adam{weights:weights.freeze(),first:first.freeze(),second:second.freeze(),steps:state.steps+1,first_power:first_power,second_power:second_power};
 if !valid(candidate) {return Err("nonfinite optimizer update");}
 return Ok(candidate);
}

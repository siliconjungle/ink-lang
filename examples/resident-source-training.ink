// Authored 10 -> [6,6] ReGLU -> 4 network with 244 parameters.
// Each coordinate uses ordinary piecewise forward AD; a batch fold preserves
// source F32 operation order. Parameter values and Adam state travel together.
// This is a pure resident-plan consumer, separate from stateful tape training.
module resident_reglu_training;
record Parameter{value:f32,first:f32,second:f32,first_power:f32,second_power:f32,steps:u32,}
record Config{rate:f32,first_decay:f32,second_decay:f32,epsilon:f32,}
fn empty_parameter()->Parameter{return Parameter{value:0.0,first:0.0,second:0.0,first_power:1.0,second_power:1.0,steps:0};}
fn parameter(candidate:f32,coordinate:u32,parameters:List<Parameter>,index:u32)->f32{return choose(coordinate==index,candidate,parameters.at_or(index,empty_parameter()).value);}
fn reglu(value:f32,gate:f32)->f32{return choose(gate>0.0,value*gate,0.0);}
fn dot10(candidate:f32,coordinate:u32,parameters:List<Parameter>,features:List<f32>,row:u32,base:u32)->f32{
 let bias=parameter(candidate,coordinate,parameters,base+10);
 return repeat(10,bias,fn(i)=>fn(total)=>total+parameter(candidate,coordinate,parameters,base+i)*features.at_or(row*10+i,0.0));
}
fn dot6(candidate:f32,coordinate:u32,parameters:List<Parameter>,inputs:List<f32>,base:u32)->f32{
 let bias=parameter(candidate,coordinate,parameters,base+6);
 return repeat(6,bias,fn(i)=>fn(total)=>total+parameter(candidate,coordinate,parameters,base+i)*inputs.at_or(i,0.0));
}
fn first_layer(candidate:f32,coordinate:u32,parameters:List<Parameter>,features:List<f32>,row:u32)->List<f32>{return list(reglu(dot10(candidate,coordinate,parameters,features,row,0),dot10(candidate,coordinate,parameters,features,row,11)),reglu(dot10(candidate,coordinate,parameters,features,row,22),dot10(candidate,coordinate,parameters,features,row,33)),reglu(dot10(candidate,coordinate,parameters,features,row,44),dot10(candidate,coordinate,parameters,features,row,55)),reglu(dot10(candidate,coordinate,parameters,features,row,66),dot10(candidate,coordinate,parameters,features,row,77)),reglu(dot10(candidate,coordinate,parameters,features,row,88),dot10(candidate,coordinate,parameters,features,row,99)),reglu(dot10(candidate,coordinate,parameters,features,row,110),dot10(candidate,coordinate,parameters,features,row,121)));}
fn second_layer(candidate:f32,coordinate:u32,parameters:List<Parameter>,inputs:List<f32>)->List<f32>{return list(reglu(dot6(candidate,coordinate,parameters,inputs,132),dot6(candidate,coordinate,parameters,inputs,139)),reglu(dot6(candidate,coordinate,parameters,inputs,146),dot6(candidate,coordinate,parameters,inputs,153)),reglu(dot6(candidate,coordinate,parameters,inputs,160),dot6(candidate,coordinate,parameters,inputs,167)),reglu(dot6(candidate,coordinate,parameters,inputs,174),dot6(candidate,coordinate,parameters,inputs,181)),reglu(dot6(candidate,coordinate,parameters,inputs,188),dot6(candidate,coordinate,parameters,inputs,195)),reglu(dot6(candidate,coordinate,parameters,inputs,202),dot6(candidate,coordinate,parameters,inputs,209)));}
fn outputs(candidate:f32,coordinate:u32,parameters:List<Parameter>,features:List<f32>,row:u32)->List<f32>{
 let first=first_layer(candidate,coordinate,parameters,features,row);
 let second=second_layer(candidate,coordinate,parameters,first);
 return list(dot6(candidate,coordinate,parameters,second,216),dot6(candidate,coordinate,parameters,second,223),dot6(candidate,coordinate,parameters,second,230),dot6(candidate,coordinate,parameters,second,237));}
fn squared_error(prediction:f32,target:f32)->f32{let error=prediction-target;return error*error;}
fn objective(candidate:f32,coordinate:u32,parameters:List<Parameter>,features:List<f32>,targets:List<f32>,row:u32)->f32{
 let predicted=outputs(candidate,coordinate,parameters,features,row);
 let total=repeat(4,0.0,fn(i)=>fn(total)=>total+squared_error(predicted.at_or(i,0.0),targets.at_or(row*4+i,0.0)));
 return total/4.0;
}
fn gradients(parameters:List<Parameter>,features:List<f32>,targets:List<f32>,rows:List<u32>)->List<f32>{
 if length(rows)==0{return parameters.map(fn(p)=>0.0);}
 return parameters.map_indexed(fn(coordinate)=>fn(p)=>
  foldl(rows,0.0,fn(row)=>fn(total)=>total+gradient_piecewise(objective,p.value,coordinate,parameters,features,targets,row))/f32_from_u32(length(rows)));
}
fn candidate(p:Parameter,g:f32,c:Config)->Parameter{
 let first_power=p.first_power*c.first_decay;let second_power=p.second_power*c.second_decay;
 let first=c.first_decay*p.first+(1.0-c.first_decay)*g;
 let second=c.second_decay*p.second+(1.0-c.second_decay)*g*g;
 let value=p.value-c.rate*(first/(1.0-first_power))/(sqrt(second/(1.0-second_power))+c.epsilon);
 return Parameter{value:value,first:first,second:second,first_power:first_power,second_power:second_power,steps:p.steps+1};
}
fn valid(p:Parameter)->Bool{return is_finite(p.value)&&is_finite(p.first)&&is_finite(p.second)&&p.second>=0.0&&p.first_power>=0.0&&p.first_power<=1.0&&p.second_power>=0.0&&p.second_power<=1.0&&p.steps<4294967295;}
fn configuration(c:Config)->Bool{return is_finite(c.rate)&&c.rate>0.0&&c.first_decay>=0.0&&c.first_decay<1.0&&c.second_decay>=0.0&&c.second_decay<1.0&&is_finite(c.epsilon)&&c.epsilon>0.0;}
fn shape(parameters:List<Parameter>,features:List<f32>,targets:List<f32>,rows:List<u32>)->Bool{
 return length(parameters)==244&&length(features)==length(rows)*10&&length(targets)==length(rows)*4&&length(rows)>0;
}
fn update(parameters:List<Parameter>,gradient:List<f32>,admissible:Bool,c:Config)->List<Parameter>{
 if !admissible||!configuration(c)||length(gradient)!=length(parameters)||!foldl(parameters,true,fn(p)=>fn(ok)=>ok&&valid(p)){return parameters;}
 let proposed=parameters.map_indexed(fn(i)=>fn(p)=>candidate(p,gradient.at_or(i,0.0),c));
 return choose(foldl(proposed,true,fn(p)=>fn(ok)=>ok&&valid(p)),proposed,parameters);
}
fn losses(parameters:List<Parameter>,features:List<f32>,targets:List<f32>,rows:List<u32>)->List<f32>{return rows.map(fn(row)=>objective(0.0,4294967295,parameters,features,targets,row));}

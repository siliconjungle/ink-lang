module ink.knowledge.neural;
import "std:autodiff" as ad;
// Reusable authored network construction. Model parameters remain ordinary data.
abstract record Network { graph:ad.Prepared, parameters:u32, features:u32, outputs:u32, }
record Shape { parameters:u32, nodes:u32, width:u32, valid:Bool, }
fn grow(s:Shape,width:u32,gated:Bool,maximum:u32)->Shape {
 if !s.valid || s.parameters>maximum || s.nodes>maximum || s.width>maximum || width>maximum {return Shape{..s,valid:false};}
 let factor:u32=choose(gated,2,1);let parameters=(s.width+1)*factor;
 let nodes=s.width*factor+1;
 let fits=width<=quot_or(maximum-s.parameters,parameters,0) && (nodes==0 || width<=quot_or(maximum-s.nodes,nodes,0));
 return choose(fits,Shape{parameters:s.parameters+parameters*width,nodes:s.nodes+nodes*width,width:width,valid:true},Shape{..s,valid:false});
}
record Layer { nodes:Buffer<ad.Node>, outputs:Buffer<u32>, parameter:u32, inputs:u32, }
record Dot { nodes:Buffer<ad.Node>, terms:List<ad.Term>, parameter:u32, }
fn dot(nodes:Buffer<ad.Node>,wires:List<u32>,inputs:u32,parameter:u32)->Dot {
 let bias=parameter+length(wires);
 var nodes:Buffer<ad.Node>=nodes;var terms:Buffer<ad.Term>=buffer([ad.Term{wire:bias,coefficient:1.0}]);var parameter:u32=parameter;
 for wire in wires {
  let product=inputs+nodes.len();nodes=nodes.push(ad.multiply(parameter,wire));
  terms=terms.push(ad.Term{wire:product,coefficient:1.0});parameter=parameter+1;
 }
 return Dot{nodes:nodes,terms:terms.freeze(),parameter:bias+1};
}
fn hidden_neuron(layer:Layer,wires:List<u32>)->Layer {
 let left=dot(layer.nodes,wires,layer.inputs,layer.parameter);
 let gate=dot(left.nodes,wires,layer.inputs,left.parameter);
 let output=layer.inputs+gate.nodes.len();
 let nodes=gate.nodes.push(ad.reglu(left.terms,0.0,gate.terms,0.0));
 return Layer{nodes:nodes,outputs:layer.outputs.push(output),parameter:gate.parameter,inputs:layer.inputs};
}
fn output_neuron(layer:Layer,wires:List<u32>)->Layer {
 let value=dot(layer.nodes,wires,layer.inputs,layer.parameter);
 let output=layer.inputs+value.nodes.len();let nodes=value.nodes.push(ad.linear(value.terms,0.0));
 return Layer{nodes:nodes,outputs:layer.outputs.push(output),parameter:value.parameter,inputs:layer.inputs};
}
fn hidden_layer(layer:Layer,width:u32,wires:List<u32>)->Layer {return repeat_until(width,layer,fn(layer)=>false,fn(i)=>fn(layer)=>hidden_neuron(layer,wires));}
fn output_layer(layer:Layer,width:u32,wires:List<u32>)->Layer {return repeat_until(width,layer,fn(layer)=>false,fn(i)=>fn(layer)=>output_neuron(layer,wires));}
fn network(features:u32,hidden:List<u32>,outputs:u32,maximum:u32)->Result<Network,String> {
 if maximum>1000000 || features>maximum {return Err("network capacity");}
 var shape:Shape=Shape{parameters:0,nodes:0,width:features,valid:true};
 for width in hidden {shape=grow(shape,width,true,maximum);}
 let shape=grow(shape,outputs,false,maximum);
 if !shape.valid || features>maximum-shape.parameters || shape.nodes>maximum-shape.parameters-features {return Err("network capacity");}
 let inputs=shape.parameters+features;
 let initial:Buffer<u32>=Buffer.empty();
 let features_wires=repeat_until(features,initial,fn(b)=>false,fn(i)=>fn(b)=>b.push(shape.parameters+i)).freeze();
 var wires:List<u32>=features_wires;
 var layer:Layer=Layer{nodes:Buffer.empty(),outputs:Buffer.empty(),parameter:0,inputs:inputs};
 for width in hidden {
  let next=hidden_layer(layer,width,wires);wires=next.outputs.freeze();
  layer=Layer{nodes:next.nodes,outputs:Buffer.empty(),parameter:next.parameter,inputs:inputs};
 }
 let final=output_layer(layer,outputs,wires);
 let nodes=final.nodes.freeze();let roots=final.outputs.freeze();
 if final.parameter!=shape.parameters {return Err("network parameter layout");}
 let graph=ad.prepare(inputs,nodes,roots,maximum)?;
 return Ok(Network{graph:graph,parameters:shape.parameters,features:features,outputs:outputs});
}
fn parameter_count(network:Network)->u32 {return network.parameters;}
fn feature_count(network:Network)->u32 {return network.features;}
fn operation_count(network:Network)->u32 {return ad.operation_count(network.graph);}
fn predict(network:Network,weights:List<f32>,features:List<f32>)->Result<List<f32>,String> {
 if length(weights)!=network.parameters || length(features)!=network.features {return Err("network input shape");}
 return ad.evaluate(network.graph,weights.concat(features));
}
fn mse_gradient(network:Network,weights:List<f32>,features:List<f32>,target:List<f32>)->Result<ad.Loss,String> {
 if length(weights)!=network.parameters || length(features)!=network.features {return Err("network input shape");}
 let result=ad.mse(network.graph,weights.concat(features),target,ad.sparse_piecewise())?;
 return Ok(ad.Loss{loss:result.loss,outputs:result.outputs,gradient:result.gradient.take(network.parameters)});
}

module neural_model;
import "std:neural" as nn;
import "std:learning" as learning;
import "std:autodiff" as ad;
fn architecture()->Result<nn.Network,String> {return nn.network(10,[6,6],4,10000);}
fn dimensions()->Result<u32,String> {let net=architecture()?;return Ok(nn.parameter_count(net));}
fn derivatives(weights:List<f32>,features:List<f32>,target:List<f32>)->Result<ad.Loss,String> {
 let net=architecture()?;return nn.mse_gradient(net,weights,features,target);
}

fn prepared(net:nn.Network,weights:List<f32>,features:List<f32>,target:List<f32>)->Result<ad.Loss,String> {
 return nn.mse_gradient(net,weights,features,target);
}
fn prediction(net:nn.Network,weights:List<f32>,features:List<f32>)->Result<List<f32>,String> {
 return nn.predict(net,weights,features);
}

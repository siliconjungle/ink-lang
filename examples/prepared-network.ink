module prepared_network;
import "std:neural" as nn;
import "std:autodiff" as ad;
// Stable architecture is captured explicitly; parameters and context can vary.
fn network()->Result<nn.Network,String>{return nn.network(10,[6,6],4,10000);}
fn predict(network:nn.Network,weights:List<f32>,context:List<f32>)->Result<List<f32>,String>{
 return nn.predict(network,weights,context);
}
fn derivatives(network:nn.Network,weights:List<f32>,context:List<f32>,target:List<f32>)->Result<ad.Loss,String>{
 return nn.mse_gradient(network,weights,context,target);
}

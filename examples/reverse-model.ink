module reverse_model;
import "std:autodiff" as ad;
fn graph()->Result<ad.Prepared,String> {
 return ad.prepare(3,[ad.multiply(0,2),ad.add_node(3,1),ad.multiply(4,4)],[5],1000);
}
fn value_and_gradient(w:List<f32>,x:f32)->Result<ad.Evaluation,String> {let plan=graph()?;return ad.vjp(plan,w.concat([x]),[1.0],ad.smooth());}

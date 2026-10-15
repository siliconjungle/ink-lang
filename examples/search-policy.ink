module search_policy;
import "std:search" as search;
import "std:learning" as learning;

record Context { weights:List<f32>, }
trainable state Learner:Result<learning.Adam,String> = learning.adam([1.0,0.0,0.0,0.0]);

fn representation(document:search.Document)->Bool {
 let index=search.field(document,document.root,"representation").fold(fn(index)=>index,fn(unit)=>4294967295);
 return search.node(document,index).kind!=0;
}
fn features(candidate:search.Candidate)->List<f32> {
 return [f32_from_f64(candidate.default_priority),f32_from_u32(length(candidate.state.nodes)),
     choose(representation(candidate.state),1.0,0.0),1.0];
}
fn valid(context:Context)->Bool {
 return length(context.weights)==4 && learning.finite(context.weights);
}
fn score(context:Context,features:List<f32>)->f32 {
 var value:f32=0.0;var index:u32=0;
 for feature in features {
  value=value+feature*context.weights.at_or(index,0.0);index=index+1;
 }
 return value;
}
// Full source/representation state is an explicit input. Another authored model
// can inspect different fields or use a network; these four features are an example.
adaptive fn priority(candidate:search.Candidate,context:Context)->f64 {
 let xs=features(candidate);
 if !valid(context) || !learning.finite(xs) {return candidate.default_priority;}
 let value=score(context,xs);
 return choose(is_finite(value),f64_from_f32(value),candidate.default_priority);
}
learn change feedback(candidate:search.Candidate,target:f32,config:learning.Config)
 ->Result<f32,String> reads(Learner) writes(Learner) {
 let state=Learner?;let context=Context{weights:state.weights};let xs=features(candidate);
 if !valid(context) || !learning.finite(xs) || !is_finite(target) {return Err("search learning domain");}
 let error=score(context,xs)-target;let loss=error*error;
 if !is_finite(loss) {return Err("nonfinite search loss");}
 let gradient=xs.map(fn(x)=>2.0*error*x);
 let next=learning.update(state,gradient,config)?;
 Learner=Ok(next);return Ok(loss);
}
query context()->Result<Context,String> reads(Learner) {
 let state=Learner?;return Ok(Context{weights:state.weights});
}

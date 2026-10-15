module reverse_primitives;
import "std:autodiff" as ad;
import "std:learning" as learning;
fn polynomial(weights:List<f32>,x:f32)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(3,[ad.multiply(0,2),ad.add_node(3,1),ad.multiply(4,4)],[5],100)?;
 return ad.vjp(plan,weights.concat([x]),[1.0],ad.smooth());
}
fn unary(kind:ad.Unary,x:f32,seed:f32,policy:ad.Policy)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(1,[ad.unary(kind,0)],[1],100)?;return ad.vjp(plan,[x],[seed],policy);
}
fn binary(kind:ad.Binary,a:f32,b:f32,seed:f32)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(2,[ad.binary(kind,0,1)],[2],100)?;return ad.vjp(plan,[a,b],[seed],ad.smooth());
}
fn affine(a:f32,b:f32)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(2,[ad.linear([ad.Term{wire:0,coefficient:2.0},ad.Term{wire:1,coefficient:-0.5},ad.Term{wire:0,coefficient:2.0}],0.25)],[2,2],100)?;
 return ad.vjp(plan,[a,b],[0.25,0.75],ad.smooth());
}
fn reglu(a:f32,b:f32,c:f32,policy:ad.Policy)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(3,[ad.reglu([ad.Term{wire:0,coefficient:1.0},ad.Term{wire:1,coefficient:0.5}],0.0,[ad.Term{wire:2,coefficient:-1.0}],0.25)],[3],100)?;
 return ad.vjp(plan,[a,b,c],[1.0],policy);
}
fn selected(gate:f32,off:f32,on:f32,policy:ad.Policy)->Result<ad.Evaluation,String> {
 let plan=ad.prepare(3,[ad.select(0,1,2)],[3],100)?;return ad.vjp(plan,[gate,off,on],[1.0],policy);
}
fn gathered(index:f32,values:List<f32>,below:Bool,above:Bool,gradient:ad.IndexGradient)->Result<ad.Evaluation,String> {
 if length(values)>1000 {return Err("table capacity");}
 let initial:Buffer<u32>=Buffer.empty();
 let table=repeat_until(length(values),initial,fn(b)=>false,fn(i)=>fn(b)=>b.push(i+1)).freeze();
 let plan=ad.prepare(length(values)+1,[ad.index_read(0,table,below,above)],[length(values)+1],2000)?;
 return ad.vjp(plan,[index].concat(values),[1.0],ad.Policy{..ad.piecewise(),index:gradient});
}
fn plan()->Result<ad.Prepared,String> {
 return ad.prepare(1,[ad.literal(-1.0),ad.square_root(1),ad.multiply(0,0)],[3],100);
}
fn retained()->Result<u32,String> {let p=plan()?;return Ok(ad.operation_count(p));}
fn prepared(x:f32)->Result<List<f32>,String> {let p=plan()?;return ad.evaluate(p,[x]);}
fn read_plan(plan:ad.Prepared,x:List<f32>)->Result<List<f32>,String> {return ad.evaluate(plan,x);}
fn invalid(which:u32)->Result<u32,String> {
 let plan=choose(which==0,ad.prepare(1,[ad.add_node(0,2)],[],10),
  choose(which==1,ad.prepare(1,[ad.add_node(0,0)],[2],10),
   choose(which==2,ad.prepare(1,[ad.add_node(0,0)],[1],1),ad.prepare(4294967295,[ad.add_node(0,0)],[],4294967295))))?;
 return Ok(ad.operation_count(plan));
}

fn optimizer(weights:List<f32>)->Result<learning.Adam,String> {return learning.adam(weights);}
fn optimizer_update(state:learning.Adam,gradient:List<f32>,config:learning.Config)->Result<learning.Adam,String> {return learning.update(state,gradient,config);}
fn optimizer_config(rate:f32)->learning.Config {return learning.configuration(rate);}

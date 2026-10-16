module constant_work;
import "std:learning" as opt;
fn affine(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*1.125+0.125);}
fn initial(weights:List<f32>)->Result<opt.Adam,String>{return opt.adam(weights);}
fn train(state:opt.Adam,gradient:List<f32>)->Result<opt.Adam,String>{return opt.update(state,gradient,opt.configuration(0.001));}
fn binary64_control(xs:List<f64>)->f64{return foldl(xs,0.0f64,fn(x)=>fn(sum)=>sum+x*1.125f64+0.125f64);}

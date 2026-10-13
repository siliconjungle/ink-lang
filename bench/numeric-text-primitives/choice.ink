module choice_workload;
pub fn run(xs:List<f32>,mode:Bool)->List<f32>{return xs.map(fn(x)=>sqrt(choose(mode,x,x*x)));}

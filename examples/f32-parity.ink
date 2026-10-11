module f32_parity;
fn plus(xs:List<f32>,y:f32)->List<f32>{return xs.map(fn(x)=>x+y);}
fn minus(xs:List<f32>,y:f32)->List<f32>{return xs.map(fn(x)=>x-y);}
fn times(xs:List<f32>,y:f32)->List<f32>{return xs.map(fn(x)=>x*y);}
fn ordered(xs:List<f32>,y:f32)->List<Bool>{return xs.map(fn(x)=>choose(x<=y,x==y,x!=y));}
fn negative(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>-x);}
fn total(xs:List<f32>)->f32{return sum(xs);}
fn owned(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>buffer_fill(3,x).map_parallel(1,fn(i)=>fn(v)=>v*1.5).at_or(0,0.0));}
query identity(x:f32)->f32{return x;}

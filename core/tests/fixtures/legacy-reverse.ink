module LegacyReverse;
record Pair { a:f32,b:f32, }
fn objective(w:Pair,c:f32)->f32 {let p=w.a*w.b;return p*p+c*w.a;}
fn derivative(w:Pair,c:f32,maximum:u32,stop:Bool)->Result<Pair,String> {return reverse_gradient(objective,w,maximum,stop,c);}
fn primal(w:Pair,c:f32,maximum:u32,stop:Bool)->Result<f32,String> {return reverse_linearize(objective,w,maximum,stop,c).map(fn(r)=>r.value);}
fn objective64(x:f64)->f64 {return x*x;}
fn derivative64(x:f64)->Result<f64,String> {return reverse_gradient(objective64,x,16,true);}

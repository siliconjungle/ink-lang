module CapturedCalls;
record Parameters {a:f32,b:f32,c:f32,d:f32,}
record Sample {x:f32,y:f32,z:f32,bias:f32,}
fn predict(p:Parameters, xs:List<Sample>)->List<f32> {
 return xs.map(fn(s)=>(p.a*s.x+p.b*s.y)+(p.c*s.z+p.d*s.bias));
}
fn identity(xs:List<f32>)->List<f32>{return xs;}

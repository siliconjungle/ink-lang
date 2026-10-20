module EngineGate;
record Pair { a:f32,b:f32, }
record Weights { p:Pair,q:Pair,r:Pair,s:Pair,t:Pair,u:Pair, }
fn energy(w:Weights,x:f32)->f32 {
 let a=w.p.a-x;let b=w.p.b+x;let c=w.q.a-x;let d=w.q.b+x;
 let e=w.r.a-x;let f=w.r.b+x;let g=w.s.a-x;let h=w.s.b+x;
 let i=w.t.a-x;let j=w.t.b+x;let k=w.u.a-x;let l=w.u.b+x;
 return a*a+b*b+c*c+d*d+e*e+f*f+g*g+h*h+i*i+j*j+k*k+l*l;
}
fn derivatives(w:Weights,x:f32)->Weights {return gradient(energy,w,x);}
fn step(w:Weights,x:f32,rate:f32)->Weights {
 let g=derivatives(w,x);
 return Weights{
 p:Pair{a:w.p.a-rate*g.p.a,b:w.p.b-rate*g.p.b},
 q:Pair{a:w.q.a-rate*g.q.a,b:w.q.b-rate*g.q.b},
 r:Pair{a:w.r.a-rate*g.r.a,b:w.r.b-rate*g.r.b},
 s:Pair{a:w.s.a-rate*g.s.a,b:w.s.b-rate*g.s.b},
 t:Pair{a:w.t.a-rate*g.t.a,b:w.t.b-rate*g.t.b},
 u:Pair{a:w.u.a-rate*g.u.a,b:w.u.b-rate*g.u.b}};
}
fn forecast(w:Weights,xs:List<f32>)->List<f32> {return xs.map(fn(x)=>energy(w,x));}

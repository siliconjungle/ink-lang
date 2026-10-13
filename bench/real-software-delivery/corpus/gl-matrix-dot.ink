module VecDot;
record V { x:f32,y:f32,z:f32, }
record Pair { a:V,b:V, }
pub fn run(xs:List<Pair>)->List<f32>{return xs.map(fn(p)=>p.a.x*p.b.x+p.a.y*p.b.y+p.a.z*p.b.z);}

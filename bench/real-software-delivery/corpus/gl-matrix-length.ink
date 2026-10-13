module VecLength;
record V { x:f32,y:f32,z:f32, }
pub fn run(xs:List<V>)->List<f32>{return xs.map(fn(a)=>a.x*a.x+a.y*a.y+a.z*a.z);}

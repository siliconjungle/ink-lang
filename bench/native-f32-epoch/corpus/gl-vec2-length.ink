module Length; record V{x:f32,y:f32,}pub fn run(xs:List<V>)->List<f32>{return xs.map(fn(p)=>sqrt(p.x*p.x+p.y*p.y));}

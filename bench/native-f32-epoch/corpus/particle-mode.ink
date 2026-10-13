module ParticleMode; record V{x:f32,y:f32,z:f32,}pub fn run(xs:List<V>,mode:Bool)->List<f32>{return xs.map(fn(v)=>choose(mode,v.x*v.x+v.y*v.y+v.z*v.z,v.x+v.y+v.z));}

module PointBounds;
record P { x:f32,y:f32,z:f32, }
record Bounds { valid:Bool,min:P,max:P, }
pub fn run(xs:List<P>)->Bounds{return foldl(xs,Bounds{valid:false,min:P{x:0.0,y:0.0,z:0.0},max:P{x:0.0,y:0.0,z:0.0}},fn(p)=>fn(a)=>Bounds{valid:true,min:P{x:choose(!a.valid || p.x<a.min.x,p.x,a.min.x),y:choose(!a.valid || p.y<a.min.y,p.y,a.min.y),z:choose(!a.valid || p.z<a.min.z,p.z,a.min.z)},max:P{x:choose(!a.valid || p.x>a.max.x,p.x,a.max.x),y:choose(!a.valid || p.y>a.max.y,p.y,a.max.y),z:choose(!a.valid || p.z>a.max.z,p.z,a.max.z)}});}

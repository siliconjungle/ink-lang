module call_boundaries;
record Body{x:f32,y:f32,vx:f32,vy:f32,}
fn scalar(x:f32,y:f32)->f32{return x*y+x;}
fn shift(xs:List<f32>,amount:f32)->List<f32>{return xs.map(fn(x)=>x+amount);}
fn advance(b:Body,dt:f32)->Body{return Body{x:b.x+b.vx*dt,y:b.y+b.vy*dt,vx:b.vx,vy:b.vy};}
fn move(bs:List<Body>,dt:f32)->List<Body>{return bs.map(fn(b)=>advance(b,dt));}
fn indexed(keys:List<u32>,xs:List<u32>)->List<Bool>{let table:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));return xs.map(fn(x)=>table.contains(x));}

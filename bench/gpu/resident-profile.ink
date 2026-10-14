module resident_profile;
record Particle{x:u32,y:u32,vx:u32,vy:u32,}
fn ecs(rows:List<Particle>)->List<Particle>{return rows.map(fn(p)=>Particle{x:p.x+p.vx,y:p.y+p.vy,vx:p.vx,vy:p.vy});}
record Body{x:f32,y:f32,vx:f32,vy:f32,}
fn physics(rows:List<Body>,dt:f32,gravity:f32)->List<Body>{return rows.map(fn(b)=>Body{x:b.x+b.vx*dt,y:if b.y+(b.vy+gravity*dt)*dt<0.0 {0.0} else {b.y+(b.vy+gravity*dt)*dt},vx:b.vx,vy:if b.y+(b.vy+gravity*dt)*dt<0.0 {0.0-(b.vy+gravity*dt)} else {b.vy+gravity*dt}});}

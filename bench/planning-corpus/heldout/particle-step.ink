module frozen_software;
record Particle { x:f32,y:f32,vx:f32,vy:f32,active:Bool, }
pub fn run(xs:List<Particle>,dt:f32)->List<Particle>{return xs.map(fn(p)=>Particle{x:p.x+p.vx*dt,y:p.y+p.vy*dt,vx:p.vx,vy:p.vy,active:p.active});}

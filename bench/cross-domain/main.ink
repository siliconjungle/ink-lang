module cross_domain;
import "../../knowledge/libraries/workload_kernels.ink" as k;
fn ecs(xs:List<k.Particle>)->List<k.Particle>{return k.ecs_step(xs);}
fn game(xs:List<k.Transform>)->List<k.Point>{return k.propagate(xs);}
fn compiler(xs:List<u32>)->List<k.Token>{return k.lex(xs);}
fn database(xs:List<k.Row>,groups:u32)->List<u32>{return k.group_sum(xs,groups);}
fn rendering(xs:List<k.Box>,view:k.Box)->List<u32>{return k.visible(xs,view);}
fn math(a:List<u32>,b:List<u32>,side:u32)->List<u32>{return k.matmul(a,b,side);}
fn pathfinding(grid:List<u32>,width:u32,start:u32)->List<u32>{return k.distances(grid,width,start);}
fn physics(xs:List<k.Body>,dt:f32,g:f32)->List<k.Body>{return k.integrate(xs,dt,g);}

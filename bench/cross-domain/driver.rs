use std::hint::black_box;
use std::time::Instant;

// Aliases for checked generated carriers are prepended by run.py. Controls use
// independent implementations, with identical owned-input ingestion and output
// destruction in the timed calls. These controls are NOT upstream libraries.
#[inline(never)]
fn control_ecs(mut xs:Vec<Particle>)->Vec<Particle>{
 for p in &mut xs {p.l_x=p.l_x.wrapping_add(p.l_vx);p.l_y=p.l_y.wrapping_add(p.l_vy);}xs
}
#[inline(never)]
fn control_game(xs:Vec<Transform>)->Vec<Point>{
 let mut out:Vec<Point>=Vec::with_capacity(xs.len());
 for (i,p) in xs.iter().enumerate(){let (x,y)=if (p.l_parent as usize)<i{let a=&out[p.l_parent as usize];(a.l_x,a.l_y)}else{(0,0)};out.push(Point{l_x:x.wrapping_add(p.l_x),l_y:y.wrapping_add(p.l_y)});}out
}
#[inline(never)]
fn control_compiler(xs:Vec<u32>)->Vec<Token>{
 let mut out=Vec::new();let mut i=0;
 while i<xs.len(){let c=xs[i];if [9,10,13,32].contains(&c){i+=1;continue;}
  let start=i;let alpha=|v:u32| v==95||(65..=90).contains(&v)||(97..=122).contains(&v);let digit=|v:u32|(48..=57).contains(&v);
  let kind=if alpha(c){1}else if digit(c){2}else{3};i+=1;
  while i<xs.len() && (kind==1&&(alpha(xs[i])||digit(xs[i]))||kind==2&&digit(xs[i])){i+=1;}
  out.push(Token{l_start:start as u32,l_end:i as u32,l_kind:kind});
 }out
}
#[inline(never)]
fn control_database(xs:Vec<Row>,groups:u32)->Vec<u32>{let mut out=vec![0u32;groups as usize];for r in xs{if let Some(v)=out.get_mut(r.l_key as usize){*v=v.wrapping_add(r.l_value);}}out}
#[inline(never)]
fn control_rendering(xs:Vec<Bounds>,v:Bounds)->Vec<u32>{xs.iter().enumerate().filter(|(_,b)|b.l_min_x<=v.l_max_x&&b.l_max_x>=v.l_min_x&&b.l_min_y<=v.l_max_y&&b.l_max_y>=v.l_min_y).map(|(i,_)|i as u32).collect()}
#[inline(never)]
fn control_math(a:Vec<u32>,b:Vec<u32>,n:u32)->Vec<u32>{let mut out=vec![0u32;(n as usize)*(n as usize)];for i in 0..n{for j in 0..n{for k in 0..n{let x=a.get(i.wrapping_mul(n).wrapping_add(k)as usize).copied().unwrap_or(0);let y=b.get(k.wrapping_mul(n).wrapping_add(j)as usize).copied().unwrap_or(0);out[(i*n+j)as usize]=out[(i*n+j)as usize].wrapping_add(x.wrapping_mul(y));}}}out}
#[inline(never)]
fn control_pathfinding(grid:Vec<u32>,width:u32,start:u32)->Vec<u32>{
 let n=grid.len();let w=width as usize;let mut out=vec![u32::MAX;n];
 if w==0||n%w!=0||start as usize>=n||grid[start as usize]!=0{return out;}
 let mut q=std::collections::VecDeque::new();q.push_back(start as usize);out[start as usize]=0;
 while let Some(p)=q.pop_front(){let x=p%w;let y=p/w;let ns=[if x>0{p-1}else{p},if x+1<w{p+1}else{p},if y>0{p-w}else{p},if p+w<n{p+w}else{p}];for t in ns{if grid[t]==0&&out[t]==u32::MAX{out[t]=out[p]+1;q.push_back(t);}}}out
}
#[cfg(upstream_pathfinding)]
#[inline(never)]
fn upstream_pathfinding(grid:Vec<u32>,width:u32,start:u32)->Vec<u32>{
 let n=grid.len();let w=width as usize;let mut out=vec![u32::MAX;n];
 if w==0||n%w!=0||start as usize>=n||grid[start as usize]!=0{return out;}
 let costs=pathfinding::directed::dijkstra::dijkstra_all(&(start as usize),|&p|{
  let x=p%w;
  [if x>0{Some(p-1)}else{None},if x+1<w{Some(p+1)}else{None},if p>=w{Some(p-w)}else{None},if p+w<n{Some(p+w)}else{None}]
   .map(|t|t.filter(|&t|grid[t]==0)).into_iter().flatten().map(|t|(t,1u32))
 });
 for (node,(_,cost))in costs{out[node]=cost;}out[start as usize]=0;out
}
#[cfg(upstream_pathfinding)]
#[inline(never)]
fn upstream_bfs(grid:Vec<u32>,width:u32,start:u32)->Vec<u32>{
 let n=grid.len();let w=width as usize;let mut out=vec![u32::MAX;n];
 if w==0||n%w!=0||start as usize>=n||grid[start as usize]!=0{return out;}
 out[start as usize]=0;
 pathfinding::directed::bfs::bfs_reach(start as usize,|&p|{
  let x=p%w;let next=out[p]+1;
  [if x>0{Some(p-1)}else{None},if x+1<w{Some(p+1)}else{None},if p>=w{Some(p-w)}else{None},if p+w<n{Some(p+w)}else{None}]
   .map(|t|t.filter(|&t|grid[t]==0)).map(|t|{if let Some(t)=t{if out[t]==u32::MAX{out[t]=next;}}t}).into_iter().flatten()
 }).for_each(drop);
 out
}
#[inline(never)]
fn control_physics_finite(mut xs:Vec<Body>,dt:f32,g:f32)->Vec<Body>{for b in &mut xs{let vy=b.l_vy+g*dt;let y=b.l_y+vy*dt;b.l_x=b.l_x+b.l_vx*dt;b.l_y=if y<0.0{0.0}else{y};b.l_vy=if y<0.0{0.0-vy}else{vy};}xs}
#[inline]
fn canonical(x:f32)->f32{if x.is_nan(){f32::from_bits(0x7fc00000)}else{x}}
#[inline(never)]
fn control_physics(mut xs:Vec<Body>,dt:f32,g:f32)->Vec<Body>{
 for b in &mut xs{
  let vy=canonical(b.l_vy+canonical(g*dt));let y=canonical(b.l_y+canonical(vy*dt));
  b.l_x=canonical(b.l_x+canonical(b.l_vx*dt));b.l_y=if y<0.0{0.0}else{y};
  b.l_vy=if y<0.0{canonical(0.0-vy)}else{vy};
 }xs
}


fn measure<T,F:FnMut()->Vec<T>>(f:&mut F,repetitions:u32)->f64{
 let start=Instant::now();for _ in 0..repetitions{drop(black_box(f()));}start.elapsed().as_nanos()as f64/repetitions as f64
}
fn bench<T:PartialEq+std::fmt::Debug,A:FnMut()->Vec<T>,B:FnMut()->Vec<T>>(name:&str,n:usize,mut ink:A,mut control:B){
 assert_eq!(ink(),control(),"full output mismatch: {name} {n}");
 let calibration=measure(&mut ink,1).max(measure(&mut control,1));
 let repetitions=(3_000_000.0/calibration).clamp(1.0,1000.0)as u32;
 let mut a=Vec::new();let mut b=Vec::new();
 for round in 0..11{if round%2==0{a.push(measure(&mut ink,repetitions));b.push(measure(&mut control,repetitions));}else{b.push(measure(&mut control,repetitions));a.push(measure(&mut ink,repetitions));}}
 assert_eq!(ink(),control(),"post timing mismatch: {name} {n}");
 println!("{}",serde_json::json!({"domain":name,"n":n,"repetitions":repetitions,"ink_ns":a,"rust_control_ns":b,"comparator":if name.contains("upstream_bfs"){"pathfinding::bfs_reach"}else if name.contains("upstream_dijkstra"){"pathfinding::dijkstra_all"}else if name=="physics_finite_native"{"native f32 on finite benchmark inputs; no NaN canonicalization"}else{"independent Rust control with matching value semantics"},"validated":true}));
}
fn main(){let state=State::new();
 for n in [0,16,1024,4096,16384]{
  let xs:Vec<_>=(0..n).map(|i|Particle{l_x:(i as u32).wrapping_mul(0xffff_fff1),l_y:i as u32,l_vx:(i%7)as u32,l_vy:3}).collect();
  bench("ecs",n,||state.function_l_ecs(black_box(xs.clone())),||control_ecs(black_box(xs.clone())));
  let ts:Vec<_>=(0..n).map(|i|Transform{l_parent:if i%17==0{u32::MAX}else{((i-1)/2)as u32},l_x:i as u32,l_y:3}).collect();
  bench("game_engine",n,||state.function_l_game(black_box(ts.clone())),||control_game(black_box(ts.clone())));
  let text=b"let position_12 = velocity + 12345;\n";let bytes:Vec<u32>=(0..n).map(|i|text[i%text.len()]as u32).collect();
  bench("compiler",n,||state.function_l_compiler(black_box(bytes.clone())),||control_compiler(black_box(bytes.clone())));
  let rows:Vec<_>=(0..n).map(|i|Row{l_key:((i*17)%67)as u32,l_value:(i as u32).wrapping_mul(0xffff_ffff)}).collect();
  bench("database",n,||state.function_l_database(black_box(rows.clone()),black_box(64)),||control_database(black_box(rows.clone()),black_box(64)));
  let bounds:Vec<_>=(0..n).map(|i|Bounds{l_min_x:((i*13)%1024)as u32,l_min_y:((i*73)%1024)as u32,l_max_x:((i*13)%1024+16)as u32,l_max_y:((i*73)%1024+16)as u32}).collect();let view=Bounds{l_min_x:200,l_min_y:200,l_max_x:800,l_max_y:800};
  bench("rendering",n,||state.function_l_rendering(black_box(bounds.clone()),black_box(view.clone())),||control_rendering(black_box(bounds.clone()),black_box(view.clone())));
  let bodies:Vec<_>=(0..n).map(|i|Body{l_x:i as f32,l_y:(i%97)as f32/8.0,l_vx:(i%5)as f32,l_vy:-2.0}).collect();
  bench("physics",n,||state.function_l_physics(black_box(bodies.clone()),black_box(0.125),black_box(-9.0)),||control_physics(black_box(bodies.clone()),black_box(0.125),black_box(-9.0)));
  bench("physics_finite_native",n,||state.function_l_physics(black_box(bodies.clone()),black_box(0.125),black_box(-9.0)),||control_physics_finite(black_box(bodies.clone()),black_box(0.125),black_box(-9.0)));
 }
 for side in [0,4,16,32,64]{let n=side*side;let a:Vec<u32>=(0..n).map(|i|(i as u32).wrapping_mul(0xffff_fff1)).collect();let b:Vec<u32>=(0..n).map(|i|(i%13)as u32).collect();bench("math",side,||state.function_l_math(black_box(a.clone()),black_box(b.clone()),black_box(side as u32)),||control_math(black_box(a.clone()),black_box(b.clone()),black_box(side as u32)));}
 for width in [0,4,16,64,128]{let n=width*width;let grid:Vec<u32>=(0..n).map(|i|if i>0&&i%11==0{1}else{0}).collect();bench("pathfinding",n,||state.function_l_pathfinding(black_box(grid.clone()),black_box(width as u32),black_box(0)),||control_pathfinding(black_box(grid.clone()),black_box(width as u32),black_box(0)));}
 #[cfg(upstream_pathfinding)]
 for width in [4,16,64,128]{let n=width*width;let grid:Vec<u32>=(0..n).map(|i|if i>0&&i%11==0{1}else{0}).collect();bench("pathfinding_vs_upstream_dijkstra_all",n,||state.function_l_pathfinding(black_box(grid.clone()),black_box(width as u32),black_box(0)),||upstream_pathfinding(black_box(grid.clone()),black_box(width as u32),black_box(0)));bench("pathfinding_vs_upstream_bfs_reach",n,||state.function_l_pathfinding(black_box(grid.clone()),black_box(width as u32),black_box(0)),||upstream_bfs(black_box(grid.clone()),black_box(width as u32),black_box(0)));}
}

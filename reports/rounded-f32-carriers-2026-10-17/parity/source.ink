module FloatIslands;
record R{x:f32,y:f32,z:f32,}
record Seen{value:f32,bits:u32,negative:u32,}
trainable state Weights:Table<u32,f32>=Table.empty();
state Count:Table<u32,u32>=Table.empty();
event changed:u32;
event computed:Seen;
fn tree(x:f32,y:f32,z:f32)->f32{return (x*y+z)*(x-y);}
fn chain(x:f32,y:f32,z:f32)->f32{let a=x*y;let b=a+z;return b*a-b;}
fn observe(x:f32,y:f32,z:f32)->Seen{
 let a=x*y;let b=a+z;return Seen{value:b*a,bits:f32_bits(a),negative:f32_bits(-a)};
}
fn stop(x:f32,y:f32)->u32{let a=x*y;let b=a+x;return f32_bits(-a);}
fn branch(x:f32,y:f32,pick:Bool)->f32{let a=x*y;return choose(pick,a+x,-a);}
fn fields(r:R,pick:Bool)->f32{return choose(pick,r.x*r.y+r.z,0.0);}
fn probe(x:f32)->f32{return x;}
fn lazy(x:f32,pick:Bool)->f32{return choose(pick,probe(x)*x+x,0.0);}
fn order(x:f32,y:f32)->f32{return probe(x)*probe(y)+probe(x);}
fn dot(xs:List<f32>,ys:List<f32>)->f32{
 return repeat_until(length(xs),0.0,fn(sum)=>false,
  fn(i)=>fn(sum)=>sum+xs.at_or(i,0.0)*ys.at_or(i,0.0));
}
fn rows(xs:List<R>)->List<f32>{return xs.map(fn(p)=>p.x*p.y+p.z);}
fn identity(x:f32)->f32{return x;}
fn sums(x:f32,y:f32,xs:List<f32>)->f32{let a=x*y;return foldl(xs,a,fn(x)=>fn(s)=>s*x+a);}
fn parallel(x:f32,y:f32,xs:List<f32>)->List<f32>{let a=x*y;return parallel_map(xs,1,fn(i)=>fn(x)=>a+x);}
fn shadow(x:f32,y:f32,xs:List<f32>)->f32{let a=x*y;return foldl(xs,0.0,fn(a)=>fn(s)=>s+a);}
learn change tune(x:f32)->Unit writes(Weights){Weights.put(0,x);return ();}
learn change fit(x:f32,y:f32,z:f32,fail:Bool)->Result<Unit,String> writes(Weights){
 Weights.put(0,chain(x,y,z));if fail{return Err("rollback");}return Ok(());
}
query direct(x:f32,y:f32,z:f32)->Seen{
 return Seen{value:(x*y+z)*(x-y),bits:f32_bits(x*y+z),negative:f32_bits(-(x*y+z))};
}
learn change fit_inline(x:f32,y:f32,z:f32,fail:Bool)->Result<Unit,String> writes(Weights){
 Weights.put(0,(x*y+z)*(x-y));if fail{return Err("rollback");}return Ok(());
}
query read(y:f32,z:f32)->Seen reads(Weights){return observe(Weights.get(0).unwrap_or(0.0),y,z);}
change frame(y:f32,z:f32,fail:Bool)->Result<Seen,String> reads(Weights,Count) writes(Count) emits(changed,computed){
 let n=Count.get(0).unwrap_or(0)+1;Count.put(0,n);emit changed(n);
 let value=observe(Weights.get(0).unwrap_or(0.0),y,z);
 emit computed(value);
 if fail{return Err("rollback");}return Ok(value);
}

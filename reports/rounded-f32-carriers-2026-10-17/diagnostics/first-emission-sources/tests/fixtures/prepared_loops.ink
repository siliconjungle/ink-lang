module PreparedLoops;
fn lookup(keys:List<u32>,q:u32)->Bool {
 let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return index.contains(q);
}
fn mapped(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(q)=>lookup(keys,q));}
fn indexed(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map_indexed(fn(i)=>fn(q)=>lookup(keys,q+i));}
fn filtered(keys:List<u32>,qs:List<u32>)->List<u32> {return qs.filter(fn(q)=>lookup(keys,q));}
fn left(keys:List<u32>,qs:List<u32>)->u32 {return foldl(qs,0,fn(q)=>fn(s)=>s*3+choose(lookup(keys,q),q,0));}
fn right(keys:List<u32>,qs:List<u32>)->u32 {return foldr(qs,0,fn(q)=>fn(s)=>s*3+choose(lookup(keys,q),q,0));}
fn early(keys:List<u32>,qs:List<u32>)->u32 {return fold_until(qs,0,fn(q)=>fn(s)=>lookup(keys,q),fn(q)=>fn(s)=>s*3+q);}
fn repeated(keys:List<u32>,n:u32,maximum:u32,weight:u32)->u32 {
 return repeat_until(n,0,fn(s)=>s>=maximum,fn(i)=>fn(s)=>s+choose(lookup(keys,i),weight,1));
}
fn nested(keys:List<u32>,qs:List<List<u32>>)->List<List<Bool>> {return qs.map(fn(items)=>items.map(fn(q)=>lookup(keys,q)));}
fn shadowed(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(keys)=>lookup([keys],keys));}
fn nested_shadowed(keys:List<u32>,qs:List<List<u32>>)->List<List<Bool>> {return qs.map(fn(keys)=>keys.map(fn(q)=>lookup(keys,q)));}
fn guarded(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(q)=>choose(q==0,false,lookup(keys,q)));}
fn conjunction(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(q)=>q>0 && lookup(keys,q));}
fn disjunction(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(q)=>q==0 || lookup(keys,q));}
fn floating(keys:List<u32>,xs:List<f32>)->List<f32> {
 return xs.map(fn(x)=>f32_div(choose(lookup(keys,u32_from_f32(x).fold(fn(i)=>i,fn(u)=>0)),x+0.25,-x),2.0));
}
fn growing(keys:List<u32>,n:u32)->List<Bool> {let initial:List<Bool>=[];return repeat_until(n,initial,fn(s)=>false,fn(i)=>fn(s)=>s.concat([lookup(keys,i)]));}
fn bounded(x:u32)->Result<u32,String> requires(x<2,"limit") {return Ok(x+1);}
fn repeat_stop(keys:List<u32>,n:u32)->Result<u32,String> {
 let initial:Result<u32,String>=Ok(2);
 return repeat_until(n,initial,fn(s)=>s.fold(fn(x)=>lookup(keys,x),fn(e)=>true),fn(i)=>fn(s)=>s.fold(fn(x)=>bounded(x),fn(e)=>Err(e)));
}
fn fold_stop(keys:List<u32>,qs:List<u32>)->Result<u32,String> {
 let initial:Result<u32,String>=Ok(2);
 return fold_until(qs,initial,fn(q)=>fn(s)=>s.fold(fn(x)=>lookup(keys,x),fn(e)=>true),fn(q)=>fn(s)=>s.fold(fn(x)=>bounded(x),fn(e)=>Err(e)));
}
// Captured mutable owners and owned carried state retain ordinary loan checks.
fn owners(keys:List<u32>,qs:List<u32>)->List<Bool> {
 let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return qs.map(fn(q)=>index.contains(q));
}
fn owned_state(keys:List<u32>,qs:List<u32>)->List<u32> {
 let initial:Buffer<u32>=Buffer.empty();
 let values=foldl(qs,initial,fn(q)=>fn(b)=>b.push(choose(lookup(keys,q),q,0)));
 return values.freeze();
}

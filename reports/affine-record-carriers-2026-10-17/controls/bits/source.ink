module OwnedRecords;
record Scratch{left:Buffer<f32>,right:Buffer<f32>,history:List<f32>,total:f32,}
record Out{left:List<f32>,right:List<f32>,history:List<f32>,source:List<f32>,total:f32,}
record Indexed{index:Map<u32,f32>,values:Buffer<f32>,total:f32,}
record Plain{a:u32,b:u32,}
record Nested{scratch:Scratch,marker:f32,}
fn advance(i:u32,s:Scratch,w:f32)->Scratch{
 let a=s.left.borrow_range(0,2,fn(view)=>view.at_or(0,0.0));let b=s.right.at_or(i,0.0);
 let total=(a*w+b)+s.total;
 return choose(rem_or(i,2,0)==0,
  Scratch{left:s.right.push(total),right:s.left.push(-total),history:s.history.concat([total]),total:total},
  Scratch{left:s.left.push(total),right:s.right.push(-total),history:s.history.concat([total]),total:total});
}
fn identity(s:Scratch)->Scratch{return s;}
fn finish(s:Scratch,source:List<f32>)->Out{
 return Out{left:s.left.freeze(),right:s.right.freeze(),history:s.history,source:source,total:s.total};
}
fn run(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let initial=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 let result=repeat_until(n,identity(initial),fn(s)=>false,fn(i)=>fn(s)=>advance(i,s,w));
 return finish(result,xs);
}
fn until(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let initial=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 let result=repeat_until(n,initial,fn(s)=>s.left.len()>=5,fn(i)=>fn(s)=>advance(i,s,w));
 return finish(result,xs);
}
fn reordered(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let initial=Scratch{right:buffer(ys),total:w,history:xs,left:buffer(xs)};
 return finish(repeat_until(n,initial,fn(s)=>false,fn(i)=>fn(s)=>advance(i,s,w)),xs);
}
fn parallel(xs:List<f32>,w:f32,n:u32)->List<Out>{
 let keys:List<u32>=[0,1,2];
 return parallel_map(keys,1,fn(i)=>fn(k)=>run(xs,[f32_from_u32(k)],w,n));
}
fn index_step(i:u32,s:Indexed,w:f32)->Indexed{
 let previous=s.index.get_or(rem_or(i,3,0),w);
 return Indexed{index:s.index.set(rem_or(i,3,0),previous+w),values:s.values.push(previous),total:s.total+previous};
}
fn indexed(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let index:Map<u32,f32>=Map.empty();
 let initial=Indexed{index:index,values:buffer(xs),total:-0.0};
 let result=repeat_until(n,initial,fn(s)=>false,fn(i)=>fn(s)=>index_step(i,s,w));
 return Out{left:result.values.freeze(),right:result.index.values(),history:xs,source:ys,total:result.total};
}
fn folded_left(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let keys:List<u32>=[0,1,2,3,4,5];
 let initial=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 return finish(foldl(keys.take(n),initial,fn(i)=>fn(s)=>advance(i,s,w)),xs);
}
fn folded_right(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let keys:List<u32>=[0,1,2,3,4,5];
 let initial=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 return finish(foldr(keys.take(n),initial,fn(i)=>fn(s)=>advance(i,s,w)),xs);
}
fn folded_until(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let keys:List<u32>=[0,1,2,3,4,5];
 let initial=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 return finish(fold_until(keys,initial,fn(i)=>fn(s)=>i==n||s.left.len()>=5,fn(i)=>fn(s)=>advance(i,s,w)),xs);
}
fn borrowed_fold(xs:List<u32>,initial:Plain)->u32{
 let result=foldl(xs,initial,fn(x)=>fn(s)=>Plain{a:x,b:s.b});return result.a;
}
fn borrowed_stop(xs:List<u32>,initial:Plain)->u32{
 let result=fold_until(xs,initial,fn(x)=>fn(s)=>s.a==7,fn(x)=>fn(s)=>Plain{a:x,b:s.b});return result.a;
}
fn nested_finish(outer:Nested,source:List<f32>)->Out{
 let s=outer.scratch;let marker=outer.marker;return finish(advance(0,s,marker),source);
}
fn nested(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{
 let s=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:-0.0};
 return nested_finish(Nested{scratch:s,marker:w},xs);
}
fn wide(s:Scratch)->Scratch{let xs:List<f32>=[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];return Scratch{left:s.left.push(xs.at_or(9,0.0)),right:s.right,history:s.history,total:s.total};}fn fallback(xs:List<f32>,ys:List<f32>,w:f32,n:u32)->Out{let s=Scratch{left:buffer(xs),right:buffer(ys),history:xs,total:w};return finish(wide(s),xs);}
trainable state Rows:Table<u32,List<f32>>=Table.empty();event computed:Out;
learn change seed(xs:List<f32>)->Unit writes(Rows){Rows.put(0,xs);return ();}
adaptive query read(xs:List<f32>,w:f32,n:u32)->Out reads(Rows){return run(xs,Rows.get(0).unwrap_or([]),w,n);}
learn change fit(xs:List<f32>,w:f32,n:u32,fail:Bool)->Result<Out,String> reads(Rows) writes(Rows) emits(computed){let result=run(xs,Rows.get(0).unwrap_or([]),w,n);Rows.put(0,result.left);emit computed(result);if fail{return Err("rollback");}return Ok(result);}
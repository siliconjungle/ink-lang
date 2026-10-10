module LocalCollectionOptimisation;

fn copy_roundtrip(xs:List<u32>)->List<u32>{return buffer(xs).freeze();}
fn copy_length(xs:List<u32>)->u32{return buffer(xs).len();}
fn copy_get(xs:List<u32>,i:u32,fallback:u32)->u32{return buffer(xs).at_or(i,fallback);}
fn visible(xs:List<u32>,low:u32,high:u32)->List<u32>{
    return xs.filter(fn(x)=>x>=low).filter(fn(x)=>x<high);
}
fn unchanged(xs:List<u32>)->List<u32>{return xs.filter(fn(x)=>true);}
fn zero(x:u32)->u32{return repeat_until(0,x,fn(a)=>a==9,fn(i)=>fn(a)=>a+i+1);}
fn pre_stopped(limit:u32,x:u32)->u32{return repeat_until(limit,x,fn(a)=>true,fn(i)=>fn(a)=>a+i+1);}
fn guarded_zero(limit:u32,x:u32)->u32{
    return choose(limit==0,repeat_until(limit,x,fn(a)=>a==9,fn(i)=>fn(a)=>a+i+1),x);
}
fn already_done(limit:u32,x:u32,goal:u32)->u32{
    return choose(x>=goal,repeat_until(limit,x,fn(a)=>a>=goal,fn(i)=>fn(a)=>a+i+1),x);
}
fn running(limit:u32,x:u32)->u32{
    return repeat_until(limit,x,fn(a)=>false,fn(i)=>fn(a)=>a+i+1);
}

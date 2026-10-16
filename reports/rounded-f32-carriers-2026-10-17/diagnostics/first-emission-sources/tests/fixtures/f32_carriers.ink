module f32_carriers;
record Pair { x:f32,y:f32, }
fn helper(x:f32,y:f32)->f32 {let a=x;let alias=a;return (alias+y)*a;}
fn aliases(x:f32,y:f32,n:u32)->List<f32> {
    let a=x;let alias=a;let x=y;
    return [a,alias,x,helper(a,x),-alias,f32_from_bits(f32_bits(alias))];
}
fn loops(x:f32,y:f32,n:u32)->List<f32> {
    let xs=[x,y,-x];
    let left=foldl(xs,x,fn(v)=>fn(s)=>(s+v)*y);
    let right=foldr(xs,y,fn(v)=>fn(s)=>s+v);
    let repeated=repeat_until(n,x,fn(s)=>s>8.0,fn(i)=>fn(s)=>choose(i==0,y,s*x));
    let stopped=fold_until(xs,x,fn(v)=>fn(s)=>s>4.0,fn(v)=>fn(s)=>s+v);
    return [left,right,repeated,stopped,sum(xs)];
}
fn observe(r:Pair,pick:Bool)->List<f32> {
    let a=choose(pick,r.x,r.y);let alias=a;
    return [a,alias,r.x,r.y,-alias,r.x+r.y,r.x*r.y];
}
fn records(x:f32,y:f32,n:u32)->List<f32> {
    let r=Pair{x:x,y:y};return observe(r,n==0);
}
fn arrays(xs:List<f32>,y:f32)->List<f32> {
    let mapped=xs.map(fn(x)=>helper(x,y));
    let scanned=mapped.map(fn(x)=>f32_bits(x)).scan().map(fn(x)=>f32_from_bits(x));
    return mapped.concat(scanned);
}
fn owned(xs:List<f32>,y:f32)->List<f32> {
    let empty:Buffer<f32>=Buffer.empty();
    let values=foldl(xs,empty,fn(x)=>fn(s)=>s.push(helper(x,y)));
    return values.freeze();
}
fn tail(xs:List<u32>,a:f32,b:f32)->List<f32> {
    return choose(length(xs)==0,[a,b],tail(xs.drop(1),b,a));
}
fn recursive(x:f32,y:f32,n:u32)->List<f32> {return tail([0,0,0],x,y);}
fn bits(x:f32,y:f32,n:u32)->List<u32> {
    let a=x;let b=-a;let c=a+y;
    return [f32_bits(a),f32_bits(b),f32_bits(-a),f32_bits(c),f32_bits(helper(a,y))];
}
spec fn checked_unused(x:f32)->u32 requires x==0.0; ensures true;
implementation checked_body for checked_unused {return 7;}

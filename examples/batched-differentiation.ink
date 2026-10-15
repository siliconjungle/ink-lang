module batched_differentiation;
record Pair { a:f32, b:f32, }
record Weights { pair:Pair, c:f32, }
// Helpers shared by objectives with different gradient widths.
fn mix(a:f32,b:f32)->f32 {return sqrt(a*a+1.0)/(b*b+1.0)-a*b;}
fn objective(w:Weights,xs:List<f32>)->f32 {
    let values=xs.map(fn(x)=>mix(w.pair.a*x,w.pair.b)+w.c*x);
    let total=sum(values.filter(fn(x)=>x>0.0));
    return repeat(3,total,fn(i)=>fn(s)=>s*0.5+w.c);
}
fn batched(w:Weights,xs:List<f32>)->Weights {
    return gradient_piecewise(objective,w,xs);
}
// A scalar JVP per basis vector is an independent execution control.
fn directions(w:Weights,xs:List<f32>)->Weights {
    return Weights{pair:Pair{
        a:jvp_piecewise(objective,w,Weights{pair:Pair{a:1.0,b:0.0},c:0.0},xs),
        b:jvp_piecewise(objective,w,Weights{pair:Pair{a:0.0,b:1.0},c:0.0},xs)},
        c:jvp_piecewise(objective,w,Weights{pair:Pair{a:0.0,b:0.0},c:1.0},xs)};
}
fn pair_objective(w:Pair,x:f32)->f32 {return mix(w.a*x,w.b);}
fn pair_gradient(w:Pair,x:f32)->Pair {return gradient(pair_objective,w,x);}
fn pair_directions(w:Pair,x:f32)->Pair {
    return Pair{a:jvp(pair_objective,w,Pair{a:1.0,b:0.0},x),
                b:jvp(pair_objective,w,Pair{a:0.0,b:1.0},x)};
}
fn device_batch(xs:List<f32>,w:Pair)->List<Pair> {
    return xs.map(fn(x)=>pair_gradient(w,x));
}

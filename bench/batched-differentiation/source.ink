module differential_preparation;
record Weights{a:f32,b:f32,c:f32,d:f32,}
fn objective(w:Weights,xs:List<f32>)->f32 {
    return sum(xs.map(fn(x)=>w.a+w.b*x+w.c*x*x+w.d*x*x*x));
}
fn prepared(w:Weights,xs:List<f32>)->Weights {return gradient(objective,w,xs);}
fn repeated(w:Weights,xs:List<f32>)->Weights {
    return Weights{
        a:jvp(objective,w,Weights{a:1.0,b:0.0,c:0.0,d:0.0},xs),
        b:jvp(objective,w,Weights{a:0.0,b:1.0,c:0.0,d:0.0},xs),
        c:jvp(objective,w,Weights{a:0.0,b:0.0,c:1.0,d:0.0},xs),
        d:jvp(objective,w,Weights{a:0.0,b:0.0,c:0.0,d:1.0},xs)
    };
}
fn handwritten(w:Weights,xs:List<f32>)->Weights {
    return Weights{a:f32_from_u32(length(xs)),b:sum(xs),c:sum(xs.map(fn(x)=>x*x)),d:sum(xs.map(fn(x)=>x*x*x))};
}

module differentiable_world;
record Weights { bias:f32, response:f32, }
record Context { position:f32, velocity:f32, target:f32, }
record World { position:f32, velocity:f32, }
trainable state Controller:Weights = Weights{bias:0.0,response:0.0};
state FixedRules:Table<u32,u32> = Table.empty();
event learned:f32;

adaptive fn control(w:Weights,c:Context,s:World)->f32 {
    return w.bias+w.response*(c.target-s.position);
}
// Authored transition. Only Controller may be trained; these rules stay fixed.
fn step(s:World,force:f32)->World {
    let velocity=s.velocity*0.9+force*0.1;
    return World{position:s.position+velocity*0.1,velocity:velocity};
}
fn trajectory(w:Weights,c:Context)->World {
    let initial=World{position:c.position,velocity:c.velocity};
    return repeat(12,initial,fn(i)=>fn(s)=>step(s,control(w,c,s)));
}
fn objective(w:Weights,c:Context)->f32 {
    let final=trajectory(w,c);
    let error=final.position-c.target;
    return error*error+0.05*final.velocity*final.velocity;
}
fn derivatives(w:Weights,c:Context)->Weights {return gradient(objective,w,c);}
fn sensitivity(w:Weights,direction:Weights,c:Context)->f32 {return jvp(objective,w,direction,c);}
fn forward(w:Weights,direction:Weights,c:Context)->f32 {return linearize(objective,w,direction,c).value;}
fn forward_tangent(w:Weights,direction:Weights,c:Context)->f32 {return linearize(objective,w,direction,c).tangent;}
adaptive query predict(c:Context)->World reads(Controller) {return trajectory(Controller,c);}
query loss(c:Context)->f32 reads(Controller) {return objective(Controller,c);}
learn change observe(c:Context,rate:f32)->Result<f32,String> reads(Controller) writes(Controller) emits(learned)
    requires(is_finite(c.position)&&is_finite(c.velocity)&&is_finite(c.target)&&rate>0.0&&rate<=0.25,"training domain")
    ensures(result=>Controller.bias>=-8.0&&Controller.bias<=8.0&&Controller.response>=-8.0&&Controller.response<=8.0,"weight domain") {
    let w=Controller;
    let g:Weights=gradient(objective,w,c);
    let next=Weights{bias:w.bias-rate*g.bias,response:w.response-rate*g.response};
    Controller=next;
    let result=objective(next,c);
    emit learned(result);return Ok(result);
}
// A batch can run the whole authored trajectory/gradient pipeline per item.
fn batch(xs:List<f32>,weight:f32)->List<f32> {return xs.map(fn(x)=>scalar_gradient(weight,x));}
fn scalar_loss(w:f32,x:f32)->f32 {let next=w*x+0.25;return next*next;}
fn scalar_gradient(w:f32,x:f32)->f32 {return gradient(scalar_loss,w,x);}
fn trajectory_gradients(targets:List<f32>,w:Weights)->List<f32> {
    return targets.map(fn(target)=>gradient(objective,w,Context{position:0.0,velocity:0.0,target:target}).response);
}

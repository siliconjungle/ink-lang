module adaptive_layout;
record Context { width:f32, length:f32, }
record Weights { bias:f32, width:f32, length:f32, interaction:f32, }
trainable state Model:Table<u32,Weights> = Table.empty();
state Authored:Table<u32,u32> = Table.empty();
event learned:f32;

fn initial()->Weights { return Weights{bias:0.0,width:0.0,length:0.0,interaction:0.0}; }
// Context is normalized by the caller. The interaction learns combinations.
adaptive fn score(c:Context,w:Weights)->f32 {
    return w.bias+w.width*c.width+w.length*c.length+w.interaction*c.width*c.length;
}
// Authored legality is enforced at use, independently of training loss.
fn legal(x:f32)->f32 {
    return choose(x>=0.1 && x<=0.8,x,choose(x>0.8,0.8,0.1));
}
adaptive query suggest(c:Context)->f32 reads(Model) {
    return legal(score(c,Model.get(0).unwrap_or(initial())));
}
// Squared-error SGD, with an explicit authored update and learning event.
// The derivative is authored here; automatic differentiation is separate work.
learn change observe(c:Context,target:f32,rate:f32)->Result<f32,String> reads(Model) writes(Model) emits(learned) {
    if !(c.width>=0.0 && c.width<=1.0 && c.length>=0.0 && c.length<=1.0 && target>=0.1 && target<=0.8 && rate>0.0 && rate<=0.25) { return Err("training domain"); }
    let w=Model.get(0).unwrap_or(initial());
    let error=score(c,w)-target;
    let step=rate*2.0*error;
    let next=Weights{bias:w.bias-step,width:w.width-step*c.width,length:w.length-step*c.length,interaction:w.interaction-step*c.width*c.length};
    if !(next.bias>=-8.0 && next.bias<=8.0 && next.width>=-8.0 && next.width<=8.0 && next.length>=-8.0 && next.length<=8.0 && next.interaction>=-8.0 && next.interaction<=8.0) { return Err("weight domain"); }
    Model.put(0,next);
    emit learned(error*error);
    return Ok(error*error);
}
change authored(value:u32)->Result<Unit,String> writes(Authored) {
    Authored.put(0,value);return Ok(());
}
adaptive fn batch(xs:List<f32>,weight:f32)->List<f32> {
    return xs.map(fn(x)=>x*x*weight);
}

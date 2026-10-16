module frozen_program;

enum Op { Scale, Bias, Relu, }
record Coefficients { scale:f32,bias:f32, }
trainable state Structure:Table<u64,List<Op>>=Table.empty();
trainable state Weights:Table<u64,Coefficients>=Table.empty();
state Live:Table<u64,f32>=Table.empty();
event Updated:Coefficients;

fn evaluate(code:List<Op>,w:Coefficients,input:f32)->f32 {
    return foldl(code,input,fn(op)=>fn(value)=>
        choose(op==Op.Scale,value*w.scale,
            choose(op==Op.Bias,value+w.bias,
                choose(value>0.0,value,0.0))));
}
learn change configure(code:List<Op>)->Unit writes(Structure) {
    Structure.put(0,code);return ();
}
learn change retune(w:Coefficients,fail:Bool)->Result<Unit,u32> writes(Weights) emits(Updated) {
    Weights.put(0,w);emit Updated(w);
    if fail {return Err(99);}return Ok(());
}
adaptive query serve(input:f32)->f32 reads(Structure,Weights,Live) {
    let code=Structure.get(0).unwrap_or([]);
    let w=Weights.get(0).unwrap_or(Coefficients{scale:1.0,bias:0.0});
    return evaluate(code,w,input)+Live.get(0).unwrap_or(0.0);
}
change set_live(value:f32)->Unit writes(Live) {Live.put(0,value);return ();}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

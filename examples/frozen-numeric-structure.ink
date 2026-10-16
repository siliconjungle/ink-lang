module frozen_numeric_structure;
enum Kind { Affine, Shift, }
record Kernel { kind:Kind,scale:f32,bias:f32, }
trainable state Model:Table<u64,Kernel>=Table.empty();
state Live:Table<u64,f32>=Table.empty();
event Changed:f32;
fn evaluate(k:Kernel,x:f32)->f32 {
    return choose(k.kind==Kind.Affine,x*k.scale+k.bias,x+k.scale);
}
learn change configure(key:u64,kind:Kind,scale:f32,bias:f32)->Unit writes(Model) {
    Model.put(key,Kernel{kind:kind,scale:scale,bias:bias});return ();
}
adaptive query serve(x:f32)->f32 reads(Model,Live) {
    let k=Model.get(0).unwrap_or(Kernel{kind:Kind.Affine,scale:1.0,bias:0.0});
    return evaluate(k,x)+Live.get(0).unwrap_or(0.0);
}
query self_equal()->Bool reads(Model) {
    let k=Model.get(1).unwrap_or(Kernel{kind:Kind.Affine,scale:1.0,bias:0.0});
    return k.scale==k.scale;
}
query is_zero()->Bool reads(Model) {
    let k=Model.get(2).unwrap_or(Kernel{kind:Kind.Affine,scale:1.0,bias:0.0});
    return k.scale==0.0;
}
query raw(key:u64)->u32 reads(Model) {
    let k=Model.get(key).unwrap_or(Kernel{kind:Kind.Affine,scale:1.0,bias:0.0});
    return f32_bits(k.scale);
}
change set_live(value:f32,fail:Bool)->Result<Unit,u32> writes(Live) emits(Changed) {
    Live.put(0,value);emit Changed(value);
    if fail {return Err(99);}return Ok(());
}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

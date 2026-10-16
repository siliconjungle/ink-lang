module frozen_parameters;

trainable state Model:Table<u64,List<f32>>=Table.empty();
trainable state Weights:Table<u64,f32>=Table.empty();
event Seen:f32;

learn change configure(values:List<f32>)->Unit writes(Model) {
    Model.put(0,values);return ();
}
learn change retune(x:f32,fail:Bool)->Result<Unit,u32> writes(Weights) emits(Seen) {
    Weights.put(0,x);emit Seen(x);
    if fail {return Err(99);}return Ok(());
}
query all()->List<f32> reads(Model) {return Model.get(0).unwrap_or([]);}
query present()->Bool reads(Model) {return Model.contains(0);}
adaptive query live()->f32 reads(Weights) {return Weights.get(0).unwrap_or(0.0);}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}

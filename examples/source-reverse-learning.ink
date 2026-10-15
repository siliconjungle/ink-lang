module source_reverse_learning;
record Context { features:List<f32>, target:f32, }
fn initial()->List<f32> {
    let values:Buffer<f32>=repeat(64,Buffer.empty(),fn(i)=>fn(out)=>out.push(0.0));
    return values.freeze();
}
trainable state Weights:List<f32> = initial();
event learned:f32;
adaptive fn model(weights:List<f32>,context:Context)->f32 {
    return sum(weights.zip(context.features,fn(weight)=>fn(input)=>weight*input));
}
fn objective(weights:List<f32>,context:Context)->f32 {
    let error=model(weights,context)-context.target;
    return error*error;
}
fn derivatives(weights:List<f32>,context:Context,maximum:u32)->Result<List<f32>,String> {
    return reverse_gradient(objective,weights,maximum,true,context);
}
fn linearized_value(weights:List<f32>,context:Context,maximum:u32)->Result<f32,String> {
    return reverse_linearize(objective,weights,maximum,true,context).map(fn(result)=>result.value);
}
fn valid(weights:List<f32>)->Bool {
    return foldl(weights,true,fn(weight)=>fn(valid)=>valid && is_finite(weight) && weight>=-16.0 && weight<=16.0);
}
fn update(weights:List<f32>,gradient:List<f32>,rate:f32)->List<f32> {
    return weights.map_indexed(fn(i)=>fn(weight)=>weight-rate*gradient.at_or(i,0.0));
}
fn admissible(context:Context)->Bool {return length(context.features)==64 && is_finite(context.target);}
adaptive query prediction(context:Context)->f32 reads(Weights) {return model(Weights,context);}
query loss(context:Context)->f32 reads(Weights) {return objective(Weights,context);}
query parameters()->List<f32> reads(Weights) {return Weights;}
learn change observe(context:Context,rate:f32,maximum:u32)->Result<f32,String>
    reads(Weights) writes(Weights) emits(learned)
    requires(admissible(context) && rate>0.0 && rate<=0.25,"training domain")
    ensures(result=>valid(Weights),"weight domain") {
    let gradient=derivatives(Weights,context,maximum)?;
    Weights=update(Weights,gradient,rate);
    let next=objective(Weights,context);
    emit learned(next);
    return Ok(next);
}
// A variant selects one arm. Only that arm consumes the captured owner.
fn branch_owned(input:Option<u32>)->List<u32> {
    let buffer:Buffer<u32>=buffer([1]);
    return input.fold(fn(value)=>buffer.push(value),fn(unit)=>buffer.push(9)).freeze();
}
// Eligible device work remains separate from host-side tape execution.
fn device(inputs:List<f32>)->List<f32> {return inputs.map(fn(input)=>input*2.0+1.0);}

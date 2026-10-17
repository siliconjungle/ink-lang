module source_reverse_learning_f64;
record Context { features:List<f64>, target:f64, }
fn initial()->List<f64> {
    let values:Buffer<f64>=repeat(64,Buffer.empty(),fn(i)=>fn(out)=>out.push(0.0f64));
    return values.freeze();
}
trainable state Weights:List<f64> = initial();
event learned:f64;
adaptive fn model(weights:List<f64>,context:Context)->f64 {
    return sum(weights.zip(context.features,fn(weight)=>fn(input)=>weight*input));
}
fn objective(weights:List<f64>,context:Context)->f64 {
    let error=model(weights,context)-context.target;
    return error*error;
}
fn derivatives(weights:List<f64>,context:Context,maximum:u32)->Result<List<f64>,String> {
    return reverse_gradient(objective,weights,maximum,true,context);
}
fn linearized_value(weights:List<f64>,context:Context,maximum:u32)->Result<f64,String> {
    return reverse_linearize(objective,weights,maximum,true,context).map(fn(result)=>result.value);
}
fn valid(weights:List<f64>)->Bool {
    return foldl(weights,true,fn(weight)=>fn(valid)=>valid && is_finite(weight) && weight>=-16.0f64 && weight<=16.0f64);
}
fn update(weights:List<f64>,gradient:List<f64>,rate:f64)->List<f64> {
    return weights.map_indexed(fn(i)=>fn(weight)=>weight-rate*gradient.at_or(i,0.0f64));
}
fn admissible(context:Context)->Bool {return length(context.features)==64 && is_finite(context.target);}
adaptive query prediction(context:Context)->f64 reads(Weights) {return model(Weights,context);}
query loss(context:Context)->f64 reads(Weights) {return objective(Weights,context);}
query parameters()->List<f64> reads(Weights) {return Weights;}
learn change observe(context:Context,rate:f64,maximum:u32)->Result<f64,String>
    reads(Weights) writes(Weights) emits(learned)
    requires(admissible(context) && rate>0.0f64 && rate<=0.25f64,"training domain")
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
fn device_work(input:f32)->Buffer<f32>{return buffer_fill(4,input*2.0+1.0);}
fn device(inputs:List<f32>)->List<f32> {return inputs.map(fn(input)=>device_work(input).at_or(0,-0.0));}

// Both source-AD modes use the objective's scalar precision.
fn square64(x:f64)->f64{return x*x;}
fn identity64(x:f64)->f64{return x;}
fn forward64(x:f64)->f64{return gradient(square64,x);}
fn directional64(x:f64,d:f64)->f64{return jvp(square64,x,d);}
fn primal64(x:f64)->Result<f64,String>{return reverse_linearize(identity64,x,16,true).map(fn(result)=>result.value);}

record Pair64{a:f64,b:f64,}
fn trajectory64(w:Pair64,context:f64)->f64{
    let final=repeat(3,w.a,fn(i)=>fn(value)=>value*w.b+context);
    return final*final;
}
fn trajectory_gradient64(w:Pair64,context:f64)->Pair64{return gradient(trajectory64,w,context);}
fn trajectory_direction64(w:Pair64,d:Pair64,context:f64)->f64{return jvp(trajectory64,w,d,context);}

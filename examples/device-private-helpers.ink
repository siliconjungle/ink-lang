module device_private_helpers;
record Summary{total:f32,last:f32,count:u32,}
fn allocate(value:f32,empty:Bool)->Buffer<f32>{return choose(empty,buffer_fill(0,value),buffer_fill(8,value));}
fn edit(work:Buffer<f32>,split:u32)->Buffer<f32>{
 return work.split_at(split,fn(left)=>fn(right)=>left.map_indexed(fn(i)=>fn(value)=>value+f32_from_u32(i)).append(right));
}
fn value(input:f32,split:u32,empty:Bool)->f32{return edit(allocate(input,empty),split).at_or(7,-0.0);}
fn evaluated(inputs:List<f32>,split:u32,empty:Bool)->List<f32>{return inputs.map(fn(input)=>value(input,split,empty));}
fn lazy_total(inputs:List<f32>,enabled:Bool)->f32{return choose(enabled,sum(evaluated(inputs,8,false)),-0.0);}
fn readout(inputs:List<f32>,split:u32,empty:Bool)->Summary{
 let values=evaluated(inputs,split,empty);
 return Summary{total:sum(values),last:values.at_or(length(values)-1,-0.0),count:length(values)};
}
fn admissible(inputs:List<f32>)->Bool{return length(inputs)>0&&length(inputs)<64;}
fn valid(summary:Summary)->Bool{return is_finite(summary.total)&&summary.total<10000.0;}
state Last:Summary=Summary{total:0.0,last:-0.0,count:0};
event observed:Summary;
query current()->Summary reads(Last){return Last;}
change observe(inputs:List<f32>,split:u32,empty:Bool)->Result<Summary,String>
 reads(Last) writes(Last) emits(observed)
 requires(admissible(inputs),"batch domain")
 ensures(result=>valid(Last),"total domain"){
 Last=readout(inputs,split,empty);
 emit observed(Last);
 return Ok(Last);
}
fn square(input:f32)->f32{return input*input+input;}
fn reverse_value(input:f32,maximum:u32)->f32{return reverse_gradient(square,input,maximum,true).fold(fn(value)=>value,fn(error)=>-99.0);}

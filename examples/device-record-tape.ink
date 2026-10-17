module device_record_tape;
record Node{op:u32,a:u32,b:u32,av:f32,bv:f32,value:f32,}
record Tape{nodes:Buffer<Node>,adjoints:Buffer<f32>,steps:u32,}
record Observation{first:Node,second:Node,third:Node,fourth:Node,adjoints:Vec4<f32>,steps:u32,count:u32,}
fn zero()->Node{return Node{op:0,a:0,b:0,av:0.0,bv:0.0,value:-0.0};}
fn initial(input:f32)->Tape{
 let node=Node{op:3,a:0,b:1,av:input,bv:input,value:input*input};
 return Tape{nodes:buffer_fill(4,node),adjoints:buffer_fill(4,0.0),steps:0};
}
fn step(tape:Tape,index:u32,negative:Bool)->Tape{
 let node=tape.nodes.at_or(index,zero());
 let old=tape.adjoints.at_or(index,0.0);
 let amount=choose(negative,-(node.av+node.bv),node.av+node.bv);
 let next=Node{..node,op:node.op+1,value:node.value+old};
 return Tape{nodes:tape.nodes.set(index,next),adjoints:tape.adjoints.set(index,old+amount),steps:tape.steps+1};
}
fn tape_observation(input:f32,negative:Bool)->Observation{
 let tape=initial(input);
 let tape=repeat(4,tape,fn(i)=>fn(tape)=>step(tape,i,negative));
 return Observation{first:tape.nodes.at_or(0,zero()),second:tape.nodes.at_or(1,zero()),third:tape.nodes.at_or(2,zero()),fourth:tape.nodes.at_or(3,zero()),adjoints:vec4(tape.adjoints.at_or(0,0.0),tape.adjoints.at_or(1,0.0),tape.adjoints.at_or(2,0.0),tape.adjoints.at_or(3,0.0)),steps:tape.steps,count:tape.nodes.len()};
}
fn mapped(inputs:List<f32>,negative:Bool)->List<Observation>{return inputs.map(fn(input)=>tape_observation(input,negative));}
record Owner{items:Buffer<f32>,}
fn shrink(work:Owner)->Owner{return repeat(2,work,fn(i)=>fn(work)=>Owner{items:work.items.pop()});}
fn rejoin(left:Buffer<f32>,right:Buffer<f32>,remove:Bool)->Buffer<f32>{
 let work=Owner{items:left};
 let work=choose(remove,shrink(work),work);
 return work.items.append(right);
}
fn partitioned(input:f32,at:u32,remove:Bool)->Vec3<f32>{
 let result=buffer_fill(64,input).split_at(at,fn(left)=>fn(right)=>rejoin(left,right,remove));
 return vec3(result.at_or(0,-0.0),result.at_or(61,-0.0),result.at_or(63,-0.0));
}
fn scanned(input:f32)->Vec4<f32>{
 let result=buffer_fill(4,input).scan();
 return vec4(result.at_or(0,-0.0),result.at_or(1,-0.0),result.at_or(2,-0.0),result.at_or(3,-0.0));
}
fn scanned_wide(input:u64)->List<u64>{
 let result=buffer_fill(4,input).scan();
 return [result.at_or(0,0),result.at_or(1,0),result.at_or(2,0),result.at_or(3,0)];
}
fn selected_wide(inputs:List<u64>,input:u64,left:Bool)->List<u64>{
 return choose(left,scanned_wide(input),inputs);
}
fn empty_owned(input:u64,empty:Bool)->List<u64>{
 let result=buffer_fill(4,input).scan();
 return choose(empty,[],[result.at_or(3,0)]);
}

module reverse_runtime;
record R_Wire { value:f32, id:u32, }
record R_Node { op:u32, a:u32, b:u32, av:f32, bv:f32, value:f32, }
record R_Tape { nodes:Buffer<R_Node>, maximum:u32, failed:Bool, }
record R_Flow { value:R_Wire, tape:R_Tape, }
record R_Reverse { gradient:Buffer<f32>, index:u32, }
fn R_constant(value:f32)->R_Wire {return R_Wire{value:value,id:4294967295};}
fn R_append(tape:R_Tape,node:R_Node,active:Bool)->R_Flow {
 if !active || tape.failed {return R_Flow{value:R_constant(node.value),tape:tape};}
 let index=tape.nodes.len();
 if index>=tape.maximum {return R_Flow{value:R_constant(node.value),tape:R_Tape{..tape,failed:true}};}
 return R_Flow{value:R_Wire{value:node.value,id:index},tape:R_Tape{..tape,nodes:tape.nodes.push(node)}};
}
fn R_seed(value:f32,tape:R_Tape)->R_Flow {
 return R_append(tape,R_Node{op:0,a:4294967295,b:4294967295,av:0.0,bv:0.0,value:value},true);
}
fn R_binary(op:u32,tape:R_Tape,a:R_Wire,b:R_Wire)->R_Flow {
 let value=choose(op==1,a.value+b.value,choose(op==2,a.value-b.value,choose(op==3,a.value*b.value,a.value/b.value)));
 return R_append(tape,R_Node{op:op,a:a.id,b:b.id,av:a.value,bv:b.value,value:value},a.id!=4294967295 || b.id!=4294967295);
}
fn R_unary(op:u32,tape:R_Tape,a:R_Wire)->R_Flow {
 let value=choose(op==5,-a.value,sqrt(a.value));
 return R_append(tape,R_Node{op:op,a:a.id,b:4294967295,av:a.value,bv:0.0,value:value},a.id!=4294967295);
}
fn R_add(g:Buffer<f32>,id:u32,value:f32)->Buffer<f32> {
 if id==4294967295 {return g;}
 let previous=g.at_or(id,0.0);return g.set(id,previous+value);
}
fn R_back_node(node:R_Node,amount:f32,g:Buffer<f32>)->Buffer<f32> {
 if node.op==1 {return R_add(R_add(g,node.a,amount),node.b,amount);}
 if node.op==2 {return R_add(R_add(g,node.a,amount),node.b,-amount);}
 if node.op==3 {return R_add(R_add(g,node.a,amount*node.bv),node.b,amount*node.av);}
 if node.op==4 {return R_add(R_add(g,node.a,amount/node.bv),node.b,-(amount*node.av/(node.bv*node.bv)));}
 if node.op==5 {return R_add(g,node.a,-amount);}
 if node.op==6 {return R_add(g,node.a,amount/(2.0*node.value));}
 return g;
}
fn R_back_step(node:R_Node,work:R_Reverse,stopZero:Bool)->R_Reverse {
 let index=work.index-1;let amount=work.gradient.at_or(index,0.0);
 return R_Reverse{index:index,gradient:choose(stopZero && amount==0.0,work.gradient,R_back_node(node,amount,work.gradient))};
}
fn R_backward(nodes:List<R_Node>,output:R_Wire,stopZero:Bool)->List<f32> {
 let g:Buffer<f32>=foldl(nodes,Buffer.empty(),fn(node)=>fn(g)=>g.push(0.0));
 let g=R_add(g,output.id,1.0);
 let result=foldr(nodes,R_Reverse{gradient:g,index:length(nodes)},fn(node)=>fn(work)=>R_back_step(node,work,stopZero));
 return result.gradient.freeze();
}

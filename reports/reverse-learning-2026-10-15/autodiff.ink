module ink.knowledge.autodiff;
// Authored dataflow and reverse accumulation. No compiler pattern recognisers.
// Inspired by Handwired's separately specified forward and backward circuits.
record Term { wire:u32, coefficient:f32, }
enum Binary { Add, Subtract, Multiply, Divide, }
enum Unary { Sqrt, Negate, Relu, Step, }
enum Kind { Constant, Binary, Unary, Affine, Reglu, Select, Index, }
record Node { kind:Kind, binary:Binary, unary:Unary, a:u32, b:u32, c:u32, value:f32, terms:List<Term>, gates:List<Term>, gate_bias:f32, table:List<u32>, below:Bool, above:Bool, }
fn base(kind:Kind,a:u32,b:u32)->Node {return Node{kind:kind,binary:Binary.Add,unary:Unary.Sqrt,a:a,b:b,c:0,value:0.0,terms:[],gates:[],gate_bias:0.0,table:[],below:false,above:false};}
fn literal(value:f32)->Node {return Node{..base(Kind.Constant,0,0),value:value};}
fn binary(kind:Binary,a:u32,b:u32)->Node {return Node{..base(Kind.Binary,a,b),binary:kind};}
fn unary(kind:Unary,a:u32)->Node {return Node{..base(Kind.Unary,a,0),unary:kind};}
fn add_node(a:u32,b:u32)->Node {return binary(Binary.Add,a,b);}
fn subtract(a:u32,b:u32)->Node {return binary(Binary.Subtract,a,b);}
fn multiply(a:u32,b:u32)->Node {return binary(Binary.Multiply,a,b);}
fn divide(a:u32,b:u32)->Node {return binary(Binary.Divide,a,b);}
fn square_root(a:u32)->Node {return unary(Unary.Sqrt,a);}
fn negate(a:u32)->Node {return unary(Unary.Negate,a);}
fn relu(a:u32)->Node {return unary(Unary.Relu,a);}
fn step(a:u32)->Node {return unary(Unary.Step,a);}
fn linear(terms:List<Term>,bias:f32)->Node {return Node{..base(Kind.Affine,0,0),terms:terms,value:bias};}
fn reglu(terms:List<Term>,bias:f32,gates:List<Term>,gate_bias:f32)->Node {return Node{..base(Kind.Reglu,0,0),terms:terms,value:bias,gates:gates,gate_bias:gate_bias};}
fn select(gate:u32,off:u32,on:u32)->Node {return Node{..base(Kind.Select,gate,off),c:on};}
fn index_read(index:u32,table:List<u32>,below:Bool,above:Bool)->Node {return Node{..base(Kind.Index,index,0),table:table,below:below,above:above};}
enum BooleanGradient { Reject, Zero, StraightThrough, }
enum IndexGradient { Reject, Zero, BackwardDifference, }
enum ZeroCotangent { Propagate, Stop, }
record Policy { piecewise:Bool, boolean:BooleanGradient, index:IndexGradient, zero:ZeroCotangent, }
fn smooth()->Policy {return Policy{piecewise:false,boolean:BooleanGradient.Reject,index:IndexGradient.Reject,zero:ZeroCotangent.Propagate};}
fn piecewise()->Policy {return Policy{piecewise:true,boolean:BooleanGradient.Zero,index:IndexGradient.Zero,zero:ZeroCotangent.Propagate};}
fn sparse_piecewise()->Policy {return Policy{piecewise:true,boolean:BooleanGradient.Zero,index:IndexGradient.Zero,zero:ZeroCotangent.Stop};}
abstract record Prepared { inputs:u32, nodes:List<Node>, roots:List<u32>, }
record Evaluation { outputs:List<f32>, gradient:List<f32>, }
record Forward { values:List<f32>, outputs:List<f32>, }
fn dependencies(node:Node)->List<u32> {
 return match node.kind {
  Kind.Constant=>[],Kind.Binary=>[node.a,node.b],Kind.Unary=>[node.a],
  Kind.Affine=>node.terms.map(fn(t)=>t.wire),
  Kind.Reglu=>node.terms.map(fn(t)=>t.wire).concat(node.gates.map(fn(t)=>t.wire)),
  Kind.Select=>[node.a,node.b,node.c],Kind.Index=>[node.a].concat(node.table),
 };
}
fn moved(node:Node,positions:List<u32>)->Node {
 return match node.kind {
  Kind.Constant=>node,
  Kind.Binary=>Node{..node,a:positions.at_or(node.a,0),b:positions.at_or(node.b,0)},
  Kind.Unary=>Node{..node,a:positions.at_or(node.a,0)},
  Kind.Affine=>Node{..node,terms:node.terms.map(fn(t)=>Term{wire:positions.at_or(t.wire,0),coefficient:t.coefficient})},
  Kind.Reglu=>Node{..node,terms:node.terms.map(fn(t)=>Term{wire:positions.at_or(t.wire,0),coefficient:t.coefficient}),gates:node.gates.map(fn(t)=>Term{wire:positions.at_or(t.wire,0),coefficient:t.coefficient})},
  Kind.Select=>Node{..node,a:positions.at_or(node.a,0),b:positions.at_or(node.b,0),c:positions.at_or(node.c,0)},
  Kind.Index=>Node{..node,a:positions.at_or(node.a,0),table:node.table.map(fn(w)=>positions.at_or(w,0))},
 };
}
record Reachable { live:Buffer<Bool>, wire:u32, }
fn mark(node:Node,work:Reachable,inputs:u32)->Reachable {
 let wire=work.wire-1;var live:Buffer<Bool>=work.live;
 if live.at_or(wire,false) {for dependency in dependencies(node) {live=live.set(dependency,true);}}
 return Reachable{live:live,wire:wire};
}
fn edges_before(node:Node,wire:u32)->Bool {
 return match node.kind {
  Kind.Constant=>true,Kind.Binary=>node.a<wire && node.b<wire,Kind.Unary=>node.a<wire,
  Kind.Affine=>foldl(node.terms,true,fn(t)=>fn(ok)=>ok && t.wire<wire),
  Kind.Reglu=>foldl(node.terms,true,fn(t)=>fn(ok)=>ok && t.wire<wire) && foldl(node.gates,true,fn(t)=>fn(ok)=>ok && t.wire<wire),
  Kind.Select=>node.a<wire && node.b<wire && node.c<wire,
  Kind.Index=>node.a<wire && foldl(node.table,true,fn(w)=>fn(ok)=>ok && w<wire),
 };
}
record Validation { wire:u32, valid:Bool, }
fn valid_graph(inputs:u32,nodes:List<Node>,roots:List<u32>)->Bool {
 if count(nodes)>4294967295 || length(nodes)>4294967295-inputs {return false;}
 let width=inputs+length(nodes);
 let checked=foldl(nodes,Validation{wire:inputs,valid:true},fn(node)=>fn(work)=>Validation{wire:work.wire+1,valid:work.valid && edges_before(node,work.wire)});
 return checked.valid && foldl(roots,true,fn(root)=>fn(valid)=>valid && root<width);
}
// Validate every edge before allocation, then retain exactly the roots' closure.
// All sources retain their original positions, including unused model parameters.
fn prepare(inputs:u32,nodes:List<Node>,roots:List<u32>,maximum:u32)->Result<Prepared,String> {
 if count(nodes)>4294967295 || inputs>maximum || length(nodes)>maximum-inputs {return Err("graph capacity");}
 if !valid_graph(inputs,nodes,roots) {return Err("graph is not topologically ordered");}
 let width=inputs+length(nodes);var live:Buffer<Bool>=buffer_fill(width,false);
 for wire in roots {live=live.set(wire,true);}
 let marked=foldr(nodes,Reachable{live:live,wire:width},fn(node)=>fn(work)=>mark(node,work,inputs));
 let live=marked.live.freeze();
 let positions:Buffer<u32>=buffer_fill(width,0);
 let positions=repeat_until(inputs,positions,fn(b)=>false,fn(i)=>fn(b)=>b.set(i,i));
 var positions:Buffer<u32>=positions;var wire:u32=inputs;var next:u32=inputs;
 for node in nodes {if live.at_or(wire,false) {positions=positions.set(wire,next);next=next+1;}wire=wire+1;}
 let positions=positions.freeze();var compact:Buffer<Node>=Buffer.empty();var wire:u32=inputs;
 for node in nodes {if live.at_or(wire,false) {compact=compact.push(moved(node,positions));}wire=wire+1;}
 return Ok(Prepared{inputs:inputs,nodes:compact.freeze(),roots:roots.map(fn(w)=>positions.at_or(w,0))});
}
fn operation_count(plan:Prepared)->u32 {return length(plan.nodes);}
fn input_count(plan:Prepared)->u32 {return plan.inputs;}
fn output_count(plan:Prepared)->u32 {return length(plan.roots);}
fn affine(read:fn(u32)->f32,terms:List<Term>,bias:f32)->f32 {
 return foldl(terms,bias,fn(t)=>fn(total)=>total+t.coefficient*read(t.wire));
}
fn read_index(read:fn(u32)->f32,table:List<u32>,index:f32,below:Bool,above:Bool)->f32 {
 if length(table)==0 {return 0.0;}
 if index<0.0 {return choose(below,0.0,read(table.at_or(0,0)));}
 if index>=f32_from_u32(length(table)) {return choose(above,0.0,read(table.at_or(length(table)-1,0)));}
 let i=u32_from_f32(index).fold(fn(i)=>i,fn(u)=>0);
 return read(table.at_or(i,0));
}
fn binary_value(kind:Binary,a:f32,b:f32)->f32 {return match kind {Binary.Add=>a+b,Binary.Subtract=>a-b,Binary.Multiply=>a*b,Binary.Divide=>a/b,};}
fn relu_value(a:f32)->f32 {return choose(is_nan(a),f32_from_bits(2143289344),choose(a>0.0,a,0.0));}
fn unary_value(kind:Unary,a:f32)->f32 {return match kind {Unary.Sqrt=>sqrt(a),Unary.Negate=>-a,Unary.Relu=>relu_value(a),Unary.Step=>choose(a>0.0,1.0,0.0),};}
record Observed { values:Buffer<f32>, value:f32, }
record ForwardWork { values:Buffer<f32>, finite_indices:Bool, }
fn evaluate_scalar(node:Node,values:Buffer<f32>)->Observed {
 let value=match node.kind {
  Kind.Constant=>node.value,Kind.Binary=>binary_value(node.binary,values.at_or(node.a,0.0),values.at_or(node.b,0.0)),
  Kind.Unary=>unary_value(node.unary,values.at_or(node.a,0.0)),
  Kind.Select=>choose(values.at_or(node.a,0.0)>0.0,values.at_or(node.c,0.0),values.at_or(node.b,0.0)),
  Kind.Affine=>0.0,Kind.Reglu=>0.0,Kind.Index=>0.0,
 };
 return Observed{values:values,value:value};
}
fn observe_terms(values:Buffer<f32>,terms:List<Term>,bias:f32)->Observed {
 let value=values.borrow_range(0,values.len(),fn(view)=>foldl(terms,bias,fn(t)=>fn(total)=>total+t.coefficient*view.at_or(t.wire,0.0)));
 return Observed{values:values,value:value};
}
fn evaluate_reglu(node:Node,values:Buffer<f32>)->Observed {
 let left=observe_terms(values,node.terms,node.value);
 let gate=observe_terms(left.values,node.gates,node.gate_bias);
 return Observed{values:gate.values,value:left.value*relu_value(gate.value)};
}
fn index_position(index:f32,n:u32,below:Bool,above:Bool)->Option<u32> {
 if n==0 || !is_finite(index) {return None;}
 if index<0.0 {return choose(below,None,Some(0));}
 if index>=f32_from_u32(n) {return choose(above,None,Some(n-1));}
 return u32_from_f32(index);
}
fn evaluate_index(node:Node,values:Buffer<f32>)->Observed {
 let position=index_position(values.at_or(node.a,0.0),length(node.table),node.below,node.above);
 let value=position.fold(fn(i)=>values.at_or(node.table.at_or(i,0),0.0),fn(u)=>0.0);
 return Observed{values:values,value:value};
}
fn forward_step(node:Node,work:ForwardWork)->ForwardWork {
 let values=work.values;
 let finite=work.finite_indices && (node.kind!=Kind.Index || is_finite(values.at_or(node.a,0.0)));
 let next=match node.kind {
  Kind.Affine=>observe_terms(values,node.terms,node.value),Kind.Reglu=>evaluate_reglu(node,values),Kind.Index=>evaluate_index(node,values),
  Kind.Constant=>evaluate_scalar(node,values),Kind.Binary=>evaluate_scalar(node,values),Kind.Unary=>evaluate_scalar(node,values),Kind.Select=>evaluate_scalar(node,values),
 };
 return ForwardWork{values:next.values.push(next.value),finite_indices:finite};
}
fn forward(plan:Prepared,input:List<f32>)->Result<Forward,String> {
 if length(input)!=plan.inputs {return Err("graph input shape");}
 if !valid_graph(plan.inputs,plan.nodes,plan.roots) {return Err("invalid prepared graph");}
 let work=foldl(plan.nodes,ForwardWork{values:buffer(input),finite_indices:true},fn(node)=>fn(work)=>forward_step(node,work));
 let values=work.values.freeze();
 if !work.finite_indices {return Err("nonfinite graph index");}
 return Ok(Forward{values:values,outputs:plan.roots.map(fn(w)=>values.at_or(w,0.0))});
}
fn evaluate(plan:Prepared,input:List<f32>)->Result<List<f32>,String> {return forward(plan,input).map(fn(f)=>f.outputs);}
fn add(g:Buffer<f32>,wire:u32,value:f32)->Buffer<f32> {let prior=g.at_or(wire,0.0);return g.set(wire,prior+value);}
fn add_terms(g:Buffer<f32>,terms:List<Term>,amount:f32)->Buffer<f32> {
 var g:Buffer<f32>=g;for term in terms {g=add(g,term.wire,amount*term.coefficient);}return g;
}
record Reverse { gradient:Buffer<f32>, wire:u32, }
fn unary_allows(kind:Unary,policy:Policy)->Bool {return match kind {Unary.Sqrt=>true,Unary.Negate=>true,Unary.Relu=>policy.piecewise,Unary.Step=>policy.boolean!=BooleanGradient.Reject,};}
fn policy_allows(node:Node,policy:Policy)->Bool {
 return match node.kind {
  Kind.Constant=>true,Kind.Binary=>true,Kind.Affine=>true,
  Kind.Unary=>unary_allows(node.unary,policy),Kind.Reglu=>policy.piecewise,Kind.Select=>policy.piecewise,
  Kind.Index=>policy.index!=IndexGradient.Reject,
 };
}
fn reverse_reglu(g:Buffer<f32>,values:List<f32>,ts:List<Term>,bias:f32,gs:List<Term>,gate_bias:f32,amount:f32)->Buffer<f32> {
 let left=affine(fn(i)=>values.at_or(i,0.0),ts,bias);let gate=affine(fn(i)=>values.at_or(i,0.0),gs,gate_bias);
 let g=add_terms(g,ts,amount*relu_value(gate));
 return choose(gate>0.0,add_terms(g,gs,amount*left),g);
}
fn reverse_index(g:Buffer<f32>,values:List<f32>,i:u32,table:List<u32>,below:Bool,above:Bool,amount:f32,policy:Policy)->Buffer<f32> {
 let index=values.at_or(i,0.0);let n=length(table);
 let active=n>0 && !(index<0.0 && below) && !(index>=f32_from_u32(n) && above);
 let position=choose(index<0.0,0,choose(index>=f32_from_u32(n),n-1,u32_from_f32(index).fold(fn(i)=>i,fn(u)=>0)));
 let g=choose(active,add(g,table.at_or(position,0),amount),g);
 let difference=read_index(fn(i)=>values.at_or(i,0.0),table,floor(index),below,above)-read_index(fn(i)=>values.at_or(i,0.0),table,floor(index)-1.0,below,above);
 return choose(policy.index==IndexGradient.BackwardDifference,add(g,i,amount*difference),g);
}
fn reverse_binary(kind:Binary,g:Buffer<f32>,values:List<f32>,a:u32,b:u32,amount:f32)->Buffer<f32> {
 return match kind {
  Binary.Add=>add(add(g,a,amount),b,amount),Binary.Subtract=>add(add(g,a,amount),b,-amount),
  Binary.Multiply=>add(add(g,a,amount*values.at_or(b,0.0)),b,amount*values.at_or(a,0.0)),
  Binary.Divide=>add(add(g,a,amount/values.at_or(b,0.0)),b,-(amount*values.at_or(a,0.0)/(values.at_or(b,0.0)*values.at_or(b,0.0)))),
 };
}
fn reverse_unary(kind:Unary,g:Buffer<f32>,values:List<f32>,a:u32,wire:u32,amount:f32,policy:Policy)->Buffer<f32> {
 return match kind {
  Unary.Sqrt=>add(g,a,amount/(2.0*values.at_or(wire,0.0))),Unary.Negate=>add(g,a,-amount),
  Unary.Relu=>choose(is_nan(values.at_or(a,0.0)),add(g,a,f32_from_bits(2143289344)),choose(values.at_or(a,0.0)>0.0,add(g,a,amount),g)),
  Unary.Step=>choose(policy.boolean==BooleanGradient.StraightThrough,add(g,a,amount),g),
 };
}
fn reverse_one(node:Node,work:Reverse,values:List<f32>,policy:Policy)->Reverse {
 let wire=work.wire-1;let g=work.gradient;let amount=g.at_or(wire,0.0);
 if policy.zero==ZeroCotangent.Stop && amount==0.0 {return Reverse{gradient:g,wire:wire};}
 let g=match node.kind {
  Kind.Constant=>g,Kind.Binary=>reverse_binary(node.binary,g,values,node.a,node.b,amount),
  Kind.Unary=>reverse_unary(node.unary,g,values,node.a,wire,amount,policy),
  Kind.Affine=>add_terms(g,node.terms,amount),Kind.Reglu=>reverse_reglu(g,values,node.terms,node.value,node.gates,node.gate_bias,amount),
  Kind.Select=>choose(values.at_or(node.a,0.0)>0.0,add(g,node.c,amount),add(g,node.b,amount)),
  Kind.Index=>reverse_index(g,values,node.a,node.table,node.below,node.above,amount,policy),
 };
 return Reverse{gradient:g,wire:wire};
}
// Low-level ordered accumulation over the supplied primal values. vjp/mse bind
// those values to a fresh forward execution; this helper alone does not.
fn accumulate(plan:Prepared,values:List<f32>,seeds:List<f32>,policy:Policy)->Result<List<f32>,String> {
 if length(values)!=plan.inputs+length(plan.nodes) || length(seeds)!=length(plan.roots) || !valid_graph(plan.inputs,plan.nodes,plan.roots) {return Err("cotangent shape");}
 return reverse_values(plan,values,seeds,policy);
}
// Internal algorithm over supplied values. High-level callers validate topology
// in forward; accumulate is the validating supplied-primal boundary.
fn reverse_values(plan:Prepared,values:List<f32>,seeds:List<f32>,policy:Policy)->Result<List<f32>,String> {
 let allowed=foldl(plan.nodes,true,fn(node)=>fn(ok)=>ok && policy_allows(node,policy));
 if !allowed {return Err("explicit gradient policy required");}
 var g:Buffer<f32>=buffer_fill(length(values),0.0);var i:u32=0;
 for seed in seeds {g=add(g,plan.roots.at_or(i,0),seed);i=i+1;}
 let reversed=foldr(plan.nodes,Reverse{gradient:g,wire:length(values)},fn(node)=>fn(work)=>reverse_one(node,work,values,policy));
 return Ok(reversed.gradient.freeze().take(plan.inputs));
}
// VJP seed order and reverse operation order are part of this F32 algorithm.
// It never consumes a caller-supplied stale forward tape.
fn vjp(plan:Prepared,input:List<f32>,seeds:List<f32>,policy:Policy)->Result<Evaluation,String> {
 if length(seeds)!=length(plan.roots) {return Err("cotangent shape");}
 let f=forward(plan,input)?;let gradient=reverse_values(plan,f.values,seeds,policy)?;
 return Ok(Evaluation{outputs:f.outputs,gradient:gradient});
}
record Loss { loss:f32, outputs:List<f32>, gradient:List<f32>, }
fn mse(plan:Prepared,input:List<f32>,target:List<f32>,policy:Policy)->Result<Loss,String> {
 if length(target)==0 || length(target)!=length(plan.roots) {return Err("target shape");}
 let f=forward(plan,input)?;
 let errors=f.outputs.zip(target,fn(actual)=>fn(expected)=>actual-expected);
 let divisor=f32_from_u32(length(target));let loss=sum(errors.map(fn(e)=>e*e))/divisor;
 if !is_finite(loss) {return Err("nonfinite loss");}
 let seeds=errors.map(fn(e)=>2.0*e/divisor);
 let gradient=reverse_values(plan,f.values,seeds,policy)?;
 return Ok(Loss{loss:loss,outputs:f.outputs,gradient:gradient});
}

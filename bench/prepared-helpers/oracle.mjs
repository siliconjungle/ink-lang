// Independent ordered F32 graph executor plus Handwired's own circuit executor.
// The graph describes the same operations; there is no compiler implementation
// recognition or rewrite authority in this benchmark.
const fr=Math.fround,slot=new Float32Array(1),word=new Uint32Array(slot.buffer);
export const bits=x=>{slot[0]=x;return{F32Bits:word[0]};};
export function numeric(x){if(Array.isArray(x))return x.map(numeric);if(x&&typeof x==='object'){if('F32Bits'in x){word[0]=x.F32Bits;return slot[0];}return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,numeric(v)]));}return x;}
const kind=n=>n.kind.slice(n.kind.lastIndexOf('.')+1),affine=(v,terms,bias)=>terms.reduce((sum,t)=>fr(sum+fr(t.coefficient*v[t.wire])),bias);
export const boxed=(output,derivative)=>({Ok:derivative?{loss:bits(output.loss),outputs:output.outputs.map(bits),gradient:output.gradient.map(bits)}:output.map(bits)});
export function direct(graph,weights,features,target,derivative){
 const v=new Float32Array(graph.inputs+graph.nodes.length);v.set(weights);v.set(features,244);
 for(let i=0;i<graph.nodes.length;i++){const n=graph.nodes[i];v[graph.inputs+i]=kind(n)==='Binary'?fr(v[n.a]*v[n.b]):kind(n)==='Affine'?affine(v,n.terms,n.value):fr(affine(v,n.terms,n.value)*Math.max(0,affine(v,n.gates,n.gate_bias)));}
 const outputs=graph.roots.map(w=>v[w]);if(!derivative)return outputs;
 const g=new Float32Array(v.length);let loss=0;
 for(let i=0;i<4;i++){const e=fr(outputs[i]-target[i]);loss=fr(loss+fr(e*e));g[graph.roots[i]]=fr(fr(2*e)/4);}
 const add=(wire,value)=>{g[wire]=fr(g[wire]+value);},terms=(ts,amount)=>{for(const t of ts)add(t.wire,fr(amount*t.coefficient));};
 for(let i=graph.nodes.length-1;i>=0;i--){const n=graph.nodes[i],amount=g[graph.inputs+i];if(amount===0)continue;
  if(kind(n)==='Binary'){add(n.a,fr(amount*v[n.b]));add(n.b,fr(amount*v[n.a]));}
  else if(kind(n)==='Affine')terms(n.terms,amount);
  else{const left=affine(v,n.terms,n.value),gate=affine(v,n.gates,n.gate_bias);terms(n.terms,fr(amount*Math.max(0,gate)));if(gate>0)terms(n.gates,fr(amount*left));}
 }
 return{loss:fr(loss/4),outputs,gradient:Array.from(g.slice(0,244))};
}
export function handwired(Circuit,graph,ranges){
 const circuit=new Circuit(graph.inputs),wires=Array.from({length:graph.inputs},(_,i)=>circuit.source(i));
 if(ranges)for(const wire of wires)circuit.assumeRange(wire,0,1);
 for(const n of graph.nodes){let wire;
  if(kind(n)==='Binary'&&n.binary.endsWith('.Multiply'))wire=circuit.multiply(wires[n.a],wires[n.b]);
  else if(kind(n)==='Affine')wire=circuit.roundAffine(n.terms.map(t=>[wires[t.wire],t.coefficient]),n.value);
  else if(kind(n)==='Reglu')wire=circuit.reglu(n.terms.map(t=>[wires[t.wire],t.coefficient]),n.value,n.gates.map(t=>[wires[t.wire],t.coefficient]),n.gate_bias);
  else throw Error('oracle supports the measured affine/product/ReGLU network only');wires.push(wire);
 }
 const roots=graph.roots.map(w=>wires[w]);
 return{operations:circuit.operations.length,run(weights,features,target,derivative){
  const source=new Float32Array(graph.inputs);source.set(weights);source.set(features,244);
  const v=circuit.evaluateReference(source),outputs=roots.map(w=>v[w]);if(!derivative)return outputs;
  const seeds=new Float32Array(v.length);let loss=0;
  for(let i=0;i<4;i++){const e=fr(outputs[i]-target[i]);loss=fr(loss+fr(e*e));seeds[roots[i]]=fr(fr(2*e)/4);}
  return{loss:fr(loss/4),outputs,gradient:Array.from(circuit.backpropagateReference(v,seeds).slice(0,244))};
 }};
}

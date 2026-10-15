import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [inkPath,upstreamPath,seedText='72131']=process.argv.slice(2);
if(!upstreamPath)throw Error('usage: node --experimental-strip-types run.mjs INK_MODULE HANDWIRED_NUMERIC_UI_CORE.ts [SEED]');
const {functions:f}=await import(pathToFileURL(inkPath));
const {Circuit,emitRelu}=await import(pathToFileURL(upstreamPath));
const fr=Math.fround,median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
let randomState=Number(seedText)>>>0,sink=0;
const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return randomState>>>0;};
const start=process.hrtime.bigint(),net=f.architecture().Ok,inkSetupNs=Number(process.hrtime.bigint()-start);
assert.equal(net.parameters,244);assert.equal(net.graph.nodes.length,232);
const graph=net.graph,kind=n=>n.kind.slice(n.kind.lastIndexOf('.')+1);
function handwired(ranges=false){
 const circuit=new Circuit(graph.inputs),wires=Array.from({length:graph.inputs},(_,i)=>circuit.source(i));
 if(ranges)for(const wire of wires)circuit.assumeRange(wire,0,1);
 for(const n of graph.nodes){let wire;
  if(kind(n)==='Binary'&&n.binary.endsWith('.Add'))wire=circuit.roundAffine([[wires[n.a],1],[wires[n.b],1]],0);
  else if(kind(n)==='Binary'&&n.binary.endsWith('.Multiply'))wire=circuit.multiply(wires[n.a],wires[n.b]);
  else if(kind(n)==='Unary'&&n.unary.endsWith('.Relu'))wire=emitRelu(circuit,wires[n.a]);
  else if(kind(n)==='Affine')wire=circuit.roundAffine(n.terms.map(t=>[wires[t.wire],t.coefficient]),n.value);
  else if(kind(n)==='Reglu')wire=circuit.reglu(n.terms.map(t=>[wires[t.wire],t.coefficient]),n.value,n.gates.map(t=>[wires[t.wire],t.coefficient]),n.gate_bias);
  else throw Error('unexpected network operation');wires.push(wire);
 }
 return {circuit,roots:graph.roots.map(w=>wires[w])};
}
const before=process.hrtime.bigint(),hw=handwired(),handwiredSetupNs=Number(process.hrtime.bigint()-before);
const ranged=handwired(true);
const ops=graph.nodes.map(n=>kind(n)==='Affine'?3:kind(n)==='Reglu'?4:kind(n)==='Unary'?2:n.binary.endsWith('.Add')?0:1);
const a=graph.nodes.map(n=>n.a),b=graph.nodes.map(n=>n.b);
const affine=(v,terms,bias)=>terms.reduce((sum,t)=>fr(sum+fr(t.coefficient*v[t.wire])),bias);
function direct(weights,features,target){
 const v=new Float32Array(graph.inputs+ops.length);v.set(weights);v.set(features,244);
 for(let i=0;i<ops.length;i++){const n=graph.nodes[i];v[graph.inputs+i]=ops[i]===0?fr(v[a[i]]+v[b[i]]):ops[i]===1?fr(v[a[i]]*v[b[i]]):ops[i]===2?Math.max(0,v[a[i]]):ops[i]===3?affine(v,n.terms,n.value):fr(affine(v,n.terms,n.value)*Math.max(0,affine(v,n.gates,n.gate_bias)));}
 const outputs=graph.roots.map(w=>v[w]),g=new Float32Array(v.length);let loss=0;
 for(let i=0;i<4;i++){const e=fr(outputs[i]-target[i]);loss=fr(loss+fr(e*e));g[graph.roots[i]]=fr(fr(2*e)/4);}
 const add=(wire,value)=>{g[wire]=fr(g[wire]+value);};
 const terms=(ts,amount)=>{for(const t of ts)add(t.wire,fr(amount*t.coefficient));};
 for(let i=ops.length-1;i>=0;i--){const amount=g[graph.inputs+i];if(amount===0)continue;
  if(ops[i]===0){add(a[i],amount);add(b[i],amount);}
  else if(ops[i]===1){add(a[i],fr(amount*v[b[i]]));add(b[i],fr(amount*v[a[i]]));}
  else if(ops[i]===2){if(v[a[i]]>0)add(a[i],amount);}
  else if(ops[i]===3)terms(graph.nodes[i].terms,amount);
  else {const n=graph.nodes[i],left=affine(v,n.terms,n.value),gate=affine(v,n.gates,n.gate_bias);terms(n.terms,fr(amount*Math.max(0,gate)));if(gate>0)terms(n.gates,fr(amount*left));}
 }
 return {loss:fr(loss/4),outputs,gradient:Array.from(g.slice(0,244))};
}
function upstream(weights,features,target,prepared=hw){
 const source=new Float32Array(graph.inputs);source.set(weights);source.set(features,244);
 const v=prepared.circuit.evaluateReference(source),outputs=prepared.roots.map(w=>v[w]),seeds=new Float32Array(v.length);let loss=0;
 for(let i=0;i<4;i++){const e=fr(outputs[i]-target[i]);loss=fr(loss+fr(e*e));seeds[prepared.roots[i]]=fr(fr(2*e)/4);}
 const gradient=prepared.circuit.backpropagateReference(v,seeds);return {loss:fr(loss/4),outputs,gradient:Array.from(gradient.slice(0,244))};
}
const lanes={ink:(w,x,t)=>f.prepared(net,w,x,t).Ok,handwired:upstream,handwired_ranges:(w,x,t)=>upstream(w,x,t,ranged),direct};
const cases=Array.from({length:16},()=>({weights:Array.from({length:244},()=>fr(.01+(random()%100)/1000)),features:Array.from({length:10},()=>fr(.02+(random()%800)/1000)),target:Array.from({length:4},()=>fr((random()%1000-500)/1000))}));
for(const c of cases){const expected=direct(c.weights,c.features,c.target);for(const fn of Object.values(lanes))assert.deepEqual(fn(c.weights,c.features,c.target),expected);}
const samples=Object.fromEntries(Object.keys(lanes).map(n=>[n,[]]));
for(let round=0;round<11;round++){
 const names=Object.keys(lanes);for(let i=names.length-1;i>0;i--){const j=random()%(i+1);[names[i],names[j]]=[names[j],names[i]];}
 for(const n of names){const fn=lanes[n];for(const c of cases)fn(c.weights,c.features,c.target);
  const t=process.hrtime.bigint();for(let repeat=0;repeat<8;repeat++)for(const c of cases){const r=fn(c.weights,c.features,c.target);sink+=r.loss+r.outputs.reduce((a,b)=>a+b,0)+r.gradient.reduce((a,b)=>a+b,0);}
  samples[n].push(Number(process.hrtime.bigint()-t)/(8*cases.length));
  for(const c of cases)assert.deepEqual(fn(c.weights,c.features,c.target),direct(c.weights,c.features,c.target));
 }
}
console.log(JSON.stringify({schema:1,seed:Number(seedText),date:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,arch:process.arch,inkSha256:createHash('sha256').update(fs.readFileSync(inkPath)).digest('hex'),upstreamSha256:createHash('sha256').update(fs.readFileSync(upstreamPath)).digest('hex'),architecture:{parameters:244,features:10,hidden:[6,6],outputs:4,inkOperations:ops.length,handwiredOperations:hw.circuit.operations.length,handwiredRangedOperations:ranged.circuit.operations.length},setup:{inkSetupNs,handwiredSetupNs},lanes:Object.fromEntries(Object.keys(lanes).map(n=>[n,{samplesNs:samples[n],medianNs:median(samples[n])}])),sink,scope:'Dynamic features, identical bias-first F32 operation order, sparse zero cotangents, complete outputs/loss/244 gradients. Handwired own reference forward/backward on equivalent circuits with unknown ranges and with all source ranges declared [0,1] and checked by Handwired, direct graph interpreter control. Trusted warm JS API, fresh arrays per call; inputs prepared outside timing. Graph setup separately single cold observation, no compile/import, peak-memory, optimizer, GPU, fixed-feature gallery or end-to-end UI claim.'}));

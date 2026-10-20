import {equal} from '../../../tools/engine-gate/worker.mjs';
const f=Math.fround, blocks=Array.from({length:8},(_,i)=>'b'+i), slots=Array.from({length:8},(_,i)=>'w'+i);
const initial=()=>Object.fromEntries(blocks.map((b,i)=>[b,Object.fromEntries(slots.map((s,j)=>[s,f((i*8+j-31)/128)]))]));
const add=(a,b)=>f(a+b), total=xs=>xs.slice(1).reduce(add,xs[0]);
function reference(w,target,rate) {
  const sum=total(blocks.map(b=>total(slots.map(s=>f(w[b][s]*w[b][s])))));
  const error=f(sum-target), amount=f(f(0+error)+error);
  // Reverse traversal visits repeated multiplication edges independently.
  const gradient=Object.fromEntries(blocks.map(b=>[b,Object.fromEntries(slots.map(s=>{
    const edge=f(amount*w[b][s]);return [s,f(f(0+edge)+edge)];
  }))]));
  const next=Object.fromEntries(blocks.map(b=>[b,Object.fromEntries(slots.map(s=>[s,f(w[b][s]-f(rate*gradient[b][s]))]))]));
  return {value:f(error*error),gradient,next};
}
function handwrittenStep(w,target,rate) {
  let sum=0;
  for(let i=0;i<8;i++) {
    const block=w[blocks[i]];let subtotal=f(block.w0*block.w0);
    for(let j=1;j<8;j++){const x=block[slots[j]];subtotal=f(subtotal+f(x*x));}
    sum=i===0?subtotal:f(sum+subtotal);
  }
  const error=f(sum-target),amount=f(f(0+error)+error),out={};
  for(let i=0;i<8;i++) {
    const input=w[blocks[i]],block=out[blocks[i]]={};
    for(let j=0;j<8;j++){const key=slots[j],x=input[key],edge=f(amount*x),g=f(f(0+edge)+edge);block[key]=f(x-f(rate*g));}
  }
  return out;
}
export const cases=[
  {name:'gradient-64',lifetime:'complete reverse gradient; fixed record shape; owned public result',create:m=>{const w=initial();let i=0;return()=>m.functions.derivatives(w,f((i++%7)/8),4096,true);}},
  {name:'learning-update-64',lifetime:'sequential changing weights; complete primal, reverse gradient and update; public owned result',create:m=>{let w=initial(),i=0;return()=>w=m.functions.step(w,f((i++%7)/8),f(1/1024));}},
  {name:'handwritten-update-64',lifetime:'independent ordered F32 loop control; sequential changing weights; owned output; same function for every compiler',create:()=>{let w=initial(),i=0;return()=>w=handwrittenStep(w,f((i++%7)/8),f(1/1024));}},
];
export function verify(m) {
  let w=initial(),expected=initial(),previous=initial(),checks=0;
  for(let i=0;i<128;i++) {
    const target=f((i%7)/8),rate=f(1/1024),r=reference(expected,target,rate);
    equal(m.functions.derivatives(expected,target,4096,true),{Ok:r.gradient});checks++;
    equal(m.functions.linearized(expected,target,4096,true),{Ok:r.value});checks++;
    w=m.functions.step(w,target,rate);expected=r.next;equal(w,expected);checks++;
    equal(handwrittenStep(previous,target,rate),expected);checks++;
    previous=expected;
  }
  for(const maximum of [0,1,64,192,193,194,4096,1_000_001]) {
    const r=m.functions.derivatives(initial(),0.25,maximum,true);
    if(maximum>1_000_000)equal(r,{Err:'reverse differentiation capacity exceeds one million nodes'});
    else if(maximum<193)equal(r,{Err:'reverse differentiation tape capacity exceeded'});
    else equal(r,{Ok:reference(initial(),0.25,0).gradient});
    checks++;
  }
  return {independentChecks:checks,trajectorySteps:128,coordinates:64,tapeDescriptors:JSON.stringify(m.metadata).includes('"kind":"buffer"')};
}

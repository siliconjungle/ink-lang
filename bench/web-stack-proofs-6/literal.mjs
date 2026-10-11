// Original ordered U32 source algorithms; ordinary JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 contribution_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<64;i++){
  const left=x<seed?mul(a,k):mul(sub(seed,a),k),right=x<seed?mul(sub(seed,a),k):mul(a,k);a=add(add(a,left),right);
 }return add(a,seed);}),
 conditional_blend:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<64;i++){
  const left=x<seed?mul(a,k):mul(a,seed),right=x<seed?mul(add(a,seed),sub(1,k)):mul(add(a,seed),sub(1,seed));a=add(left,right);
 }return add(a,seed);}),
 compensated_patch:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<64;i++){
  a=x<seed?sub(add(add(sub(a,seed),k),seed),k):sub(add(add(sub(a,k),seed),k),seed);
 }return add(a,seed);}),
 squared_values:(xs,seed,k)=>zip(xs,xs,(a,b)=>mul(a,b)),
 calibrated_squares:(xs,seed,k)=>zip(xs,xs,(a,b)=>mul(a,b)).map(x=>add(mul(x,k),seed)),
 self_squared_distance:(xs,seed,k)=>zip(xs,xs,(a,b)=>mul(sub(a,b),sub(a,b)))
};
export const call=(name,args)=>functions[name](...args);

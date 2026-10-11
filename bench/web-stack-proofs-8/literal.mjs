// Original source expression grouping; normal JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 centered_fourth_moment:(xs,seed,k)=>Array.from(xs,x=>add(sub(add(sub(mul(mul(mul(x,x),x),x),mul(mul(mul(mul(4,x),x),x),seed)),mul(mul(mul(mul(6,x),x),seed),seed)),mul(mul(mul(mul(4,x),seed),seed),seed)),mul(mul(mul(seed,seed),seed),seed))),
 centered_sixth_moment:(xs,seed,k)=>Array.from(xs,x=>add(sub(add(sub(add(sub(mul(mul(mul(mul(mul(x,x),x),x),x),x),mul(mul(mul(mul(mul(mul(6,x),x),x),x),x),seed)),mul(mul(mul(mul(mul(mul(15,x),x),x),x),seed),seed)),mul(mul(mul(mul(mul(mul(20,x),x),x),seed),seed),seed)),mul(mul(mul(mul(mul(mul(15,x),x),seed),seed),seed),seed)),mul(mul(mul(mul(mul(mul(6,x),seed),seed),seed),seed),seed)),mul(mul(mul(mul(mul(seed,seed),seed),seed),seed),seed))),
 centered_eighth_moment:(xs,seed,k)=>Array.from(xs,x=>add(sub(add(sub(add(sub(add(sub(mul(mul(mul(mul(mul(mul(mul(x,x),x),x),x),x),x),x),mul(mul(mul(mul(mul(mul(mul(mul(8,x),x),x),x),x),x),x),seed)),mul(mul(mul(mul(mul(mul(mul(mul(28,x),x),x),x),x),x),seed),seed)),mul(mul(mul(mul(mul(mul(mul(mul(56,x),x),x),x),x),seed),seed),seed)),mul(mul(mul(mul(mul(mul(mul(mul(70,x),x),x),x),seed),seed),seed),seed)),mul(mul(mul(mul(mul(mul(mul(mul(56,x),x),x),seed),seed),seed),seed),seed)),mul(mul(mul(mul(mul(mul(mul(mul(28,x),x),seed),seed),seed),seed),seed),seed)),mul(mul(mul(mul(mul(mul(mul(mul(8,x),seed),seed),seed),seed),seed),seed),seed)),mul(mul(mul(mul(mul(mul(mul(seed,seed),seed),seed),seed),seed),seed),seed))),
 projected_right:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,x),seed)),xs,(a,b)=>b).map(x=>add(mul(x,k),seed)),
 projected_left:(xs,seed,k)=>zip(xs,Array.from(xs,x=>add(mul(x,x),seed)),(a,b)=>a).map(x=>x<seed?mul(x,k):add(x,seed)),
 complemented_total:(xs,seed,k)=>zip(Array.from(xs,x=>sub(seed,x)),xs,(a,b)=>add(a,b)).map(x=>add(mul(x,k),seed))
};
export const call=(name,args)=>functions[name](...args);

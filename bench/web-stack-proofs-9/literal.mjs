// Original source expression grouping/stages; normal JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 bernstein_cubic_constant:(xs,seed,k)=>Array.from(xs,x=>add(add(add(mul(mul(mul(seed,sub(1,x)),sub(1,x)),sub(1,x)),mul(mul(mul(mul(3,seed),x),sub(1,x)),sub(1,x))),mul(mul(mul(mul(3,seed),x),x),sub(1,x))),mul(mul(mul(seed,x),x),x))),
 bernstein_quintic_constant:(xs,seed,k)=>Array.from(xs,x=>add(add(add(add(add(mul(mul(mul(mul(mul(seed,sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),mul(mul(mul(mul(mul(mul(5,seed),x),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(10,seed),x),x),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(10,seed),x),x),x),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(5,seed),x),x),x),x),sub(1,x))),mul(mul(mul(mul(mul(seed,x),x),x),x),x))),
 bernstein_septic_constant:(xs,seed,k)=>Array.from(xs,x=>add(add(add(add(add(add(add(mul(mul(mul(mul(mul(mul(mul(seed,sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),mul(mul(mul(mul(mul(mul(mul(mul(7,seed),x),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(mul(21,seed),x),x),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(mul(35,seed),x),x),x),sub(1,x)),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(mul(35,seed),x),x),x),x),sub(1,x)),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(mul(21,seed),x),x),x),x),x),sub(1,x)),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(mul(7,seed),x),x),x),x),x),x),sub(1,x))),mul(mul(mul(mul(mul(mul(mul(seed,x),x),x),x),x),x),x))),
 mapped_difference:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,k),seed)),Array.from(xs,x=>add(mul(x,k),seed)),(a,b)=>sub(a,b)).map(x=>add(x,seed)),
 paired_complement:(xs,seed,k)=>zip(Array.from(xs,x=>mul(x,k)),Array.from(xs,x=>sub(seed,mul(x,k))),(a,b)=>add(a,b)).map(x=>add(x,seed)),
 padded_prefix:(xs,seed,k)=>zip(Array.from(xs).concat(Array.from(xs)),xs,(a,b)=>add(a,b)).map(x=>x<seed?mul(x,k):add(x,seed))
};
export const call=(name,args)=>functions[name](...args);

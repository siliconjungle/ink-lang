// Original source expression grouping/stages; normal JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 cubic_difference:(xs,seed,k)=>Array.from(xs,x=>add(add(sub(mul(mul(add(x,k),add(x,k)),add(x,k)),mul(mul(mul(2,x),x),x)),mul(mul(sub(x,k),sub(x,k)),sub(x,k))),seed)),
 quartic_difference:(xs,seed,k)=>Array.from(xs,x=>add(add(sub(mul(mul(mul(add(x,k),add(x,k)),add(x,k)),add(x,k)),mul(mul(mul(mul(2,x),x),x),x)),mul(mul(mul(sub(x,k),sub(x,k)),sub(x,k)),sub(x,k))),seed)),
 quintic_difference:(xs,seed,k)=>Array.from(xs,x=>add(add(sub(mul(mul(mul(mul(add(x,k),add(x,k)),add(x,k)),add(x,k)),add(x,k)),mul(mul(mul(mul(mul(2,x),x),x),x),x)),mul(mul(mul(mul(sub(x,k),sub(x,k)),sub(x,k)),sub(x,k)),sub(x,k))),seed)),
 nested_left_route:(xs,seed,k)=>zip(zip(xs,xs,(a,b)=>add(a,mul(b,k))),xs,(a,b)=>sub(a,mul(b,seed))).map(x=>add(x,seed)),
 nested_right_route:(xs,seed,k)=>zip(xs,zip(xs,xs,(a,b)=>add(a,mul(b,k))),(a,b)=>sub(mul(a,seed),b)).map(x=>x<seed?mul(x,k):add(x,seed)),
 multiplicative_pair:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,k),seed)),Array.from(xs,x=>sub(mul(x,k),seed)),(a,b)=>mul(a,b)).map(x=>add(x,seed))
};
export const call=(name,args)=>functions[name](...args);

// Original U32 source operations/stages; normal JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 centered_energy:(xs,seed,k)=>Array.from(xs,x=>sub(add(mul(x,x),mul(seed,seed)),mul(mul(2,x),seed))),
 complementary_blend:(xs,seed,k)=>Array.from(xs,x=>add(mul(x,k),mul(add(x,seed),sub(1,k)))),
 calibrated_energy:(xs,seed,k)=>Array.from(xs,x=>add(add(mul(mul(x,seed),mul(x,seed)),mul(mul(2,mul(x,seed)),k)),mul(k,k))),
 minimum_route:(xs,seed,k)=>zip(xs,xs,(a,b)=>a<b?a:b).map(x=>add(mul(x,k),seed)),
 maximum_route:(xs,seed,k)=>zip(xs,xs,(a,b)=>a<b?b:a).map(x=>x<seed?mul(x,k):add(x,seed)),
 equality_route:(xs,seed,k)=>zip(xs,xs,(a,b)=>a===b?mul(a,k):mul(b,seed)).map(x=>add(x,seed))
};
export const call=(name,args)=>functions[name](...args);

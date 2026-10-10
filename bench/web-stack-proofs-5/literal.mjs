// Original source stages, wrapping U32 arithmetic and normal JIT optimization.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const head=(xs,z)=>xs.length?xs[0]:z;
const sum=xs=>{let a=0;for(let i=xs.length-1;i>=0;i--)a=add(xs[i],a);return a;};
const spread=(xs,seed,k)=>Array.from(xs,x=>sub(mul(x,k),mul(x,seed)));
const functions={
 scaled_first:(xs,seed,k)=>head(Array.from(xs,x=>mul(x,k)),mul(seed,k)),
 calibrated_first:(xs,seed,k)=>head(Array.from(xs,x=>add(mul(x,k),seed)),add(mul(seed,k),seed)),
 first_below_threshold:(xs,seed,k)=>head(Array.from(xs,x=>x<seed),k<seed)?1:0,
 discount_total:(xs,seed,k)=>sum(Array.from(xs,x=>sub(x,mul(x,k)))),
 spread_total:(xs,seed,k)=>sum(spread(xs,seed,k)),
 dead_map_fold:(xs,seed,k)=>{const mapped=Array.from(xs,x=>add(mul(x,k),seed));let a=seed;for(let i=mapped.length-1;i>=0;i--)a=a;return a;},
 spread_map:spread
};
export const call=(name,args)=>functions[name](...args);

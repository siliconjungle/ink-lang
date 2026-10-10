// Original concat algorithms; ordinary target-native trusted inputs.
function concat(xs,ys){const n=xs.length,out=new Array(n+ys.length);for(let i=0;i<n;i++)out[i]=xs[i];for(let i=0;i<ys.length;i++)out[n+i]=ys[i];return out;}
const functions={
 concat_count:(xs,ys,seed,factor)=>BigInt(concat(xs,ys).length),
 concat_fold:(xs,ys,seed,factor)=>{const joined=concat(xs,ys);let a=seed;for(let i=joined.length-1;i>=0;i--)a=(joined[i]-a)>>>0;return a;},
 concat_sum:(xs,ys,seed,factor)=>{let a=0;for(const x of concat(xs,ys))a=(a+x)>>>0;return a;},
 concat_empty:(xs,ys,seed,factor)=>concat(xs,ys.filter(x=>false)),
 concat_map:(xs,ys,seed,factor)=>concat(Array.from(xs,x=>Math.imul(x,factor)>>>0),Array.from(ys,x=>Math.imul(x,factor)>>>0))
};
export const call=(name,args)=>functions[name](...args);

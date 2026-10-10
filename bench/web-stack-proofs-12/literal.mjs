// Original source grouping/stages; normal JIT optimization allowed.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const concat=(xs,ys)=>{const out=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)out[i]=xs[i];for(let i=0;i<ys.length;i++)out[xs.length+i]=ys[i];return out;};
const functions={
 cubic_odd_difference:(xs,seed,k)=>Array.from(xs,x=>add(sub(mul(mul(add(x,k),add(x,k)),add(x,k)),mul(mul(sub(x,k),sub(x,k)),sub(x,k))),seed)),
 quartic_odd_difference:(xs,seed,k)=>Array.from(xs,x=>add(sub(mul(mul(mul(add(x,k),add(x,k)),add(x,k)),add(x,k)),mul(mul(mul(sub(x,k),sub(x,k)),sub(x,k)),sub(x,k))),seed)),
 quintic_odd_difference:(xs,seed,k)=>Array.from(xs,x=>add(sub(mul(mul(mul(mul(add(x,k),add(x,k)),add(x,k)),add(x,k)),add(x,k)),mul(mul(mul(mul(sub(x,k),sub(x,k)),sub(x,k)),sub(x,k)),sub(x,k))),seed)),
 gated_mapped_left:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,x),seed)),xs,(a,b)=>b<seed?a:b).map(x=>add(mul(x,k),seed)),
 gated_mapped_right:(xs,seed,k)=>zip(xs,Array.from(xs,x=>add(mul(x,x),seed)),(a,b)=>a<seed?a:b).map(x=>add(mul(x,k),seed)),
 mode_selected_pair:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,x),seed)),Array.from(xs,x=>sub(mul(x,k),seed)),(a,b)=>seed<k?a:b).map(x=>add(x,seed))
};
export const call=(name,args)=>functions[name](...args);

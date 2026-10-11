// Original algorithms, dispatched once per call; wrapping at every arithmetic step.
const mul=(a,b)=>Math.imul(a,b)>>>0, add=(a,b)=>(a+b)>>>0, sub=(a,b)=>(a-b)>>>0;
const q=(a,k)=>sub(sub(mul(add(a,k),add(a,k)),mul(a,a)),mul(mul(2,a),k));
const c=(a,k)=>sub(sub(sub(mul(mul(add(a,k),add(a,k)),add(a,k)),mul(mul(a,a),a)),mul(mul(mul(3,a),a),k)),mul(mul(mul(3,a),k),k));
const functions={
 quadratic:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<4096;i++)a=add(q(a,k),a);return a;}),
 cubic:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<1024;i++)a=add(c(a,k),a);return a;}),
 bilinear:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<1024;i++)a=add(sub(mul(add(a,k),sub(a,k)),mul(a,a)),a);return a;}),
 map_quadratic:(xs,seed,k)=>Array.from(xs,x=>q(x,k)),
 map_cubic:(xs,seed,k)=>Array.from(xs,x=>c(x,k)),
 cross_bool:(xs,seed,k)=>Array.from(xs,x=>x<seed).map(b=>b?k:add(k,1)),
 self_zip:(xs,seed,k)=>{const out=new Array(xs.length);for(let i=0;i<xs.length;i++)out[i]=add(xs[i],xs[i]);return out;},
 zero_scan:(xs,seed,k)=>{const zeros=Array.from(xs,x=>sub(x,x)),out=new Array(xs.length);let a=0;for(let i=0;i<zeros.length;i++)out[i]=a=add(a,zeros[i]);return out;},
 frontier_guarded_write:(xs,seed,k)=>Array.from(xs,x=>add(x===seed?seed:x,k)),
 frontier_repeat_restore:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<512;i++)a=x;return add(a,k);}),
 ordered_fold:(xs,seed,k)=>{const mapped=Array.from(xs,x=>mul(x,k));let a=seed;for(let i=mapped.length-1;i>=0;i--)a=sub(mapped[i],a);return a;}
};
export const call=(name,args)=>functions[name](...args);

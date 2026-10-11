// Original source stages, with wrapping after every arithmetic operation.
// Dispatch is outside element/repetition loops; no closed-form rewrite here.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const p4=a=>mul(mul(mul(a,a),a),a),p5=a=>mul(p4(a),a);
const q=(a,k)=>sub(sub(sub(sub(p4(add(a,k)),p4(a)),mul(mul(mul(mul(4,a),a),a),k)),mul(mul(mul(mul(6,a),a),k),k)),mul(mul(mul(mul(4,a),k),k),k));
const c=(a,k)=>sub(sub(sub(sub(sub(p5(add(a,k)),p5(a)),mul(mul(mul(mul(mul(5,a),a),a),a),k)),mul(mul(mul(mul(mul(10,a),a),a),k),k)),mul(mul(mul(mul(mul(10,a),a),k),k),k)),mul(mul(mul(mul(mul(5,a),k),k),k),k));
const weighted=(xs,seed,k)=>{const out=new Array(xs.length);for(let i=0;i<xs.length;i++)out[i]=add(mul(xs[i],k),mul(xs[i],seed));return out;};
const functions={
 quartic_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<1024;i++)a=add(q(a,k),a);return a;}),
 quintic_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<1024;i++)a=add(c(a,k),a);return a;}),
 quartic_map:(xs,seed,k)=>Array.from(xs,x=>q(x,k)),
 weighted_zip_fold:(xs,seed,k)=>{const zipped=weighted(xs,seed,k);let a=seed;for(let i=zipped.length-1;i>=0;i--)a=sub(zipped[i],a);return a;},
 mapped_filter_fold:(xs,seed,k)=>{const mapped=Array.from(xs,x=>mul(x,k)),filtered=mapped.filter(x=>x<seed);let a=seed;for(let i=filtered.length-1;i>=0;i--)a=sub(filtered[i],a);return a;},
 weighted_zip_sum:(xs,seed,k)=>{const zipped=weighted(xs,seed,k);let a=0;for(const x of zipped)a=add(a,x);return a;}
};
export const call=(name,args)=>functions[name](...args);

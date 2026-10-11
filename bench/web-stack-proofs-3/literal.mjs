// Literal original source stages. All arithmetic wraps to U32.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const map=(xs,k)=>Array.from(xs,x=>mul(x,k));
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 mapped_left_zip:(xs,seed,k)=>zip(map(xs,k),xs,add),
 mapped_right_zip:(xs,seed,k)=>zip(xs,map(xs,k),sub),
 mapped_both_zip:(xs,seed,k)=>zip(map(xs,k),map(xs,seed),sub),
 captured_branch_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<256;i++)a=x<seed?add(a,k):sub(a,seed);return a;}),
 affine_blend_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x;for(let i=0;i<256;i++)a=add(mul(a,k),mul(add(a,seed),sub(1,k)));return a;}),
 captured_mask_repeat:(xs,seed,k)=>Array.from(xs,x=>{let a=x<seed?seed:x;for(let i=0;i<256;i++)a=x<seed?seed:a;return a;})
};
export const call=(name,args)=>functions[name](...args);

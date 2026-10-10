// Literal original source stages. All arithmetic wraps to U32.
const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const squareSeed=(xs,seed)=>Array.from(xs,x=>add(mul(x,x),seed));
const zip=(xs,ys,f)=>{const out=new Array(Math.min(xs.length,ys.length));for(let i=0;i<out.length;i++)out[i]=f(xs[i],ys[i]);return out;};
const functions={
 generic_left_zip:(xs,seed,k)=>zip(squareSeed(xs,seed),xs,(a,b)=>sub(a,mul(b,k))),
 generic_right_zip:(xs,seed,k)=>zip(xs,squareSeed(xs,seed),(a,b)=>sub(a,mul(b,k))),
 generic_both_zip:(xs,seed,k)=>zip(squareSeed(xs,seed),Array.from(xs,x=>add(x,seed)),(a,b)=>sub(a,mul(b,k))),
 generic_self_zip:(xs,seed,k)=>zip(xs,xs,(a,b)=>sub(a,mul(b,k))),
 zip_then_map:(xs,seed,k)=>zip(xs,xs,(a,b)=>sub(a,mul(b,k))).map(x=>add(x,seed)),
 conserved_total:(xs,seed,k)=>Array.from(xs,x=>add(mul(x,k),mul(sub(seed,x),k)))
};
export const call=(name,args)=>functions[name](...args);

// Already-reduced strong one-pass prefix controls, paired inputs only. Scalar
// dispatch is outside the loop, no temporary mapped/scan/zip arrays.
const post=(x,seed,k)=>(x<seed?x+k:x-k)>>>0;
const rawAdd=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);let acc=0;for(let i=0;i<n;i++){acc=(acc+xs[i]+ys[i])>>>0;out[i]=post(acc,seed,k)}return out};
const rawSub=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);let acc=0;for(let i=0;i<n;i++){acc=(acc+xs[i]-ys[i])>>>0;out[i]=post(acc,seed,k)}return out};
const mappedAdd=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);let acc=0;for(let i=0;i<n;i++){const a=((k===0?0:Math.trunc(xs[i]/k))+seed)>>>0,b=((k===0?0:ys[i]%k)+k)>>>0;acc=(acc+a+b)>>>0;out[i]=post(acc,seed,k)}return out};
const mappedSub=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);let acc=0;for(let i=0;i<n;i++){const a=((k===0?0:Math.trunc(xs[i]/k))+seed)>>>0,b=((k===0?0:ys[i]%k)+k)>>>0;acc=(acc+a-b)>>>0;out[i]=post(acc,seed,k)}return out};
export const expert={pipeline32_paired_prefix_add_u32:rawAdd,pipeline32_paired_prefix_subtract_u32:rawSub,pipeline32_paired_prefix_add_heldout_u32:mappedAdd,pipeline32_paired_prefix_subtract_heldout_u32:mappedSub};

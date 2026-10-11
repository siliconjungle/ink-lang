// Already-fused strong controls: both source values observed, only paired prefix
// mapped, mapper arithmetic and nested grouping preserved, fresh owned output.
const left=(x,seed,k)=>((k===0?0:Math.trunc(x/k))+x+seed)>>>0;
const right=(y,k)=>((k===0?0:y%k)+y+k)>>>0;
const post=(x,seed,k)=>(x<seed?x+k:x-k)>>>0;
const raw=(a,b,seed,k)=>((a<b?a+Math.imul(b,k):a-Math.imul(b,k))+seed)>>>0;
const held=(a,b,seed,k)=>(a<seed?Math.imul((a+b)>>>0,k):a-b+seed)>>>0;
const fusedLeft=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=raw(left(xs[i],seed,k),ys[i],seed,k);return out};
const fusedRight=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=raw(xs[i],right(ys[i],k),seed,k);return out};
const fusedBoth=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=held(left(xs[i],seed,k),right(ys[i],k),seed,k);return out};
const fusedNested=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=held(post(left(xs[i],seed,k),seed,k),right(ys[i],k),seed,k);return out};
export const expert={pipeline35_left_observed_u32:fusedLeft,pipeline35_right_observed_u32:fusedRight,pipeline35_both_observed_heldout_u32:fusedBoth,pipeline35_nested_observed_heldout_u32:fusedNested};

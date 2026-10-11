// Strong fused controls inspect only retained words through paired min extent.
// Captured-JS cohort returns a fresh owned Array, like generated JS controls.
const base=(y,seed,k)=>(y<seed?y+k:y-k)>>>0;
const held=(y,seed,k)=>(y<seed?(k===0?0:Math.trunc(y/k))+seed:(k===0?0:y%k)+k)>>>0;
const left=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=base(ys[i],seed,k);return out};
const right=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=base(xs[i],seed,k);return out};
const leftComposed=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=held(ys[i],seed,k);return out};
const rightComposed=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++)out[i]=held(xs[i],seed,k);return out};
export const expert={pipeline37_left_projection_u32:left,pipeline37_right_projection_u32:right,pipeline37_left_projection_heldout_u32:leftComposed,pipeline37_right_projection_heldout_u32:rightComposed};

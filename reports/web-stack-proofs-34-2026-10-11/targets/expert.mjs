// Strong controls already omit discarded producers, return fresh owned arrays,
// and dispatch the selected orientation/callback outside the hot loop.
const rawLeft=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++){const x=ys[i];out[i]=(x<seed?x+k:x-k)>>>0}return out};
const rawRight=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++){const x=xs[i];out[i]=(x<seed?x+k:x-k)>>>0}return out};
const mappedLeft=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++){const x=ys[i];out[i]=(x<seed?(k===0?0:Math.trunc(x/k))+seed:(k===0?0:x%k)+k)>>>0}return out};
const mappedRight=(xs,ys,seed,k)=>{const n=Math.min(xs.length,ys.length),out=new Array(n);for(let i=0;i<n;i++){const x=xs[i];out[i]=(x<seed?(k===0?0:Math.trunc(x/k))+seed:(k===0?0:x%k)+k)>>>0}return out};
export const expert={
 pipeline34_left_projection_u32:rawLeft,
 pipeline34_right_projection_u32:rawRight,
 pipeline33_left_projection_heldout_u32:mappedLeft,
 pipeline33_right_projection_heldout_u32:mappedRight,
};

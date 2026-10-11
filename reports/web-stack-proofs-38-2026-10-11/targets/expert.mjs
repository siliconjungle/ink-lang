// Strong fused controls observe both indexed values and preserve pair grouping.
// Fresh owned Array output, same declared capture ABI including unused suffix.
const baseLeft=(i,x,seed,k)=>(i<seed?x+k:x-seed)>>>0;
const baseRight=(i,x,seed,k)=>(i%3===0?Math.imul(x,k):x+seed)>>>0;
const basePair=(a,b,seed,k)=>(a<b?a+Math.imul(b,k):a-b+seed)>>>0;
const composedLeft=(i,x,seed,k)=>((k===0?0:Math.trunc(x/k))+(k===0?0:i%k)+seed)>>>0;
const composedRight=(i,x,seed,k)=>(i<seed?x+k:Math.imul(x,3))>>>0;
const composedPair=(a,b,seed,k)=>(a<b?(k===0?0:Math.trunc(a/k))+b:(k===0?0:b%k)+a)>>>0;
const plain=(xs,ys,seed,k)=>{const out=new Array(xs.length);for(let i=0;i<xs.length;i++){const x=xs[i],a=baseLeft(i,x,seed,k),b=baseRight(i,x,seed,k);out[i]=basePair(a,b,seed,k)}return out};
const composed=(xs,ys,seed,k)=>{const out=new Array(xs.length);for(let i=0;i<xs.length;i++){const x=xs[i],a=composedLeft(i,x,seed,k),b=composedRight(i,x,seed,k);out[i]=composedPair(a,b,seed,k)}return out};
export const expert={pipeline38_left_padded_zip_u32:plain,pipeline38_right_padded_zip_u32:plain,pipeline38_left_padded_zip_heldout_u32:composed,pipeline38_right_padded_zip_heldout_u32:composed};

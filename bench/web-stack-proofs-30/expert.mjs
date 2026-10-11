// Strong one-pass controls share mapper values and write final owned Arrays.
// There are no staged intermediate arrays and no final Array.from copy.
const concatCheap=(xs,ys,seed,k)=>{const out=new Array(xs.length+ys.length);let count=0;for(let i=0;i<xs.length;i++){const x=xs[i];if(x<seed)out[count++]=x}for(let i=0;i<ys.length;i++){const x=ys[i];if(x<seed)out[count++]=x}out.length=count;return out};
const concatRemainder=(xs,ys,seed,k)=>{const out=new Array(xs.length+ys.length);let count=0;for(let i=0;i<xs.length;i++){const x=xs[i];if((k?x%k:0)<seed)out[count++]=x}for(let i=0;i<ys.length;i++){const x=ys[i];if((k?x%k:0)<seed)out[count++]=x}out.length=count;return out};
const calibratedCheap=(xs,seed,k)=>{const out=new Array(xs.length);let count=0;for(let i=0;i<xs.length;i++){const x=xs[i],y=(x<seed?x+k:x-k)>>>0;if(y<seed)out[count++]=(seed-y)>>>0}out.length=count;return out};
const calibratedQuotient=(xs,seed,k)=>{const out=new Array(xs.length);let count=0;for(let i=0;i<xs.length;i++){const x=xs[i],y=(x+(k?Math.trunc(x/k):0))>>>0;if(y<seed)out[count++]=(y<k?k-y:Math.imul(y,k)+1)>>>0}out.length=count;return out};
export const expert={pipeline30_merged_selection_u32:concatCheap,pipeline30_calibrated_selection_u32:calibratedCheap,pipeline30_merged_selection_heldout_u32:concatRemainder,pipeline30_calibrated_selection_heldout_u32:calibratedQuotient};

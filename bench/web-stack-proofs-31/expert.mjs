// Strong owned controls: projection skips unused producer; prefix hoists scalar
// constant once and emits directly to ordinary Array, with exact U32 wrapping.
const select=(xs,seed,k)=>{const out=new Array(xs.length);let count=0;for(let i=0;i<xs.length;i++){const x=xs[i];if(x<seed)out[count++]=(x<k?k-x:x+k)>>>0}out.length=count;return out};
const prefix=(xs,c)=>{const out=new Array(xs.length);let acc=0;for(let i=0;i<xs.length;i++){acc=(acc+c)>>>0;out[i]=acc}return out};
export const expert={pipeline31_left_projection_u32:select,pipeline31_right_projection_heldout_u32:select,pipeline31_uniform_prefix_u32:(xs,seed,k)=>prefix(xs,(seed+k)>>>0),pipeline31_uniform_prefix_heldout_u32:(xs,seed,k)=>prefix(xs,((k===0?0:Math.trunc(seed/k))+1)>>>0)};

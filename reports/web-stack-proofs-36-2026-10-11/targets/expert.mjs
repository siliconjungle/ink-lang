// Scalar controls fuse total maps into exactly last-to-first ordered folds.
const left=(x,seed,k)=>((k===0?0:Math.trunc(x/k))+seed)>>>0;
const right=(x,k)=>((k===0?0:x%k)+k)>>>0;
const post=(x,seed,k)=>(x<seed?x+k:x-k)>>>0;
const reduce=(x,acc,seed,k)=>(acc<seed?x+Math.imul(acc,k):x-acc)>>>0;
const plain=(xs,ys,seed,k)=>{let acc=seed;for(let i=xs.length;i--;)acc=reduce(left(xs[i],seed,k),acc,seed,k);return acc};
const nested=(xs,ys,seed,k)=>{let acc=seed;for(let i=xs.length;i--;)acc=reduce(post(left(xs[i],seed,k),seed,k),acc,seed,k);return acc};
const filtered=(xs,ys,seed,k)=>{let acc=seed;for(let i=xs.length;i--;){const x=xs[i];if((k===0?0:x%k)<seed)acc=reduce(left(x,seed,k),acc,seed,k)}return acc};
const concat=(xs,ys,seed,k)=>{let acc=seed;for(let i=ys.length;i--;)acc=reduce(right(ys[i],k),acc,seed,k);for(let i=xs.length;i--;)acc=reduce(left(xs[i],seed,k),acc,seed,k);return acc};
export const expert={pipeline36_plain_ordered_u32:plain,pipeline36_nested_ordered_u32:nested,pipeline36_filtered_ordered_heldout_u32:filtered,pipeline36_concat_ordered_heldout_u32:concat};

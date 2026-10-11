// Hand-fused controls, exact wrapping and owned Array/scalar results.
function affine(xs,ys,seed,k){const out=new Array(xs.length);for(let i=0;i<xs.length;i++)out[i]=(Math.imul(xs[i],k)+seed)>>>0;return out}
function compaction(xs,ys,seed,k){const out=[];for(let i=0;i<xs.length;i++){const x=xs[i];if(x%16<seed)out.push((Math.imul(x,k)+1)>>>0)}return out}
function scan(xs){const out=new Array(xs.length);let sum=0;for(let i=0;i<xs.length;i++){sum=(sum+xs[i])>>>0;out[i]=sum}return out}
function branch(xs,ys,seed,k){const out=new Array(xs.length);for(let i=0;i<xs.length;i++){const x=xs[i];out[i]=(x<seed?Math.imul(x,k)+1:(k?Math.trunc(x/k):0)+seed)>>>0}return out}
function ordered(xs,ys,seed,k){let acc=seed;for(let i=xs.length-1;i>=0;i--)acc=(acc<seed?xs[i]+Math.imul(acc,k):xs[i]-acc)>>>0;return acc}
function stencil(xs,ys,seed,k){const out=new Array(xs.length);for(let i=0;i<xs.length;i++)out[i]=((i?xs[i-1]:0)+Math.imul(xs[i],k)+(i+1<xs.length?xs[i+1]:0))>>>0;return out}
function update(xs,ys,seed,k){const out=Array.from(xs);if(k)for(let i=0,n=Math.min(xs.length,ys.length);i<n;i+=k)out[i]=ys[i];return out}
function recompute(xs,ys,seed,k){const out=new Array(xs.length);for(let i=0;i<xs.length;i++)out[i]=k&&i%k===0&&i<ys.length?ys[i]:xs[i];return out}
function compactionChain(xs,ys,seed,k){const out=[];for(let i=0;i<xs.length;i++){const x=(Math.imul(xs[i],k)+1)>>>0;if(x%16<seed)out.push((x<seed?x+k:x-seed)>>>0)}return out}
function scanChain(xs,ys,seed,k){const out=new Array(xs.length);let acc=0;for(let i=0;i<xs.length;i++){const x=xs[i],v=((k?Math.trunc(x/k):0)+x+seed)>>>0;acc=(acc+v)>>>0;out[i]=acc}return out}
function dotOrdered(xs,ys,seed,k){let acc=seed;for(let i=Math.min(xs.length,ys.length)-1;i>=0;i--)acc=(Math.imul(xs[i],ys[i])+Math.imul(acc,k))>>>0;return acc}
function gatherReverse(xs,ys,seed,k){const out=new Array(xs.length);for(let i=0;i<xs.length;i++){const j=(seed-i-1)>>>0;out[i]=((j<ys.length?ys[j]:xs[i])+Math.imul(xs[i],k))>>>0}return out}
export const expert={general40_affine:affine,general40_compaction:compaction,general40_scan:scan,general40_branch:branch,general40_ordered:ordered,general40_stencil:stencil,general40_update:recompute,general40_update_recompute:recompute,general40_compaction_chain:compactionChain,general40_scan_chain:scanChain,general40_dot_ordered:dotOrdered,general40_gather_reverse:gatherReverse};

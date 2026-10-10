const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;
export function createExpert(capacity){const scratch=Object.fromEntries([7].map(i=>[i,new Uint32Array(capacity)]));const functions={"demand_mapped_head_u32":(xs,ys,seed,k)=>{const x=xs.length?xs[0]:seed;return ((x>k)?add(mul(x,k),seed):sub(seed,x));},
"demand_mapped_head_heldout_u32":(xs,ys,seed,k)=>{const x=xs.length?xs[0]:seed;return ((x<k)?add(mul(x,x),seed):mul(sub(x,seed),add(x,k)));},
"demand_filtered_mapped_head_u32":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x>seed))return ((x>k)?add(mul(x,k),seed):sub(seed,x));}const x=seed;return ((x>k)?add(mul(x,k),seed):sub(seed,x));},
"demand_filtered_mapped_head_heldout_u32":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x<k))return ((x<k)?add(mul(x,x),seed):mul(sub(x,seed),add(x,k)));}const x=seed;return ((x<k)?add(mul(x,x),seed):mul(sub(x,seed),add(x,k)));},
"skip_first_accepted_u32":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x>seed))return x;}return seed;},
"skip_first_accepted_u32_heldout":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x<k))return x;}return seed;},
"reference_count_u32":(xs,ys,seed,k)=>{return BigInt(xs.length);},
"reference_indexed_u32":(xs,ys,seed,k)=>{const out=scratch[7];for(let j=0;j<xs.length;j++){const x=xs[j],i=j>>>0;out[j]=((rem(i,2,0)==0)?add(x,k):sub(x,seed));}return out.subarray(0,xs.length);}};return {call:(name,args)=>functions[name](...args),get:name=>functions[name]};}

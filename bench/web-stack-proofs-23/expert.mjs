const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;
export function createExpert(capacity){const scratch=Object.fromEntries([6, 7, 9, 10].map(i=>[i,new Uint32Array(capacity)]));const functions={"skip_partition_count_u32":(xs,ys,seed,k)=>{return BigInt(xs.length);},
"skip_first_accepted_u32":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x>seed))return x;}return seed;},
"skip_mapped_first_accepted_u32":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x>seed))return ((x>k)?sub(x,k):add(x,k));}return seed;},
"skip_partition_count_u32_heldout":(xs,ys,seed,k)=>{return BigInt(xs.length);},
"skip_first_accepted_u32_heldout":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x<k))return x;}return seed;},
"skip_mapped_first_accepted_u32_heldout":(xs,ys,seed,k)=>{for(let j=0;j<xs.length;j++){const x=xs[j];if((x<k))return ((x<seed)?add(x,k):sub(x,seed));}return seed;},
"pipeline_scan_left_project_u32":(xs,ys,seed,k)=>{const out=scratch[6];for(let j=0;j<xs.length;j++){const x=xs[j];out[j]=((x<seed)?add(x,k):sub(x,seed));}return out.subarray(0,xs.length);},
"pipeline_scan_right_project_u32":(xs,ys,seed,k)=>{const out=scratch[7];for(let j=0;j<xs.length;j++){const x=xs[j];out[j]=((x<seed)?add(x,k):sub(x,seed));}return out.subarray(0,xs.length);},
"pipeline_scan_first_value_u32":(xs,ys,seed,k)=>{const first=xs.length?xs[0]:seed;return add(first,k);},
"pipeline_scan_left_project_heldout_u32":(xs,ys,seed,k)=>{const out=scratch[9];for(let j=0;j<xs.length;j++){const x=xs[j];out[j]=((x>k)?add(mul(x,k),seed):sub(seed,x));}return out.subarray(0,xs.length);},
"pipeline_scan_right_project_heldout_u32":(xs,ys,seed,k)=>{const out=scratch[10];for(let j=0;j<xs.length;j++){const x=xs[j];out[j]=((x>k)?add(mul(x,k),seed):sub(seed,x));}return out.subarray(0,xs.length);},
"pipeline_scan_first_value_heldout_u32":(xs,ys,seed,k)=>{const first=xs.length?xs[0]:seed;return add(mul(first,k),seed);}};return {call:(name,args)=>functions[name](...args)};}

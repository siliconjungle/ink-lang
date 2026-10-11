const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
export function createExpert(capacity){const scratch=Object.fromEntries([6, 7, 8, 9, 10, 11].map(i=>[i,new Uint32Array(capacity)]));const functions={"sorted_calibrated_total_u32":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,add(mul(x,3),k));}return a;},
"sorted_squared_energy_u32":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,add(mul(x,x),k));}return a;},
"sorted_distance_total_u32":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?sub(seed,x):sub(x,seed)));}return a;},
"sorted_calibrated_total_u32_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?mul(x,k):add(x,k)));}return a;},
"sorted_squared_energy_u32_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,mul(sub(x,seed),sub(x,seed)));}return a;},
"sorted_distance_total_u32_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?x:seed));}return a;},
"lower_projection_repeat_u32":(xs,ys,seed,k)=>{const out=scratch[6];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a<seed)?seed:a);}return out.subarray(0,xs.length);},
"upper_projection_repeat_u32":(xs,ys,seed,k)=>{const out=scratch[7];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a>k)?k:a);}return out.subarray(0,xs.length);},
"keyed_projection_repeat_u32":(xs,ys,seed,k)=>{const out=scratch[8];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a==seed)?k:a);}return out.subarray(0,xs.length);},
"lower_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{const out=scratch[9];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a<k)?k:a);}return out.subarray(0,xs.length);},
"upper_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{const out=scratch[10];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a>seed)?seed:a);}return out.subarray(0,xs.length);},
"keyed_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{const out=scratch[11];for(let i=0;i<xs.length;i++){const a=xs[i];out[i]=((a==k)?seed:a);}return out.subarray(0,xs.length);}};return {call:(name,args)=>functions[name](...args)};}

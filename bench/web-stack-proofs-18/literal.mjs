const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const functions={"sorted_calibrated_total_u32":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>add(mul(x,3),k));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"sorted_squared_energy_u32":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>add(mul(x,x),k));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"sorted_distance_total_u32":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>((x<seed)?sub(seed,x):sub(x,seed)));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"sorted_calibrated_total_u32_heldout":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>((x<seed)?mul(x,k):add(x,k)));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"sorted_squared_energy_u32_heldout":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>mul(sub(x,seed),sub(x,seed)));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"sorted_distance_total_u32_heldout":(xs,ys,seed,k)=>{const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>((x<seed)?x:seed));let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;},
"lower_projection_repeat_u32":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<8;j++)a=((a<seed)?seed:a);return a;});},
"upper_projection_repeat_u32":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<32;j++)a=((a>k)?k:a);return a;});},
"keyed_projection_repeat_u32":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<64;j++)a=((a==seed)?k:a);return a;});},
"lower_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<8;j++)a=((a<k)?k:a);return a;});},
"upper_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<32;j++)a=((a>seed)?seed:a);return a;});},
"keyed_projection_repeat_u32_heldout":(xs,ys,seed,k)=>{return Array.from(xs,x=>{let a=x;for(let j=0;j<64;j++)a=((a==k)?seed:a);return a;});}};export const call=(name,args)=>functions[name](...args);

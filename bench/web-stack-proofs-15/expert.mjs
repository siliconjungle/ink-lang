const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const filter=(xs,p)=>{const out=[];for(let i=0;i<xs.length;i++)if(p(xs[i]))out.push(xs[i]);return out;};
const zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));
export function createExpert(capacity){const scratch=[null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null].map(()=>new Uint32Array(capacity));const functions={"accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x<seed))continue;a=add(a,x);}return a;},
"calibrated_accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=add(mul(x,3),k);if(!(x<seed))continue;a=add(a,x);}return a;},
"accepted_calibrated_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x<seed))continue;x=add(mul(x,3),k);a=add(a,x);}return a;},
"dual_sum_add":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?sub(seed,x):sub(x,seed)));b=add(b,mul(add(x,seed),k));}return add(a,b);},
"dual_sum_subtract":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?sub(seed,x):sub(x,seed)));b=add(b,mul(add(x,seed),k));}return sub(a,b);},
"dual_sum_weighted":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x<seed)?sub(seed,x):sub(x,seed)));b=add(b,mul(add(x,seed),k));}return add(mul(a,k),mul(b,seed));},
"accepted_total_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x>k))continue;a=add(a,x);}return a;},
"calibrated_accepted_total_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=((x<seed)?sub(seed,x):sub(x,seed));if(!(x>k))continue;a=add(a,x);}return a;},
"accepted_calibrated_total_heldout":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x>k))continue;x=((x<seed)?sub(seed,x):sub(x,seed));a=add(a,x);}return a;},
"dual_sum_add_heldout":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x>k)?sub(x,k):sub(k,x)));b=add(b,add(mul(x,x),seed));}return add(a,b);},
"dual_sum_subtract_heldout":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x>k)?sub(x,k):sub(k,x)));b=add(b,add(mul(x,x),seed));}return sub(a,b);},
"dual_sum_weighted_heldout":(xs,ys,seed,k)=>{let a=0,b=0;for(let i=0;i<xs.length;i++){const x=xs[i];a=add(a,((x>k)?sub(x,k):sub(k,x)));b=add(b,add(mul(x,x),seed));}return add(mul(a,k),mul(b,seed));},
"abi_calibrated_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];x=add(mul(x,3),k);a=add(x,mul(a,k));}return a;},
"abi_accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x<seed))continue;a=add(a,x);}return a;},
"abi_calibrated_accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=add(mul(x,3),k);if(!(x<seed))continue;a=add(a,x);}return a;},
"abi_distance_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=((x<seed)?sub(seed,x):sub(x,seed));a=add(a,x);}return a;},
"abi_accepted_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];if(!(x>seed))continue;a=add(x,mul(a,k));}return a;},
"abi_calibrated_accepted_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];x=((x<seed)?add(x,k):sub(x,k));if(!(x>seed))continue;a=add(x,mul(a,k));}return a;}};return {call:(name,args)=>functions[name](...args)};}

const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const filter=(xs,p)=>{const out=[];for(let i=0;i<xs.length;i++)if(p(xs[i]))out.push(xs[i]);return out;};
const zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));
export function createExpert(capacity){const scratch=[null, null, null, null, null, null, null, null, null, null, null, null, null, null].map(()=>new Uint32Array(capacity));const functions={"calibrated_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];x=add(mul(x,3),k);a=add(x,mul(a,k));}return a;},
"accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];if(!(x<seed))continue;a=add(a,x);}return a;},
"calibrated_accepted_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=add(mul(x,3),k);if(!(x<seed))continue;a=add(a,x);}return a;},
"distance_total":(xs,ys,seed,k)=>{let a=0;for(let i=0;i<xs.length;i++){let x=xs[i];x=((x<seed)?sub(seed,x):sub(x,seed));a=add(a,x);}return a;},
"accepted_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];if(!(x>seed))continue;a=add(x,mul(a,k));}return a;},
"calibrated_accepted_checksum":(xs,ys,seed,k)=>{let a=seed;for(let i=xs.length-1;i>=0;i--){let x=xs[i];x=((x<seed)?add(x,k):sub(x,k));if(!(x>seed))continue;a=add(x,mul(a,k));}return a;},
"callback_mapped_head":(xs,ys,seed,k)=>{const x=xs[0];const value=xs.length?((x<seed)?seed:x):seed;return mul(value,k);},
"concat_first_result":(xs,ys,seed,k)=>{const value=xs.length?xs[0]:ys.length?ys[0]:seed;return add(value,k);},
"self_zip_cardinality":(xs,ys,seed,k)=>{return BigInt(xs.length);},
"clamped_first":(xs,ys,seed,k)=>{const x=xs[0];const value=xs.length?((x>k)?k:x):k;return sub(value,seed);},
"concat_signed_offset":(xs,ys,seed,k)=>{const value=xs.length?xs[0]:ys.length?ys[0]:k;return sub(value,seed);},
"paired_score_count":(xs,ys,seed,k)=>{return BigInt(xs.length);},
"threshold_remap":(xs,ys,seed,k)=>{const out=scratch[12];for(let i=0;i<xs.length;i++){const x=xs[i];out[i]=((x<seed)?mul(x,k):add(x,seed));}return out.subarray(0,xs.length);},
"calibration_pipeline":(xs,ys,seed,k)=>{const out=scratch[13];for(let i=0;i<xs.length;i++){const x=xs[i];out[i]=mul(((x<seed)?seed:x),k);}return out.subarray(0,xs.length);}};return {call:(name,args)=>functions[name](...args)};}

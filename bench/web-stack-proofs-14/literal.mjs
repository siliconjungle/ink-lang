const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;
const filter=(xs,p)=>{const out=[];for(let i=0;i<xs.length;i++)if(p(xs[i]))out.push(xs[i]);return out;};
const zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));
const functions={"calibrated_checksum":(xs,ys,seed,k)=>{let values=xs;values=Array.from(values,x=>add(mul(x,3),k));let a=seed;for(let i=values.length-1;i>=0;i--)a=add(values[i],mul(a,k));return a;},
"accepted_total":(xs,ys,seed,k)=>{let values=xs;values=filter(values,x=>x<seed);let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;},
"calibrated_accepted_total":(xs,ys,seed,k)=>{let values=xs;values=Array.from(values,x=>add(mul(x,3),k));values=filter(values,x=>x<seed);let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;},
"distance_total":(xs,ys,seed,k)=>{let values=xs;values=Array.from(values,x=>((x<seed)?sub(seed,x):sub(x,seed)));let a=0;for(let i=0;i<values.length;i++)a=add(a,values[i]);return a;},
"accepted_checksum":(xs,ys,seed,k)=>{let values=xs;values=filter(values,x=>x>seed);let a=seed;for(let i=values.length-1;i>=0;i--)a=add(values[i],mul(a,k));return a;},
"calibrated_accepted_checksum":(xs,ys,seed,k)=>{let values=xs;values=Array.from(values,x=>((x<seed)?add(x,k):sub(x,k)));values=filter(values,x=>x>seed);let a=seed;for(let i=values.length-1;i>=0;i--)a=add(values[i],mul(a,k));return a;},
"callback_mapped_head":(xs,ys,seed,k)=>{const values=Array.from(xs,x=>((x<seed)?seed:x));const value=values.length?values[0]:seed;return mul(value,k);},
"concat_first_result":(xs,ys,seed,k)=>{const values=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)values[i]=xs[i];for(let i=0;i<ys.length;i++)values[xs.length+i]=ys[i];const value=values.length?values[0]:seed;return add(value,k);},
"self_zip_cardinality":(xs,ys,seed,k)=>{const values=zip(xs,xs,(a,b)=>((a<seed)?add(mul(a,k),b):sub(b,seed)));return BigInt(values.length);},
"clamped_first":(xs,ys,seed,k)=>{const values=Array.from(xs,x=>((x>k)?k:x));const value=values.length?values[0]:k;return sub(value,seed);},
"concat_signed_offset":(xs,ys,seed,k)=>{const values=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)values[i]=xs[i];for(let i=0;i<ys.length;i++)values[xs.length+i]=ys[i];const value=values.length?values[0]:k;return sub(value,seed);},
"paired_score_count":(xs,ys,seed,k)=>{const values=zip(xs,xs,(a,b)=>((a==b)?sub(mul(a,k),seed):add(b,seed)));return BigInt(values.length);},
"threshold_remap":(xs,ys,seed,k)=>{return Array.from(xs,x=>((x<seed)?mul(x,k):add(x,seed)));},
"calibration_pipeline":(xs,ys,seed,k)=>{return Array.from(xs,x=>x<seed?seed:x).map(x=>mul(x,k));}};export const call=(name,args)=>functions[name](...args);

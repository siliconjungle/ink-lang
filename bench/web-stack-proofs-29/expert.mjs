// Allocation-free accepted-count consumers and one final owned concat output.
// Strong controls intentionally erase scan/indexed mapper work already.
const acceptedCount=(xs,seed,k)=>{let count=0;for(let i=0;i<xs.length;i++){const x=xs[i];if(x<seed?x<k:x>k)count++;}return BigInt(count)};
const calibrate=(x,seed,k)=>x<seed?(Math.imul(x,k)+seed)>>>0:(x-k)>>>0;
export const expert={
 pipeline_scan_telemetry_u32:acceptedCount,
 pipeline_indexed_telemetry_u32:acceptedCount,
 pipeline_merged_telemetry_u32:(xs,ys,seed,k)=>{const out=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)out[i]=calibrate(xs[i],seed,k);for(let i=0;i<ys.length;i++)out[xs.length+i]=calibrate(ys[i],seed,k);return out}
};

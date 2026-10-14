import {pathToFileURL} from 'node:url';
const {createState}=await import(pathToFileURL(process.argv[2]));
const state=createState(),put=state.bind('put',{resultOnly:true});
for(let i=0;i<4096;i++)put(BigInt(i),BigInt(i),i%2===0,false);
state.acknowledgeThrough(18446744073709551615n,18446744073709551615n);
globalThis.gc();const before=process.memoryUsage();
for(let i=0;i<65536;i++)put(BigInt(i%4096),BigInt(i),i%3===0,false);
globalThis.gc();const after=process.memoryUsage();
console.log(JSON.stringify({heap_used_before:before.heapUsed,heap_used_after:after.heapUsed,retained_heap_delta:after.heapUsed-before.heapUsed,version:String(state.version),events:state.outbox.length,scope:'Whole live state heap difference after explicit GC; retained events plus changed rows/keeps; no isolated event-only attribution'}));

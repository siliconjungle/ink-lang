import assert from 'node:assert/strict';
import{createHash}from'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function logicalSnapshot(bytes){
 const b=Buffer.from(bytes);assert(b.length>=116);
 assert.deepEqual(b.subarray(0,12),Buffer.from([86,76,83,84,65,84,69,0,1,0,1,0]));
 assert.equal(digest(b.subarray(0,-32)),b.subarray(-32).toString('hex'));
 const length=Number(b.readBigUInt64LE(76));assert(Number.isSafeInteger(length));assert.equal(length,b.length-116);
 // Each module separately restores its own complete, identity-bound snapshot.
 // Compare the exact schema and typed payload; never forge or rebind an input.
 return {schema:b.subarray(44,76).toString('hex'),payload:b.subarray(84,-32).toString('hex')};
}
export function generator(seed){let state=seed>>>0;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};}
export const median=xs=>{const a=[...xs].sort((a,b)=>a-b),i=a.length>>1;return a.length%2?a[i]:(a[i-1]+a[i])/2;};
export function shuffled(xs,next){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function denseForward(weights,features){
 let cursor=0,values=features;
 const dot=inputs=>{const base=cursor;cursor+=inputs.length+1;let value=Math.fround(0+Math.fround(1*weights[base+inputs.length]));for(let i=0;i<inputs.length;i++)value=Math.fround(value+Math.fround(1*Math.fround(weights[base+i]*inputs[i])));return value;};
 for(const width of[6,6]){const output=[];for(let i=0;i<width;i++){const value=dot(values),gate=dot(values);output.push(gate>0?Math.fround(value*gate):0);}values=output;}
 const output=[];for(let i=0;i<4;i++)output.push(dot(values));assert.equal(cursor,244);return output;
}

// Exact wrapping-u32 controls. Every call produces a fresh owned public result.
export function mix(v,i){return (Math.imul(v,1664525)+1013904223+i+Math.imul(v%251,v))>>>0;}
export function kernel(xs,kind){
 if(kind==='cheap-sum'){let sum=0;for(let k=0;k<xs.length;k++)sum=(sum+((Math.imul(xs[k],17)+1)>>>0))>>>0;return sum;}
 if(kind==='feedback32'){
  const first=new Uint32Array(xs.length),second=new Uint32Array(xs.length);let previous=xs;
  for(let r=0;r<32;r++){const next=r%2?second:first;for(let k=0;k<xs.length;k++){let v=(previous[k]+previous[(k+1)%xs.length])>>>0;for(let i=0;i<64;i++)v=mix(v,i);next[k]=v;}previous=next;}
  return Array.from(previous);
 }
 const out=new Array(xs.length);
 for(let k=0;k<xs.length;k++){let v=xs[k];if(kind==='affine')v=(Math.imul(v,17)+1)>>>0;else for(let i=0;i<512;i++)v=mix(v,i);out[k]=v;}return out;
}
export const data=(n,seed)=>Uint32Array.from({length:n},(_,i)=>(Math.imul(i,2654435761)+seed)>>>0);

// Artifact integrity is separate from the compiled restore operation's validation.
export async function readArtifact(url,{sha256,bytes}) {
 if(typeof sha256!=='string'||!/^[0-9a-f]{64}$/.test(sha256)||!Number.isSafeInteger(bytes)||bytes<0||bytes>64*1024*1024)throw Error('Invalid artifact descriptor');
 let stream;
 if(url.protocol==='file:') {
  const {createReadStream}=await import('node:fs');stream=createReadStream(url,{highWaterMark:65536});
 } else {
  const response=await fetch(url);if(!response.ok)throw Error('Artifact fetch failed: '+response.status);stream=response.body;
 }
 if(!stream)throw Error('Artifact stream unavailable');
 const chunks=[];let length=0;
 for await(const chunk of stream){length+=chunk.byteLength;if(length>bytes)throw Error('Artifact length mismatch');chunks.push(chunk);}
 if(length!==bytes)throw Error('Artifact length mismatch');
 const result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.byteLength;}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',result))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==sha256)throw Error('Artifact hash mismatch');return result;
}

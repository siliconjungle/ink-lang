// One module in one fresh VM; GC observations are diagnostics, not heap bounds.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
assert.equal(typeof global.gc,'function','run with --expose-gc');
const collect=()=>{global.gc();global.gc();return process.memoryUsage();};
const before=collect(),program=await import(pathToFileURL(join(resolve(process.argv[2]),'program.mjs')));
let state=await program.createState(),serve=state.bind('serve',{resultOnly:true}),retune=state.bind('retune',{resultOnly:true});
const setup=collect();let checksum=0;
for(let i=0;i<20000;i++){
 if(i%16===0){retune({scale:i%32?0.5:0.25,bias:i%32?0.25:-0.125},false);state.acknowledgeThrough(state.version,0n);}
 checksum+=serve(((i%31)-15)/8);
}
const steady=collect(),snapshot=await state.checkpoint();
const checkpoint=createHash('sha256').update(snapshot).digest('hex');
state.dispose?.();state=null;serve=null;retune=null;
const afterDrop=collect();
console.log(JSON.stringify({schema:1,processId:process.pid,node:process.version,before,setup,steady,afterDrop,
 maximumRssKiB:process.resourceUsage().maxRSS,checksum,checkpoint,snapshotBytes:snapshot.length,
 moduleRemainsImported:true,explicitGc:true,scope:'One fresh VM; retained heap/external/RSS observations after explicit GC, without a certified allocation or peak-heap bound.'}));

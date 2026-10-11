import {createState as direct} from './direct.mjs';import {createState as indexed} from './indexed.mjs';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const seed=direct();for(let i=0;i<4000;i++)await seed.invoke('put',[BigInt(i),BigInt(i),i%2===0,false]);seed.acknowledge_through(0xffffffffffffffffn,0xffffffffffffffffn);const initial=await seed.checkpoint(),samples=[];
for(let round=0;round<5;round++){let old=direct();await old.restore(initial);const start=process.hrtime.bigint();const bytes=await old.checkpoint(),next=indexed();await next.restore(bytes);old=null;globalThis.gc();samples.push(String(process.hrtime.bigint()-start));assert.deepEqual(await next.checkpoint(),bytes);}
await writeFile(process.argv[2],JSON.stringify(samples,null,2)+'\n');

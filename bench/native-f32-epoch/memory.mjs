import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL}from'node:url';import assert from'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'reports/native-f32-epoch-2026-10-13'),name=process.argv[2],lane=process.argv[3],fresh=process.argv[4]==='fresh';
assert.equal(typeof global.gc,'function');
const dir=fresh?(lane==='base'||lane==='grown'?path.join('automatic',lane,name):path.join('fresh',lane)):lane==='before'?'baseline':'after';
const mod=await import(pathToFileURL(path.join(out,dir,fresh&&(lane==='base'||lane==='grown')?'output.mjs':name+'.mjs')));
const read=p=>JSON.parse(fs.readFileSync(p)),fixtures=fresh?read(path.join(out,'fresh-fixtures.json')).filter(f=>f.program===name):read(path.join(root,'reports/real-software-delivery-2026-10-13/fixtures.json')).filter(f=>f.program===name);let sink=0;const rows=[];
for(const f of fixtures){const args=read(path.join(root,f.path));global.gc();const before=process.memoryUsage(),observed=[];for(let i=0;i<8;i++){const v=mod.call('run',args);sink^=JSON.stringify(v).length;observed.push(process.memoryUsage());}global.gc();rows.push({label:f.label,size:f.size,before,observed,retained:process.memoryUsage()});}
console.log(JSON.stringify({program:name,lane,fresh,rows,sink,peak_rss:process.resourceUsage().maxRSS*1024,scope:'Separate process high-water and eight-call GC observations; host/setup/output consumption included; not exact per-call peaks or allocation counts.'}));

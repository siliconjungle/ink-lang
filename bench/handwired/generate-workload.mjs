// Node 22.22+ can strip this generator's TypeScript dependencies directly.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [checkout,output,seedText='20261013']=process.argv.slice(2);
if(!checkout||!output)throw Error('usage: node generate-workload.mjs HANDWIRED OUTPUT.json [SEED]');
const seed=Number(seedText);if(![20261013,20261015].includes(seed))throw Error('unsupported seed');
const {generateDocuments}=await import(pathToFileURL(path.resolve(checkout,'src/json-search/documents.ts')));
const texts=generateDocuments(100000,seed,0).map(d=>d.text);
const sha256=createHash('sha256').update(JSON.stringify(texts)).digest('hex');
const expected={20261013:'bbb1eaceeed8a6c60059878c76fa9e9490e0c2b41aeae280221433eb598fe2b5',20261015:'199830ea30a4a5ab1095f69abfe4e4a04fa2016ff29b19c8b7ed5313c441251a'};
if(sha256!==expected[seed])throw Error('dataset hash differs');
const cases=['error','connection reset','zzzzzzzz'].map(pattern=>({pattern,expected:texts.map(s=>s.match(new RegExp(pattern,'gu'))?.length??0)}));
fs.writeFileSync(output,JSON.stringify({texts,cases,seed,sha256}));console.log(JSON.stringify({documents:texts.length,seed,sha256}));

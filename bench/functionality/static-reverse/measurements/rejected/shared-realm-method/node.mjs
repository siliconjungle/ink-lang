import {measure} from './worker.mjs';
const result=await measure(JSON.parse(process.argv[2]));
console.log(JSON.stringify({identity:{kind:'node',node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch},...result}));

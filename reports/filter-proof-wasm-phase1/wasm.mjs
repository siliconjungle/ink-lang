import fs from 'node:fs';
import {validateFilteredWasm} from './wasm-checks.mjs';
const [staged,checked,semantics,output]=process.argv.slice(2);
const result=await validateFilteredWasm(file=>fs.readFileSync(file),[staged,checked,semantics]);
Object.assign(result,{node:process.version,v8:process.versions.v8});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

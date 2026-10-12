import {readFile,writeFile} from 'node:fs/promises';
import {compileModule,VERSION} from 'svelte/compiler';
const source=await readFile(new URL('./models.svelte.js',import.meta.url),'utf8');
const built=compileModule(source,{filename:'models.svelte.js',generate:'client',dev:false});
await writeFile(new URL('./models.mjs',import.meta.url),built.js.code+'\n');
console.log('Svelte production client module '+VERSION);

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileModule} from 'svelte/compiler';import {build} from 'esbuild';
const directory=new URL('../../build/gpu-signals/',import.meta.url);await mkdir(directory,{recursive:true});
const source=await readFile(new URL('./models.svelte.js',import.meta.url),'utf8');
const compiled=compileModule(source,{filename:'models.svelte.js',generate:'client',dev:false});
for(const [name,exports] of [['controls','svelteModel,preactModel,rawModel,kernel,data'],['cold-svelte','svelteModel,kernel,data'],['cold-preact','preactModel,kernel,data'],['cold-plain','rawModel,kernel,data']]){
 const result=await build({stdin:{contents:`export {${exports}} from 'compiled-controls';`,resolveDir:new URL('.',import.meta.url).pathname,sourcefile:name+'.js',loader:'js'},plugins:[{name:'production-runes',setup(api){api.onResolve({filter:/^compiled-controls$/},()=>({path:'models.svelte.js',namespace:'runes'}));api.onLoad({filter:/.*/,namespace:'runes'},()=>({contents:compiled.js.code,resolveDir:new URL('.',import.meta.url).pathname,loader:'js'}));}}],outfile:new URL(name+'.mjs',directory).pathname,bundle:true,format:'esm',platform:'browser',conditions:['browser','production'],define:{'process.env.NODE_ENV':'"production"'},minify:false,sourcemap:false,metafile:true});
 await writeFile(new URL(name+'-build.json',directory),JSON.stringify(result.metafile,null,2)+'\n');
}
console.log('Production Svelte / Preact browser controls built, including separate cold-start bundles');

import assert from 'node:assert/strict';
import{readFile,writeFile,mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';import{resolve,join}from'node:path';
import{spawnSync}from'node:child_process';
import{digest,generator,shuffled}from'./common.mjs';
const[compiler,previousPath,stagedPath,out]=process.argv.slice(2),next=generator(65723),rows=[];
const sources={keeps:resolve(previousPath),defaults:resolve(stagedPath)},directory=await mkdtemp(join(tmpdir(),'ink-staged-emission-'));
try{
 for(let processIndex=0;processIndex<3;processIndex++)for(const name of shuffled(['keeps','defaults'],next)){
  const root=sources[name],core=join(root,'source.core.json'),target=join(directory,'program.mjs'),record={process:processIndex,name};
  for(const[phase,args]of[['check',['check',core,'--core']],['emit',['build',core,'--core','--target','javascript','-o',target]]]){
   const start=performance.now(),child=spawnSync(resolve(compiler),args,{encoding:'utf8'});record[phase+'_ms']=performance.now()-start;
   if(child.status!==0)throw Error(child.stderr||child.stdout);record[phase+'_reply']=child.stdout.trim();assert(record[phase+'_reply'].startsWith(phase==='check'?'checked ':'wrote JavaScript module '));
  }
  record.source_sha256=digest(await readFile(core));record.javascript_sha256=digest(await readFile(target));
  assert.equal(record.javascript_sha256,digest(await readFile(join(root,'program.mjs.source.mjs'))));rows.push(record);
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'Fresh CLI subprocesses admit captured core and emit complete literal JavaScript, including process startup and file I/O. Source parsing/import resolution, training, search and native compilation excluded. Every emitted byte matches the retained deployment source.',rows},null,2)+'\n');
 console.log('Fresh current CLI admission and emission match retained modules byte for byte');
}finally{await rm(directory,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {SETTINGS} from './policy.mjs';
import {binding} from './gate.mjs';
import {verifyUnchangedReceipt} from './rollout.mjs';
const dir=mkdtempSync(join(tmpdir(),'ink-identity-'));
try {
 const config=join(dir,'config.json'),candidate=join(dir,'candidate.mjs'),compiler=join(dir,'compiler');
 writeFileSync(config,JSON.stringify({inputs:['source.ink'],frozenHashes:{},baseline:'baseline.mjs',cases:['complete']}));
 writeFileSync(join(dir,'source.ink'),'source');writeFileSync(compiler,'compiler');
 for(const name of ['candidate.mjs','baseline.mjs'])writeFileSync(join(dir,name),'export const result=1;');
 const runs=Object.fromEntries(['node22','node26','chrome'].map(kind=>[kind,Array.from({length:3},()=>({
  isolation:SETTINGS.isolation,identity:kind==='chrome'?{kind,version:'155',userAgent:'Chrome/155',v8:'test'}:{kind:'node',node:kind==='node22'?'v22.22.1':'v26.1.0',v8:'test'},
  verification:Object.fromEntries(['baseline','candidate','control'].map(r=>[r,{independentChecks:1}])),
  rows:[{name:'complete',warmCalls:SETTINGS.warmCalls,callsPerBatch:1,completeOutputsChecked:SETTINGS.samples,
   samplesUs:{baseline:Array(SETTINGS.samples).fill(1),candidate:Array(SETTINGS.samples).fill(1.3),control:Array(SETTINGS.samples).fill(1.4)}}]
 }))]));
 const make=()=>({schema:'ink-engine-gate-v1',mode:'compiled',settings:SETTINGS,binding:binding(config,candidate,compiler),runs:structuredClone(runs)});
 const valid=make(),proof=verifyUnchangedReceipt(valid,config,candidate,compiler);
 assert.equal(proof.status,'unchanged-emitted-module');assert.equal(proof.timingDecision.status,'blocked');
 const receiptPath=join(dir,'receipt.json');writeFileSync(receiptPath,JSON.stringify(valid));
 const staleAttempt=spawnSync(process.execPath,[fileURLToPath(new URL('./rollout.mjs',import.meta.url)),'--config',config,'--compiler',compiler,'--out',dir],{encoding:'utf8'});
 assert.notEqual(staleAttempt.status,0);assert.match(staleAttempt.stderr,/no fresh completed receipt/);
 assert.deepEqual(JSON.parse(readFileSync(receiptPath)),valid);
 const verified=spawnSync(process.execPath,[fileURLToPath(new URL('./rollout.mjs',import.meta.url)),'--verify',receiptPath,'--candidate',candidate,'--config',config,'--compiler',compiler,'--out',dir],{encoding:'utf8'});
 assert.equal(verified.status,0,verified.stderr);assert.equal(JSON.parse(readFileSync(join(dir,'unchanged-module.json'))).timingDecision.status,'blocked');
 for(const mutate of [r=>delete r.runs.chrome,r=>r.runs.node22.pop(),r=>r.runs.chrome[0].rows[0].completeOutputsChecked=0,r=>r.runs.node26[0].verification.candidate.independentChecks=0,r=>r.error='failed output',r=>r.mode='diagnostic']) {
  const r=make();mutate(r);assert.throws(()=>verifyUnchangedReceipt(r,config,candidate,compiler));
 }
 writeFileSync(candidate,'export const result=2;');assert.throws(()=>verifyUnchangedReceipt(valid,config,candidate,compiler),/stale/);
 assert.throws(()=>verifyUnchangedReceipt(make(),config,candidate,compiler),/modules differ/);
 for(const text of ["import './dependency.mjs';","export const url=import.meta.url;","export const load=()=>import('./dep.mjs');","export const load=()=>require('./dep');","export const path=__filename;"]) {
  for(const name of ['candidate.mjs','baseline.mjs'])writeFileSync(join(dir,name),text);
  assert.throws(()=>verifyUnchangedReceipt(make(),config,candidate,compiler),/self-contained/);
 }
 for(const name of ['candidate.mjs','baseline.mjs'])writeFileSync(join(dir,name),'function require(n){if(n>4)throw Error();}require(1);export const result=1;');
 assert.equal(verifyUnchangedReceipt(make(),config,candidate,compiler).status,'unchanged-emitted-module');
 writeFileSync(join(dir,'source.ink'),'changed');assert.throws(()=>verifyUnchangedReceipt(valid,config,candidate,compiler),/stale/);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('Unchanged-module proof: exact bytes only; stale, changed, imported, incomplete and unchecked receipts rejected; noisy timing remains blocked');

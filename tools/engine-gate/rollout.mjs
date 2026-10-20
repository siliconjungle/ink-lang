// Timing and unchanged-output evidence are different decisions. Never relabel a
// noisy timing comparison as passing; exact standalone output identity can show
// that the compiler did not change this corpus's executable module.
import {readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {binding,sha} from './gate.mjs';
import {SETTINGS,assessEngines} from './policy.mjs';

export function verifyUnchangedReceipt(receipt,configPath,candidate,compiler) {
  if(receipt.schema!=='ink-engine-gate-v1'||receipt.mode!=='compiled'||receipt.error)throw Error('completed compiled receipt required');
  const current=binding(configPath,candidate,compiler);
  if(JSON.stringify(receipt.binding)!==JSON.stringify(current)||JSON.stringify(receipt.settings)!==JSON.stringify(SETTINGS))throw Error('stale artifacts, measurement tools or settings');
  const config=JSON.parse(readFileSync(configPath));
  const baseline=readFileSync(resolve(dirname(configPath),config.baseline)),bytes=readFileSync(candidate);
  if(!baseline.equals(bytes)||current.baseline!==current.candidate)throw Error('generated modules differ; timing gate required');
  // This proof is only for self-contained emitted modules, not files whose
  // meaning changes with relative imports or their own location. Conservative
  // textual exclusions can reject benign metadata and never grant source laws.
  // Emitted wire readers have local numeric require(n) bounds checks; these
  // are ordinary lexical helpers, not external module loads in these ESM files.
  if(/\bimport\b|\brequire\s*\(\s*[\x22\x27\x60]|\b(?:eval|Function)\s*\(|\b(?:__filename|__dirname|process|globalThis)\b/.test(bytes.toString('utf8')))throw Error('self-contained emitted module required');
  // Validate every engine identity, fresh run, independent result check, sample
  // and full-output check even when timing is inconclusive. No missing/failed
  // engine, incomplete run or changed-output regression may use this branch.
  const timing=assessEngines(receipt.runs,config.cases);
  return {schema:'ink-unchanged-module-v1',status:'unchanged-emitted-module',basis:'exact-byte-identity',
    moduleSha256:current.candidate,binding:current,timingDecision:timing,
    verifierSha256:sha(fileURLToPath(import.meta.url)),
    scope:'The compiler emitted exactly the frozen standalone module; all required engines completed independent and full-output checks. Timing verdicts are unchanged. No speedup, import-cost, memory or whole-application performance proof.'};
}
async function main() {
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i+=2)options[args[i].replace(/^--/,'')]=args[i+1];
  const receiptPath=resolve(options.verify??resolve(options.out??'.','receipt.json'));
  const previous=existsSync(receiptPath)?sha(receiptPath):null;
  if(options.out)rmSync(resolve(options.out,'unchanged-module.json'),{force:true});
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./gate.mjs',import.meta.url)),...args],{stdio:'inherit'});
  if(result.status===0)return;
  if(!options.config||!options.compiler||!options.out)throw Error('config/compiler/out required');
  if(!options.verify&&previous===sha(receiptPath))throw Error('no fresh completed receipt from this attempt');
  const candidate=resolve(options.verify?options.candidate:resolve(options.out,'candidate.mjs'));
  const proof=verifyUnchangedReceipt(JSON.parse(readFileSync(receiptPath)),resolve(options.config),candidate,resolve(options.compiler));
  proof.measurementReceiptSha256=sha(receiptPath);
  const output=resolve(options.out,'unchanged-module.json');writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
  const retention=resolve(options.out,'storage-retention.json');
  if(existsSync(retention)){const r=JSON.parse(readFileSync(retention));if(!r.keep.some(p=>p.path==='unchanged-module.json'))r.keep.push({path:'unchanged-module.json',reason:'Exact emitted-module identity proof; timing decision retained independently'});writeFileSync(retention,JSON.stringify(r,null,2)+'\n');}
  console.log('Unchanged emitted module accepted by exact byte identity; recorded timing decision: '+proof.timingDecision.status);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hostname,cpus} from 'node:os';
import {SETTINGS,BUDGET,assessEngines} from './policy.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
export const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const hashJson=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function binding(configPath,candidate,compiler) {
  const config=JSON.parse(readFileSync(configPath)),base=dirname(configPath);
  const inputs=Object.fromEntries(config.inputs.map(p=>[p,sha(resolve(base,p))]));
  for(const [p,expected] of Object.entries(config.frozenHashes)) if(sha(resolve(base,p))!==expected) throw Error('frozen baseline/input changed: '+p);
  const tools=Object.fromEntries(['gate.mjs','policy.mjs','worker.mjs','node.mjs'].map(p=>[p,sha(resolve(HERE,p))]));
  return {policy:hashJson({SETTINGS,BUDGET}),config:sha(configPath),inputs,tools,
    baseline:sha(resolve(base,config.baseline)),candidate:sha(candidate),compiler:sha(compiler)};
}
export function verifyReceipt(receipt,configPath,candidate,compiler) {
  if(receipt.schema!=='ink-engine-gate-v1'||receipt.mode!=='compiled'||receipt.error) throw Error('not a completed compiled rollout receipt');
  if(JSON.stringify(receipt.binding)!==JSON.stringify(binding(configPath,candidate,compiler))) throw Error('stale receipt: artifacts, producer, policy or inputs differ');
  const config=JSON.parse(readFileSync(configPath));
  if(JSON.stringify(receipt.settings)!==JSON.stringify(SETTINGS)) throw Error('measurement settings differ');
  const decision=assessEngines(receipt.runs,config.cases);
  if(decision.status!=='pass') throw Error('engine gate blocked: '+JSON.stringify(decision));
  return decision;
}

async function main() {
  const opts={};
  for(let i=2;i<process.argv.length;i+=2) {
    if(!process.argv[i].startsWith('--')||process.argv[i+1]===undefined) throw Error('expected --option VALUE');
    opts[process.argv[i].slice(2)]=process.argv[i+1];
  }
  for(const k of ['config','compiler','out']) if(!opts[k]) throw Error('--'+k+' required');
  const configPath=resolve(opts.config),config=JSON.parse(readFileSync(configPath)),base=dirname(configPath),out=resolve(opts.out),compiler=realpathSync(opts.compiler);
  if(opts.verify) {
    verifyReceipt(JSON.parse(readFileSync(opts.verify)),configPath,resolve(opts.candidate),compiler);
    console.log('Engine rollout receipt accepted');return;
  }
  for(const k of ['node22','node26','chrome']) if(!opts[k]||!existsSync(opts[k])) throw Error('--'+k+' executable required; missing engine blocks rollout');
  const chromeVersion=execFileSync(opts.chrome,['--version'],{encoding:'utf8'}).trim();
  if(!chromeVersion.startsWith('Google Chrome ')) throw Error('Google Chrome executable required, not a substitute browser');
  mkdirSync(out,{recursive:true});
  writeFileSync(resolve(out,'storage-retention.json'),JSON.stringify({schema:1,keep:[{path:'candidate.mjs',reason:'Exact generated measurement input'},{path:'receipt.json',reason:'Required engine performance receipt'}],safe_to_remove:[]},null,2)+'\n');
  const candidate=resolve(out,'candidate.mjs'),t=performance.now();
  if(opts.candidate) writeFileSync(candidate,readFileSync(resolve(opts.candidate)));
  else execFileSync(compiler,['build',resolve(base,config.source),'--target','javascript','-o',candidate],{stdio:['ignore','pipe','pipe']});
  const buildMs=performance.now()-t,bindings=binding(configPath,candidate,compiler);
  const git=(...args)=>{try{return execFileSync('git',['-C',resolve(HERE,'../..'),...args],{encoding:'utf8'}).trim();}catch{return null;}};
  const local={baseline:pathToFileURL(resolve(base,config.baseline)).href,candidate:pathToFileURL(candidate).href,workload:pathToFileURL(resolve(base,config.workload)).href,settings:SETTINGS};
  const runs={node22:[],node26:[],chrome:[]};
  const receipt={schema:'ink-engine-gate-v1',mode:opts.candidate?'diagnostic':'compiled',at:new Date().toISOString(),binding:bindings,
    baselineProducer:config.baselineProducer,toolCheckout:{revision:git('rev-parse','HEAD'),packages:git('submodule','status','--recursive'),trackedChanges:git('diff','--stat')},
    settings:SETTINGS,budget:BUDGET,buildMs,host:{hostname:hostname(),platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model},
    chromeVersion,engineBinaries:Object.fromEntries(['node22','node26','chrome'].map(k=>[k,{path:realpathSync(opts[k]),sha256:sha(realpathSync(opts[k]))}])),runs};
  const save=()=>writeFileSync(resolve(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  try {
    for(const id of ['node22','node26']) for(let i=0;i<SETTINGS.processes;i++) {
      runs[id].push(JSON.parse(execFileSync(opts[id],[resolve(HERE,'node.mjs'),JSON.stringify({...local,reverse:!!(i%2)})],{encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024})));
      console.log(`${id}: fresh process ${i+1}/${SETTINGS.processes} complete`);save();
    }
    // Expose only declared files on loopback, never the repository or private source tree.
    const files=new Map(), prefixes=new Map();let counter=0;
    const add=p=>{p=resolve(p);if(!prefixes.has(p)) prefixes.set(p,`/files/${counter++}.mjs`);files.set(prefixes.get(p),p);return prefixes.get(p);};
    const root=resolve(HERE,'../..');
    // Relative imports of the public adapter (worker.mjs) remain valid under /repo/.
    const publicUrl=p=>{const r=relative(root,p);if(r.startsWith('..'+sep)||r==='..') return add(p);return '/repo/'+r.split(sep).join('/');};
    for(const p of [resolve(HERE,'worker.mjs'),resolve(base,config.workload)]) files.set(publicUrl(p),p);
    const browserPaths={baseline:add(resolve(base,config.baseline)),candidate:add(candidate),workload:publicUrl(resolve(base,config.workload))};
    const server=createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Ink engine gate</title>');return;}
      const path=files.get(url.pathname);if(!path) {res.statusCode=404;res.end();return;}
      res.setHeader('Content-Type','text/javascript');res.end(readFileSync(path));
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try {
      const {chromium}=await import(opts.playwright?pathToFileURL(resolve(opts.playwright)).href:'playwright-core');
      for(let i=0;i<SETTINGS.processes;i++) {
        const browser=await chromium.launch({executablePath:opts.chrome,headless:true});
        try {
          const session=await browser.newBrowserCDPSession(),engine=await session.send('Browser.getVersion');await session.detach();
          const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
          await page.goto(`http://127.0.0.1:${server.address().port}/`);
          const result=await page.evaluate(async({paths,settings,worker,reverse})=>{
            const {measure}=await import(worker);
            const r=await measure({...paths,settings,reverse});
            return {identity:{kind:'chrome',userAgent:navigator.userAgent,platform:navigator.platform},...r};
          },{paths:browserPaths,settings:SETTINGS,worker:publicUrl(resolve(HERE,'worker.mjs')),reverse:!!(i%2)});
          if(errors.length) throw Error(errors.join('\n'));
          result.identity.version=browser.version();result.identity.v8=engine.jsVersion;result.identity.revision=engine.revision;runs.chrome.push(result);
          console.log(`chrome: fresh process ${i+1}/${SETTINGS.processes} complete`);save();
        } finally {await browser.close();}
      }
    } finally {await new Promise(r=>server.close(r));}
    receipt.decision=assessEngines(runs,config.cases);save();
    console.log(JSON.stringify(receipt.decision,null,2));
    if(receipt.decision.status!=='pass') process.exitCode=1;
  } catch(error) {receipt.error=error.message;save();throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();

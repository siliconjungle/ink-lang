from pathlib import Path
import hashlib,json,subprocess,sys
R=Path(__file__).resolve().parent;B=R.parents[1];P=R/'portability';P.mkdir(exist_ok=True)
sys.path[:0]=[str(B/'knowledge'),str(B/'planner'),str(B/'bench')]
from ink_knowledge import Store
from producers.web_pipeline30_laws import specialize,publish
from compact_selection28 import plan
pins=json.loads((R/'initial-pins.json').read_text());compiler=Path(pins['compiler']);sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();assert sha(compiler)==pins['compiler_sha256']
commands=[]
def run(*argv):
 argv=list(map(str,argv));r=subprocess.run(argv,capture_output=True,text=True,cwd=B);commands.append(dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));(P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n');assert r.returncode==0,r.stderr;return r.stdout
units=[];extra=[]
for t in ['u32','i32','u64']:
 for family in ['merged','calibrated']:
  name='unseen_'+family+'_'+t;folder=P/name;folder.mkdir(exist_ok=True)
  if family=='merged':
   source=f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,cut:{t})->List<{t}>'+'{return xs.filter(fn(x)=>third_gate(x,cut)).concat(ys.filter(fn(x)=>third_gate(x,cut)));}\n'+f'fn third_gate(x:{t},cut:{t})->Bool'+'{return choose(x>cut,true,x==0);}'
  else:
   source=f'pub fn {name}(xs:List<{t}>,cut:{t})->List<{t}>'+'{return xs.map(fn(x)=>third_prepare(x,cut)).filter(fn(x)=>third_gate(x,cut)).map(fn(x)=>third_finish(x,cut));}\n'+f'fn third_prepare(x:{t},cut:{t})->{t}'+'{return choose(x<cut,cut-x,x+cut);}\n'+f'fn third_gate(x:{t},cut:{t})->Bool'+'{return choose(x>cut,true,x==0);}\n'+f'fn third_finish(x:{t},cut:{t})->{t}'+'{return x*5-cut;}'
  src=folder/'source.ink';src.write_text('module UnseenVectors;\n'+source+'\n');core=folder/'literal.core.json';subject=folder/'subject.json'
  run(compiler,'emit-core',src,'-o',core);run(compiler,'emit-semantic',core,'--core','-o',subject);rows=specialize(json.loads(subject.read_text()),json.loads(core.read_text()));assert len(rows)==1;extra+=rows;units.append((t,family,name,folder,core))
store=publish(P/'private-store',extra);assert len(store.members())==14
results=[];jsframes=[]
for t,family,name,folder,core in units:
 selection=folder/'selection.json';receipt=plan(compiler,core,store,B/'reports/web-stack-proofs-27-2026-10-11/cpu-cost-model.json',selection);assert len(json.loads(selection.read_text())['applications'])>=1
 selected=folder/'selected.core.json';run(compiler,'emit-core',core,'--core','--selection',selection,'-o',selected);run(compiler,'build',selected,'--core','--target','javascript','-o',folder/'selected.mjs')
 bits=64 if t=='u64' else 32
 def wrap(x):
  x%=1<<bits;return x-(1<<32)if t=='i32'and x>=1<<31 else x
 for at,(xs,ys,cut)in enumerate([([],[],7),([0,1,3,7,8,11],[9,3,1],7),([(i*19)%101 for i in range(129)],[17,0,29,37],31)]):
  args=[xs,ys,cut]if family=='merged'else[xs,cut]
  if family=='merged':expected=[x for x in xs+ys if x>cut or x==0]
  else:
   first=[wrap(cut-x if x<cut else x+cut)for x in xs];expected=[wrap(x*5-cut)for x in first if x>cut or x==0]
  arg=folder/f'args-{at}.json';arg.write_text(json.dumps(args));outputs=[json.loads(run(compiler,'run',f,name,arg,'--core'))for f in[core,selected]];assert outputs==[expected,expected]
  results.append(dict(type=t,family=family,input_length=len(xs),selected_laws=receipt['selected_roots'],complete_results_equal=True));jsframes.append(dict(module=str(folder/'selected.mjs'),name=name,type=t,args=args,expected=expected))
(P/'javascript-frames.json').write_text(json.dumps(jsframes,indent=2)+'\n')
js="""import fs from'node:fs';import{pathToFileURL}from'node:url';let frames=JSON.parse(fs.readFileSync(process.argv[2]));for(let f of frames){let m=await import(pathToFileURL(f.module));let args=f.type==='u64'?f.args.map(a=>Array.isArray(a)?a.map(BigInt):BigInt(a)):f.args;let out=m.functions[f.name](...args);if(JSON.stringify(Array.from(out,x=>String(x)))!==JSON.stringify(f.expected.map(String)))throw Error(f.name);}console.log(JSON.stringify({status:'passed',complete_output_checks:frames.length}));"""
(P/'check-javascript.mjs').write_text(js);jsresult=json.loads(run('node',P/'check-javascript.mjs',P/'javascript-frames.json'));(P/'javascript-check.json').write_text(json.dumps(jsresult,indent=2)+'\n')
result=dict(status='passed',compiler_sha256=sha(compiler),generic_objects=8,private_new_context_certificates=6,canonical_objects_added=0,automatic_selected_sources=len(units),interpreter_executions=2*len(results),javascript_complete_output_checks=len(results),private_snapshot=store.snapshot_id,records=results,scope='Two law families instantiate previously unseen helper names/callback bodies through six private hash-bound certificates; same frozen planner/model. Canonical24 objects unchanged; not a claim generic-only cost search normalizes arbitrary lambdas.')
(P/'evidence.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='records'},indent=2))

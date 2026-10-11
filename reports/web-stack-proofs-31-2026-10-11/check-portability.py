"""Independent helper composition probes; private certificates never enter canonical DB."""
from pathlib import Path
import hashlib,json,subprocess,sys
R=Path(__file__).resolve().parent;B=R.parents[1];P=R/'portability';P.mkdir(exist_ok=True)
sys.path[:0]=[str(B/'knowledge'),str(B/'planner'),str(B/'bench')]
from producers.web_pipeline31_laws import specialize,publish,named_laws
from compact_selection28 import plan
pins=json.loads((R/'initial-pins.json').read_text());compiler=Path(pins['compiler'])
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();assert sha(compiler)==pins['compiler_sha256']
commands=[]
def run(*argv):
 argv=list(map(str,argv));proc=subprocess.run(argv,capture_output=True,text=True,cwd=B)
 commands.append(dict(argv=argv,exit_code=proc.returncode,stdout=proc.stdout,stderr=proc.stderr))
 (P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n');assert proc.returncode==0,proc.stderr
 return proc.stdout
units=[];extra=[]
for t in ['u32','i32','u64']:
 for side in ['left','right']:
  name='unseen_filtered_'+side+'_'+t;folder=P/name;folder.mkdir(exist_ok=True)
  discarded='xs.map(fn(x)=>third_discard(x,cut))';accepted='xs.filter(fn(x)=>third_gate(x,cut))'
  left,right=(discarded,accepted)if side=='left'else(accepted,discarded)
  item='b'if side=='left'else'a'
  source=f'pub fn {name}(xs:List<{t}>,cut:{t})->List<{t}>'+'{return '+left+'.zip('+right+',fn(a)=>fn(b)=>third_finish('+item+',cut));}\n'+f'fn third_discard(x:{t},cut:{t})->{t}'+'{return x+quot_or(x,cut,0);}\n'+f'fn third_gate(x:{t},cut:{t})->Bool'+'{return choose(x>cut,true,x==0);}\n'+f'fn third_finish(x:{t},cut:{t})->{t}'+'{return x*5-cut;}'
  src=folder/'source.ink';src.write_text('module UnseenProjection;\n'+source+'\n');core=folder/'literal.core.json';subject=folder/'subject.json'
  run(compiler,'emit-core',src,'-o',core);run(compiler,'emit-semantic',core,'--core','-o',subject)
  rows=specialize(json.loads(subject.read_text()),json.loads(core.read_text()));assert len(rows)==1,len(rows)
  extra+=rows;units.append((t,side,name,folder,core))
store=publish(P/'private-store',extra);assert len(extra)==6
results=[];jsframes=[]
for t,side,name,folder,core in units:
 selection=folder/'selection.json';receipt=plan(compiler,core,store,B/'reports/web-stack-proofs-27-2026-10-11/cpu-cost-model.json',selection)
 assert len(json.loads(selection.read_text())['applications'])>=1
 selected=folder/'selected.core.json';run(compiler,'emit-core',core,'--core','--selection',selection,'-o',selected)
 run(compiler,'build',selected,'--core','--target','javascript','-o',folder/'selected.mjs')
 bits=64 if t=='u64'else 32
 def wrap(x):
  x%=1<<bits;return x-(1<<32)if t=='i32'and x>=1<<31 else x
 for at,(xs,cut)in enumerate([([],7),([0,1,3,7,8,11],7),([(i*19)%101 for i in range(129)],31)]):
  args=[xs,cut];expected=[wrap(x*5-cut)for x in xs if x>cut or x==0]
  arg=folder/f'args-{at}.json';arg.write_text(json.dumps(args))
  outputs=[json.loads(run(compiler,'run',f,name,arg,'--core'))for f in[core,selected]];assert outputs==[expected,expected]
  results.append(dict(type=t,side=side,input_length=len(xs),selected_laws=receipt['selected_roots'],complete_results_equal=True))
  jsframes.append(dict(module=str(folder/'selected.mjs'),name=name,type=t,args=args,expected=[str(x)for x in expected]if t=='u64'else expected))
(P/'javascript-frames.json').write_text(json.dumps(jsframes,indent=2)+'\n')
js="""import fs from'node:fs';import{pathToFileURL}from'node:url';const frames=JSON.parse(fs.readFileSync(process.argv[2]));for(const f of frames){const m=await import(pathToFileURL(f.module));const args=f.type==='u64'?f.args.map(a=>Array.isArray(a)?a.map(BigInt):BigInt(a)):f.args;const out=m.functions[f.name](...args);if(JSON.stringify(Array.from(out,x=>String(x)))!==JSON.stringify(f.expected.map(String)))throw Error(f.name);}console.log(JSON.stringify({status:'passed',complete_output_checks:frames.length}));"""
(P/'check-javascript.mjs').write_text(js);jsresult=json.loads(run('node',P/'check-javascript.mjs',P/'javascript-frames.json'))
(P/'javascript-check.json').write_text(json.dumps(jsresult,indent=2)+'\n')
result=dict(status='passed',compiler_sha256=sha(compiler),generic_objects=len(named_laws()),private_new_context_certificates=6,
 canonical_objects_added=0,automatic_selected_sources=len(units),interpreter_executions=2*len(results),javascript_complete_output_checks=len(results),
 private_snapshot=store.snapshot_id,private_objects=len(store.members()),records=results,
 scope='One unused mapped-producer erasure mechanism in both orientations, with unseen helpers through six private hash-bound certificates. Same frozen planner/model. No generic-only normalized-matching claim.')
(P/'evidence.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='records'},indent=2))

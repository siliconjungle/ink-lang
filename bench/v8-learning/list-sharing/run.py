"""Checked immutable list sharing: fresh-process complete compact-call study."""
import argparse,json,os,subprocess,sys,hashlib,statistics,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.common_subexpressions import specialize
from producers.definition_context28 import bind
p=argparse.ArgumentParser();p.add_argument('--ink',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();out=a.out.resolve();out.mkdir(exist_ok=False,parents=True);ink=a.ink.resolve()
def save(n,x):(out/n).write_bytes(canonical(x)+b'\n')
def run(*cmd):
 r=subprocess.run(list(map(str,cmd)),capture_output=True,text=True,timeout=180)
 if r.returncode:raise RuntimeError((cmd,r.stderr[-3000:]))
 return r.stdout
run(ink,'emit-core',HERE/'source.ink','-o',out/'core.json');run(ink,'emit-semantic',out/'core.json','--core','-o',out/'semantic.json')
core=json.loads((out/'core.json').read_bytes());subject=json.loads((out/'semantic.json').read_bytes());objects=[];apps=[];seen=set()
for label,raw in specialize(subject,core):
 name=label.split('/')[1]
 if name in seen:continue
 # Exactly one proposed whole-function sharing law per caller, no other search.
 law=bind(raw,core,subject);obj=semantic_entry(law);objects.append(obj);seen.add(name)
 apps.append(dict(function=name,path=[],law=identity(obj),arguments={n:dict(sort=s,node={'Free':n})for n,s in law['params'].items()},premises=[]))
assert seen=={'combined','doubled','guarded'},seen
store=Store.publish(out/'proof-store',objects)
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(o)for o in objects]),applications=apps)
save('selection.json',selection);save('check.json',json.loads(run(ink,'check-selection',out/'core.json',out/'selection.json')))
for name in ['baseline','shared']:run(ink,'build',out/'core.json','--core','--target','javascript','-o',out/(name+'.mjs'),*(['--selection',out/'selection.json']if name=='shared'else []))
all_fingerprints=[];data={}
for split,seed in [('training',7907),('holdout',104729)]:
 phases={}
 for length in [0,32,512,4096]:
  for name in sorted(seen):
   cs=[]
   for cohort in range(2):
    xs=[((i+1)*seed+cohort*7901+13)&0xffffffff for i in range(length)];bias=(0xfffffff1+cohort*31+seed)&0xffffffff
    mapped=[(x*1664525+bias)&0xffffffff for x in xs];xor=0
    for x in mapped:xor^=x
    expected=(sum(mapped)+xor)&0xffffffff
    args=[xs,bias]
    if name=='doubled':expected=mapped+mapped
    if name=='guarded':args=[cohort==1,*args];expected=expected if cohort==1 else 0
    # Independent evaluator checks the entire Python oracle before timing.
    save('reference-args.json',args)
    got=json.loads(run(ink,'run',out/'core.json',name,out/'reference-args.json','--core'));assert got==expected,(name,got,expected)
    cs.append(dict(function=name,args=args,expected=expected,boundary='compact'))
   phases[name+'/'+str(length)]=cs
 request=dict(artifacts=[dict(path=str(out/(name+'.mjs')),measurement=name)for name in ['baseline','shared']],phases=phases,measurement=dict(rounds=11,minimum_batch_ms=8,maximum_calls_per_sample=1024))
 save(split+'-request.json',request);results=[]
 for process in range(3):
  request['process_index']=process;save('current-request.json',request)
  result=json.loads(run('node',ROOT/'planner/ink_planner/measure_calls.mjs',out/'current-request.json'))
  assert not result['rejected'],result['rejected'];save(split+'-'+str(process)+'.json',result);results.append(result)
 fingerprints=set(f for r in results for f in r['input_fingerprints']);all_fingerprints.append(fingerprints)
 by_phase={}
 for phase in phases:
  pairs=[]
  for r in results:
   rows={x['measurement']:x for x in r['rows']if x['phase']==phase}
   pairs.append(statistics.median(map(int,rows['baseline']['complete_call_ns']))/statistics.median(map(int,rows['shared']['complete_call_ns'])))
  by_phase[phase]=dict(process_ratios=[str(x)for x in pairs],median_ratio=str(statistics.median(pairs)))
 data[split]=by_phase
# Empty calls may coincide; nonempty exact normalized inputs must differ.
shared=all_fingerprints[0]&all_fingerprints[1]
# Empty list calls still have disjoint seed-derived bias arguments.
assert not shared,shared
for name in ['reference-args.json','current-request.json']:(out/name).unlink()
summary=dict(schema=1,compiler_sha256=hashlib.sha256(ink.read_bytes()).hexdigest(),source=subject['input_core_sha256'],functions=sorted(seen),processes_per_split=3,rounds=11,results=data,scope='Explicit checked alternatives on complete compact JS calls with independent complete Python and Ink reference results. Input decoding, execution, output encoding and consumption timed; encoding/setup excluded. Shared host, no automatic selection or broad application claim.')
save('summary.json',summary);print(json.dumps(summary,indent=2),flush=True)

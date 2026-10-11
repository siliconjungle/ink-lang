#!/usr/bin/env python3
"""Audit three fresh-process ordinary runs, then analyze declared diagnostic pairs.
No clocks or target execution. Historical General40 measurements are not read.
"""
from pathlib import Path
import argparse,hashlib,json,math,random,statistics
B=Path(__file__).resolve().parents[4]
R=B/'reports/web-stack-engine-40-2026-10-11/fusion'
MANIFEST='81826243b3500cf5fe8650a151ce074f1e4504ba2870ff511456442fdaf1b426'
HARNESS='f425af91d95d174e77e093c77e74374db5ea91aa21575133d4591446f5511d33'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def need(ok,msg):
 if not ok:raise ValueError(msg)
def write(p,value):
 with Path(p).open('x')as f:json.dump(value,f,indent=2);f.write('\n')
def boundary(name):return'resident-wasm-destination'if'_wasm_'in name else'captured-js-owned'
def bound():
 mp=R/'manifest-final.json';m=read(mp);hp=B/'bench/diagnose-pipeline40.mjs'
 need(sha(mp)==MANIFEST and sha(hp)==HARNESS,'exact final manifest/runner drift')
 need(m['bindings']['javascript_runner']==HARNESS,'manifest runner binding')
 for key in ['fixtures','expert','metadata']:need(sha(B/m[key[:-1]+'_path'if key=='fixtures'else key+'_path'])==m[key+'_sha256'],key+' drift')
 archived=read(B/m['metadata_path']);base=(B/m['metadata_path']).parent
 for path,h in archived['bindings'].items():need(sha(base/path)==h,'archive drift '+path)
 for row in m['rows']:
  need(sha(B/row['path'])==row['sha256']and sha(B/row['original_path'])==row['original_sha256'],'source module drift')
  if row['variant'].endswith('_clone'):need(row['sha256']==row['original_sha256'],'clone changed')
 e=read(R/'compiler-evidence.json')
 for row in e['records']:
  for key in ['ir','remarks']+(['wasm']if'wasm_path'in row else[]):need(sha(B/row[key+'_path'])==row[key+'_sha256'],'compiler evidence drift')
 need(sha(B/m['previous_manifest']['path'])==m['previous_manifest']['sha256']==e['manifest_sha256'],'prior compiler manifest binding')
 fixtures=read(B/m['fixture_path'])['frames'];frames=[f for f in fixtures if f['id']in m['timed_frames']]
 need(len(frames)==16 and len(set(m['timed_frames']))==16,'declared frame count')
 names=list(dict.fromkeys(row['variant']for row in m['rows']))+['prior_wasm_ordinary','prior_wasm_no_vectorizers','checked_wasm_ordinary','checked_wasm_no_vectorizers']
 need(len(names)==16,'variant count')
 return m,frames,names

def audit(paths,processes):
 m,frames,names=bound();need(len(paths)==3 and len(set(paths))==3,'three distinct raw files required');p=m['protocol'];receipt=read(processes)
 need(receipt['status']=='passed'and len(receipt['records'])==3,'fresh-process receipt');need(receipt.get('contention_status')in ['unobserved','none_observed','observed'],'contention disclosure required');pids=[r['pid']for r in receipt['records']];need(len(set(pids))==3 and all(type(x)is int and x>0 for x in pids),'three distinct process PIDs')
 sources=[];runs=[]
 for index,path in enumerate(paths):
  r=read(path);seed=p['seed']+index;cli=r['argsCLI'];proc=receipt['records'][index]
  need(r['status']=='passed'and r['mode']=='reproduce'and r['execArgv']==[]and not r['profile_calls'],'ordinary unprofiled run')
  need(set(cli)=={'mode','manifest','seed','output'}and cli['mode']=='reproduce'and cli['manifest']=='manifest-final.json'and int(cli['seed'])==seed and Path(cli['output']).resolve()==path.resolve(),'predeclared CLI/seed')
  need(proc['exit_code']==0 and proc['raw_sha256']==sha(path),'process/raw binding')
  argv=proc['argv'];need(len(argv)==6 and Path(argv[0]).name.startswith('node')and Path(argv[1]).resolve()==(B/'bench/diagnose-pipeline40.mjs').resolve()and set(argv[2:])=={'--'+k+'='+v for k,v in cli.items()},'process command binding')
  need(r['bindings']['manifest']==MANIFEST and r['bindings']['harness']==HARNESS,'raw manifest binding')
  for key in ['fixtures','expert','metadata']:need(r['bindings'][key]==m[key+'_sha256'],'raw '+key+' binding')
  need(r['bindings']['compiler_evidence']==sha(R/'compiler-evidence.json'),'raw compiler evidence binding')
  gate=read(R/'serial-gate.json');need(gate['authorized']is True and gate['manifest_sha256']==MANIFEST and gate['harness_sha256']==HARNESS and r['bindings']['serial_gate']==sha(R/'serial-gate.json'),'exclusive gate binding')
  expected={(f['id'],v)for f in frames for v in names};validation=r['validation'];need(len(validation)==len(expected)and{(x['frame'],x['variant'])for x in validation}==expected,'complete validation coverage')
  for row in validation:
   need(all(row[k]is True for k in ['full_output','changed_input','zero_divisor','nonmutation']),'validation failed')
   if'_wasm_'not in row['variant']:need(row['owned_changed_input_lifetime']is True,'owned output lifetime')
  warms=[(f['id'],v,i)for f in frames for v in names for i in range(p['warmups'])]
  need([(x['frame'],x['variant'],x['iteration'])for x in r['warmups']]==warms and all(x['passed']is True for x in r['warmups']),'warmup coverage/order')
  lookup={f['id']:f for f in frames};cal={};groups={};observable=sum(lookup[x['frame']]['web_consumption_code']for x in r['warmups'])
  for kind in ['calibration','samples']:
   for row in r[kind]:
    key=(row['frame'],row['variant']);need(key in expected,'unexpected timing cell');f=lookup[row['frame']];n=row['iterations'];elapsed=row['elapsed_ms'];need(type(n)is int and 0<n<=p['maximum_iterations']and math.isfinite(elapsed)and elapsed>=(0 if kind=='calibration'else 1e-300),'duration/count')
    need(row['boundary']==boundary(row['variant'])and math.isclose(row['ns_per_call'],elapsed*1e6/n,rel_tol=1e-10),'boundary/derived duration')
    code=f['web_consumption_code']*n%2**32;need(int(row['checksum'])==code and row['consumed_elements']==n*len(f['expected']),'full-word consumption/checksum');observable+=code
    (cal if kind=='calibration'else groups).setdefault(key,[]).append(row)
  need(set(cal)==set(groups)==expected,'calibration/sample coverage')
  for key,rows in cal.items():
   need(rows[0]['iterations']==1,'calibration starts at1')
   for a,b in zip(rows,rows[1:]):need(a['elapsed_ms']<p['calibration_ms']and a['iterations']<p['maximum_iterations']and b['iterations']==2*a['iterations'],'calibration escalation')
   need(rows[-1]['elapsed_ms']>=p['calibration_ms']or rows[-1]['iterations']==p['maximum_iterations'],'calibration termination')
   need(len(groups[key])==p['rounds']and{x['round']for x in groups[key]}==set(range(p['rounds']))and all(x['iterations']==rows[-1]['iterations']for x in groups[key]),'round/count coverage')
  need([(x['frame'],x['variant'])for x in r['calibration']]==[key for f in frames for v in names for key in [(f['id'],v)]for _ in cal[key]],'calibration order')
  state=seed&0xffffffff
  def word():
   nonlocal state
   state^=state<<13&0xffffffff;state^=state>>17;state^=state<<5&0xffffffff;state&=0xffffffff;return state
  wanted=[]
  for f in frames:
   for round in range(p['rounds']):
    order=names[:]
    for i in range(len(order)-1,0,-1):j=word()%(i+1);order[i],order[j]=order[j],order[i]
    wanted.extend((f['id'],round,v)for v in order)
  need([(x['frame'],x['round'],x['variant'])for x in r['samples']]==wanted,'seeded interleaving')
  need(r['observable']==observable%2**32,'observable journal')
  runs.append(r);sources.append(dict(path=str(path),sha256=sha(path),pid=pids[index],seed=seed,node=r['node'],v8=r['v8'],validation=len(validation),samples=len(r['samples'])))
 need(len({(r['node'],r['v8'])for r in runs})==1,'host versions differ')
 receipt=dict(status='passed',runs=sources,bindings=dict(manifest=MANIFEST,harness=HARNESS,processes=sha(processes),compiler_evidence=sha(R/'compiler-evidence.json')),contention_status=read(processes)['contention_status'],scope='Three fresh ordinary processes, exact declared frames/modules/boundaries, complete checksums and seeded protocol. PID/host-process provenance is trusted, not a scheduler-isolation proof.',audit_tool_sha256=sha(__file__))
 return receipt,runs,m,frames

def analyze(runs,m,frames):
 comparisons=m['primary_comparisons']+[
  dict(reference=v+'_wasm_ordinary',current=v+'_wasm_no_vectorizers',factor='disable loop and SLP vectorization; same emitted C source')for v in ['prior','checked']]+[
  dict(reference='prior_wasm_'+mode,current='checked_wasm_'+mode,factor='checked source pipeline plus removed intermediates; multifactor Wasm context')for mode in ['ordinary','no_vectorizers']]
 rows=[]
 for f in frames:
  for pair in comparisons:
   ref,cur=pair['reference'],pair['current'];need(boundary(ref)==boundary(cur),'cross-boundary pooling forbidden');process_logs=[];detail=[]
   for i,r in enumerate(runs):
    a={x['round']:x['ns_per_call']for x in r['samples']if x['frame']==f['id']and x['variant']==ref};b={x['round']:x['ns_per_call']for x in r['samples']if x['frame']==f['id']and x['variant']==cur};logs=[math.log(a[j]/b[j])for j in range(m['protocol']['rounds'])];process_logs.append(statistics.fmean(logs));detail.append(dict(process=i,ratio=math.exp(statistics.fmean(logs)),reference_median_ns=statistics.median(a.values()),current_median_ns=statistics.median(b.values())))
   ratio=math.exp(statistics.fmean(process_logs));seed=int(hashlib.sha256((f['id']+'/'+ref+'/'+cur).encode()).hexdigest()[:16],16);rng=random.Random(seed);draws=sorted(math.exp(statistics.fmean(rng.choices(process_logs,k=3)))for _ in range(2000));lo,hi=draws[50],draws[1949]
   rows.append(dict(frame=f['id'],task=f['task'],context='composed'if'_heldout_'in f['task']else'plain',orientation=f['input_shape']['padded_side'],value_regime=f['mode'],size=len(f['xs']),boundary=boundary(ref),reference=ref,current=cur,factor=pair['factor'],ratio_reference_over_current=ratio,processes=detail,process_cluster_nominal_ci95=[lo,hi],all_processes_same_direction=all(x>0 for x in process_logs)or all(x<0 for x in process_logs),classification='faster-in-diagnostic'if lo>1 else'slower-in-diagnostic'if hi<1 else'inconclusive',bootstrap_seed=seed,primary=pair in m['primary_comparisons']))
 interactions=[]
 for f in frames:
  logs=[]
  for r in runs:
   cells={(x['variant'],x['round']):x['ns_per_call']for x in r['samples']if x['frame']==f['id']}
   logs.append(statistics.fmean(math.log((cells['prior_wasm_ordinary',j]/cells['checked_wasm_ordinary',j])/(cells['prior_wasm_no_vectorizers',j]/cells['checked_wasm_no_vectorizers',j]))for j in range(m['protocol']['rounds'])))
  interactions.append(dict(frame=f['id'],ratio_of_pipeline_ratios=math.exp(statistics.fmean(logs)),process_ratios=[math.exp(x)for x in logs],meaning='ordinary prior/checked ratio divided by no-vectorizers prior/checked ratio; vectorizer sensitivity interaction, not dynamic causal attribution'))
 static=read(R/'untimed-audit.json');need(static['status']=='passed'and static['bindings']['manifest']==MANIFEST and static['bindings']['compiler_evidence']==sha(R/'compiler-evidence.json'),'static summary drift')
 return dict(status='analyzed',static_summary_sha256=sha(R/'untimed-audit.json'),function_scoped_static=static['function_scoped_static'],comparisons=rows,vectorizer_interactions=interactions,limits=['Exactly three process clusters: nominal intervals are fragile, exploratory and uncorrected for multiple comparisons. Individual round ratios are paired within a process, not independent process replicates.','Keep each context/orientation/value regime/size/boundary distinct. Typed outputs are diagnostics, not admitted Array replacements.','Clone comparisons expose module/compilation-context sensitivity; they do not prove absence of JIT noise.','Two-pass preserves one result allocation, but scheduling/integer representation/compiler decisions may interact.','IR/remarks are static facts; source events and instrumented/profile runs are not ordinary performance evidence.','No generalized workload superiority, new proof authority, default change or causal compiler mechanism is established by these historical two source families.'])

def main():
 a=argparse.ArgumentParser();a.add_argument('mode',choices=['audit','analyze']);a.add_argument('--raw',type=Path,nargs=3,required=True);a.add_argument('--processes',type=Path,required=True);a.add_argument('--output',type=Path,required=True);x=a.parse_args();receipt,runs,m,frames=audit(x.raw,x.processes)
 result=receipt if x.mode=='audit'else analyze(runs,m,frames)|dict(audit=receipt);write(x.output,result);print(json.dumps(dict(status=result['status'],processes=3,output=str(x.output))))
if __name__=='__main__':main()

"""Fixed adaptive39 offline fit/audit. Never times or executes a kernel."""
from pathlib import Path
import json,hashlib,math,itertools,statistics,argparse
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11/adaptive'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();read=lambda p:json.loads(Path(p).read_text())
def write(name,data):
 with (R/name).open('x')as f:json.dump(data,f,indent=2);f.write('\n')
def features(f):return dict(input_elements=len(f['xs'])+len(f['ys']),input_bytes=4*(len(f['xs'])+len(f['ys'])+2),output_capacity_elements=len(f['xs']),dispatches=int(bool(f['xs'])),iterations=1)
def gpu(f,boundary):
 n,y=len(f['xs']),len(f['ys']);return dict(dispatches=int(bool(n)),upload_bytes=4*(n+y+9)if boundary=='captured-owned'else 0,readback_bytes=4*(n+1),live_buffer_bytes=4*((4*n+y+12)if boundary=='captured-owned'else(3*n+y+11)))
def predict(model,f):
 fs=features(f);cost={b:p['intercept_ns']+sum(w*fs[k]for k,w in p['terms'].items())for b,p in model['backends'].items()};best=min(['cpu','javascript','gpu'],key=lambda b:cost[b]);return best if cost[best]<cost['cpu']*.9 else'cpu',cost

def audit(phase):
 m=read(R/'metadata.json');protocol=m['protocol'];fixtures=read(R/'fixtures.json')['frames'];by={f['id']:f for f in fixtures}
 for p,h in m['bindings'].items():assert sha(R/p)==h,p
 filename='browser-validation.json'if phase=='validate'else phase+'-results.json';d=read(R/filename)
 assert d['status']=='passed'and d['phase']==phase and d['actual_browser']and d['metadata_sha256']==sha(R/'metadata.json')and d['protocol']==protocol
 frames=[f for f in fixtures if phase=='validate'or f['split']==('training'if phase=='training'else'heldout')]
 base=['cpu','javascript','gpu'];names=[]
 for b in base:
  names.append('auto_path_'+b)
  if phase!='training':names.append('direct_'+b)
 if phase=='evaluation':names+=['auto_cached','static_cpu']
 expected={(f['id'],boundary,v)for f in frames for boundary in protocol['boundaries']for v in names};validation={(r['frame'],r['boundary'],r['variant'])for r in d['validation']};assert validation==expected and len(validation)==len(d['validation'])
 saved=read(R/'frozen-profile.json')if phase=='evaluation'else None
 if saved:
  assert d['profile_sha256']==sha(R/'frozen-profile.json')==read(R/'fit-receipt.json')['frozen_profile_sha256']
  gate=read(R/'evaluation-gate.json');assert gate.get('profile_sha256')==sha(R/'frozen-profile.json'),'evaluation gate must bind frozen trained profile'
  assert saved['training_results_sha256']==sha(R/'training-results.json')and saved['metadata_sha256']==sha(R/'metadata.json')and saved['target_key']==d['target_key']
 def backend(f,boundary,v):
  if v.startswith(('auto_path_','direct_')):return v.removeprefix('auto_path_').removeprefix('direct_')
  if v=='static_cpu':return'cpu'
  return predict(saved['captured'if boundary=='captured-owned'else'resident']['models'][d['scope']],f)[0]
 for row in d['validation']:
  assert all(row[k]for k in ['owned_output','complete_output','nonmutation','caller_mutation_capture','changed_input_lifetime'])
  f=by[row['frame']];assert row['backend']==backend(f,row['boundary'],row['variant']),row
  if row['backend']=='gpu':
   for k,v in gpu(f,row['boundary']).items():assert row['counters'][k]==v,(f['id'],k)
 assert len(d['setup'])==len(frames)
 for row in d['setup']:
  f=by[row['frame']];expected_setup=gpu(f,'resident-input-owned-readback');expected_setup.update(upload_bytes=4*(len(f['xs'])+len(f['ys'])+9),dispatches=0,readback_bytes=0)
  assert row['gpu']==expected_setup
 if phase=='validate':assert not any(d[k]for k in ['samples','calibration','warmups','first_selection_miss'])and d['observable']==0
 else:
  gate=read(R/(phase+'-gate.json'));assert gate['authorized']and gate['metadata_sha256']==sha(R/'metadata.json')
  rounds=protocol[phase+'_rounds'];assert len(d['samples'])==len(expected)*rounds
  assert {(x['frame'],x['boundary'],x['variant'],x['round'])for x in d['samples']}=={(*key,r)for key in expected for r in range(rounds)}
  assert {(x['frame'],x['boundary'],x['variant'],x['iteration'])for x in d['warmups']}=={(*key,i)for key in expected for i in range(protocol['warmups'])}
  assert len(d['warmups'])==len(expected)*protocol['warmups']and all(x['passed']for x in d['warmups'])
  observable=0
  for key in expected:
   rows=[x for x in d['calibration']if(x['frame'],x['boundary'],x['variant'])==key]
   assert [x['iterations']for x in rows]==[1<<i for i in range(len(rows))]
   assert all(x['elapsed_ms']<protocol['target_ms']and x['iterations']<protocol['max_iterations']for x in rows[:-1])
   assert rows[-1]['elapsed_ms']>=protocol['target_ms']or rows[-1]['iterations']==protocol['max_iterations']
   assert all(x['iterations']==rows[-1]['iterations']for x in d['samples']if(x['frame'],x['boundary'],x['variant'])==key)
  for row in d['samples']+d['calibration']:
   f=by[row['frame']];n=row['iterations'];assert int(row['checksum'])==(f['checksum']*n)%2**32 and row['consumed_elements']==len(f['expected'])*n
   assert math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/n,rel_tol=1e-12)
   chosen=backend(f,row['boundary'],row['variant']);assert row['actual_backend_counts']=={chosen:n}
   contract=gpu(f,row['boundary'])if chosen=='gpu'else dict(dispatches=0,upload_bytes=0,readback_bytes=0)
   assert all(row['gpu_counters'][k]==contract[k]*n for k in ['dispatches','upload_bytes','readback_bytes'])
   observable=(observable+int(row['checksum']))%2**32
  first=d['first_selection_miss'];assert len(first)==(len(frames)*2 if phase=='evaluation'else 0)
  if first:
   assert {(x['frame'],x['boundary'])for x in first}=={(f['id'],b)for f in frames for b in protocol['boundaries']}
   for row in first:
    f=by[row['frame']];assert int(row['checksum'])==f['checksum']and row['backend']==backend(f,row['boundary'],'auto_cached');observable=(observable+int(row['checksum']))%2**32
  assert observable==d['observable']
  state=protocol['seed']&0xffffffff
  def rng():
   nonlocal state
   state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
  order=[]
  for f in frames:
   for boundary in protocol['boundaries']:
    for round_ in range(rounds):
     a=names[:]
     for i in range(len(a)-1,0,-1):
      j=rng()%(i+1);a[i],a[j]=a[j],a[i]
     order.extend((f['id'],boundary,round_,v)for v in a)
  assert order==[(x['frame'],x['boundary'],x['round'],x['variant'])for x in d['samples']]
 result=dict(status='passed',phase=phase,validation_rows=len(validation),gpu_validation_rows=sum(x['backend']=='gpu'for x in d['validation']),samples=len(d['samples']),groups=len(expected),zero_gpu_fallback=True,owned_all_outputs=True,physical_gpu_contracts=True,reported_live_bytes='Captured counter reports compiled host resource budget; prepared resident counter sums allocated device buffers. No heap allocation savings inferred.',source_binding_files=len(m['bindings']),bindings=dict(metadata=sha(R/'metadata.json'),results=sha(R/filename),auditor=sha(__file__)))
 
 if (R/(phase+'-audit.json')).exists():assert read(R/(phase+'-audit.json'))==result,'preserve differing audit receipt'
 else:write(phase+'-audit.json',result)
 return d,result

def solve(a,b):
 n=len(b);a=[[*row,value]for row,value in zip(a,b)]
 for col in range(n):
  pivot=max(range(col,n),key=lambda i:abs(a[i][col]))
  if abs(a[pivot][col])<1e-12:return None
  a[col],a[pivot]=a[pivot],a[col];v=a[col][col];a[col]=[x/v for x in a[col]]
  for row in range(n):
   if row!=col:
    v=a[row][col];a[row]=[x-v*y for x,y in zip(a[row],a[col])]
 return [row[-1]for row in a]
def nnls(x,y):
 candidates=[]
 for count in range(4):
  for active in itertools.combinations(range(3),count):
   beta=[0.0]*3
   if active:
    a=[[sum(row[i]*row[j]for row in x)for j in active]for i in active];b=[sum(row[i]*v for row,v in zip(x,y))for i in active];sol=solve(a,b)
    if sol is None or min(sol)<-1e-7:continue
    for i,v in zip(active,sol):beta[i]=max(0.0,v)
   predicted=[sum(a*b for a,b in zip(row,beta))for row in x];sse=sum((a-b)**2 for a,b in zip(predicted,y));candidates.append((sse,beta,predicted,list(active)))
 assert candidates;return min(candidates,key=lambda x:(x[0],x[3]))
def fit():
 if (R/'frozen-profile.json').exists():raise ValueError('profile already frozen; no retuning')
 d,audit_result=audit('training');m=read(R/'metadata.json');p=m['protocol'];fixtures=[f for f in read(R/'fixtures.json')['frames']if f['split']=='training'];scales=[1,p['domains']['input_elements'][1],p['domains']['output_capacity_elements'][1]];models={};fits=[]
 for boundary in p['boundaries']:
  backends={}
  for backend in p['backend_order']:
   points=[]
   for f in fixtures:
    samples=[r['ns_per_call']for r in d['samples']if r['frame']==f['id']and r['boundary']==boundary and r['variant']=='auto_path_'+backend];assert len(samples)==3
    points.append(dict(frame=f['id'],features=features(f),observed_ns=statistics.median(samples)))
   x=[[1,q['features']['input_elements']/scales[1],q['features']['output_capacity_elements']/scales[2]]for q in points];sse,beta,predicted,active=nnls(x,[q['observed_ns']for q in points]);coeff=[b/s for b,s in zip(beta,scales)];price={'intercept_ns':coeff[0],'terms':dict(zip(p['training_features'],coeff[1:]))};assert all(0<=v<=1e12 for v in coeff)
   backends[backend]=price;fits.append(dict(boundary=boundary,backend=backend,squared_error=sse,active_columns=active,price=price,training_points=[dict(q,predicted_ns=y,residual_ns=q['observed_ns']-y)for q,y in zip(points,predicted)]))
  models[boundary]=dict(schema=1,target_key=d['target_key'],models={d['scope']:dict(boundary=boundary,domains=p['domains'],backends=backends)})
 frozen=dict(schema=1,status='frozen_from_training_only',target_key=d['target_key'],metadata_sha256=sha(R/'metadata.json'),training_results_sha256=sha(R/'training-results.json'),training_sizes=p['training_sizes'],heldout_sizes=p['heldout_sizes'],scope=d['scope'],captured=models['captured-owned'],resident=models['resident-input-owned-readback'])
 write('frozen-profile.json',frozen);write('fit-receipt.json',dict(status='passed',frozen_profile_sha256=sha(R/'frozen-profile.json'),training_results_sha256=sha(R/'training-results.json'),training_audit_sha256=sha(R/'training-audit.json'),fitter_sha256=sha(__file__),fit_method=p['fit'],all_training_points_retained=True,heldout_measurements_read=False,automatic_global_default=False,models=fits))
 return dict(status='frozen',profile_sha256=sha(R/'frozen-profile.json'))
def self_test():
 x=[[1,0,0],[1,1,0],[1,0,1],[1,1,1]];y=[2,5,7,10];sse,beta,_,_=nnls(x,y);assert sse<1e-20 and all(abs(a-b)<1e-12 for a,b in zip(beta,[2,3,5]))
 _,beta,_,_=nnls(x,[-1,-2,-3,-4]);assert beta==[0,0,0]
 x=[[1,1,1],[1,2,2],[1,3,3]];assert nnls(x,[1,2,3])[0]<1e-20
 return dict(status='passed',positive_coefficients_recovered=True,negative_prices_clamped_at_zero=True,rank_deficient_active_sets_handled=True,timing=False)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['validate','training','evaluation','fit','self-test']);a=p.parse_args()
 if a.mode=='fit':result=fit()
 elif a.mode=='self-test':result=self_test();write('fit-self-test.json',result)
 else:_,result=audit(a.mode)
 print(json.dumps(result))

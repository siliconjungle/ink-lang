"""Audit selector-only proxy evidence; no kernel execution or timing."""
from pathlib import Path
import json,hashlib,math,random,argparse,statistics
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11/adaptive';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();read=lambda p:json.loads(Path(p).read_text())
def audit(timed=False):
 m=read(R/'metadata.json');p=read(R/'overhead-protocol.json');d=read(R/('overhead-results.json'if timed else'overhead-validation.json'));fixtures=[f for f in read(R/'fixtures.json')['frames']if f['split']=='heldout'];by={f['id']:f for f in fixtures};boundaries=m['protocol']['boundaries'];variants=p['variants'];expected={(f['id'],b,v)for f in fixtures for b in boundaries for v in variants}
 assert p['metadata_sha256']==d['metadata_sha256']==sha(R/'metadata.json')and d['protocol']==p and d['status']=='passed'and d['actual_device_work']is False and d['online_clock_calls']==0 and d['validate_only']==(not timed)and d['actual_browser']
 assert p['selector_sha256']==sha(R/'bundle/backend-selection.mjs')and p['harness_sha256']==sha(R/'selector-overhead39.mjs')
 for path,h in m['bindings'].items():assert sha(R/path)==h,path
 assert {(x['frame'],x['boundary'],x['variant'])for x in d['validation']}==expected and len(d['validation'])==48
 for x in d['validation']:assert x['complete_output']and x['immutable_reused_output']and x['actual_device_work']is False
 def metadata_code(f,b):return (len(f['xs'])+len(f['ys'])+4*(len(f['xs'])+len(f['ys'])+2)+len(f['xs'])+int(bool(f['xs']))+1+len(d['scope'])+len(b))%2**32
 meta_observable=sum(metadata_code(f,b)*6 for f in fixtures for b in boundaries)%2**32
 if timed:
  assert d['profile_sha256']==sha(R/'frozen-profile.json')==read(R/'fit-receipt.json')['frozen_profile_sha256'];gate=read(R/'overhead-gate.json');assert gate['authorized']and gate['profile_sha256']==d['profile_sha256']and gate['protocol_sha256']==sha(R/'overhead-protocol.json')and gate['metadata_sha256']==sha(R/'metadata.json')
  assert len(d['samples'])==144 and {(x['frame'],x['boundary'],x['variant'],x['round'])for x in d['samples']}=={(*k,r)for k in expected for r in range(3)}
  assert len(d['warmups'])==384 and {(x['frame'],x['boundary'],x['variant'],x['iteration'])for x in d['warmups']}=={(*k,i)for k in expected for i in range(8)}and all(x['passed']for x in d['warmups'])
  for f in fixtures:
   for b in boundaries:meta_observable=(meta_observable+metadata_code(f,b)*8*3)%2**32
  observable=0
  for key in expected:
   rows=[x for x in d['calibration']if(x['frame'],x['boundary'],x['variant'])==key];assert [x['iterations']for x in rows]==[1<<i for i in range(len(rows))];assert all(x['elapsed_ms']<2 and x['iterations']<65536 for x in rows[:-1]);assert rows[-1]['elapsed_ms']>=2 or rows[-1]['iterations']==65536;assert all(x['iterations']==rows[-1]['iterations']for x in d['samples']if(x['frame'],x['boundary'],x['variant'])==key)
  for x in d['calibration']+d['samples']:
   f=by[x['frame']];n=x['iterations'];assert int(x['checksum'])==f['checksum']*n%2**32 and x['consumed_elements']==len(f['expected'])*n and x['actual_device_work']is False
   assert x['selector_clear_calls']==(n if x['variant']=='miss_clear_selector'else 0);assert math.isclose(x['ns_per_call'],x['elapsed_ms']*1e6/n,rel_tol=1e-12)
   observable=(observable+int(x['checksum']))%2**32;meta_observable=(meta_observable+metadata_code(f,x['boundary'])*n)%2**32
  assert observable==d['observable']
  state=p['seed']&0xffffffff
  def rng():
   nonlocal state
   state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
  order=[]
  for f in fixtures:
   for boundary in boundaries:
    for round_ in range(3):
     v=variants[:]
     for i in range(len(v)-1,0,-1):
      j=rng()%(i+1);v[i],v[j]=v[j],v[i]
     order.extend((f['id'],boundary,round_,name)for name in v)
  assert order==[(x['frame'],x['boundary'],x['round'],x['variant'])for x in d['samples']]
 else:assert not any(d[k]for k in ['samples','calibration','warmups'])and d['observable']==0
 assert meta_observable==d['metadata_observable']
 comparisons=[]
 if timed:
  for f in fixtures:
   for boundary in boundaries:
    direct={x['round']:x['ns_per_call']for x in d['samples']if x['frame']==f['id']and x['boundary']==boundary and x['variant']=='direct_noop'}
    for variant in ['cached_selector','miss_clear_selector']:
     selected={x['round']:x['ns_per_call']for x in d['samples']if x['frame']==f['id']and x['boundary']==boundary and x['variant']==variant};logs=[math.log(selected[i]/direct[i])for i in range(3)];seed=int.from_bytes(hashlib.sha256((f['id']+'/'+boundary+'/'+variant).encode()).digest()[:8],'big');r=random.Random(seed);draws=sorted(math.exp(sum(r.choices(logs,k=3))/3)for _ in range(2000));comparisons.append(dict(frame=f['id'],boundary=boundary,variant=variant,ratio_selector_over_direct=math.exp(sum(logs)/3),ci95=[draws[50],draws[1949]],median_ns_increment=statistics.median(selected.values())-statistics.median(direct.values()),seed=seed,limit='Miss includes clear cost; no-op proxy with common consumer, not measured pipeline selection overhead.'))
 result={'status':'passed','timed':timed,'validation_rows':48,'samples':len(d['samples']),'groups':48,'online_clock_calls':0,'actual_device_work':False,'metadata_consumption_replayed':True,'comparisons':comparisons,'limits':'One actualbrowser process3pairedrounds. Conditional2000draw nominal95percentile, no multiplicity correction. All32comparisons retained. Proxy output reusedimmutable; no ownedallocation or actualGPU work. Clear cost included in miss.','bindings':{str(path.relative_to(B)):sha(path)for path in [R/'metadata.json',R/'overhead-protocol.json',R/('overhead-results.json'if timed else'overhead-validation.json'),Path(__file__)]}}
 name='overhead-audit-replay.json'if timed else'overhead-validation-replay.json'
 if (R/name).exists():assert read(R/name)==result,'preserved receipt differs'
 else:
  with(R/name).open('x')as f:json.dump(result,f,indent=2);f.write('\n')
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--timed',action='store_true');a=p.parse_args();d=audit(a.timed)
 if a.timed:
  rows=[]
  for c in d['comparisons']:
   c=dict(c);lo,hi=c['ci95'];c['classification']='overhead'if lo>1 else('lower_proxy_cost'if hi<1 else'uncertain');rows.append(c)
  groups=[]
  for boundary in read(R/'metadata.json')['protocol']['boundaries']:
   for variant in ['cached_selector','miss_clear_selector']:
    cells=[c for c in rows if c['boundary']==boundary and c['variant']==variant];inc=[c['median_ns_increment']for c in cells]
    groups.append(dict(boundary=boundary,variant=variant,cells=len(cells),ratio_selector_over_direct_geomean=math.exp(sum(math.log(c['ratio_selector_over_direct'])for c in cells)/len(cells)),median_of_cell_median_ns_increments=statistics.median(inc),increment_range_ns=[min(inc),max(inc)],classifications={k:sum(c['classification']==k for c in cells)for k in ['overhead','lower_proxy_cost','uncertain']},point_lower_cost_cells=sum(c['ratio_selector_over_direct']<1 for c in cells)))
  summary=dict(status='passed',groups=groups,comparisons=rows,limits=d['limits'],all_cells_retained=True,profile_sha256=sha(R/'frozen-profile.json'),bindings={'audit_replay':sha(R/'overhead-audit-replay.json'),'raw':sha(R/'overhead-results.json'),'script':sha(Path(__file__))})
  path=R/'overhead-summary.json'
  if path.exists():assert read(path)==summary,'summary bytes preserved'
  else:
   with path.open('x')as f:json.dump(summary,f,indent=2);f.write('\n')
  print(json.dumps({'status':d['status'],'rows':48,'samples':d['samples'],'online_clock_calls':0,'comparisons':len(rows),'aggregates':groups}))
 else:print(json.dumps({'status':d['status'],'rows':48,'samples':0}))

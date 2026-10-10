"""Root cross-check of the independently prepared GPU repeat, without new timings."""
from pathlib import Path
import collections,hashlib,json,math,random,statistics
HERE=Path(__file__).resolve().parent;P=HERE.with_name('web-stack-proofs-15-gpu-confirmation-2026-10-10')
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=read(P/'confirmation-metadata.json');raw=read(P/'browser-results.json');v=read(P/'confirmation-verification.json');edge=read(P/'GPU-edge-validation.json');ev=read(P/'GPU-edge-verification.json')
assert raw['status']==v['status']==edge['status']==ev['status']=='passed'
for f,h in m['artifact_hashes'].items():assert sha(P/f)==h,f
for f,h in m['unchanged_parent_artifacts'].items():assert sha(P/f)==sha(HERE/f)==h,f
main=read(HERE/'fixtures.json');fixtures=read(P/'fixtures.json');assert {k:d for k,d in fixtures.items() if k!='cells'}=={k:d for k,d in main.items() if k!='cells'}
assert len(fixtures['cells'])==12 and len(fixtures['inputs'])==234
variants={'ink_baseline_gpu','ink_prior_gpu','ink_checked_gpu'}
inputs={r['id']:r for r in fixtures['inputs']};cells={(c['case'],fixtures['inputs'][c['input']]['id']) for c in fixtures['cells']}
seen=set();groups=collections.defaultdict(lambda:collections.defaultdict(dict))
for r in raw['samples']:
 k=(r['case'],r['input']);ident=(*k,r['variant'],r['round']);assert ident not in seen;seen.add(ident)
 assert k in cells and r['variant'] in variants and 0<=r['round']<9
 n=r['iterations'];expected=inputs[r['input']]['expected'][r['case']]
 assert n>0 and r['single']==str(expected) and r['checksum']==str(expected*n%(2**64))
 assert math.isclose(r['ns_per_call'],1e9*r['seconds']/n,rel_tol=1e-9)
 assert r['gpu_counters']['readback_bytes']==4*n and r['gpu_counters']['upload_bytes']>=4*65536*n
 groups[k][r['variant']][r['round']]=r['ns_per_call']
assert seen=={(*c,kind,r) for c in cells for kind in variants for r in range(9)}
def interval(a,b):
 rng=random.Random(0);draws=[]
 for _ in range(4000):
  ix=[rng.randrange(9) for _ in range(9)];draws.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
 draws.sort();return [statistics.median(a)/statistics.median(b),draws[100],draws[3899]]
counts=collections.Counter();checked=0
for row in v['measurements']:
 values={kind:[d[i] for i in range(9)] for kind,d in groups[(row['case'],row['input'])].items()}
 assert row['median_ns']=={k:statistics.median(x) for k,x in values.items()}
 for kind in ['baseline','prior']:
  saved=row['paired'][kind+'_over_checked_gpu'];ci=interval(values['ink_'+kind+'_gpu'],values['ink_checked_gpu']);assert ci==saved['ratio_95pct'];checked+=1
  verdict='faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive';assert verdict==saved['classification']
  if kind=='prior':counts[verdict]+=1
edge_seen=set();gpu=fallback=0
for r in edge['records']:
 ident=(r['case'],r['input'],r['kind']);assert ident not in edge_seen;edge_seen.add(ident)
 x=inputs[r['input']];assert r['expected']==r['actual']==str(x['expected'][r['case']]) and r['length']==len(x['xs'])
 if r['actual_backend']=='gpu':gpu+=1;assert r['manifest_eligible'] and r['counters']['readback_bytes']==4
 else:fallback+=1;assert not r['manifest_eligible'] or not x['xs']
assert edge_seen=={(x['case'],x['id'],kind) for x in fixtures['inputs'] for kind in ['baseline','prior','checked']}
assert (gpu,fallback)==(312,390) and checked==24 and len(raw['samples'])==324
assert raw['validation']['comparisons']==2988 and edge['comparisons']==702
result=dict(status='passed',samples=324,exact_confirmation_comparisons=2988,exact_edge_comparisons=702,edge_actual_gpu=312,edge_fallback=390,intervals_recomputed=checked,confirmed_prior_counts=dict(counts),frozen_artifacts=len(m['artifact_hashes']),identical_parent_artifacts=len(m['unchanged_parent_artifacts']),scope='Separate repeat; no pooling, new proof catalogue or canonical observations.',artifact_hashes={f:sha(P/f) for f in ['confirmation-metadata.json','browser-results.json','confirmation-verification.json','GPU-edge-validation.json','GPU-edge-verification.json','browser-completed.png']})
(HERE/'root-confirmation-verification.json').write_text(json.dumps(result,indent=2)+'\n');print({k:v for k,v in result.items() if k!='artifact_hashes'})

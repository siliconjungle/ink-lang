import argparse,hashlib,json,platform,statistics,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--seed',type=int,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path.cwd();folder=root/'build/v8-rup-compaction';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';samples={k:[]for k in ['baseline','compacted']};groups=json.loads((folder/'replay-groups.json').read_text())['groups'];cells=[]
for i in range(7):
 for label in (['baseline','compacted']if(i+a.seed)%2==0 else['compacted','baseline']):
  batch=0
  for group in range(len(groups)):
   start=time.perf_counter_ns();r=subprocess.run([compiler,'knowledge-check',folder/'core.json',folder/(label+'-'+str(group)+'.bundle.json')],capture_output=True,text=True,timeout=120);elapsed=time.perf_counter_ns()-start;assert r.returncode==0,r.stderr;batch+=elapsed;cells.append(dict(round=i,label=label,group=group,ns=elapsed))
  samples[label].append(batch)
files=[compiler,folder/'core.json',folder/'replay-groups.json']+sorted(folder.glob('*-*.bundle.json'))
a.output.write_text(json.dumps(dict(schema=1,seed=a.seed,rounds=7,law_count=43,groups=groups,cells=cells,samples_ns=samples,median_ns={k:statistics.median(v)for k,v in samples.items()},inputs_sha256={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()for p in files},host=platform.platform(),scope='Sum of complete fresh CLI knowledge-check calls over fixed 8-MB-bounded statement groups of the same 43 statements, alternating baseline/compacted bundles. Includes process startup, bundle/core reading, canonical hashing, admission and proof replay. Excludes bundle preparation and Python import. Shared host with the required corpus; this is checker-batch timing, not compilation or runtime performance.'),indent=2)+'\n')

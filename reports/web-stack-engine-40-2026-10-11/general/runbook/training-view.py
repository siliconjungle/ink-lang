#!/usr/bin/env python3
"""Export training rows only after full structural audit; never computes comparisons."""
from pathlib import Path
import argparse,hashlib,json
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def main():
 a=argparse.ArgumentParser();a.add_argument('--report',type=Path,required=True);a.add_argument('--output',type=Path,required=True);x=a.parse_args()
 p=x.report;out=x.output
 if out.exists():raise ValueError('preserve prior train view')
 m=read(p/'metadata.json');audit=read(p/'node-audit.json');r=read(p/'node-results.json');fixtures=read(p/'fixtures.json')['frames'];tasks={t['name']:t for t in read(p/'spec.json')['tasks']}
 if audit['status']!='passed'or audit['timed']is not True or r['status']!='passed':raise ValueError('full structural audit required')
 if audit['bindings']['metadata']!=sha(p/'metadata.json')or audit['bindings']['results']!=sha(p/'node-results.json')or r['metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('result/audit binding drift')
 for path,h in m['bindings'].items():
  if sha(p/path)!=h:raise ValueError('prepared source drift '+path)
 allowed={f['id']for f in fixtures if f['timed']and f['split']=='train'}
 if len(allowed)!=48:raise ValueError('frozen train cell count')
 for f in fixtures:
  if f['id']in allowed and(tasks[f['task']]['operation']not in ['affine','compaction','scan']or f['dimensions']['size']not in [64,8192]):raise ValueError('invalid training family/size')
 rows=[row for row in r['samples']if row['frame']in allowed]
 if {row['frame']for row in rows}!=allowed or any(row['split']!='train'for row in rows):raise ValueError('training coverage')
 # Values in excluded rows are neither used for fitting nor compared here.
 groups={}
 for row in rows:groups.setdefault((row['frame'],row['variant'],row['boundary']),set()).add(row['round'])
 if any(rounds!=set(range(m['protocol']['rounds']))for rounds in groups.values())or len(rows)!=len(groups)*m['protocol']['rounds']:raise ValueError('training repeat coverage')
 target_bindings={name:m['selections'][name]for name in {row['name']for row in rows}}
 result=dict(schema=1,host=r['host'],target_bindings=target_bindings,prepared_bindings=m['bindings'],boundary_ledger=m['boundary_ledger'],rust_targets=m['rust_targets'],kind='general40-audited-training-view-v1',status='passed',metadata_sha256=sha(p/'metadata.json'),protocol=m['protocol'],frames=sorted(allowed),samples=rows,source_bindings={name:sha(p/name)for name in ['metadata.json','spec.json','fixtures.json','node-results.json','node-audit.json']},exporter_sha256=sha(__file__),scope='Only frozen48traincells. All240heldout timedcells excluded; no heldout ratios/classifications, fit or prediction computed. Exporter and upstream whole-result structural audit are trusted filtering/provenance tooling.')
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='training-view-exported',cells=len(allowed),samples=len(rows),groups=len(groups),sha256=sha(out))))
if __name__=='__main__':main()

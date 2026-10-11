#!/usr/bin/env python3
"""Summarize audited comparisons without executing targets or fitting a model."""
from pathlib import Path
import argparse,collections,hashlib,json,math

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main(report):
 fixtures={x['id']:x for x in json.loads((report/'fixtures.json').read_text())['frames']}
 rows=[];bindings={}
 for host in ['node','browser','native']:
  summary=report/('native/summary.json'if host=='native'else host+'-summary.json')
  audit=report/('native/audit.json'if host=='native'else host+'-audit.json')
  result=report/('native/results.json'if host=='native'else host+'-results.json')
  s=json.loads(summary.read_text());a=json.loads(audit.read_text())
  assert s['status']=='passed'and a['status']=='passed'and s['results_sha256']==a['bindings']['results']==sha(result)
  bindings[host]=dict(summary=sha(summary),audit=sha(audit),result=sha(result))
  groups={}
  for row in s['comparisons']:
   kind='vector'if isinstance(fixtures[row['frame']]['expected'],list)else'scalar_u32'
   groups.setdefault((kind,row['boundary'],row['reference'],row['current']),[]).append(row)
  for key,cells in sorted(groups.items()):
   counts=collections.Counter(x['classification']for x in cells)
   rows.append(dict(host=host,result_kind=key[0],boundary=key[1],reference=key[2],current=key[3],cells=len(cells),geometric_mean_reference_over_current=math.exp(sum(math.log(x['ratio_reference_over_current'])for x in cells)/len(cells)),classifications=dict(counts)))
 out=dict(status='audited-provisional',bindings=bindings,rows=rows,scope='All predeclared cells retained. Separate hosts, ownership boundaries and scalar/vector results. Ratio >1 favors candidate/current. Geometric means are descriptive; cell classifications use nominal five-round intervals without multiplicity correction. External concurrent work was observed; no isolated-host or universal superiority inference. No model fitted here.')
 (report/'all-host-overview.json').write_text(json.dumps(out,indent=2)+'\n')
 lines=['# Provisional complete web-stack comparison','',out['scope'],'','| Host | Result | Boundary | Reference | Current | Ratio | Faster / slower / uncertain |','|---|---|---|---|---|---:|---:|']
 for r in rows:
  c=r['classifications'];lines.append(f"| {r['host']} | {r['result_kind']} | {r['boundary']} | {r['reference']} | {r['current']} | {r['geometric_mean_reference_over_current']:.3f}× | {c.get('faster',0)} / {c.get('slower',0)} / {c.get('inconclusive',0)} |")
 lines+=['','All 12 benchmark families selected zero DB applications. Old/new differences measure compiler/host capabilities. JS and C kernels are byte-identical in 11/12 families; all 12 emitted Rust methods change, but their public adapter still copies both inputs into owned Vec values. GPU rows include declared host counters; complete and resident requests remain separate.','', 'Original per-cell ratios, raw observations, correctness verdicts, artifact hashes, process snapshots and frozen heldout evaluation are retained. These diagnostic measurements do not confer mathematical proof authority.']
 (report/'ALL-HOSTS-PROVISIONAL.md').write_text('\n'.join(lines)+'\n');print(json.dumps(dict(status=out['status'],cohorts=len(rows))))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report',type=Path,required=True);main(p.parse_args().report)

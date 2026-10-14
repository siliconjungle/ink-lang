#!/usr/bin/env python3
"""Audit an existing full/prefix CRDT comparison without reacquiring timings."""
import argparse,hashlib,json,statistics,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--full',type=Path,required=True);p.add_argument('--prefix',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--full-cases',type=Path,required=True);p.add_argument('--prefix-cases',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
digest=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
reports=[]
for path,casespath,rounds in [(a.full,a.full_cases,11),(a.prefix,a.prefix_cases,31)]:
 r=json.loads(path.read_bytes());cases=json.loads(casespath.read_bytes());assert r['rounds']==rounds
 assert r['timing_eligible'] and not r['experimental_inline_hints'] and not r['allocation_probe']
 assert r['timing_boundary']=='call-and-output-destruction;input-clones-excluded'
 assert r['input_sha256']==digest(casespath);assert r['compiler_sha256']==digest(a.compiler)==r['control_compiler_sha256']
 assert r['source_sha256']==digest(r['source']);assert r['control_source_sha256']==digest(r['control_source'])
 assert r['plan_sha256']==digest(r['compiled_plan']);assert r['control_plan_sha256']==digest(r['control_plan'])
 receipt=Path(r['compiled_plan']+'.receipt.json');selection=json.loads(receipt.read_bytes());assert r['selection_receipt_sha256']==digest(receipt)
 assert selection['status']=='checked' and selection['source']==json.loads(Path(r['compiled_plan']).read_bytes())['input_core_sha256']
 acquisition=selection['measurement_acquisition'];assert len(acquisition['observations'])==selection['admitted_states']*5 and not acquisition['rejected']
 keys={(row['case'],row['variant']) for row in r['results']};assert len(keys)==len(r['results'])==len(cases)*3
 for case in cases:
  for variant in ['ink_batched_graph','ink_control','diamond_types']:
   row=next(x for x in r['results']if x['case']==case['name']and x['variant']==variant)
   assert row['changes']==len(case['changes'])
   if case['expected'] is not None:assert row['output_codepoints']==len(case['expected'])
   else:assert row['output_codepoints']==next(x['output_codepoints']for x in r['results']if x['case']==case['name']and x['variant']=='diamond_types')
   assert len(row['samples_ns'])==rounds and all(isinstance(x,int)and x>0 for x in row['samples_ns'])
   assert row['median_ns']==statistics.median(row['samples_ns'])
 reports.append(r)
assert reports[0]['source_sha256']==reports[1]['source_sha256'];assert reports[0]['emitted_sha256']==reports[1]['emitted_sha256'];assert reports[0]['plan_sha256']==reports[1]['plan_sha256'];assert reports[0]['upstream_pins']==reports[1]['upstream_pins']
for source,plan in [(reports[0]['source'],reports[0]['compiled_plan']),(reports[0]['control_source'],reports[0]['control_plan'])]:
 replay=subprocess.run([a.compiler.resolve(),'check-plan',source,plan],capture_output=True,text=True,timeout=180)
 if replay.returncode:raise ValueError('current complete source/plan replay failed: '+replay.stderr[-2000:])
root=Path(__file__).resolve().parents[2];pin=reports[0]['upstream_pins']['diamond-types']['revision'];actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root/'build/crdt/upstreams/diamond-types',text=True).strip();assert actual==pin
result={'status':'passed','reports':{str(a.full):digest(a.full),str(a.prefix):digest(a.prefix)},'compiler_sha256':digest(a.compiler),'source':reports[0]['source'],'plan':reports[0]['plan_sha256'],'diamond_types_revision':pin,'oracle_scope':'Full fixtures contain supplied expected text; concurrent prefixes use native pinned Diamond Types output equality in the harness','scope':'Current complete source/plan replay, artifact provenance, complete fixture coverage, sample counts and output sizes; harness performs full output equality before timing; does not prove timing stability, backend correctness, lifecycle parity or convergence'}
a.o.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

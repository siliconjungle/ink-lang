"""Retain a terminal frozen cohort without private stores or generated targets."""
from pathlib import Path
import json,hashlib,shutil,subprocess
base=Path('build/v8-proof-dependencies');source=base/'corpus';out=Path('bench/v8-learning/corpus-proof-dependencies')
report=json.loads((source/'report.json').read_bytes());records=json.loads((source/'records.json').read_bytes())
assert len(records)==10 and all(r['status']==0 for r in records)
assert report['context']==json.loads((source/'context.json').read_bytes())
shutil.copytree(source,out);shutil.copyfile(base/'corpus.log',out/'driver.log')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(out/'terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,observed_session=51210,programs=10,final_source_context_check_passed=True,report_sha256=sha(out/'report.json')),indent=2)+'\n')
(out/'source-pins.json').write_text(json.dumps(dict(schema=1,distribution_source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),knowledge_before=subprocess.check_output(['git','-C','knowledge','rev-parse','HEAD'],text=True).strip(),planner=subprocess.check_output(['git','-C','planner','rev-parse','HEAD'],text=True).strip(),compiler_sha256=report['context']['compiler_sha256'],producer_source_sha256=report['context']['producer_source_sha256'],scope='Exact frozen post-addition producer/proof bytes; completed before immutable timing observations publish. Later knowledge commit preserves these same source bytes; no timing or cost transfer.'),indent=2)+'\n')
(out/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Completed required frozen corpus exact source inputs, plans, final context, terminal receipt, funnel, near misses and cross-program reuse; private stores and targets omitted.')],safe_to_remove=[]),indent=2)+'\n')
index={str(p.relative_to(out)):sha(p)for p in sorted(out.rglob('*'))if p.is_file()};(out/'sha256-index.json').write_text(json.dumps(dict(schema=1,files=index),indent=2)+'\n')
summary=dict(schema=1,headline=report['headline'],near_misses=report['near_misses'],context=report['context'],scope='Same frozen ten-program manifest, private publications and final stable context; shared-host quick-budget runs establish no causal compiler/runtime comparison.')
Path('bench/v8-learning/corpus-proof-dependencies-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(report['headline']))

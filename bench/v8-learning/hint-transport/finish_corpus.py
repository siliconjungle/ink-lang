"""Freeze a terminal corpus without private knowledge publications/targets."""
import hashlib,json,shutil,statistics,subprocess
from pathlib import Path
base=Path('build/v8-proof-transport');source=base/'corpus';assert json.loads((source/'terminal.json').read_bytes())['exit_status']==0
out=Path('bench/v8-learning/corpus-hint-transport');shutil.copytree(source,out);shutil.copyfile(base/'corpus.log',out/'driver.log')
report=json.loads((out/'report.json').read_bytes());assert report['context']==json.loads((out/'context.json').read_bytes());records=json.loads((out/'records.json').read_bytes());assert len(records)==10 and all(r['status']==0 for r in records)
(base/'corpus-private').rmdir()
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
pins=dict(schema=1,distribution=git('rev-parse','HEAD'),knowledge_start=git('-C','knowledge','rev-parse','HEAD'),planner=git('-C','planner','rev-parse','HEAD'),compiler_sha256=hashlib.sha256((base/'frozen/ink-final').read_bytes()).hexdigest(),producer_source_sha256=report['context']['producer_source_sha256'],scope='Corpus ran with exactly captured dirty producer/data bytes; final knowledge commit later preserves those same code/proof inputs. New timing rows publish only after final stable-context check, keeping proof snapshot and selection policy unchanged.')
(out/'source-pins.json').write_text(json.dumps(pins,indent=2)+'\n')
(out/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Completed required frozen corpus: exact inputs/plans/context, terminal proof, funnel, near misses and cross-program reuse; private publications omitted.')],safe_to_remove=[]),indent=2)+'\n')
index={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(out.rglob('*'))if p.is_file()};(out/'sha256-index.json').write_text(json.dumps(dict(schema=1,files=index),indent=2)+'\n')
summary=dict(schema=1,headline=report['headline'],near_misses=report['near_misses'],context=report['context'],scope='Same frozen ten-program manifest, private mutable publications and final stable context. Quick time budgets and shared host prevent causal performance conclusions. New mechanism fixture is separate; counts never grant proof or profitability.')
Path('bench/v8-learning/corpus-hint-transport-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary['headline']))

"""Bind untimed target-work trace rows to exact semantic/target provenance.
No counts are inferred from list lengths or from source operation names.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def produce(output, paths, cohort):
    trace = json.loads(Path(paths['trace']).read_text())
    if trace.get('status') != 'untimed-complete-output-replayed': raise ValueError('untimed oracle replay required')
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    bindings = {name: dict(path=os.path.relpath(Path(path).resolve(), output.resolve()), sha256=sha(path)) for name, path in paths.items()}
    rows = []
    for i, row in enumerate(trace['rows']):
        if row['boundary'] != cohort['boundary']: continue
        data = dict(schema=1, kind='ink-target-work-v1', cohort=cohort, bindings=bindings,
                    entry=row['entry'], fixture_id=row['id'], components=row['components'],
                    known=row['known'], unknown=row['unknown'], scope=trace['scope'])
        path=output/f'{i:04}.json'; path.write_text(json.dumps(data,indent=2)+'\n')
        rows.append(dict(path=str(path),entry=row['entry'],fixture_id=row['id']))
    return rows


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('original-core','selected-core','selection','artifact','fixture','instrumenter','instrumented','instrumentation','runner','trace','cohort','output'):
        p.add_argument('--'+name,type=Path,required=True)
    a=p.parse_args()
    fields=('original_core','selected_core','selection','artifact','fixture','instrumenter','instrumented','instrumentation','runner','trace')
    rows=produce(a.output,{k:getattr(a,k)for k in fields},json.loads(a.cohort.read_text()))
    print(json.dumps(dict(sidecars=len(rows),scope='Untimed offline source-bound diagnostic observations, not proof authority')))
if __name__=='__main__':main()

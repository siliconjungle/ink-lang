#!/usr/bin/env python3
"""Summarize independent browser processes without treating inner repeats as replicates."""
import hashlib
import json
import pathlib
import statistics
import sys

source = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])
paths = [source / f'test-{i}.json' for i in range(5)]
records = [json.loads(p.read_text()) for p in paths]
training = [json.loads((source / f'train-{i}.json').read_text()) for i in range(3)]
base = records[0]
assert all(r['mode'] == 'test' for r in records)
assert all(r['source_hashes'] == base['source_hashes'] and r['targetKey'] == base['targetKey'] for r in records + training)
assert not base['device']['isFallbackAdapter']
result = dict(schema=1, environment=base['environment'], device=base['device'],
              source_hashes=base['source_hashes'], training_processes=3,
              held_out_processes=5,
              statistic='Median of per-process medians; process ranges are descriptive, not confidence intervals.',
              validation=base['validation'], ordinary=[], resident=[],
              limitations=[
                  'Frozen projection-fix compiler; not a claim about latest published main.',
                  'CPU is the generated browser CPU backend through the same pipeline API, not a native Rust executable.',
                  'Ordinary calls include host handling, GPU upload, completion and full readback.',
                  'Resident step/finish excludes initial upload and final readback but awaits completion.',
                  'Resident lifecycle includes open, 32 steps, completion, full read and close.',
                  'Resident auto currently ignores the attached cost profile and prefers GPU.',
                  'Physics is particle integration with floor bounce, not Box2D rigid-body simulation.',
                  'Only ECS and physics are GPU eligible in this eight-kernel bundle.',
              ])
for kind, dest in [('receipts', 'ordinary'), ('resident', 'resident')]:
    for index, case in enumerate(base[kind]):
        peers = [r[kind][index] for r in records]
        assert all((p['kernel'], p['n']) == (case['kernel'], case['n']) and p['validated'] for p in peers)
        assert all(p['backends'] == case['backends'] for p in peers)
        assert all(p['backends']['gpu'] == 'gpu' for p in peers)
        assert all(p['counters']['gpu'].get('dispatches', p['counters']['gpu'].get('step', {}).get('dispatches', 0)) > 0 for p in peers)
        if kind == 'receipts':
            assert case['n'] not in {c['n'] for t in training for c in t['receipts']}
        row = dict(kernel=case['kernel'], n=case['n'], backends=case['backends'],
                   counters=case['counters'], timings={})
        for key in ['samples_ns'] + (['step_finish_samples_ns'] if kind == 'resident' else []):
            timing = {}
            for name in ['cpu', 'gpu', 'auto', 'profile']:
                medians = [statistics.median(p[key][name]) / 1e6 for p in peers]
                timing[name] = dict(median_ms=statistics.median(medians), process_medians_ms=medians,
                                    process_range_ms=[min(medians), max(medians)])
            timing['cpu_over_gpu'] = timing['cpu']['median_ms'] / timing['gpu']['median_ms']
            row['timings'][key] = timing
        if kind == 'resident':
            row['iterations'] = case['iterations']
        else:
            row['reasons'] = case['reasons']
            row['fastest_forced_backend'] = min(['cpu', 'gpu'], key=lambda k: row['timings']['samples_ns'][k]['median_ms'])
        result[dest].append(row)
result['evidence_sha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                             for p in paths + [source / f'train-{i}.json' for i in range(3)]
                             + [source / 'profile.json', source / 'fit-receipt.json']}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(output=str(output), ordinary=len(result['ordinary']), resident=len(result['resident']))))

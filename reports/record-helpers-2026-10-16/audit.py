#!/usr/bin/env python3
"""Artifact integrity and measurement consistency, not a compiler proof."""
import gzip
import hashlib
import json
import re
import statistics as stats
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read(name):
    data = (ROOT / name).read_bytes()
    return json.loads(gzip.decompress(data) if name.endswith('.gz') else data)


def med(records, **keys):
    return stats.median(r['ns_per_call'] for r in records if all(r[k] == v for k, v in keys.items()))


def summary():
    result = {'complex': [], 'simple': [], 'neural': []}
    for size in [8, 64, 512]:
        for engine in ['blink', 'gecko', 'webkit']:
            for lane in ['ordinary', 'prepared']:
                old = [med(read(f'complex/before-{r}.json')['records'], size=size, engine=engine, name=lane) for r in range(3)]
                new = [med(read(f'complex/current-{r}.json')['records'], size=size, engine=engine, name=lane) for r in range(3)]
                upstream = [med(read(f'complex/current-{r}.json')['records'], size=size, engine=engine, name='pretext') for r in range(3)]
                result['complex'].append(dict(size=size, engine=engine, lane=lane, before_ns=stats.median(old),
                    current_ns=stats.median(new), upstream_ns=stats.median(upstream), paired_ratios=[a/b for a,b in zip(old,new)]))
    for rounds in [8, 128]:
        for size in [8, 64, 512]:
            for lane in ['ordinary', 'prepared']:
                docs = [read(f'simple/{rounds}-{r}.json') for r in range(3)]
                old = [med(d['records'], size=size, name='before_'+lane) for d in docs]
                new = [med(d['records'], size=size, name='current_'+lane) for d in docs]
                result['simple'].append(dict(warmup_rounds=rounds, size=size, lane=lane, before_ns=stats.median(old),
                    current_ns=stats.median(new), upstream_ns=stats.median(med(d['records'],size=size,name='pretext') for d in docs),
                    paired_ratios=[a/b for a,b in zip(old,new)]))
    for task in ['predict', 'derivatives']:
        for lane in ['ordinary', 'prepared']:
            old = [med(read(f'neural/previous-{r}.json')['records'], task=task, name='previous_'+lane) for r in range(3)]
            new = [med(read(f'neural/current-{r}.json')['records'], task=task, name='current_'+lane) for r in range(3)]
            controls = {name: stats.median(med(read(f'neural/current-{r}.json')['records'],task=task,name=name) for r in range(3))
                for name in ['handwired','handwired_ranges','direct_graph'] + (['dense_predict'] if task=='predict' else [])}
            result['neural'].append(dict(task=task,lane=lane,before_ns=stats.median(old),current_ns=stats.median(new),
                paired_ratios=[a/b for a,b in zip(old,new)],controls_ns=controls))
    return result


def audit():
    metadata = read('metadata.json')
    for name, digest in metadata['files'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == digest, name
    images = {}
    for name, receipt in metadata['images'].items():
        data = gzip.decompress((ROOT/receipt['file']).read_bytes())
        assert len(data) == receipt['bytes']
        assert hashlib.sha256(data).hexdigest() == receipt['sha256']
        images[name] = receipt
    assert images['network-before']['sha256'] == images['network-current']['sha256'], 'unchanged neural code control'
    for group in ['complex','simple','neural']:
        core = gzip.decompress((ROOT/f'{group}.core.json.gz').read_bytes())
        assert hashlib.sha256(core).hexdigest() == metadata['source_cores'][group]
    for version in ['before','current']:
        for rep in range(3):
            d = read(f'complex/{version}-{rep}.json')
            assert d['rotation'] == rep and d['warmupRounds'] == 128 and d['calls'] == 128 and d['samples'] == 15
            assert len(d['records']) == 405 and len(d['setup']) == 9 and len(d['cold']) == 27
            assert d['sources']['ink']['sha256'] == images['complex-'+version]['sha256']
            assert all(s['source_core'] == metadata['source_cores']['complex'] for s in d['setup'])
    for rounds in [8,128]:
        for rep in range(3):
            d = read(f'simple/{rounds}-{rep}.json')
            assert d['warmupRounds'] == rounds and len(d['records']) == 135
            for version in ['before','current']:
                assert d['sources'][version]['sha256'] == images['simple-'+version]['sha256']
            assert all(s['source_core'] == metadata['source_cores']['simple'] for s in d['setup'])
    for version in ['previous','current']:
        for rep,seed in enumerate([72131,99173,99174]):
            d = read(f'neural/{version}-{rep}.json')
            assert d['seed'] == seed and d['source_core'] == metadata['source_cores']['neural']
            assert len(d['records']) == 121 and all(w['calls'] == 4096 for w in d['warmup'].values())
            image = 'network-before' if version == 'previous' else 'network-current'
            assert d['sources'][version]['sha256'] == images[image]['sha256']
    for carrier in ['native','bits']:
        assert len(read(f'cases/{carrier}/cases.json.gz')) == 540
        receipt = read(f'cases/{carrier}/observations.json')
        assert receipt == {'cases':540,'calls':3780,'exactTypedBytes':True}
    gpu = read('checks/gpu-receipts.json.gz')
    assert len(gpu) == 253 and sum(x['backend']=='gpu' for x in gpu) == 1
    assert len(read('checks/expected.json.gz')) == len(read('checks/script.json.gz')) == 253
    log = gzip.decompress((ROOT/'checks/javascript.log.gz').read_bytes()).decode()
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log))) == 55
    assert 'test result: FAILED' not in log
    assert read('checks/complex.json')['referenceObservations'] == 13002
    assert read('checks/cli-image.json')['cli_matches_standalone'] is True
    assert summary() == read('summary.json')
    print('artifact hashes, exact cores/images, complete controls, target receipts and summaries verified')


if __name__ == '__main__':
    audit()

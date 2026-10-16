#!/usr/bin/env python3
"""Check retained bytes and observations; not a compiler or timing proof."""
import gzip
import hashlib
import json
import re
import statistics as stats
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def raw(name):
    data = (ROOT / name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data


def read(name):
    return json.loads(raw(name))


def median(records, **keys):
    return stats.median(r['ns_per_call'] for r in records
                        if all(r[k] == v for k, v in keys.items()))


def summary():
    rows = []
    for task in ['predict', 'derivatives']:
        for lane in ['ordinary', 'prepared']:
            values = {v: [median(read(f'neural/{v}-{i}.json')['records'],
                                 task=task, name=v+'_'+lane) for i in range(3)]
                      for v in ['previous', 'current']}
            controls = {n: stats.median(median(read(f'neural/current-{i}.json')['records'],
                                               task=task, name=n) for i in range(3))
                        for n in ['handwired', 'handwired_ranges', 'direct_graph']
                        + (['dense_predict'] if task == 'predict' else [])}
            rows.append(dict(task=task, lane=lane,
                             before_ns=stats.median(values['previous']),
                             current_ns=stats.median(values['current']),
                             paired_ratios=[a/b for a, b in zip(values['previous'], values['current'])],
                             process_medians=values, controls_ns=controls))
    return rows


def audit():
    metadata = read('metadata.json')
    for name, digest in metadata['files'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == digest, name
    for name, record in metadata['images'].items():
        image = raw(record['file'])
        assert len(image) == record['bytes'], name
        assert hashlib.sha256(image).hexdigest() == record['sha256'], name
        assert image.count(b'__nfValue(') == record['normalization_references'], name
    for name, digest in metadata['source_cores'].items():
        assert hashlib.sha256(raw(name+'.core.json.gz')).hexdigest() == digest
    # Both independently emitted text versions were compared before retaining
    # one image; these receipts bind identical hashes, not a new timing claim.
    for name in ['simple', 'complex']:
        control = metadata['unchanged_text'][name]
        assert control['before_sha256'] == control['current_sha256']
        assert control['current_sha256'] == metadata['images'][name]['sha256']
    for rep, seed in enumerate([72131, 99173, 99174]):
        pair = []
        for version in ['previous', 'current']:
            d = read(f'neural/{version}-{rep}.json')
            assert d['seed'] == seed and len(d['records']) == 121
            assert d['source_core'] == metadata['source_cores']['neural']
            assert d['sources'][version]['sha256'] == metadata['images']['neural-'+version]['sha256']
            assert d['upstream_sha256'] == metadata['upstream']['file_sha256']
            assert all(x['calls'] == 4096 for x in d['warmup'].values())
            assert len(d['cold']) == 4 and len(d['preparation']) == 3
            pair.append(d)
        for key in ['corpus_sha256', 'oracle_sha256', 'upstream_sha256', 'operations']:
            assert pair[0][key] == pair[1][key], (rep, key)
    for carrier in ['native', 'bits']:
        assert len(read(f'cases/{carrier}/cases.json.gz')) == 2982
        receipt = read(f'cases/{carrier}/observations.json')
        assert receipt == dict(referenceCases=2982, calls=14910, nativeCalls=600,
                               borrowedDoublesRounded=True, exactPayloadsAndSnapshots=True)
    assert len(read('checks/expected.json.gz')) == len(read('checks/script.json.gz')) == 295
    gpu = read('checks/gpu-receipts.json.gz')
    assert len(gpu) == 295 and sum(x['backend'] == 'gpu' for x in gpu) == 169
    log = raw('checks/javascript.log.gz').decode()
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == 56
    assert 'test result: FAILED' not in log
    log = raw('checks/reverse-binary64.log.gz').decode()
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == 6
    assert 'test result: FAILED' not in log
    assert read('checks/cli-image.json')['cli_matches_standalone'] is True
    assert summary() == read('summary.json')
    print(f"verified {len(metadata['files'])} bound files, complete cores/images, exactness and timing controls")


if __name__ == '__main__':
    audit()

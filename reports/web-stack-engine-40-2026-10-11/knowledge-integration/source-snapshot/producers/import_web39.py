#!/usr/bin/env python3
"""Import audited complete-operation timings; observations grant no authority."""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge.store import Store, identity


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def collect(report, provenance):
    report = Path(report)
    meta = read(report / 'metadata.json')
    fixtures = {f['id']: f for f in read(report / 'fixtures.json')['frames']}
    for path, digest in meta['bindings'].items():
        if sha(report / path) != digest:
            raise ValueError('bound asset drift: ' + path)
    observations = []
    sources = {}
    for host in ('node', 'browser', 'native'):
        native = host == 'native'
        result_path = report / ('native/results.json' if native else host + '-results.json')
        audit_path = report / ('native/audit.json' if native else host + '-audit.json')
        results, audit = read(result_path), read(audit_path)
        result_digest = sha(result_path)
        audit_digest = sha(audit_path)
        if results['status'] != 'passed' or audit['status'] != 'passed':
            raise ValueError('unaudited host: ' + host)
        host_metadata = report / ('native/metadata.json' if native else 'metadata.json')
        if results['metadata_sha256'] != sha(host_metadata) or audit['bindings']['metadata'] != sha(host_metadata):
            raise ValueError('audit/metadata drift: ' + host)
        if native:
            native_meta = read(host_metadata)
            if native_meta['main_metadata_sha256'] != sha(report / 'metadata.json'):
                raise ValueError('native preparation association drift')
            for path, digest in native_meta['bindings'].items():
                if sha(report / 'native' / path) != digest:
                    raise ValueError('native asset drift: ' + path)
        # Audit receipts authenticate the full raw samples, not just summaries.
        bound_results = audit.get('bindings', {}).get('results', audit.get('results_sha256'))
        if bound_results != result_digest:
            raise ValueError('audit/results drift: ' + host)
        sources[host] = dict(results=result_digest, audit=audit_digest)
        groups = defaultdict(list)
        for row in results['samples']:
            version = row['variant'] if native else row['variant'].split('_')[0]
            if version not in ('baseline', 'candidate'):
                continue
            if '_gpu_' in row['variant'] and set(row['actual_backend_counts']) != {'gpu'}:
                continue
            groups[row['frame'], row['variant'], row['boundary']].append(row)
        for (frame, variant, boundary), rows in sorted(groups.items()):
            if {r['round'] for r in rows} != set(range(meta['protocol']['rounds'])) or len(rows) != meta['protocol']['rounds']:
                raise ValueError('incomplete paired rounds')
            f = fixtures[frame]
            version = variant if native else variant.split('_')[0]
            folder = report / 'targets' / f['task']
            selection = read(folder / (version + '.selection.json'))
            entries = sorted(selection['knowledge']['roots'])
            compiler = meta['selections'][f['task']][version]['compiler_sha256']
            plan = identity(dict(core=sha(folder / (version + '.core.json')),
                                 manifest=sha(folder / version / 'manifest.json'),
                                 variant=variant, boundary=boundary, host=host,
                                 compiler=compiler, results=result_digest))
            backend = 'native-c' if native else 'webgpu' if '_gpu_' in variant else 'wasm' if 'wasm' in variant else 'javascript'
            observation = dict(schema=1, program=sha(folder / (version + '.core.json')),
                               entries=entries, plan=plan,
                               target=dict(hardware=provenance['hardware'],
                                           driver=provenance['driver'][host],
                                           toolchain=provenance['toolchain'][host] + '; compiler=' + compiler,
                                           backend=backend, bridge=boundary),
                               workload=dict(shape=dict(f['input_shape'], task=f['task'],
                                                        fixture=identity(dict(xs=f['xs'], ys=f['ys'], seed=f['seed'], k=f['k']))),
                                             distribution=dict(values=f['mode'], seed=f['seed'], k=f['k'], split=f['split']),
                                             concurrency=1, residency=boundary),
                               metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in sorted(rows, key=lambda r: r['round'])],
                                            peak_bytes=None))
            # Native timers return caller-owned destinations; resident Wasm is
            # borrowed-until-next-call; GPU counters are not host peak memory.
            # Those boundaries remain explicit and no zero peak is invented.
            Store.validate_observation(observation)
            observations.append(observation)
    return observations, sources


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--provenance', type=Path, required=True)
    parser.add_argument('--store', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    observations, sources = collect(args.report, read(args.provenance))
    store = Store(args.store)
    ids = [store.observe(o) for o in observations]
    receipt = dict(status='passed', observations=len(ids), ids=ids,
                   metadata_sha256=sha(args.report / 'metadata.json'), sources=sources,
                   provenance_sha256=sha(args.provenance), producer_sha256=sha(__file__),
                   snapshot_unchanged=store.snapshot_id,
                   scope='Rounded ns samples from audited full-output operations, separated by exact host, compiler and ABI boundary. Observations do not establish equivalence or profitability on other workloads. Peak memory unmeasured.')
    if args.receipt.exists():
        raise ValueError('preserve import receipt')
    args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(dict(status='passed', observations=len(ids))))


if __name__ == '__main__':
    main()

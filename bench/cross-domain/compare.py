#!/usr/bin/env python3
"""Alternate prebuilt variants in fresh processes; validate every complete result.

Each process alternates Ink/control timing order. Statistics use process medians as replication units,
not the inner repetitions as independent observations.
"""
import argparse
import hashlib
import json
import pathlib
import statistics
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'bench'))
import methodology

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('variants', nargs='+', help='names previously built with run.py --build-only; baseline first')
parser.add_argument('--rounds', type=int, default=9)
parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'build/cross-domain/comparison.json')
args = parser.parse_args()
if len(args.variants) < 2 or args.rounds < 3:
    parser.error('requires at least two variants and three process rounds')
builds, binaries = {}, {}
for name in args.variants:
    project = ROOT / 'build/cross-domain' / name
    metadata = json.loads((project / 'measurement-build.json').read_text())
    binary = project / 'target/release/compiled-state'
    if hashlib.sha256(binary.read_bytes()).hexdigest() != metadata['binary_sha256']:
        raise ValueError('binary changed: ' + name)
    for source, expected in metadata['source_hashes'].items():
        if hashlib.sha256((ROOT / source).read_bytes()).hexdigest() != expected:
            raise ValueError('source changed: ' + source)
    if builds and metadata['source_hashes'] != next(iter(builds.values()))['source_hashes']:
        raise ValueError('variants were built from different workloads')
    builds[name], binaries[name] = metadata, binary
samples, process_order = {}, []
started = time.time()
for round_index in range(args.rounds):
    order = args.variants[round_index % len(args.variants):] + args.variants[:round_index % len(args.variants)]
    if round_index % 2:
        order = list(reversed(order))
    process_order.append(order)
    for name in order:
        raw = subprocess.check_output([binaries[name]], text=True)
        rows = [json.loads(line) for line in raw.splitlines()]
        for row in rows:
            if not row['validated']:
                raise ValueError('unvalidated output')
            key = (row['domain'], row['n'], row['comparator'])
            samples.setdefault(key, {}).setdefault(name, []).append(row)
    print(f'Completed process round {round_index + 1}/{args.rounds}', flush=True)
results = []
for (domain, n, comparator), variants in samples.items():
    baseline = [statistics.median(r['ink_ns']) for r in variants[args.variants[0]]]
    for name in args.variants:
        rows = variants[name]
        if len(rows) != args.rounds:
            raise ValueError('missing measurement process')
        ink = [statistics.median(row['ink_ns']) for row in rows]
        control = [statistics.median(row['rust_control_ns']) for row in rows]
        results.append(dict(domain=domain, n=n, comparator=comparator, variant=name,
                            ink_process_medians_ns=ink, control_process_medians_ns=control,
                            ink_median_ns=statistics.median(ink), control_median_ns=statistics.median(control),
                            relative_to_baseline=dict(zip(['ratio','ci_low','ci_high'], methodology.ratio_ci(ink,baseline))),
                            relative_to_control=dict(zip(['ratio','ci_low','ci_high'], methodology.ratio_ci(ink,control)))))
for name, binary in binaries.items():
    if hashlib.sha256(binary.read_bytes()).hexdigest() != builds[name]['binary_sha256']:
        raise ValueError('executable changed during measurement')
report = dict(schema=1, method=__doc__, started_unix=started, finished_unix=time.time(),
              rounds=args.rounds, process_order=process_order, builds=builds, results=results)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2)+'\n')
print('Saved', args.output)

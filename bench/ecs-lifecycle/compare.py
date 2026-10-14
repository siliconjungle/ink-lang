#!/usr/bin/env python3
"""Paired fresh-process comparison of named, prebuilt ECS implementations.

The same driver checks complete snapshots and times all seven controls in each
process. Inner samples are not independent bootstrap replication units.
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


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('variants', nargs='+', help='run.py --name values; baseline first')
    parser.add_argument('--rounds', type=int, default=8)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    if len(args.variants) < 2 or len(set(args.variants)) != len(args.variants) or args.rounds < 3:
        parser.error('requires distinct variants and at least three rounds')
    builds, binaries, drivers = {}, {}, {}
    for name in args.variants:
        build = ROOT / 'build/ecs-lifecycle' / name
        meta = json.loads((build / 'build.json').read_text())
        lib = build / 'ink-planned/target/release' / ('libcompiled_state.' + methodology.shared_suffix())
        driver = build / 'driver'
        if digest(lib) != meta['binary_sha256'] or digest(driver) != meta['driver_sha256']:
            raise ValueError('changed executable: ' + name)
        for path, expected in meta['source_hashes'].items():
            if digest(ROOT / path) != expected:
                raise ValueError('changed source: ' + path)
        if builds:
            previous = next(iter(builds.values()))
            for key in ['source_hashes', 'driver_sha256', 'compiler_sha256', 'upstreams', 'flags']:
                if meta[key] != previous[key]:
                    raise ValueError('unmatched comparison field: ' + key)
        builds[name], binaries[name], drivers[name] = meta, lib, driver
    processes = {name: [] for name in args.variants}
    order_history = []
    started = time.time()
    for index in range(args.rounds):
        offset = index % len(args.variants)
        order = args.variants[offset:] + args.variants[:offset]
        if index // len(args.variants) % 2:
            order = list(reversed(order))
        order_history.append(order)
        for name in order:
            raw = subprocess.check_output([drivers[name], binaries[name]], text=True)
            processes[name].append([json.loads(line) for line in raw.splitlines()])
        print(f'Completed round {index + 1}/{args.rounds}', flush=True)
    results = []
    baseline = args.variants[0]
    def key(row):
        return row['variant'], row['capacity'], row['pattern']
    expected_keys = {key(row) for row in processes[baseline][0]}
    for rounds in processes.values():
        for process in rounds:
            if len(process) != len(expected_keys) or {key(row) for row in process} != expected_keys:
                raise ValueError('missing or duplicated measurement cell')
    for cell in processes[baseline][0]:
        if cell['variant'] not in ('ink', 'ink_indexed'):
            continue
        medians = {name: [statistics.median(next(row['samples_ns'] for row in process if key(row) == key(cell)))
                          for process in rounds] for name, rounds in processes.items()}
        for name in args.variants:
            results.append(dict(variant=cell['variant'], capacity=cell['capacity'], pattern=cell['pattern'],
                                build=name, process_medians_ns=medians[name], median_ns=statistics.median(medians[name]),
                                relative_to_baseline=dict(zip(['ratio', 'ci_low', 'ci_high'],
                                    methodology.ratio_ci(medians[name], medians[baseline])))))
    for name in args.variants:
        if digest(binaries[name]) != builds[name]['binary_sha256'] or digest(drivers[name]) != builds[name]['driver_sha256']:
            raise ValueError('executable changed during measurement')
    report = dict(schema=1, method=__doc__, started_unix=started, finished_unix=time.time(),
                  rounds=args.rounds, order=order_history, builds=builds, results=results, processes=processes,
                  orchestrator_sha256=digest(pathlib.Path(__file__)))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Fresh-process paired measurements; complete checksums/checkpoints are mandatory."""
import argparse
import json
import math
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path)
    parser.add_argument('selected', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--node', default='node')
    parser.add_argument('--processes', type=int, default=6)
    args = parser.parse_args()
    if args.processes < 1:
        parser.error('--processes must be positive')
    args.output.mkdir(parents=True, exist_ok=False)
    records = []
    memory = []
    worker = Path(__file__).with_name('benchmark.mjs')
    for index in range(args.processes):
        order = 'selected,baseline' if index % 2 else 'baseline,selected'
        result = subprocess.run([args.node, str(worker), str(args.baseline.resolve()),
                                 str(args.selected.resolve()), order], capture_output=True, text=True, timeout=60)
        (args.output/f'process-{index}.stderr').write_text(result.stderr)
        result.check_returncode()
        record = json.loads(result.stdout)
        assert record['completeChecksumsAndCheckpointsAgree'] is True
        assert not records or record['images'] == records[0]['images']
        records.append(record)
        (args.output/f'process-{index}.json').write_text(json.dumps(record, indent=2)+'\n')
        samples = {}
        for name in order.split(','):
            folder = args.baseline if name == 'baseline' else args.selected
            measured = subprocess.run([args.node, '--expose-gc', str(worker.with_name('memory.mjs')),
                                       str(folder.resolve())], capture_output=True, text=True, timeout=60)
            (args.output/f'memory-{index}-{name}.stderr').write_text(measured.stderr)
            measured.check_returncode()
            sample = json.loads(measured.stdout)
            samples[name] = sample
            (args.output/f'memory-{index}-{name}.json').write_text(json.dumps(sample, indent=2)+'\n')
        assert samples['baseline']['checkpoint'] == samples['selected']['checkpoint']
        assert samples['baseline']['checksum'] == samples['selected']['checksum']
        memory.append(samples)
    assert len({row['processId'] for row in records}) == len(records)
    summary = {}
    for stride in records[0]['updateStrides']:
        phase = str(stride)
        baseline = [row['results']['baseline']['phases'][phase]['medianNs'] for row in records]
        selected = [row['results']['selected']['phases'][phase]['medianNs'] for row in records]
        ratios = [a/b for a, b in zip(baseline, selected)]
        geometric = lambda xs: math.exp(sum(map(math.log, xs))/len(xs))
        summary[phase] = dict(baselineNs=baseline, selectedNs=selected, ratios=ratios,
                             geometricBaselineNs=geometric(baseline), geometricSelectedNs=geometric(selected),
                             geometricSpeedup=geometric(ratios), minimumSpeedup=min(ratios), maximumSpeedup=max(ratios))
    result = dict(schema=1, processes=len(records), images=records[0]['images'], phases=summary,
                  memoryProcesses={name:[row[name]['processId'] for row in memory] for name in ['baseline','selected']},
                  scope='One eight-operation F32 program with mutable weights, typed in-memory bound state calls, resultOnly and event acknowledgement. No upstream neural, GPU, durable storage or broad performance parity claim.')
    (args.output/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()

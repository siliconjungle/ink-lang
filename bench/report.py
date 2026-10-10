#!/usr/bin/env python3
"""Generate a report directly from the completed benchmark samples."""
import json, math, statistics
from pathlib import Path

root=Path(__file__).resolve().parents[1]
results=root/'bench/results'
meta=json.loads((results/'metadata.json').read_text())
summary=json.loads((results/'summary.json').read_text())
samples=json.loads((results/'samples.json').read_text())
geo=lambda xs: math.exp(statistics.mean(math.log(x) for x in xs))
ratios={v:geo(r['median_ns']['lang_knowledge']/r['median_ns'][v] for r in summary) for v in ['c','cpp','rust','rust_loop']}
poly=[r for r in summary if r['case']=='expanded']
poly_gain=geo(r['median_ns']['lang']/r['median_ns']['lang_knowledge'] for r in poly)
strong=geo(r['median_ns']['lang_knowledge']/min(r['median_ns'][v] for v in ['c','cpp','rust','rust_loop']) for r in summary)
largest=max(r['n'] for r in summary)
lines=[
    '# First native compiler benchmark results',
    '',
    'This measures the first working pure-collection subset of the proposed language. The full language remains in development. State transactions, incremental query maintenance, persistence, general proof terms, WebAssembly and runtime adaptation are not represented by these results.',
    '',
    f'The generated code is approximately at parity with optimised C, C++ and hand-written Rust loops on this suite. With the imported proof package it takes **{ratios["c"]:.3f}× C time**, **{ratios["cpp"]:.3f}× C++ time**, and **{ratios["rust_loop"]:.3f}× Rust-loop time** (geometric means across the measured cases; lower is better). Against the fastest of the four baseline implementations for each case, it takes **{strong:.3f}×** the time.',
    '',
    f'Importing the checked polynomial rewrite improves that kernel by **{poly_gain:.2f}×** in geometric-mean throughput relative to the compiler without the package. The C/C++/Rust baselines already use the factored form, so this demonstrates automated recovery of an expert optimisation rather than a new algorithm unavailable to those languages.',
    '',
    'The Rust iterator pipeline is slower than the Rust loop version in this run. The loop comparison removes most of that apparent language advantage. Backend versions also differ; these measurements do not isolate the cause of the iterator result.',
    '',
    '## Representative results',
    '',
    f'Median microseconds per call, {largest:,} elements, small-integer input distribution. Seven repeated timing batches per implementation. These are warm in-memory kernels; input allocation and generation are outside the timed region.',
    '',
    '| Kernel | Language | Language with knowledge | C | C++ | Rust iterators | Rust loops |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
]
for r in summary:
    if r['n']==largest and r['distribution']=='small':
        med=r['median_ns'];lines.append('| '+r['case']+' | '+' | '.join(f'{med[v]/1000:.3f}' for v in ['lang','lang_knowledge','c','cpp','rust','rust_loop'])+' |')
lines += [
    '', '## Validation and method', '',
    f'- {meta["correctness"]["native_checks"]:,} native comparisons and {meta["correctness"]["interpreter_checks"]} interpreter comparisons passed against an independent Python integer reference, including empty inputs and unsigned-overflow boundaries.',
    f'- {len(samples):,} timed samples cover {len(summary)} workload/size/distribution combinations and six variants.',
    '- All timed executables link the identical C timing-driver object against separately compiled kernels. No LTO is used across this boundary, and every returned value contributes to an emitted checksum.',
    '- Full runs use 32, 4,096, 262,144 and 4,194,304 elements; distributions include bounded small values and values spanning the full u64 range.',
    '- Implementations use the same modular-u64 semantics and fused algorithms. There is no deliberately allocating C/C++/Rust comparison.',
    '- Each variant has a calibrated batch duration and seven samples. Variant order is shuffled within each round. Three calls warm the kernel before timing.',
    '- All native compilers use optimisation level 3 and native CPU targeting. The language emits C and then uses the same Clang backend as the C/C++ baselines.',
    '- Proof checking and compilation happen before the execution benchmark. Their process timings are retained in metadata.json; they are not hidden in runtime measurements.',
    '', '## Machine and toolchains', '',
    f'- CPU: {meta["cpu"]}.',f'- Memory: {int(meta["memory_bytes"])/(1024**3):.0f} GiB.',f'- Platform: {meta["platform"]}.',
    '- Clang: '+meta['clang'].splitlines()[0]+'.',
    '- Rust: '+meta['rustc'].splitlines()[0]+'.',
    '- '+next((x for x in meta['rustc'].splitlines() if x.startswith('LLVM version:')),'Rust LLVM version unavailable')+'.',
    '', '## Interpretation and limits', '',
    'These results support a useful starting point: the frontend can generate competitive fused loops, and a locally checked proof package can change generated code and improve an eligible workload. They do not establish an overall lead over expert native code.',
    '',
    'The suite runs on one shared, interactive Apple Silicon machine without CPU pinning or controlled thermal conditions. Differences of a few percent should be treated as approximate parity. The results are single-threaded and exclude application startup, durable writes, foreign-call-heavy workloads, concurrent updates, and adaptive migration.',
    '',
    'The proof checker covers modular polynomial identities only. It is a trusted Rust decision procedure, not a mechanically verified general-purpose kernel. Fused-loop lowering and Clang/LLVM remain trusted. Differential tests add evidence but are not formal code-generation proofs.',
    '',
    'The most important next benchmark is an actual stateful language program: imported checked incremental-maintenance knowledge versus manually maintained C/C++/Rust, including query/update tradeoffs and transaction costs. A rescan-only baseline would overstate the result.',
    '', '## Reproduce and inspect', '',
    'Run `python3 bench/run.py` and then `python3 bench/report.py` from the repository. The runner discovers this workspace’s isolated Rust installation, or uses an existing toolchain on PATH.',
    '',
    '- [Raw samples](bench/results/samples.json)',
    '- [Summaries](bench/results/summary.json)',
    '- [Environment, commands and source hashes](bench/results/metadata.json)',
    '- [Correctness checks](bench/results/correctness.json)',
    '- [Language source](examples/kernels.lang)',
    '- [Proof-package source](knowledge/research/ring.lang)',
    '- [Full implementation plan](PLAN.md)',
]
(root/'BENCHMARKS.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'knowledge_over_baselines':ratios,'knowledge_over_fastest_baseline':strong,'polynomial_speedup':poly_gain,'samples':len(samples)},indent=2))

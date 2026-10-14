# Adaptive Ink versus Frontier GitHub main — 14 October 2026

This is a new matched experiment, separate from the older fixed-schema Frontier
comparison and the adaptive-versus-fixed Ink measurements. It uses normal
Frontier patch application plus a plain sum query, and the already checked Ink
aggregate bundle. No implementation or policy was tuned to win this comparison.

**Adaptive Ink lost to Frontier on every 4,096-call session in this matrix.**
For 4,096 rows, steady reads took 158.39 ms versus Frontier state's 25.51 ms;
read-then-write took 336.10 ms versus 15.88 ms. Adaptation improved on fixed
literal Ink in several cases, but that did not make it faster than Frontier.

The unchanged policy did amortize on the longest pure-read session: **65,536
reads took 279.19 ms in adaptive Ink versus 356.44 ms in Frontier state**, a
1.28x speed ratio (21.7% less elapsed time). At 16,384 reads Ink was still 2.31x
slower. This locates a crossover between the sampled lifetimes; it does not
estimate the exact break-even point or establish a general app speedup.

Fixed cached Ink completed those 65,536 reads in 12.86 ms. For a known read-only
workload, selecting that representation ahead of time is much better here than
starting direct and waiting to adapt. Its expensive writes make it unsuitable
as a universal fixed choice. All losing cells are retained below.

## Results

All times are milliseconds for the complete session, lower is better. The
Frontier/adaptive ratio exceeds one when adaptive Ink wins. Frontier core and
state are both shown to avoid attributing state-engine overhead to the core.


| Rows | History (4,096 calls) | Frontier core | Frontier state | Ink direct | Ink cached | Ink fixed host | Ink adaptive | Frontier state / adaptive |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 128 | steady_read | 3.89 | 3.97 | 16.58 | 1.14 | 20.09 | 13.95 | 0.28x |
| 128 | steady_write | 2.20 | 2.13 | 2.77 | 140.33 | 11.14 | 13.38 | 0.16x |
| 128 | write_read | 4.65 | 4.43 | 8.28 | 70.84 | 15.17 | 13.37 | 0.33x |
| 128 | read_write | 4.43 | 4.53 | 9.62 | 70.49 | 16.18 | 30.15 | 0.15x |
| 128 | alternating | 4.16 | 4.29 | 9.83 | 70.35 | 15.56 | 17.85 | 0.24x |
| 128 | mixed | 4.10 | 4.29 | 8.55 | 70.29 | 15.55 | 18.15 | 0.24x |
| 128 | sparse_updates | 4.65 | 4.88 | 12.91 | 5.68 | 19.06 | 16.68 | 0.29x |
| 4096 | steady_read | 25.86 | 25.51 | 602.16 | 1.13 | 544.72 | 158.39 | 0.16x |
| 4096 | steady_write | 2.14 | 2.08 | 3.60 | 1673.27 | 11.08 | 14.48 | 0.14x |
| 4096 | write_read | 16.14 | 15.28 | 305.17 | 838.30 | 323.84 | 79.49 | 0.19x |
| 4096 | read_write | 15.97 | 15.88 | 307.31 | 852.89 | 318.03 | 336.10 | 0.05x |
| 4096 | alternating | 15.64 | 15.61 | 308.03 | 839.00 | 314.03 | 290.95 | 0.05x |
| 4096 | mixed | 16.22 | 16.03 | 310.20 | 828.22 | 314.38 | 289.42 | 0.06x |
| 4096 | sparse_updates | 25.59 | 25.54 | 590.87 | 54.28 | 542.24 | 198.60 | 0.13x |

Longer read-only sessions, 4,096 rows:

| Calls | Frontier state | Ink cached | Ink adaptive | Frontier state / adaptive |
|---:|---:|---:|---:|---:|
| 16384 | 91.10 | 4.86 | 210.35 | 0.43x |
| 65536 | 356.44 | 12.86 | 279.19 | 1.28x |

For the 65,536-read session, process-median ranges are frontier_state: 355.27–359.90 ms, ink_adaptive: 277.14–280.39 ms, ink_cached: 12.75–12.91 ms.

## What this teaches us

The controller first switches after 1,024 calls in steady reads. On the large
table it therefore pays for many expensive direct sums before getting cheap
cached reads. In read-then-write it switches back at call 2,432: 384 writes have
already used the expensive cached representation. Short alternating and mixed
sessions retain direct execution. Recording, capture, serialization of calls
and shared-Wasm decision costs still apply.

The fixed-host lane separates part of that overhead from ordinary compiled
execution, but JIT and allocation histories still vary. For example, large
direct-read timing differs between the raw and fixed-host wrappers; these
numbers do not imply that adding a wrapper intrinsically accelerates a sum.

This evidence supports compile-time selection for predictable workloads and
careful amortization for adaptive ones. It does not support a claim that
turning on adaptation generally beats Frontier. The remaining opportunities
include reducing baseline execution cost, host overhead and reaction delay,
and admitting cheaper write-maintained alternatives. They were not implemented
or tuned during this measurement.

All **432 final timed sessions** passed checksum and final-state validation,
with full-reply preflights before timing.
The 378 short sessions and 54 lifetime sessions come from separate cohorts.
Acquisition, correctness preflights and the exploratory run are additional.
No correctness failure or adaptation-disable event occurred.

## Implementations and boundaries

- Ink distribution: `e7f3ec476250c8cfa1ea5d2f0fe3a5a479cf272c`.
  The frozen, previously checked `adaptive_aggregate` modules have their exact
  compiler/source/artifact bindings and plan receipts in the artifact archive.
  They were reused without regeneration; this is not a benchmark of every newer
  independent package revision.
- Frontier core GitHub main: `2c72dbb4030e2695b682d3e49ec82d8c5c8ffec2`.
- Frontier engine GitHub main: `1fdd01b67367ccd2b1088b0148b558896935856e`.
- Frontier state GitHub main: `9ff840ea690e55fd8c064934f92a26c1603a63fa`.
  All three were fetched for this comparison and built unchanged. The engine's
  codec dependency remains its locked npm version; codec execution is not timed.

The source stores a table of u64 values. `zero` sums all rows;
`replace_zero` replaces row zero and emits an event. Ink's direct compiled
implementation computes the sum on reads. The supplied checked cached
representation has cheap reads and expensive writes. This is a specific
representation pair, not the best possible incremental aggregate algorithm.

Frontier stores normal JSON Numbers under string keys. All inputs, totals,
versions and event payloads in this study stay exactly within Number's safe
integer range. Ink executes its normal compiled BigInt/u64 semantics. Thus this
compares the implementations an application would actually use on this exact
numeric subset; it does not isolate host/controller overhead from number and
storage representation costs.

The Frontier core lane uses `applyPatch`; the state lane uses
`createStateEngine().commitPatch`. Both read with a plain `Object.values` sum.
Their adapters supply the same action replies, application commit versions,
event outbox and rollback behavior. The engine's internal patch version is not
the application version. No manually cached Frontier aggregate or separate
Frontier dataflow package is included. No watchers are registered.

Each session starts with already loaded state. Setup is recorded separately:
Ink restores a portable snapshot, whereas Frontier builds a normal JSON object.
Those different setup boundaries must not be ranked as equivalent startup.
The timed boundary includes sequential awaited calls, full reply digests, event
acknowledgement after successful writes, and all adaptive profiling, decisions
and migrations. Imports, compilation, offline profile acquisition, initial state
loading, final verification and final checkpoints are outside timing.

`ink_direct` and `ink_cached` call the compiled modules without the adaptive
facade. `ink_fixed_host` uses that facade with switching and recording disabled.
`ink_adaptive` starts direct, uses the default 128-call recording window and
16-call latency sampling, and has no additional optional access-diagnostics
recorder. Its policy is the ordinary fitted policy: 4,096-call forecast,
1,024-call minimum residence, three stable windows, 15% minimum gain, 2x migration
margin, 50 ms pause limit, 256 MiB evidence limit and at most 32 switches. These
are policy/evidence limits, not measured statistical latency or heap guarantees.

## Acquisition and correctness

Development acquisition is a separate process: five retained timing samples per
variant/action/size after two discarded rounds, and five complete migration
samples per direction. Profiles use empirical extrema. Acquisition uses
homogeneous calls and does not inspect evaluation traces. Profile bytes are
frozen across all evaluation processes. The profile's source binding must match
the emitted modules; profiles have no proof authority.

The session matrix has 128 and 4,096 rows, seven histories, six implementations,
three fresh processes and three rotated rounds per process. Every history has
4,096 calls: steady reads, steady writes, write then read, read then write,
256-call alternating phases, alternating individual reads/writes, and one write
per 32 calls. Phase changes split the session into two equal halves.

After an exploratory first run showed adaptive losses, a separate read-lifetime
sweep was added at 16,384 and 65,536 calls over 4,096 rows. It uses the unchanged
policy and profile and compares Frontier state, fixed cached Ink and adaptive
Ink. It tests amortization, not a held-out generalisation claim. The exploratory
first run is archived separately and excluded from reported final medians.

Before timing, every lane compares every reply and every stored row. The error
controls cover failed replacement, failed deletion, committed deletion and
replacement of an absent row. All Ink variants additionally compare exact
portable checkpoints. Timed sessions consume a checksum of every result,
version and event and verify it and the complete final state afterward. The
short-session oracle is direct compiled Ink. The read-only lifetime oracle is
the already cross-checked cached variant; it introduces no new source actions.
Any adaptation failure aborts the run. These are finite execution checks, not a
proof of the Frontier adapter or the compiler.

Numbers are medians of the three process medians. Process ranges remain in
[sessions/summary.json](sessions/summary.json) and
[lifetime/summary.json](lifetime/summary.json). This is Node 22 on a shared Apple ARM host, with no exclusive
CPU reservation, confidence interval, peak-memory ranking or browser result.
Runs are serial and there was no deliberate concurrent build in this task.

## Reproduction

The runner is [frontier.mjs](../../bench/adaptive-learning/frontier.mjs), with
[serial acquisition](../../bench/adaptive-learning/frontier-run.py) and
[summary calculation](../../bench/adaptive-learning/frontier-summary.py).

`measured-artifacts.tar.gz` preserves the two checked generated modules, their
plans and receipts, current runtime host files, exact built Frontier files,
package manifests/locks and the engine's codec dependency. The manifest hashes
every archived file. Extract it into a separate copy of the recorded Ink
distribution; do not overwrite a working checkout's runtime files.

For each Frontier checkout, install its lockfile with `npm ci --ignore-scripts`.
Link the engine's `node_modules/@shapeshift-labs/frontier` to the recorded core
checkout, and link state's core/engine dependencies to those same checkouts.
When rebuilding from source, state's TypeScript project references also require
the sibling paths `build/frontier` and `build/frontier-engine`; these can be
symlinks to `adaptive-frontier-core` and `adaptive-frontier-engine`. Compile core,
engine, then state. The measured source checkouts had no tracked modifications.

Run a fresh acquisition and comparison with:

```sh
python3 bench/adaptive-learning/frontier-run.py -o build/new-frontier-comparison
```

To repeat with the archived development profile rather than reacquiring it,
copy `profiles.json` into a fresh output directory and run the harness with
`run` (short sessions) or `sweep` (long reads), the directory and fresh process
IDs 0, 1 and 2. Then run `frontier-summary.py` on that directory. Do not combine
results with different harness hashes, module bindings or profile bytes.

The archive is execution evidence, not a substitute for checking the supplied
plans. Recreate and check variants using `bench/adaptive-state/prepare.py` when
changing the compiler, source or knowledge snapshot, and reacquire profiles for
the resulting bindings before measuring.

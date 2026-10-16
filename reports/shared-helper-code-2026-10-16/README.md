# Reuse typed helper code while retaining live computation

The knowledge proposal shares generated pure definitions whose exact types,
literals, operand/callee/free names and lexical structure agree modulo bound
names. Every call still executes with its current arguments; results are not
memoized. Ordinary source-extension checks and complete action equations replay
independently of the proposal key. Expanded layout remains available with
`--helper-layout expanded`; it exactly reproduces the earlier 128-operation plan.

The repeated 32/128-operation fixtures use 3/5 definitions instead of 7/31, at
unchanged maximum call depths 3/5. Distinct wrapping-word chunks remain separate.
All twelve frozen-state integration tests pass with mandatory Wasm/GPU coverage.
Nineteen frozen knowledge tests pass, including an independently executed word
case comparing baseline, expanded and shared code under changing inputs/weights.
Both F32 sizes pass full reference/native/JavaScript/Wasm and native-GPU-host
histories. The five-target initialized artifact case also passes, preserving
training, failed updates, seed/fresh instances and checkpoint restrictions.

## Paired JavaScript measurements

Apple M4 Pro, Node 25.3.0; six fresh processes per size and comparison, alternating
variant order. Each phase warms 2,500 calls and records five samples of 25,000
complete bound requests. Updates and event acknowledgement are inside timed
loops. Every returned scalar is consumed, and checksums/ending checkpoints
agree. The same protocol separately compares shared against unspecialized code
and against the previous expanded selected implementation: 24 processes total.
The first pair overlapped a routine planner CLI help command; all samples are
retained, with no exclusions. This is ordinary workstation measurement, not an
exclusive-machine run. Ratios are geometric means of paired process medians.

| Ops | Update stride | Baseline ns | Shared ns | Baseline/shared | Expanded/shared, separate pairs |
| --- | --- | ---: | ---: | ---: | ---: |
| 32 | None | 325.94 | 222.50 | 1.465× | 1.060× |
| 32 | Every request | 545.44 | 460.04 | 1.186× | 1.034× |
| 32 | 16 | 293.97 | 201.08 | 1.462× | 1.057× |
| 32 | 256 | 267.45 | 178.08 | 1.502× | 1.059× |
| 128 | None | 1113.37 | 734.25 | 1.516× | 1.167× |
| 128 | Every request | 1067.35 | 798.47 | 1.337× | 1.094× |
| 128 | 16 | 817.41 | 532.43 | 1.535× | 1.136× |
| 128 | 256 | 790.77 | 514.91 | 1.536× | 1.144× |

Compare variants within a row/comparison. Weights and JIT histories differ across
strides, so cross-row times do not isolate update overhead. This is one internal
operation-sequence workload, not upstream/neural/GPU performance evidence.

## Size and startup

Selected JavaScript falls from 245,196 to 234,540 bytes at 32 operations and from
312,961 to 241,773 bytes at 128. The unspecialized modules are 226,567/227,745
bytes. Plans fall from 849,462/3,631,618 to 804,212/3,292,182 bytes; theorem counts
remain 10/34. Universal prefix-proof sharing remains substantial future work. A separate
512-operation repeated-code probe constructs a compact helper DAG but exhausts
the existing proof-authoring work budget and publishes no plan. Its input and
failure log are retained; no budget was raised and no 512-operation release or
performance claim is made.

In the separate 128-operation expanded/shared pairs, median import diagnostics
are 5.06/3.59 ms and first binding/call 667/309 microseconds. Unspecialized/shared
pairs still favor the baseline on startup: 3.42/3.76 ms import and 276/317
microseconds first binding/call. These are one-shot, warm-filesystem diagnostics,
not robust cold-cache/short-session or retained-memory measurements.

The initialized WebGPU inventory drops from 2,797 files / 86,615,083 bytes to
553 files / 22,148,048 bytes, including generated source and compiled CPU Wasm
fallbacks, excluding the top-level artifact manifest. Those are inventory file
bytes, not compressed download size or runtime heap use. Proof construction,
compilation and initial preparation are outside the warm serving samples.

## Actual GPU prefix coverage

An extended browser history independently evaluates the original `evaluate`
function on a 64-operation prefix, then compares the eligible generated helper
for eleven raw F32 input/coefficient classes. JavaScript, CPU and GPU-host paths
match 465 complete observations/checkpoints, six restores, three rejected frozen
checkpoints and six seeded-instance checks. Twelve calls actually dispatch to
the GPU: eleven model-prefix cases and one ordinary numeric control.

The complete 128-operation pure root remains outside the literal graph stage
budget; stateful serving and learning execute on the CPU. No budget is raised.
General graph fusion, larger device computations and GPU training remain open.
This is finite backend testing, not a universal generated-code correctness proof.

## Evidence scope

The ledger retains complete plans, initialized artifact inventories, timed
modules/seeds, every paired sample, reference histories and checker logs.
A fresh committed-source compiler rebuild checks training/restriction/proofs and
recreates the exact 128-operation initialized JavaScript images. Remaining
trusted code includes source correspondence, the checker, code generators,
runtimes, ABI, toolchains and drivers. Broader capture abstraction, universal
prefix proofs, graph/tape domains, objective-based profitability and matched
upstream performance remain required work.


## Frozen planning corpus

All ten frozen corpus programs compile and have admitted rewrite alternatives;
54 laws are admitted, seven in multiple programs. No alternative is selected:
all ten end at the `measurement_budget` gate. Nine searches stop at their time
budget, with median planning time 92.0 seconds. Full per-program funnels,
near misses, attribution, captured inputs and context are retained in
`corpus.tar.gz`. This explicit helper producer is not part of ordinary default
planner discovery and does not add default catalogue entries; these corpus
observations are not evidence of a sharing-induced held-out speedup.

The corpus ran against the working compiler, whose exact executable/producer
hashes are recorded. The unrelated uncommitted query-parser edit remains local;
its diff hash is `750cc8098faaad5bd8278f93760af008129ce3c136a79471334c7f604aa564ab`.
The separate fresh committed compiler-image check excludes that edit and covers
the 128-operation model fixture; it does not certify this entire corpus run.

Run `python3 audit.py`, optionally adding `--ink /absolute/path/to/ink` for
complete proof/training replay and `--chrome /absolute/path/to/Chrome` for a fresh
replay of the retained initialized GPU prefix history.
